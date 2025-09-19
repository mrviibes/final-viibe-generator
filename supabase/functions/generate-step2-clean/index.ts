import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Entity Management System for Pop Culture References
interface EntityPool {
  '1980s_2000s': string[];
  '2010s': string[];
  '2020s': string[];
}

const ENTITY_BUCKETS: EntityPool = {
  '1980s_2000s': [
    'Blockbuster', 'MySpace', 'AOL', 'New Coke', 'Beanie Babies', 
    'Tamagotchi', 'Napster', 'Dial-up internet', 'Nokia brick phones',
    'VHS vs Betamax', 'Y2K panic', 'Pogs', 'Geocities'
  ],
  '2010s': [
    'Game of Thrones finale', 'Fyre Festival', 'Vine', 'Fortnite dances',
    'John Wick', 'Tiger King', 'Avengers Endgame', 'Ice Bucket Challenge',
    'Pokémon GO', 'Fidget spinners', 'Snapchat filters', 'Netflix binge-watching'
  ],
  '2020s': [
    'Barbie movie', 'Oppenheimer', 'GTA VI delays', 'MrBeast videos',
    'UFC hype', 'TikTok trends', 'Threads launch', 'NFT crashes',
    'Zoom fatigue', 'Among Us', 'Wordle obsession', 'ChatGPT panic'
  ]
};

const PROTECTED_IDENTITY_TRAITS = [
  'race', 'ethnicity', 'gender', 'sexual orientation', 'religion', 
  'disability', 'mental health', 'physical appearance', 'body type',
  'age discrimination', 'nationality', 'accent', 'family structure'
];

// Enhanced Rule System
const GENERATION_RULES = {
  pop_culture: {
    cooldown_per_batch: 1,
    rolling_ban_last_n: 5,
    entity_repeat_in_batch: false
  },
  tags: {
    quoted_literal_in_text: true,
    hard_tags_required_in: 3,
    strict_enforcement: true
  },
  tone_overrides: {
    'Sentimental': {
      disable_force_funny: true,
      disable_rating_quotas: true,
      allow_clean_language: true,
      require_positive_or_supportive: true,
      hard_tags_required_in: 2
    },
    'Playful': {
      disable_force_funny: true,
      require_wordplay_or_silly: true,
      ban_repeated_entity: true,
      hard_tags_required_in: 3
    }
  }
};

// Grace Fallback Configuration
const GRACE_FALLBACK = {
  max_retry: 2,
  degrade_order: [
    { drop_pop_culture_cooldown: true },
    { disable_rating_quotas: true },
    { disable_force_funny: true }
  ],
  emit_anyway_after_degrade: true
};

let currentBatchEntity: string | null = null;
let recentlyUsed: string[] = [];
let batchEntityCount = 0;

function selectPopCultureEntity(allowMultiple = false): string | null {
  // Enforce one entity per batch rule unless explicitly allowing multiple
  if (!allowMultiple && batchEntityCount >= GENERATION_RULES.pop_culture.cooldown_per_batch) {
    return null;
  }
  
  const allEntities = [
    ...ENTITY_BUCKETS['1980s_2000s'],
    ...ENTITY_BUCKETS['2010s'], 
    ...ENTITY_BUCKETS['2020s']
  ];

  // Rolling ban implementation
  const maxBanLength = GENERATION_RULES.pop_culture.rolling_ban_last_n;
  const availableEntities = allEntities.filter(entity => 
    !recentlyUsed.slice(-maxBanLength).includes(entity)
  );

  if (availableEntities.length === 0) {
    // Reset rolling ban if we run out of options
    recentlyUsed = recentlyUsed.slice(-Math.floor(maxBanLength / 2));
    const resetAvailable = allEntities.filter(entity => 
      !recentlyUsed.includes(entity)
    );
    if (resetAvailable.length === 0) return null;
  }

  const finalPool = availableEntities.length > 0 ? availableEntities : 
    allEntities.filter(entity => !recentlyUsed.includes(entity));
  
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  
  // Track usage for batch and rolling ban
  currentBatchEntity = selected;
  batchEntityCount++;
  recentlyUsed.push(selected);
  
  // Maintain rolling ban size
  if (recentlyUsed.length > maxBanLength) {
    recentlyUsed = recentlyUsed.slice(-maxBanLength);
  }

  console.log('🎭 Selected entity:', selected, 'Batch count:', batchEntityCount);
  return selected;
}

function selectDifferentEntity(): string | null {
  const allEntities = [
    ...ENTITY_BUCKETS['1980s_2000s'],
    ...ENTITY_BUCKETS['2010s'], 
    ...ENTITY_BUCKETS['2020s']
  ];

  const availableEntities = allEntities.filter(entity => 
    entity !== currentBatchEntity && 
    !recentlyUsed.slice(-GENERATION_RULES.pop_culture.rolling_ban_last_n).includes(entity)
  );

  if (availableEntities.length === 0) return currentBatchEntity; // Fallback
  
  const selected = availableEntities[Math.floor(Math.random() * availableEntities.length)];
  recentlyUsed.push(selected);
  
  if (recentlyUsed.length > GENERATION_RULES.pop_culture.rolling_ban_last_n) {
    recentlyUsed = recentlyUsed.slice(-GENERATION_RULES.pop_culture.rolling_ban_last_n);
  }

  return selected;
}

