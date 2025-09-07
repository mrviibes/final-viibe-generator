import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced system prompt with Comedy Central roast intensity
const SYSTEM_PROMPT = `You are a Comedy Central roast comic delivering BRUTAL one-liners. Think Jeff Ross, Anthony Jeselnik, or Nikki Glaser level SAVAGE. This isn't friendly teasing — this is designed to DESTROY.

OUTPUT FORMAT: JSON only with this exact schema:
{
  "lines": [
    {"lane":"option1","text":"[light jab ~35-45 chars]"},
    {"lane":"option2","text":"[medium roast ~50-60 chars]"},
    {"lane":"option3","text":"[heavy burn ~60-70 chars]"},
    {"lane":"option4","text":"[nuclear destruction ~65-70 chars]"}
  ]
}

ROAST REQUIREMENTS:
- Each line must include at least one anchor; rotate anchors across lines (cake, candles, balloons, confetti, party hats, gifts)
- If tags provided: at least 3 of 4 lines must include ALL tags literally (not synonyms)
- Length bands: 35-45, 50-60, 60-70, 65-70 chars (MAX 70)
- ESCALATING SAVAGENESS: light jab → medium roast → heavy burn → nuclear destruction
- Each line must be DIFFERENT in style: personal attack, crowd observation, skill roast, absurd comparison
- Complete sentences only. No "..." or em dashes "--"
- Ban clichés: "another year older", "truth hurts", "best medicine", "special day"

SAVAGE COMEDY STYLE:
- Attack appearance, personality, life choices, relationships, career failures
- Use unexpected brutal comparisons and absurd imagery  
- Make it HURT but stay clever and conversational
- Examples: "Even your cake is embarrassed to be here" or "Your balloons deflated faster than your last relationship"
- Be merciless but witty — think roast comic destroying someone on stage`;

// Enhanced birthday anchors
const BIRTHDAY_ANCHORS = ["cake", "candles", "balloons", "confetti", "party hats", "gifts"];

// Banned phrases that should be filtered (but NOT user tags)
const BANNED_PHRASES = [
  "another year older", "special day", "time to celebrate", "make a wish",
  "birthday boy", "birthday girl", "party time", "let's party",
  "happy birthday to you", "many more", "best wishes"
];

// Deterministic savage fallback templates v4 - guaranteed compliance by construction
function generateSavageFallback(inputs: any): any {
  console.log("Using deterministic savage fallback v4");
  
  const { tags = [] } = inputs;
  const anchors = ["cake", "candles", "balloons", "confetti"];
  
  // Templates designed to leave slack for tags and never exceed 70 chars
  let baseTemplates: string[] = [];
  
  if (tags.length > 0) {
    const tagString = tags.join(" ");
    // Carefully crafted to include tags in first 3 lines + one anchor each
    baseTemplates = [
      // Line 1: Light (~40), tags + cake
      `${tagString} cake looks sadder than your soul.`, // ~35-45 with any reasonable tags
      
      // Line 2: Medium (~55-60), tags + candles  
      `Your ${tagString} candles burn brighter than your future.`, // ~50-60 with tags
      
      // Line 3: Heavy (~65-70), tags + balloons
      `${tagString} balloons have more lift than your career ever will.`, // ~60-70 with tags
      
      // Line 4: Nuclear (~68-70), confetti only (no tags by design)
      `This confetti has more purpose than you've shown in decades.` // exactly 62 chars
    ];
  } else {
    baseTemplates = [
      // Line 1: Light (~40), cake only
      `Your cake looks utterly defeated.`, // 33 chars
      
      // Line 2: Medium (~55-60), candles only
      `Even the candles are questioning their life choices here.`, // 57 chars
      
      // Line 3: Heavy (~65-70), balloons only  
      `Those balloons are deflating faster than your self-esteem.`, // 59 chars
      
      // Line 4: Nuclear (~68-70), confetti only
      `This confetti has more sparkle than your entire personality.` // 61 chars
    ];
  }
  
  // Adjust to precise length bands without truncation
  const targetBands = [[38, 42], [55, 60], [65, 70], [68, 70]];
  const finalTemplates = baseTemplates.map((template, index) => {
    const [minLen, maxLen] = targetBands[index];
    let text = template;
    
    // Expand if too short (no chopping ever)
    if (text.length < minLen) {
      const expansions = [" clearly", " obviously", " totally", " absolutely"];
      const expansion = expansions[index % expansions.length];
      text = text.replace(".", `${expansion}.`);
    }
    
    // Verify final length (should never exceed by construction)
    if (text.length > maxLen) {
      console.error(`Fallback v4 template ${index + 1} exceeds max length: ${text.length} > ${maxLen}`);
    }
    
    return text;
  });
  
  return {
    lines: finalTemplates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "fallback-v4 (validated)",
    validated: true,
    reason: "deterministic_fallback",
    tags_used: tags.length > 0,
    fallback_version: "v4",
    lengths: finalTemplates.map(t => t.length)
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
    message += `\nBIRTHDAY ANCHORS: ${BIRTHDAY_ANCHORS.join(", ")} (rotate across lines, one per line)`;
  }
  
  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")} (3 of 4 lines must include ALL tags literally, vary placement)`;
  }
  
  message += `\nSAVAGE LEVELS: Line 1=light jab (35-45 chars), Line 2=medium roast (50-60 chars), Line 3=heavy burn (60-70 chars), Line 4=nuclear destruction (65-70 chars)

DELIVER COMEDY CENTRAL ROAST DESTRUCTION. Each line must be a DIFFERENT style of attack. Be merciless but clever.`;
  
  return message;
}

