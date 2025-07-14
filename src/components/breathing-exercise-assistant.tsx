"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Heart,
  Wind,
  Sparkles,
  AlertCircle,
  Music,
  Clock,
  Bot,
  Settings,
  RefreshCw,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/session-context-provider';
import { openaiVoiceService } from '@/lib/openai-voice-service';
import { Separator } from '@/components/ui/separator';

interface BreathingExerciseAssistantProps {
  stressLevel: number;
  onComplete?: () => void;
}

export interface ExerciseStage {
  key: string;
  label: string;
  description: string;
  duration: number;
}

interface BackgroundMusic {
  id: string;
  name: string;
  file_url: string;
  duration: number;
  is_active: boolean;
}

interface MusicSetting {
  id: string;
  phase: string;
  volume: number;
  fade_in_duration: number;
  fade_out_duration: number;
  music?: BackgroundMusic[] | null; // Nested music object
  music_id: string | null; // Explicitly include music_id
}

// Base stages with stress-level adjusted durations
export const BASE_STAGES: ExerciseStage[] = [
  { key: 'opening_preparation', label: 'Welcome & Preparation', description: 'Getting comfortable and ready to begin', duration: 0 },
  { key: 'grounding_breathwork', label: 'Grounding Breath', description: 'Simple breathing to center yourself', duration: 0 },
  { key: 'body_awareness', label: 'Body Scan', description: 'Releasing tension throughout your body', duration: 0 },
  { key: 'breathing_with_intention', label: 'Deep Breathing', description: 'Focused breathing for relaxation', duration: 0 },
  { key: 'guided_visualization', label: 'Peaceful Imagery', description: 'Calming mental visualization', duration: 0 },
  { key: 'deep_stillness', label: 'Quiet Meditation', description: 'Resting in peaceful stillness', duration: 0 },
  { key: 'affirmations', label: 'Positive Affirmations', description: 'Reinforcing your well-being', duration: 0 },
  { key: 'closing', label: 'Gentle Return', description: 'Coming back to full awareness', duration: 0 },
];

// Helper function for fading audio
const fadeAudio = (audioElement: HTMLAudioElement, startVolume: number, endVolume: number, duration: number, onComplete?: () => void) => {
  if (!audioElement || duration === 0) {
    audioElement.volume = endVolume;
    onComplete?.();
    return;
  }

  const steps = 60; // frames per second
  const intervalTime = duration * 1000 / steps;
  let currentStep = 0;
  const volumeDiff = endVolume - startVolume;

  const fadeInterval = setInterval(() => {
    currentStep++;
    const newVolume = startVolume + (volumeDiff * (currentStep / steps));
    audioElement.volume = Math.max(0, Math.min(1, newVolume)); // Clamp volume between 0 and 1

    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      audioElement.volume = endVolume; // Ensure final volume is exact
      onComplete?.();
    }
  }, intervalTime);
};


// Moved outside component to ensure it's not recreated on every render
const getExerciseConfig = (stress: number) => {
  const configs = {
    1: { stages: 4, baseDuration: 45, multiplier: 1.0, label: "Quick Relief" },
    2: { stages: 5, baseDuration: 60, multiplier: 1.2, label: "Moderate Relief" },
    3: { stages: 6, baseDuration: 75, multiplier: 1.4, label: "Deep Relief" },
    4: { stages: 7, baseDuration: 90, multiplier: 1.6, label: "Extended Relief" },
    5: { stages: 8, baseDuration: 105, multiplier: 1.8, label: "Complete Relief" }
  };
  
  return configs[Math.min(stress, 5) as keyof typeof configs] || configs[3];
};

