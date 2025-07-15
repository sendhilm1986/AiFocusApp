"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { openaiVoiceService } from '@/lib/openai-voice-service';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { BouncingBallsLoader } from './bouncing-balls-loader';
import { GuidedBreathingAnimation } from './guided-breathing-animation';
import { Input } from '@/components/ui/input';

type ExerciseState = 'loading' | 'welcome' | 'mood-input' | 'analyzing' | 'exercise' | 'completion';

interface BreathingExercise {
  name: string;
  pattern: (string | number)[];
  intro: string;
  reassurance: string;
}

const moodExercises: Record<string, BreathingExercise> = {
  Anxious: { name: '4-7-8 Breathing', pattern: ['inhale', 4, 'hold', 7, 'exhale', 8], intro: "This is a powerful technique for calming your nervous system. Let's begin.", reassurance: 'alleviate your anxiety' },
  Stressed: { name: 'Box Breathing', pattern: ['inhale', 4, 'hold', 4, 'exhale', 4, 'hold', 4], intro: 'It will help you regulate your breath and clear your mind. Let us start.', reassurance: 'relieve your stress' },
  Tired: { name: 'Energizing Breath', pattern: ['inhale', 4, 'exhale', 2, 'inhale', 4, 'exhale', 2, 'inhale', 4, 'exhale', 2], intro: "This rhythmic breathing will help awaken your senses. Let's get started.", reassurance: 'boost your energy' },
  Sad: { name: 'Coherent Breathing', pattern: ['inhale', 5, 'exhale', 5], intro: 'This gentle rhythm can help create a sense of balance and peace. Let us begin.', reassurance: 'gently lift your mood' },
  Angry: { name: 'Calming Breath', pattern: ['inhale', 4, 'exhale', 8], intro: 'Focusing on a longer exhale can help soothe feelings of anger. Let us start.', reassurance: 'find a sense of calm' },
  Calm: { name: 'Equal Breathing', pattern: ['inhale', 4, 'exhale', 4], intro: 'This simple practice will help maintain your peaceful state. Let us begin.', reassurance: 'deepen your sense of peace' },
  Energized: { name: 'Power Breath', pattern: ['inhale', 6, 'hold', 2, 'exhale', 4], intro: "This technique can help you focus your energy. Let's begin.", reassurance: 'channel your positive energy' },
};

const moodToStressScore: Record<string, number> = {
  Anxious: 4,
  Stressed: 4,
  Tired: 3,
  Sad: 3,
  Angry: 5,
  Calm: 2,
  Energized: 1,
};

