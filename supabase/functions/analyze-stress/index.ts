// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  console.log('=== Analyze Stress Function Started ===');
  
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
    const { stressEntries } = await req.json();
    
    if (!stressEntries || !Array.isArray(stressEntries) || stressEntries.length === 0) {
      console.error('Invalid or empty stress entries');
      return new Response(JSON.stringify({ error: 'No stress entries provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log(`Processing ${stressEntries.length} stress entries`);

    // 3. Check for OpenAI API Key
    console.log('Step 3: Checking for OpenAI API Key...');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return new Response(JSON.stringify({ error: 'AI analysis service not configured on server' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('OpenAI API Key found');

    // 4. Prepare analysis data
    const total = stressEntries.length;
    const average = stressEntries.reduce((sum: number, entry: any) => sum + entry.stress_score, 0) / total;
    const highStress = stressEntries.filter((entry: any) => entry.stress_score >= 4).length;
    const lowStress = stressEntries.filter((entry: any) => entry.stress_score <= 2).length;
    
    // Recent trend analysis
    const recent = stressEntries.slice(0, 7);
    const previous = stressEntries.slice(7, 14);
    const recentAvg = recent.length > 0 ? recent.reduce((sum: number, entry: any) => sum + entry.stress_score, 0) / recent.length : 0;
    const previousAvg = previous.length > 0 ? previous.reduce((sum: number, entry: any) => sum + entry.stress_score, 0) / previous.length : 0;
    const trend = recentAvg - previousAvg;

    // Get notes for context
    const notesWithStress = stressEntries
      .filter((entry: any) => entry.notes && entry.notes.trim())
      .slice(0, 10)
      .map((entry: any) => `Stress ${entry.stress_score}/5: "${entry.notes}"`);

    // 5. Generate AI analysis
    console.log('Step 4: Generating AI analysis...');
    const prompt = `As a stress management expert, analyze this user's stress data and provide personalized insights and recommendations.

STRESS DATA SUMMARY:
- Total entries: ${total}
- Average stress level: ${average.toFixed(1)}/5
- High stress days (4-5): ${highStress} (${((highStress/total)*100).toFixed(1)}%)
- Low stress days (1-2): ${lowStress} (${((lowStress/total)*100).toFixed(1)}%)
- Recent trend: ${trend > 0 ? 'Increasing' : trend < 0 ? 'Decreasing' : 'Stable'} (${trend.toFixed(1)} change)

RECENT STRESS NOTES:
${notesWithStress.length > 0 ? notesWithStress.join('\n') : 'No detailed notes provided'}

Please provide:
1. Key patterns and insights from their stress data
2. Specific, actionable recommendations for stress management
3. Positive reinforcement for their tracking efforts
4. Suggestions for breathing exercises or mindfulness practices
5. Lifestyle adjustments that could help

Keep the response conversational, supportive, and under 300 words. Focus on practical advice they can implement immediately.`;

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
            content: 'You are a compassionate stress management expert who provides personalized, actionable advice based on user data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate AI analysis',
        details: errorText 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: openaiResponse.status,
      });
    }

    const openaiData = await openaiResponse.json();
    
    if (!openaiData.choices || !openaiData.choices[0] || !openaiData.choices[0].message) {
      console.error('Invalid OpenAI response structure:', openaiData);
      return new Response(JSON.stringify({ 
        error: 'Invalid response from AI service' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const analysis = openaiData.choices[0].message.content;
    console.log('AI analysis generated successfully');

    return new Response(JSON.stringify({ 
      analysis,
      stats: {
        total,
        average: Math.round(average * 10) / 10,
        highStress,
        lowStress,
        trend: Math.round(trend * 10) / 10
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('=== Analyze Stress Function Error ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'AI analysis service failed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});