"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

// ProductCard component for the product grid
function ProductCard({
  href,
  title,
  description,
  icon
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="border border-gray-200 rounded-xl overflow-hidden h-full hover:border-gray-300 hover:shadow-sm transition-all">
        <CardContent className="p-6 flex flex-col h-full space-y-3">
          <div className="text-gray-800">{icon}</div>
          <h3 className="font-medium text-base group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProductGridSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="notion-container">
        <h2 className="text-3xl md:text-4xl font-normal text-center mb-16">
          Everything you need to do your best work.
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <ProductCard
            href="/product/docs"
            title="Docs"
            description="Build any page, communicate any idea."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM6 20V4H13V9H18V20H6Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/product/wikis"
            title="Wiki"
            description="One home base for all your knowledge."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6ZM20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16ZM13 14H15V11H18V9H15V6H13V9H10V11H13V14Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/product/projects"
            title="Projects"
            description="Manage any project from beginning to end."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 5V13H13V5H19ZM5 5H11V9H5V5ZM5 11H11V19H5V11ZM13 19V15H19V19H13Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/product/ai"
            title="Notion AI"
            description="Finds what you need. Does what you need."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.39 12.39C22.39 12.2 22.32 12.09 22.22 12L21.27 11.05C21.22 10.45 21.10 9.86 20.91 9.30L21.49 8.13C21.54 8.05 21.58 7.92 21.49 7.82L20.18 6.51C20.09 6.42 19.96 6.46 19.87 6.51L18.7 7.09C18.14 6.89 17.55 6.78 16.95 6.73L16 5.78C15.91 5.68 15.8 5.61 15.61 5.61H13.76C13.57 5.61 13.46 5.68 13.37 5.78L12.42 6.73C11.82 6.78 11.23 6.90 10.67 7.09L9.5 6.51C9.42 6.46 9.28 6.42 9.19 6.51L7.88 7.82C7.79 7.91 7.83 8.05 7.88 8.13L8.46 9.30C8.26 9.86 8.15 10.45 8.10 11.05L7.15 12C7.05 12.09 6.98 12.2 6.98 12.39V14.24C6.98 14.43 7.05 14.54 7.15 14.63L8.10 15.58C8.15 16.18 8.27 16.77 8.46 17.33L7.88 18.5C7.83 18.58 7.79 18.71 7.88 18.81L9.19 20.12C9.28 20.21 9.41 20.17 9.5 20.12L10.67 19.54C11.23 19.74 11.82 19.85 12.42 19.9L13.37 20.85C13.46 20.95 13.57 21.02 13.76 21.02H15.61C15.8 21.02 15.91 20.95 16 20.85L16.95 19.9C17.55 19.85 18.14 19.73 18.7 19.54L19.87 20.12C19.95 20.17 20.09 20.21 20.18 20.12L21.49 18.81C21.58 18.72 21.54 18.59 21.49 18.5L20.91 17.33C21.11 16.77 21.22 16.18 21.27 15.58L22.22 14.63C22.32 14.54 22.39 14.43 22.39 14.24V12.39ZM14.69 17.32C12.89 17.32 11.43 15.86 11.43 14.06C11.43 12.26 12.89 10.79 14.69 10.79C16.49 10.79 17.95 12.25 17.95 14.06C17.95 15.87 16.49 17.32 14.69 17.32Z" fill="currentColor"/>
                <path d="M3 6.5H9V8.5H3V6.5ZM3 11.5H7V13.5H3V11.5ZM3 16.5H7V18.5H3V16.5Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/product/calendar"
            title="Calendar"
            description="See all your commitments in one place."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H18V1H16V3H8V1H6V3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V9H19V19ZM19 7H5V5H19V7ZM7 11H12V16H7V11Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/templates/category/planning-goals"
            title="Goals"
            description="Track progress toward what's most important."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.07 4.93C17.22 3.08 14.66 2 11.99 2C7.05 2 3.07 5.98 3.07 10.92C3.07 13.59 4.15 16.15 6.00 18.00C7.86 19.85 10.41 20.93 13.08 20.93C18.02 20.93 22.00 16.95 22.00 12.01C22.00 9.34 20.92 6.78 19.07 4.93ZM18.55 12.27C18.11 14.86 15.86 17.11 13.27 17.55C11.00 17.94 8.80 17.17 7.26 15.63C5.72 14.09 4.95 11.89 5.34 9.62C5.78 7.03 8.03 4.78 10.62 4.34C10.94 4.29 11.25 4.27 11.56 4.27C13.46 4.27 15.29 5.02 16.63 6.36C18.18 7.91 18.95 10.10 18.55 12.27Z" fill="currentColor"/>
                <path d="M14.02 9.50004H11.80V6.50004C11.80 6.09004 11.46 5.75004 11.05 5.75004C10.64 5.75004 10.30 6.09004 10.30 6.50004V10.25C10.30 10.66 10.64 11 11.05 11H14.02C14.43 11 14.77 10.66 14.77 10.25C14.77 9.84004 14.44 9.50004 14.02 9.50004Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/product/sites"
            title="Sites"
            description="Make any page a website in minutes."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 2H3C1.9 2 1 2.9 1 4V20C1 21.1 1.9 22 3 22H21C22.1 22 23 21.1 23 20V4C23 2.9 22.1 2 21 2ZM21 20H3V4H21V20ZM8 6H16V8H8V6ZM8 10H16V12H8V10ZM8 14H16V16H8V14Z" fill="currentColor"/>
              </svg>
            }
          />

          <ProductCard
            href="/templates"
            title="Templates"
            description="Get started with one of 30,000+ templates."
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM8.93 13.44L10.05 15.94L12.81 16.43L10.87 18.3L11.44 21.04L8.93 19.75L6.42 21.04L6.99 18.3L5.05 16.43L7.81 15.94L8.93 13.44Z" fill="currentColor"/>
              </svg>
            }
          />
        </div>
      </div>
    </section>
  );
}
