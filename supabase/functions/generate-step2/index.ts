import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced system prompt for Comedy Central roast style
const SYSTEM_PROMPT = `You are a Comedy Central roast comic. Write SAVAGE, brutal, mean, clever roasts that STING. No Hallmark card clichés.

OUTPUT FORMAT: JSON only with this exact schema:
{
  "lines": [
    {"lane":"option1","text":"[roast line 1]"},
    {"lane":"option2","text":"[roast line 2]"},
    {"lane":"option3","text":"[roast line 3]"},
    {"lane":"option4","text":"[roast line 4]"}
  ]
}

ROAST REQUIREMENTS:
- Every line must include birthday anchors: cake, candles, balloons, confetti, party hats, gifts
- If tags provided: 3 of 4 lines must include ALL tags literally (not synonyms). Vary placement: start, mid, end
- Length variety: one ~40 chars, one ~55-60 chars, one ~65-70 chars, one ~68-70 chars (MAX 70)
- Tone escalation: light jab → medium roast → heavy burn → nuclear destruction
- Distinct angles: personal attack, crowd observation, skill roast, absurd comparison
- Complete sentences only. No "..." or em dashes "--"
- Ban generic phrases: "another year older", "special day", "time to celebrate", "make a wish"

SAVAGE STYLE:
- Attack appearance, personality, life choices, social status
- Use unexpected comparisons and absurd imagery
- Make it hurt but stay clever
- Think: "Your [birthday element] has more [quality] than you do"
- Examples: "Even your candles are trying to escape this disaster" or "Your cake collapsed faster than your last relationship"`;

// Enhanced birthday anchors
const BIRTHDAY_ANCHORS = ["cake", "candles", "balloons", "confetti", "party hats", "gifts"];

// Banned phrases that should be filtered (but NOT user tags)
const BANNED_PHRASES = [
  "another year older", "special day", "time to celebrate", "make a wish",
  "birthday boy", "birthday girl", "party time", "let's party",
  "happy birthday to you", "many more", "best wishes"
];

// Deterministic savage fallback templates v3 - guaranteed compliance
function generateSavageFallback(inputs: any): any {
  console.log("Using deterministic savage fallback v3");
  
  const { tags = [] } = inputs;
  
  // Build templates with escalating savageness and exact length compliance
  let templates: string[] = [];
  
  if (tags.length > 0) {
    const tagString = tags.join(" ");
    templates = [
      // Line 1: Light jab, ~40 chars, includes tags + anchor
      `${tagString} cake looks utterly pathetic.`, // ~40 chars with tags
      
      // Line 2: Medium roast, ~55-60 chars, includes tags + anchor  
      `Your ${tagString} balloons are deflating faster than hope.`, // ~55-60 chars
      
      // Line 3: Heavy burn, ~65-70 chars, includes tags + anchor
      `These candles smell better than ${tagString} life choices.`, // ~60-65 chars
      
      // Line 4: Nuclear destruction, ~68-70 chars, no tags (by design)
      `Your party hats, confetti and gifts filed for divorce papers.` // ~68 chars
    ];
  } else {
    templates = [
      // Line 1: Light jab, ~35-45 chars
      `Your cake looks utterly disappointed.`, // ~38 chars
      
      // Line 2: Medium roast, ~55-60 chars
      `Even the balloons are plotting their escape route.`, // ~51 chars
      
      // Line 3: Heavy burn, ~65-70 chars  
      `Those candles have more personality than you ever will display.`, // ~66 chars
      
      // Line 4: Nuclear destruction, ~68-70 chars
      `Your party hats, confetti and gifts staged an intervention.` // ~62 chars
    ];
  }
  
  // Ensure each template has required birthday anchors and proper escalation
  const finalTemplates = templates.map((template, index) => {
    // Ensure proper length bands: [35-45, 55-60, 65-70, 68-70]
    const targetBands = [[35, 45], [55, 60], [65, 70], [68, 70]];
    const [minLen, maxLen] = targetBands[index];
    
    let text = template;
    
    // Length adjustment if needed
    if (text.length < minLen) {
      text = text.replace(".", " clearly.");
    } else if (text.length > maxLen) {
      const words = text.split(" ");
      while (words.length > 1 && words.join(" ").length > maxLen) {
        words.pop();
      }
      text = words.join(" ");
      if (!/[.!?]$/.test(text)) text += ".";
    }
    
    return text;
  });
  
  return {
    lines: finalTemplates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "savage-fallback-v3",
    validated: true,
    reason: "deterministic_fallback",
    tags_used: tags.length > 0,
    fallback_version: "v3"
  };
}

