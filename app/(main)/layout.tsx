import { currentUser } from "@clerk/nextjs/server";
import { ReactNode } from "react";
import PublicNavBar from "@/components/PublicNavBar";
import PrivateNavBar from "@/components/PrivateNavBar";
type MainLayoutProps = {
  children: ReactNode;
};
export default async function MainLayout({ children }: MainLayoutProps) {
  const user = await currentUser();
  return (
    <main className="relative">
      {/* Render PrivateNavBar if user exists, if not render PublicNavBar  */}
      {user ? <PrivateNavBar /> : <PublicNavBar />}
      {/* <PublicNavBar /> */}
      <section className="pt-36">{children}</section>
    </main>
  );
}
