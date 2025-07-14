// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY secret not found in Supabase project settings.');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'The OPENAI_API_KEY secret is not set in your Supabase project settings. Please add it under Project Settings > Edge Functions.',
        api_key_present: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Use 500 as it's a server configuration error
      });
    }

    // Test with a simple API call to verify the key works
    console.log('Testing OpenAI API key...');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OpenAI API key is invalid:', result.error);
    }

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      api_key_present: true,
      api_key_prefix: OPENAI_API_KEY.substring(0, 7) + '...',
      response_ok: response.ok,
      models_count: result.data?.length || 0,
      error: result.error ? result.error.message : null,
      test_timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
      test_timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});