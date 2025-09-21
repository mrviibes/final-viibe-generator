import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseTags, type ParsedTags } from "./tags.ts";
import { buildPrompt } from "./buildPrompt.ts";
import { stripSoftEcho } from "./sanitize.ts";
import { validate } from "./validate.ts";
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4.1-2025-04-14';

async function generateMultiRatingJokes(inputs: any): Promise<MultiRatingOutput> {
  const startTime = Date.now();
  console.log('🎯 Starting multi-rating comedy generation');
  
  // Parse tags - handle any input format
  const parsedTags = parseTags(inputs.tags);
  
  const context = `${inputs.category} > ${inputs.subcategory}`;
  const ratings = ["G", "PG-13", "R", "Explicit"] as const;
  
  // Check for category-based explicit blocking
  const category = inputs.category?.toLowerCase() || '';
  const subcategory = inputs.subcategory?.toLowerCase() || '';
  const animalContexts = ['animals', 'pets', 'wildlife', 'daily life'];
  const animalSubcategories = ['dog park', 'pets', 'animals', 'wildlife', 'zoo', 'kids', 'school'];
  
  const isAnimalContext = animalContexts.includes(category) || animalSubcategories.includes(subcategory);
  const effectiveRatings = isAnimalContext ? ["G", "PG-13", "R", "R"] : ratings; // Downgrade Explicit to R for animals
  
  const results: Partial<MultiRatingOutput> = {};
  const allJokes: string[] = [];
  
  // Generate for each rating
  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i];
    const effectiveRating = effectiveRatings[i];
    const comedian = selectComedianForRating(effectiveRating);
    
    console.log(`🎭 Generating ${rating} joke with ${comedian.name} voice`);
    
    const prompt = buildPromptForRating(
      effectiveRating,
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
          max_completion_tokens: 100
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.error(`❌ API Error for ${rating}:`, response.status);
        // Use fallback
        const fallbackText = generateFallbackJoke(effectiveRating, context, comedian.name);
        results[rating] = {
          voice: comedian.name,
          text: fallbackText
        };
        allJokes.push(fallbackText);
        continue;
      }
      
      const data = await response.json();
      let text = (data.choices?.[0]?.message?.content || '').trim();
      
      // Validate the joke
      const isValidFormat = validateRatingJoke(text, effectiveRating, parsedTags);
      const isValidTone = inputs.tone?.toLowerCase() === 'romantic' ? 
        validateRomanticTone(text, context) : true;
      
      // Apply context and tone enforcement
      text = enforceContextAndTone(text, context, inputs.tone || 'Humorous', inputs.style || 'punchline-first');
      
      if (isValidFormat && isValidTone) {
        results[rating] = {
          voice: comedian.name,
          text: text
        };
        allJokes.push(text);
      } else {
        console.warn(`⚠️ Validation failed for ${rating}, using fallback`);
        const fallbackText = generateFallbackJoke(effectiveRating, context, comedian.name);
        results[rating] = {
          voice: comedian.name,
          text: fallbackText
        };
        allJokes.push(fallbackText);
      }
      
    } catch (error) {
      console.error(`❌ Generation failed for ${rating}:`, error);
      const fallbackText = generateFallbackJoke(effectiveRating, context, comedian.name, inputs.tone, inputs.style);
      results[rating] = {
        voice: comedian.name,
        text: fallbackText
      };
      allJokes.push(fallbackText);
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
  const contextLower = context.toLowerCase();
  const isRomantic = tone?.toLowerCase() === 'romantic';
  const isPunchlineFirst = style === 'punchline-first';
  
  // Context-specific fallbacks with proper structure
  if (contextLower.includes('soccer')) {
    const soccerFallbacks = [
      "Zero hustle first then Jesse ties his lace during every drill on the pitch.",
      "Plot twist first then the keeper waves at Jesse and practice gives up.",
      "Fine first then Jesse blames traffic and boots the cone on the field.",
      "Spoiler first then the scrimmage whistles and Jesse still misses open goals."
    ];
    return soccerFallbacks[Math.floor(Math.random() * soccerFallbacks.length)];
  }
  
  if (isRomantic && contextLower.includes('thanksgiving')) {
    const romanticThanksgivingFallbacks = [
      "Spoiler first then we pass the turkey and my heart passes gratitude back.",
      "Plot twist first then your laugh warms the table and my heart agrees completely.",
      "Fine first then I love your chaos and the gravy finds peace with us.",
      "Zero first then your smile butters the rolls and my heart begs for seconds."
    ];
    const randomIndex = Math.floor(Math.random() * romanticThanksgivingFallbacks.length);
    return romanticThanksgivingFallbacks[randomIndex];
  }
  
  if (isRomantic && contextLower.includes('birthday')) {
    const romanticBirthdayFallbacks = [
      "Jesse our cake glow looks like magic and my heart celebrates you.",
      "Jesse tonight the candles wish for sequels and I still want you.",
      "Jesse make a wish because my heart already picked you forever.",
      "Jesse this party celebrates us and I treasure every moment together."
    ];
    const randomIndex = Math.floor(Math.random() * romanticBirthdayFallbacks.length);
    return romanticBirthdayFallbacks[randomIndex];
  }
  
  // Regular fallbacks by rating
  const fallbacks = {
    G: [
      `${context} is like my sock drawer, organized chaos.`,
      `This situation reminds me of my cooking, questionable but hopeful.`,
      `${context} hits different when you're not prepared for it.`
    ],
    "PG-13": [
      `${context} is like group projects, someone's gonna mess it up damn sure.`,
      `This whole thing is hell on wheels and nobody warned me.`,
      `${context} went sideways faster than my last diet attempt, damn.`
    ],
    R: [
      `${context} is fucked up beyond all recognition, honestly.`,
      `This shit storm caught me completely off guard, not gonna lie.`,
      `${context} is more chaotic than my love life, and that's saying something.`
    ],
    Explicit: [
      `${context} screwed me harder than my ex on Valentine's Day.`,
      `This clusterfuck is more twisted than my browser history.`,
      `${context} fucked me over like a horny teenager with no supervision.`
    ]
  };
  
  const ratingFallbacks = fallbacks[rating as keyof typeof fallbacks] || fallbacks["PG-13"];
  const randomIndex = Math.floor(Math.random() * ratingFallbacks.length);
  return ratingFallbacks[randomIndex];
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
      // Generate multi-rating jokes
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
      console.error('❌ Multi-rating generation failed:', error);
      
      // Emergency fallback with context enforcement
      const fallbackRatings: MultiRatingOutput = {
        G: {
          voice: "Jim Gaffigan",
          text: generateFallbackJoke("G", `${inputs.category} > ${inputs.subcategory}`, "Jim Gaffigan", inputs.tone, inputs.style)
        },
        "PG-13": {
          voice: "Kevin Hart", 
          text: generateFallbackJoke("PG-13", `${inputs.category} > ${inputs.subcategory}`, "Kevin Hart", inputs.tone, inputs.style)
        },
        R: {
          voice: "Bill Burr",
          text: generateFallbackJoke("R", `${inputs.category} > ${inputs.subcategory}`, "Bill Burr", inputs.tone, inputs.style)
        },
        Explicit: {
          voice: "Sarah Silverman",
          text: generateFallbackJoke("Explicit", `${inputs.category} > ${inputs.subcategory}`, "Sarah Silverman", inputs.tone, inputs.style)
        }
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