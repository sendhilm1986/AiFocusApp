// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('--- generate-speech function invoked (v3 - heavy logging) ---');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request. Returning 200.');
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // 1. Authenticate user
    console.log('Step 1: Authenticating user...');
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      const errorMsg = 'Authentication failed: ' + (userError?.message || 'No user found');
      console.error(errorMsg);
      console.log('Returning 401.');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('User authenticated:', user.id);

    // 2. Parse request body
    console.log('Step 2: Parsing request body...');
    const { text, voice = 'nova', speed = 0.85 } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('Invalid text parameter received.');
      console.log('Returning 400.');
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    const requestPayload = {
      model: 'tts-1',
      voice: voice,
      input: text.trim(),
      response_format: 'mp3',
      speed: speed,
    };
    console.log(`Request body parsed. Payload for OpenAI:`, requestPayload);

    // 3. Check for OpenAI API Key
    console.log('Step 3: Checking for OpenAI API Key...');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      const errorMsg = 'OPENAI_API_KEY not found in environment variables.';
      console.error(errorMsg);
      console.log('Returning 500.');
      return new Response(JSON.stringify({ error: 'Speech generation service not configured on server.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('OpenAI API Key found.');

    // 4. Call OpenAI API
    console.log('Step 4: Calling OpenAI TTS API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });
    console.log(`OpenAI response status: ${openaiResponse.status}`);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      console.log(`Returning ${openaiResponse.status}.`);
      return new Response(JSON.stringify({ error: 'Failed to generate speech from provider.', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: openaiResponse.status,
      });
    }

    // 5. Return audio data as a Blob
    console.log('Step 5: Processing OpenAI audio response...');
    const audioBuffer = await openaiResponse.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      const errorMsg = 'Received empty audio buffer from OpenAI.';
      console.error(errorMsg);
      console.log('Returning 500.');
      return new Response(JSON.stringify({ error: 'AI provider returned empty audio data.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    console.log(`Audio blob created, size: ${audioBlob.size}. Sending response with status 200.`);
    
    return new Response(audioBlob, {
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      status: 200,
    });

  } catch (error: any) {
    console.error('--- Uncaught error in generate-speech function ---');
    console.error(error);
    console.log('Returning 500 due to uncaught error.');
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});