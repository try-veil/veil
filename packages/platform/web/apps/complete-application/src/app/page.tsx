"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/features/home/Navbar";
import Hero from "@/features/home/Home";
import About from "@/features/home/About";
import WhyUs from "@/features/home/WhyUs";
import Subscribe from "@/features/home/Subscribe";
import Footer03Page from "@/features/home/Footer";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Home page - Auth state:', {
      isAuthenticated,
      hasUser: !!user,
      hasAccessToken: !!accessToken,
    });
    
    setIsLoading(false);
  }, [isAuthenticated, router, user, accessToken]);

  // During loading, show a minimal loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // For non-authenticated users, show the landing page
  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <Hero />
      <About />
      <WhyUs />
      <Subscribe />
      <Footer03Page />
    </main>
  );
}
