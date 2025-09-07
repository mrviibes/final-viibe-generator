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

function normalizeAndRepairText(rawText: string, inputs: any): { lines: any[], repairs: string[] } {
  const repairs: string[] = [];
  let processedText = rawText.trim();
  
  // Strip code fences
  processedText = processedText.replace(/```json\s*|\s*```/g, '');
  
  let parsed;
  try {
    parsed = JSON.parse(processedText);
  } catch (e) {
    repairs.push("Fixed JSON parsing error");
    // Try to extract lines manually if JSON is malformed
    const lineMatches = processedText.match(/"text":\s*"([^"]+)"/g);
    if (lineMatches && lineMatches.length >= 4) {
      parsed = {
        lines: lineMatches.slice(0, 4).map((match, i) => ({
          lane: `option${i + 1}`,
          text: match.match(/"text":\s*"([^"]+)"/)[1]
        }))
      };
    } else {
      throw new Error("Could not extract lines from malformed JSON");
    }
  }
  
  if (!parsed.lines || !Array.isArray(parsed.lines)) {
    throw new Error("No valid lines found");
  }
  
  // Ensure exactly 4 lines
  if (parsed.lines.length > 4) {
    parsed.lines = parsed.lines.slice(0, 4);
    repairs.push("Trimmed to 4 lines");
  } else if (parsed.lines.length < 4) {
    while (parsed.lines.length < 4) {
      parsed.lines.push({
        lane: `option${parsed.lines.length + 1}`,
        text: "Life's full of surprises, this is one of them."
      });
    }
    repairs.push("Added missing lines to reach 4");
  }
  
  // Repair each line
  const targetLengths = [40, 58, 66, 70]; // Target variety
  const processedLines = parsed.lines.map((line: any, index: number) => {
    let text = line.text || "";
    const originalText = text;
    
    // Normalize typography
    text = text.replace(/[""]/g, '"').replace(/['']/g, "'");
    
    // Replace banned punctuation
    text = text.replace(/—/g, '-').replace(/--/g, '-');
    
    // Apply contractions if it helps with length
    text = text.replace(/\byou would\b/gi, "you'd")
             .replace(/\byou will\b/gi, "you'll")
             .replace(/\byou have\b/gi, "you've")
             .replace(/\byou are\b/gi, "you're")
             .replace(/\bit is\b/gi, "it's")
             .replace(/\bthat is\b/gi, "that's")
             .replace(/\bcannot\b/gi, "can't")
             .replace(/\bdo not\b/gi, "don't")
             .replace(/\bwill not\b/gi, "won't");
    
    // Smart truncation if too long
    if (text.length > 70) {
      const targetLen = Math.min(70, targetLengths[index] || 65);
      // Try to cut at a word boundary near target
      const words = text.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).length <= targetLen) {
          truncated += (truncated ? ' ' : '') + word;
        } else {
          break;
        }
      }
      
      if (truncated.length < 30) {
        // Fallback: hard truncate
        truncated = text.substring(0, targetLen - 3) + '...';
      }
      
      text = truncated;
      repairs.push(`Truncated line ${index + 1} from ${originalText.length} to ${text.length} chars`);
    }
    
    // Ensure birthday anchors if needed
    if (inputs.subcategory === "Birthday") {
      const anchors = ["cake", "candles", "balloons", "party", "birthday", "wish"];
      const hasAnchor = anchors.some(anchor => text.toLowerCase().includes(anchor));
      if (!hasAnchor && index < 3) {
        // Add a birthday anchor if line is short enough
        const anchor = anchors[index % anchors.length];
        if (text.length + anchor.length + 5 <= 70) {
          text = text.replace(/\.$/, `, ${anchor} included.`);
          repairs.push(`Added birthday anchor "${anchor}" to line ${index + 1}`);
        }
      }
    }
    
    // Ensure tags if provided
    if (inputs.tags && inputs.tags.length > 0 && index < 3) {
      const missingTags = inputs.tags.filter((tag: string) => 
        !text.toLowerCase().includes(tag.toLowerCase())
      );
      
      if (missingTags.length > 0 && text.length + missingTags[0].length + 5 <= 70) {
        text = text.replace(/\.$/, `, ${missingTags[0]} vibes.`);
        repairs.push(`Added missing tag "${missingTags[0]}" to line ${index + 1}`);
      }
    }
    
    return {
      lane: line.lane || `option${index + 1}`,
      text: text.trim()
    };
  });
  
  // Final length variety adjustment
  const lengths = processedLines.map(line => line.text.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  
  if (maxLen - minLen < 15) {
    // Artificially adjust lengths to create variety
    processedLines.forEach((line, index) => {
      const targetRange = [35, 55, 65, 70][index] || 60;
      if (Math.abs(line.text.length - targetRange) > 10) {
        if (line.text.length < targetRange - 5) {
          // Expand if too short
          line.text += index % 2 === 0 ? ", right?" : ", obviously.";
        } else if (line.text.length > targetRange + 5) {
          // Contract if too long
          line.text = line.text.substring(0, targetRange - 3) + "...";
        }
      }
    });
    repairs.push("Adjusted line lengths for better variety");
  }
  
  return { lines: processedLines, repairs };
}

