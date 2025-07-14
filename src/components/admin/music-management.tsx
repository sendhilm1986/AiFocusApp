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
  Clock
} from 'lucide-react';

interface BackgroundMusic {
  id: string;
  name: string;
  file_url: string;
  duration: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export const MusicManagement: React.FC = () => {
  const [musicTracks, setMusicTracks] = useState<BackgroundMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trackName, setTrackName] = useState('');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMusicTracks();
  }, []);

  const fetchMusicTracks = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      
      // Validate file size (max 10MB)
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
    setError(null);

    try {
      console.log('Starting music upload process...');
      console.log('File:', selectedFile.name, 'Size:', selectedFile.size);
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${selectedFile.name}`;
      console.log('Uploading to storage with filename:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('background-music')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('background-music')
        .getPublicUrl(fileName);

      console.log('Public URL generated:', urlData.publicUrl);

      // Get audio duration (approximate)
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

      console.log('Audio duration:', duration);

      // Save to database
      const { error: dbError } = await supabase
        .from('background_music')
        .insert({
          name: trackName.trim(),
          file_url: urlData.publicUrl,
          duration: duration,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('Music track saved to database successfully');

      toast.success('Music track uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setTrackName('');
      
      // Refresh tracks
      await fetchMusicTracks();

    } catch (error: any) {
      console.error('Music upload process failed:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      setError(errorMessage);
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
      // Extract filename from URL
      const fileName = fileUrl.split('/').pop();
      
      // Delete from storage
      if (fileName) {
        await supabase.storage
          .from('background-music')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('background_music')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast.success('Track deleted successfully');
      await fetchMusicTracks();
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading music tracks...</p>
        </CardContent>
      </Card>
    );
  }

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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
          {musicTracks.length === 0 ? (
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
    </div>
  );
};