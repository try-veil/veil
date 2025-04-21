"use client";

import { useEffect, useState } from "react";
import Navbar from "@/features/home/Navbar";
import MarketplaceContent from "@/features/marketplace";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

export default function Marketplace() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <main>
      <Navbar session={!isLoading && user !== null} user={user} />
      <MarketplaceContent />
    </main>
  );
}
