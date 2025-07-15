"use client";

import React from 'react';

export const BouncingBallsLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div
        className="h-4 w-4 bg-chart-1 rounded-full animate-bounce"
        style={{ animationDelay: '-0.3s' }}
      />
      <div
        className="h-4 w-4 bg-chart-2 rounded-full animate-bounce"
        style={{ animationDelay: '-0.15s' }}
      />
      <div
        className="h-4 w-4 bg-chart-3 rounded-full animate-bounce"
      />
       <div
        className="h-4 w-4 bg-chart-4 rounded-full animate-bounce"
        style={{ animationDelay: '0.15s' }}
      />
       <div
        className="h-4 w-4 bg-chart-5 rounded-full animate-bounce"
        style={{ animationDelay: '0.3s' }}
      />
    </div>
  );
};