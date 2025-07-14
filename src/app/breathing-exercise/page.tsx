"use client";

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BreathingExerciseAssistant } from '@/components/breathing-exercise-assistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wind, Loader2, Smile, Meh, Frown, ArrowRight } from 'lucide-react';

const exerciseOptions = [
  { level: 2, title: "Quick Relief", description: "A short session to quickly calm your nerves and find your center.", icon: Smile },
  { level: 3, title: "Moderate Relief", description: "A balanced session to ease moderate stress and restore focus.", icon: Meh },
  { level: 4, title: "Deep Relief", description: "An extended session to thoroughly release tension and promote deep relaxation.", icon: Frown },
  { level: 5, title: "Complete Relief", description: "A comprehensive session for when you need to fully unwind and reset.", icon: Frown }
];

function BreathingExercisePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const stressLevelFromUrl = searchParams.get('stressLevel');
  const initialStressLevel = stressLevelFromUrl ? parseInt(stressLevelFromUrl, 10) : null;

  const [currentStressLevel, setCurrentStressLevel] = useState<number | null>(initialStressLevel);

  // If a stress level is set (from URL or user selection), show the assistant
  if (currentStressLevel) {
    if (isNaN(currentStressLevel) || currentStressLevel < 1 || currentStressLevel > 5) {
      return (
        <div className="p-8 sm:p-12 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Invalid Session
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                An invalid stress level was provided.
              </p>
              <Button onClick={() => setCurrentStressLevel(null)}>
                Choose an Exercise
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Wind className="h-8 w-8" />
              AI Guided Breathing
            </h1>
            <p className="text-muted-foreground">
              Follow the voice prompts to guide you through a relaxing exercise.
            </p>
          </div>
          
          <BreathingExerciseAssistant 
            stressLevel={currentStressLevel}
            onComplete={() => router.push('/stress-tracker')}
          />
        </div>
      </div>
    );
  }

  // If no stress level is set, show the selection screen
  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
            <Wind className="h-8 w-8" />
            Choose Your Exercise
          </h1>
          <p className="text-muted-foreground">
            Select a guided session to begin your journey to calm and clarity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exerciseOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.level} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {option.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-muted-foreground mb-6">
                    {option.description}
                  </p>
                  <Button onClick={() => setCurrentStressLevel(option.level)} className="w-full mt-auto">
                    Start Session
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function BreathingExercisePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading exercise...</p>
        </div>
      </div>
    }>
      <BreathingExercisePageContent />
    </Suspense>
  );
}