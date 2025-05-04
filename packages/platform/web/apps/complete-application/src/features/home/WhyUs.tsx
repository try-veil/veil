import { FileCode, Plane, Compass } from "lucide-react";
import React from "react";

export default function WhyUs() {
  return (
    <div id="why-us" className="flex bg-background flex-col items-center justify-center gap-0 lg:gap-4 min-h-[80vh]">
      <h2 className="text-3xl px-2 lg:text-4xl font-black max-w-xl text-center mb-4">
        Why Us
      </h2>
      <div className="max-w-7xl mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] rounded-md p-2 w-fit mb-4">
                <Plane className="w-8 h-8 dark:text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">
                Instant Onboarding
              </h3>
              <p>
                Deploy in minutes and spin up your own docs portal on a custom
                domain-no CLI hacks required.
              </p>
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] rounded-md p-2 w-fit mb-4">
                <FileCode className="w-8 h-8 dark:text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">Auto-Docs</h3>
              <p>
                One-click Swagger import means your docs are always up-to-date,
                interactive, and searchable.
              </p>
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-4 items-start p-8">
              <div className="bg-[#F2F5FB] rounded-md p-2 w-fit mb-4">
                <Compass className="w-8 h-8 dark:text-black" />
              </div>
              <h3 className="text-xl font-black mb-2 text-center">Compass</h3>
              <p>
                List in the Veil Marketplace in a snap, or keep it private for
                internal teams—your choice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
