"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Heart,
  Wind,
  Sparkles,
  AlertCircle,
  Info,
  Clock,
  Bot,
  Key,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/session-context-provider';
import { openaiVoiceService } from '@/lib/openai-voice-service';
import { supabase } from '@/integrations/supabase/client';

interface AIVoiceAgentProps {
  stressLevel: number;
  onComplete?: () => void;
}

interface ExercisePhase {
  key: string;
  label: string;
  description: string;
  duration: number;
}

const EXERCISE_PHASES: ExercisePhase[] = [
  { key: 'opening_preparation', label: 'Opening Preparation', description: 'Settling in and preparing', duration: 45 },
  { key: 'grounding_breathwork', label: 'Grounding Breathwork', description: 'Basic breathing exercises', duration: 90 },
  { key: 'body_awareness', label: 'Body Awareness', description: 'Body scan and tension release', duration: 120 },
  { key: 'breathing_with_intention', label: 'Intentional Breathing', description: 'Focused breathing techniques', duration: 150 },
  { key: 'guided_visualization', label: 'Guided Visualization', description: 'Calming mental imagery', duration: 180 },
  { key: 'deep_stillness', label: 'Deep Stillness', description: 'Quiet meditation', duration: 120 },
  { key: 'affirmations', label: 'Affirmations', description: 'Positive reinforcement', duration: 60 },
  { key: 'closing', label: 'Closing', description: 'Gentle return to awareness', duration: 45 },
];

