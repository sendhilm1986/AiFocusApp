// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { category } = await req.json();
    if (!category) {
      return new Response(JSON.stringify({ error: 'Music category is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check for Pixabay API Key
    const PIXABAY_API_KEY = Deno.env.get('PIXABAY_API_KEY');
    if (!PIXABAY_API_KEY) {
      console.error('PIXABAY_API_KEY not found in environment variables.');
      return new Response(JSON.stringify({ error: 'Music service not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Use the correct endpoint from the user's document
    const musicApiUrl = `https://pixabay.com/api/audio/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(category)}&safesearch=true&order=latest&per_page=50`;

    const pixabayResponse = await fetch(musicApiUrl);

    if (!pixabayResponse.ok) {
      throw new Error(`Pixabay API error: ${pixabayResponse.statusText}`);
    }

    const musicData = await pixabayResponse.json();

    if (!musicData.hits) {
        throw new Error('Unexpected response structure from Pixabay API');
    }

    // Filter for tracks that are a reasonable length for a breathing exercise (e.g., 1-5 minutes)
    const suitableTracks = musicData.hits.filter(track => track.duration > 60 && track.duration < 300);

    return new Response(JSON.stringify(suitableTracks.length > 0 ? suitableTracks : musicData.hits), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in fetch-pixabay-music function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});