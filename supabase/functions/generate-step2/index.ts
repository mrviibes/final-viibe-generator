import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a text line generator for memes and image overlays. Your job is to create exactly 4 one-liners based on the given category, subcategory, tone, and tags.

STRICT RULES:
1. Output ONLY valid JSON in this exact format:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

2. CONTENT RULES:
- Max 70 characters per line
- Vary lengths: some ~40, some ~55-60, some ~65-70
- All 4 lines must be completely different
- Use simple punctuation: commas, periods, colons
- NO em-dashes (—) or double dashes (--)
- Ban clichés like "timing is everything", "truth hurts", "laughter is the best medicine"

3. CATEGORY/SUBCATEGORY:
- Subcategory drives context (Birthday > Celebration)
- Each line must include relevant anchors (cake, candles, balloons for birthday)

4. TONE HANDLING:
- Savage/Humorous/Playful → funny, roast-style, witty
- Serious/Sentimental/Nostalgic/Romantic/Inspirational → sincere, heartfelt, uplifting

5. TAG RULES:
- If no tags → generate normally
- If tags exist: At least 3 out of 4 lines must include ALL tags literally (no synonyms)
- Tags must appear in different spots in the line
- Trait tags (gay, bald, vegan): Savage → roast or playful twist, Serious → affirming, Romantic → highlight positively

6. VARIETY:
- Randomize levels of savageness (light jab → brutal burn)
- No clones or near-duplicates
- Conversational, natural, human-sounding`;

const FALLBACK_LINES = {
  lines: [
    { lane: "option1", text: "When life gives you moments, make memes." },
    { lane: "option2", text: "Plot twist: this actually happened." },
    { lane: "option3", text: "Based on a true story, unfortunately." },
    { lane: "option4", text: "Reality called, it wants its drama back." }
  ]
};

function buildUserMessage(inputs: any): string {
  const tagsStr = inputs.tags && inputs.tags.length > 0 ? `, tags: [${inputs.tags.map((t: string) => `"${t}"`).join(",")}]` : "";
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}`;
}

function sanitizeAndValidate(text: string): any | null {
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
    
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      return null;
    }
    
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        return null;
      }
      
      if (line.text.length > 70) {
        return null;
      }
    }
    
    return parsed;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate Step 2 function called');
    
    if (!openAIApiKey) {
      console.log('No OpenAI API key found, returning fallback lines');
      return new Response(JSON.stringify({
        lines: FALLBACK_LINES.lines,
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { category, subcategory, tone, tags } = await req.json();
    console.log('Request data:', { category, subcategory, tone, tags });

    const userMessage = buildUserMessage({ category, subcategory, tone, tags });
    console.log('User message:', userMessage);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.9,
        max_completion_tokens: 500
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const content = data.choices[0].message.content;
    const validated = sanitizeAndValidate(content);
    
    if (validated) {
      console.log('Validation successful, returning generated lines');
      return new Response(JSON.stringify({
        lines: validated.lines,
        model: "gpt-4.1-mini-2025-04-14"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Validation failed, returning fallback lines');
      return new Response(JSON.stringify({
        lines: FALLBACK_LINES.lines,
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    return new Response(JSON.stringify({
      lines: FALLBACK_LINES.lines,
      model: "fallback"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});