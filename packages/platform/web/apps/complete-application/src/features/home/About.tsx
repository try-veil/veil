"use client";
import { IndianRupee, Rocket, Settings, SquarePlus } from "lucide-react";
import { useState, useEffect } from "react";

export default function About() {
  const [activeArrow, setActiveArrow] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveArrow((prev) => (prev === 2 ? 0 : prev + 1));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Add a delay for each arrow's animation
  const getAnimationDelay = (index: number) => {
    if (activeArrow === index) return "0s";
    if (activeArrow === (index + 2) % 3) return "4s";
    return "8s";
  };

  return (
    <div className="w-full bg-background pt-32 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Manage & Monetize Your APIs
        </h1>

        <p className="text-center text-gray-600 dark:text-gray-200 mb-16 max-w-3xl mx-auto">
          It is a long established fact that a reader will be distracted by the
          readable content of a page when looking at its layout.
        </p>

        {/* Desktop view */}
        <div className="hidden md:flex justify-between items-start relative">
          {/* Publish*/}
          <div className="flex flex-col items-center w-1/3 px-4">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4">
              <SquarePlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Publish</h3>
            <p className="text-justify text-sm text-gray-500 dark:text-gray-200">
              Point Veil's reverse proxy at your existing endpoints and go live
              in minutes. No SDKs, no vendor lock-in-just standard REST or
              GraphQL.
            </p>
          </div>

          {/* Arrow 1 */}
          <div className="w-1/6 flex items-center justify-center">
            <svg
              width="100%"
              height="30"
              viewBox="0 0 200 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-32"
            >
              <path
                d="M0,15 C80,5 120,25 200,15"
                stroke="#999999"
                strokeWidth="5"
                strokeDasharray="10,10"
                fill="none"
              />
            </svg>
          </div>

          {/* Brand*/}
          <div className="flex flex-col items-center w-1/3 px-4">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4">
              <Rocket fill="black" className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Brand</h3>
            <p className="text-justify text-sm text-gray-500 dark:text-gray-200">
              Give every API its own developer portal on your custom domain
              (api.yoursite.com). Full-color logo, URL, and look & feel-so it
              always feels like "you".
            </p>
          </div>

          {/* Arrow 2 */}
          <div className="w-1/6 flex items-center justify-center">
            <svg
              width="100%"
              height="30"
              viewBox="0 0 200 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-32"
            >
              <path
                d="M0,15 C80,5 120,25 200,15"
                stroke="#999999"
                strokeWidth="5"
                strokeDasharray="10,10"
                fill="none"
              />
            </svg>
          </div>

          {/* Manage*/}
          <div className="flex flex-col items-center w-1/3 px-4">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4">
              <Settings className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Manage</h3>
            <p className="text-justify text-sm text-gray-500 dark:text-gray-200">
              Import your OpenAPI/Swagger spec in one click and get a beautiful
              interactive docs site. Write once, publish everywhere.
            </p>
          </div>

          {/* Arrow 3 */}
          <div className="w-1/6 flex items-center justify-center">
            <svg
              width="100%"
              height="30"
              viewBox="0 0 200 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-32"
            >
              <path
                d="M0,15 C80,5 120,25 200,15"
                stroke="#999999"
                strokeWidth="5"
                strokeDasharray="10,10"
                fill="none"
              />
            </svg>
          </div>

          {/* Monetize*/}
          <div className="flex flex-col items-center w-1/3 px-4">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4 border-2 border-blue-500">
              <IndianRupee className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Monetize</h3>
            <p className="text-justify text-sm text-gray-500 dark:text-gray-200">
              Optionally list your API in the Veil Marketplace to instantly
              reach thousands of developers-no extra code or integrations
              needed.
            </p>
          </div>
        </div>

        {/* Mobile view */}
        <div className="md:hidden flex flex-col items-center">
          {/* Publish */}
          <div className="flex flex-col items-center mb-16 w-full max-w-xs z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4">
              <SquarePlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Publish</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Point Veil's reverse proxy at your existing endpoints and go live
              in minutes. No SDKs, no vendor lock-in-just standard REST or
              GraphQL.
            </p>

            {/* Snake arrow down */}
            <div className="relative w-full h-14 mt-6">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M50,0 C70,20 30,40 50,60"
                  stroke="#999999"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="0"
                  r="10"
                  fill="black"
                  className={
                    activeArrow === 0 ? "animate-dot-flow" : "opacity-0"
                  }
                >
                  <animateMotion
                    path="M0,0 C20,20 -20,40 0,60"
                    dur="3s"
                    begin={getAnimationDelay(0)}
                    fill="freeze"
                    repeatCount="1"
                  />
                </circle>
              </svg>
            </div>
          </div>

          {/* Brand */}
          <div className="flex flex-col items-center mb-16 w-full max-w-xs z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4">
              <Rocket fill="black" className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Brand</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Give every API its own developer portal on your custom domain
              (api.yoursite.com). Full-color logo, URL, and look & feel-so it
              always feels like "you".
            </p>

            {/* Snake arrow down */}
            <div className="relative w-full h-14 mt-6">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M50,0 C30,20 70,40 50,60"
                  stroke="#999999"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="0"
                  r="10"
                  fill="black"
                  className={
                    activeArrow === 1 ? "animate-dot-flow" : "opacity-0"
                  }
                >
                  <animateMotion
                    path="M0,0 C-20,20 20,40 0,60"
                    dur="3s"
                    begin={getAnimationDelay(1)}
                    fill="freeze"
                    repeatCount="1"
                  />
                </circle>
              </svg>
            </div>
          </div>

          {/* Manage */}
          <div className="flex flex-col items-center mb-16 w-full max-w-xs z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4">
              <Settings className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Manage</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Import your OpenAPI/Swagger spec in one click and get a beautiful
              interactive docs site. Write once, publish everywhere.
            </p>

            {/* Snake arrow down */}
            <div className="relative w-full h-14 mt-6">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 100 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M50,0 C70,20 30,40 50,60"
                  stroke="#999999"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="0"
                  r="10"
                  fill="black"
                  className={
                    activeArrow === 2 ? "animate-dot-flow" : "opacity-0"
                  }
                >
                  <animateMotion
                    path="M0,0 C20,20 -20,40 0,60"
                    dur="3s"
                    begin={getAnimationDelay(2)}
                    fill="freeze"
                    repeatCount="1"
                  />
                </circle>
              </svg>
            </div>
          </div>

          {/* Monetize */}
          <div className="flex flex-col items-center w-full max-w-xs z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4 border-2 border-blue-500">
              <IndianRupee className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Monetize</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Optionally list your API in the Veil Marketplace to instantly
              reach thousands of developers-no extra code or integrations
              needed.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dotAppear {
          0% {
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-dot-flow {
          animation: dotAppear 0.5s forwards;
        }
      `}</style>
    </div>
  );
}
