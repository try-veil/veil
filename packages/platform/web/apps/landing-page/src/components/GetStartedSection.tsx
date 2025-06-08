"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function GetStartedSection() {
  return (
    <section className="pt-20 pb-32 md:pt-32 md:pb-40 bg-white">
      <div className="notion-container text-center">
        <h2 className="text-3xl md:text-4xl font-normal mb-20">
          Get started.
        </h2>

        <div className="flex flex-col md:flex-row gap-12 max-w-4xl mx-auto">
          <div className="flex-1 flex flex-col items-center">
            <h3 className="font-medium text-xl mb-4">Notion</h3>
            <div className="bg-gray-100 rounded-2xl p-2 aspect-square w-full max-w-[280px] mb-8 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="https://ext.same-assets.com/4258207962/1201812409.png"
                  alt="Notion screenshot"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button asChild className="notion-primary-button">
                <Link href="/signup">Try it free</Link>
              </Button>
              <Button asChild variant="outline" className="border border-gray-300">
                <Link href="/download">Download now</Link>
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <h3 className="font-medium text-xl mb-4">Notion Calendar</h3>
            <div className="bg-gray-100 rounded-2xl p-2 aspect-square w-full max-w-[280px] mb-8 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="https://ext.same-assets.com/4258207962/1201812409.png"
                  alt="Notion Calendar screenshot"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button asChild className="notion-primary-button">
                <Link href="/signup">Try it free</Link>
              </Button>
              <Button asChild variant="outline" className="border border-gray-300">
                <Link href="/product/calendar/download">Download now</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
