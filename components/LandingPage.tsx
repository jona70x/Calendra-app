"use client"; // Marking this file as user component
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/themes";
export default function LandingPage() {
  return (
    <main className="flex items-center p-10 gap-24 animate-fade-in max-md:flex-col">
      <section className="flex flex-col items-center">
        <Image
          src="/assets/logo.svg"
          width={300}
          height={300}
          alt="Logo"
        ></Image>

        <h1 className="text-2xl font-black lg:text-3xl">
          {"Your time, perfectly planned"}
        </h1>
        <p className="font-extralight">
          Join millions of professionals who easily book meetings with the #1
          scheduling tool
        </p>

        <Image
          src="/assets/planning.svg"
          width={500}
          height={500}
          alt="logo
        "
        ></Image>
      </section>
      <div className="mt-3">
        {/* Clerk sign in component using hash-based routing */}
        <SignIn routing="hash" appearance={{ baseTheme: neobrutalism }} />
      </div>
    </main>
  );
}
