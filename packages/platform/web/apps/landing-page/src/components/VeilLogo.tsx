"use client";

import React from "react";

interface VeilLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function VeilLogo({ width = 120, height = 40, className = "" }: VeilLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 960 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* The VEIL logo recreated based on the image */}
      <path
        d="M170 50L80 270H40L150 50H170Z"
        fill="#2E7DE6"
      />
      <path
        d="M300 50L210 270H170L260 50H300Z"
        fill="#2E7DE6"
      />
      <path
        d="M610 50H640L550 270H520L610 50Z"
        fill="#2E7DE6"
      />
      <path
        d="M740 50H770L680 270H650L740 50Z"
        fill="#2E7DE6"
      />
      <path
        d="M390 180H520V130H390V180Z"
        fill="#2E7DE6"
      />
      <path
        d="M390 270H520V220H390V270Z"
        fill="#2E7DE6"
      />
    </svg>
  );
}
