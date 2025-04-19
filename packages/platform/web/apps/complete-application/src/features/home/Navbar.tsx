"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import LoginButton from "@/components/LoginButton";

interface User {
  given_name?: string;
  preferred_username?: string;
  email?: string;
}

interface NavbarProps {
  session: boolean;
  user: User | null;
}

export default function Navbar({ session, user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex items-center justify-center w-full">
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 rounded-3xl z-50 transition-all duration-300 ease-in-out 
        bg-[#ffffffe9] dark:bg-[#020817] border border-[#0000001A]
        w-[90vw] max-w-6xl
      ${
        scrolled
          ? "shadow-lg dark:shadow-[0_4px_12px_rgba(255,255,255,0.08)]"
          : "shadow-[6px_6px_12px_rgba(0,0,0,0.05),-6px_-6px_12px_rgba(255,255,255,0.7)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)]"
      }`}
        style={{ backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 px-2 lg:px-0 lg:h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center mr-2"></div>
                <span className="text-gray-800 dark:text-white font-semibold text-xl">
                  Veil
                </span>
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden lg:flex lg:justify-center lg:items-center lg:space-x-8">
              <Link
                href="/#about"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                About
              </Link>
              <Link
                href="/#why-us"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                Why Us
              </Link>
              <Link
                href="/pricing"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                Documentation
              </Link>
              <Link
                href="/projects"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                My Projects
              </Link>
              <Link
                href="/marketplace"
                className="text-gray-700 dark:text-white hover:text-black transition-colors duration-200"
              >
                Marketplace
              </Link>

              <LoginButton session={session} user={user} />
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-white hover:text-black focus:outline-none"
                aria-expanded="false"
              >
                <div className="relative w-6 h-5">
                  <span
                    className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${
                      isOpen ? "rotate-45 translate-y-2.5" : ""
                    }`}
                  ></span>
                  <span
                    className={`absolute h-0.5 w-6 bg-current transform transition-opacity duration-300 ease-in-out ${
                      isOpen ? "opacity-0" : ""
                    } top-2`}
                  ></span>
                  <span
                    className={`absolute h-0.5 w-6 bg-current transform transition duration-300 ease-in-out ${
                      isOpen ? "-rotate-45 -translate-y-2.5" : ""
                    } top-4`}
                  ></span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`lg:hidden transform transition-all duration-300 ease-in-out ${
            isOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 shadow-inner">
            <Link
              href="/#about"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="/#why-us"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Why Us
            </Link>
            <Link
              href="/pricing"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Documentation
            </Link>
            <Link
              href="/marketplace"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Marketplace
            </Link>
            <Link
              href="/projects"
              className="text-gray-700 dark:text-white hover:text-black block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              My Projects
            </Link>
            <div className="pt-4 pb-2">
              <LoginButton session={session} user={user} />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
