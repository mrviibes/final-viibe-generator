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

let currentBatchEntity: string | null = null;
let recentlyUsed: string[] = [];

function selectPopCultureEntity(): string | null {
  if (currentBatchEntity) return null; // One per batch max
  
  const allEntities = [
    ...ENTITY_BUCKETS['1980s_2000s'],
    ...ENTITY_BUCKETS['2010s'], 
    ...ENTITY_BUCKETS['2020s']
  ];

  const availableEntities = allEntities.filter(entity => 
    !recentlyUsed.includes(entity)
  );

  if (availableEntities.length === 0) {
    recentlyUsed = recentlyUsed.slice(-5);
    const resetAvailable = allEntities.filter(entity => 
      !recentlyUsed.includes(entity)
    );
    if (resetAvailable.length === 0) return null;
  }

  const finalPool = availableEntities.length > 0 ? availableEntities : 
    allEntities.filter(entity => !recentlyUsed.includes(entity));
  
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  currentBatchEntity = selected;
  recentlyUsed.push(selected);
  
  if (recentlyUsed.length > 5) {
    recentlyUsed = recentlyUsed.slice(-5);
  }

  return selected;
}

function resetEntityBatch(): void {
  currentBatchEntity = null;
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
  const { category, subcategory, tone, rating, tags, wordLimit } = inputs;

  const popCultureEntity = selectPopCultureEntity();
  const identityRules = getIdentityProtectionRules();

  const prompt = `
  You are the ultimate creative comedy writer. Your goal is to generate edgy, hilarious, and viral-worthy content based on user inputs. You MUST follow all rules.

  Category: ${category}
  Subcategory: ${subcategory}
  Overall Tone: ${tone}
  Content Rating: ${rating || 'PG-13'}
  Keywords/Tags: ${tags?.join(', ') || 'none'}
  Word Limit: ${wordLimit || '25'} words

  ADDITIONAL CONTEXT:
  - Incorporate current pop culture trends and references to maximize shareability.
  - Use slang, abbreviations, and internet humor where appropriate to appeal to a younger audience.
  - Be concise and to-the-point; every word counts.
  - Inject unexpected twists and dark humor to stand out.
  - Use emojis sparingly but effectively to enhance the message.
  - Include a relevant and funny image prompt for DALL-E 3 to generate a visual.

  MANDATORY RULES:
  - The content MUST be extremely edgy and funny.
  - The content MUST be short, attention-grabbing, and optimized for social media.
  - The content MUST include a DALL-E 3 image prompt.
  - The content MUST be appropriate for the specified content rating.
  - The content MUST incorporate the specified keywords/tags.
  - The content MUST be within the specified word limit.
  - The content MUST follow all identity protection rules.
  - The content MUST use the specified tone.
  - The content MUST be in the specified category and subcategory.
  - The content MUST incorporate a pop culture reference.

  ${identityRules}

  OUTPUT FORMAT:
  {
    "content": "Your generated content here",
    "imagePrompt": "DALL-E 3 image prompt here",
    "identityViolations": ["list any violations here"],
    "entityUsed": "the pop culture entity used"
  }
  `;

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
        max_completion_tokens: 250,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      resetEntityBatch();
      console.error('OpenAI API Error:', response.status, response.statusText);
      throw new Error(`OpenAI API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🤖 Raw OpenAI Response:', JSON.stringify(data, null, 2));

    if (!data.choices || data.choices.length === 0) {
      resetEntityBatch();
      throw new Error('No choices returned from OpenAI API');
    }

    const rawContent = data.choices[0].message.content.trim();
    console.log('Raw Content:', rawContent);

    try {
      const parsedContent = JSON.parse(rawContent);
      console.log('Parsed Content:', parsedContent);

      const identityViolations = validateContentForIdentityViolations(parsedContent.content);
      if (identityViolations.length > 0) {
        resetEntityBatch();
        console.warn('Identity Violations:', identityViolations);
        return {
          error: `Identity violations found: ${identityViolations.join(', ')}`,
          success: false,
          model: MODEL,
          validated: false,
          identityViolations,
          entityUsed: popCultureEntity || 'none'
        };
      }

      resetEntityBatch();
      return {
        ...parsedContent,
        success: true,
        model: MODEL,
        validated: true,
        identityViolations: [],
        entityUsed: popCultureEntity || 'none'
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
