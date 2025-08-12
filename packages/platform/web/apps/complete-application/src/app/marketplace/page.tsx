"use client";

import Navbar from "@/features/home/Navbar";
import MarketplaceContent from "@/features/marketplace";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";

export default function Marketplace() {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <div className="pt-24">
        <MarketplaceContent />
      </div>
    </main>
  );
}
