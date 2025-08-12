"use client";

import Navbar from "@/features/home/Navbar";
import ComingSoon from "@/components/coming-soon";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <ComingSoon/>
    </main>
  );
}
