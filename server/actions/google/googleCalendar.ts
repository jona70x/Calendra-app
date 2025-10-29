// functions that communicate with google api

"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { addMinutes, endOfDay, startOfDay } from "date-fns";
import { calendar_v3, google } from "googleapis";

async function getOAuthClient(clerkUserId: string) {
  try {
    // initializing Clerk client
    const client = await clerkClient();

    // fetching the OAuth access token for the given Clerk user ID
    const { data } = await client.users.getUserOauthAccessToken(
      clerkUserId,
      "google"
    );

    // checking if the data is empty or the token is missing, throw an error
    if (data.length === 0 || !data[0].token) {
      throw new Error("No OAuth data or token found for the user.");
    }

    // initializing OAuth2 client with Google credentials
    const oAuthClient = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URL
    );

    // setting the credentials with the obtained access token
    oAuthClient.setCredentials({ access_token: data[0].token });

    return oAuthClient;
  } catch (err: any) {
    throw new Error(`Failed to get OAuth client: ${err.message}`);
  }
}

// Fetches and format calendar events for a user between a given date range
export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date }
): Promise<{ start: Date; end: Date }[]> {
  try {
    // Getting OAuth client for Google Calendar API authentication
    const oAuthClient = await getOAuthClient(clerkUserId);

    if (!oAuthClient) {
      throw new Error("OAuth client could not be obtained.");
    }

    // fetching events from the Google Calendar API
    const events = await google.calendar("v3").events.list({
      calendarId: "primary",
      eventTypes: ["default"],
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      auth: oAuthClient,
    });

    // prcoessign and format the events
    return (
      events.data.items
        ?.map((event) => {
          // handles all-day events (no specific time, just a date)
          if (event.start?.date && event.end?.date) {
            return {
              start: startOfDay(new Date(event.start.date)),
              end: endOfDay(new Date(event.end.date)),
            };
          }

          // handles timed events with exact start and end date-times
          if (event.start?.dateTime && event.end?.dateTime) {
            return {
              start: new Date(event.start.dateTime),
              end: new Date(event.end.dateTime),
            };
          }

          // ignoring events that are missing required time data
          return undefined;
        })
        // filtering out any undefined results and enforce correct typing
        .filter(
          (date): date is { start: Date; end: Date } => date !== undefined
        ) || []
    );
  } catch (err: any) {
    throw new Error(`Failed to fetch calendar events: ${err.message || err}`);
  }
}
// returns google calendar event
export async function createCalendarEvent({
  clerkUserId,
  guestName,
  guestEmail,
  startTime,
  guestNotes,
  durationInMinutes,
  eventName,
}: {
  clerkUserId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
}): Promise<calendar_v3.Schema$Event> {
  try {
    // getting OAuth client and user information for Google Calendar integration.
    const oAuthClient = await getOAuthClient(clerkUserId);
    if (!oAuthClient) {
      throw new Error("OAuth client could not be obtained."); // Error handling if OAuth client is not available.
    }

    const client = await clerkClient(); // Retrieve the Clerk client instance.
    const calendarUser = await client.users.getUser(clerkUserId); // Get the user details from Clerk.

    // getting the user's primary email address from their profile.
    const primaryEmail = calendarUser.emailAddresses.find(
      ({ id }) => id === calendarUser.primaryEmailAddressId // Find the primary email using the ID.
    );

    if (!primaryEmail) {
      throw new Error("Clerk user has no email"); // Throw an error if no primary email is found.
    }

    // creating the Google Calendar event using the Google API client.
    const calendarEvent = await google.calendar("v3").events.insert({
      calendarId: "primary",
      auth: oAuthClient,
      sendUpdates: "all",
      requestBody: {
        attendees: [
          { email: guestEmail, displayName: guestName },
          {
            email: primaryEmail.emailAddress,
            displayName: `${calendarUser.firstName} ${calendarUser.lastName}`,
            responseStatus: "accepted",
          },
        ],
        description: guestNotes
          ? `Additional Details: ${guestNotes}`
          : "No additional details.",
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: addMinutes(startTime, durationInMinutes).toISOString(),
        },
        summary: `${guestName} + ${calendarUser.firstName} ${calendarUser.lastName}: ${eventName}`,
      },
    });

    return calendarEvent.data;
  } catch (error: any) {
    console.error("Error creating calendar event:", error.message || error); // Log the error to the console.
    throw new Error(
      `Failed to create calendar event: ${error.message || error}`
    );
  }
}