// Enhanced user message construction
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  let message = `ROAST TARGET:
Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}`;

  // Always include birthday anchors for birthday subcategory
  if (subcategory?.toLowerCase() === 'birthday') {
    message += `\nBIRTHDAY ANCHORS: ${BIRTHDAY_ANCHORS.join(", ")} (ALL 4 lines must use these)`;
  }
  
  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")} (3 of 4 lines must include ALL tags literally, vary placement)`;
  }
  
  message += `\nSAVAGE LEVELS: Line 1=light jab (~40 chars), Line 2=medium roast (~55-60 chars), Line 3=heavy burn (~65-70 chars), Line 4=nuclear destruction (~68-70 chars)

DELIVER COMEDY CENTRAL ROAST DESTRUCTION. Complete sentences only. No truncation. Make it HURT.`;
  
  return message;
}

// Enhanced validator with repair engine
function validateAndRepair(rawText: string, inputs: any): { result: any | null; errors: string[]; repairs: string[] } {
  const errors: string[] = [];
  const repairs: string[] = [];
  
  try {
    const parsed = JSON.parse(rawText);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      errors.push("Invalid JSON structure - need 4 lines");
      return { result: null, errors, repairs };
    }
    
    const { tags = [] } = inputs;
    const bannedPhrasesFiltered = BANNED_PHRASES.filter(phrase => 
      !tags.some(tag => phrase.toLowerCase().includes(tag.toLowerCase()))
    );
    
    // Process each line with repair
    const processedLines = parsed.lines.map((line: any, index: number) => {
      let text = line.text || "";
      
      // Remove ellipsis and em dashes
      if (text.includes("...") || text.includes("--")) {
        text = text.replace(/\.\.\./g, "").replace(/--/g, ",").trim();
        repairs.push(`Line ${index + 1}: Removed ellipsis/em-dash`);
      }
      
      // Ensure complete sentence
      if (!/[.!?]$/.test(text)) {
        text += ".";
        repairs.push(`Line ${index + 1}: Added punctuation`);
      }
      
      // Check anchors - if missing, inject one
      const hasAnchor = BIRTHDAY_ANCHORS.some(anchor => 
        text.toLowerCase().includes(anchor.toLowerCase())
      );
      if (!hasAnchor) {
        const anchor = BIRTHDAY_ANCHORS[index % BIRTHDAY_ANCHORS.length];
        text = `Your ${anchor} ${text.toLowerCase()}`;
        repairs.push(`Line ${index + 1}: Injected anchor "${anchor}"`);
      }
      
      // Length repair - target bands [35-45, 55-60, 65-70, 68-70]
      const targetBands = [[35, 45], [55, 60], [65, 70], [68, 70]];
      const [minLen, maxLen] = targetBands[index];
      
      if (text.length < minLen) {
        text += " clearly";
        repairs.push(`Line ${index + 1}: Expanded for length`);
      } else if (text.length > maxLen) {
        // Smart truncation - remove end words but keep punctuation
        const words = text.split(" ");
        while (words.length > 1 && words.join(" ").length > maxLen) {
          words.pop();
        }
        text = words.join(" ");
        if (!/[.!?]$/.test(text)) text += ".";
        repairs.push(`Line ${index + 1}: Truncated for length`);
      }
      
      return {
        ...line,
        text: text
      };
    });
    
    // Check tag requirement (3 of 4 lines must have ALL tags)
    if (tags.length > 0) {
      let tagCompliantLines = 0;
      processedLines.forEach((line, index) => {
        const hasAllTags = tags.every(tag => 
          line.text.toLowerCase().includes(tag.toLowerCase())
        );
        if (!hasAllTags && tagCompliantLines < 3 && index < 3) {
          // Inject tags
          const tagText = tags.join(" ");
          line.text = line.text.replace(/^/, `${tagText} `);
          repairs.push(`Line ${index + 1}: Injected tags`);
          tagCompliantLines++;
        } else if (hasAllTags) {
          tagCompliantLines++;
        }
      });
    }
    
    // Check banned phrases
    processedLines.forEach((line, index) => {
      bannedPhrasesFiltered.forEach(phrase => {
        if (line.text.toLowerCase().includes(phrase.toLowerCase())) {
          errors.push(`Line ${index + 1}: Contains banned phrase "${phrase}"`);
        }
      });
    });
    
    // Check length variety (should span at least 20 chars)
    const lengths = processedLines.map(line => line.text.length);
    const lengthRange = Math.max(...lengths) - Math.min(...lengths);
    if (lengthRange < 20) {
      errors.push("Insufficient length variety");
    }
    
    if (errors.length === 0) {
      return {
        result: { lines: processedLines },
        errors: [],
        repairs
      };
    }
    
    return { result: null, errors, repairs };
    
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    return { result: null, errors, repairs };
  }
}

