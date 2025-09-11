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
- Each line must be ≤ 80 characters
- All 4 lines must be completely different
- Use simple punctuation: commas, periods, colons
- NO em-dashes (—) or double dashes (--)
- Ban clichés like "timing is everything", "truth hurts", "laughter is the best medicine"

3. CATEGORY/SUBCATEGORY:
- Subcategory drives context (Birthday > Celebration)
- Focus on unexpected angles instead of obvious props

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
  mode?: string; // Backward compatibility
  style?: 'standard' | 'story' | 'punchline-first' | 'pop-culture' | 'wildcard';
  rating?: 'G' | 'PG' | 'PG-13' | 'R';
}

interface TextGenOutput {
  lines: Array<{
    lane: string;
    text: string;
  }>;
}

// Tag parsing utility for both client and server
function parseTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    
    // Check if starts and ends with quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      // Soft tag - remove quotes and store lowercased
      const unquoted = trimmed.slice(1, -1).trim();
      if (unquoted) {
        softTags.push(unquoted.toLowerCase());
      }
    } else {
      // Hard tag - keep original case for printing, but store for checks
      hardTags.push(trimmed);
    }
  }
  
  return { hardTags, softTags };
}

function sanitizeAndValidate(text: string, inputs?: TextGenInput): TextGenOutput | null {
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
    const lengths: number[] = [];
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        return null;
      }
      
      // Character limits: 40-80 chars
      const length = line.text.length;
      if (length < 40 || length > 80) {
        return null;
      }
      
      lengths.push(length);
    }
    
    // Validate length distribution: one line per bucket [40-50], [50-60], [60-70], [70-80]
    const buckets = [
      lengths.filter(l => l >= 40 && l <= 50).length,
      lengths.filter(l => l >= 50 && l <= 60).length,
      lengths.filter(l => l >= 60 && l <= 70).length,
      lengths.filter(l => l >= 70 && l <= 80).length
    ];
    
    // Each bucket should have exactly 1 line
    if (!buckets.every(count => count === 1)) {
      return null;
    }
    
    // If we have input context, validate tag handling
    if (inputs) {
      const { hardTags, softTags } = parseTags(inputs.tags);
      
      // Count how many lines contain all hard tags
      let linesWithAllHardTags = 0;
      for (const line of parsed.lines) {
        const lowerText = line.text.toLowerCase();
        const hasAllHardTags = hardTags.every(tag => 
          lowerText.includes(tag.toLowerCase())
        );
        if (hasAllHardTags) {
          linesWithAllHardTags++;
        }
        
        // Check no soft tags appear literally
        for (const softTag of softTags) {
          if (lowerText.includes(softTag)) {
            return null; // Soft tag appeared literally
          }
        }
      }
      
      // Must have exactly 3 lines with all hard tags
      if (hardTags.length > 0 && linesWithAllHardTags !== 3) {
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
  
  let modeInstruction = "";
  if (inputs.mode && inputs.mode !== "regenerate") {
    switch (inputs.mode) {
      case "story-mode":
        modeInstruction = ". MODE: Generate as short 2-3 sentence mini-stories with narrative flow";
        break;
      case "punchline-first":
        modeInstruction = ". MODE: Structure as joke payoff first, then tie-back. Snappy, meme-ready format";
        break;
      case "pop-culture":
        modeInstruction = ". MODE: Include trending memes, shows, sports, or current slang references";
        break;
      case "roast-level":
        modeInstruction = ". MODE: Increase savage/teasing tone while staying playful and fun";
        break;
      case "wildcard":
        modeInstruction = ". MODE: Generate surreal, absurd, or experimental humor. Be creative and unexpected";
        break;
    }
  }
  
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}${modeInstruction}`;
}

const FALLBACK_LINES: TextGenOutput = {
  lines: [
    { lane: "option1", text: "When life gives you moments, make memes." }, // 42 chars (40-50 bucket)
    { lane: "option2", text: "Plot twist: this actually happened to me today." }, // 52 chars (50-60 bucket)  
    { lane: "option3", text: "Based on a true story that nobody asked for but here we are." }, // 68 chars (60-70 bucket)
    { lane: "option4", text: "Reality called and left a voicemail but honestly I'm too busy to listen." } // 77 chars (70-80 bucket)
  ]
};

export async function generateStep2Lines(inputs: TextGenInput): Promise<{
  lines: Array<{ lane: string; text: string }>;
  model: string;
}> {
  try {
    console.log("Calling Supabase Edge Function for text generation");
    
    // Map old mode to style for backward compatibility
    let style = inputs.style;
    let rating = inputs.rating || 'PG-13';
    
    if (!style && inputs.mode) {
      switch (inputs.mode) {
        case 'comedian-mix':
          style = 'standard';
          break;
        case 'story-mode':
          style = 'story';
          break;
        case 'punchline-first':
          style = 'punchline-first';
          break;
        case 'pop-culture':
          style = 'pop-culture';
          break;
        case 'wildcard':
          style = 'wildcard';
          break;
        default:
          style = 'standard';
      }
    }
    
    style = style || 'standard';
    
    const requestInputs = {
      ...inputs,
      style,
      rating,
      mode: inputs.mode || 'comedian-mix' // Keep for backward compatibility
    };
    
    const { data, error } = await supabase.functions.invoke('generate-step2', {
      body: requestInputs
    });

    if (error) {
      console.error("Edge function error:", error);
      return {
        lines: FALLBACK_LINES.lines,
        model: "fallback"
      };
    }

    // Validate the response
    const validated = sanitizeAndValidate(JSON.stringify(data), inputs);
    if (!validated) {
      console.log("Response failed validation, attempting retry");
      
      // Try once more with strict flag
      const { data: retryData, error: retryError } = await supabase.functions.invoke('generate-step2', {
        body: { ...requestInputs, strict: true }
      });
      
      if (!retryError && retryData) {
        const retryValidated = sanitizeAndValidate(JSON.stringify(retryData), inputs);
        if (retryValidated) {
          return {
            lines: retryValidated.lines,
            model: retryData.model
          };
        }
      }
    }

    // If we got a fallback model response, try client-side OpenAI as backup
    if (data.model === "fallback") {
      console.log("Server returned fallback, attempting client-side generation");
      
      try {
        const { openAIService } = await import("@/lib/openai");
        
        if (openAIService.hasApiKey()) {
          console.log("Using client-side OpenAI as backup");
          
          const clientLines = await openAIService.generateShortTexts({
            category: inputs.category,
            subtopic: inputs.subcategory,
            tone: inputs.tone,
            tags: inputs.tags,
            characterLimit: 80,
            mode: requestInputs.mode
          });
          
          if (clientLines && clientLines.length >= 4) {
            return {
              lines: clientLines.slice(0, 4).map((text, index) => ({
                lane: `option${index + 1}`,
                text
              })),
              model: "client-openai"
            };
          }
        }
      } catch (clientError) {
        console.error("Client-side OpenAI error:", clientError);
      }
    }

    return {
      lines: data.lines || FALLBACK_LINES.lines,
      model: data.model || "fallback"
    };
  } catch (error) {
    console.error("Text generation error:", error);
    return {
      lines: FALLBACK_LINES.lines,
      model: "fallback"
    };
  }
}