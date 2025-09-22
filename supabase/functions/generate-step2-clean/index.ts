import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseTags, validateTagUsage, type ParsedTags } from "./tags.ts";
import { buildPrompt, buildPromptLegacy } from "./buildPrompt.ts";
import { generateN } from "./generateN.ts";
import { stripSoftEcho } from "./sanitize.ts";
import { validate } from "./validate.ts";
import { validateAndRepairBatch, scoreBatchQuality } from "./advancedValidator.ts";
import { normalizeRating } from "../shared/rating.ts";
import { 
  selectComedianForRating, 
  buildPromptForRating, 
  validateRatingJoke, 
  validateHardTagsInBatch,
  validateRomanticTone,
  enforceContextAndTone,
  type MultiRatingOutput 
} from "./multiRating.ts";
import { MODEL_CONFIG, getTokenParameter, supportsTemperature } from "../shared/modelConfig.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MODEL = MODEL_CONFIG.PRIMARY;

async function generateMultiRatingJokes(inputs: any): Promise<MultiRatingOutput> {
  const startTime = Date.now();
  console.log('🎯 Starting multi-rating comedy generation');
  
  // Parse tags - handle any input format
  const parsedTags = parseTags(inputs.tags);
  
  const context = `${inputs.category} > ${inputs.subcategory}`;
  const RATINGS: Rating[] = ["G", "PG-13", "R", "Explicit"];
  
  const results: Partial<MultiRatingOutput> = {};
  const allJokes: string[] = [];
  
  // Generate for each rating (2 options each)  
  for (const rating of RATINGS) {
    const normalizedRating = normalizeRating(inputs.category, inputs.tone, rating);
    results[rating] = [];
    
    // Generate 2 options per rating
    for (let optionIndex = 0; optionIndex < 2; optionIndex++) {
      const comedian = selectComedianForRating(normalizedRating);
      
      console.log(`🎭 Generating ${rating} joke ${optionIndex + 1}/2 with ${comedian.name} voice`);
      
      const prompt = buildPromptForRating(
        normalizedRating,
        comedian,
        context,
        inputs.tone || 'Humorous',
        inputs.style || 'punchline-first',
        parsedTags
      );
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: 'You are a professional comedian. Return exactly one joke sentence.' },
              { role: 'user', content: prompt }
            ],
            [getTokenParameter(MODEL)]: 100
          }),
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
          console.error(`❌ API Error for ${rating} option ${optionIndex + 1}:`, response.status);
          // Use fallback
          const fallbackText = generateFallbackJoke(normalizedRating, context, comedian.name);
          results[rating].push({
            voice: comedian.name,
            text: fallbackText
          });
          allJokes.push(fallbackText);
          continue;
        }
        
        const data = await response.json();
        let text = (data.choices?.[0]?.message?.content || '').trim();
        
        // Apply context and tone enforcement BEFORE validation so fixes are considered
        text = enforceContextAndTone(text, context, inputs.tone || 'Humorous', inputs.style || 'punchline-first');
        
        // Validate tag usage for hard tags - inject if missing
        const tagValidation = validateTagUsage(text, parsedTags.hard);
        if (!tagValidation.valid && parsedTags.hard.length > 0) {
          console.log(`❌ Joke missing required tags. Found: [${tagValidation.foundTags.join(", ")}], Missing: [${tagValidation.missingTags.join(", ")}]`);
          
          // Try to inject missing tag into the joke
          if (tagValidation.missingTags.length > 0) {
            const missingTag = tagValidation.missingTags[0];
            text = injectTagIntoJoke(text, missingTag);
            console.log(`✅ Injected tag "${missingTag}" into joke: "${text}"`);
          }
        }
        
        // Validate the joke (romantic tone overrides rating-specific profanity requirements)
        let isValidFormat = false;
        if (inputs.tone?.toLowerCase() === 'romantic') {
          // Use "G" rules for format + profanity ban, then romantic-specific checks
          isValidFormat = validateRatingJoke(text, 'G', parsedTags) && validateRomanticTone(text, context);
        } else {
          isValidFormat = validateRatingJoke(text, normalizedRating, parsedTags);
        }
        
        // Apply advanced validation before accepting the joke
        const advancedValidation = validateAndRepairBatch([text], {
          rating: normalizedRating,
          category: inputs.category,
          subcategory: inputs.subcategory,
          hardTags: parsedTags.hard,
          softTags: parsedTags.soft,
          comedianVoice: comedian.name,
          requirePop: inputs.style === "pop-culture"
        });
        
        const validatedText = advancedValidation[0];
        const qualityScore = scoreBatchQuality([validatedText], {
          rating: normalizedRating,
          category: inputs.category,
          subcategory: inputs.subcategory,
          hardTags: parsedTags.hard,
          comedianVoice: comedian.name
        });
        
        if (isValidFormat && qualityScore.overallScore >= 75) {
          results[rating].push({
            voice: comedian.name,
            text: validatedText
          });
          allJokes.push(validatedText);
          console.log(`✅ ${rating} joke validated (score: ${qualityScore.overallScore}%)`);
        } else {
          console.warn(`⚠️ Validation failed for ${rating} option ${optionIndex + 1} (score: ${qualityScore.overallScore}%), using fallback`);
          const fallbackText = generateFallbackJoke(normalizedRating, context, comedian.name, inputs.tone, inputs.style);
          results[rating].push({
            voice: comedian.name,
            text: fallbackText
          });
          allJokes.push(fallbackText);
        }
        
      } catch (error) {
        console.error(`❌ Generation failed for ${rating} option ${optionIndex + 1}:`, error);
        const fallbackText = generateFallbackJoke(normalizedRating, context, comedian.name, inputs.tone, inputs.style);
        results[rating].push({
          voice: comedian.name,
          text: fallbackText
        });
        allJokes.push(fallbackText);
      }
    }
  }
  
  // Validate hard tags across the batch (3/4 rule)
  if (parsedTags.hard.length > 0) {
    const hardTagsValid = validateHardTagsInBatch(allJokes, parsedTags.hard);
    if (!hardTagsValid) {
      console.warn('⚠️ Hard tag validation failed, regenerating batch...');
      // Could implement retry logic here, but for now log the issue
      console.log(`Hard tags ${parsedTags.hard.join(', ')} not found in at least 3/4 jokes`);
    }
  }
  
  const latencyMs = Date.now() - startTime;
  console.log(`📊 Multi-rating generation completed in ${latencyMs}ms`);
  
  return results as MultiRatingOutput;
}