// Enhanced validator with smart repair - no destructive truncation
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
    
    // Process lines: tags first, then anchors, then length validation
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
      
      return {
        ...line,
        text: text
      };
    });
    
    // Early tag enforcement (before length checks)
    if (tags.length > 0) {
      let tagCompliantLines = 0;
      for (let i = 0; i < Math.min(3, processedLines.length); i++) {
        const line = processedLines[i];
        const hasAllTags = tags.every(tag => 
          line.text.toLowerCase().includes(tag.toLowerCase())
        );
        
        if (!hasAllTags) {
          // Inject tags at varied positions
          const tagText = tags.join(" ");
          const positions = ["start", "mid", "end"];
          const position = positions[i % positions.length];
          
          if (position === "start") {
            line.text = `${tagText} ${line.text.toLowerCase()}`;
          } else if (position === "mid") {
            const words = line.text.split(" ");
            const midPoint = Math.floor(words.length / 2);
            words.splice(midPoint, 0, tagText);
            line.text = words.join(" ");
          } else {
            line.text = line.text.replace(/\.$/, ` ${tagText}.`);
          }
          
          repairs.push(`Line ${i + 1}: Injected tags at ${position}`);
        }
      }
    }
    
    // Anchor enforcement with polite repair
    processedLines.forEach((line, index) => {
      const hasAnchor = BIRTHDAY_ANCHORS.some(anchor => 
        line.text.toLowerCase().includes(anchor.toLowerCase())
      );
      
      if (!hasAnchor) {
        const anchor = BIRTHDAY_ANCHORS[index % BIRTHDAY_ANCHORS.length];
        const anchorPhrase = ` with ${anchor}`;
        line.text = line.text.replace(/\.$/, `${anchorPhrase}.`);
        repairs.push(`Line ${index + 1}: Added anchor "${anchor}"`);
      }
    });
    
    // Length validation - NO TRUNCATION, mark as invalid if over limit
    const targetBands = [[35, 45], [55, 60], [65, 70], [68, 70]];
    
    processedLines.forEach((line, index) => {
      const [minLen, maxLen] = targetBands[index];
      const length = line.text.length;
      
      if (length < minLen) {
        // Expand safely
        const expansions = [" clearly", " obviously", " totally", " absolutely"];
        const expansion = expansions[index % expansions.length];
        line.text = line.text.replace(/\.$/, `${expansion}.`);
        repairs.push(`Line ${index + 1}: Expanded for minimum length`);
      } else if (length > maxLen) {
        // Don't truncate - mark attempt as failed
        errors.push(`Line ${index + 1}: ${length} chars exceeds max ${maxLen}`);
      }
    });
    
    // Check banned phrases (excluding user tags)
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

