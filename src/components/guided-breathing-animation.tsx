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
      {/* The main animated circle */}
      <div
        className="w-full h-full rounded-full bg-gradient-to-br from-chart-1 to-chart-2 shadow-2xl shadow-primary/20 transition-transform ease-in-out"
        style={{
          transform: `scale(${scale})`,
          transitionDuration: `${duration}s`,
        }}
      />
      {/* The text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="text-3xl md:text-4xl font-bold text-white tracking-widest uppercase transition-opacity duration-500"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};