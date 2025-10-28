import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const user = await currentUser();

  if (!user) return <LandingPage />;

  return redirect("/events");
  return <h1 className="font-bold text-center">Calendar app</h1>;
}
