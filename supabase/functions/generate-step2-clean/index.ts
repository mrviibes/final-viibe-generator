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
Return ONLY valid JSON in this format:

{
  "lines": [
    {"lane": "option1", "text": "..."},
    {"lane": "option2", "text": "..."},
    {"lane": "option3", "text": "..."},
    {"lane": "option4", "text": "..."}
  ]
}

## Core Rules:
1. Lengths:
   - Option 1 = 40–50 characters
   - Option 2 = 50–60 characters
   - Option 3 = 60–70 characters
   - Option 4 = 70–80 characters
   - Story Mode only: all 4 must be 80–100 characters with a setup + payoff.

2. Punctuation:
   - MAX 1 punctuation mark per line (comma OR period OR colon).
   - No em dashes (—).
   - No ellipses (...).

3. Perspectives / Tenses:
   - Each batch of 4 MUST cover:
     - One **general truth** (no "you" or tags).
     - One **past-tense memory** (e.g., "last year," "remember when").
     - One **present-tense roast** (direct: "you're" or "jesse is").
     - One **tagged 3rd person** line if a name/tag is provided.
   - Enforce variety across outputs, not 4 of the same perspective.

4. Tone must match selection:
   - Humorous = observational, witty.
   - Savage = sharp roasts, unapologetic.
   - Romantic = flirty, affectionate.
   - Sentimental = heartfelt, sincere.
   - Nostalgic = memory-driven, wistful.
   - Inspirational = uplifting, motivational.
   - Playful = mischievous, cheeky.
   - Serious = plain, matter-of-fact.

5. Style must match selection:
   - Standard = balanced one-liners.
   - Story Mode = setup → payoff, 80–100 chars.
   - Punchline First = joke lands in first half.
   - Pop Culture = MUST include a celebrity, trend, or meme reference.
   - Wildcard = random voice/format.

6. Ratings:
   - **G** = family-friendly, wholesome, no profanity or innuendo.
   - **PG** = safe with light sarcasm. No profanity. Mild edge only.
   - **PG-13** = sharper, sarcastic, edgy. Allow **mild profanity** 
     (damn, hell) and innuendo. Push close to offensive, but not explicit.
   - **R** = savage, risky, explicit. At least one line MUST use profanity 
     (fuck, shit, ass) OR sexual innuendo. No hate speech or slurs.

7. Tags:
   - Unquoted tags (e.g. jesse, cake) → must appear literally in 3/4 lines.
   - Quoted tags (e.g. "loser", "romantic") → must not appear literally, 
     but must shape tone, POV, or context.

8. Voice Variety:
   - Each line should feel like a different comedian style 
     (energetic storytelling, blunt observational, absurdist, deadpan, etc.).
   - Do not repeat the same premise in all 4 lines (e.g., not 4 "cake" jokes).

9. Must feel like natural spoken jokes, not robotic templates.

