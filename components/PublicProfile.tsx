"use client";

import { getPublicEvents, PublicEvent } from "@/server/actions/events";
import { useEffect, useState } from "react";
import Loading from "./Loading";
import { useUser } from "@clerk/nextjs";
import { Copy, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

type PublicProfileProps = {
  userId: string;
  fullName: string | null;
};

export default function PublicProfile({
  userId,
  fullName,
}: PublicProfileProps) {
  const [events, setEvents] = useState<PublicEvent[] | null>();
  const { user } = useUser();

  // function to copy profile url
  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/book/${userId}`
      );
      toast("Profile URL copied to the clipboard!");
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await getPublicEvents(userId);
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      }
    };
    fetchEvents();
  }, [userId]);

  if (events === null) {
    return (
      <div className=" max-w-5xl mx-auto text-center">
        <Loading />
      </div>
    );
  }
  return (
    <div className=" max-w-5xl mx-auto p-5">
      {user?.id === userId && (
        // info message with eye icon only for profile owner
        <div className=" flex items-center gap-2 text-sm text-muted-foreground mb-4 font-bold">
          <Eye className=" w-4 h-4" />
          <p>This is how people will see your public profile</p>
        </div>
      )}

      {/* display user's name */}
      <div className="text-4xl md:text-5xl font-black mb-4 text-center">
        {fullName}
      </div>

      {/* copy profile url button */}
      {user?.id === userId && (
        <div className="flex justify-center mb-6">
          <Button
            className=" cursor-pointer"
            variant={"outline"}
            onClick={copyProfileUrl}
          >
            <Copy className="size-4" />
            Copy Public Profile URL
          </Button>
        </div>
      )}
    </div>
  );
}
