// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('=== Generate Breathing Guidance Function Started ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    console.log('Step 1: Authenticating user...');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('User authenticated:', user.id);

    // 2. Parse request body
    console.log('Step 2: Parsing request body...');
    const { stressLevel, phase, userName, currentStep } = await req.json();
    
    if (!phase || typeof stressLevel !== 'number') {
      console.error('Invalid request parameters');
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`Generating guidance for phase: ${phase}, stress level: ${stressLevel}`);

    // 3. Check for OpenAI API Key
    console.log('Step 3: Checking for OpenAI API Key...');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables');
      
      // Return fallback guidance text
      const fallbackGuidance = getFallbackGuidance(phase, userName);
      return new Response(JSON.stringify({ 
        guidanceText: fallbackGuidance,
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    console.log('OpenAI API Key found');

    // 4. Generate AI guidance text
    console.log('Step 4: Generating AI guidance text...');
    const prompt = `Generate a personalized breathing exercise guidance for:
- Phase: ${phase}
- User's stress level: ${stressLevel}/5
- User's name: ${userName || 'the user'}
- Step: ${currentStep}

Create a warm, calming 2-3 sentence guidance that:
1. Addresses the user by name if provided
2. Gives specific breathing or mindfulness instructions for this phase
3. Is encouraging and supportive
4. Matches the stress level intensity (higher stress = more calming language)

Keep it conversational and soothing, as if spoken by a caring meditation guide.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate meditation and breathing exercise guide. Create personalized, calming guidance for stress relief.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Return fallback guidance on API error
      const fallbackGuidance = getFallbackGuidance(phase, userName);
      return new Response(JSON.stringify({ 
        guidanceText: fallbackGuidance,
        source: 'fallback',
        error: 'AI generation failed, using fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error('Invalid OpenAI response structure:', openaiData);
      
      // Return fallback guidance on invalid response
      const fallbackGuidance = getFallbackGuidance(phase, userName);
      return new Response(JSON.stringify({ 
        guidanceText: fallbackGuidance,
        source: 'fallback',
        error: 'Invalid AI response, using fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const guidanceText = openaiData.choices[0].message.content.trim();
    console.log('AI guidance generated successfully');

    return new Response(JSON.stringify({ 
      guidanceText,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('=== Generate Breathing Guidance Function Error ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Return fallback guidance on any error
    const { phase, userName } = await req.json().catch(() => ({ phase: 'opening_preparation', userName: null }));
    const fallbackGuidance = getFallbackGuidance(phase, userName);
    
    return new Response(JSON.stringify({ 
      guidanceText: fallbackGuidance,
      source: 'fallback',
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

function getFallbackGuidance(phase: string, userName: string | null): string {
  const name = userName ? `${userName}, ` : '';
  
  const guidanceTexts: { [key: string]: string } = {
    'opening_preparation': `${name}welcome to your stress relief session. Find a comfortable position and allow yourself to settle in. Take a moment to notice how you're feeling right now, and know that you're taking a positive step for your well-being.`,
    'grounding_breathwork': `${name}let's begin with some gentle breathing. Breathe in slowly through your nose for four counts... hold for two... and exhale gently through your mouth for six counts. Feel yourself becoming more centered with each breath.`,
    'body_awareness': `${name}now let's scan through your body. Starting from the top of your head, notice any areas of tension. Allow your shoulders to drop, soften your jaw, and let any tightness melt away as you continue breathing deeply.`,
    'breathing_with_intention': `${name}focus on your breath as your anchor. With each inhale, imagine drawing in calm and peace. With each exhale, release any stress or tension you've been carrying. Your breath is your pathway to tranquility.`,
    'guided_visualization': `${name}imagine yourself in a peaceful place. Perhaps a quiet beach, a serene forest, or a cozy room filled with soft light. Feel the safety and calm of this space. You are exactly where you need to be.`,
    'deep_stillness': `${name}rest in this moment of stillness. There's nothing you need to do, nowhere you need to be. Simply allow yourself to be present, breathing naturally, feeling the peace that comes from within.`,
    'affirmations': `${name}you are strong, you are capable, and you are worthy of peace. Repeat to yourself: "I am calm, I am centered, I am at peace." Feel these words resonate within you.`,
    'closing': `${name}as we come to the end of this session, take a moment to appreciate what you've given yourself. Carry this sense of calm with you as you return to your day. You have everything you need within you.`
  };
  
  return guidanceTexts[phase] || `${name}take a moment to breathe deeply and find your center. You are safe, you are calm, and you are exactly where you need to be.`;
}