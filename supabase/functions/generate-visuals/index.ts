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

// Enhanced visual prompt template that eliminates placeholders
const SYSTEM_PROMPT_UNIVERSAL = (
  { mode, layout, category, subcategory }: { mode: string; layout: string; category: string; subcategory: string }
) => {
  // Get category-specific visual vocabulary
  const vocab = VISUAL_VOCABULARY[category]?.[subcategory] || { props: "", atmosphere: "" };
  const layoutRule = LAYOUT_RULES[layout] || LAYOUT_RULES["negativeSpace"];
  
  const modeInstructions = {
    balanced: "Polished, realistic photo style. Clear subject action + props tied to the joke. Good lighting, readable negative space.",
    cinematic: "Movie-poster energy. Spotlights, glitter, smoke, lasers, confetti, dramatic poses. Scene feels like a big stage or blockbuster moment.",
    dynamic: "Peak mid-motion chaos. Candles blowing out, balloons bursting, cake flying, confetti mid-air. Subject caught mid-action.",
    surreal: "Impossible but funny. Cake as a disco ball, subject singing to a floating mic, giant candles. Dreamlike lighting, fog, neon.",
    chaos: "Unexpected mashup. Joke + Subcategory + absurd element (e.g., singing into a giant candle, cake as a concert stage). Bright palettes, unpredictable energy.",
    exaggerated: "Cartoonish caricature. Big head, tiny body, oversized props (mic, candles, cake). Meme-friendly humor."
  };
  
  return `You generate 4 vivid, cinematic, and funny scene concepts as JSON only.

Return EXACTLY:
{
  "concepts":[
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

## Hard Rules:
- Each concept MUST tie directly to the caption/joke text.
- Each concept MUST include props and atmosphere relevant to Category [${category}] and Subcategory [${subcategory}].
- No filler placeholders. Never say "prop with twist," "group of people," or "abstract shapes."
- Each option must be a cinematic **scene idea** — a moment someone could visualize as a poster or meme.
- Always leave ${layout} clean for caption placement.

## Mode Enforcement:
${modeInstructions[mode] || modeInstructions.balanced}

## Required Elements:
${vocab.props ? `Props: ${vocab.props}` : ""}
${vocab.atmosphere ? `Atmosphere: ${vocab.atmosphere}` : ""}

## TEXT INSTRUCTION (MANDATORY): 
Render the provided text clearly integrated into the scene.
Placement: ${layoutRule.placement}
Style: ${layoutRule.style}
The text must appear clearly and be legible, never omitted.

Rules: 15-25 words per concept. Connect to joke directly. NO generic placeholders.`;
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

    if (!final_text || !category || !subcategory) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: final_text, category, subcategory' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('inputs', { final_text, category, subcategory, mode, layout_token });

    const system = SYSTEM_PROMPT_UNIVERSAL({ mode, layout: layout_token, category, subcategory });
    const user = `Text to overlay: "${final_text}"
Category: ${category} (${subcategory})
Mode: ${mode}
    
NEGATIVE PROMPT GUIDANCE: no filler props, no empty rooms, no watermarks, no logos, no on-image text besides caption.`;

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

        // Success!
        console.log(`${modelConfig.name} succeeded with ${out.concepts.length} concepts`);
        console.log('Final concepts:', JSON.stringify(out.concepts, null, 2));
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            model: modelConfig.name, 
            concepts: out.concepts,
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