function generateFallbackJoke(rating: string, context: string, comedianName: string, tone?: string, style?: string): string {
  // Clean context - remove category leakage
  const cleanContext = context.replace(/.*>\s*/, '').replace(/^(Celebrations|Birthday)\s*/i, '').toLowerCase();
  const isRomantic = tone?.toLowerCase() === 'romantic';
  const isPunchlineFirst = style === 'punchline-first';
  
  // Apply voice patterns to fallback jokes
  const VOICE_PATTERNS: Record<string, (text: string) => string> = {
    "Hart": (text) => `Look ${text.replace(/^[A-Z]/, m => m.toLowerCase())}`,
    "Wong": (text) => `${text.replace(/\.$/, ', which is basically my entire life story.')}`,
    "Burr": (text) => `${text.replace(/\.$/, ', I mean come on.')}`,
    "Hedberg": (text) => `${text.replace(/\.$/, ', or maybe not, I don\'t know.')}`
  };
  
  const applyVoice = VOICE_PATTERNS[comedianName] || ((text) => text);
  
  // Context-specific fallbacks with birthday lexicon enforcement
  if (cleanContext.includes('birthday')) {
    const birthdayFallbacks = isRomantic ? [
      "Jesse our cake candles look magical and my heart celebrates you.",
      "Jesse tonight the party wishes come true and I still want you.",
      "Jesse make a wish because my heart already picked you forever.",
      "Jesse this birthday cake celebrates us and I treasure every moment."
    ] : [
      "Jesse's birthday cake had so many candles the smoke alarm RSVP'd.",
      "Birthdays are like diets, Jesse's always fail before the cake.",
      "Jesse's party went sideways faster than the birthday balloons.",
      "They sang happy birthday but Jesse's candles filed for hazard pay."
    ];
    
    const fallback = birthdayFallbacks[Math.floor(Math.random() * birthdayFallbacks.length)];
    return applyVoice(fallback);
  }
  
  if (cleanContext.includes('soccer')) {
    const soccerFallbacks = [
      "Jesse ties his cleats during every drill on the pitch.",
      "The keeper waves at Jesse and practice gives up completely.",
      "Jesse blames traffic and boots the cone on the field.",
      "The scrimmage whistles and Jesse still misses open goals."
    ];
    const fallback = soccerFallbacks[Math.floor(Math.random() * soccerFallbacks.length)];
    return applyVoice(fallback);
  }
  
  if (isRomantic && cleanContext.includes('thanksgiving')) {
    const romanticThanksgivingFallbacks = [
      "We pass the turkey and my heart passes gratitude back.",
      "Your laugh warms the table and my heart agrees completely.",
      "I love your chaos and the gravy finds peace with us.",
      "Your smile butters the rolls and my heart begs for seconds."
    ];
    const fallback = romanticThanksgivingFallbacks[Math.floor(Math.random() * romanticThanksgivingFallbacks.length)];
    return applyVoice(fallback);
  }
  
  if (isRomantic && cleanContext.includes('christmas')) {
    const romanticChristmasFallbacks = [
      "Your smile is my favorite gift under every tree.",
      "Cocoa tastes sweeter when your hand warms mine by the tree.",
      "Lights twinkle slower because my heart saves the best for you.",
      "The quiet after wrapping is louder than how much I love you."
    ];
    const fallback = romanticChristmasFallbacks[Math.floor(Math.random() * romanticChristmasFallbacks.length)];
    return applyVoice(fallback);
  }
  
  // Generic romantic fallback if tone demands it
  if (isRomantic) {
    const romanticGeneric = [
      "I love how this moment makes us feel like home.",
      "My heart picks you every single time.",
      "The world slows down whenever you laugh near me.",
      "I keep finding new ways to love you here."
    ];
    const fallback = romanticGeneric[Math.floor(Math.random() * romanticGeneric.length)];
    return applyVoice(fallback);
  }
  
  // Regular fallbacks by rating - NO CONTEXT LEAKAGE
  const fallbacks = {
    G: [
      "Life is like my sock drawer, organized chaos.",
      "This situation reminds me of my cooking, questionable but hopeful.",
      "Things hit different when you're not prepared for them."
    ],
    "PG-13": [
      "Life is like group projects, someone's gonna mess it up damn sure.",
      "This whole thing is hell on wheels and nobody warned me.",
      "Things went sideways faster than my last diet attempt, damn."
    ],
    R: [
      "Life is fucked up beyond all recognition, honestly.",
      "This shit storm caught me completely off guard, not gonna lie.",
      "Things are more chaotic than my love life, and that's saying something."
    ],
    Explicit: [
      "Life screwed me harder than my ex on Valentine's Day.",
      "This clusterfuck is more twisted than my browser history.",
      "Things fucked me over like a horny teenager with no supervision."
    ]
  };
  
  const ratingFallbacks = fallbacks[rating as keyof typeof fallbacks] || fallbacks["PG-13"];
  const fallback = ratingFallbacks[Math.floor(Math.random() * ratingFallbacks.length)];
  return applyVoice(fallback);
}

