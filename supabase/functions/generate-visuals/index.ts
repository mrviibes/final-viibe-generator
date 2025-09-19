import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Multi-model fallback strategy (matching Step 2 configuration)
const MODELS = [
  { name: 'gpt-5-2025-08-07', tokens: 800, useMaxCompletionTokens: true },
  { name: 'gpt-4.1-2025-04-14', tokens: 800, useMaxCompletionTokens: true },
  { name: 'gpt-5-mini-2025-08-07', tokens: 800, useMaxCompletionTokens: true }
];

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string; // balanced | cinematic | dynamic | surreal | chaos | exaggerated
  layout_token: string;
  tags?: string[];
}

// Layout-specific text placement rules
const LAYOUT_RULES = {
  "negativeSpace": {
    placement: "integrated into natural empty/negative space near largest margin",
    style: "clean modern sans-serif, elegant alignment, subtle glow for readability"
  },
  "memeTopBottom": {
    placement: "bold caption at top and/or bottom in clear bands",
    style: "large modern sans-serif, centered, high contrast, clean stroke"
  },
  "lowerThird": {
    placement: "clean banner across bottom third",
    style: "modern sans-serif, centered, semi-transparent band ok"
  },
  "sideBarLeft": {
    placement: "vertical side caption panel on left side",
    style: "modern sans-serif, stacked/vertical layout, subtle strip"
  },
  "badgeSticker": {
    placement: "inside a minimal badge/sticker overlay",
    style: "modern sans-serif, simple shape (circle/ribbon/starburst)"
  },
  "subtleCaption": {
    placement: "small caption near bottom or corner",
    style: "elegant modern sans-serif, high contrast, subtle glow"
  }
};

// Comedian styles for funny visual scenarios
const COMEDIAN_STYLES = [
  {
    id: "bill_burr",
    name: "Bill Burr",
    visual_style: "exaggerated rage and physical comedy",
    scenario_approach: "over-the-top angry reactions, equipment failures, dramatic meltdowns"
  },
  {
    id: "mitch_hedberg", 
    name: "Mitch Hedberg",
    visual_style: "surreal object transformations",
    scenario_approach: "unexpected item mutations, absurd logic made visual, dreamy weirdness"
  },
  {
    id: "kevin_hart",
    name: "Kevin Hart", 
    visual_style: "extreme size/scale comedy",
    scenario_approach: "comically oversized props, height-based sight gags, physical exaggeration"
  },
  {
    id: "norm_macdonald",
    name: "Norm MacDonald",
    visual_style: "bizarrely unexpected anti-climactic scenes", 
    scenario_approach: "setup for epic moment that becomes mundane, weird left-turn visuals"
  },
  {
    id: "ali_wong",
    name: "Ali Wong",
    visual_style: "raw family chaos", 
    scenario_approach: "inappropriate family scenarios, brutally honest domestic scenes"
  },
  {
    id: "sebastian_maniscalco",
    name: "Sebastian Maniscalco",
    visual_style: "exasperated gestures and family dysfunction",
    scenario_approach: "animated frustrated reactions, over-dramatic family scenarios"
  },
  {
    id: "sarah_silverman", 
    name: "Sarah Silverman",
    visual_style: "innocently twisted scenarios",
    scenario_approach: "cute but dark situations, deceptively sweet chaos"
  },
  {
    id: "joan_rivers",
    name: "Joan Rivers", 
    visual_style: "glamorous cruelty and over-the-top fashion",
    scenario_approach: "savage elegance, fashion disasters, celebrity mockery scenarios"
  }
];

// Random comedian selection for funny options
function getRandomComedians(): { option3: typeof COMEDIAN_STYLES[0], option4: typeof COMEDIAN_STYLES[0] } {
  const shuffled = [...COMEDIAN_STYLES].sort(() => 0.5 - Math.random());
  return {
    option3: shuffled[0],
    option4: shuffled[1] || shuffled[0] // Fallback if somehow empty
  };
}

