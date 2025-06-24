import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dribbble, Github, Twitter } from "lucide-react";
import Link from "next/link";

const footerSections = [
  {
    title: "Product",
    links: [
      {
        title: "Home",
        href: "/",
      },
      {
        title: "About",
        href: "/#about",
      },
      {
        title: "Why Veil",
        href: "/#why-us",
      },
      {
        title: "Pricing",
        href: "/pricing",
      },
      {
        title: "Docs",
        href: "/docs",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        title: "Terms & Conditions",
        href: "/terms",
      },
      {
        title: "Privacy Policy",
        href: "/privacy-policy",
      },
    ],
  },
  {
    title: "Account",
    links: [
      {
        title: "Sign Up",
        href: "/signup",
      },
      {
        title: "Login",
        href: "/login",
      },
    ],
  },
];

const Footer03Page = () => {
  return (
    <div className=" bg-background flex flex-col ">
      <footer>
        <div className="max-w-screen-xl mx-auto">
          <div className="py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-6 gap-x-8 gap-y-10 px-6 xl:px-0">
            <div className="col-span-full xl:col-span-3">
              {/* Logo */}
              <div className="flex gap-1 items-center">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center mr-2"></div>
                <span className="text-gray-800 dark:text-white font-semibold text-xl">
                  Veil
                </span>
              </div>
              <p className="mt-4">
                Veil is the only open-source API marketplace powered by a
                reverse proxy. Self-host anywhere, fully brandable, and designed
                to help indie hackers and enterprises alike publish, manage, and
                monetize APIs at scale.
              </p>
            </div>

            {footerSections.map(({ title, links }) => (
              <div key={title}>
                <h6 className="font-semibold">{title}</h6>
                <ul className="mt-6 space-y-4">
                  {links.map(({ title, href }) => (
                    <li key={title}>
                      <Link href={href} className="hover:text-foreground">
                        {title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator />
          <div className="py-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-x-2 gap-y-5 px-6 xl:px-0">
            {/* Copyright */}
            <span>
              &copy; {new Date().getFullYear()}{" "}
              <Link href="/" target="_blank">
                Veil
              </Link>
              . All rights reserved.
            </span>

            <div className="flex items-center gap-5 text-black">
              <Link href="#" target="_blank">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" target="_blank">
                <Dribbble className="h-5 w-5" />
              </Link>
              <Link href="https://github.com/try-veil/veil" target="_blank">
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer03Page;