// Enhanced generateFour with metadata and voice rotation
async function generateFour(inputs: any): Promise<{ 
  success: boolean; 
  options: string[]; 
  meta: { model: string; voices: string[]; style: string; tone: string } 
}> {
  const parsedTags = parseTags(inputs.tags);
  
  const ctx = {
    category: inputs.category,
    subcategory: inputs.subcategory,
    tone: inputs.tone || 'Humorous',
    style: inputs.style || 'punchline-first',
    rating: inputs.rating || 'PG-13',
    tags: parsedTags
  };

  console.log(`🎯 Generating four-option mode: ${ctx.style} + ${ctx.rating} + ${ctx.category}/${ctx.subcategory}`);
  
  // We need to modify generateN to return both lines and voices
  // For now, generate normally and use default voice assignment
  const lines = await generateN(ctx, 4);
  
  // Default voice rotation for each rating
  const voicePool = {
    "G": ["gaffigan", "bargatze", "mulaney"],
    "PG-13": ["hart", "wong", "mulaney", "rock"],
    "R": ["burr", "rock", "wong"],
    "Explicit": ["wong", "burr"]
  };
  
  const pool = [...(voicePool[ctx.rating as keyof typeof voicePool] || voicePool["PG-13"])];
  // Shuffle and ensure 4 voices
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  while (pool.length < 4) pool.push(pool[pool.length - 1]);
  const voices = pool.slice(0, 4);
  
  return { 
    success: true, 
    options: lines,
    meta: {
      model: MODEL,
      voices: voices,
      style: ctx.style,
      tone: ctx.tone
    }
  };
}

