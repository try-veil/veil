import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { Carousel } from "@/components/ui/carousel";

export default function Hero() {
  const images = [
    "/dashboard.png",
    "/dashboard.png",
    "/dashboard.png",
    "/dashboard.png"
  ];

  return (
    <div className="flex bg-background mt-28 lg:mt-52 xl:mt-32 flex-col items-center justify-center gap-0 lg:gap-4 lg:h-[100vh]">
      <h2 className="text-3xl px-2 lg:text-4xl font-black max-w-xl text-center mb-4">
        Launch and Monetize your APIs in Minutes
      </h2>
      <p className="text-base px-4 lg:text-xl font-medium max-w-3xl text-center mb-4">
        Veil is an open‑source API marketplace built on a high‑performance
        reverse proxy. Publish your existing APIs, manage subscribers, and start
        earning—without vendor lock‑in.
      </p>
      <div className="flex justify-center items-center gap-4">
        <Link href={"/marketplace"}>
        <Button variant={"secondary-scale"}>See a Demo</Button></Link>
        <Link href={"/signup"}>
        <Button variant={"primary-scale"}>Try For Free</Button>
        </Link>
      </div>
      <div className="relative w-[90vw] h-[250px] lg:h-[500px] lg:w-full lg:max-w-7xl">
        <Carousel images={images} />
      </div>
    </div>
  );
}