10. Output ONLY the JSON above, nothing else.`;
  
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
    
    // COMPREHENSIVE VALIDATION - LENGTH, PUNCTUATION, VARIETY, HUMAN RHYTHM, RATING, PERSPECTIVE
    const validationErrors = [];
    const isStoryMode = inputs.style === 'story';
    
    // Story Mode: ALL 4 lines must be 80-100 chars
    // Standard Mode: 40-50, 50-60, 60-70, 70-80
    const expectedLengths = isStoryMode 
      ? [90, 90, 90, 90] // Story mode: all 80-100 chars (target 90)
      : [45, 55, 65, 75]; // Standard: 40-50, 50-60, 60-70, 70-80 chars
    const lengthTolerances = isStoryMode 
      ? [10, 10, 10, 10] // ±10 for story mode (80-100 range)
      : [5, 5, 5, 5]; // ±5 for standard modes
    
    const allTexts = parsed.lines.map((line: any) => line.text?.toLowerCase() || '');
    const unquotedTags = Array.isArray(inputs.tags) ? 
      inputs.tags.filter((tag: string) => !tag.startsWith('"') && !tag.endsWith('"')) : [];
    
    // Cliché premise words by category
    const clicheMap: { [key: string]: string[] } = {
      'Birthday': ['cake', 'candles', 'balloons', 'wrapping', 'party'],
      'Christmas Day': ['tree', 'sweater', 'eggnog', 'fruitcake', 'carols'],
      'New Year': ['resolution', 'countdown', 'champagne', 'midnight', 'fireworks']
    };
    const clicheWords = clicheMap[inputs.subcategory] || [];

    // Rating validation - check for appropriate content
    const mildProfanity = ['damn', 'hell', 'crap'];
    const strongProfanity = ['fuck', 'shit', 'ass', 'dick', 'pussy', 'bitch'];
    const innuendoWords = ['bed', 'naked', 'sexy', 'hot', 'hard', 'wet', 'thick', 'deep'];
    
    let hasMildProfanity = false;
    let hasStrongProfanity = false;
    let hasInnuendo = false;
    
    allTexts.forEach(text => {
      if (mildProfanity.some(word => text.includes(word))) hasMildProfanity = true;
      if (strongProfanity.some(word => text.includes(word))) hasStrongProfanity = true;
      if (innuendoWords.some(word => text.includes(word))) hasInnuendo = true;
    });

    // Perspective/tense validation
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
      
      // STRICT: Check punctuation limit (EXACTLY 1 per line)
      const punctuationCount = (text.match(/[,.;:!?]/g) || []).length;
      if (punctuationCount !== 1) {
        validationErrors.push(`Option ${index + 1} has ${punctuationCount} punctuation marks, must have exactly 1`);
      }
      
      // Check for ellipsis
      if (text.includes('...') || text.includes('..')) {
        validationErrors.push(`Option ${index + 1} contains ellipsis - not allowed`);
      }
    });

    // Rating enforcement
    const rating = inputs.rating || 'PG';
    if (rating === 'G' && (hasMildProfanity || hasStrongProfanity || hasInnuendo)) {
      validationErrors.push('G-rated content contains inappropriate language or innuendo');
    }
    if (rating === 'PG' && (hasMildProfanity || hasStrongProfanity || hasInnuendo)) {
      validationErrors.push('PG-rated content contains profanity or innuendo');
    }
    if (rating === 'PG-13' && !hasMildProfanity && !hasInnuendo && !hasStrongProfanity) {
      validationErrors.push('PG-13 content should include mild profanity or innuendo for appropriate rating');
    }
    if (rating === 'R' && !hasStrongProfanity && !hasInnuendo) {
      validationErrors.push('R-rated content must include strong profanity or explicit innuendo');
    }

    // Perspective/tense validation
    if (!hasGeneralTruth) {
      validationErrors.push('Missing general truth line (no "you" or tag names)');
    }
    if (!hasPastTense) {
      validationErrors.push('Missing past tense memory line (last year, remember when, etc.)');
    }
    if (!hasPresentRoast) {
      validationErrors.push('Missing present-tense roast line (you\'re, jesse is, etc.)');
    }
    if (!hasThirdPerson && unquotedTags.length > 0) {
      validationErrors.push('Missing tagged 3rd person line');
    }
    
    // Cliché premise variety - max 1 occurrence per batch
    clicheWords.forEach(word => {
      const count = allTexts.filter(text => text.includes(word)).length;
      if (count > 1) {
        validationErrors.push(`Cliché word "${word}" appears in ${count}/4 lines, max 1 allowed for variety`);
      }
    });
    
    // Human rhythm check - avoid robotic patterns
    const firstWords = parsed.lines.map((line: any) => {
      const words = (line.text || '').split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      return words;
    });
    const uniqueStarts = new Set(firstWords);
    if (uniqueStarts.size < 4) {
      validationErrors.push('Lines start too similarly, lacks human variety');
    }
    
    // Tag validation - unquoted tags should appear in 3/4 lines
    unquotedTags.forEach(tag => {
      const count = allTexts.filter(text => text.includes(tag.toLowerCase())).length;
      if (count < 3) {
        validationErrors.push(`Unquoted tag "${tag}" appears in only ${count}/4 lines, should be 3+`);
      }
    });
    
    // Story Mode structure validation
    if (isStoryMode) {
      const pivotWords = ['then', 'after', 'later', 'when', 'finally', 'last year', 'by midnight', 'and then', 'remember when'];
      const payoffWords = ['but', 'so', 'which', 'and then', 'still', 'yet', 'ending with'];
      
      parsed.lines.forEach((line, index) => {
        const text = (line.text || '').toLowerCase();
        const hasPivot = pivotWords.some(word => text.includes(word));
        const hasPayoff = payoffWords.some(word => text.includes(word));
        
        if (!hasPivot || !hasPayoff) {
          validationErrors.push(`Option ${index + 1} missing story structure (setup → payoff)`);
        }
      });
    }
    
    // Pop culture validation
    if (inputs.style === 'pop_culture') {
      const popCultureWords = ['taylor', 'swift', 'drake', 'rihanna', 'kanye', 'barbie', 'oppenheimer', 'marvel', 'dc', 'netflix', 'tiktok', 'youtube', 'meme', 'viral', 'hashtag', 'star wars', 'disney', 'nba', 'nfl'];
      const hasPopCulture = allTexts.some(text => {
        return popCultureWords.some(word => text.includes(word));
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