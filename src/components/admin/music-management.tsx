"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Music, 
  Upload, 
  Play, 
  Pause, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Volume2,
  Clock,
  Settings,
  Save
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useSession } from '@/components/session-context-provider';
import { BASE_STAGES } from '@/components/breathing-exercise-assistant'; // Import BASE_STAGES

interface BackgroundMusic {
  id: string;
  name: string;
  file_url: string;
  duration: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

interface MusicSetting {
  id?: string; // Optional for new settings
  phase: string;
  stress_level: number;
  music_id: string | null;
  volume: number;
  fade_in_duration: number;
  fade_out_duration: number;
  updated_by?: string | null;
}

export const MusicManagement: React.FC = () => {
  const { session } = useSession();
  const [musicTracks, setMusicTracks] = useState<BackgroundMusic[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trackName, setTrackName] = useState('');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedStressLevel, setSelectedStressLevel] = useState<number>(1); // New state for stress level
  const [stageSettings, setStageSettings] = useState<Map<string, MusicSetting>>(new Map());
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMusicTracks();
  }, []);

  useEffect(() => {
    fetchMusicSettings(selectedStressLevel);
  }, [selectedStressLevel]); // Refetch settings when stress level changes

  const fetchMusicTracks = async () => {
    try {
      setLoadingTracks(true);
      const { data, error } = await supabase
        .from('background_music')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMusicTracks(data || []);
    } catch (error: any) {
      console.error('Error fetching music tracks:', error);
      toast.error('Failed to load music tracks');
    } finally {
      setLoadingTracks(false);
    }
  };

  const fetchMusicSettings = async (stressLevel: number) => {
    try {
      setLoadingSettings(true);
      const { data, error } = await supabase
        .from('exercise_music_settings')
        .select('*')
        .eq('stress_level', stressLevel);

      if (error) throw error;

      const settingsMap = new Map<string, MusicSetting>();
      BASE_STAGES.forEach(stage => {
        const existingSetting = data?.find(s => s.phase === stage.key);
        settingsMap.set(stage.key, existingSetting || {
          phase: stage.key,
          stress_level: stressLevel, // Use the selected stress level
          music_id: null,
          volume: 0.1,
          fade_in_duration: 2,
          fade_out_duration: 2,
        });
      });
      setStageSettings(settingsMap);
    } catch (error: any) {
      console.error('Error fetching music settings:', error);
      toast.error('Failed to load exercise music settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      if (!trackName) {
        setTrackName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !trackName.trim()) {
      toast.error('Please select a file and enter a track name');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('background-music')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('background-music')
        .getPublicUrl(fileName);

      const audio = new Audio();
      const duration = await new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          resolve(Math.round(audio.duration));
        });
        audio.addEventListener('error', () => {
          resolve(180); // Default to 3 minutes if can't load
        });
        audio.src = URL.createObjectURL(selectedFile);
      });

      const { error: dbError } = await supabase
        .from('background_music')
        .insert({
          name: trackName.trim(),
          file_url: urlData.publicUrl,
          duration: duration,
          is_active: true,
          created_by: session?.user?.id
        });

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      toast.success('Music track uploaded successfully!');
      
      setSelectedFile(null);
      setTrackName('');
      
      await fetchMusicTracks();
    } catch (error: any) {
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      setUploadError(errorMessage);
      toast.error(`Music upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleTrackStatus = async (trackId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('background_music')
        .update({ is_active: !currentStatus })
        .eq('id', trackId);

      if (error) throw error;

      toast.success(`Track ${!currentStatus ? 'activated' : 'deactivated'}`);
      await fetchMusicTracks();
    } catch (error: any) {
      console.error('Error updating track status:', error);
      toast.error('Failed to update track status');
    }
  };

  const deleteTrack = async (trackId: string, fileUrl: string) => {
    try {
      const fileName = fileUrl.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('background-music')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('background_music')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast.success('Track deleted successfully');
      await fetchMusicTracks();
      await fetchMusicSettings(selectedStressLevel); // Refresh settings as a track might have been deleted
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
  };

  const playTrack = (trackId: string, url: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
      const audio = new Audio(url);
      audio.play().catch(() => {
        toast.error('Failed to play audio');
        setPlayingTrack(null);
      });
      
      audio.addEventListener('ended', () => {
        setPlayingTrack(null);
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSettingChange = (phaseKey: string, field: keyof MusicSetting, value: any) => {
    setStageSettings(prev => {
      const newMap = new Map(prev);
      const currentSetting = newMap.get(phaseKey);
      if (currentSetting) {
        newMap.set(phaseKey, { ...currentSetting, [field]: value });
      }
      return newMap;
    });
  };

  const handleSaveMusicSetting = async (phaseKey: string) => {
    const settingToSave = stageSettings.get(phaseKey);
    if (!settingToSave) return;

    setSavingSettings(prev => new Set(prev).add(phaseKey));

    try {
      const { data, error } = await supabase
        .from('exercise_music_settings')
        .upsert({
          id: settingToSave.id, // Will be null for new entries, Supabase handles creation
          phase: settingToSave.phase,
          stress_level: selectedStressLevel, // Use the selected stress level
          music_id: settingToSave.music_id,
          volume: settingToSave.volume,
          fade_in_duration: settingToSave.fade_in_duration,
          fade_out_duration: settingToSave.fade_out_duration,
          updated_by: session?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the ID if it was a new insert
      setStageSettings(prev => {
        const newMap = new Map(prev);
        newMap.set(phaseKey, { ...settingToSave, id: data.id });
        return newMap;
      });

      toast.success(`Settings for "${BASE_STAGES.find(s => s.key === phaseKey)?.label}" saved!`);
    } catch (error: any) {
      console.error(`Error saving settings for ${phaseKey}:`, error);
      toast.error(`Failed to save settings for "${BASE_STAGES.find(s => s.key === phaseKey)?.label}"`);
    } finally {
      setSavingSettings(prev => {
        const newSet = new Set(prev);
        newSet.delete(phaseKey);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Background Music
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="track-name">Track Name</Label>
              <Input
                id="track-name"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Enter track name"
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="audio-file">Audio File</Label>
              <Input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: MP3, WAV, OGG. Max size: 10MB
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Selected:</strong> {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <Button 
              onClick={handleFileUpload}
              disabled={!selectedFile || !trackName.trim() || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Track
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Music Library */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Music Library ({musicTracks.length} tracks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTracks ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading music tracks...</p>
            </div>
          ) : musicTracks.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No music tracks uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {musicTracks.map((track) => (
                <div key={track.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => playTrack(track.id, track.file_url)}
                  >
                    {playingTrack === track.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{track.name}</h4>
                      <Badge variant={track.is_active ? "default" : "secondary"}>
                        {track.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(track.duration)}
                      </span>
                      <span>
                        Uploaded: {new Date(track.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleTrackStatus(track.id, track.is_active)}
                    >
                      {track.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTrack(track.id, track.file_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise Music Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Exercise Music Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure background music for each phase of the breathing exercise per stress level.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="stress-level-select">Select Stress Level to Configure</Label>
            <Select
              value={String(selectedStressLevel)}
              onValueChange={(value) => setSelectedStressLevel(Number(value))}
            >
              <SelectTrigger id="stress-level-select" className="mt-1 w-[180px]">
                <SelectValue placeholder="Select stress level" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(level => (
                  <SelectItem key={level} value={String(level)}>
                    Stress Level {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingSettings ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading exercise music settings...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {BASE_STAGES.map((stage) => {
                const currentSetting = stageSettings.get(stage.key);
                const isSaving = savingSettings.has(stage.key);
                const selectedMusic = musicTracks.find(t => t.id === currentSetting?.music_id);

                return (
                  <Card key={stage.key} className="p-4">
                    <CardHeader className="p-0 pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary" />
                        {stage.label}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </CardHeader>
                    <CardContent className="p-0 space-y-4">
                      <div>
                        <Label htmlFor={`music-select-${stage.key}`}>Background Music</Label>
                        <Select
                          value={currentSetting?.music_id || "none"} // Changed to "none"
                          onValueChange={(value) => handleSettingChange(stage.key, 'music_id', value === "none" ? null : value)} // Handle "none"
                          disabled={isSaving}
                        >
                          <SelectTrigger id={`music-select-${stage.key}`} className="mt-1">
                            <SelectValue placeholder="Select a music track" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Background Music</SelectItem> {/* Changed value to "none" */}
                            {musicTracks.filter(t => t.is_active).map((track) => (
                              <SelectItem key={track.id} value={track.id}>
                                {track.name} ({formatDuration(track.duration)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedMusic && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Currently selected: {selectedMusic.name}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Volume: {Math.round((currentSetting?.volume || 0) * 100)}%</Label>
                        <Slider
                          value={[currentSetting?.volume || 0]}
                          onValueChange={([value]) => handleSettingChange(stage.key, 'volume', value)}
                          max={1}
                          min={0}
                          step={0.01}
                          disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                          Adjust the volume of the background music for this phase.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fade In Duration: {currentSetting?.fade_in_duration || 0}s</Label>
                          <Slider
                            value={[currentSetting?.fade_in_duration || 0]}
                            onValueChange={([value]) => handleSettingChange(stage.key, 'fade_in_duration', value)}
                            max={10}
                            min={0}
                            step={1}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            How long the music fades in at the start of the phase.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Fade Out Duration: {currentSetting?.fade_out_duration || 0}s</Label>
                          <Slider
                            value={[currentSetting?.fade_out_duration || 0]}
                            onValueChange={([value]) => handleSettingChange(stage.key, 'fade_out_duration', value)}
                            max={10}
                            min={0}
                            step={1}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            How long the music fades out at the end of the phase.
                          </p>
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleSaveMusicSetting(stage.key)}
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Settings
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};