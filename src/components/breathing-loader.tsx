"use client";

import React from 'react';
import { cn } from '@/lib/utils';

export const BreathingLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center w-24 h-24 relative", className)}>
      <div
        className="absolute w-full h-full rounded-full bg-primary/50 animate-breathe"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute w-2/3 h-2/3 rounded-full bg-primary/60 animate-breathe"
        style={{ animationDelay: '0.5s' }}
      />
      <div
        className="absolute w-1/3 h-1/3 rounded-full bg-primary/80 animate-breathe"
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
};