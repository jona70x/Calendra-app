"use server";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema";
import { scheduleFormSchema } from "@/schema/schedule";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCalendarEventTimes } from "./google/googleCalendar";
import {
  addMinutes,
  areIntervalsOverlapping,
  DateArg,
  Interval,
  isFriday,
  isMonday,
  isSaturday,
  isSunday,
  isThursday,
  isTuesday,
  isWednesday,
  isWithinInterval,
  setHours,
  setMinutes,
} from "date-fns";
import { DAYS_OF_WEEK_IN_ORDER } from "@/constants";

// file that gets and manages schedule.

type ScheduleRow = typeof ScheduleTable.$inferSelect;
type AvailabilityRow = typeof ScheduleAvailabilityTable.$inferSelect;

export type FullSchedule = ScheduleRow & { availabilities: AvailabilityRow[] };

export async function getSchedule(userId: string): Promise<FullSchedule> {
  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    with: { availabilities: true }, // getting all user's availability
  });

  return schedule as FullSchedule;
}

// server action function that saves the user's schedule and availabilities
export async function saveSchedule(
  unsafeData: z.infer<typeof scheduleFormSchema>
) {
  try {
    const { userId } = await auth();

    const { success, data } = scheduleFormSchema.safeParse(unsafeData);

    if (!success || userId == null) {
      throw new Error("Invalid schedule data or user not authenticated");
    }

    // availabilities and the rest of the schedule data
    const { availabilities, ...scheduleData } = data;

    // insert or update the user's schedule and return schedule ID
    const [{ id: scheduleId }] = await db
      .insert(ScheduleTable)
      .values({ ...scheduleData, clerkUserId: userId })
      .onConflictDoUpdate({
        target: ScheduleTable.clerkUserId,
        set: scheduleData,
      })
      .returning({ id: ScheduleTable.id });

    // Init sql statements
    const statements: [BatchItem<"pg">] = [
      //delete any existing availabilities for this schedule
      db
        .delete(ScheduleAvailabilityTable)
        .where(eq(ScheduleAvailabilityTable.scheduleId, scheduleId)),
    ];

    // if there are availabilities, insert an operation
    if (availabilities.length > 0) {
      statements.push(
        db.insert(ScheduleAvailabilityTable).values(
          availabilities.map((availability) => ({
            ...availability,
            scheduleId, // linking availability to schedule
          }))
        )
      );
    }

    await db.batch(statements);
  } catch (error: any) {
    // Catch and throw an error with a readable message
    throw new Error(`Failed to save schedule: ${error.message || error}`);
  } finally {
    // Revalidate the /schedule path to update the cache and reflect the new data
    revalidatePath("/schedule");
  }
}

/**
 * filters a list of time slots to return only those that:
 * 1. match the user's availability schedule
 * 2. do not overlap with existing Google Calendar events
 */
export async function getValidTimesFromSchedule(
  timesInOrder: Date[], // All possible time slots to check
  event: { clerkUserId: string; durationInMinutes: number } // Event-specific data
): Promise<Date[]> {
  const { clerkUserId: userId, durationInMinutes } = event;

  // defining the start and end of the overall range to check
  const start = timesInOrder[0];
  const end = timesInOrder.at(-1);

  // if start or end is missing, there are no times to check
  if (!start || !end) return [];

  // fetching the user's saved schedule along with their availabilities
  const schedule = await getSchedule(userId);

  // if there is no schedule is found, return an empty list (user has no availabilities)
  if (schedule == null) return [];

  // group availabilities by day of the week (e.g., Monday, Tuesday)
  const groupedAvailabilities = Object.groupBy(
    schedule.availabilities,
    (a) => a.dayOfWeek
  );

  // fetching all existing Google Calendar events between start and end
  const eventTimes = await getCalendarEventTimes(userId, {
    start,
    end,
  });

  // filtering and return only valid time slots based on availability and conflicts
  return timesInOrder.filter((intervalDate) => {
    // getting the user's availabilities for the specific day, adjusted to their timezone
    const availabilities = getAvailabilities(
      groupedAvailabilities,
      intervalDate,
      schedule.timezone
    );

    // defining the time range for a potential event starting at this interval
    const eventInterval = {
      start: intervalDate, // Proposed start time
      end: addMinutes(intervalDate, durationInMinutes), // Proposed end time (start + duration)
    };

    // kepping only the time slots that satisfy two conditions:
    return (
      // this time slot does not overlap with any existing calendar events
      eventTimes.every((eventTime: Interval<DateArg<Date>, DateArg<Date>>) => {
        return !areIntervalsOverlapping(eventTime, eventInterval);
      }) &&
      // the entire event fits within at least one availability window
      availabilities.some((availability) => {
        return (
          isWithinInterval(eventInterval.start, availability) && // Start is within availability
          isWithinInterval(eventInterval.end, availability) // End is within availability
        );
      })
    );
  });
}

function getAvailabilities(
  groupedAvailabilities: Partial<
    Record<
      (typeof DAYS_OF_WEEK_IN_ORDER)[number],
      (typeof ScheduleAvailabilityTable.$inferSelect)[]
    >
  >,
  date: Date,
  timezone: string
): { start: Date; end: Date }[] {
  // determining the day of the week based on the given date
  const dayOfWeek = (() => {
    if (isMonday(date)) return "monday";
    if (isTuesday(date)) return "tuesday";
    if (isWednesday(date)) return "wednesday";
    if (isThursday(date)) return "thursday";
    if (isFriday(date)) return "friday";
    if (isSaturday(date)) return "saturday";
    if (isSunday(date)) return "sunday";
    return null; // If the date doesn't match any day (highly unlikely), return null
  })();

  // if day of the week is not determined, return an empty array
  if (!dayOfWeek) return [];

  // getting the availabilities for the determined day
  const dayAvailabilities = groupedAvailabilities[dayOfWeek];

  // if there are no availabilities for that day, return an empty array
  if (!dayAvailabilities) return [];

  // mapping each availability time range to a { start: Date, end: Date } object adjusted to the user's timezone
  return dayAvailabilities.map(({ startTime, endTime }) => {
    // parsing startTime
    const [startHour, startMinute] = startTime.split(":").map(Number);
    // Parsing endTime
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // creating a start Date object set to the correct hour and minute, then convert it to the given timezone
    const start = fromZonedTime(
      setMinutes(setHours(date, startHour), startMinute),
      timezone
    );

    // creating an end Date object set to the correct hour and minute, then convert it to the given timezone
    const end = fromZonedTime(
      setMinutes(setHours(date, endHour), endMinute),
      timezone
    );

    // returns the availability interval
    return { start, end };
  });
}
