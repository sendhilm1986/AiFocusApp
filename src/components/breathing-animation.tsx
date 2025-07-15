"use client";

import React from 'react';

interface BreathingAnimationProps {
  duration: number;
  scale: number;
}

export const BreathingAnimation: React.FC<BreathingAnimationProps> = ({ duration, scale }) => {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute w-full h-full rounded-full bg-chart-1/20 transition-all ease-in-out"
        style={{
          transform: `scale(${scale * 1.2})`,
          transitionDuration: `${duration}s`,
        }}
      />
      {/* Main circle */}
      <div
        className="absolute w-full h-full rounded-full bg-gradient-to-br from-chart-1/70 to-chart-2/70 transition-all ease-in-out"
        style={{
          transform: `scale(${scale})`,
          transitionDuration: `${duration}s`,
        }}
      />
      {/* Inner core - solid color */}
      <div
        className="absolute w-1/2 h-1/2 rounded-full bg-chart-1 transition-all ease-in-out"
        style={{
          transform: `scale(${scale * 0.9})`,
          transitionDuration: `${duration}s`,
        }}
      />
    </div>
  );
};