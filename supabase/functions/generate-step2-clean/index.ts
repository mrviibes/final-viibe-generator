import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

async function generateWithGPT5(inputs: any): Promise<any> {
  console.log('🎯 Starting GPT-5 generation with inputs:', inputs);
  
  // Force GPT-5 full model
  const model = 'gpt-5-2025-08-07';
  console.log('🤖 Using model:', model);
  
  // Ultra-simple prompt for GPT-5
  const systemPrompt = `Generate 4 ${inputs.tone || 'humorous'} one-liners for ${inputs.subcategory || 'general'}. Return JSON: {"lines": [{"lane": "option1", "text": "..."}, {"lane": "option2", "text": "..."}, {"lane": "option3", "text": "..."}, {"lane": "option4", "text": "..."}]}`;
  
  const userPrompt = `Topic: ${inputs.subcategory || 'general'}, Tone: ${inputs.tone || 'humorous'}`;
  
  console.log('📝 System prompt length:', systemPrompt.length);
  console.log('📝 User prompt:', userPrompt);
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1500
  };
  
  console.log('📋 Request keys:', Object.keys(requestBody).join(', '));
  
  try {
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
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Success!');
    console.log('📊 Model used:', data.model);
    console.log('📊 Finish reason:', data.choices?.[0]?.finish_reason);
    console.log('📊 Content length:', data.choices?.[0]?.message?.content?.length || 0);
    
    // Verify we got the right model
    if (data.model !== model) {
      console.warn('⚠️ Model mismatch! Requested:', model, 'Got:', data.model);
    }
    
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    console.log('📝 Raw response preview:', content.substring(0, 100));
    
    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
      console.error('Raw content:', content);
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
      generatedWith: 'GPT-5 Full',
      issues: []
    };
    
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    throw error;
  }
}

function getFallbackLines(inputs: any) {
  const tone = inputs.tone || 'humorous';
  const subcategory = inputs.subcategory || 'general';
  
  const fallbacks = [
    `Life keeps happening whether you're ready or not`,
    `Adulting is basically just figuring it out as you go`,
    `Some days you're the windshield some days you're the bug`,
    `Reality called but I sent it straight to voicemail`
  ];
  
  return fallbacks.map((text, index) => ({
    lane: `option${index + 1}`,
    text
  }));
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Generate Step 2 function called');
    
    const inputs = await req.json();
    console.log('📨 Request inputs:', inputs);

    if (!openAIApiKey) {
      console.warn('⚠️ No OpenAI API key configured');
      const fallbackLines = getFallbackLines(inputs);
      return new Response(JSON.stringify({
        lines: fallbackLines,
        model: "fallback",
        validated: false,
        success: true,
        generatedWith: 'No API Key',
        issues: ["OpenAI API key not configured"]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try GPT-5 generation
    try {
      const result = await generateWithGPT5(inputs);
      console.log('✅ GPT-5 generation successful');
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('❌ GPT-5 generation failed:', error.message);
      
      // Return fallback with clear indication
      const fallbackLines = getFallbackLines(inputs);
      return new Response(JSON.stringify({
        lines: fallbackLines,
        model: "fallback",
        validated: false,
        success: true,
        generatedWith: 'Fallback - GPT-5 Failed',
        issues: [`GPT-5 error: ${error.message}`]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    const fallbackLines = getFallbackLines({});
    return new Response(JSON.stringify({
      lines: fallbackLines,
      model: "fallback",
      validated: false,
      success: true,
      generatedWith: 'Emergency Fallback',
      issues: [`Function error: ${error.message}`]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});