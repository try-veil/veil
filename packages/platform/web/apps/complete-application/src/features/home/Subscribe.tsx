import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Subscribe() {
  return (
    <div className="flex px-6 bg-white text-black flex-col items-center justify-center gap-0 lg:gap-4 pb-24 min-h-[70vh]">
      <h2 className="text-xl px-2 lg:text-4xl font-black text-black  text-center">
        So, what are you waiting for?
      </h2>
      <p className="text-sm px-2 lg:text-3xl font-medium text-gray-500  text-center">
        Stay Updated with the Latest News, Tips, and Updates!{" "}
      </p>

      <div className="flex flex-col lg:flex-row gap-4 mt-8">
        <Input
          placeholder="Enter your email..."
          className="bg-[#F5F5F5] placeholder:text-sm p-4 lg:p-8 lg:px-12 lg:w-2xl border-0"
        />
        <Button variant={"primary-scale"} className="p-4 lg:p-8 lg:px-12">
          Subscribe
        </Button>
      </div>
    </div>
  );
}
