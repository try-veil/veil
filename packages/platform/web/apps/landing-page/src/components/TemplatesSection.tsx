"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function TemplatesSection() {
  return (
    <div className="bg-[#f6f5f4] py-20">
      <div className="notion-container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-normal mb-4">Start with a template. Build anything.</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Customize one of 30,000+ templates to instantly setup your workflow.
          </p>
          <Link href="/templates" className="text-blue-600 font-medium hover:underline inline-block mt-4">
            Browse all templates →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <TemplateCard
            title="Company Wiki"
            iconColor="#ff8c41"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM5 19V5H19V19H5Z" fill="currentColor"/>
                <path d="M14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" fill="currentColor"/>
              </svg>
            }
          />

          <TemplateCard
            title="Project Roadmap"
            iconColor="#0b84f3"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
              </svg>
            }
          />

          <TemplateCard
            title="OKRs"
            iconColor="#ff8078"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
              </svg>
            }
          />

          <TemplateCard
            title="Meeting Notes"
            iconColor="#ffcc4d"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 17H4V19H14V17ZM20 9H4V11H20V9ZM4 15H20V13H4V15ZM4 5V7H20V5H4Z" fill="currentColor"/>
              </svg>
            }
          />

          <TemplateCard
            title="Vacation Planner"
            iconColor="#06cf86"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8ZM9 14H7V12H9V14ZM13 14H11V12H13V14ZM17 14H15V12H17V14ZM9 18H7V16H9V18ZM13 18H11V16H13V18ZM17 18H15V16H17V18Z" fill="currentColor"/>
              </svg>
            }
          />

          <TemplateCard
            title="Editorial Calendar"
            iconColor="#9a6aff"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 13H2V11H22V13Z" fill="currentColor"/>
                <path d="M11 2V22H13V2H11Z" fill="currentColor"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ title, icon, iconColor }: { title: string; icon: React.ReactNode; iconColor: string }) {
  return (
    <Card className="border-0 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-6 space-y-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white`} style={{ backgroundColor: iconColor }}>
            {icon}
          </div>
          <h3 className="font-medium text-base">{title}</h3>
        </div>
        <div className="h-32 bg-gray-100"></div>
      </CardContent>
    </Card>
  );
}
