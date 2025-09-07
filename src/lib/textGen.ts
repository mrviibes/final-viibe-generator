import { supabase } from "@/integrations/supabase/client";

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

interface TextGenInput {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
}

interface TextGenOutput {
  lines: Array<{
    lane: string;
    text: string;
  }>;
}

function buildUserMessage(inputs: TextGenInput): string {
  const tagsStr = inputs.tags.length > 0 ? `, tags: [${inputs.tags.map(t => `"${t}"`).join(",")}]` : "";
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}`;
}

function sanitizeAndValidate(text: string): TextGenOutput | null {
  try {
    // Clean up the response
    let cleaned = text.trim();
    
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
    
    // Parse JSON
    const parsed = JSON.parse(cleaned);
    
    // Validate structure
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      return null;
    }
    
    // Validate each line
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        return null;
      }
      
      // Updated character limit for longer options
      if (line.text.length > 100) {
        return null;
      }
    }
    
    // Check for length variety
    const lengths = parsed.lines.map((line: any) => line.text.length);
    const lengthRange = Math.max(...lengths) - Math.min(...lengths);
    
    // Require at least 30 characters difference between shortest and longest
    if (lengthRange < 30) {
      return null;
    }
    
    return parsed as TextGenOutput;
  } catch {
    return null;
  }
}

const FALLBACK_LINES: TextGenOutput = {
  lines: [
    { lane: "option1", text: "When life gives you moments, make memes." },
    { lane: "option2", text: "Plot twist: this actually happened." },
    { lane: "option3", text: "Based on a true story, unfortunately." },
    { lane: "option4", text: "Reality called, it wants its drama back." }
  ]
};

export async function generateStep2Lines(inputs: TextGenInput): Promise<{
  lines: Array<{ lane: string; text: string }>;
  model: string;
}> {
  try {
    console.log("Calling Supabase Edge Function for text generation");
    
    const { data, error } = await supabase.functions.invoke('generate-step2', {
      body: inputs
    });

    if (error) {
      console.error("Edge function error:", error);
      return {
        lines: FALLBACK_LINES.lines,
        model: "fallback"
      };
    }

    return {
      lines: data.lines,
      model: data.model
    };
  } catch (error) {
    console.error("Text generation error:", error);
    return {
      lines: FALLBACK_LINES.lines,
      model: "fallback"
    };
  }
}