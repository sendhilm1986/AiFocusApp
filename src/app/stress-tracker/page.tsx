"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Laugh,
  Smile, 
  Meh, 
  Frown, 
  Angry,
  Activity, 
  Calendar,
  TrendingUp,
  Heart,
  Wind,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { StressCalendar } from '@/components/stress-calendar';
import { openaiVoiceService } from '@/lib/openai-voice-service';

interface StressEntry {
  id: string;
  stress_score: number;
  notes: string | null;
  created_at: string;
}

const stressLevels = [
  { value: 1, label: 'Very Low', icon: Laugh, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { value: 2, label: 'Low', icon: Smile, color: 'text-lime-600', bgColor: 'bg-lime-50', borderColor: 'border-lime-200' },
  { value: 3, label: 'Moderate', icon: Meh, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { value: 4, label: 'High', icon: Frown, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { value: 5, label: 'Very High', icon: Angry, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
];

export default function StressTrackerPage() {
  const { session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams(); // Initialize useSearchParams
  const [selectedStress, setSelectedStress] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [stressEntries, setStressEntries] = useState<StressEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine initial tab from URL
  const initialTab = searchParams.get('tab') || 'track';

  useEffect(() => {
    if (session?.user) {
      fetchStressEntries();
      fetchUserProfile();
    }
  }, [session]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
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

  const fetchStressEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('stress_entries')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStressEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching stress entries:', error);
      toast.error('Failed to load stress entries');
    }
  };

  const saveStressEntry = async () => {
    if (!selectedStress) return;

    const stressScoreForExercise = selectedStress;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('stress_entries')
        .insert({
          user_id: session?.user?.id,
          stress_score: stressScoreForExercise,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast.success('Stress level recorded successfully!');
      setSuccess(true);
      
      const redirect = () => {
        if (stressScoreForExercise >= 2) {
          router.push(`/breathing-exercise?stressLevel=${stressScoreForExercise}`);
        }
      };

      const selectedLevel = stressLevels.find(l => l.value === stressScoreForExercise);
      const stressLabel = selectedLevel ? selectedLevel.label.toLowerCase() : 'unknown';
      const message = `Looks like you are feeling ${stressLabel} stress today${firstName ? `, ${firstName}` : ''}.`;

      try {
        const audioUrl = await openaiVoiceService.generateSpeech(message, 'nova', { speed: 0.9 });
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = redirect;
          await audioRef.current.play().catch(e => {
            console.error("Audio playback error:", e);
            redirect();
          });
        } else {
          redirect();
        }
      } catch (speechError: any) {
        console.error("Failed to generate or play speech:", speechError);
        toast.error("Failed to play voice message. Please check Admin > Debug > TTS Diagnostics for OpenAI API key status.");
        redirect();
      }

      setNotes('');
      setSelectedStress(null);
      await fetchStressEntries();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message);
      toast.error('Failed to save stress entry');
    } finally {
      setLoading(false);
    }
  };

  const getRecentAverage = () => {
    if (stressEntries.length === 0) return 0;
    const recent = stressEntries.slice(0, 7);
    return recent.reduce((sum, entry) => sum + entry.stress_score, 0) / recent.length;
  };

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Stress Tracker</h1>
          <p className="text-muted-foreground">
            Track your stress levels and get personalized insights
          </p>
        </div>

        <Tabs defaultValue={initialTab} className="w-full"> {/* Use initialTab here */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="track">Track Stress</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          </TabsList>

          <TabsContent value="track" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  How are you feeling right now?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Stress level recorded successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {stressLevels.map((level) => {
                    const Icon = level.icon;
                    const isSelected = selectedStress === level.value;
                    
                    return (
                      <Card
                        key={level.value}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isSelected 
                            ? `${level.bgColor} ${level.borderColor} border-2 shadow-md` 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedStress(level.value)}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon
                            className={`h-8 w-8 mx-auto mb-2 transition-all ${isSelected ? level.color : 'text-muted-foreground'}`}
                            fill={isSelected ? 'currentColor' : 'none'}
                            strokeWidth={1.5}
                          />
                          <p className={`font-medium text-sm ${isSelected ? level.color : 'text-foreground'}`}>
                            {level.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {level.value}/5
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder="What's contributing to your stress level today?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={saveStressEntry}
                  disabled={!selectedStress || loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Record Stress Level'}
                </Button>

                {selectedStress && selectedStress >= 2 && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Wind className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      After recording, we'll guide you through a personalized breathing exercise to help reduce your stress.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stressEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No stress entries yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start tracking to see your patterns here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {stressEntries.length}
                          </p>
                          <p className="text-sm text-muted-foreground">Total Entries</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {getRecentAverage().toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">Recent Average</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">
                            {stressEntries[0]?.stress_score || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Latest Entry</p>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-3">
                      {stressEntries.slice(0, 10).map((entry) => {
                        const level = stressLevels.find(l => l.value === entry.stress_score);
                        const Icon = level?.icon || Meh;
                        
                        return (
                          <div key={entry.id} className="flex items-start gap-3 p-4 border rounded-lg">
                            <Icon className={`h-5 w-5 mt-1 ${level?.color || 'text-muted-foreground'}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {entry.stress_score}/5 - {level?.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(entry.created_at).toLocaleDateString()} at{' '}
                                  {new Date(entry.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              {entry.notes && (
                                <p className="text-sm text-muted-foreground italic">
                                  "{entry.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <StressCalendar stressEntries={stressEntries} />
          </TabsContent>
        </Tabs>
      </div>
      
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}