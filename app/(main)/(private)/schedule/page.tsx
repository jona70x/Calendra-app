// SchedulePage component responsible for rendering a user's  schedule page. Checks if user is authenticated using Clerk's auth system, if not, redirects user to the sign-in page. Afterwards, it queries the database for the user's schedule, including any availability information associated with it. Once the schedule data is retrieved, it renders the page with a card layout. This component allows the user to view and manage their schedule

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchedule } from "@/server/actions/schedule";
import { auth } from "@clerk/nextjs/server";

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();

  if (userId == null) return redirectToSignIn();

  const schedule = await getSchedule(userId);
  return (
    <Card className="max-w-md mx-auto border-8 border-blue-200 shadow-2xl shadow-accent-foreground">
      <CardHeader>
        <CardTitle>Schedule</CardTitle> {/* Display title for the page */}
      </CardHeader>
      <CardContent>
        {/* <ScheduleForm schedule={schedule} /> */}
        {/* Render the ScheduleForm component with the fetched schedule */}
      </CardContent>
    </Card>
  );
}
