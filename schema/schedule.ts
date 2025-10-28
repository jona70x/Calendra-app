import { DAYS_OF_WEEK_IN_ORDER } from "@/constants";
import { timeToFloat } from "@/lib/utils";
import { z } from "zod";

export const scheduleFormSchema = z.object({
  timezone: z.string().min(1, "Required"), // The timezone must be a string
  availabilities: z
    .array(
      z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK_IN_ORDER),
        startTime: z.string().regex(
          /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, // Regex pattern to match the time format
          "Time must be in the format HH:MM"
        ),
        endTime: z.string().regex(
          /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, // Regex pattern to match the time format
          "Time must be in the format HH:MM" // Custom error message
        ),
      })
    )

    //This ensures users can’t submit overlapping or backward time ranges — like 2:00–1:00pm, or two blocks on the same day that conflict.
    .superRefine((availabilities, ctx) => {
      // Custom refinement function to add additional validation
      availabilities.forEach((availability, index) => {
        // Loop through each availability in the array
        const overlaps = availabilities.some((a, i) => {
          // Check if there are any time overlaps with other availabilities
          return (
            i !== index && // Ensure it's not comparing the same item to itself
            a.dayOfWeek === availability.dayOfWeek && // Check if it's the same day of the week
            // If a.dayOfWeek === availability.dayOfWeek is true
            timeToFloat(a.startTime) < timeToFloat(availability.endTime) &&
            timeToFloat(a.endTime) > timeToFloat(availability.startTime)
          );
        });

        if (overlaps) {
          // If there is an overlap, add a validation issue
          ctx.addIssue({
            code: "custom", // Custom validation error code
            message: "Availability overlaps with another", // Custom error message
            path: [index, "startTime"],
          });
        }

        if (
          timeToFloat(availability.startTime) >=
          timeToFloat(availability.endTime)
        ) {
          ctx.addIssue({
            code: "custom",
            message: "End time must be after start time",
            path: [index, "endTime"],
          });
        }
      });
    }),
});
