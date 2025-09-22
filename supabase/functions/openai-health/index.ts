import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const TARGET_MODEL = 'gpt-5-2025-08-07'; // Match primary generation model

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🏥 OpenAI Health Check Starting');
    
    if (!openAIApiKey) {
      console.error('❌ No OpenAI API key configured');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'OpenAI API key not configured',
        keyPresent: false,
        modelAccess: false,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test generation model access with minimal request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TARGET_MODEL,
        messages: [
          { role: 'system', content: 'Return {"test":"ok"} as JSON' },
          { role: 'user', content: 'ping' }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 10
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API test failed:', response.status, errorText);
      
      return new Response(JSON.stringify({
        status: 'error',
        message: `OpenAI API test failed: ${response.status}`,
        keyPresent: true,
        modelAccess: false,
        details: errorText.substring(0, 200),
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Return 200 so client can read the error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const actualModel = data.model;
    const expectedModel = TARGET_MODEL;
    const modelMatch = actualModel === expectedModel;
    
    console.log(`✅ Health check result - Expected: ${expectedModel}, Got: ${actualModel}, Match: ${modelMatch}`);
    
    return new Response(JSON.stringify({
      status: 'healthy',
      message: 'OpenAI API is accessible',
      keyPresent: true,
      modelAccess: true,
      expectedModel,
      actualModel,
      modelMatch,
      finishReason: data.choices?.[0]?.finish_reason,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message,
      keyPresent: !!openAIApiKey,
      modelAccess: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});