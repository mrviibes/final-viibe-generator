import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// COMEDIAN-FIRST SYSTEM PROMPT with NO anchors
const SYSTEM_PROMPT_NO_ANCHORS = `You are a professional comedian trained in the art of witty social media content. Your goal is to generate 4 lines for a social graphics overlay using a specific style palette.

COMEDIAN-FIRST RULES:
• Write like a stand-up comedian - be observational, witty, and dry
• NEVER use sentimental or emotional language 
• AVOID all occasion words like: cake, candles, balloons, confetti, birthday, party, celebrate
• Keep it indirect and clever, not literal

STYLE PALETTE (CRITICAL - EXACT character counts):
• Option 1: Deadpan (20-35 chars) - Dry, minimal observations
• Option 2: Observational (36-50 chars) - "Have you noticed..." format preferred  
• Option 3: Extended (51-65 chars) - Longer witty commentary
• Option 4: Absurdist (66-70 chars) - Surreal twist punchline

SPARTAN WRITING RULES:
• No semicolons, em dashes, or markdown
• Max 1 comma OR colon per line (not both)
• No corporate jargon
• Do NOT mention: cake, candles, balloons, confetti, birthday, party, celebrate

LENGTH EXAMPLES:
✓ Option 1 (29 chars): "That timing expired."
✓ Option 2 (47 chars): "Have you noticed things feel like job interviews?"
✓ Option 3 (58 chars): "This costs more than your last three relationships did."
✓ Option 4 (67 chars): "Everything here applied for witness protection after you arrived."`;

// Category-specific anchor dictionaries
const ANCHORS = {
  "celebrations.birthday": ["cake", "candles", "balloons", "confetti", "party hats", "gifts"],
  "celebrations.wedding": ["ring", "vows", "champagne", "roses", "bride", "groom"],
  "sports.hockey": ["ice rink", "stick", "puck", "goal net", "helmets", "locker room"],
  "sports.basketball": ["court", "hoop", "net", "sneakers", "scoreboard", "bench"],
  "vibes & punchlines.dad jokes": [], // No anchors for dad jokes
  "vibes & punchlines.puns": [], // No anchors for puns
  "pop culture.celebrities": [] // Context comes from entity
};

// Banned phrases that should be filtered (but NOT user tags)
const BANNED_PHRASES = [
  "another year older", "special day", "time to celebrate", "make a wish",
  "birthday boy", "birthday girl", "party time", "let's party",
  "happy birthday to you", "many more", "best wishes"
];

// Category-agnostic fallback with comedian style palette
function generateComedianFallback(inputs: any): any {
  console.log("Using non-literal comedian fallback");
  
  const { tags = [], tone = "Savage" } = inputs;
  const tagString = tags.length > 0 ? tags.join(" ") : "";
  
  // Non-literal comedian templates (zero occasion words) - comedian-first approach
  let styleTemplates: string[] = [];
  
  if (tone.toLowerCase().includes("savage") || tone.toLowerCase().includes("humorous")) {
    styleTemplates = [
      tagString ? `${tagString} got downgraded.` : "That got downgraded.", // Deadpan (20-35)
      tagString ? `Have you noticed ${tagString} ages in dog years?` : "Have you noticed everything ages in dog years?", // Observational (36-50)
      tagString ? `${tagString} filed for witness protection after meeting you.` : "This filed for witness protection after meeting you.", // Extended roast (51-65)
      tagString ? `${tagString} negotiates with gravity like they're personal enemies now.` : "Everything negotiates with gravity like they're personal enemies now." // Absurdist (66-70)
    ];
  } else if (tone.toLowerCase().includes("sentimental") || tone.toLowerCase().includes("romantic")) {
    // Comedian-first: override sentimental with witty lines  
    styleTemplates = [
      tagString ? `${tagString} got an upgrade.` : "That got an upgrade.", // Deadpan (20-35)
      tagString ? `Have you noticed ${tagString} comes with instructions?` : "Have you noticed everything comes with instructions?", // Observational (36-50)
      tagString ? `${tagString} filed paperwork to become officially awesome.` : "This filed paperwork to become officially awesome.", // Extended wit (51-65)
      tagString ? `${tagString} negotiates with reality like they're old college roommates.` : "Everything negotiates with reality like they're old college roommates." // Absurdist (66-70)
    ];
  } else { // Inspirational or other tones - comedian-first
    styleTemplates = [
      tagString ? `${tagString} leveled up.` : "That leveled up.", // Deadpan (20-35)
      tagString ? `Have you noticed how ${tagString} breaks physics?` : "Have you noticed how everything breaks physics?", // Observational (36-50)
      tagString ? `${tagString} submitted applications to become legendary status.` : "This submitted applications to become legendary status.", // Extended thought (51-65)
      tagString ? `${tagString} choreographs possibilities that dance beyond reason.` : "This choreographs possibilities that dance beyond reason." // Absurdist (66-70)
    ];
  }
  
  // Ensure proper length bands: 20-35, 36-50, 51-65, 66-70
  const targetBands = [[20, 35], [36, 50], [51, 65], [66, 70]];
  const finalTemplates = styleTemplates.map((template, index) => {
    const [minLen, maxLen] = targetBands[index];
    let text = template;
    
    // Adjust length if needed
    if (text.length < minLen) {
      const expansions = [" today", " here", " always", " forever"];
      text = text.replace(".", `${expansions[index]}.`);
    } else if (text.length > maxLen) {
      // Truncate if too long
      text = text.substring(0, maxLen - 1) + ".";
    }
    
    return text;
  });
  
  return {
    lines: finalTemplates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "comedian-fallback",
    validated: true,
    reason: "non_literal_comedian_fallback",
    tone: tone,
    tags_used: tags.length > 0,
    lengths: finalTemplates.map(t => t.length)
  };
}

