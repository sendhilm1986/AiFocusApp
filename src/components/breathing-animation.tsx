"use client";

import React from 'react';

interface BreathingAnimationProps {
  phase: 'inhale' | 'exhale' | 'hold' | '';
  duration: number;
}

export const BreathingAnimation: React.FC<BreathingAnimationProps> = ({ phase, duration }) => {
  const scale = phase === 'inhale' ? 1.2 : 1;
  const opacity = phase === 'hold' ? 0.8 : 1;

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer glow */}
      <div
        className="absolute w-full h-full rounded-full bg-chart-1/20 transition-all ease-in-out"
        style={{
          transform: `scale(${scale * 1.2})`,
          transitionDuration: `${duration}s`,
          opacity: opacity,
        }}
      />
      {/* Main circle */}
      <div
        className="absolute w-full h-full rounded-full bg-gradient-to-br from-chart-1/70 to-chart-2/70 transition-all ease-in-out"
        style={{
          transform: `scale(${scale})`,
          transitionDuration: `${duration}s`,
          opacity: opacity,
        }}
      />
      {/* Inner core */}
      <div
        className="absolute w-1/2 h-1/2 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 transition-all ease-in-out"
        style={{
          transform: `scale(${scale * 0.9})`,
          transitionDuration: `${duration}s`,
          opacity: opacity,
        }}
      />
    </div>
  );
};