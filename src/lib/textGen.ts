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
- Each line must be ≤ 100 characters
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

5. TAG RULES (STRICTLY ENFORCED):
- If no tags → generate normally
- If tags exist: At least 3 out of 4 lines must include ALL tags literally (not synonyms)
- Tags must appear in different spots in the line
- Do not skip tags in more than 1 line

6. VARIETY:
- Create 4 distinct options with varied approaches
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
      
      // Hard character limit of 100
      if (line.text.length > 100) {
        return null;
      }
    }
    
    return parsed as TextGenOutput;
  } catch {
    return null;
  }
}

function buildUserMessage(inputs: TextGenInput): string {
  const tagsStr = inputs.tags.length > 0 ? `, tags: [${inputs.tags.map(t => `"${t}"`).join(",")}]` : "";
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}`;
}

const FALLBACK_LINES: TextGenOutput = {
  lines: [
    { lane: "option1", text: "When life gives you moments, make memes." },
    { lane: "option2", text: "Plot twist: this actually happened." },
    { lane: "option3", text: "Based on a true story, unfortunately." },
    { lane: "option4", text: "Reality called, it wants its drama back." }
  ]
};

function gentleAutoFix(text: string): string {
  let fixed = text
    .trim() // Remove leading/trailing whitespace
    .replace(/—/g, '-') // Replace em-dashes with hyphens
    .replace(/--+/g, '-'); // Replace multiple dashes with single dash
  
  // Trim to 100 chars at word boundary to avoid mid-word cuts
  if (fixed.length > 100) {
    const truncated = fixed.substring(0, 100);
    const lastSpace = truncated.lastIndexOf(' ');
    fixed = lastSpace > 80 ? truncated.substring(0, lastSpace) : truncated;
  }
  
  // Ensure proper ending punctuation
  if (!/[.!?]$/.test(fixed)) {
    fixed += '.';
  }
  
  return fixed;
}

function parseModelResponse(modelString: string): { modelName: string; status: string | null } {
  const parts = modelString.split(' (');
  const modelName = parts[0];
  const status = parts.length > 1 ? parts[1].replace(')', '') : null;
  return { modelName, status };
}

export async function generateStep2Lines(inputs: TextGenInput): Promise<{
  lines: Array<{ lane: string; text: string }>;
  model: string;
  modelName: string;
  status: string | null;
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
        model: "fallback",
        modelName: "fallback",
        status: null
      };
    }

    const { modelName, status } = parseModelResponse(data.model);
    
    // Apply gentle auto-fix for raw-unvalidated responses
    let processedLines = data.lines;
    if (status === 'raw-unvalidated') {
      processedLines = data.lines.map(line => ({
        ...line,
        text: gentleAutoFix(line.text)
      }));
      console.log('🔧 Applied gentle auto-fix to raw-unvalidated lines');
    }

    return {
      lines: processedLines,
      model: data.model,
      modelName,
      status
    };
  } catch (error) {
    console.error("Text generation error:", error);
    return {
      lines: FALLBACK_LINES.lines,
      model: "fallback",
      modelName: "fallback",
      status: null
    };
  }
}