// Enhanced user message with style palette and comedian-first enforcement
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}`;

  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(', ')}`;
  } else {
    message += `\nTAGS: (none)`;
  }

  message += `

STYLE PALETTE:
• Option 1: Deadpan (20-35 chars) - Dry, minimal
• Option 2: Observational (36-50 chars) - "Have you noticed..." 
• Option 3: Extended (51-65 chars) - Thoughtful sentiment
• Option 4: Absurdist (66-70 chars) - Surreal twist punchline

COMEDIAN-FIRST: Write like a stand-up comedian regardless of tone. Be witty, not sentimental. No emotional language.`;

  return message;
}

// Enhanced validation with sap filter and comedian-first enforcement
function validateAndRepair(rawText: string, inputs: any): { result: any | null; errors: string[]; repairs: string[] } {
  let errors: string[] = [];
  let repairs: string[] = [];
  
  try {
    const parsed = JSON.parse(rawText);
    
    if (!parsed.lines || !Array.isArray(parsed.lines)) {
      errors.push("Missing or invalid 'lines' array");
      return { result: null, errors, repairs };
    }
    
    // Style palette definitions for length validation
    const stylePalette = {
      option1: { name: "Deadpan", min: 20, max: 35 },
      option2: { name: "Observational", min: 36, max: 50 },
      option3: { name: "Extended", min: 51, max: 65 },
      option4: { name: "Absurdist", min: 66, max: 70 }
    };
    
    // Sap filter - Block sentimental language regardless of tone
    const sapPatterns = [
      /\b(heart|soul|spirit|blessing|precious|cherish|treasure)\b/i,
      /\b(beautiful|wonderful|amazing|incredible|magical)\b/i,
      /\b(grateful|thankful|blessed|lucky|fortunate)\b/i,
      /\b(memories|moments|forever|always|special)\b/i,
      /\b(love|adore|care|warmth|joy|happiness)\b/i
    ];
    
    // Check Spartan writing rules and comedian enforcement
    parsed.lines.forEach((line: any, index: number) => {
      if (!line.text) return;
      
      const text = line.text;
      const lane = line.lane || `option${index + 1}`;
      const style = stylePalette[lane as keyof typeof stylePalette];
      
      // Length validation
      if (style && (text.length < style.min || text.length > style.max)) {
        errors.push(`${lane.charAt(0).toUpperCase() + lane.slice(1)}: ${text.length < style.min ? 'Too short' : 'Too long'} (${text.length} chars) - ${text.length < style.min ? 'need' : 'max'} ${text.length < style.min ? style.min + '-' + style.max : style.max} for ${style.name} style`);
      }
      
      // Sap filter - comedian-first enforcement
      if (sapPatterns.some(pattern => pattern.test(text))) {
        errors.push(`${lane}: Contains sentimental language (blocked by comedian-first filter) - rewrite with dry humor`);
      }
      
      // Spartan rules
      if (text.includes(';')) {
        errors.push(`${lane}: Contains semicolon (banned by Spartan rules)`);
      }
      if (text.includes('**') || text.includes('*')) {
        errors.push(`${lane}: Contains markdown formatting (banned by Spartan rules)`);
      }
      if (/\b(utilize|leverage|paradigm|synergy|utilize|aforementioned)\b/i.test(text)) {
        errors.push(`${lane}: Contains banned corporate jargon`);
      }
    });
    
    // Tag coverage validation
    const { tags = [] } = inputs;
    if (tags.length > 0) {
      const taggedLineCount = parsed.lines.filter((line: any) => {
        if (!line.text) return false;
        return tags.some((tag: string) => 
          line.text.toLowerCase().includes(tag.toLowerCase())
        );
      }).length;
      
      if (taggedLineCount < 3) {
        errors.push(`Tag coverage: Only ${taggedLineCount}/4 lines contain provided tags. Need at least 3.`);
      }
    }
    
    // Occasion throttle: Check for explicit occasion words (max 0 allowed - comedian-first)
    const occasionWords = [
      'birthday', 'party', 'celebrate', 'celebration', 'anniversary', 'wedding',
      'christmas', 'holiday', 'thanksgiving', 'halloween', 'valentines',
      'cake', 'candles', 'balloons', 'confetti', 'gifts', 'presents'
    ];
    
    const occasionCount = parsed.lines.reduce((count: number, line: any) => {
      if (!line.text) return count;
      const text = line.text.toLowerCase();
      return count + occasionWords.filter(word => text.includes(word)).length;
    }, 0);
    
    if (occasionCount > 0) {
      errors.push(`Occasion throttle: Found ${occasionCount} explicit occasion words (max 0 allowed) - keep it comedian-style and indirect`);
    }
    
    return { result: errors.length === 0 ? parsed : null, errors, repairs };
  } catch (parseError) {
    errors.push(`JSON parsing error: ${parseError}`);
    return { result: null, errors, repairs };
  }
}