function resetEntityBatch(): void {
  currentBatchEntity = null;
  batchEntityCount = 0;
}

function getIdentityProtectionRules(): string {
  return `CRITICAL IDENTITY PROTECTION RULES:
- NEVER target protected traits: ${PROTECTED_IDENTITY_TRAITS.join(', ')}
- Focus on ACTIONS, BEHAVIORS, EVENTS, BRANDS - not personal characteristics
- Target what people DO, not who they ARE
- Roast choices, moments, fails - never identity
- Use approved entities only: ${currentBatchEntity || 'none selected'}`;
}

function validateContentForIdentityViolations(text: string): string[] {
  const violations: string[] = [];
  const lowerText = text.toLowerCase();

  const identityViolations = PROTECTED_IDENTITY_TRAITS.filter(trait => {
    switch (trait) {
      case 'physical appearance':
        return /\b(ugly|fat|thin|short|tall|bald|hairy)\b/.test(lowerText);
      case 'age discrimination':
        return /\b(too old|too young|ancient|geriatric|child)\b/.test(lowerText);
      case 'gender':
        return /\b(like a man|like a woman|masculine|feminine|act like)\b/.test(lowerText);
      case 'mental health':
        return /\b(crazy|insane|psycho|mental|nuts|psychotic)\b/.test(lowerText);
      default:
        return lowerText.includes(trait);
    }
  });

  if (identityViolations.length > 0) {
    violations.push(`Protected identity targeting: ${identityViolations.join(', ')}`);
  }

  return violations;
}

