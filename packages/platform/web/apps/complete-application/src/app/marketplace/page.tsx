"use client";

import Navbar from "@/features/home/Navbar";
import MarketplaceContent from "@/features/marketplace";
import { useAuth } from "@/contexts/AuthContext";

export default function Marketplace() {
  const { user, isAuthenticated } = useAuth();

  return (
    <main>
      <Navbar session={isAuthenticated} user={user} />
      <div className="pt-24">
        <MarketplaceContent />
      </div>
    </main>
  );
}
