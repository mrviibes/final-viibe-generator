import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-5-mini-2025-08-07';

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string; // balanced | cinematic | dynamic | surreal | chaos | exaggerated
  layout_token: string;
}

// Universal system prompt that forces JSON concepts and bans filler
const SYSTEM_PROMPT_UNIVERSAL = (
  { mode, layout }: { mode: string; layout: string }
) => `You generate 4 vivid, funny, cinematic visual scene ideas as JSON only.  
Return EXACTLY:

{
  "concepts":[
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

## Core Rules:
- Visuals must tie directly to the provided joke/caption text.  
- Must be cinematic, specific, and imaginative — NOT generic filler.  
- Always leave [${layout}] clean for text placement.  
- Concepts should feel like fun, shareable meme images that match the joke.  

## Negative Rules:
no bland stock photo, no random empty rooms, no balloons/cake placeholders unless the joke requires them,  
no random objects with no context, no abstract shapes, no watermarks, no logos, no on-image text.  

## Mode Behavior (apply one, selected: ${mode}):
[Balanced]  polished, realistic photography; clear subject action tied to subcategory; readable negative space.
[Cinematic Action]  movie-poster energy; dramatic light; motion blur; debris/confetti; epic atmosphere.
[Dynamic Action]  freeze-frame peak energy; leaping, slipping, crashing; impact debris; speed trails.
[Surreal / Dreamlike]  bend physics/scale; floating props; warped reflections; dream color fog; keep subcategory identity.
[Randomized Chaos]  mash joke + subcategory + absurd twist; bold palettes; glitchy energy; still readable.
[Exaggerated Proportions]  caricature; giant heads; tiny bodies; oversized props; big emotions; meme-friendly.
`;

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
    console.log('model', MODEL);

    const system = SYSTEM_PROMPT_UNIVERSAL({ mode, layout: layout_token });
    const user = `Context:\n- final_text: "${final_text}"\n- category: ${category}\n- subcategory: ${subcategory}\n- mode: ${mode}\n- layout_token: ${layout_token}`;

    const body: Record<string, unknown> = {
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 600,
    };

    console.log('reqBody', JSON.stringify(body));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

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
    console.log('status', r.status);

    // Try to parse JSON, but be resilient on errors
    let data: any;
    try {
      data = await r.json();
    } catch (e) {
      data = { parse_error: String(e) };
    }

    console.log('data', data);

    if (!r.ok) {
      const message = data?.error?.message || `OpenAI error ${r.status}`;
      return new Response(JSON.stringify({ success: false, error: message, status: r.status, details: data }), {
        status: r.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ success: false, error: 'Empty model response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let out: any;
    try {
      out = JSON.parse(content);
    } catch (e) {
      // Attempt to clean and parse JSON if wrapped
      try {
        const cleaned = content.replace(/```json\s*|```/g, '').trim();
        out = JSON.parse(cleaned);
      } catch (_e) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid JSON from model', raw: content.slice(0, 400) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!Array.isArray(out?.concepts) || out.concepts.length !== 4) {
      return new Response(JSON.stringify({ success: false, error: 'Bad shape', got: out }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simple banned phrase validation
    const banned = [
      'random object',
      'empty room',
      'abstract shapes',
      'person looking dramatically disappointed',
      'generic photo',
    ];
    const fails = out.concepts.some((c: any) =>
      typeof c?.text === 'string' && banned.some(b => c.text.toLowerCase().includes(b))
    );
    if (fails) {
      return new Response(JSON.stringify({ success: false, error: 'Validation failed: filler phrases detected', concepts: out.concepts }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, model: data?.model, concepts: out.concepts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('generate-visuals error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});