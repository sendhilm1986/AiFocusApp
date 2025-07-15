"use client";

import React from 'react';

interface GuidedBreathingAnimationProps {
  scale: number;
  duration: number;
  text: string;
}

export const GuidedBreathingAnimation: React.FC<GuidedBreathingAnimationProps> = ({
  scale,
  duration,
  text,
}) => {
  return (
    <div className="relative w-52 h-52 md:w-64 md:h-64 flex items-center justify-center">
      {/* Scaling container for the wavy background */}
      <div
        className="absolute inset-0 transition-transform ease-in-out"
        style={{
          transform: `scale(${scale})`,
          transitionDuration: `${duration}s`,
        }}
      >
        {/* Wavy shapes container */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-violet-400/30 rounded-full animate-wavy [animation-duration:15s] animate-spin-slow" />
          <div className="absolute inset-0 bg-violet-400/30 rounded-full animate-wavy [animation-duration:20s] animate-spin-medium [animation-direction:reverse]" />
          <div className="absolute inset-0 bg-violet-400/20 rounded-full animate-wavy [animation-duration:12s] animate-spin-slow [animation-direction:reverse]" />
        </div>
      </div>

      {/* Central circle with light/dark mode support */}
      <div className="relative w-[70%] h-[70%] bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-lg dark:shadow-black/50">
        <p
          className="font-heading text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white tracking-wider transition-opacity duration-500"
        >
          {text}
        </p>
      </div>
    </div>
  );
};