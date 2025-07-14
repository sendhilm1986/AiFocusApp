"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BreathingExerciseAssistant } from '@/components/breathing-exercise-assistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Wind, Loader2 } from 'lucide-react';

function BreathingExercisePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stressLevelParam = searchParams.get('stressLevel');
  const stressLevel = stressLevelParam ? parseInt(stressLevelParam, 10) : null;

  if (!stressLevel || isNaN(stressLevel) || stressLevel < 1 || stressLevel > 5) {
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
              No valid stress level was provided. Please start by tracking your stress.
            </p>
            <Button onClick={() => router.push('/stress-tracker')}>
              Go to Stress Tracker
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
          stressLevel={stressLevel}
          onComplete={() => router.push('/stress-tracker')}
        />
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