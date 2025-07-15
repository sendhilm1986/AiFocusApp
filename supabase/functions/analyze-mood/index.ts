// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_MOODS = ['Anxious', 'Stressed', 'Tired', 'Sad', 'Angry', 'Calm', 'Energized'];

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
    const { moodText } = await req.json();
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
      // Fallback for when key is missing
      return new Response(JSON.stringify({ mood: 'Calm' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Call OpenAI API
    const prompt = `You are an expert mood analyzer. Analyze the user's text and classify it into one of the following categories: ${VALID_MOODS.join(', ')}. Respond with only the single category name. If the mood is unclear, neutral, or doesn't fit, respond with "Calm". Do not add any extra text or punctuation.

User input: "${moodText}"`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      // Fallback on API error
      return new Response(JSON.stringify({ mood: 'Calm' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const openaiData = await openaiResponse.json();
    let detectedMood = openaiData.choices[0].message.content.trim().replace('.', '');

    // Validate the response from OpenAI
    if (!VALID_MOODS.includes(detectedMood)) {
      console.warn(`OpenAI returned an invalid mood: "${detectedMood}". Defaulting to "Calm".`);
      detectedMood = 'Calm';
    }

    return new Response(JSON.stringify({ mood: detectedMood }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in analyze-mood function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});