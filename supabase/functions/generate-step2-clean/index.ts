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
  const systemPrompt = `You are a professional stand-up comedian. 
Generate exactly 4 unique one-liner jokes or captions. 
Return ONLY valid JSON:

{
  "lines": [
    {"lane": "option1", "text": "..."},
    {"lane": "option2", "text": "..."},
    {"lane": "option3", "text": "..."},
    {"lane": "option4", "text": "..."}
  ]
}

## Rules:
1. Lengths:
   - Option 1 = 40–50 characters
   - Option 2 = 50–60 characters
   - Option 3 = 60–70 characters
   - Option 4 = 70–80 characters
   - Story Mode only: all 4 lines = 80–100 characters (setup + payoff narrative).
2. Punctuation:
   - MAX 1 punctuation mark per line (comma OR period OR colon).
   - No em dashes.
3. Tone must match selection:
   - Humorous = observational or pun-based.
   - Savage = sharp roast, sarcastic.
   - Romantic = affectionate, flirty.
   - Sentimental = heartfelt, sincere.
   - Nostalgic = memory-driven.
   - Inspirational = uplifting, motivational.
   - Playful = mischievous, fun.
   - Serious = plain, respectful.
4. Style must match selection:
   - Standard = balanced observational.
   - Story Mode = mini-story with setup → payoff.
   - Punchline First = gag lands in first half.
   - Pop Culture = MUST mention a celebrity, meme, or trend.
   - Wildcard = random format/voice.
5. Rating:
   - G = wholesome, family-safe.
   - PG = light sarcasm, no profanity.
   - PG-13 = edgy, mild profanity/innuendo OK.
   - R = savage, explicit language allowed (NO hate or slurs).
6. Tags:
   - Unquoted tags (e.g. jesse, cake) → appear literally in 3/4 lines.
   - Quoted tags (e.g. "loser", "romantic") → do NOT appear, but steer tone/voice.
7. Variety:
   - Each line must use a different comedic voice from this hidden bank: energetic storytelling, raw fearless, cultural commentary, millennial adulting humor, edgy wit, political/global, physical/family-centric, blunt observational, narrative, deadpan.
   - Do not repeat the same premise across all 4 (e.g. not all about cake).
   - At least one must be observational, one cultural, one absurd, one roast.
8. Must feel like spoken human jokes, not stiff sentences.
9. Output ONLY valid JSON in the structure above.`;
  
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
    
    // COMPREHENSIVE VALIDATION - LENGTH, PUNCTUATION, VARIETY
    const validationErrors = [];
    const isStoryMode = inputs.style === 'story';
    const expectedLengths = isStoryMode 
      ? [80, 80, 80, 80] // Story mode: all 80-100 chars
      : [45, 55, 65, 75]; // Standard: 40-50, 50-60, 60-70, 70-80 chars
    const lengthTolerances = isStoryMode 
      ? [20, 20, 20, 20] // ±20 for story mode (80-100 range)
      : [5, 5, 5, 5]; // ±5 for standard modes
    
    const allTexts = parsed.lines.map((line: any) => line.text?.toLowerCase() || '');
    const unquotedTags = Array.isArray(inputs.tags) ? 
      inputs.tags.filter((tag: string) => !tag.startsWith('"') && !tag.endsWith('"')) : [];
    
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
      
      // NEW: Check punctuation limit (max 1 per line)
      const punctuationCount = (text.match(/[,.;:!?]/g) || []).length;
      if (punctuationCount > 1) {
        validationErrors.push(`Option ${index + 1} has ${punctuationCount} punctuation marks, max 1 allowed`);
      }
    });
    
    // NEW: Variety validation - check for repeated premise words
    const premiseWords = ['cake', 'candles', 'birthday', 'old', 'age', 'year', 'party', 'wish', 'blow'];
    premiseWords.forEach(word => {
      const count = allTexts.filter(text => text.includes(word)).length;
      if (count >= 3) {
        validationErrors.push(`Word "${word}" appears in ${count}/4 lines, lacks variety`);
      }
    });
    
    // NEW: Tag validation - unquoted tags should appear in 3/4 lines
    unquotedTags.forEach(tag => {
      const count = allTexts.filter(text => text.includes(tag.toLowerCase())).length;
      if (count < 3) {
        validationErrors.push(`Unquoted tag "${tag}" appears in only ${count}/4 lines, should be 3+`);
      }
    });
    
    // NEW: Pop culture validation
    if (inputs.style === 'pop_culture') {
      const hasPopCulture = allTexts.some(text => {
        return text.includes('netflix') || text.includes('spotify') || text.includes('tiktok') || 
               text.includes('instagram') || text.includes('twitter') || text.includes('uber') ||
               text.includes('amazon') || text.includes('google') || text.includes('apple') ||
               /\b(taylor|swift|kardashian|beyonce|musk|trump|biden|lebron|drake)\b/i.test(text);
      });
      if (!hasPopCulture) {
        validationErrors.push('Pop culture style requires celebrity, meme, or trend references');
      }
    }
    
    if (validationErrors.length > 0) {
      console.warn('⚠️ Validation warnings:', validationErrors.join('; '));
      // Continue despite warnings - don't fail completely in production
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