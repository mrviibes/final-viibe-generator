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

function sanitizeAndValidate(text: string, inputs: any): { result: any | null; errors: string[] } {
  const errors: string[] = [];
  
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
    
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      errors.push("Must have exactly 4 lines");
      return { result: null, errors };
    }
    
    // Check each line
    const lengths: number[] = [];
    const bannedPhrases = ["timing is everything", "truth hurts", "laughter is the best medicine"];
    const bannedPunctuation = ["—", "--"];
    
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        errors.push(`Invalid line structure: ${JSON.stringify(line)}`);
        continue;
      }
      
      const text = line.text;
      const length = text.length;
      lengths.push(length);
      
      // Check max length
      if (length > 70) {
        errors.push(`Line too long (${length} chars): "${text}"`);
      }
      
      // Check banned punctuation
      for (const banned of bannedPunctuation) {
        if (text.includes(banned)) {
          errors.push(`Contains banned punctuation "${banned}": "${text}"`);
        }
      }
      
      // Check banned clichés
      for (const banned of bannedPhrases) {
        if (text.toLowerCase().includes(banned.toLowerCase())) {
          errors.push(`Contains banned cliché "${banned}": "${text}"`);
        }
      }
    }
    
    // Check length variety (should have some ~40, some ~55-60, some ~65-70)
    const hasShort = lengths.some(l => l >= 35 && l <= 45);
    const hasMedium = lengths.some(l => l >= 50 && l <= 65);
    const hasLong = lengths.some(l => l >= 60 && l <= 70);
    
    if (!hasShort || !hasMedium || !hasLong) {
      errors.push(`Poor length variety. Lengths: ${lengths.join(", ")}. Need some ~40, ~55-60, ~65-70`);
    }
    
    // Check tag inclusion if tags exist
    if (inputs.tags && inputs.tags.length > 0) {
      let linesWithAllTags = 0;
      
      for (const line of parsed.lines) {
        const text = line.text.toLowerCase();
        const hasAllTags = inputs.tags.every((tag: string) => 
          text.includes(tag.toLowerCase())
        );
        
        if (hasAllTags) {
          linesWithAllTags++;
        }
      }
      
      if (linesWithAllTags < 3) {
        errors.push(`Only ${linesWithAllTags}/4 lines contain all tags. Need at least 3/4. Tags: [${inputs.tags.join(", ")}]`);
      }
    }
    
    // Check anchors for Birthday subcategory
    if (inputs.subcategory === "Birthday") {
      const anchors = ["cake", "candles", "balloons", "confetti", "party", "birthday", "wish", "blow"];
      let linesWithAnchors = 0;
      
      for (const line of parsed.lines) {
        const text = line.text.toLowerCase();
        const hasAnchor = anchors.some(anchor => text.includes(anchor));
        if (hasAnchor) {
          linesWithAnchors++;
        }
      }
      
      if (linesWithAnchors < 3) {
        errors.push(`Only ${linesWithAnchors}/4 lines contain birthday anchors. Need at least 3/4`);
      }
    }
    
    return { result: errors.length === 0 ? parsed : null, errors };
  } catch (e) {
    errors.push(`JSON parsing failed: ${e.message}`);
    return { result: null, errors };
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
        model: 'gpt-4.1-2025-04-14',
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
    console.log('Raw OpenAI response:', content);
    
    const { result: validated, errors } = sanitizeAndValidate(content, { category, subcategory, tone, tags });
    
    if (validated) {
      console.log('Validation successful, returning generated lines');
      return new Response(JSON.stringify({
        lines: validated.lines,
        model: "gpt-4.1-2025-04-14"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Validation failed with errors:', errors);
      
      // Self-repair: Try one more time with error feedback
      console.log('Attempting self-repair with error feedback');
      
      const repairPrompt = `${userMessage}

PREVIOUS ATTEMPT FAILED WITH THESE ERRORS:
${errors.join('\n')}

Please fix these issues and generate 4 new lines that follow ALL the rules exactly.`;

      try {
        const repairResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: repairPrompt }
            ],
            temperature: 0.9,
            max_completion_tokens: 500
          }),
        });

        if (repairResponse.ok) {
          const repairData = await repairResponse.json();
          const repairContent = repairData.choices[0].message.content;
          console.log('Repair attempt response:', repairContent);
          
          const { result: repairedValidated, errors: repairErrors } = sanitizeAndValidate(repairContent, { category, subcategory, tone, tags });
          
          if (repairedValidated) {
            console.log('Self-repair successful, returning repaired lines');
            return new Response(JSON.stringify({
              lines: repairedValidated.lines,
              model: "gpt-4.1-2025-04-14-repaired"
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            console.log('Self-repair also failed with errors:', repairErrors);
          }
        }
      } catch (repairError) {
        console.error('Self-repair attempt failed:', repairError);
      }
      
      console.log('Both attempts failed, returning fallback lines');
      return new Response(JSON.stringify({
        lines: FALLBACK_LINES.lines,
        model: "fallback",
        errors: errors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    return new Response(JSON.stringify({
      lines: FALLBACK_LINES.lines,
      model: "fallback",
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});