function sanitizeAndValidate(text: string, inputs: any): { result: any | null; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const { lines, repairs } = normalizeAndRepairText(text, inputs);
    
    if (repairs.length > 0) {
      console.log('Post-processing repairs applied:', repairs);
    }
    
    // Basic validation on repaired lines
    const lengths: number[] = [];
    
    for (const line of lines) {
      const length = line.text.length;
      lengths.push(length);
      
      if (length > 70) {
        errors.push(`Line still too long after repair (${length} chars): "${line.text}"`);
      }
      
      if (length < 20) {
        errors.push(`Line too short (${length} chars): "${line.text}"`);
      }
    }
    
    // Check basic variety
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const lengthRange = maxLength - minLength;
    
    if (lengthRange < 10) {
      errors.push(`Insufficient length variety after repair. Range: ${lengthRange}`);
    }
    
    return { result: errors.length === 0 ? { lines } : null, errors };
  } catch (e) {
    errors.push(`Post-processing failed: ${e.message}`);
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

    // Try up to 2 LLM attempts with post-processing
    let finalResult = null;
    let finalModel = "fallback";
    let allErrors: string[] = [];
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`LLM attempt ${attempt}/2`);
      
      try {
        const promptToUse = attempt === 1 ? userMessage : `${userMessage}

PREVIOUS ATTEMPT HAD ISSUES. Please generate 4 completely different lines that strictly follow these rules:
- Max 70 characters each
- Vary lengths: ~40, ~55-60, ~65-70 characters  
- Use only simple punctuation (no em-dashes or --)
- Include birthday anchors if subcategory is Birthday
- Include all tags if provided`;

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
              { role: 'user', content: promptToUse }
            ],
            max_completion_tokens: 500
          }),
        });

        if (!response.ok) {
          console.error(`OpenAI API error on attempt ${attempt}:`, response.status, response.statusText);
          allErrors.push(`Attempt ${attempt}: OpenAI API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log(`Attempt ${attempt} raw response:`, content);
        
        // Always apply post-processing
        const { result: processed, errors } = sanitizeAndValidate(content, { category, subcategory, tone, tags });
        
        if (processed) {
          console.log(`Attempt ${attempt} successful with post-processing`);
          finalResult = processed;
          finalModel = `gpt-4.1-2025-04-14${attempt > 1 ? '-retry' : ''}+postprocessed`;
          break;
        } else {
          console.log(`Attempt ${attempt} failed even with post-processing:`, errors);
          allErrors.push(...errors.map(e => `Attempt ${attempt}: ${e}`));
        }
        
      } catch (attemptError) {
        console.error(`Attempt ${attempt} failed with exception:`, attemptError);
        allErrors.push(`Attempt ${attempt}: ${attemptError.message}`);
      }
    }
    
    if (finalResult) {
      console.log('Returning successful result:', finalModel);
      return new Response(JSON.stringify({
        lines: finalResult.lines,
        model: finalModel
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('All attempts failed, returning fallback lines with errors:', allErrors);
      return new Response(JSON.stringify({
        lines: FALLBACK_LINES.lines,
        model: "fallback",
        errors: allErrors
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