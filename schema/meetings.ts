import { startOfDay } from "date-fns";
import { z } from "zod";

const meetingSchemaBase = z.object({
  startTime: z.date().min(new Date()),

  guestEmail: z.string().email().min(1, "Required"),

  // must be a non-empty string
  guestName: z.string().min(1, "Required"),

  // is optional
  guestNotes: z.string().optional(),

  // must be a non-empty string (e.g., "UTC", "America/New_York", etc.)
  timezone: z.string().min(1, "Required"),
});

// alidating the meeting form input
export const meetingFormSchema = z
  .object({
    date: z.date().min(startOfDay(new Date()), "Must be in the future"),
  })

  .merge(meetingSchemaBase);

export const meetingActionSchema = z
  .object({
    //  is required and must be a non-empty string
    eventId: z.string().min(1, "Required"),

    // is required and must be a non-empty string
    clerkUserId: z.string().min(1, "Required"),
  })
  // combining with the base schema to include time, guest info, and timezone
  .merge(meetingSchemaBase);
