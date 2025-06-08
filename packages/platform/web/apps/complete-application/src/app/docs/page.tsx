"use client";

import Navbar from "@/features/home/Navbar";
import ComingSoon from "@/components/coming-soon";
import { useAuth } from "@/contexts/AuthContext";

export default function Terms() {
  const { user, isAuthenticated } = useAuth();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <ComingSoon/>
    </main>
  );
}
