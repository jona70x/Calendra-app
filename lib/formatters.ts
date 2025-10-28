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
