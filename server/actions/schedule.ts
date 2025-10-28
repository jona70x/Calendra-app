"use server";
import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema";
import { scheduleFormSchema } from "@/schema/schedule";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import { revalidatePath } from "next/cache";
import z from "zod";

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

    // If there are availabilities, insert an operation
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
