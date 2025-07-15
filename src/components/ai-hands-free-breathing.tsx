"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { openaiVoiceService } from '@/lib/openai-voice-service';
import { X, Loader2, Frown, Meh, Angry, Smile, Annoyed, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { BreathingLoader } from './breathing-loader';

type ExerciseState = 'loading' | 'welcome' | 'mood-selection' | 'exercise' | 'completion';

const moods = [
  { name: 'Anxious', icon: Frown, color: 'text-orange-500', bgColor: 'hover:bg-orange-50' },
  { name: 'Stressed', icon: Annoyed, color: 'text-red-500', bgColor: 'hover:bg-red-50' },
  { name: 'Tired', icon: Meh, color: 'text-gray-500', bgColor: 'hover:bg-gray-50' },
  { name: 'Sad', icon: Frown, color: 'text-blue-500', bgColor: 'hover:bg-blue-50' },
  { name: 'Angry', icon: Angry, color: 'text-red-600', bgColor: 'hover:bg-red-50' },
  { name: 'Calm', icon: Smile, color: 'text-green-500', bgColor: 'hover:bg-green-50' },
  { name: 'Energized', icon: Sparkles, color: 'text-yellow-500', bgColor: 'hover:bg-yellow-50' },
];

interface BreathingExercise {
  name: string;
  pattern: (string | number)[];
  intro: string;
  reassurance: string;
}

const moodExercises: Record<string, BreathingExercise> = {
  Anxious: { name: '4-7-8 Breathing', pattern: ['inhale', 4, 'hold', 7, 'exhale', 8], intro: "We'll practice 4-7-8 breathing to calm your mind and body.", reassurance: 'alleviate your anxiety' },
  Stressed: { name: 'Box Breathing', pattern: ['inhale', 4, 'hold', 4, 'exhale', 4, 'hold', 4], intro: 'Box breathing will help you relieve stress and regain focus.', reassurance: 'help you relax' },
  Tired: { name: 'Energizing Breath', pattern: ['inhale', 4, 'exhale', 2, 'inhale', 4, 'exhale', 2, 'inhale', 4, 'exhale', 2], intro: "Let's re-energize with a quick breathing exercise.", reassurance: 'boost your energy' },
  Sad: { name: 'Coherent Breathing', pattern: ['inhale', 5, 'exhale', 5], intro: 'Resonant breathing can gently lift your mood.', reassurance: 'bring a sense of balance' },
  Angry: { name: 'Calming Breath', pattern: ['inhale', 4, 'exhale', 8], intro: 'This extended exhale breathing can ease anger and restore balance.', reassurance: 'help you find calm' },
  Calm: { name: 'Equal Breathing', pattern: ['inhale', 4, 'exhale', 4], intro: 'We will maintain your peaceful state with equal breathing exercises.', reassurance: 'continue your state of peace' },
  Energized: { name: 'Power Breath', pattern: ['inhale', 6, 'hold', 2, 'exhale', 4], intro: "Let's channel your energy with a powerful breathing technique.", reassurance: 'focus your energy' },
};

export const AIHandsFreeBreathing: React.FC = () => {
  const { session } = useSession();
  const router = useRouter();
  const [exerciseState, setExerciseState] = useState<ExerciseState>('loading');
  const [firstName, setFirstName] = useState<string>('there');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [breathingPhase, setBreathingPhase] = useState('');
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [instruction, setInstruction] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const exerciseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const playAudio = useCallback(async (text: string) => {
    if (!audioRef.current) return;
    try {
      const audioUrl = await openaiVoiceService.generateSpeech(text, 'shimmer');
      if (isMountedRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        return new Promise(resolve => {
          if (audioRef.current) {
            audioRef.current.onended = resolve;
          }
        });
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    audioRef.current = new Audio();

    const fetchUser = async () => {
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('first_name').eq('id', session.user.id).single();
        if (data?.first_name && isMountedRef.current) {
          setFirstName(data.first_name);
        }
      }
      if (isMountedRef.current) {
        setExerciseState('welcome');
      }
    };

    fetchUser();

    return () => {
      isMountedRef.current = false;
      if (exerciseTimerRef.current) clearTimeout(exerciseTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [session]);

  useEffect(() => {
    if (exerciseState === 'welcome' && firstName) {
      const welcome = async () => {
        await playAudio(`Welcome, ${firstName}. How are you feeling today?`);
        if (isMountedRef.current) {
          setExerciseState('mood-selection');
        }
      };
      welcome();
    }
  }, [exerciseState, firstName, playAudio]);

  const startExercise = useCallback((mood: string) => {
    const exercise = moodExercises[mood];
    if (!exercise) return;

    let currentIndex = -2; // Start at -2 to make the first index 0
    const pattern = exercise.pattern;
    const totalCycles = 5;
    let currentCycle = 0;

    const runCycle = async () => {
      if (!isMountedRef.current) return;

      // Move to the next phase/duration pair
      currentIndex += 2;

      // Check if we've completed a full pattern loop
      if (currentIndex >= pattern.length) {
        currentCycle++;
        if (currentCycle >= totalCycles) {
          if (isMountedRef.current) setExerciseState('completion');
          return;
        }
        currentIndex = 0; // Reset to the start of the pattern for the next cycle
      }

      const phase = pattern[currentIndex];
      const duration = pattern[currentIndex + 1];

      // Type check to ensure pattern is not malformed and prevent runtime errors
      if (typeof phase !== 'string' || typeof duration !== 'number') {
        console.error('Malformed breathing pattern detected. Stopping exercise.');
        if (isMountedRef.current) setExerciseState('completion');
        return;
      }

      if (isMountedRef.current) {
        setBreathingPhase(phase);
        setPhaseDuration(duration);
        setInstruction(phase.charAt(0).toUpperCase() + phase.slice(1));
        await playAudio(phase);

        // Only set the timeout if the component is still mounted after the audio plays
        if (isMountedRef.current) {
            exerciseTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) runCycle();
            }, duration * 1000);
        }
      }
    };
    runCycle();
  }, []);

  useEffect(() => {
    if (exerciseState === 'exercise' && selectedMood) {
      startExercise(selectedMood);
    }
  }, [exerciseState, selectedMood, startExercise]);

  useEffect(() => {
    if (exerciseState === 'completion') {
      playAudio(`Well done, ${firstName}. Whenever you're ready, you may repeat this session or close the screen.`);
    }
  }, [exerciseState, firstName, playAudio]);

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    const exercise = moodExercises[mood];
    await playAudio(`Thank you for sharing, ${firstName}. I will guide you through a transformative meditation to ${exercise.reassurance}. ${exercise.intro}`);
    if (isMountedRef.current) {
      setExerciseState('exercise');
    }
  };

  const handleRepeat = () => {
    if (selectedMood) {
      setExerciseState('exercise');
    }
  };

  const renderContent = () => {
    switch (exerciseState) {
      case 'loading':
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center">
            <BreathingLoader />
            <p className="text-xl mt-8 text-muted-foreground">Preparing your session...</p>
          </div>
        );
      case 'mood-selection':
        return (
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-bold mb-8">How are you feeling today?</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {moods.map(mood => {
                const Icon = mood.icon;
                return (
                  <Button
                    key={mood.name}
                    variant="outline"
                    className={cn("h-24 text-lg flex flex-col gap-2 transition-colors", mood.bgColor)}
                    onClick={() => handleMoodSelect(mood.name)}
                  >
                    <Icon className={cn("h-10 w-10", mood.color)} strokeWidth={1.5} />
                    {mood.name}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      case 'exercise':
        return (
          <div className="text-center flex flex-col items-center">
            <div
              className={cn(
                "w-48 h-48 rounded-full bg-primary/20 flex items-center justify-center transition-transform ease-in-out",
                breathingPhase === 'inhale' ? 'scale-150' : 'scale-100'
              )}
              style={{ transitionDuration: `${phaseDuration}s` }}
            >
              <p className="text-3xl font-bold text-primary-foreground">{instruction}</p>
            </div>
            <p className="text-2xl mt-8 text-muted-foreground">{moodExercises[selectedMood!]?.name}</p>
          </div>
        );
      case 'completion':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-8">Well done, {firstName}.</h1>
            <p className="text-xl text-muted-foreground mb-8">You've completed the exercise.</p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={handleRepeat}>Repeat Session</Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/')}>Close</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <X className="h-8 w-8" />
        </Button>
      </div>
      {renderContent()}
    </div>
  );
};