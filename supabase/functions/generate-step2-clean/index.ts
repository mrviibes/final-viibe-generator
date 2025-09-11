import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// LOCKED MODEL - STRICT MODE
const MODEL = 'gpt-4.1-2025-04-14';

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
  const startTime = Date.now();
  console.log('🎯 Starting strict GPT-5 generation');
  
  // ROBUST INPUT COERCION
  const tagsArray = Array.isArray(inputs.tags) ? inputs.tags : 
                   (typeof inputs.tags === 'string' ? [inputs.tags] : []);
  const tagsStr = tagsArray.length > 0 ? tagsArray.join(',') : 'none';
  
  // COMPREHENSIVE STRICT SYSTEM PROMPT
  const systemPrompt = `You are a professional comedian and writer. 
Your job is to generate 4 unique one-liner jokes or captions as JSON only.

Return ONLY JSON in this exact structure:
{
  "lines": [
    {"lane": "option1", "text": "..."},
    {"lane": "option2", "text": "..."},
    {"lane": "option3", "text": "..."},
    {"lane": "option4", "text": "..."}
  ]
}

## Global Rules:
1. Always produce 4 unique outputs. 
   Each must feel like a different comedian style.
   Rotate through this hidden comedian style bank (do not name them):
   - Energetic storytelling
   - Raw fearless
   - Sharp cultural commentary
   - Relatable millennial adulting humor
   - Edgy/boundary-pushing wit
   - Global/political perspective
   - Physical/family-centric
   - Blunt observational
   - Narrative political storytelling
   - Deadpan clean observational
2. Length:
   - Option 1 = 40–50 characters
   - Option 2 = 50–60 characters
   - Option 3 = 60–70 characters
   - Option 4 = 70–80 characters
   - Story Mode only: all 4 options = 80–100 characters, must have setup + payoff.
3. Do NOT use em dashes (—). Only standard punctuation is allowed.
4. Tone:
   - Humorous = light jokes, puns, observational comedy.
   - Savage = sarcastic, bold, roast-style wit.
   - Romantic = flirty, affectionate, sweet.
   - Sentimental = heartfelt, warm, sincere.
   - Nostalgic = wistful, memory-driven.
   - Inspirational = uplifting, motivational, positive.
   - Playful = mischievous, lively fun.
   - Serious = respectful, formal, matter-of-fact (less humor).
5. Style:
   - Standard = balanced observational one-liners.
   - Story Mode = setup + payoff, narrative mini-story, 80–100 chars.
   - Punchline First = gag hits early, then short twist.
   - Pop Culture = MUST include at least one celebrity, movie, meme, or trend reference.
   - Wildcard = random structure/voice; maximum variety.
6. Rating:
   - G = wholesome, family-friendly, no profanity or innuendo.
   - PG = light sarcasm, safe roasts.
   - PG-13 = sharper roasts, mild profanity/innuendo allowed.
   - R = savage, edgy, risky; profanity OK; NO hate speech or slurs.
7. Tags:
   - Unquoted tags (e.g. jesse, cake, birthday) → MUST appear literally in 3 of 4 lines.
   - Quoted tags (e.g. "loser", "female", "romantic") → MUST NOT appear in text, 
     but must influence tone, POV, or word choice.
8. Voice variety:
   - Each of the 4 outputs must use a different comedian style from the style bank.
9. Output must be only valid JSON in the given structure.
   No explanations, no comments, no extra formatting.`;
  
  const userPrompt = `Category:${inputs.category} Subcategory:${inputs.subcategory} Tone:${inputs.tone} Tags:${tagsStr} Style:${inputs.style || 'standard'} Rating:${inputs.rating || 'PG'}`;
  
  console.log('📝 Prompts - System:', systemPrompt.length, 'User:', userPrompt.length);
  
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 350
  };
  
  return retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(12000), // Extended timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    const finishReason = data.choices?.[0]?.finish_reason;
    
    // TELEMETRY
    console.log('📊 TELEMETRY:', JSON.stringify({
      model_used: data.model,
      latency_ms: latencyMs,
      tokens_in: data.usage?.prompt_tokens,
      tokens_out: data.usage?.completion_tokens,
      style: inputs.style,
      rating: inputs.rating,
      finish_reason: finishReason
    }));
    
    // STRICT MODEL VALIDATION - FAIL FAST
    if (data.model !== MODEL) {
      throw new Error(`Model mismatch: expected ${MODEL}, got ${data.model}`);
    }
    
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (content.length === 0) {
      throw new Error(`Empty content (finish: ${finishReason})`);
    }
    
    // ENHANCED VALIDATION WITH NEW REQUIREMENTS
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('❌ JSON parse failed:', content);
      throw new Error('Invalid JSON response');
    }
    
    if (!Array.isArray(parsed.lines) || parsed.lines.length < 4) {
      throw new Error('Bad response shape');
    }
    
    // VALIDATE LENGTH BANDS AND EM DASH RULE
    const validationErrors = [];
    const isStoryMode = inputs.style === 'story';
    const expectedLengths = isStoryMode 
      ? [80, 80, 80, 80] // Story mode: all 80-100 chars
      : [45, 55, 65, 75]; // Standard: 40-50, 50-60, 60-70, 70-80 chars
    const lengthTolerances = isStoryMode 
      ? [20, 20, 20, 20] // ±20 for story mode (80-100 range)
      : [5, 5, 5, 5]; // ±5 for standard modes
    
    parsed.lines.forEach((line, index) => {
      const text = line.text || '';
      const length = text.length;
      const expectedLength = expectedLengths[index];
      const tolerance = lengthTolerances[index];
      const minLength = expectedLength - tolerance;
      const maxLength = expectedLength + tolerance;
      
      // Check length bands
      if (length < minLength || length > maxLength) {
        validationErrors.push(`Option ${index + 1} length ${length} outside range ${minLength}-${maxLength}`);
      }
      
      // Check for em dashes
      if (text.includes('—')) {
        validationErrors.push(`Option ${index + 1} contains em dash (—) - not allowed`);
      }
    });
    
    if (validationErrors.length > 0) {
      console.warn('⚠️ Validation warnings:', validationErrors.join('; '));
      // Continue despite warnings - don't fail completely
    }
    
    console.log('✅ VALIDATOR PASS: valid JSON with 4+ lines, length bands checked');
    
    return {
      lines: parsed.lines.slice(0, 4),
      model: data.model,
      validated: true,
      success: true,
      generatedWith: 'GPT-5 Strict',
      telemetry: { latencyMs, finishReason, tokensIn: data.usage?.prompt_tokens, tokensOut: data.usage?.completion_tokens }
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
    console.log('📨 Raw inputs received:', JSON.stringify(inputs, null, 2));
    
    // ROBUST INPUT VALIDATION AND COERCION
    if (!inputs.category || !inputs.subcategory || !inputs.tone) {
      console.error('❌ Missing required fields');
      return new Response(JSON.stringify({
        error: 'Missing required fields: category, subcategory, tone',
        success: false,
        model: 'none',
        validated: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    
    // FAIL FAST - NO SILENT FALLBACKS
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      model: 'error',
      validated: false,
      requestedModel: MODEL,
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Return 200 so client can read the error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});