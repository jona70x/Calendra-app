// page for creating a new event. It uses a card layout to display a center form on the screen.
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export default function NewEventPage() {
  return (
    <Card className="max-w-md mx-auto border-8 border-blue-200 shadow-2xl shadow-accent-foreground">
      {/* Header section for the Card displaying title */}
      <CardHeader>
        <CardTitle>New Event</CardTitle>
      </CardHeader>
      {/* Section that contains form to create a new event */}
      <CardContent>{/* <EventForm /> */}</CardContent>
    </Card>
  );
}
