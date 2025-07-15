"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GuidedBreathingAnimationProps {
  scale: number;
  duration: number;
  text: string;
}

const circles = [
  { color: 'bg-[rgba(26,188,156,1.0)]', transform: 'translate(-25%, -40%)' },
  { color: 'bg-[rgba(46,204,113,1.0)]', transform: 'translate(25%, -40%)' },
  { color: 'bg-[rgba(52,152,219,1.0)]', transform: 'translate(-50%, 0)' },
  { color: 'bg-[rgba(155,89,182,1.0)]', transform: 'translate(50%, 0)' },
  { color: 'bg-[rgba(241,196,15,1.0)]', transform: 'translate(-25%, 40%)' },
  { color: 'bg-[rgba(230,126,34,1.0)]', transform: 'translate(25%, 40%)' },
];

export const GuidedBreathingAnimation: React.FC<GuidedBreathingAnimationProps> = ({
  scale,
  duration,
  text,
}) => {
  return (
    <div className="relative w-52 h-52 md:w-64 md:h-64 flex items-center justify-center filter contrast-20">
      {/* The container for the metaballs */}
      <div
        className="absolute w-full h-full filter blur-md animate-spin-very-slow"
        style={{
          transform: `scale(${scale})`,
          transition: `transform ${duration}s ease-in-out`,
        }}
      >
        {circles.map((circle, index) => (
          <div
            key={index}
            className={cn(
              "absolute w-1/2 h-1/2 rounded-full mix-blend-screen opacity-75",
              circle.color
            )}
            style={{
              transform: circle.transform,
            }}
          />
        ))}
      </div>
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