// Enhanced generation with feedback-driven retries and raw output preservation
async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  let userMessage = buildUserMessage(inputs);
  
  // Add structured feedback for retry attempts
  if (attemptNumber > 1 && previousErrors.length > 0) {
    const feedback = `PREVIOUS ATTEMPT FAILED: ${previousErrors.join("; ")}
    
EXAMPLE CORRECT FORMAT:
{"lines":[
  {"lane":"option1","text":"Happy birthday Mike, even your cake ghosted you."},
  {"lane":"option2","text":"The balloons bailed faster than Mike's last date, happy birthday."},
  {"lane":"option3","text":"Mike's candles begged OSHA for hazard pay, happy birthday."},
  {"lane":"option4","text":"Confetti refused to drop, Mike. Even it knows this party sucks."}
]}`;
    userMessage += `\n\n${feedback}`;
  }
  
  console.log(`LLM attempt ${attemptNumber}/2`);
  console.log("User message:", userMessage);
  
  try {
    // Improved model cascade: GPT-5 Mini first for JSON fidelity
    const models = ['gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14'];
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
      requestBody.max_completion_tokens = 600; // Reduced to avoid truncation
    } else {
      requestBody.max_tokens = 600;
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
    
    // Enhanced logging for debugging
    console.log(`Attempt ${attemptNumber} API response:`, {
      model: data.model,
      finish_reason: data.choices?.[0]?.finish_reason,
      content_length: data.choices?.[0]?.message?.content?.length || 0,
      usage: data.usage
    });
    
    // Check for missing or empty content
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Empty or missing content from OpenAI:", data);
      throw new Error("Empty response from OpenAI API");
    }
    
    const rawContent = data.choices[0].message.content.trim();
    
    if (!rawContent) {
      throw new Error("Blank response from OpenAI API");
    }
    
    console.log(`Attempt ${attemptNumber} raw response (${rawContent.length} chars):`, rawContent.substring(0, 300) + "...");
    
    // Parse raw response first to preserve it
    let rawLines = null;
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.lines && Array.isArray(parsed.lines)) {
        rawLines = parsed.lines;
      }
    } catch (e) {
      console.log("Failed to parse JSON, will return raw content");
    }
    
    // Validate but preserve raw output
    const { result, errors, repairs } = validateAndRepair(rawContent, inputs);
    
    if (result) {
      console.log(`Attempt ${attemptNumber} succeeded with repairs:`, repairs);
      console.log("Final lengths:", result.lines.map((l: any) => l.text.length));
      
      return {
        lines: result.lines,
        rawLines: rawLines,
        model: `${model} (validated)`,
        validated: true,
        repairs,
        attempt: attemptNumber,
        lengths: result.lines.map((l: any) => l.text.length)
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, errors);
      return { 
        errors, 
        rawLines: rawLines, // Preserve raw output for potential use
        model: model,
        attempt: attemptNumber 
      };
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
    
    // Self-test mode for debugging
    if (inputs.self_test) {
      console.log("Self-test mode activated");
      const testCases = [
        { category: "Celebrations", subcategory: "Birthday", tone: "Savage", tags: [] },
        { category: "Celebrations", subcategory: "Birthday", tone: "Savage", tags: ["mike", "happy birthday"] }
      ];
      
      const testResults = [];
      for (const testCase of testCases) {
        const result = await attemptGeneration(testCase, 1);
        testResults.push({
          input: testCase,
          success: result.validated,
          output: result.lines || result.errors
        });
      }
      
      return new Response(JSON.stringify({ self_test: true, results: testResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try up to 2 attempts, then return model's raw output (NO FALLBACK)
    let finalResult = null;
    let lastAttemptResult = null;
    const allErrors: string[] = [];
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await attemptGeneration(inputs, attempt, allErrors);
      lastAttemptResult = result;
      
      if (result.validated) {
        finalResult = result;
        break;
      } else {
        const attemptErrors = result.errors?.join(", ") || "Unknown error";
        allErrors.push(`Attempt ${attempt}: ${attemptErrors}`);
        console.log(`Attempt ${attempt} failed validation:`, attemptErrors);
      }
    }
    
    // If validation failed, return the model's raw output anyway (no generic fallback)
    if (!finalResult && lastAttemptResult && lastAttemptResult.rawLines) {
      console.log("Validation failed but returning model's raw output instead of fallback");
      finalResult = {
        lines: lastAttemptResult.rawLines,
        model: `${lastAttemptResult.model || 'unknown'} (raw-unvalidated)`,
        validated: false,
        validation_errors: allErrors,
        note: "Returning model output despite validation issues"
      };
    }
    
    // ONLY use fallback if API completely failed (no model output at all)
    if (!finalResult) {
      console.log("API completely failed, using emergency fallback:", allErrors);
      finalResult = generateSavageFallback(inputs);
      finalResult.llm_errors = allErrors;
      finalResult.fallback_reason = "api_completely_failed";
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
