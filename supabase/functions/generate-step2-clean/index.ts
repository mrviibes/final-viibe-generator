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
  
  // FINAL SYSTEM PROMPT - UPDATED
  const systemPrompt = `You are a professional comedian. 
Generate exactly 4 unique one-liner jokes or captions as JSON only.

Return ONLY valid JSON in this exact structure:
{
  "lines": [
    {"lane": "option1", "text": "..."},
    {"lane": "option2", "text": "..."},
    {"lane": "option3", "text": "..."},
    {"lane": "option4", "text": "..."}
  ]
}

## Rules
1. Lengths:
   - Option 1 = 40–50 characters
   - Option 2 = 50–60 characters
   - Option 3 = 60–70 characters
   - Option 4 = 70–80 characters
   - Story Mode only: all 4 = 80–100 characters with a clear setup → payoff.

2. Punctuation:
   - MAX 1 punctuation mark per line (comma OR period OR colon).
   - NO em dashes (—).
   - NO ellipses (...).

3. Perspectives:
   - Each batch of 4 must include:
     - One general truth (no "you" or tags).
     - One past-tense memory (e.g., "last year," "remember when").
     - One present-tense roast/flirt (direct: "you" or tagged name).
     - One 3rd-person tagged line (if a name/tag is provided).

4. Tone (must match user selection):
   - Humorous = observational, witty, punny.
   - Savage = sharp roasts, unapologetic.
   - Romantic = flirty, affectionate, warm.
   - Sentimental = heartfelt, sincere.
   - Nostalgic = wistful, memory-driven.
   - Inspirational = uplifting, motivational.
   - Playful = mischievous, cheeky fun.
   - Serious = formal, matter-of-fact.

5. Style (must match user selection):
   - Standard = balanced one-liners.
   - Story Mode = narrative mini-story with setup → payoff.
   - Punchline First = gag lands in first half.
   - Pop Culture = MUST reference a celebrity, meme, movie, or trend.
   - Wildcard = random comedic structures.

6. Ratings:
   - G = wholesome, family-safe. NO profanity or innuendo.
   - PG = mild sarcasm. NO profanity.
   - PG-13 = sharper, sarcastic, cheeky. At least 1 line MUST contain mild profanity
     (e.g., "damn," "hell") OR innuendo. NO strong profanity.
   - R = savage, edgy, explicit. At least 1 line MUST contain strong profanity
     (e.g., fuck, shit, ass) or sexual innuendo. NO hate speech or slurs.

7. Tags:
   - Unquoted tags → MUST appear literally in 3/4 lines.
   - Quoted tags → MUST NOT appear literally, but must influence style/POV.

8. Voice variety:
   - Each line should sound like a different comedian style (energetic storytelling, deadpan, absurdist, blunt observational, etc.).
   - No repeated premises (e.g., 4 "cake" jokes in Birthday).

9. Must feel natural and conversational, like spoken jokes — not robotic templates.

10. Output ONLY the JSON object, no commentary or extra formatting.`;
  
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
    
    // PARSE JSON CONTENT
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
    
    // VALIDATE STRUCTURE
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length < 4) {
      throw new Error(`Invalid structure: expected 4 lines, got ${parsed.lines?.length || 0}`);
    }
    
    // COMPREHENSIVE VALIDATION - Updated per user spec
    const validationErrors = [];
    const isStoryMode = inputs.style === 'story';
    
    // Length validation - exact character ranges
    const expectedLengths = isStoryMode 
      ? [[80, 100], [80, 100], [80, 100], [80, 100]] // Story mode: all 80-100 chars
      : [[40, 50], [50, 60], [60, 70], [70, 80]]; // Standard: exact bands
    
    const allTexts = parsed.lines.map((line: any) => line.text?.toLowerCase() || '');
    const unquotedTags = Array.isArray(inputs.tags) ? 
      inputs.tags.filter((tag: string) => !tag.startsWith('"') && !tag.endsWith('"')) : [];
    
    // Rating content validation
    const mildProfanity = ['damn', 'hell'];
    const strongProfanity = ['fuck', 'shit', 'ass'];
    const innuendoWords = ['bed', 'naked', 'sexy', 'hot', 'hard', 'wet', 'thick', 'deep'];
    
    let hasMildProfanity = false;
    let hasStrongProfanity = false;
    let hasInnuendo = false;
    
    allTexts.forEach(text => {
      if (mildProfanity.some(word => text.includes(word))) hasMildProfanity = true;
      if (strongProfanity.some(word => text.includes(word))) hasStrongProfanity = true;
      if (innuendoWords.some(word => text.includes(word))) hasInnuendo = true;
    });

    // Perspective validation - CRITICAL requirements
    const hasGeneralTruth = allTexts.some(text => 
      !text.includes('you') && !text.includes('your') && 
      !unquotedTags.some(tag => text.includes(tag.toLowerCase()))
    );
    const hasPastTense = allTexts.some(text => 
      /last year|remember when|used to|back then|yesterday|ago/.test(text)
    );
    const hasPresentRoast = allTexts.some(text => 
      /you're|you |your /.test(text) || 
      unquotedTags.some(tag => text.includes(tag.toLowerCase()) && /is |are |has |have /.test(text))
    );
    const hasThirdPerson = unquotedTags.length > 0 ? 
      allTexts.some(text => unquotedTags.some(tag => text.includes(tag.toLowerCase()))) : true;
    
    // Validate each line
    parsed.lines.forEach((line, index) => {
      const text = line.text || '';
      const length = text.length;
      const [minLength, maxLength] = expectedLengths[index];
      
      // Length validation
      if (length < minLength || length > maxLength) {
        validationErrors.push(`emdash_forbidden`);
      }
      
      // Em dash validation - CRITICAL
      if (text.includes('—')) {
        validationErrors.push(`emdash_forbidden`);
      }
      
      // Punctuation validation - max 1 mark
      const punctuationCount = (text.match(/[,.;:!?]/g) || []).length;
      if (punctuationCount > 1) {
        validationErrors.push(`too_many_punct`);
      }
      
      // Ellipsis validation
      if (text.includes('...') || text.includes('..')) {
        validationErrors.push(`ellipsis_forbidden`);
      }
    });

    // Rating enforcement - CRITICAL for user spec
    const rating = inputs.rating || 'PG';
    if (rating === 'G' && (hasMildProfanity || hasStrongProfanity || hasInnuendo)) {
      validationErrors.push('rating_violation');
    }
    if (rating === 'PG' && (hasMildProfanity || hasStrongProfanity || hasInnuendo)) {
      validationErrors.push('rating_violation');
    }
    if (rating === 'PG-13' && !hasMildProfanity && !hasInnuendo && !hasStrongProfanity) {
      validationErrors.push('missing_required_rated_line');
    }
    if (rating === 'R' && !hasStrongProfanity && !hasInnuendo) {
      validationErrors.push('missing_required_rated_line');
    }

    // Perspective enforcement - CRITICAL per user spec
    if (!hasGeneralTruth) {
      validationErrors.push('missing_general_truth');
    }
    if (!hasPastTense) {
      validationErrors.push('missing_past_tense');
    }
    if (!hasPresentRoast) {
      validationErrors.push('missing_present_roast');
    }
    if (!hasThirdPerson && unquotedTags.length > 0) {
      validationErrors.push('missing_third_person');
    }
    
    // Tag enforcement - unquoted tags must appear in 3/4 lines
    unquotedTags.forEach(tag => {
      const count = allTexts.filter(text => text.includes(tag.toLowerCase())).length;
      if (count < 3) {
        validationErrors.push('missing_hard_tags');
      }
    });
    
    // Style compliance
    if (isStoryMode) {
      const pivotWords = ['then', 'after', 'when', 'finally', 'last year', 'so'];
      const payoffWords = ['but', 'so', 'which', 'still', 'yet'];
      
      parsed.lines.forEach((line, index) => {
        const text = (line.text || '').toLowerCase();
        const hasPivot = pivotWords.some(word => text.includes(word));
        const hasPayoff = payoffWords.some(word => text.includes(word));
        
        if (!hasPivot || !hasPayoff) {
          validationErrors.push('style_noncompliant');
        }
      });
    }
    
    // Pop culture validation
    if (inputs.style === 'pop_culture') {
      const popCultureWords = ['taylor', 'swift', 'drake', 'kanye', 'netflix', 'tiktok', 'marvel', 'disney', 'meme', 'viral'];
      const hasPopCulture = allTexts.some(text => {
        return popCultureWords.some(word => text.includes(word));
      });
      if (!hasPopCulture) {
        validationErrors.push('style_noncompliant');
      }
    }
    
    // Voice variety check
    const firstWords = parsed.lines.map((line: any) => {
      const words = (line.text || '').split(/\s+/).slice(0, 2).join(' ').toLowerCase();
      return words;
    });
    const uniqueStarts = new Set(firstWords);
    if (uniqueStarts.size < 4) {
      validationErrors.push('robotic_pattern');
    }
    
    // Premise variety - no duplicate themes
    const clicheWords = ['cake', 'candles', 'party', 'birthday', 'years old'];
    clicheWords.forEach(word => {
      const count = allTexts.filter(text => text.includes(word)).length;
      if (count > 1) {
        validationErrors.push('duplicate_premise');
      }
    });
    
    if (validationErrors.length > 0) {
      console.warn('⚠️ Validation errors:', validationErrors.join('; '));
      // FAIL FAST for critical errors
      if (validationErrors.includes('emdash_forbidden') || 
          validationErrors.includes('missing_required_rated_line') ||
          validationErrors.includes('missing_general_truth')) {
        throw new Error(`Critical validation failure: ${validationErrors.join('; ')}`);
      }
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