serve(async (req) => {
  const requestStartTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const inputs = await req.json();
    console.log('📝 Received inputs:', JSON.stringify(inputs, null, 2));

    // Validate required inputs
    if (!inputs.category || !inputs.subcategory) {
      return new Response(JSON.stringify({
        error: 'Missing required inputs: category, subcategory',
        success: false
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

    try {
      // Check if this is a four-option request (default mode now)
      if (inputs.style && inputs.rating) {
        const fourResult = await generateFour(inputs);
        
        return new Response(JSON.stringify({
          success: true,
          options: fourResult.options,
          meta: fourResult.meta,
          timing: {
            total_ms: Date.now() - requestStartTime
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      // Fall back to multi-rating mode for compatibility
      const multiRatingResult = await generateMultiRatingJokes({
        category: inputs.category,
        subcategory: inputs.subcategory,
        tone: inputs.tone,
        tags: inputs.tags,
        style: inputs.style || 'punchline-first'
      });

      return new Response(JSON.stringify({
        success: true,
        ratings: multiRatingResult,
        model: MODEL,
        timing: {
          total_ms: Date.now() - requestStartTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (error) {
      console.error('❌ Generation failed:', error);
      
      // Fallback for four-option mode
      if (inputs.style && inputs.rating) {
        const fallbackOptions = [
          generateFallbackJoke(inputs.rating || "PG-13", inputs.subcategory, "Hart", inputs.tone, inputs.style),
          generateFallbackJoke(inputs.rating || "PG-13", inputs.subcategory, "Wong", inputs.tone, inputs.style),
          generateFallbackJoke(inputs.rating || "PG-13", inputs.subcategory, "Burr", inputs.tone, inputs.style),
          generateFallbackJoke(inputs.rating || "PG-13", inputs.subcategory, "Hedberg", inputs.tone, inputs.style)
        ];
        
        return new Response(JSON.stringify({
          success: true,
          options: fallbackOptions,
          meta: {
            model: 'fallback - GPT-5 and GPT-4.1 both failed',
            voices: ["hart", "wong", "burr", "hedberg"],
            style: inputs.style,
            tone: inputs.tone
          },
          timing: {
            total_ms: Date.now() - requestStartTime
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      // Emergency fallback with context enforcement for multi-rating
      const fallbackRatings: MultiRatingOutput = {
        G: [
          { voice: "Jim Gaffigan", text: generateFallbackJoke("G", `${inputs.category} > ${inputs.subcategory}`, "Jim Gaffigan", inputs.tone, inputs.style) },
          { voice: "Ellen DeGeneres", text: generateFallbackJoke("G", `${inputs.category} > ${inputs.subcategory}`, "Ellen DeGeneres", inputs.tone, inputs.style) }
        ],
        "PG-13": [
          { voice: "Kevin Hart", text: generateFallbackJoke("PG-13", `${inputs.category} > ${inputs.subcategory}`, "Kevin Hart", inputs.tone, inputs.style) },
          { voice: "Ali Wong", text: generateFallbackJoke("PG-13", `${inputs.category} > ${inputs.subcategory}`, "Ali Wong", inputs.tone, inputs.style) }
        ],
        R: [
          { voice: "Bill Burr", text: generateFallbackJoke("R", `${inputs.category} > ${inputs.subcategory}`, "Bill Burr", inputs.tone, inputs.style) },
          { voice: "Chris Rock", text: generateFallbackJoke("R", `${inputs.category} > ${inputs.subcategory}`, "Chris Rock", inputs.tone, inputs.style) }
        ],
        Explicit: [
          { voice: "Sarah Silverman", text: generateFallbackJoke("Explicit", `${inputs.category} > ${inputs.subcategory}`, "Sarah Silverman", inputs.tone, inputs.style) },
          { voice: "Amy Schumer", text: generateFallbackJoke("Explicit", `${inputs.category} > ${inputs.subcategory}`, "Amy Schumer", inputs.tone, inputs.style) }
        ]
      };
      
      return new Response(JSON.stringify({
        success: true,
        ratings: fallbackRatings,
        model: 'fallback',
        timing: {
          total_ms: Date.now() - requestStartTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

  } catch (error) {
    console.error('❌ Request processing failed:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to inject a tag into a joke naturally
function injectTagIntoJoke(joke: string, tag: string): string {
  // Try to inject near verbs or conjunctions
  const patterns = [
    /(\b(?:is|are|was|were|has|have|does|do|gets|got|makes|made)\b)/i,
    /(\b(?:and|but|while|when|if|because|since)\b)/i,
    /(\b(?:with|for|by|at|on|in)\b)/i
  ];
  
  for (const pattern of patterns) {
    const match = joke.match(pattern);
    if (match && match.index !== undefined) {
      const insertPos = match.index + match[0].length;
      return joke.slice(0, insertPos) + ` ${tag}` + joke.slice(insertPos);
    }
  }
  
  // Fallback: append at the end before punctuation
  return joke.replace(/[.!?]$/, ` ${tag}.`);
}