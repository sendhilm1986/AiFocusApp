"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Play, Square, Volume2, AlertCircle, CheckCircle, Settings, Key } from 'lucide-react';
import { openaiVoiceService } from '@/lib/openai-voice-service';
import { supabase } from '@/integrations/supabase/client';

export const SimpleTTSTest: React.FC = () => {
  const [text, setText] = useState("Hello, this is a test of the text to speech system.");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('nova');
  const [voices, setVoices] = useState<any[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<any>(null);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load voices
    openaiVoiceService.getVoices().then(setVoices);
  }, []);

  const testApiKey = async () => {
    setTestingApiKey(true);
    setApiKeyStatus(null);
    
    try {
      console.log('Testing OpenAI API key via Edge Function...');
      const response = await supabase.functions.invoke('test-openai-key');
      
      console.log('API key test response:', response);
      
      if (response.error) {
        setApiKeyStatus({
          success: false,
          error: response.error.message || 'Failed to test API key'
        });
      } else {
        setApiKeyStatus(response.data);
      }
      
    } catch (error: any) {
      console.error('API key test failed:', error);
      setApiKeyStatus({
        success: false,
        error: error.message
      });
    } finally {
      setTestingApiKey(false);
    }
  };

  const testTTS = async () => {
    setIsLoading(true);
    setLastError(null);
    setLastSuccess(false);
    setDebugInfo('=== Starting TTS Test (via openaiVoiceService) ===\n');
    
    try {
      console.log('=== CLIENT: Starting TTS test via service ===');
      setDebugInfo(prev => prev + `Text to convert: "${text}"\n`);
      setDebugInfo(prev => prev + `Voice: ${selectedVoice}\n`);
      
      // Use the centralized service
      const audioUrl = await openaiVoiceService.generateSpeech(
        text.trim(),
        selectedVoice,
        { speed: 0.9 }
      );
      
      setDebugInfo(prev => prev + `Audio URL created: ${audioUrl.substring(0, 50)}...\n`);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        
        audioRef.current.onloadeddata = () => {
          console.log('Audio loaded, duration:', audioRef.current?.duration);
          setDebugInfo(prev => prev + `Audio loaded successfully, duration: ${audioRef.current?.duration}s\n`);
        };
        
        audioRef.current.onended = () => {
          console.log('Audio playback ended');
          setIsPlaying(false);
          setDebugInfo(prev => prev + `Audio playback completed\n`);
        };
        
        audioRef.current.onerror = (e) => {
          console.error('Audio playback error:', e);
          setIsPlaying(false);
          const errorMsg = audioRef.current?.error?.message || 'Unknown audio error';
          setLastError(`Audio playback error: ${errorMsg}`);
          setDebugInfo(prev => prev + `AUDIO PLAYBACK ERROR: ${errorMsg}\n`);
        };

        console.log('Starting audio playback...');
        setDebugInfo(prev => prev + `Starting audio playback...\n`);
        
        await audioRef.current.play();
        setIsPlaying(true);
        setLastSuccess(true);
        setDebugInfo(prev => prev + `✅ Audio playback started successfully!\n`);
        toast.success('TTS test successful!');
      }

    } catch (error: any) {
      console.error('=== CLIENT: TTS test failed ===');
      console.error('Error:', error);
      setLastError(error.message);
      setDebugInfo(prev => prev + `\n❌ FINAL ERROR: ${error.message}\n`);
      toast.error(`TTS test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
      setDebugInfo(prev => prev + `Audio stopped by user\n`);
    }
  };

  const clearDebug = () => {
    setDebugInfo('');
    setLastError(null);
    setLastSuccess(false);
  };

  const clearCache = () => {
    openaiVoiceService.clearCache();
    toast.success('Audio cache cleared');
    setDebugInfo(prev => prev + `Audio cache cleared\n`);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            TTS Debug Test (Supabase Edge Function)
            {lastSuccess && <CheckCircle className="h-5 w-5 text-green-500" />}
            {lastError && <AlertCircle className="h-5 w-5 text-red-500" />}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-blue-600" />
            <h4 className="font-medium text-blue-900">API Key Test</h4>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            Test if your OpenAI API key is properly configured in Supabase Edge Functions.
          </p>
          <Button 
            onClick={testApiKey} 
            disabled={testingApiKey}
            size="sm"
            className="mb-3"
          >
            {testingApiKey ? 'Testing...' : 'Test OpenAI API Key'}
          </Button>
          
          {apiKeyStatus && (
            <div className={`p-3 rounded-lg ${apiKeyStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {apiKeyStatus.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-medium ${apiKeyStatus.success ? 'text-green-900' : 'text-red-900'}`}>
                  {apiKeyStatus.success ? 'API Key Working!' : 'API Key Issue'}
                </span>
              </div>
              <div className={`text-sm ${apiKeyStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                {apiKeyStatus.success ? (
                  <div>
                    <p>✅ API Key: {apiKeyStatus.api_key_prefix}</p>
                    <p>✅ Models Available: {apiKeyStatus.models_count}</p>
                    <p>✅ Status: {apiKeyStatus.status}</p>
                  </div>
                ) : (
                  <div>
                    <p>❌ Error: {apiKeyStatus.error}</p>
                    {apiKeyStatus.api_key_present === false && (
                      <p>❌ OpenAI API key not found in Supabase secrets</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="voice-select">Voice</Label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
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

        <div>
          <Label htmlFor="test-text">Text to convert:</Label>
          <Input
            id="test-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to convert to speech"
            disabled={isLoading}
            className="mt-1"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testTTS} 
            disabled={isLoading || !text.trim()}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isLoading ? 'Testing...' : 'Test TTS'}
          </Button>
          
          {isPlaying && (
            <Button 
              onClick={stopAudio}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          
          <Button 
            onClick={clearDebug}
            variant="outline"
            size="sm"
          >
            Clear Debug
          </Button>

          <Button 
            onClick={clearCache}
            variant="outline"
            size="sm"
          >
            Clear Cache
          </Button>
        </div>

        {lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <h4 className="font-medium text-red-900">Last Error</h4>
            </div>
            <p className="text-sm text-red-800 font-mono bg-red-100 p-2 rounded">{lastError}</p>
            <div className="mt-4">
              <p className="text-sm text-red-900 mb-2">If the error persists, please copy the debug information below and share it.</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(debugInfo);
                  toast.success("Debug info copied to clipboard!");
                }}
              >
                Copy Debug Info
              </Button>
            </div>
          </div>
        )}

        {lastSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-900">Success!</h4>
            </div>
            <p className="text-sm text-green-800">TTS conversion and playback completed successfully.</p>
          </div>
        )}

        {debugInfo && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium mb-2">Debug Information:</h4>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-white p-2 rounded border max-h-96 overflow-y-auto">
              {debugInfo}
            </pre>
          </div>
        )}
      </CardContent>
      
      <audio ref={audioRef} className="hidden" />
    </Card>
  );
};