export const AIVoiceAgent: React.FC<AIVoiceAgentProps> = ({
  stressLevel,
  onComplete
}) => {
  const { session } = useSession();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentGuidanceText, setCurrentGuidanceText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('nova');
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  const currentPhase = EXERCISE_PHASES[currentPhaseIndex];
  const sessionDuration = Math.min(5 + (stressLevel * 3), 15); // 5-15 minutes based on stress

  useEffect(() => {
    const phasesToUse = EXERCISE_PHASES.slice(0, Math.min(4 + stressLevel, 8));
    totalTimeRef.current = phasesToUse.reduce((total, phase) => total + phase.duration, 0);
    setTimeRemaining(totalTimeRef.current);
    fetchUserProfile();
    
    openaiVoiceService.getVoices().then(setVoices);

    const savedVoice = localStorage.getItem('openai-voice');
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }
  }, [stressLevel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const fetchUserProfile = async () => {
    if (session?.user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
        } else if (data?.first_name) {
          setFirstName(data.first_name);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  const saveVoicePreference = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('openai-voice', voice);
  };

  const generateGuidanceText = async (phase: string, stepIndex: number): Promise<string> => {
    setIsGeneratingText(true);
    setError(null);
    
    try {
      console.log('Generating guidance text for phase:', phase);
      
      const guidanceText = await openaiVoiceService.generateGuidanceText(
        stressLevel,
        phase,
        firstName,
        stepIndex + 1
      );

      console.log('Generated guidance text:', guidanceText);
      setCurrentGuidanceText(guidanceText);
      return guidanceText;

    } catch (error: any) {
      console.error('Text generation failed:', error);
      setError(`Text generation failed: ${error.message}`);
      
      const fallbackText = `${firstName ? `${firstName}, ` : ''}let's focus on your breathing. Take a slow, deep breath in... and slowly exhale. Allow yourself to relax.`;
      setCurrentGuidanceText(fallbackText);
      return fallbackText;
    } finally {
      setIsGeneratingText(false);
    }
  };

  const convertTextToSpeech = async (text: string): Promise<string | null> => {
    if (isMuted) return null;
    
    setIsGeneratingAudio(true);
    
    try {
      console.log('Converting text to speech via service:', text.substring(0, 50) + '...');
      
      // Use the centralized service instead of a direct fetch
      const audioUrl = await openaiVoiceService.generateSpeech(
        text.trim(),
        selectedVoice,
        { speed: 0.8 }
      );
      
      console.log('Audio URL created successfully');
      return audioUrl;

    } catch (error: any) {
      console.error('TTS conversion failed:', error);
      toast.error('Audio generation failed, continuing with text only');
      return null;
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playAudioGuidance = async (audioUrl: string) => {
    if (!audioRef.current || isMuted) return;

    try {
      audioRef.current.src = audioUrl;
      
      audioRef.current.onended = () => {
        console.log('Audio playback ended');
      };
      
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
      };

      await audioRef.current.play();
      console.log('Audio playback started');

    } catch (error: any) {
      console.error('Audio playback failed:', error);
      toast.error('Audio playback failed');
    }
  };

  const processPhase = async (phaseIndex: number) => {
    const phase = EXERCISE_PHASES[phaseIndex];
    if (!phase) return;

    console.log('Processing phase:', phase.label);
    
    const guidanceText = await generateGuidanceText(phase.key, phaseIndex);
    
    if (!isMuted) {
      const audioUrl = await convertTextToSpeech(guidanceText);
      if (audioUrl) {
        await playAudioGuidance(audioUrl);
      }
    }
  };

  const startExercise = async () => {
    setIsPlaying(true);
    setCurrentPhaseIndex(0);
    elapsedTimeRef.current = 0;
    setError(null);
    
    await processPhase(0);
    
    timerRef.current = setInterval(async () => {
      elapsedTimeRef.current += 1;
      const remaining = totalTimeRef.current - elapsedTimeRef.current;
      setTimeRemaining(remaining);
      setProgress((elapsedTimeRef.current / totalTimeRef.current) * 100);
      
      const phasesToUse = EXERCISE_PHASES.slice(0, Math.min(4 + stressLevel, 8));
      let currentPhaseEndTime = 0;
      
      for (let i = 0; i <= currentPhaseIndex; i++) {
        currentPhaseEndTime += phasesToUse[i]?.duration || 0;
      }
      
      if (elapsedTimeRef.current >= currentPhaseEndTime && currentPhaseIndex < phasesToUse.length - 1) {
        const nextIndex = currentPhaseIndex + 1;
        setCurrentPhaseIndex(nextIndex);
        await processPhase(nextIndex);
      }
      
      if (remaining <= 0) {
        completeExercise();
      }
    }, 1000);
  };

  const pauseExercise = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) audioRef.current.pause();
  };

  const resumeExercise = () => {
    setIsPlaying(true);
    if (audioRef.current && !isMuted) {
      audioRef.current.play().catch(console.error);
    }
    
    timerRef.current = setInterval(() => {
      elapsedTimeRef.current += 1;
      const remaining = totalTimeRef.current - elapsedTimeRef.current;
      setTimeRemaining(remaining);
      setProgress((elapsedTimeRef.current / totalTimeRef.current) * 100);
      
      if (remaining <= 0) {
        completeExercise();
      }
    }, 1000);
  };

  const stopExercise = () => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setProgress(0);
    elapsedTimeRef.current = 0;
    setTimeRemaining(totalTimeRef.current);
    setError(null);
    setCurrentGuidanceText('');
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  };

  const completeExercise = () => {
    setIsPlaying(false);
    setProgress(100);
    setTimeRemaining(0);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    toast.success("AI-guided breathing session completed! Well done.");
    
    if (onComplete) {
      onComplete();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current && !isMuted) {
      audioRef.current.pause();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStressLevelBadge = () => {
    const levels = {
      1: { label: "Lightly Stressed", color: "bg-yellow-100 text-yellow-800" },
      2: { label: "Stressed", color: "bg-orange-100 text-orange-800" },
      3: { label: "Very Stressed", color: "bg-red-100 text-red-800" }
    };
    
    const level = levels[Math.min(stressLevel, 3) as keyof typeof levels] || levels[3];
    return (
      <Badge className={cn("mb-4", level.color)}>
        {level.label} - {sessionDuration} min AI session
      </Badge>
    );
  };

  const phasesToShow = EXERCISE_PHASES.slice(0, Math.min(4 + stressLevel, 8));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle>AI Voice Agent</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="ml-auto"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        {getStressLevelBadge()}
        <h3 className="text-lg font-medium">
          Personalized Breathing Session
          {firstName && <span className="font-normal text-base"> for {firstName}</span>}
        </h3>
        <div className="flex items-center justify-center gap-2">
          {isMuted && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700">
              <VolumeX className="h-3 w-3 mr-1" />
              Muted
            </Badge>
          )}
          {(isGeneratingText || isGeneratingAudio) && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Bot className="h-3 w-3 mr-1 animate-pulse" />
              AI Generating...
            </Badge>
          )}
          {/* Removed API Key Required badge as it's now server-side */}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Settings Panel - now only for voice selection */}
        {showSettings && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Voice Settings
            </h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="voice-select">Voice</Label>
                <Select value={selectedVoice} onValueChange={saveVoicePreference}>
                  <SelectTrigger className="mt-1">
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
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">{error}</p>
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
              {currentPhase?.label || 'Preparing...'}
            </span>
            {(isGeneratingText || isGeneratingAudio) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bot className="h-3 w-3 animate-pulse" />
                {isGeneratingText ? 'Generating guidance...' : 'Creating audio...'}
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed">
            {currentGuidanceText || currentPhase?.description || 'Preparing your personalized session...'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          {!isPlaying ? (
            <Button
              onClick={progress === 0 ? startExercise : resumeExercise}
              disabled={isGeneratingText || isGeneratingAudio}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {progress === 0 ? 'Start AI Session' : 'Resume'}
            </Button>
          ) : (
            <Button
              onClick={pauseExercise}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          
          <Button
            onClick={stopExercise}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
          
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="icon"
            className="flex items-center gap-2"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex justify-center">
          <div className="flex gap-2">
            {phasesToShow.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentPhaseIndex
                    ? "bg-primary"
                    : index < currentPhaseIndex
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {(isGeneratingText || isGeneratingAudio) && (
          <div className="text-center text-sm text-muted-foreground">
            <Heart className="h-4 w-4 inline mr-1 animate-pulse" />
            AI is personalizing your session...
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">AI Voice Agent Features</h4>
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Personalized guidance generated in real-time</li>
            <li>• Adapts to your stress level and name</li>
            <li>• Natural voice synthesis using OpenAI TTS</li>
            <li>• Powered by your Supabase-managed OpenAI API key</li>
          </ul>
        </div>
      </CardContent>
      
      <audio ref={audioRef} className="hidden" />
    </Card>
  );
};