"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-20 md:pb-28">
      <div className="veil-container">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-6 text-gray-800">
            Monetize your APIs with confidence
          </h1>
          <h2 className="text-xl md:text-2xl text-muted-foreground font-normal mb-8">
            The developer-first platform for selling, monetizing, and monitoring your APIs.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild className="veil-primary-button h-11 px-6">
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6 border border-gray-300 bg-white">
              <Link href="/demo">Schedule a Demo</Link>
            </Button>
          </div>

          <div className="mt-8 mb-16">
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by developers at
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              <div className="text-gray-500 font-medium">Company A</div>
              <div className="text-gray-500 font-medium">Company B</div>
              <div className="text-gray-500 font-medium">Company C</div>
              <div className="text-gray-500 font-medium">Company D</div>
            </div>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/10 aspect-video max-w-4xl mx-auto shadow-lg border border-gray-200">
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
            <div className="bg-white rounded-lg shadow-md w-full h-full p-4 overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-500">api.veil.dev</div>
                </div>
                <div className="grid grid-cols-3 gap-4 flex-grow">
                  <div className="col-span-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-2">API ENDPOINTS</div>
                    <div className="space-y-2">
                      <div className="text-sm font-mono p-1 px-2 bg-gray-100 rounded text-gray-800">/users</div>
                      <div className="text-sm font-mono p-1 px-2 bg-gray-100 rounded text-gray-800">/products</div>
                      <div className="text-sm font-mono p-1 px-2 bg-primary/10 rounded text-primary font-medium">/transactions</div>
                      <div className="text-sm font-mono p-1 px-2 bg-gray-100 rounded text-gray-800">/analytics</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="bg-gray-900 rounded-lg p-3 h-full font-mono text-xs text-gray-300 overflow-hidden">
                      <div className="text-green-400 mb-2">// Monetize your API with just a few lines of code</div>
                      <div className="mb-1">import &#123; veil &#125; from '@veil/sdk';</div>
                      <div className="mb-3">
                        <span className="text-blue-400">const</span> api = veil.createApi(&#123;
                        <br />&nbsp;&nbsp;name: <span className="text-yellow-300">'My Awesome API'</span>,
                        <br />&nbsp;&nbsp;pricing: &#123;
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;type: <span className="text-yellow-300">'tiered'</span>,
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;tiers: [
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; requests: <span className="text-purple-400">1000</span>, price: <span className="text-purple-400">0</span> &#125;,
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; requests: <span className="text-purple-400">10000</span>, price: <span className="text-purple-400">29.99</span> &#125;,
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&#123; requests: <span className="text-purple-400">100000</span>, price: <span className="text-purple-400">99.99</span> &#125;
                        <br />&nbsp;&nbsp;&nbsp;&nbsp;]
                        <br />&nbsp;&nbsp;&#125;
                        <br />&#125;);
                      </div>
                      <div className="text-blue-400">
                        api.listen(<span className="text-purple-400">3000</span>);
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
