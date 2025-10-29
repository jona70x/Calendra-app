// formats a duration in minutes into a readable string
export function formatEventDescription(durationInMinutes: number): string {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;

  const minutesString = `${minutes} ${minutes > 1 ? "mins" : "min"}`;

  const hoursString = `${hours} ${hours > 1 ? "hours" : "hour"} `;

  if (hours === 0) return minutesString;
  if (minutes === 0) return hoursString;
  return `${hoursString} ${minutesString}`; // returns both hours and minutes if they exist
}
// gets the short offset string for a give timezone

export function formatTimezoneOffset(timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date())
    .find((part) => part.type == "timeZoneName")?.value;
}

// formatter for displaying only the time (e.g., "9:45 AM")
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  timeStyle: "short",
});

// formats a Date object into a short-style time string
export function formatTimeString(date: Date) {
  return timeFormatter.format(date);
}

//formatter for displaying only the date like "Apr 10, 2025"
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

// formats a Date object into a medium-style date string
export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

//formatter that includes both date and time (e.g., "Apr 10, 2025, 9:45 AM")
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

// format a Date object into a readable date + time string
export function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}
