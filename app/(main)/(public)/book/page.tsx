import Loading from "@/components/Loading";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function PublicPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    // show loading until data is available
    return <Loading />;
  }

  if (!user) {
    return redirect("/login");
  }
  // public page
  return redirect(`/book/${user.id}`);
}
