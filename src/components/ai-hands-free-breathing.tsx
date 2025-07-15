"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { openaiVoiceService, CustomExercise } from '@/lib/openai-voice-service';
import { X, Music } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { BouncingBallsLoader } from './bouncing-balls-loader';
import { GuidedBreathingAnimation } from './guided-breathing-animation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ExerciseState = 'loading' | 'welcome' | 'mood-input' | 'analyzing' | 'exercise' | 'completion';

export const AIHandsFreeBreathing: React.FC = () => {
  const { session } = useSession();
  const router = useRouter();
  const [exerciseState, setExerciseState] = useState<ExerciseState>('loading');
  const [firstName, setFirstName] = useState<string>('there');
  const [moodInputText, setMoodInputText] = useState('');
  const [customExercise, setCustomExercise] = useState<CustomExercise | null>(null);
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [instruction, setInstruction] = useState('');
  const [animationScale, setAnimationScale] = useState(1);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
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

  const fetchAndPlayMusic = useCallback(async (category: string) => {
    if (!musicRef.current) return;
    try {
      const tracks = await openaiVoiceService.fetchMusic(category);
      if (tracks && tracks.length > 0 && isMountedRef.current) {
        const track = tracks[Math.floor(Math.random() * tracks.length)];
        musicRef.current.src = track.audio;
        musicRef.current.loop = true;
        musicRef.current.volume = 0.15; // Subtle background volume
        await musicRef.current.play();
        setMusicPlaying(true);
      }
    } catch (error) {
      console.error("Failed to fetch or play music:", error);
      setMusicPlaying(false);
    }
  }, []);

  const saveStressEntry = useCallback(async (exercise: CustomExercise) => {
    if (!session?.user || !exercise) return;

    try {
      const { error } = await supabase
        .from('stress_entries')
        .insert({
          user_id: session.user.id,
          stress_score: exercise.stressScore,
          notes: `Completed '${exercise.exerciseName}' for feeling: ${exercise.interpretedMood}.`,
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
    musicRef.current = new Audio();

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
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, [session]);

  useEffect(() => {
    if (exerciseState === 'welcome' && firstName) {
      const welcome = async () => {
        await playAudio(`Welcome, ${firstName}. How are you feeling today? Please describe your mood in your own words.`);
        if (isMountedRef.current) {
          setExerciseState('mood-input');
        }
      };
      welcome();
    }
  }, [exerciseState, firstName, playAudio]);

  const startExercise = useCallback((exercise: CustomExercise) => {
    if (!exercise) return;

    fetchAndPlayMusic(exercise.musicCategory);
    setAnimationScale(1);
    let currentIndex = -1;
    const pattern = exercise.pattern;

    const runCycle = async () => {
      if (!isMountedRef.current) return;

      currentIndex++;

      if (currentIndex >= pattern.length) {
        if (isMountedRef.current) {
          setAnimationScale(1);
          setExerciseState('completion');
        }
        return;
      }

      const step = pattern[currentIndex];
      const { phase, duration } = step;

      if (isMountedRef.current) {
        if (phase === 'inhale') {
          setAnimationScale(1.4);
        } else if (phase === 'exhale') {
          setAnimationScale(1);
        }

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
  }, [fetchAndPlayMusic]);

  useEffect(() => {
    if (exerciseState === 'exercise' && customExercise) {
      startExercise(customExercise);
    }
  }, [exerciseState, customExercise, startExercise]);

  useEffect(() => {
    if (exerciseState === 'completion' && customExercise) {
      if (musicRef.current) musicRef.current.pause();
      setMusicPlaying(false);
      playAudio(customExercise.completionGuidance);
      saveStressEntry(customExercise);
    }
  }, [exerciseState, customExercise, playAudio, saveStressEntry]);

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodInputText.trim()) return;

    setExerciseState('analyzing');
    
    try {
      const exercise = await openaiVoiceService.generateCustomExercise(moodInputText, firstName);
      if (!isMountedRef.current) return;

      setCustomExercise(exercise);
      await playAudio(exercise.introductoryGuidance);
      
      if (isMountedRef.current) {
        setExerciseState('exercise');
      }
    } catch (error) {
      console.error("Failed to generate custom exercise:", error);
      if (isMountedRef.current) {
        playAudio("I'm sorry, I had trouble creating an exercise. Please try describing your mood again.");
        setExerciseState('mood-input');
      }
    }
  };

  const handleRepeat = () => {
    if (customExercise) {
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
                className="bg-transparent border-0 border-b-2 border-input rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center text-4xl font-heading font-normal h-20 w-full placeholder:text-2xl placeholder:font-body"
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
            <p className="text-xl mt-8 text-muted-foreground">Crafting your personalized exercise...</p>
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
            <div className="pb-8 flex flex-col items-center gap-2">
              <p className="text-2xl text-muted-foreground font-heading">
                {customExercise?.exerciseName}
              </p>
              {musicPlaying && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <Music className="h-3 w-3 mr-1" />
                  Music by Pixabay
                </Badge>
              )}
            </div>
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