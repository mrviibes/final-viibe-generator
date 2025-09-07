import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Return ONLY JSON:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

RULES:
- 4 one-liners, max 70 chars each
- Vary length (~40, ~55-60, ~65-70)
- Subcategory anchors required: cake, candles, balloons, confetti, party hats, gifts for Birthday
- If TAGS provided, at least 3 of 4 must include them literally. Place tags differently each time
- No em-dash or "--"
- Ban generic phrases: "another year," "getting older," "best medicine," "timing is everything"
- All 4 lines must be distinct (different angles: props, crowd, skills, absurd twist)

TONE SAVAGE = Comedy Central roast. Brutal, clever, no clichés.
Must be funny, human, and harsh, not generic birthday lines.
Write like a roast comic: punchlines must sting. Avoid Hallmark card style.
Every line should feel like a roast, not a dad joke.`;

// Savage roast templates for birthday fallbacks
const SAVAGE_BIRTHDAY_TEMPLATES = [
  "{name}'s birthday cake collapsed harder than {pronoun} career.",
  "Even the balloons left, {name}. Happy birthday to a ghost town.",
  "{name} blew the candles. The fire marshal called it arson.",
  "Confetti refused to drop, {name}. Happy birthday, you flop.",
  "The cake's sweeter than {name}'s personality, somehow.",
  "{name}'s candles burned out faster than {pronoun} last relationship.",
  "Balloons have more life than {name}'s birthday party energy.",
  "The gift that keeps giving? {name}'s endless disappointments."
];

const FALLBACK_LINES = {
  lines: [
    { lane: "option1", text: "When life gives you moments, make memes." },
    { lane: "option2", text: "Plot twist: this actually happened." },
    { lane: "option3", text: "Based on a true story, unfortunately." },
    { lane: "option4", text: "Reality called, it wants its drama back." }
  ]
};

function generateSavageFallback(inputs: any): any {
  if (inputs.subcategory === "Birthday" && inputs.tone === "Savage") {
    const templates = [...SAVAGE_BIRTHDAY_TEMPLATES];
    const lines = [];
    
    for (let i = 0; i < 4; i++) {
      const template = templates.splice(Math.floor(Math.random() * templates.length), 1)[0];
      let text = template;
      
      // Replace with tags if available
      if (inputs.tags && inputs.tags.length > 0) {
        const name = inputs.tags.find((tag: string) => tag.toLowerCase() !== 'happy birthday') || inputs.tags[0];
        text = text.replace(/{name}/g, name);
        text = text.replace(/{pronoun}/g, 'their');
      } else {
        text = text.replace(/{name}/g, 'Birthday person');
        text = text.replace(/{pronoun}/g, 'their');
      }
      
      // Ensure under 70 chars
      if (text.length > 70) {
        text = text.substring(0, 67) + "...";
      }
      
      lines.push({
        lane: `option${i + 1}`,
        text: text
      });
    }
    
    return { lines };
  }
  
  return FALLBACK_LINES;
}

function buildUserMessage(inputs: any): string {
  const tagsStr = inputs.tags && inputs.tags.length > 0 ? `, tags: [${inputs.tags.map((t: string) => `"${t}"`).join(",")}]` : "";
  
  let anchorsStr = "";
  if (inputs.subcategory === "Birthday") {
    anchorsStr = "\nANCHORS: cake, candles, balloons, confetti, party hats, gifts";
  }
  
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}${anchorsStr}`;
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
  
  // Check for banned generic phrases (aggressive filtering)
  const bannedPhrases = [
    "another year", "getting older", "best medicine", "timing is everything",
    "truth hurts", "laughter is", "birthday wishes", "special day",
    "one more year", "growing older", "age is just", "celebrate you"
  ];
  
  const hasGenericContent = parsed.lines.some((line: any) => 
    bannedPhrases.some(phrase => line.text.toLowerCase().includes(phrase.toLowerCase()))
  );
  
  if (hasGenericContent && inputs.tone === "Savage") {
    throw new Error("Generic birthday content detected in savage mode");
  }
  
  // Repair each line with strict enforcement
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
    
    // STRICT: Ensure birthday anchors on ALL lines if Birthday
    if (inputs.subcategory === "Birthday") {
      const anchors = ["cake", "candles", "balloons", "confetti", "party hats", "gifts"];
      const hasAnchor = anchors.some(anchor => text.toLowerCase().includes(anchor.toLowerCase()));
      if (!hasAnchor) {
        // Force add an anchor 
        const anchor = anchors[index % anchors.length];
        if (text.length + anchor.length + 8 <= 70) {
          text = text.replace(/[.!]$/, '') + ` with ${anchor}.`;
          repairs.push(`Force-added birthday anchor "${anchor}" to line ${index + 1}`);
        }
      }
    }
    
    // STRICT: Ensure tags on 3 of 4 lines if provided
    if (inputs.tags && inputs.tags.length > 0 && index < 3) {
      const allTagsPresent = inputs.tags.every((tag: string) => 
        text.toLowerCase().includes(tag.toLowerCase())
      );
      
      if (!allTagsPresent) {
        const missingTags = inputs.tags.filter((tag: string) => 
          !text.toLowerCase().includes(tag.toLowerCase())
        );
        
        if (missingTags.length > 0) {
          const tag = missingTags[0];
          if (text.length + tag.length + 5 <= 70) {
            // Strategic placement: beginning, middle, or end
            const placements = [
              `${tag}, ${text.replace(/^[A-Z]/, (m) => m.toLowerCase())}`,
              text.replace(/,/, `, ${tag},`),
              text.replace(/[.!]$/, '') + `, ${tag}.`
            ];
            
            const placement = placements[index % placements.length];
            if (placement.length <= 70) {
              text = placement;
              repairs.push(`Force-added tag "${tag}" to line ${index + 1}`);
            }
          }
        }
      }
    }
    
    return {
      lane: line.lane || `option${index + 1}`,
      text: text.trim()
    };
  });
  
  // STRICT length variety enforcement
  const lengths = processedLines.map(line => line.text.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  
  // Must have at least 20 char spread for variety
  if (maxLen - minLen < 20) {
    // Force variety by adjusting to target bands
    const targetBands = [
      { min: 35, max: 45 },  // Short
      { min: 50, max: 60 },  // Medium
      { min: 60, max: 68 },  // Long
      { min: 68, max: 70 }   // Max
    ];
    
    processedLines.forEach((line, index) => {
      const targetBand = targetBands[index];
      const currentLen = line.text.length;
      
      if (currentLen < targetBand.min) {
        // Expand
        const additions = [", obviously", ", naturally", ", clearly", ", honestly"];
        const addition = additions[index % additions.length];
        if (currentLen + addition.length <= targetBand.max) {
          line.text += addition;
        }
      } else if (currentLen > targetBand.max) {
        // Contract by removing words from end
        const words = line.text.split(' ');
        while (words.join(' ').length > targetBand.max && words.length > 3) {
          words.pop();
        }
        line.text = words.join(' ') + '.';
      }
    });
    repairs.push("Force-adjusted line lengths for strict variety");
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
    
    // STRICT validation
    const lengths: number[] = [];
    
    for (const line of lines) {
      const length = line.text.length;
      lengths.push(length);
      
      if (length > 70) {
        errors.push(`Line still too long after repair (${length} chars): "${line.text}"`);
      }
      
      if (length < 25) {
        errors.push(`Line too short (${length} chars): "${line.text}"`);
      }
    }
    
    // STRICT variety check - must have at least 15 char spread
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const lengthRange = maxLength - minLength;
    
    if (lengthRange < 15) {
      errors.push(`Insufficient length variety after repair. Range: ${lengthRange}, need ≥15`);
    }
    
    // STRICT tag validation for Savage Birthday
    if (inputs.tags && inputs.tags.length > 0 && inputs.tone === "Savage") {
      const linesWithAllTags = lines.filter((line: any) => 
        inputs.tags.every((tag: string) => line.text.toLowerCase().includes(tag.toLowerCase()))
      );
      
      if (linesWithAllTags.length < 3) {
        errors.push(`Only ${linesWithAllTags.length}/4 lines contain all tags. Need ≥3 for Savage mode`);
      }
    }
    
    // STRICT anchor validation for Birthday
    if (inputs.subcategory === "Birthday") {
      const anchors = ["cake", "candles", "balloons", "confetti", "party", "gifts"];
      const linesWithAnchors = lines.filter((line: any) => 
        anchors.some(anchor => line.text.toLowerCase().includes(anchor.toLowerCase()))
      );
      
      if (linesWithAnchors.length < 4) {
        errors.push(`Only ${linesWithAnchors.length}/4 lines contain birthday anchors. All must have anchors`);
      }
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
      const fallback = generateSavageFallback({ category, subcategory, tone, tags });
      return new Response(JSON.stringify({
        lines: fallback.lines,
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

PREVIOUS ATTEMPT FAILED VALIDATION. Generate 4 COMPLETELY DIFFERENT savage roast lines:
- MUST be Comedy Central roast style, not dad jokes
- EXACTLY 70 chars max, vary lengths: one ~40, one ~55-60, one ~65-70  
- ALL 4 lines must include birthday anchors (cake/candles/balloons/confetti/party hats/gifts)
- 3 of 4 lines must include ALL tags literally if provided
- NO generic phrases like "another year", "getting older"
- BRUTAL and CLEVER, not Hallmark card style`;

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
              max_completion_tokens: 500,
              response_format: { type: "json_object" }
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
      const fallback = generateSavageFallback({ category, subcategory, tone, tags });
      return new Response(JSON.stringify({
        lines: fallback.lines,
        model: "savage-fallback",
        errors: allErrors
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    const fallback = generateSavageFallback({ category: "Celebrations", subcategory: "Birthday", tone: "Savage", tags: [] });
    return new Response(JSON.stringify({
      lines: fallback.lines,
      model: "error-fallback",
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});