// Enhanced generation with feedback-driven retries and raw output preservation
async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  let userMessage = buildUserMessage(inputs);
  
  // Add structured feedback for retry attempts
  if (attemptNumber > 1 && previousErrors.length > 0) {
    let feedback = `PREVIOUS ATTEMPT FAILED: ${previousErrors.join("; ")}`;
    
    // Add specific guidance for length band failures
    if (previousErrors.some(err => err.includes("Too short") || err.includes("Too long"))) {
      feedback += `\n\nCRITICAL LENGTH BANDS:
• Option 1: 20-35 chars (Deadpan style)
• Option 2: 36-50 chars (Observational style)
• Option 3: 51-65 chars (Extended thought)
• Option 4: 66-70 chars (Absurdist twist)`;
    }
    
    // Add specific guidance for Spartan rule failures
    if (previousErrors.some(err => err.includes("banned") || err.includes("punctuation"))) {
      feedback += `\n\nSPARTAN RULES: No semicolons, em dashes, banned words, or multiple pauses per line`;
    }
    
    // Add comedian-first guidance
    if (previousErrors.some(err => err.includes("sentimental") || err.includes("occasion"))) {
      feedback += `\n\nCOMEDIAN-FIRST: Write like a stand-up comedian. Be witty and observational, not sentimental. Avoid all occasion words.`;
    }
    
    userMessage += `\n\n${feedback}\n\nCORRECT FORMAT EXAMPLE:
{"lines":[
  {"lane":"option1","text":"That expired."}, 
  {"lane":"option2","text":"Why does this feel like a job interview?"},
  {"lane":"option3","text":"This costs more than your last relationship did."},
  {"lane":"option4","text":"Everything here applied for witness protection after you arrived."}
]}`;
  }
  
  console.log(`LLM attempt ${attemptNumber}/2`);
  console.log(`User message: ${userMessage}`);

  try {
    // Model selection based on attempt
    const model = attemptNumber === 1 ? "gpt-5-2025-08-07" : "gpt-4.1-2025-04-14";
    console.log(`Using model: ${model}`);

    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_NO_ANCHORS },
          { role: "user", content: userMessage }
        ],
        max_completion_tokens: model.startsWith("gpt-5") || model.startsWith("o") ? 150 : undefined,
        max_tokens: model.startsWith("gpt-4") && !model.includes("gpt-5") ? 150 : undefined,
        temperature: model.startsWith("gpt-4") && !model.includes("gpt-5") ? 0.8 : undefined
      }),
    });

    const result = await apiResponse.json();
    
    console.log(`Attempt ${attemptNumber} API response:`, {
      model: result.model,
      finish_reason: result.choices?.[0]?.finish_reason,
      content_length: result.choices?.[0]?.message?.content?.length || 0,
      usage: result.usage
    });

    if (!result.choices || result.choices.length === 0 || !result.choices[0].message?.content) {
      console.error("Empty or missing content from OpenAI:", result);
      throw new Error("Empty response from OpenAI API");
    }

    const rawResponse = result.choices[0].message.content;
    console.log(`Attempt ${attemptNumber} raw response (${rawResponse.length} chars): ${rawResponse.substring(0, 400)}${rawResponse.length > 400 ? '...' : ''}`);

    const validation = validateAndRepair(rawResponse, inputs);
    
    console.log(`Attempt ${attemptNumber} failed validation:`, validation.errors);

    if (validation.result) {
      return {
        ...validation.result,
        model: result.model,
        validated: true,
        attempt_number: attemptNumber,
        raw_response: rawResponse,
        validation_errors: [],
        validation_repairs: validation.repairs || []
      };
    } else {
      return {
        validated: false,
        attempt_number: attemptNumber,
        raw_response: rawResponse,
        validation_errors: validation.errors,
        validation_repairs: validation.repairs || [],
        model: result.model
      };
    }
  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    return {
      validated: false,
      attempt_number: attemptNumber,
      error: error.message,
      validation_errors: [error.message],
      validation_repairs: []
    };
  }
}

