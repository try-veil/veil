"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

// Feature component for each feature section
function Feature({
  title,
  description,
  linkText,
  linkUrl,
  children,
  reverseOnMobile = false,
}: {
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
  children: React.ReactNode;
  reverseOnMobile?: boolean;
}) {
  return (
    <section className="py-20 md:py-32 overflow-hidden border-t border-gray-100">
      <div className="notion-container">
        <div className={`flex flex-col ${reverseOnMobile ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16`}>
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl md:text-4xl font-normal">{title}</h3>
            <p className="text-lg text-muted-foreground">{description}</p>
            <div>
              <Link href={linkUrl} className="text-blue-600 font-medium hover:underline">
                {linkText} →
              </Link>
            </div>

            <div className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-800 mt-1">
                  <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 2C4.46243 2 2 4.46243 2 7.5C2 10.5376 4.46243 13 7.5 13C10.5376 13 13 10.5376 13 7.5C13 4.46243 10.5376 2 7.5 2ZM1 7.5C1 3.91015 3.91015 1 7.5 1C11.0899 1 14 3.91015 14 7.5C14 11.0899 11.0899 14 7.5 14C3.91015 14 1 11.0899 1 7.5ZM7.5 3.5C7.77614 3.5 8 3.72386 8 4V7H10.5C10.7761 7 11 7.22386 11 7.5C11 7.77614 10.7761 8 10.5 8H7.5C7.22386 8 7 7.77614 7 7.5V4C7 3.72386 7.22386 3.5 7.5 3.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Building blocks</h4>
                  <p className="text-sm text-muted-foreground">100+ content types to communicate any idea.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-800 mt-1">
                  <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H3.5C3.22386 4 3 3.77614 3 3.5ZM1 6.5C1 5.67157 1.67157 5 2.5 5H12.5C13.3284 5 14 5.67157 14 6.5V11.5C14 12.3284 13.3284 13 12.5 13H2.5C1.67157 13 1 12.3284 1 11.5V6.5ZM2.5 6C2.22386 6 2 6.22386 2 6.5V11.5C2 11.7761 2.22386 12 2.5 12H12.5C12.7761 12 13 11.7761 13 11.5V6.5C13 6.22386 12.7761 6 12.5 6H2.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Collaborative tools</h4>
                  <p className="text-sm text-muted-foreground">Built for teams to share, suggest, and comment.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-800 mt-1">
                  <svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7.5 1.5C4.5 1.5 2.5 3.5 2.5 6.5C2.5 9.5 4.5 11.5 7.5 11.5C10.5 11.5 12.5 9.5 12.5 6.5C12.5 3.5 10.5 1.5 7.5 1.5ZM1.5 6.5C1.5 2.91015 4.13401 0.5 7.5 0.5C10.866 0.5 13.5 2.91015 13.5 6.5C13.5 10.0899 10.866 12.5 7.5 12.5C4.13401 12.5 1.5 10.0899 1.5 6.5ZM7 8.5L10 5.5L9.5 5L7 7.5L5.5 6L5 6.5L7 8.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-sm">AI-assisted</h4>
                  <p className="text-sm text-muted-foreground">Edit, draft, translate. Ask and AI will help.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// FeatureCard for apps replaced by Notion
function FeatureCard({ icon, title }: { icon: string | null; title: string }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      {icon ? (
        <Image src={icon} alt={title} width={16} height={16} />
      ) : (
        <div className="w-4 h-4 bg-gray-200 rounded-sm"></div>
      )}
      <span className="text-sm">{title}</span>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <>
      <Feature
        title="Build perfect docs, together."
        description="Capture your ideas, get feedback from teammates, and ask AI to add the finishing touches."
        linkText="Explore docs & notes"
        linkUrl="/product/docs"
      >
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#fddd91] p-4 md:p-8">
          <div className="relative h-full w-full rounded-lg overflow-hidden bg-white shadow-lg">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://ext.same-assets.com/4258207962/1574989332.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          <div className="absolute bottom-8 left-8 flex gap-2 md:gap-3">
            <FeatureCard icon="https://ext.same-assets.com/4258207962/3815707374.svg" title="Evernote" />
            <FeatureCard icon="https://ext.same-assets.com/4258207962/3432732447.svg" title="Google Docs" />
            <FeatureCard icon="https://ext.same-assets.com/4258207962/3834027391.svg" title="Coda" />
          </div>
        </div>
      </Feature>

      <Feature
        title="Your workflow. Your way."
        description="All your projects, goals, calendars, roadmaps, and more—in one tool—personalized to how you and your team work."
        linkText="Explore projects"
        linkUrl="/product/projects"
        reverseOnMobile={true}
      >
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#e3e2e2] p-4 md:p-8">
          <div className="relative h-full w-full rounded-lg overflow-hidden bg-[#1c1c1c] shadow-lg">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://ext.same-assets.com/4258207962/1364591630.mp4"
                type="video/mp4"
              />
            </video>
          </div>

          <div className="absolute bottom-8 left-8 flex gap-2 md:gap-3">
            <FeatureCard icon="https://ext.same-assets.com/4258207962/785552777.svg" title="Trello" />
            <FeatureCard icon="https://ext.same-assets.com/4258207962/3863356282.svg" title="Asana" />
            <FeatureCard icon="https://ext.same-assets.com/4258207962/2650485436.svg" title="Monday" />
          </div>
        </div>
      </Feature>

      <Feature
        title="Find everything. Instantly."
        description="No more endless searching. Our built-in AI finds what you're looking for, whether it's stored in Notion or one of your other apps."
        linkText="Explore knowledge management"
        linkUrl="/product/wikis"
      >
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#ffe2dd] p-4 md:p-8">
          <div className="relative h-full w-full rounded-lg overflow-hidden bg-white shadow-lg">
            <Image
              src="https://ext.same-assets.com/4258207962/1201812409.png"
              alt="Notion Wiki"
              fill
              className="object-cover"
            />
          </div>

          <div className="absolute bottom-8 left-8 flex flex-col gap-2">
            <FeatureCard icon={null} title="Confluence" />
            <FeatureCard icon={null} title="SharePoint" />
            <FeatureCard icon={null} title="Google Drive" />
          </div>
        </div>
      </Feature>

      <div className="py-20 bg-[#f6f5f4]">
        <div className="notion-container text-center max-w-2xl mx-auto">
          <blockquote className="text-3xl font-normal mb-4">"Your AI everything app."</blockquote>
          <p className="text-muted-foreground">Forbes</p>
        </div>
      </div>

      <Feature
        title="Get a brain boost."
        description="Built right into your workspace, Notion AI is ready to brainstorm, summarize, help you write, and find what you're looking for."
        linkText="Try Notion AI"
        linkUrl="/product/ai"
        reverseOnMobile={true}
      >
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#f1f0ef] p-4 md:p-8">
          <div className="relative h-full w-full rounded-lg overflow-hidden bg-white shadow-lg">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://ext.same-assets.com/4258207962/3024247373.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </Feature>
    </>
  );
}
