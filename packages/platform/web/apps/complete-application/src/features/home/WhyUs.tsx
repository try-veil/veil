import { TimerIcon } from "lucide-react";
import React from "react";

export default function WhyUs() {
  return (
    <div className="flex bg-white text-black flex-col items-center justify-center gap-0 lg:gap-4 min-h-[80vh]">
      <h2 className="text-3xl px-2 lg:text-4xl font-black text-black max-w-xl text-center mb-4">
        Why Us
      </h2>
      <div className="max-w-7xl mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] border border-black rounded-md p-2 w-fit mb-4">
                <TimerIcon className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">
                Lorem Ipsum
              </h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.
              </p>
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] border border-black rounded-md p-2 w-fit mb-4">
                <TimerIcon className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">
                Lorem Ipsum
              </h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.
              </p>
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] border border-black rounded-md p-2 w-fit mb-4">
                <TimerIcon className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">
                Lorem Ipsum
              </h3>
              <p>
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Dignissimos, quibusdam.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
