"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { VeilLogo } from "./VeilLogo";

const NavLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenuLink>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuLink>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuLink
    ref={ref}
    className={cn(
      "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </NavigationMenuLink>
));
NavLink.displayName = "NavLink";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "bg-background/90 backdrop-blur-md shadow-sm"
          : "bg-background"
      )}
    >
      <div className="veil-container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <VeilLogo width={80} height={30} />
          </Link>

          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium">Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-4 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                    <Link href="/features/monetization" legacyBehavior passHref>
                      <NavLink className="flex flex-col gap-1">
                        <div className="font-medium">Monetization</div>
                        <div className="text-muted-foreground text-xs">Multiple pricing models for your APIs</div>
                      </NavLink>
                    </Link>
                    <Link href="/features/analytics" legacyBehavior passHref>
                      <NavLink className="flex flex-col gap-1">
                        <div className="font-medium">Analytics</div>
                        <div className="text-muted-foreground text-xs">Real-time insights into API usage</div>
                      </NavLink>
                    </Link>
                    <Link href="/features/documentation" legacyBehavior passHref>
                      <NavLink className="flex flex-col gap-1">
                        <div className="font-medium">Documentation</div>
                        <div className="text-muted-foreground text-xs">Automatic API documentation generation</div>
                      </NavLink>
                    </Link>
                    <Link href="/features/security" legacyBehavior passHref>
                      <NavLink className="flex flex-col gap-1">
                        <div className="font-medium">Security</div>
                        <div className="text-muted-foreground text-xs">Robust authentication and rate limiting</div>
                      </NavLink>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/pricing" legacyBehavior passHref>
                  <NavLink>Pricing</NavLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/docs" legacyBehavior passHref>
                  <NavLink>Documentation</NavLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/blog" legacyBehavior passHref>
                  <NavLink>Blog</NavLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm font-medium hover:text-gray-800 px-4 py-2 rounded-lg hidden md:inline-block">
            Log in
          </Link>
          <Button asChild className="veil-primary-button">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