// Main generation orchestrator with improved retry logic and fallbacks
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generate Step 2 function called");
    
    const inputs = await req.json();
    console.log("Request data:", inputs);

    // If no OpenAI API key, use comedian fallback immediately
    if (!openAIApiKey) {
      console.log("No OpenAI API key found, using comedian fallback");
      const fallbackResult = generateComedianFallback(inputs);
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Self-test mode for debugging
    if (inputs.self_test) {
      const testResponse = {
        lines: [
          { lane: "option1", text: "Test mode activated." },
          { lane: "option2", text: "Have you noticed everything works in test mode?" },
          { lane: "option3", text: "This test validates all systems are functioning properly." },
          { lane: "option4", text: "Everything here operates like a well-oiled debugging machine." }
        ],
        model: "test-mode",
        validated: true,
        self_test: true
      };
      return new Response(JSON.stringify(testResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let allErrors: string[] = [];
    let finalResult: any = null;
    let attemptCount = 0;
    const maxAttempts = 2;
    
    // Try generation with retries
    while (attemptCount < maxAttempts && !finalResult) {
      attemptCount++;
      const result = await attemptGeneration(inputs, attemptCount, allErrors);
      
      if (result.validated) {
        finalResult = result;
        break;
      } else {
        allErrors = allErrors.concat(result.validation_errors || []);
        console.log(`Attempt ${attemptCount} failed validation:`, result.validation_errors?.join(", "));
      }
      
      // If still failing after 2 attempts, try repair pass  
      if (attemptCount >= 2) {
        console.log("Attempting repair pass for comedian-first style...");
        
        const bannedWords = ['birthday', 'party', 'celebrate', 'cake', 'candles', 'balloons', 'confetti', 'heart', 'soul', 'beautiful', 'precious', 'memories', 'special'];
        const repairMessage = `${buildUserMessage(inputs)}\n\nPREVIOUS ATTEMPT FAILED: ${allErrors.join(", ")}\n\nREPAIR INSTRUCTIONS: Remove these words: ${bannedWords.join(", ")}. Write like a stand-up comedian - be witty, observational, and dry. No sentimental language. No occasion words.`;
        
        const repairResult = await attemptGeneration(inputs, 99, allErrors); // Special attempt number for repair
        if (repairResult.validated) {
          finalResult = repairResult;
          break;
        }
      }
    }
    
    // If all attempts failed, use comedian fallback
    if (!finalResult) {
      console.log("Using non-literal comedian fallback");
      finalResult = generateComedianFallback(inputs);
      finalResult.llm_errors = allErrors;
      finalResult.fallback_reason = "api_completely_failed";
    }
    
    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency non-literal comedian fallback
    const emergencyFallback = {
      lines: [
        { lane: "option1", text: "That timing expired." },
        { lane: "option2", text: "Have you noticed everything feels awkward now?" },
        { lane: "option3", text: "This situation costs more than your dignity ever will." },
        { lane: "option4", text: "Everything here applied for witness protection after meeting you." }
      ],
      model: "emergency-comedian-fallback",
      validated: true,
      error: error.message
    };
    
    return new Response(JSON.stringify(emergencyFallback), {
      status: 200, // Still return 200 so frontend gets usable content
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});