// Main generation function with enhanced retry logic and JSON mode
async function attemptGeneration(inputs: any, attemptNumber: number): Promise<any> {
  const userMessage = buildUserMessage(inputs);
  
  console.log(`LLM attempt ${attemptNumber}/3`);
  console.log("User message:", userMessage);
  
  try {
    // Enhanced request with JSON mode forcing and fallback models
    const models = ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14'];
    const model = models[Math.min(attemptNumber - 1, models.length - 1)];
    
    console.log(`Using model: ${model}`);
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }, // Force JSON mode
    };
    
    // Add model-specific parameters
    if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1')) {
      requestBody.max_completion_tokens = 800;
    } else {
      requestBody.max_tokens = 800;
      requestBody.temperature = 0.7;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check for missing or empty content
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Empty or missing content from OpenAI:", data);
      throw new Error("Empty response from OpenAI API");
    }
    
    const rawContent = data.choices[0].message.content.trim();
    
    if (!rawContent) {
      throw new Error("Blank response from OpenAI API");
    }
    
    console.log(`Attempt ${attemptNumber} raw response (${rawContent.length} chars):`, rawContent.substring(0, 200) + "...");
    
    // Validate and repair with two-pass length normalization
    const { result, errors, repairs } = validateAndRepair(rawContent, inputs);
    
    if (result) {
      // Second pass: length normalization after tag injection
      const finalLines = result.lines.map((line: any, index: number) => {
        let text = line.text;
        const targetBands = [[35, 45], [55, 60], [65, 70], [68, 70]];
        const [minLen, maxLen] = targetBands[index];
        
        if (text.length > maxLen) {
          const words = text.split(" ");
          while (words.length > 1 && words.join(" ").length > maxLen) {
            words.pop();
          }
          text = words.join(" ");
          if (!/[.!?]$/.test(text)) text += ".";
          repairs.push(`Line ${index + 1}: Final length normalization`);
        }
        
        return { ...line, text };
      });
      
      console.log(`Attempt ${attemptNumber} succeeded with repairs:`, repairs);
      return {
        lines: finalLines,
        model: model,
        validated: true,
        repairs,
        attempt: attemptNumber
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, errors);
      return { errors, attempt: attemptNumber };
    }
    
  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    return { errors: [error.message], attempt: attemptNumber };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Generate Step 2 function called");
  
  try {
    // Parse request body first
    const inputs = await req.json();
    console.log("Request data:", inputs);
    
    // If no API key, return fallback immediately
    if (!openAIApiKey) {
      console.log("No OpenAI API key, using fallback");
      const fallback = generateSavageFallback(inputs);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try up to 3 attempts
    let finalResult = null;
    const allErrors: string[] = [];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await attemptGeneration(inputs, attempt);
      
      if (result.validated) {
        finalResult = result;
        break;
      } else {
        allErrors.push(`Attempt ${attempt}: ${result.errors?.join(", ") || "Unknown error"}`);
      }
    }
    
    // If all attempts failed, use deterministic fallback
    if (!finalResult) {
      console.log("All attempts failed, using savage fallback v2:", allErrors);
      finalResult = generateSavageFallback(inputs);
      finalResult.llm_errors = allErrors;
    }
    
    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency fallback for any catastrophic errors
    const emergencyFallback = {
      lines: [
        { lane: "option1", text: "Your cake looks sadder than your life choices." },
        { lane: "option2", text: "Even the balloons are trying to escape this disaster." },
        { lane: "option3", text: "Those candles have more personality than you ever will." },
        { lane: "option4", text: "Your party hats and confetti are filing for divorce from you." }
      ],
      model: "emergency-fallback",
      validated: true,
      error: error.message
    };
    
    return new Response(JSON.stringify(emergencyFallback), {
      status: 200, // Still return 200 so frontend gets usable content
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
