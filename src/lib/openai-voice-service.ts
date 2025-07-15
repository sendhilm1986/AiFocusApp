// OpenAI Voice Service for Natural TTS and Text Generation via Supabase Edge Functions
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

export interface CustomExercise {
  interpretedMood: string;
  exerciseName: string;
  introductoryGuidance: string;
  completionGuidance: string;
  stressScore: number;
  musicCategory: string;
  pattern: { phase: 'inhale' | 'exhale' | 'hold'; duration: number }[];
}

export interface MusicTrack {
  id: number;
  duration: number;
  url: string;
  tags: string;
  user: {
    name: string;
  };
}

class OpenAIVoiceService {
  private audioCache = new Map<string, string>();
  private supabaseFunctionsUrl: string;
  
  constructor() {
    this.supabaseFunctionsUrl = `${SUPABASE_URL}/functions/v1`;
  }

  // This method now just returns static voice data
  async getVoices() {
    return [
      {
        id: 'nova',
        name: 'Nova (Female)',
        language: 'en-US',
        gender: 'female',
        accent: 'american',
        quality: 95,
        provider: 'openai',
        description: 'Warm and engaging female voice'
      },
      {
        id: 'shimmer',
        name: 'Shimmer (Female)',
        language: 'en-US',
        gender: 'female',
        accent: 'american',
        quality: 95,
        provider: 'openai',
        description: 'Gentle and soothing female voice'
      },
      {
        id: 'alloy',
        name: 'Alloy (Neutral)',
        language: 'en-US',
        gender: 'neutral',
        accent: 'american',
        quality: 90,
        provider: 'openai',
        description: 'Balanced and clear voice'
      },
      {
        id: 'echo',
        name: 'Echo (Male)',
        language: 'en-US',
        gender: 'male',
        accent: 'american',
        quality: 90,
        provider: 'openai',
        description: 'Clear and confident male voice'
      },
      {
        id: 'fable',
        name: 'Fable (British Male)',
        language: 'en-GB',
        gender: 'male',
        accent: 'british',
        quality: 90,
        provider: 'openai',
        description: 'Sophisticated British male voice'
      },
      {
        id: 'onyx',
        name: 'Onyx (Deep Male)',
        language: 'en-US',
        gender: 'male',
        accent: 'american',
        quality: 90,
        provider: 'openai',
        description: 'Deep and resonant male voice'
      }
    ];
  }

  async generateSpeech(text: string, voiceId = 'nova', options: { speed?: number } = {}): Promise<string> {
    const cacheKey = `openai-${voiceId}-${text.substring(0, 50)}`;
    
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    console.log('=== CLIENT: Starting TTS generation (using fetch) ===');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication error: Could not get user session.');
      }

      const functionUrl = `${this.supabaseFunctionsUrl}/generate-speech`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: voiceId,
          speed: options.speed || 0.85
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        console.error('Server returned an error:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      if (audioBuffer.byteLength === 0) {
        throw new Error('Empty audio data received from server');
      }

      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.audioCache.set(cacheKey, audioUrl);
      return audioUrl;

    } catch (error: any) {
      console.error('=== CLIENT: TTS generation failed ===', error);
      throw new Error(`Voice synthesis failed: ${error.message}`);
    }
  }

  async generateGuidanceText(stressLevel: number, phase: string, userName: string | null, currentStep: number): Promise<string> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication error: Could not get user session.');
      }

      const functionUrl = `${this.supabaseFunctionsUrl}/generate-breathing-guidance`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stressLevel,
          phase,
          userName,
          currentStep
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      const { guidanceText } = await response.json();
      return guidanceText;

    } catch (error: any) {
      console.error('=== CLIENT: Guidance text generation failed, using fallback ===', error);
      // Fallback logic
      const guidanceTexts: { [key: string]: string } = {
        'opening_preparation': `${userName ? `${userName}, ` : ''}welcome to your stress relief session. Find a comfortable position and allow yourself to settle in. Take a moment to notice how you're feeling right now, and know that you're taking a positive step for your well-being.`,
        'grounding_breathwork': `${userName ? `${userName}, ` : ''}let's begin with some gentle breathing. Breathe in slowly through your nose for four counts... hold for two... and exhale gently through your mouth for six counts. Feel yourself becoming more centered with each breath.`,
        'body_awareness': `${userName ? `${userName}, ` : ''}now let's scan through your body. Starting from the top of your head, notice any areas of tension. Allow your shoulders to drop, soften your jaw, and let any tightness melt away as you continue breathing deeply.`,
        'breathing_with_intention': `${userName ? `${userName}, ` : ''}focus on your breath as your anchor. With each inhale, imagine drawing in calm and peace. With each exhale, release any stress or tension you've been carrying. Your breath is your pathway to tranquility.`,
        'guided_visualization': `${userName ? `${userName}, ` : ''}imagine yourself in a peaceful place. Perhaps a quiet beach, a serene forest, or a cozy room filled with soft light. Feel the safety and calm of this space. You are exactly where you need to be.`,
        'deep_stillness': `${userName ? `${userName}, ` : ''}rest in this moment of stillness. There's nothing you need to do, nowhere you need to be. Simply allow yourself to be present, breathing naturally, feeling the peace that comes from within.`,
        'affirmations': `${userName ? `${userName}, ` : ''}you are strong, you are capable, and you are worthy of peace. Repeat to yourself: "I am calm, I am centered, I am at peace." Feel these words resonate within you.`,
        'closing': `${userName ? `${userName}, ` : ''}as we come to the end of this session, take a moment to appreciate what you've given yourself. Carry this sense of calm with you as you return to your day. You have everything you need within you.`
      };
      
      const fallbackText = guidanceTexts[phase] || `${userName ? `${userName}, ` : ''}take a moment to breathe deeply and find your center. You are safe, you are calm, and you are exactly where you need to be.`;
      
      return fallbackText;
    }
  }

  async generateCustomExercise(moodText: string, firstName: string): Promise<CustomExercise> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication error: Could not get user session.');
      }

      const functionUrl = `${this.supabaseFunctionsUrl}/generate-custom-exercise`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moodText, firstName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error('=== CLIENT: Custom exercise generation failed ===', error);
      throw new Error(`Failed to generate custom exercise: ${error.message}`);
    }
  }

  async fetchMusic(category: string): Promise<MusicTrack[]> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication error: Could not get user session.');
      }

      const functionUrl = `${this.supabaseFunctionsUrl}/fetch-pixabay-music`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();

    } catch (error: any) {
      console.error('=== CLIENT: Fetching music failed ===', error);
      throw new Error(`Failed to fetch music: ${error.message}`);
    }
  }

  clearCache() {
    console.log('Clearing audio cache, entries:', this.audioCache.size);
    for (const url of this.audioCache.values()) {
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    this.audioCache.clear();
  }

  isAvailable(): boolean {
    return true; 
  }
}

export const openaiVoiceService = new OpenAIVoiceService();