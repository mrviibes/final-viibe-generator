import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Multi-model fallback strategy
const MODELS = [
  { name: 'gpt-5-2025-08-07', tokens: 400, useMaxCompletionTokens: true },
  { name: 'gpt-4.1-2025-04-14', tokens: 400, useMaxCompletionTokens: true },
  { name: 'gpt-5-mini-2025-08-07', tokens: 300, useMaxCompletionTokens: true }
];

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string; // balanced | cinematic | dynamic | surreal | chaos | exaggerated
  layout_token: string;
}

// Strengthened system prompt for reliable JSON output
const SYSTEM_PROMPT_UNIVERSAL = (
  { mode, layout }: { mode: string; layout: string }
) => `Generate 4 visual concepts as valid JSON. Response must be parseable JSON with NO extra text.

{
  "concepts":[
    {"lane":"option1","text":"vivid scene description"},
    {"lane":"option2","text":"vivid scene description"},
    {"lane":"option3","text":"vivid scene description"},
    {"lane":"option4","text":"vivid scene description"}
  ]
}

RULES:
- Each concept: 15-25 words describing a specific, cinematic scene
- Must connect to the provided joke/text directly
- Leave [${layout}] area clear for text overlay
- Mode: ${mode} - apply appropriate visual style
- NO generic stock photos, random objects, or filler content
- Be specific and imaginative

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

    const system = SYSTEM_PROMPT_UNIVERSAL({ mode, layout: layout_token });
    const user = `Joke: "${final_text}"\nCategory: ${category} (${subcategory})\nMode: ${mode}`;

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
        const timeout = setTimeout(() => controller.abort(), 10000);

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

        const content = data?.choices?.[0]?.message?.content;
        if (!content || content.trim() === '') {
          console.log(`${modelConfig.name} returned empty content, trying next model`);
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

        // Check for banned phrases
        const banned = ['random object', 'empty room', 'abstract shapes', 'generic photo'];
        const fails = out.concepts.some((c: any) =>
          typeof c?.text === 'string' && banned.some(b => c.text.toLowerCase().includes(b))
        );
        
        if (fails) {
          console.log(`${modelConfig.name} contained banned phrases, trying next model`);
          continue;
        }

        // Success!
        console.log(`${modelConfig.name} succeeded`);
        return new Response(
          JSON.stringify({ success: true, model: modelConfig.name, concepts: out.concepts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error(`${modelConfig.name} error:`, error);
        continue;
      }
    }

    // All models failed
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'All models failed to generate valid concepts',
      attempted_models: MODELS.map(m => m.name)
    }), {
      status: 500,
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