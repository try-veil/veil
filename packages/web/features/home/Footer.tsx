import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dribbble,
  Github,
  Twitter,
} from "lucide-react";
import Link from "next/link";

const footerSections = [
  {
    title: "Pages",
    links: [
      {
        title: "Home",
        href: "#",
      },
      {
        title: "About",
        href: "#",
      },
      {
        title: "Why Us",
        href: "#",
      },
      {
        title: "Pricing",
        href: "#",
      }
    ],
  },
  {
    title: "References",
    links: [
      {
        title: "Documentation",
        href: "#",
      },
      {
        title: "Support",
        href: "#",
      },
    ],
  },
];

const Footer03Page = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="grow " />
      <footer>
        <div className="max-w-screen-xl mx-auto">
          <div className="py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-8 gap-y-10 px-6 xl:px-0">
            <div className="col-span-full xl:col-span-3">
              {/* Logo */}
              <div className="flex gap-1 items-center">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center mr-2">
              </div>
              <span className="text-gray-800 font-semibold text-xl">
                  Veil
                </span>
                </div>
              <p className="mt-4 text-black">
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Quasi, molestiae.
                lorem ipsum dolor sit amet consectetur adipisicing elit. 
              </p>
            </div>

            {footerSections.map(({ title, links }) => (
              <div key={title}>
                <h6 className="font-semibold text-black">{title}</h6>
                <ul className="mt-6 space-y-4">
                  {links.map(({ title, href }) => (
                    <li key={title}>
                      <Link
                        href={href}
                        className="text-black hover:text-foreground"
                      >
                        {title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Subscribe Newsletter */}
            <div className="col-span-2">
              <h6 className="font-semibold text-black">Stay up to date</h6>
              <form className="mt-6 flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="grow max-w-64 placeholder:text-gray-500"
                />
                <Button className="bg-black text-white">Subscribe</Button>
              </form>
            </div>
          </div>
          <Separator />
          <div className="py-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-x-2 gap-y-5 px-6 xl:px-0">
            {/* Copyright */}
            <span className="text-black">
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
              <Link href="#" target="_blank">
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