function validateTagEnforcement(lines: any[], tags: string[], tone: string): string[] {
  const violations: string[] = [];
  
  if (!tags || tags.length === 0) return violations;
  
  const toneConfig = GENERATION_RULES.tone_overrides[tone];
  const requiredTagLines = toneConfig?.hard_tags_required_in || GENERATION_RULES.tags.hard_tags_required_in;
  
  let linesWithTags = 0;
  
  for (const line of lines) {
    const lineText = line.text.toLowerCase();
    const hasTag = tags.some(tag => lineText.includes(tag.toLowerCase()));
    if (hasTag) linesWithTags++;
  }
  
  if (GENERATION_RULES.tags.strict_enforcement && linesWithTags < requiredTagLines) {
    violations.push(`Tag enforcement failed: ${linesWithTags}/${lines.length} lines contain tags, required: ${requiredTagLines}`);
  }
  
  return violations;
}

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
  const { category, subcategory, tone, rating, tags } = inputs;
  
  // Check tone overrides
  const toneConfig = GENERATION_RULES.tone_overrides[tone as keyof typeof GENERATION_RULES.tone_overrides];
  const isSentimental = tone === 'Sentimental';
  const isPlayful = tone === 'Playful';
  
  // Pop culture entity management
  let popCultureEntity = null;
  let secondaryEntity = null;
  
  if (!isSentimental) {
    popCultureEntity = selectPopCultureEntity();
    
    // For Playful tone or when we need variety, get a different entity for variety
    if (isPlayful && toneConfig?.ban_repeated_entity && popCultureEntity) {
      secondaryEntity = selectDifferentEntity();
    }
  }
  
  // Build dynamic prompt based on tone
  let prompt = '';
  
  if (isSentimental) {
    prompt = `Generate exactly 4 heartfelt, supportive text lines for a ${category} - ${subcategory} meme.
    
Tone: ${tone} (positive, supportive, uplifting)
Tags to include: ${tags?.join(', ') || 'none'}
Length: 40-80 characters per line

Requirements:
- Each line should be warm and encouraging
- Include the provided tags naturally
- Focus on positive emotions and support
- Use simple, heartfelt language
- Make it about the moment, not attacking anyone

Output exactly 4 lines in this JSON format:
{
  "lines": [
    {"lane": "option1", "text": "Your first supportive line here"},
    {"lane": "option2", "text": "Your second supportive line here"}, 
    {"lane": "option3", "text": "Your third supportive line here"},
    {"lane": "option4", "text": "Your fourth supportive line here"}
  ]
}`;
  } else {
    // Standard comedy generation with enhanced controls
    const forceComedy = !toneConfig?.disable_force_funny;
    const requireRating = !toneConfig?.disable_rating_quotas;
    const requiredTagLines = toneConfig?.hard_tags_required_in || GENERATION_RULES.tags.hard_tags_required_in;
    const needsWordplay = toneConfig?.require_wordplay_or_silly;
    
    // Build entity references
    const entityRefs = [];
    if (popCultureEntity) entityRefs.push(popCultureEntity);
    if (secondaryEntity && secondaryEntity !== popCultureEntity) entityRefs.push(secondaryEntity);
    
    prompt = `Generate exactly 4 different ${tone.toLowerCase()} text lines for a ${category} - ${subcategory} meme.
    
Tone: ${tone}
Rating: ${rating || 'PG-13'}
Tags to include: ${tags?.join(', ') || 'none'}
Length: 40-80 characters per line
${entityRefs.length > 0 ? `Pop culture references: ${entityRefs.join(', ')} (use variety, don't repeat the same reference)` : ''}

CRITICAL REQUIREMENTS:
${forceComedy ? '- Must be funny and engaging' : needsWordplay ? '- Use wordplay, puns, or silly comparisons' : '- Should match the specified tone'}
${requireRating ? `- Must match ${rating || 'PG-13'} content rating` : '- Use appropriate language'}
- Include provided tags naturally in EXACTLY ${requiredTagLines} out of 4 lines (STRICT ENFORCEMENT)
- Each line must be completely different and unique
- Use DIFFERENT pop culture references if multiple are provided
- Focus on behaviors, actions, or situations - not personal traits
${isPlayful ? '- Prioritize wordplay and silly comparisons over harsh roasting' : ''}

${getIdentityProtectionRules()}

Output exactly 4 lines in this JSON format:
{
  "lines": [
    {"lane": "option1", "text": "Your first line here"},
    {"lane": "option2", "text": "Your second line here"}, 
    {"lane": "option3", "text": "Your third line here"},
    {"lane": "option4", "text": "Your fourth line here"}
  ]
}`;
  }

  console.log('📝 Prompt:', prompt);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 300,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      resetEntityBatch();
      console.error('OpenAI API Error:', response.status, response.statusText);
      throw new Error(`OpenAI API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      resetEntityBatch();
      throw new Error('No choices returned from OpenAI API');
    }

    const rawContent = data.choices[0].message.content.trim();
    
    try {
      const parsedContent = JSON.parse(rawContent);
      
      // Validate that we got lines in the expected format
      if (!parsedContent.lines || !Array.isArray(parsedContent.lines) || parsedContent.lines.length !== 4) {
        throw new Error('Invalid response format: expected 4 lines');
      }

      // Validate each line has required properties
      for (const line of parsedContent.lines) {
        if (!line.lane || !line.text) {
          throw new Error('Invalid line format: missing lane or text');
        }
      }

      // Check for identity violations (skip for sentimental)
      if (!isSentimental) {
        const allTexts = parsedContent.lines.map((l: any) => l.text).join(' ');
        const identityViolations = validateContentForIdentityViolations(allTexts);
        if (identityViolations.length > 0) {
          resetEntityBatch();
          throw new Error(`Identity violations: ${identityViolations.join(', ')}`);
        }
      }

      // Validate tag enforcement
      const tagViolations = validateTagEnforcement(parsedContent.lines, tags, tone);
      if (tagViolations.length > 0) {
        resetEntityBatch();
        throw new Error(`Tag enforcement failed: ${tagViolations.join(', ')}`);
      }

      resetEntityBatch();
      return {
        success: true,
        lines: parsedContent.lines,
        model: MODEL,
        validated: true,
        tone: tone,
        entityUsed: popCultureEntity || 'none',
        secondaryEntity: secondaryEntity || 'none',
        tagEnforcement: `${tags?.length || 0} tags, required in ${toneConfig?.hard_tags_required_in || GENERATION_RULES.tags.hard_tags_required_in} lines`
      };
    } catch (parseError) {
      resetEntityBatch();
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse:', rawContent);
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }

  } catch (apiError) {
    resetEntityBatch();
    console.error('Full API Error:', apiError);
    throw apiError;
  }
}

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

    // STRICT GPT-4.1 GENERATION WITH 3-RETRY REGENERATION
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🎯 Strict generation attempt ${attempt}/3`);
        const result = await generateWithGPT5(inputs);
        console.log('✅ GPT-4.1 SUCCESS:', result.model);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        lastError = error;
        console.warn(`❌ Attempt ${attempt}/3 failed:`, error.message);
        
        // If this is the last attempt, try graceful degradation
        if (attempt === 3) {
          console.log('🔄 Final attempt: trying graceful degradation');
          try {
            // Try with more lenient inputs for final attempt
            const gracefulInputs = {
              ...inputs,
              rating: inputs.rating || 'PG-13', // More flexible default
              tags: inputs.tags?.slice(0, 2) || [] // Limit tags for easier success
            };
            
            const result = await generateWithGPT5(gracefulInputs);
            console.log('✅ Graceful degradation SUCCESS');
            return new Response(JSON.stringify({
              ...result,
              gracefulMode: true,
              note: 'Generated with relaxed constraints'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (gracefulError) {
            console.error('❌ Even graceful degradation failed:', gracefulError.message);
            break;
          }
        }
        
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // All 3 attempts failed
    console.error('❌ FINAL FAIL: All 3 strict generation attempts failed');
    
    return new Response(JSON.stringify({
      error: `All 3 generation attempts failed: ${lastError?.message || 'Unknown error'}`,
      success: false,
      model: 'error',
      validated: false,
      requestedModel: MODEL,
      attempts: 3,
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Return 200 so client can read the error
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