// Visual vocabulary for category-specific props
const VISUAL_VOCABULARY = {
  "Celebrations": {
    "Birthday": {
      props: "cake with frosting candles, balloons, party hats, wrapped gifts, confetti, streamers",
      atmosphere: "warm festive lighting, frosting textures, sparkler candles, neon birthday sign"
    },
    "Wedding": {
      props: "wedding cake, rings, bouquet, veil, champagne glasses",
      atmosphere: "romantic glow, fairy lights, aisle petals, archway"
    },
    "Christmas": {
      props: "Christmas tree, string lights, ornaments, stockings, wreaths, wrapped gifts",
      atmosphere: "warm fireplace glow, snowy window, twinkling fairy lights"
    },
    "Halloween": {
      props: "jack-o-lanterns, spooky masks, cobwebs, skeletons, candy buckets, bats",
      atmosphere: "eerie moonlight, fog, candlelit pumpkins, haunted house vibe"
    }
  },
  "Sports": {
    "American Football": {
      props: "football, helmet, shoulder pads, playbook, stadium scoreboard",
      atmosphere: "floodlights, grassy field, roaring crowd, sideline energy"
    },
    "Soccer": {
      props: "soccer ball, cleats, shin guards, nets, trophy cup",
      atmosphere: "grassy pitch, stadium floodlights, colorful fans, confetti rain"
    },
    "Basketball": {
      props: "basketball, hoop, sneakers, sweat towel, scoreboard",
      atmosphere: "hardwood court, buzzing arena, dramatic spotlights"
    }
  },
  "Daily Life": {
    "Work": {
      props: "laptops, coffee mugs, sticky notes, conference table, charts",
      atmosphere: "office lighting, messy desk, casual clutter"
    },
    "Parenting": {
      props: "toys, strollers, crayons, spilled snacks, baby bottles",
      atmosphere: "chaotic living room, colorful mess, joyful clutter"
    },
    "Dating": {
      props: "candlelit table, roses, champagne, heart-shaped balloons",
      atmosphere: "city lights at night, cozy restaurant, sunset skyline"
    }
  }
};

// Extract meaningful keywords from caption text
function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'ought', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'them', 'their', 'what', 'where', 'when', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'like',
    'me', 'my', 'myself', 'this', 'that', 'these', 'those', 'am', 'an', 'for', 'in',
    'of', 'or', 'with', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'again', 'further', 'then', 'once'
  ]);

  // Extract words, clean them up, and filter
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && // At least 3 characters
      !stopWords.has(word) && // Not a stop word
      !word.match(/^\d+$/) // Not just numbers
    );

  // Get unique words and prioritize longer, more meaningful ones
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords
    .sort((a, b) => b.length - a.length) // Longer words first
    .slice(0, 5); // Top 5 keywords
}

// Case-insensitive lookup for visual vocabulary
function getVocabInsensitive(category: string, subcategory: string): { props: string; atmosphere: string } {
  const catKey = Object.keys(VISUAL_VOCABULARY).find(k => k.toLowerCase() === String(category).toLowerCase());
  if (!catKey) return { props: '', atmosphere: '' };
  const subMap = (VISUAL_VOCABULARY as any)[catKey] || {};
  const subKey = Object.keys(subMap).find(k => k.toLowerCase() === String(subcategory).toLowerCase());
  if (!subKey) return { props: '', atmosphere: '' };
  const match = subMap[subKey] || {};
  return { props: String(match.props || ''), atmosphere: String(match.atmosphere || '') };
}

