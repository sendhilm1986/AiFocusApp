// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSystemPrompt = (firstName) => `You are an expert mindfulness and breathing coach. Your task is to interpret a user's described mood and create a personalized breathing exercise.

The user's first name is ${firstName}.

**Instructions:**

1.  **Interpret Mood:** Analyze the user's text to understand their emotional state.
2.  **Create Exercise:** Design a breathing exercise with a sequence of 'inhale', 'exhale', and 'hold' phases, each with a duration in seconds. The total exercise should have between 4 and 8 steps.
3.  **Generate Guidance:**
    *   **Introductory:** Create a warm, reassuring intro that names the exercise and explains its benefit for their mood.
    *   **Completion:** Create a positive closing message.
4.  **Estimate Stress Score:** Estimate a stress score from 1 (low) to 5 (high).

**Output Format:**

You MUST respond with a single, valid JSON object.

**JSON Structure:**
{
  "interpretedMood": "A concise, 1-3 word description of the interpreted mood.",
  "exerciseName": "A creative name for the exercise.",
  "introductoryGuidance": "The full text for the introductory voice line.",
  "completionGuidance": "The full text for the completion voice line.",
  "stressScore": 3,
  "pattern": [
    { "phase": "inhale", "duration": 4 },
    { "phase": "hold", "duration": 2 },
    { "phase": "exhale", "duration": 6 }
  ]
}`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Parse request body
    const { moodText, firstName } = await req.json();
    if (!moodText || typeof moodText !== 'string') {
      return new Response(JSON.stringify({ error: 'moodText is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check for OpenAI API Key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables.');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const systemPrompt = getSystemPrompt(firstName || 'there');
    const userPrompt = `The user's described feeling is: "${moodText}"`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate exercise from AI provider.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const openaiData = await openaiResponse.json();
    const exerciseData = JSON.parse(openaiData.choices[0].message.content);

    return new Response(JSON.stringify(exerciseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in generate-custom-exercise function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});