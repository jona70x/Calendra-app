// events actions
"use server";
import { db } from "@/drizzle/db";
import { EventTable } from "@/drizzle/schema";
import { eventFormSchema } from "@/schema/events";
import { auth } from "@clerk/nextjs/server";
import { and } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// marks this file as a server action

// new event

export async function createEvent(
  unsafeData: z.infer<typeof eventFormSchema>
): Promise<void> {
  try {
    const { success, data } = eventFormSchema.safeParse(unsafeData);
    const { userId } = await auth();
    if (!success || !userId) {
      throw new Error("Invalid event data or user not authenticated");
    }
    // Insert validated evtn data into the database, linking it to the authenticated user
    await db.insert(EventTable).values({ ...data, clerkUserId: userId });
  } catch (error: any) {
    throw new Error(`Failed to create ebent: ${error.message || error}`);
  } finally {
    revalidatePath("/events");
    // redirect("/events");
  }
}

export async function updateEvent(
  id: string,
  unsafeData: z.infer<typeof eventFormSchema>
): Promise<void> {
  // validate incoming data againts the event form schema
  const { success, data } = eventFormSchema.safeParse(unsafeData);
  const { userId } = await auth();
  // if validation fails ot the user is not authenticated, throw an error
  if (!success || !userId) {
    throw new Error("Invalid event data or user not authenticated");
  }

  // if === 0 event's not found or not owned by this user
  const { rowCount } = await db
    .update(EventTable)
    .set({ ...data })
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId))); // ensures the owner owns the event

  // if no event was updated or not founds
  if (rowCount === 0) {
    throw new Error(
      "Event not found or user not authorized to update this event"
    );
  }
  try {
  } catch (error: any) {
    throw new Error(`Failed to create event: ${error.message || error}`);
  } finally {
    revalidatePath("/events");
    // redirect("/events");
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    // Authenticating the user
    const { userId } = await auth();

    // Throw an error if no authenticated user
    if (!userId) {
      throw new Error("User not authenticated.");
    }

    // Attempting to delete the event only if it belongs to the authenticated user
    const { rowCount } = await db
      .delete(EventTable)
      .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)));

    // If no event was deleted (either not found or not owned by user), throw an error
    if (rowCount === 0) {
      throw new Error(
        "Event not found or user not authorized to delete this event."
      );
    }
  } catch (error: any) {
    // If any error occurs, throw a new error with a readable message
    throw new Error(`Failed to delete event: ${error.message || error}`);
  } finally {
    // Revalidate the '/events' path to ensure the page fetches fresh data after the database operation
    revalidatePath("/events");
  }
}

// Infer the type of a row from the EventTable schema
type EventRow = typeof EventTable.$inferSelect;

// Async function to fetch all events for a specific user
export async function getEvents(clerkUserId: string): Promise<EventRow[]> {
  // Query the database for events where the clerkUserId matches
  const events = await db.query.EventTable.findMany({
    // userIdCol is a reference to a column in  database.
    where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, clerkUserId),

    orderBy: ({ name }, { asc, sql }) => asc(sql`lower(${name})`),
  });

  // Return the full list of events
  return events;
}

// Fetch a specific event for a given user, returns undefined if not found
export async function getEvent(
  userId: string,
  eventId: string
): Promise<EventRow | undefined> {
  const event = await db.query.EventTable.findFirst({
    where: ({ id, clerkUserId }, { and, eq }) =>
      and(eq(clerkUserId, userId), eq(id, eventId)), // Making sure the event belongs to the user
  });

  return event ?? undefined;
}

// Define a new type for public events, which are always active
export type PublicEvent = Omit<EventRow, "isActive"> & { isActive: true };

// function to fetch all active events for a specific user
export async function getPublicEvents(
  clerkUserId: string
): Promise<PublicEvent[]> {
  // Events are ordered alphabetically (case-insensitive) by name
  const events = await db.query.EventTable.findMany({
    where: ({ clerkUserId: userIdCol, isActive }, { eq, and }) =>
      and(eq(userIdCol, clerkUserId), eq(isActive, true)),
    orderBy: ({ name }, { asc, sql }) => asc(sql`lower(${name})`),
  });

  // Cast the result to the PublicEvent[] type to indicate all are active
  return events as PublicEvent[];
}
