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

// Deterministic savage fallback templates that pass validation by construction
function generateSavageFallback(inputs: any): any {
  console.log("Using deterministic savage fallback v2");
  
  const { tags = [] } = inputs;
  const allTags = tags.join(" ");
  
  // Templates with exact lengths and guaranteed anchors/tags
  const templates = [
    // Line 1 (~40 chars, light jab)
    tags.length > 0 
      ? `${allTags} cake looks disappointed already.` // ~40 with tags
      : `Your cake already looks disappointed.`, // ~35 without tags
    
    // Line 2 (~55-60 chars, medium roast)  
    tags.length > 0
      ? `Even the balloons want to escape ${allTags} disaster.` // ~55 with tags
      : `Even the balloons are trying to escape this disaster.`, // ~52 without tags
    
    // Line 3 (~65-70 chars, heavy burn)
    tags.length > 0
      ? `Those candles have more life than ${allTags} personality ever will.` // ~68 with tags
      : `Those candles have more life than your personality ever will.`, // ~62 without tags
    
    // Line 4 (~68-70 chars, nuclear destruction, no tags)
    `Your party hats, confetti, and gifts are staging an intervention.` // ~67
  ];
  
  return {
    lines: templates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "savage-fallback-v2",
    validated: true,
    reason: "deterministic_fallback"
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

// Main generation function with enhanced retry logic
async function attemptGeneration(inputs: any, attemptNumber: number): Promise<any> {
  const userMessage = buildUserMessage(inputs);
  
  console.log(`LLM attempt ${attemptNumber}/3`);
  console.log("User message:", userMessage);
  
  try {
    // Use GPT-5 with proper parameters
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        max_completion_tokens: 800,
        // Note: temperature not supported on GPT-5
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    
    console.log(`Attempt ${attemptNumber} raw response:`, rawContent);
    
    // Validate and repair
    const { result, errors, repairs } = validateAndRepair(rawContent, inputs);
    
    if (result) {
      console.log(`Attempt ${attemptNumber} succeeded with repairs:`, repairs);
      return {
        ...result,
        model: "gpt-5-2025-08-07",
        validated: true,
        repairs
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, errors);
      return { errors };
    }
    
  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    return { errors: [error.message] };
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
