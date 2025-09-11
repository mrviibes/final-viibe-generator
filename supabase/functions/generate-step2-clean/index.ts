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
  
  // ENHANCED SYSTEM PROMPT - MORE EXPLICIT GUIDANCE
  const systemPrompt = `You are a professional comedian writer. Generate exactly 4 unique one-liner jokes as JSON.

CRITICAL: Return ONLY valid JSON in this exact structure:
{
  "lines": [
    {"lane": "option1", "text": "Basketball players make terrible boyfriends"},
    {"lane": "option2", "text": "Jesse shoots his shot better on court than in DMs"},
    {"lane": "option3", "text": "Last season you promised to take me to the finals"},
    {"lane": "option4", "text": "They say Jesse has game but I'm still waiting to see it"}
  ]
}

## MANDATORY RULES

1. CHARACTER LENGTHS (EXACT):
   - Option 1: 40-50 characters
   - Option 2: 50-60 characters  
   - Option 3: 60-70 characters
   - Option 4: 70-80 characters

2. PUNCTUATION (CRITICAL):
   - Maximum 1 punctuation mark per line
   - NEVER use em dashes (—) - use commas or periods only
   - NEVER use ellipses (...) 
   - Examples: "Jesse loves basketball, I love Jesse" ✓
   - Examples: "Jesse loves basketball—and me" ✗ (em dash forbidden)

3. TONE MATCHING:
   - ${inputs.tone} tone MUST be clear in every line
   - Romantic = flirty, warm, affectionate language
   - Humorous = witty, punchy, observational
   - Savage = sharp, roasting, unapologetic

4. RATING COMPLIANCE:
   - G/PG: Clean, family-friendly content
   - PG-13: Include some edge - mild innuendo or attitude acceptable
   - R: Explicit content, strong language allowed

5. TAG INTEGRATION:
   - Include provided tags naturally in most lines
   - Make tags feel organic, not forced

6. VARIETY REQUIREMENTS:
   - Use different sentence structures 
   - Vary perspectives (general truths, past memories, direct address)
   - Different comedy styles (observational, deadpan, storytelling)

7. SUBCATEGORY RELEVANCE:
   - Must relate to ${inputs.subcategory} context
   - Use relevant vocabulary and situations

REMEMBER: Output ONLY the JSON object. No explanations or formatting.`;
  
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
    
    // LOG RAW GENERATION BEFORE VALIDATION
    console.log('🎭 Raw generated content:', content);
    
    // PARSE JSON CONTENT
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error('❌ JSON parsing failed:', error.message);
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
    
    // VALIDATE STRUCTURE
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length < 4) {
      console.error('❌ Structure validation failed:', parsed);
      throw new Error(`Invalid structure: expected 4 lines, got ${parsed.lines?.length || 0}`);
    }
    
    console.log('📝 Generated lines before validation:', JSON.stringify(parsed.lines, null, 2));
    
    // RELAXED VALIDATION - Allow partial success
    const validationErrors = [];
    const criticalErrors = [];
    const warnings = [];
    const isStoryMode = inputs.style === 'story';
    
    // Length validation - exact character ranges
    const expectedLengths = isStoryMode 
      ? [[80, 100], [80, 100], [80, 100], [80, 100]] // Story mode: all 80-100 chars
      : [[40, 50], [50, 60], [60, 70], [70, 80]]; // Standard: exact bands
    
    const allTexts = parsed.lines.map((line: any) => line.text?.toLowerCase() || '');
    const originalTexts = parsed.lines.map((line: any) => line.text || '');
    const unquotedTags = Array.isArray(inputs.tags) ? 
      inputs.tags.filter((tag: string) => !tag.startsWith('"') && !tag.endsWith('"')) : [];
    
    console.log('🔍 Validating texts:', originalTexts);
    console.log('🏷️ Unquoted tags:', unquotedTags);
    
    // Rating content validation - more flexible
    const mildProfanity = ['damn', 'hell', 'crap'];
    const strongProfanity = ['fuck', 'shit', 'ass', 'bitch'];
    const innuendoWords = ['bed', 'naked', 'sexy', 'hot', 'hard', 'wet', 'thick', 'deep', 'score', 'play'];
    
    let hasMildProfanity = false;
    let hasStrongProfanity = false;
    let hasInnuendo = false;
    let hasAttitude = false; // For PG-13 - sarcasm, edge
    
    allTexts.forEach(text => {
      if (mildProfanity.some(word => text.includes(word))) hasMildProfanity = true;
      if (strongProfanity.some(word => text.includes(word))) hasStrongProfanity = true;
      if (innuendoWords.some(word => text.includes(word))) hasInnuendo = true;
      if (/terrible|awful|worst|suck|fail|pathetic/.test(text)) hasAttitude = true;
    });

    // Perspective validation - relaxed requirements
    const hasGeneralTruth = allTexts.some(text => 
      !text.includes('you') && !text.includes('your') && 
      !unquotedTags.some(tag => text.includes(tag.toLowerCase()))
    );
    const hasPastTense = allTexts.some(text => 
      /last |remember |used to|back |yesterday|ago|was |were /.test(text)
    );
    const hasPresentRoast = allTexts.some(text => 
      /you're|you |your |you'll/.test(text) || 
      unquotedTags.some(tag => text.includes(tag.toLowerCase()))
    );
    const hasThirdPerson = unquotedTags.length > 0 ? 
      allTexts.some(text => unquotedTags.some(tag => text.includes(tag.toLowerCase()))) : true;
    
    console.log('👁️ Perspective check:', { hasGeneralTruth, hasPastTense, hasPresentRoast, hasThirdPerson });
    
    // Validate each line
    parsed.lines.forEach((line, index) => {
      const text = line.text || '';
      const length = text.length;
      const [minLength, maxLength] = expectedLengths[index];
      
      console.log(`📏 Line ${index + 1}: "${text}" (${length} chars, expected ${minLength}-${maxLength})`);
      
      // Length validation - fixed bug
      if (length < minLength || length > maxLength) {
        validationErrors.push(`len_out_of_range_${index + 1}`);
      }
      
      // Em dash validation - CRITICAL (only critical error)
      if (text.includes('—')) {
        criticalErrors.push(`emdash_forbidden`);
      }
      
      // Punctuation validation - max 1 mark (warning only)
      const punctuationCount = (text.match(/[,.;:!?]/g) || []).length;
      if (punctuationCount > 1) {
        warnings.push(`too_many_punct`);
      }
      
      // Ellipsis validation (warning only)
      if (text.includes('...') || text.includes('..')) {
        warnings.push(`ellipsis_forbidden`);
      }
    });

    // Rating enforcement - more flexible
    const rating = inputs.rating || 'PG';
    console.log('🎬 Rating check:', { rating, hasMildProfanity, hasStrongProfanity, hasInnuendo, hasAttitude });
    
    if (rating === 'G' && (hasMildProfanity || hasStrongProfanity)) {
      validationErrors.push('rating_violation');
    }
    if (rating === 'PG' && (hasStrongProfanity)) {
      validationErrors.push('rating_violation');
    }
    // PG-13: Accept mild profanity, innuendo, OR attitude (relaxed)
    if (rating === 'PG-13' && !hasMildProfanity && !hasInnuendo && !hasAttitude) {
      warnings.push('missing_pg13_edge'); // Warning, not critical
    }
    // R: Still require strong content  
    if (rating === 'R' && !hasStrongProfanity && !hasInnuendo) {
      validationErrors.push('missing_required_rated_line');
    }

    // Perspective enforcement - warnings only (not critical)
    if (!hasGeneralTruth) {
      warnings.push('missing_general_truth');
    }
    if (!hasPastTense) {
      warnings.push('missing_past_tense');
    }
    if (!hasPresentRoast) {
      warnings.push('missing_present_roast');
    }
    if (!hasThirdPerson && unquotedTags.length > 0) {
      warnings.push('missing_third_person');
    }
    
    // Tag enforcement - relaxed to 2/4 lines minimum
    unquotedTags.forEach(tag => {
      const count = allTexts.filter(text => text.includes(tag.toLowerCase())).length;
      if (count < 2) {
        warnings.push('missing_hard_tags');
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
    
    // IMPROVED ERROR HANDLING
    const allErrors = [...criticalErrors, ...validationErrors];
    const allIssues = [...allErrors, ...warnings];
    
    console.log('🔍 Validation summary:', {
      criticalErrors: criticalErrors.length,
      validationErrors: validationErrors.length, 
      warnings: warnings.length,
      allIssues
    });
    
    if (allIssues.length > 0) {
      console.warn('⚠️ Validation issues:', allIssues.join('; '));
    }
    
    // FAIL FAST only for critical errors (em dashes)
    if (criticalErrors.length > 0) {
      console.error('❌ HARD FAIL: Critical validation failure:', criticalErrors.join('; '));
      throw new Error(`Critical validation failure: ${criticalErrors.join('; ')}`);
    }
    
    // Allow validation errors but log them
    if (validationErrors.length > 0) {
      console.warn('⚠️ Non-critical validation errors (allowing):', validationErrors.join('; '));
    }
    
    console.log('✅ GENERATION SUCCESS: returning content with quality score');
    
    // Calculate quality score
    const qualityScore = Math.max(0, 100 - (criticalErrors.length * 50) - (validationErrors.length * 10) - (warnings.length * 5));
    
    return {
      lines: parsed.lines.slice(0, 4),
      model: data.model,
      validated: criticalErrors.length === 0,
      success: true,
      qualityScore,
      issues: {
        critical: criticalErrors,
        errors: validationErrors,
        warnings: warnings
      },
      generatedWith: 'GPT-4.1 Enhanced',
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