export const AIHandsFreeBreathing: React.FC = () => {
  const { session } = useSession();
  const router = useRouter();
  const [exerciseState, setExerciseState] = useState<ExerciseState>('loading');
  const [firstName, setFirstName] = useState<string>('there');
  const [moodInputText, setMoodInputText] = useState('');
  const [detectedMood, setDetectedMood] = useState<string | null>(null);
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [instruction, setInstruction] = useState('');
  const [animationScale, setAnimationScale] = useState(1);

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

  const saveStressEntryFromMood = useCallback(async (mood: string) => {
    if (!session?.user || !mood) return;

    const stressScore = moodToStressScore[mood];
    if (!stressScore) {
      console.warn(`No stress score mapping for mood: ${mood}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('stress_entries')
        .insert({
          user_id: session.user.id,
          stress_score: stressScore,
          notes: `Completed a hands-free breathing session for feeling ${mood.toLowerCase()}.`,
        });

      if (error) throw error;
      console.log('Stress entry from hands-free session saved.');
    } catch (error: any) {
      console.error('Failed to save stress entry from hands-free session:', error);
    }
  }, [session]);

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
        await playAudio(`Welcome, ${firstName}. How are you feeling today? Please describe your mood or how you're feeling in your own words.`);
        if (isMountedRef.current) {
          setExerciseState('mood-input');
        }
      };
      welcome();
    }
  }, [exerciseState, firstName, playAudio]);

  const startExercise = useCallback((mood: string) => {
    const exercise = moodExercises[mood];
    if (!exercise) return;

    setAnimationScale(1);
    let currentIndex = -2;
    const pattern = exercise.pattern;
    const totalCycles = 5;
    let currentCycle = 0;

    const runCycle = async () => {
      if (!isMountedRef.current) return;

      currentIndex += 2;

      if (currentIndex >= pattern.length) {
        currentCycle++;
        if (currentCycle >= totalCycles) {
          if (isMountedRef.current) {
            setAnimationScale(1);
            setExerciseState('completion');
          }
          return;
        }
        currentIndex = 0;
      }

      const phase = pattern[currentIndex] as string;
      const duration = pattern[currentIndex + 1] as number;

      if (typeof phase !== 'string' || typeof duration !== 'number') {
        console.error('Malformed breathing pattern detected. Stopping exercise.');
        if (isMountedRef.current) setExerciseState('completion');
        return;
      }

      if (isMountedRef.current) {
        if (phase === 'inhale') {
          setAnimationScale(1.4);
        } else if (phase === 'exhale') {
          setAnimationScale(1);
        }
        // On 'hold', scale is not changed, so it stays at the previous value

        setPhaseDuration(duration);
        setInstruction(phase.charAt(0).toUpperCase() + phase.slice(1));
        await playAudio(phase);

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
    if (exerciseState === 'exercise' && detectedMood) {
      startExercise(detectedMood);
    }
  }, [exerciseState, detectedMood, startExercise]);

  useEffect(() => {
    if (exerciseState === 'completion') {
      playAudio(`Well done, ${firstName}. Whenever you're ready, you may repeat this session or close the screen.`);
      if (detectedMood) {
        saveStressEntryFromMood(detectedMood);
      }
    }
  }, [exerciseState, firstName, playAudio, detectedMood, saveStressEntryFromMood]);

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodInputText.trim()) return;

    setExerciseState('analyzing');
    
    const mood = await openaiVoiceService.analyzeMoodFromText(moodInputText);
    if (!isMountedRef.current) return;

    setDetectedMood(mood);
    const exercise = moodExercises[mood];
    
    await playAudio(`Thank you for sharing, ${firstName}. I understand you’re feeling ${mood.toLowerCase()}. I will guide you through a transformative meditation to help you ${exercise.reassurance}.`);
    
    if (isMountedRef.current) {
      setExerciseState('exercise');
    }
  };

  const handleRepeat = () => {
    if (detectedMood) {
      setExerciseState('exercise');
    }
  };

  const renderContent = () => {
    switch (exerciseState) {
      case 'loading':
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center">
            <BouncingBallsLoader />
            <p className="text-xl mt-8 text-muted-foreground">Preparing your session...</p>
          </div>
        );
      case 'mood-input':
        return (
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-4xl font-bold mb-8">How are you feeling?</h1>
            <form onSubmit={handleMoodSubmit} className="flex flex-col items-center gap-4">
              <Input
                type="text"
                value={moodInputText}
                onChange={(e) => setMoodInputText(e.target.value)}
                placeholder="Describe how you're feeling..."
                className="text-center text-xl h-16"
                autoFocus
              />
              <Button type="submit" size="lg">Continue</Button>
            </form>
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center justify-center">
            <BouncingBallsLoader />
            <p className="text-xl mt-8 text-muted-foreground">Analyzing your mood...</p>
          </div>
        );
      case 'exercise':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <div className="relative flex-grow flex items-center justify-center">
              <GuidedBreathingAnimation
                scale={animationScale}
                duration={phaseDuration}
                text={instruction}
              />
            </div>
            <p className="text-2xl text-muted-foreground pb-8 font-heading">
              {moodExercises[detectedMood!]?.name}
            </p>
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