export const BreathingExerciseAssistant: React.FC<BreathingExerciseAssistantProps> = ({
  stressLevel,
  onComplete
}) => {
  const { session } = useSession();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [musicSettings, setMusicSettings] = useState<Map<string, MusicSetting>>(new Map());
  const [availableMusicTracks, setAvailableMusicTracks] = useState<BackgroundMusic[]>([]);
  const [currentMusic, setCurrentMusic] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [currentGuidanceText, setCurrentGuidanceText] = useState<string>('');
  const [exerciseStages, setExerciseStages] = useState<ExerciseStage[]>([]);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [musicVolume, setMusicVolume] = useState(0.1);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('nova');
  const [voices, setVoices] = useState<any[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);
  const isStoppingRef = useRef(false);
  const currentStageRef = useRef(0);
  const isGeneratingRef = useRef(false);
  const userId = session?.user?.id;

  useEffect(() => {
    // Initialize exercise stages based on stress level
    const exerciseConfig = getExerciseConfig(stressLevel);
    const stagesToUse = BASE_STAGES.slice(0, exerciseConfig.stages);
    const configuredStages = stagesToUse.map((stage, index) => ({
      ...stage,
      duration: Math.round(exerciseConfig.baseDuration * exerciseConfig.multiplier * (index === 0 || index === stagesToUse.length - 1 ? 0.6 : 1))
    }));
    
    setExerciseStages(configuredStages);
    totalTimeRef.current = configuredStages.reduce((total, stage) => total + stage.duration, 0);
    setTimeRemaining(totalTimeRef.current);
  }, [stressLevel]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        setFirstName(data?.first_name || 'there');
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        setFirstName('there');
      }
    };

    const loadMusicSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('exercise_music_settings')
          .select(`
            id,
            phase,
            stress_level,
            music_id,
            volume,
            fade_in_duration,
            fade_out_duration,
            music:background_music(id, name, file_url, duration, is_active)
          `)
          .eq('stress_level', stressLevel); // Fetch settings for the current stress level

        if (!error && settings) {
          const settingsMap = new Map<string, MusicSetting>();
          settings.forEach(setting => {
            settingsMap.set(setting.phase, setting);
          });
          setMusicSettings(settingsMap);
        } else if (error) {
          console.error('Error loading music settings:', error);
          toast.error('Failed to load music settings.');
        }
      } catch (error) {
        console.error('Failed to load music settings:', error);
      }
    };

    const fetchAvailableMusic = async () => {
      try {
        const { data, error } = await supabase
          .from('background_music')
          .select('id, name, file_url, duration, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching available music:', error);
          toast.error('Failed to load available music tracks.');
        } else if (data) {
          setAvailableMusicTracks(data);
        }
      } catch (error) {
        console.error('Failed to fetch available music:', error);
      }
    };

    const loadVolumePreferences = () => {
      const savedVoiceVolume = localStorage.getItem('breathing-voice-volume');
      const savedMusicVolume = localStorage.getItem('breathing-music-volume');
      
      if (savedVoiceVolume) setVoiceVolume(parseFloat(savedVoiceVolume));
      if (savedMusicVolume) setMusicVolume(parseFloat(savedMusicVolume));
    };

    const loadVoicePreference = () => {
      const savedVoice = localStorage.getItem('breathing-voice');
      if (savedVoice) setSelectedVoice(savedVoice);
    };

    fetchUserProfile();
    loadMusicSettings();
    fetchAvailableMusic();
    loadVolumePreferences();
    loadVoicePreference();
    
    openaiVoiceService.getVoices().then(setVoices);
    
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    if (!musicRef.current) {
      musicRef.current = new Audio();
      musicRef.current.preload = 'auto';
      musicRef.current.loop = true;
    }

    return () => {
      cleanup();
    };
  }, [userId, stressLevel]); // Add stressLevel to dependencies

  const cleanup = () => {
    isStoppingRef.current = true;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.src = "";
    }
  };

  const saveVolumePreferences = (voice: number, music: number) => {
    localStorage.setItem('breathing-voice-volume', voice.toString());
    localStorage.setItem('breathing-music-volume', music.toString());
    setVoiceVolume(voice);
    setMusicVolume(music);
    
    if (audioRef.current) audioRef.current.volume = voice;
    if (musicRef.current) musicRef.current.volume = music;
  };

  const saveVoicePreference = (voice: string) => {
    localStorage.setItem('breathing-voice', voice);
    setSelectedVoice(voice);
  };

  const playMusicForStage = async (stageIndex: number) => {
    if (isStoppingRef.current || !musicRef.current) return;

    const stage = exerciseStages[stageIndex];
    if (!stage) return;

    const setting = musicSettings.get(stage.key);
    const musicTrack = availableMusicTracks.find(t => t.id === setting?.music_id);
    let musicUrl = musicTrack?.file_url; // This will be undefined if music_id is null or track not found

    // Ensure the URL uses the correct Supabase project ID if it's hardcoded from an old one
    if (musicUrl && musicUrl.includes('efysakzuwxexvupndkps')) {
        musicUrl = musicUrl.replace('efysakzuwxexvupndkps.supabase.co', 'edmpqigdqdugrvxpqrau.supabase.co');
    }

    const targetVolume = setting?.volume !== undefined ? setting.volume : musicVolume;
    const fadeInDuration = setting?.fade_in_duration || 2;
    const fadeOutDuration = setting?.fade_out_duration || 2;

    const currentSrc = musicRef.current.src;
    const isCurrentlyPlaying = !musicRef.current.paused;

    // Case 1: No music selected for this stage, or track is inactive
    if (!musicUrl || !musicTrack?.is_active) {
        if (isCurrentlyPlaying) {
            fadeAudio(musicRef.current, musicRef.current.volume, 0, fadeOutDuration, () => {
                musicRef.current.pause();
                musicRef.current.src = ""; // Clear source
                setCurrentMusic(null);
            });
        } else {
            setCurrentMusic(null);
        }
        return;
    }

    // Case 2: Music selected for this stage
    if (currentSrc !== musicUrl) {
        // Different music track or no music was playing
        const startNewMusic = async () => {
            musicRef.current.src = musicUrl;
            musicRef.current.volume = 0; // Start from 0 for fade-in
            await musicRef.current.play();
            fadeAudio(musicRef.current, 0, targetVolume, fadeInDuration);
            setCurrentMusic(musicUrl);
        };

        if (isCurrentlyPlaying) {
            // Fade out current music, then start new one
            fadeAudio(musicRef.current, musicRef.current.volume, 0, fadeOutDuration, startNewMusic);
        } else {
            // No music playing, just start new one with fade-in
            startNewMusic();
        }
    } else {
        // Same music track
        if (musicRef.current.volume !== targetVolume) {
            // Adjust volume if needed
            fadeAudio(musicRef.current, musicRef.current.volume, targetVolume, Math.max(fadeInDuration, fadeOutDuration));
        }
        if (!isCurrentlyPlaying) {
            // Resume if paused
            await musicRef.current.play();
        }
        setCurrentMusic(musicUrl); // Ensure state is updated
    }
  };

  const generateAndPlayGuidance = async (stageIndex: number) => {
    if (isStoppingRef.current || isGeneratingRef.current || stageIndex !== currentStageRef.current) return;

    const stage = exerciseStages[stageIndex];
    if (!stage) return;

    isGeneratingRef.current = true;
    setIsGeneratingGuidance(true);
    setAudioError(null);
    
    try {
      const guidanceText = await openaiVoiceService.generateGuidanceText(stressLevel, stage.key, firstName, stageIndex + 1);
      if (isStoppingRef.current || stageIndex !== currentStageRef.current) return;
      setCurrentGuidanceText(guidanceText);
      
      const audioUrl = await openaiVoiceService.generateSpeech(guidanceText, selectedVoice, { speed: 0.8 });
      if (isStoppingRef.current || stageIndex !== currentStageRef.current || !audioUrl) return;

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = voiceVolume;
        await audioRef.current.play();
      }
    } catch (error: any) {
      console.error(`Failed to generate guidance for ${stage.label}:`, error);
      if (!isStoppingRef.current) setAudioError(`Voice generation failed. Continuing with text guidance.`);
    } finally {
      isGeneratingRef.current = false;
      if (!isStoppingRef.current) setIsGeneratingGuidance(false);
    }
  };

  const startExercise = async () => {
    if (exerciseStages.length === 0) return;
    
    cleanup(); // Ensure any previous timers/audio are stopped
    
    isStoppingRef.current = false;
    setIsFinished(false);
    currentStageRef.current = 0;
    setIsPlaying(true);
    setCurrentStageIndex(0);
    elapsedTimeRef.current = 0;
    setAudioError(null);
    setCurrentGuidanceText('Starting your personalized session...');
    
    // Initial music and guidance for the first stage
    await playMusicForStage(0);
    await generateAndPlayGuidance(0);
    
    timerRef.current = setInterval(async () => {
      if (isStoppingRef.current) return;
      
      elapsedTimeRef.current += 1;
      const remaining = totalTimeRef.current - elapsedTimeRef.current;
      setTimeRemaining(remaining);
      setProgress((elapsedTimeRef.current / totalTimeRef.current) * 100);
      
      let stageEndTime = 0;
      for (let i = 0; i <= currentStageRef.current; i++) {
        stageEndTime += exerciseStages[i]?.duration || 0;
      }
      
      if (remaining <= 0) {
        completeExercise();
      } else if (elapsedTimeRef.current >= stageEndTime && currentStageRef.current < exerciseStages.length - 1) {
        const nextIndex = currentStageRef.current + 1;
        currentStageRef.current = nextIndex;
        setCurrentStageIndex(nextIndex);
        
        // Play music and generate guidance for the new stage
        await playMusicForStage(nextIndex);
        await generateAndPlayGuidance(nextIndex);
      }
    }, 1000);
  };

  const pauseExercise = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) audioRef.current.pause();
    if (musicRef.current) musicRef.current.pause(); // Ensure music pauses
  };

  const resumeExercise = () => {
    if (isStoppingRef.current) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsPlaying(true);
    if (audioRef.current && audioRef.current.src) audioRef.current.play().catch(console.warn);
    if (musicRef.current && musicRef.current.src) musicRef.current.play().catch(console.warn); // Ensure music resumes
    
    timerRef.current = setInterval(() => {
      if (isStoppingRef.current) return;
      
      elapsedTimeRef.current += 1;
      const remaining = totalTimeRef.current - elapsedTimeRef.current;
      setTimeRemaining(remaining);
      setProgress((elapsedTimeRef.current / totalTimeRef.current) * 100);
      
      if (remaining <= 0) completeExercise();
    }, 1000);
  };

  const stopExercise = () => {
    setIsPlaying(false);
    setCurrentStageIndex(0);
    setProgress(0);
    elapsedTimeRef.current = 0;
    setTimeRemaining(totalTimeRef.current);
    setAudioError(null);
    setCurrentGuidanceText('');
    setIsGeneratingGuidance(false);
    currentStageRef.current = 0;
    
    cleanup(); // This will stop all audio and clear timers
  };

  const completeExercise = async () => {
    setIsPlaying(false);
    setProgress(100);
    setTimeRemaining(0);
    
    cleanup(); // Stop all timers and audio immediately
    
    setIsCompleting(true);
    const completionText = `${firstName || 'You'}, you've done something wonderful for yourself. Carry this peace with you.`;
    setCurrentGuidanceText(completionText);
    
    try {
      const audioUrl = await openaiVoiceService.generateSpeech(completionText, selectedVoice, { speed: 0.8 });
      if (audioUrl && audioRef.current && !isStoppingRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = voiceVolume; // Ensure volume is set
        await audioRef.current.play();
      }
    } catch (error) {
      console.warn('Failed to play completion message', error);
    } finally {
      setIsCompleting(false);
      setIsFinished(true);
    }
    
    toast.success("Stress relief exercise completed! You should feel more relaxed now.");
  };

  const handleRetake = () => {
    setIsFinished(false);
    stopExercise();
    
    setTimeout(() => {
        startExercise();
    }, 100);
  };

  const handleFinish = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle>Stress Relief Exercise</CardTitle>
        </div>
        <h3 className="text-lg font-medium mt-4">
          {getExerciseConfig(stressLevel).label} Session
          {firstName && <span className="font-normal text-base"> for {firstName}</span>}
        </h3>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {(isGeneratingGuidance || isCompleting) && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Bot className="h-3 w-3 mr-1 animate-pulse" />
              {isCompleting ? 'Completing...' : 'Generating...'}
            </Badge>
          )}
          {currentMusic && (
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <Music className="h-3 w-3 mr-1" />
              Music Playing
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {audioError && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">{audioError}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{formatTime(timeRemaining)} remaining</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              {isFinished ? 'Session Complete' : exerciseStages[currentStageIndex]?.label || 'Preparing...'}
            </span>
            {!isFinished && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{Math.ceil((exerciseStages[currentStageIndex]?.duration || 0) / 60)} min</span>
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed">
            {currentGuidanceText || exerciseStages[currentStageIndex]?.description || 'Preparing your personalized session...'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          {!isFinished ? (
            <>
              {!isPlaying ? (
                <Button
                  onClick={progress === 0 ? startExercise : resumeExercise}
                  disabled={isGeneratingGuidance || exerciseStages.length === 0 || isCompleting}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {progress === 0 ? 'Start Session' : 'Resume'}
                </Button>
              ) : (
                <Button
                  onClick={pauseExercise}
                  variant="secondary"
                  className="flex items-center gap-2"
                  disabled={isCompleting}
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
              
              <Button
                onClick={stopExercise}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isCompleting}
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
              
              <Dialog open={showVolumeControls} onOpenChange={setShowVolumeControls}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5" />
                      Audio Settings
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label>Voice</Label>
                      <Select value={selectedVoice} onValueChange={saveVoicePreference}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {voices.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the AI voice for guidance
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Voice Volume: {Math.round(voiceVolume * 100)}%</Label>
                      <Slider
                        value={[voiceVolume]}
                        onValueChange={([value]) => saveVolumePreferences(value, musicVolume)}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust the AI voice guidance volume
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Background Music Volume: {Math.round(musicVolume * 100)}%</Label>
                      <Slider
                        value={[musicVolume]}
                        onValueChange={([value]) => saveVolumePreferences(voiceVolume, value)}
                        max={0.3}
                        min={0}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Background music volume (kept subtle for relaxation)
                      </p>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          saveVolumePreferences(0.8, 0.1);
                          saveVoicePreference('nova');
                        }}
                        size="sm"
                      >
                        Reset to Default
                      </Button>
                      <Button 
                        onClick={() => setShowVolumeControls(false)}
                        size="sm"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <>
              <Button onClick={handleRetake} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retake Exercise
              </Button>
              <Button onClick={handleFinish} variant="outline">
                Finish
              </Button>
            </>
          )}
        </div >

        {!isFinished && (
          <div className="flex justify-center">
            <div className="flex gap-2">
              {exerciseStages.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStageIndex
                      ? "bg-primary"
                      : index < currentStageIndex
                      ? "bg-primary/50"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {(isCompleting || isFinished) && (
          <div className="text-center text-sm text-muted-foreground">
            <Heart className="h-4 w-4 inline mr-1 animate-pulse" />
            {isFinished ? "You've completed the session. Well done." : "Thank you for taking this journey with me..."}
          </div>
        )}

      </CardContent>
      
      <audio ref={audioRef} className="hidden" />
      <audio ref={musicRef} className="hidden" />
    </Card>
  );
};