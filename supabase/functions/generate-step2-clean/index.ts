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
  
  // Parse tags
  const rawTagString = Array.isArray(inputs.tags) ? inputs.tags.join(',') : (inputs.tags || '');
  const parsedTags = parseTags(rawTagString);
  
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
          max_completion_tokens: 100,
          temperature: 0.8
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.error(`❌ API Error for ${rating}:`, response.status);
        // Use fallback
        results[rating] = {
          voice: comedian.name,
          text: generateFallbackJoke(effectiveRating, context, comedian.name)
        };
        continue;
      }
      
      const data = await response.json();
      const text = (data.choices?.[0]?.message?.content || '').trim();
      
      // Validate the joke
      if (validateRatingJoke(text, effectiveRating, parsedTags)) {
        results[rating] = {
          voice: comedian.name,
          text: text
        };
      } else {
        console.warn(`⚠️ Validation failed for ${rating}, using fallback`);
        results[rating] = {
          voice: comedian.name,
          text: generateFallbackJoke(effectiveRating, context, comedian.name)
        };
      }
      
    } catch (error) {
      console.error(`❌ Generation failed for ${rating}:`, error);
      results[rating] = {
        voice: comedian.name,
        text: generateFallbackJoke(effectiveRating, context, comedian.name)
      };
    }
  }
  
  const latencyMs = Date.now() - startTime;
  console.log(`📊 Multi-rating generation completed in ${latencyMs}ms`);
  
  return results as MultiRatingOutput;
}

function generateFallbackJoke(rating: string, context: string, comedianName: string): string {
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
      
      // Emergency fallback
      const fallbackRatings: MultiRatingOutput = {
        G: {
          voice: "Jim Gaffigan",
          text: `${inputs.category} is like my sock drawer, organized chaos.`
        },
        "PG-13": {
          voice: "Kevin Hart", 
          text: `${inputs.category} went sideways faster than expected, damn.`
        },
        R: {
          voice: "Bill Burr",
          text: `This ${inputs.category} situation is fucked up, honestly.`
        },
        Explicit: {
          voice: "Sarah Silverman",
          text: `${inputs.category} screwed me harder than my ex.`
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