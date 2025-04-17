"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import About from "@/features/home/About";
import Footer03Page from "@/features/home/Footer";
import Hero from "@/features/home/Home";
import Navbar from "@/features/home/Navbar";
import Subscribe from "@/features/home/Subscribe";
import WhyUs from "@/features/home/WhyUs";

interface User {
  id?: string;
  name?: string;
  email?: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string>("");
  const isLoading = status === "loading";
  const user = session?.user as User | null || null;

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <main>
      <Navbar session={status === "authenticated"} user={user} />
      <Hero />
      <About />
      <WhyUs />
      <Subscribe />
      <Footer03Page />
    </main>
  );
}
