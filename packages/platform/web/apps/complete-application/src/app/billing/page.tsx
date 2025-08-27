"use client";

import Navbar from "@/features/home/Navbar";
import BillingOverview from "@/features/billing/overview";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export default function Billing() {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <div className="pt-24">
        <BillingOverview />
      </div>
    </main>
  );
}