// Enhanced visual scene generation with caption-first approach
const SYSTEM_PROMPT_UNIVERSAL = (
  { mode, category, subcategory, tags = [], keywords = [] }: { 
    mode: string; 
    category: string; 
    subcategory: string; 
    tags?: string[]; 
    keywords?: string[] 
  }
) => {
  // Get category-specific visual vocabulary
  const vocab = getVocabInsensitive(category, subcategory);
  
  // Process tags - all tags are used literally when possible, or as style influence
  const allTags = tags.map(tag => tag.replace(/^["']|["']$/g, ''));
  
  // Get random comedian styles for funny options
  const comedians = getRandomComedians();
  
  // Define mode weights for caption vs category emphasis
  const modeConfig = {
    caption_match: { captionWeight: 0.8, categoryWeight: 0.2, funnyExactly: 0 },
    balanced: { captionWeight: 0.5, categoryWeight: 0.5, funnyExactly: 1 },
    category_first: { captionWeight: 0.25, categoryWeight: 0.75, funnyExactly: 0 },
    gag_factory: { captionWeight: 0.6, categoryWeight: 0.4, funnyExactly: 2 },
    cinematic: { captionWeight: 0.6, categoryWeight: 0.4, funnyExactly: 0 },
    surreal: { captionWeight: 0.7, categoryWeight: 0.3, funnyExactly: 2 },
    full_random: { captionWeight: 0.1, categoryWeight: 0.2, funnyExactly: 0 }
  };
  
  const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.caption_match;
  
  const keywordSection = keywords.length > 0 ? `
Caption Keywords: ${keywords.join(', ')}` : '';
  
  const captionPriority = config.captionWeight > 0.5 ? 'CAPTION-FIRST' : 'CATEGORY-FIRST';
  const funnyCount = config.funnyExactly;
  
  return `Generate 4 scene ideas as JSON (${captionPriority} approach):

Category: ${category}/${subcategory}
Mode: ${mode}
${vocab.props ? `Props: ${vocab.props}` : ''}
${vocab.atmosphere ? `Mood: ${vocab.atmosphere}` : ''}${keywordSection}

ROLE REQUIREMENTS:
- Option 1: ${captionPriority === 'CAPTION-FIRST' ? 'Serious scene directly tied to caption keywords' : 'Professional category focus with caption nod'}
- Option 2: ${captionPriority === 'CAPTION-FIRST' ? 'Serious category context with caption elements' : 'Caption-influenced category scene'}
- Option 3: ${funnyCount >= 2 ? 'FUNNY GAG tied to caption (exaggeration/irony)' : captionPriority === 'CAPTION-FIRST' ? 'Caption-influenced scene' : 'Category scene with caption hint'}
- Option 4: ${funnyCount >= 2 ? 'FUNNY ABSURD/SURREAL take on caption' : captionPriority === 'CAPTION-FIRST' ? 'Creative caption interpretation' : 'Category scene variation'}

${funnyCount >= 2 ? `
⚠️ OPTIONS 3 & 4 MUST BE OBVIOUSLY FUNNY ⚠️
- Option 3: ${comedians.option3.name} style gag with oversized props, visual punchlines, slapstick
- Option 4: ${comedians.option4.name} style absurd/surreal with impossible physics, dream logic
` : ''}

CAPTION TIE REQUIREMENTS:
- Option 1 MUST include ≥1 keyword from: ${keywords.slice(0, 3).join(', ')}
- ${captionPriority === 'CAPTION-FIRST' ? 'All options should reference caption theme' : 'At least 2 options should hint at caption'}

${allTags.length > 0 ? `- Include tags: ${allTags.join(', ')}` : ''}
- Complete sentences only, no ellipses or fragments
- No visible text/words in scenes

Generate 4 scene concepts as JSON:
{
  "concepts": [
    {"lane": "option1", "text": "scene description"},
    {"lane": "option2", "text": "scene description"}, 
    {"lane": "option3", "text": "scene description"},
    {"lane": "option4", "text": "scene description"}
  ]
}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY missing');
      return new Response(JSON.stringify({ success: false, error: 'OPENAI_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputs = (await req.json()) as Partial<VisualInput>;

    // Basic input validation
    const final_text = String(inputs.final_text || '').trim();
    const category = String(inputs.category || '').trim();
    const subcategory = String(inputs.subcategory || '').trim();
    const mode = String(inputs.mode || 'balanced').trim();
    const layout_token = String(inputs.layout_token || 'negativeSpace').trim();
    const tags = Array.isArray(inputs.tags) ? inputs.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : [];

    if (!final_text || !category || !subcategory) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: final_text, category, subcategory' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract keywords from caption for better targeting
    const keywords = extractKeywords(final_text);
    
    console.log('inputs', { final_text, category, subcategory, mode, layout_token, tags, keywords });

    const system = SYSTEM_PROMPT_UNIVERSAL({ mode, category, subcategory, tags, keywords });
    const user = `Caption: "${final_text}"
${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}

Generate 4 scene concepts that work with this caption.`;

    // Try models in sequence until one succeeds
    for (const modelConfig of MODELS) {
      console.log(`Trying model: ${modelConfig.name}`);
      
      const body: Record<string, unknown> = {
        model: modelConfig.name,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        [modelConfig.useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens']: modelConfig.tokens,
      };

      console.log('reqBody', JSON.stringify(body));

      try {
        const controller = new AbortController();
        // Increase timeout for GPT-5, shorter for GPT-4.1
        const timeoutMs = modelConfig.name.includes('gpt-5') ? 20000 : 15000;
        const timeout = setTimeout(() => {
          console.log(`${modelConfig.name} timed out after ${timeoutMs}ms`);
          controller.abort();
        }, timeoutMs);

        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        console.log(`${modelConfig.name} status:`, r.status);

        if (!r.ok) {
          console.log(`${modelConfig.name} failed with status ${r.status}, trying next model`);
          continue;
        }

        const data = await r.json();
        console.log(`${modelConfig.name} response:`, data);

        // Check for token limit issues
        const finishReason = data?.choices?.[0]?.finish_reason;
        if (finishReason === 'length') {
          console.log(`${modelConfig.name} hit token limit (finish_reason: length), trying next model`);
          continue;
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content || content.trim() === '') {
          console.log(`${modelConfig.name} returned empty content (finish_reason: ${finishReason}), trying next model`);
          continue;
        }

        // Parse JSON response
        let out: any;
        try {
          out = JSON.parse(content);
        } catch (e) {
          try {
            const cleaned = content.replace(/```json\s*|```/g, '').trim();
            out = JSON.parse(cleaned);
          } catch (_e) {
            console.log(`${modelConfig.name} returned invalid JSON, trying next model`);
            continue;
          }
        }

        // Validate structure
        if (!Array.isArray(out?.concepts) || out.concepts.length !== 4) {
          console.log(`${modelConfig.name} returned bad structure, trying next model`);
          continue;
        }

        // Validate that Options 3 & 4 contain funny elements
        const funnyKeywords = [
          'gigantic', 'enormous', 'oversized', 'massive', 'towering', 'giant',
          'ridiculous', 'absurd', 'bizarre', 'weird', 'strange', 'impossible',
          'exaggerated', 'comical', 'silly', 'goofy', 'outrageous', 'wild',
          'floating', 'flying', 'transformed', 'morphing', 'melting', 'warped',
          'upside-down', 'backwards', 'twisted', 'distorted', 'surreal', 'dreamy'
        ];
        
        const isFunny = (text: string) => {
          const lowerText = text.toLowerCase();
          return funnyKeywords.some(keyword => lowerText.includes(keyword)) ||
                 /\b(ten feet|20 feet|giant|huge|tiny|miniature)\b/i.test(text) ||
                 /\b(impossible|defying|floating|flying|morphing)\b/i.test(text);
        };
        
        const option3Funny = out.concepts[2] && isFunny(out.concepts[2].text || '');
        const option4Funny = out.concepts[3] && isFunny(out.concepts[3].text || '');
        
        if (!option3Funny || !option4Funny) {
          console.log(`${modelConfig.name} Options 3 & 4 not funny enough (3: ${option3Funny}, 4: ${option4Funny}), trying next model`);
          console.log('Option 3 text:', out.concepts[2]?.text);
          console.log('Option 4 text:', out.concepts[3]?.text);
          continue;
        }

        // Check for banned phrases (expanded list)
        const banned = [
          'random object', 'empty room', 'abstract shapes', 'generic photo',
          'prop with twist', 'group of people laughing', 'abstract geometric shapes',
          'group of people', 'person looking disappointed', 'random everyday object'
        ];
        const fails = out.concepts.some((c: any) =>
          typeof c?.text === 'string' && banned.some(b => c.text.toLowerCase().includes(b))
        );
        
        if (fails) {
          console.log(`${modelConfig.name} contained banned phrases, trying next model`);
          continue;
        }

        // Success! Sanitize concepts to remove caption quotes and cap word count
        console.log(`${modelConfig.name} succeeded with ${out.concepts.length} concepts`);
        
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const captionRe = new RegExp(escapeRegex(final_text), 'gi');
        const quotedCaptionRe = new RegExp(`["'""]?${escapeRegex(final_text)}["'""]?`, 'gi');
        const captionLabelRe = /caption[^:]{0,80}:\s*["'""][^"'""]+["'""]/gi;
        
        const sanitize = (t: string) => {
          let s = String(t || '');
          const before = s;
          // Remove explicit caption quotes and labeled fragments
          s = s.replace(captionLabelRe, 'caption');
          s = s.replace(quotedCaptionRe, '');
          s = s.replace(captionRe, '');
          // Remove context fragments like "- Context: Birthday"
          s = s.replace(/\s*-\s*Context:\s*[^.!?]*[.!?]?/gi, '');
          // Collapse punctuation and spaces
          s = s.replace(/\s{2,}/g, ' ').replace(/\s*([,:;.!?])\s*/g, '$1 ');
          s = s.replace(/\s+/g, ' ').trim();
          // Enforce 18-word cap WITHOUT adding ellipses
          const words = s.split(/\s+/);
          if (words.length > 18) {
            s = words.slice(0, 18).join(' ');
            // Ensure it ends with proper punctuation
            if (!s.match(/[.!?]$/)) s += '.';
          }
          // Remove any trailing ellipses or multiple dots
          s = s.replace(/\.{2,}|…/g, '.');
          console.log('🧼 Sanitized concept', { before, after: s, words: s ? s.split(/\s+/).length : 0 });
          return s;
        };
        
        const sanitizedConcepts = out.concepts.map((c: any, idx: number) => ({
          lane: c?.lane || `option${idx + 1}`,
          text: sanitize(String(c?.text || '')),
        })).filter((c: any) => c.text && c.text.trim().length > 0);
        
        console.log('Final sanitized concepts:', JSON.stringify(sanitizedConcepts, null, 2));
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            model: modelConfig.name, 
            concepts: sanitizedConcepts,
            generated_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`${modelConfig.name} timeout - model taking too long, trying next`);
        } else {
          console.error(`${modelConfig.name} error:`, error.message || error);
        }
        continue;
      }
    }

    // All models failed - provide emergency fallback
    console.error('All models failed, providing emergency fallback concepts');
    
    const fallbackConcepts = [
      {
        "lane": "option1",
        "text": "A baseball diamond at sunset with players in uniform gathered around home plate, bats and gloves scattered nearby."
      },
      {
        "lane": "option2", 
        "text": "A dugout scene showing baseball players making animated gestures with their hands while a woman watches skeptically."
      },
      {
        "lane": "option3",
        "text": "Close-up of baseball equipment (glove, bat, ball) arranged on a wooden bench with a scoreboard visible in background."
      },
      {
        "lane": "option4",
        "text": "A baseball field with players running bases while coaches gesture from the sidelines during golden hour lighting."
      }
    ];
    
    return new Response(JSON.stringify({ 
      success: true, 
      model: 'fallback',
      concepts: fallbackConcepts,
      fallback: true,
      attempted_models: MODELS.map(m => m.name)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-visuals error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});