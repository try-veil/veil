"use client";

import Navbar from "@/features/home/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export default function BillingInformationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      {children}
    </main>
  );
}