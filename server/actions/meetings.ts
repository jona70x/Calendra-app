"use server";

import { db } from "@/drizzle/db";
import { meetingActionSchema } from "@/schema/meetings";
import { fromZonedTime } from "date-fns-tz";
import { getValidTimesFromSchedule } from "./schedule";
import { createCalendarEvent } from "./google/googleCalendar";
import { z } from "zod";

//creates e a meeting
export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema> // Incoming data, inferred from the meetingActionSchema
) {
  try {
    // validating the incoming data against the schema
    const { success, data } = meetingActionSchema.safeParse(unsafeData);


    if (!success) {
      throw new Error("Invalid data.");
    }

    // finding the event in the database that matches the provided IDs and is active
    const event = await db.query.EventTable.findFirst({
      where: ({ clerkUserId, isActive, id }, { eq, and }) =>
        and(
          eq(isActive, true), // event must be active
          eq(clerkUserId, data.clerkUserId), 
          eq(id, data.eventId) 
        ),
    });

    // if no matching event is found, throw an error
    if (!event) {
      throw new Error("Event not found.");
    }

   
    const startInTimezone = fromZonedTime(data.startTime, data.timezone);

    // checks if the selected time is valid for the event's availability
    const validTimes = await getValidTimesFromSchedule(
      [startInTimezone],
      event
    );

    // if the selected time is not valid, throw an error
    if (validTimes.length === 0) {
      throw new Error("Selected time is not valid.");
    }

    // creating the Google Calendar event with all necessary details
    await createCalendarEvent({
      ...data,  
      startTime: startInTimezone,  
      durationInMinutes: event.durationInMinutes,  
      eventName: event.name, 
    });
    return {
      clerkUserId: data.clerkUserId,
      eventId: data.eventId,
      startTime: data.startTime,
    };
  } catch (error: any) {
    
    console.error(`Error creating meeting: ${error.message || error}`);

    throw new Error(`Failed to create meeting: ${error.message || error}`);
  }
}
