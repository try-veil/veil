"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="notion-container">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Get Started Section */}
          <div className="lg:w-1/3 space-y-10">
            <div>
              <h3 className="font-medium text-lg mb-5">Get started.</h3>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  <h4 className="font-medium mb-3">Notion</h4>
                  <div className="flex gap-3">
                    <Link href="/signup" className="notion-primary-button whitespace-nowrap text-xs">
                      Try it free
                    </Link>
                    <Link href="/download" className="notion-secondary-button whitespace-nowrap text-xs">
                      Download now
                    </Link>
                  </div>
                </div>

                <div className="flex-1">
                  <h4 className="font-medium mb-3">Notion Calendar</h4>
                  <div className="flex gap-3">
                    <Link href="/signup" className="notion-primary-button whitespace-nowrap text-xs">
                      Try it free
                    </Link>
                    <Link href="/product/calendar/download" className="notion-secondary-button whitespace-nowrap text-xs">
                      Download now
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Logo and Social Media */}
            <div>
              <Link href="/" className="inline-block mb-4">
                <svg width="32" height="32" viewBox="0 0 255 255" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 22.637 40.499 L 44.882 24.092 C 50.214 20.228 57.493 21.116 61.657 26.047 L 224.49 221.908 C 228.654 226.84 227.924 234.09 222.592 237.954 L 200.346 254.362 C 195.014 258.225 187.736 257.337 183.572 252.406 L 20.739 56.545 C 16.575 51.614 17.304 44.363 22.637 40.499 Z" fill="#000000"></path>
                  <path d="M 106.512 0.906 L 193.493 0.637 C 200.037 0.61 205.558 5.937 205.585 12.574 L 207.062 241.823 C 207.088 248.459 201.578 253.867 195.034 253.893 L 108.054 254.163 C 101.51 254.189 95.988 248.862 95.962 242.226 L 94.485 12.976 C 94.458 6.34 99.968 0.932 106.512 0.906 Z" fill="#000000"></path>
                  <path d="M 37.045 97.474 L 123.673 42.337 C 129.909 38.492 138.079 40.34 141.833 46.443 L 227.097 186.416 C 230.851 192.519 229.004 200.485 222.768 204.33 L 136.141 259.467 C 129.904 263.313 121.734 261.465 117.98 255.362 L 32.716 115.388 C 28.962 109.285 30.809 101.319 37.045 97.474 Z" fill="#000000"></path>
                </svg>
              </Link>

              <div className="flex gap-4">
                <a href="https://www.instagram.com/notionhq/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="currentColor"/>
                  </svg>
                </a>
                <a href="https://twitter.com/NotionHQ" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 18.901 1.153 H 22.523 L 14.542 10.202 L 24 22.846 H 16.612 L 10.904 15.219 L 4.338 22.846 H 0.716 L 9.211 13.22 L 0 1.153 H 7.581 L 12.731 8.143 L 18.901 1.153 Z M 17.67 20.644 H 19.654 L 6.422 3.239 H 4.297 L 17.67 20.644 Z" fill="currentColor" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/company/notionhq/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="currentColor"/>
                  </svg>
                </a>
                <a href="https://www.facebook.com/NotionHQ/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" fill="currentColor" />
                  </svg>
                </a>
                <a href="https://www.youtube.com/channel/UCoSvlWS5XcwaSzIcbuJ-Ysg" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23.8 7.2s-.2-1.7-1-2.4c-.9-1-1.9-1-2.4-1-3.4-.2-8.4-.2-8.4-.2s-5 0-8.4.2c-.5.1-1.5.1-2.4 1-.7.7-1 2.4-1 2.4S0 9.1 0 11.1v1.8c0 1.9.2 3.9.2 3.9s.2 1.7 1 2.4c.9 1 2.1.9 2.6 1 1.9.2 8.2.2 8.2.2s5 0 8.4-.2c.5-.1 1.5-.1 2.4-1 .7-.7 1-2.4 1-2.4s.2-1.9.2-3.9V11c0-1.9-.2-3.8-.2-3.8zm-14.3 7.7V8.4l6.5 3.2-6.5 3.3z" fill="currentColor" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div>
              <h3 className="font-medium text-sm uppercase text-muted-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/about" className="text-sm hover:text-gray-900">About us</Link></li>
                <li><Link href="/careers" className="text-sm hover:text-gray-900">Careers</Link></li>
                <li><Link href="/security" className="text-sm hover:text-gray-900">Security</Link></li>
                <li><Link href="https://status.notion.so" className="text-sm hover:text-gray-900">Status</Link></li>
                <li><Link href="https://www.notion.so/28ffdd083dc3473e9c2da6ec011b58ac" className="text-sm hover:text-gray-900">Terms & privacy</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-sm uppercase text-muted-foreground mb-4">Download</h3>
              <ul className="space-y-3">
                <li><Link href="/mobile" className="text-sm hover:text-gray-900">iOS & Android</Link></li>
                <li><Link href="/desktop" className="text-sm hover:text-gray-900">Mac & Windows</Link></li>
                <li><Link href="/product/calendar/download" className="text-sm hover:text-gray-900">Calendar</Link></li>
                <li><Link href="/web-clipper" className="text-sm hover:text-gray-900">Web Clipper</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-sm uppercase text-muted-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><Link href="/help" className="text-sm hover:text-gray-900">Help center</Link></li>
                <li><Link href="/pricing" className="text-sm hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/blog" className="text-sm hover:text-gray-900">Blog</Link></li>
                <li><Link href="/community" className="text-sm hover:text-gray-900">Community</Link></li>
                <li><Link href="/integrations" className="text-sm hover:text-gray-900">Integrations</Link></li>
                <li><Link href="/templates" className="text-sm hover:text-gray-900">Templates</Link></li>
                <li><Link href="/affiliates" className="text-sm hover:text-gray-900">Affiliates</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-sm uppercase text-muted-foreground mb-4">Notion for</h3>
              <ul className="space-y-3">
                <li><Link href="/enterprise" className="text-sm hover:text-gray-900">Enterprise</Link></li>
                <li><Link href="/teams" className="text-sm hover:text-gray-900">Small business</Link></li>
                <li><Link href="/personal" className="text-sm hover:text-gray-900">Personal</Link></li>
                <li><Link href="/explore" className="text-sm hover:text-gray-900">Explore more</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 text-sm text-muted-foreground">
          © 2025 Notion Labs, Inc.
        </div>
      </div>
    </footer>
  );
}
