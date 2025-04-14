import { Button } from "@/components/ui/button";
import Image from "next/image";
import React from "react";

export default function Hero() {
  return (
    <div className="flex bg-background mt-36 flex-col items-center justify-center gap-0 lg:gap-4 h-[100vh]">
      <h2 className="text-3xl px-2 lg:text-4xl font-black max-w-xl text-center mb-4">
        Lorem Ipsum Lorem Ipsum Lorem Ipsum Ipsum
      </h2>
      <p className="text-base px-4 lg:text-xl font-medium max-w-3xl text-center mb-4">
        lorem ipsum lorem ipsumlorem ipsum lorem ipsumlorem ipsum lorem
        ipsumlorem ipsum lorem ipsum lorem ipsumlorem ipsum lorem ipsumlorem
        ipsum lorem
      </p>
      <div className="flex justify-center items-center gap-4">
        <Button variant={"secondary-scale"}>Get a Demo</Button>
        <Button variant={"primary-scale"}>Try For Free</Button>
      </div>
      <div className="relative h-full w-[90vw] lg:h-[500px] lg:w-full">
        <Image
          src="/dashboard.png"
          alt="Dashboard"
          fill
          objectFit="contain"
          className="object-contain rounded-2xl"
        />
      </div>
    </div>
  );
}
