import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const TARGET_MODEL = 'gpt-5-2025-08-07';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 OpenAI Health Check Starting');
    
    if (!openAIApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI API key not configured',
        hasAccess: false,
        model: 'none'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test exact model access
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TARGET_MODEL,
        messages: [
          { role: 'system', content: 'Return {"ok":true} as JSON' },
          { role: 'user', content: 'ping' }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 5
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Health check failed:', response.status, data);
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
        hasAccess: false,
        model: TARGET_MODEL,
        statusCode: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const actualModel = data.model;
    const hasCorrectAccess = actualModel === TARGET_MODEL;
    
    console.log(`✅ Health check result - Expected: ${TARGET_MODEL}, Got: ${actualModel}, Match: ${hasCorrectAccess}`);
    
    return new Response(JSON.stringify({
      success: true,
      hasAccess: hasCorrectAccess,
      expectedModel: TARGET_MODEL,
      actualModel: actualModel,
      finishReason: data.choices?.[0]?.finish_reason,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      hasAccess: false,
      model: TARGET_MODEL
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});