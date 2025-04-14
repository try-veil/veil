"use client";
import { useState, useEffect } from 'react';

export default function About() {
  const [activeArrow, setActiveArrow] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveArrow((prev) => (prev === 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-background pt-32 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">Manage & Monetize Your APIs</h1>
        
        <p className="text-center text-gray-600 dark:text-gray-200 mb-16 max-w-3xl mx-auto">
          It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.
        </p>

        {/* Desktop view */}
        <div className="hidden md:flex justify-between items-start relative">
          {/* Publish APIs */}
          <div className="flex flex-col items-center w-1/3 px-4 z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13C5 10.7909 6.79086 9 9 9H15C17.2091 9 19 10.7909 19 13V14.5C19 15.3284 18.3284 16 17.5 16H6.5C5.67157 16 5 15.3284 5 14.5V13Z" fill="black" />
                <path d="M12 4L15 8H9L12 4Z" fill="black" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Publish APIs</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            </p>
          </div>

          {/* Manage APIs */}
          <div className="flex flex-col items-center w-1/3 px-4 z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="6" width="16" height="12" rx="1" stroke="black" strokeWidth="2" />
                <circle cx="16" cy="12" r="2" fill="black" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Manage APIs</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            </p>
          </div>

          {/* Monetize Your APIs */}
          <div className="flex flex-col items-center w-1/3 px-4 z-10">
            <div className="dark:bg-white rounded-lg p-6 shadow-md w-32 h-32 flex items-center justify-center mb-4 border-2 border-blue-500">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="14" height="14" rx="2" stroke="#0066CC" strokeWidth="2" />
                <path d="M12 8V16M9 12H15" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Monetize Your APIs</h3>
            <p className="text-center text-sm text-gray-500 dark:text-gray-200">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            </p>
          </div>

          {/* Snake-like arrows overlaid */}
          <div className="absolute w-full top-16 left-0 h-16 px-32">
            {/* First arrow */}
            <svg width="100%" height="100%" viewBox="0 0 500 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-0 right-0">
              <path d="M0,30 C80,10 120,50 250,30" stroke="#999999" strokeWidth="2" strokeDasharray="5,5" fill="none" />
              <circle cx="0" cy="30" r="4" fill="black" className={activeArrow === 0 ? "animate-dot-flow" : "opacity-0"}>
                <animateMotion
                  path="M0,0 C80,-20 120,20 250,0"
                  dur="3s"
                  begin={activeArrow === 0 ? "0s" : "indefinite"}
                  fill="freeze"
                  repeatCount="1"
                />
              </circle>
            </svg>
            
            {/* Second arrow */}
            <svg width="100%" height="100%" viewBox="0 0 500 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-0 right-0">
              <path d="M250,30 C380,10 420,50 500,30" stroke="#999999" strokeWidth="2" strokeDasharray="5,5" fill="none" />
              <circle cx="250" cy="30" r="4" fill="black" className={activeArrow === 1 ? "animate-dot-flow" : "opacity-0"}>
                <animateMotion
                  path="M0,0 C130,-20 170,20 250,0"
                  dur="3s"
                  begin={activeArrow === 1 ? "0s" : "indefinite"}
                  fill="freeze"
                  repeatCount="1"
                />
              </circle>
            </svg>
          </div>
        </div>

        {/* Mobile view */}
        <div className="md:hidden flex flex-col items-center">
          {/* Publish APIs */}
          <div className="flex flex-col items-center mb-16 w-full max-w-xs z-10">
            <div className="bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13C5 10.7909 6.79086 9 9 9H15C17.2091 9 19 10.7909 19 13V14.5C19 15.3284 18.3284 16 17.5 16H6.5C5.67157 16 5 15.3284 5 14.5V13Z" fill="black" />
                <path d="M12 4L15 8H9L12 4Z" fill="black" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Publish APIs</h3>
            <p className="text-center text-sm text-gray-500">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            </p>
            
            {/* Snake arrow down */}
            <div className="relative w-full h-14 mt-6">
              <svg width="100%" height="100%" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50,0 C70,20 30,40 50,60" stroke="#999999" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                <circle cx="50" cy="0" r="4" fill="black" className={activeArrow === 0 ? "animate-dot-flow" : "opacity-0"}>
                  <animateMotion
                    path="M0,0 C20,20 -20,40 0,60"
                    dur="3s"
                    begin={activeArrow === 0 ? "0s" : "indefinite"}
                    fill="freeze"
                    repeatCount="1"
                  />
                </circle>
              </svg>
            </div>
          </div>

          {/* Manage APIs */}
          <div className="flex flex-col items-center mb-16 w-full max-w-xs z-10">
            <div className="bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="6" width="16" height="12" rx="1" stroke="black" strokeWidth="2" />
                <circle cx="16" cy="12" r="2" fill="black" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Manage APIs</h3>
            <p className="text-center text-sm text-gray-500">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum
            </p>
            
            {/* Snake arrow down */}
            <div className="relative w-full h-14 mt-6">
              <svg width="100%" height="100%" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50,0 C30,20 70,40 50,60" stroke="#999999" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                <circle cx="50" cy="0" r="4" fill="black" className={activeArrow === 1 ? "animate-dot-flow" : "opacity-0"}>
                  <animateMotion
                    path="M0,0 C-20,20 20,40 0,60"
                    dur="3s"
                    begin={activeArrow === 1 ? "0s" : "indefinite"}
                    fill="freeze"
                    repeatCount="1"
                  />
                </circle>
              </svg>
            </div>
          </div>

          {/* Monetize Your APIs */}
          <div className="flex flex-col items-center w-full max-w-xs z-10">
            <div className="bg-white rounded-lg p-6 shadow-md w-24 h-24 flex items-center justify-center mb-4 border-2 border-blue-500">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="14" height="14" rx="2" stroke="#0066CC" strokeWidth="2" />
                <path d="M12 8V16M9 12H15" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">Monetize Your APIs</h3>
            <p className="text-center text-sm text-gray-500">
              Lorem ipsum lorem ipsum lorem ipsum lorem ipsum
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