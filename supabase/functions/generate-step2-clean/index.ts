import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Lock model constant - no fallbacks
const MODEL = 'gpt-5-2025-08-07';

async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 2): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries + 1) throw error;
      
      const delay = attempt === 1 ? 250 : 750;
      console.log(`🔄 Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function generateWithGPT5(inputs: any): Promise<any> {
  console.log('🎯 Starting strict GPT-5 generation');
  
  // Proper prompts with sufficient context but token-efficient
  const systemPrompt = `Generate exactly 4 unique one-liners for memes/image overlays. Return ONLY valid JSON:
{"lines":[{"lane":"option1","text":"..."},{"lane":"option2","text":"..."},{"lane":"option3","text":"..."},{"lane":"option4","text":"..."}]}

Rules: 40-80 chars each, funny/engaging, different comedic styles, simple punctuation only.`;
  
  const userPrompt = `Category: ${inputs.category || 'general'}
Subcategory: ${inputs.subcategory || 'general'} 
Tone: ${inputs.tone || 'humorous'}
${inputs.tags && inputs.tags.length > 0 ? `Tags: ${inputs.tags.join(', ')}` : ''}`;
  
  console.log('📝 Prompts - System:', systemPrompt.length, 'User:', userPrompt.length);
  
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 220
  };
  
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('📊 Model returned:', data.model, 'Finish:', data.choices?.[0]?.finish_reason);
    
    // STRICT MODEL VALIDATION - FAIL FAST
    if (data.model !== MODEL) {
      throw new Error(`Model mismatch: expected ${MODEL}, got ${data.model}`);
    }
    
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.length === 0) {
      throw new Error(`Empty content (finish: ${data.choices?.[0]?.finish_reason})`);
    }
    
    console.log('📝 Content preview:', content.substring(0, 50));
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('❌ JSON parse failed:', content);
      throw new Error('Invalid JSON response');
    }
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length < 4) {
      throw new Error('Invalid response structure');
    }
    
    return {
      lines: parsed.lines.slice(0, 4),
      model: data.model,
      validated: true,
      success: true,
      generatedWith: 'GPT-5 Strict',
      issues: []
    };
  });
}

// No fallbacks in strict mode - GPT-5 succeeds or fails

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Strict GPT-5 generation starting');
    
    const inputs = await req.json();
    console.log('📨 Inputs:', JSON.stringify(inputs, null, 2));

    // FAIL FAST - No API key = immediate error
    if (!openAIApiKey) {
      console.error('❌ CRITICAL: No OpenAI API key');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        success: false,
        model: 'none',
        validated: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // STRICT GPT-5 GENERATION - NO FALLBACKS
    const result = await generateWithGPT5(inputs);
    console.log('✅ GPT-5 SUCCESS:', result.model);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ HARD FAIL:', error.message);
    
    // Surface error to UI - NO SILENT FALLBACKS
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      model: 'error',
      validated: false,
      details: {
        requestedModel: MODEL,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});