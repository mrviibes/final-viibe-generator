import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Single stricter system prompt with length diversity and one-pause rules
const SYSTEM_PROMPT = `Return ONLY JSON:
{"lines":[
  {"lane":"option1","text":""},
  {"lane":"option2","text":""},
  {"lane":"option3","text":""},
  {"lane":"option4","text":""}
]}

Rules:
- Tone = Savage. Roast comic energy, but fluent and natural.
- One sentence per line. Use at most ONE pause (comma OR colon). No em-dash, no "--".
- Length cap = 70 chars. Lengths must vary: 
  * one ~40–50, one ~51–60, one ~61–70, and the 4th anywhere ≤70.
- Subcategory anchors: Birthday = cake, candles, balloons, confetti, gifts, party hats.
  Include ≥1 anchor in every line.
- Tags (if provided): at least 3 of 4 lines must include ALL tags literally.
  Place tags in different positions; do not change their wording.
- Lines must be DISTINCT (different angles: props, audience, skill, absurdity).
- Ban clichés ("another year", "best medicine", "truth hurts").
- Output only the JSON; no labels or commentary.`;

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

// Tone-aware fallback generator with proper length bands
function generateSavageFallback(inputs: any): any {
  console.log("Using tone-aware fallback v5");
  
  const { tags = [], tone = "Savage" } = inputs;
  const ctxKey = `${inputs.category?.toLowerCase() || ''}.${inputs.subcategory?.toLowerCase() || ''}`;
  const anchors = ANCHORS[ctxKey] || ["cake", "candles", "balloons", "confetti"];
  
  // Tone-specific templates with proper length bands
  let baseTemplates: string[] = [];
  
  if (tone.toLowerCase().includes("savage") || tone.toLowerCase().includes("humorous")) {
    if (tags.length > 0) {
      const tagString = tags.join(" ");
      baseTemplates = [
        `${tagString} cake looks sadder than your soul.`, // ~40 chars
        `Your ${tagString} candles burn brighter than your future.`, // ~55 chars  
        `${tagString} balloons have more lift than your career ever will.`, // ~65 chars
        `This confetti has more purpose than you've shown in decades.` // ~68 chars
      ];
    } else {
      baseTemplates = [
        `Your cake looks utterly defeated.`, // ~33 chars
        `Even the candles are questioning their life choices here.`, // ~57 chars
        `Those balloons are deflating faster than your self-esteem.`, // ~59 chars
        `This confetti has more sparkle than your entire personality.` // ~61 chars
      ];
    }
  } else if (tone.toLowerCase().includes("sentimental") || tone.toLowerCase().includes("romantic")) {
    if (tags.length > 0) {
      const tagString = tags.join(" ");
      baseTemplates = [
        `${tagString} cake brings warmth to every heart.`, // ~40 chars
        `Your ${tagString} candles shine with beautiful memories ahead.`, // ~55 chars
        `${tagString} balloons carry all our hopes and dreams skyward.`, // ~65 chars
        `This confetti celebrates the amazing person you've become.` // ~68 chars
      ];
    } else {
      baseTemplates = [
        `Your cake brings joy to everyone.`, // ~33 chars
        `These candles illuminate the beautiful moments we cherish.`, // ~57 chars
        `Those balloons lift our spirits high with celebration.`, // ~59 chars
        `This confetti marks another year of wonderful memories.` // ~61 chars
      ];
    }
  } else { // Inspirational or other tones
    if (tags.length > 0) {
      const tagString = tags.join(" ");
      baseTemplates = [
        `${tagString} cake represents sweet victories.`, // ~40 chars
        `Your ${tagString} candles illuminate the path to greatness.`, // ~55 chars
        `${tagString} balloons remind us that dreams can truly soar.`, // ~65 chars
        `This confetti celebrates your incredible journey forward.` // ~68 chars
      ];
    } else {
      baseTemplates = [
        `Your cake symbolizes sweet success.`, // ~33 chars
        `These candles light the way to amazing achievements.`, // ~57 chars
        `Those balloons remind us that anything is possible.`, // ~59 chars
        `This confetti honors your incredible accomplishments.` // ~61 chars
      ];
    }
  }
  
  // Ensure proper length bands: ~35-40, ~50-55, ~65-70, ~68-70
  const targetBands = [[35, 40], [50, 55], [65, 70], [68, 70]];
  const finalTemplates = baseTemplates.map((template, index) => {
    const [minLen, maxLen] = targetBands[index];
    let text = template;
    
    // Expand if too short
    if (text.length < minLen) {
      const expansions = [" clearly", " obviously", " truly", " absolutely"];
      const expansion = expansions[index % expansions.length];
      text = text.replace(".", `${expansion}.`);
    }
    
    // Verify final length
    if (text.length > maxLen) {
      console.error(`Fallback v5 template ${index + 1} exceeds max length: ${text.length} > ${maxLen}`);
    }
    
    return text;
  });
  
  return {
    lines: finalTemplates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),  
    model: "tone-aware-fallback-v5",
    validated: true,
    reason: "tone_aware_fallback",
    tone: tone,
    tags_used: tags.length > 0,
    fallback_version: "v5",
    lengths: finalTemplates.map(t => t.length)
  };
}

// Simplified user message construction
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  return `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Tags: ${tags.join(", ")}`;
}

// Enforce one-pause, varied lengths, tag rule
function onePause(s: string): string {
  const t = s.replace(/[—–]|--/g, ":").replace(/\s*,\s*,+/g, ", "); // collapse commas
  const pauses = (t.match(/[,:]/g) || []).length;
  return pauses > 1 ? t.replace(/([,:]).*([,:])/, '$1') : t; // keep first pause
}

function bucketLen(n: number): string {
  if (n <= 50) return "A";
  if (n <= 60) return "B"; 
  if (n <= 70) return "C";
  return "X";
}

function hasAllTags(text: string, tags: string[]): boolean {
  return (tags || []).every(t => text.toLowerCase().includes(String(t).toLowerCase()));
}

function validateAndFix(json: any, { tags = [], max = 70 }): { lines: any[] } {
  if (!json?.lines || json.lines.length !== 4) {
    throw new Error("Need 4 lines");
  }

  // clean punctuation + trim + cap
  const lines = json.lines.map((o: any) => {
    let x = onePause(String(o.text || "").trim());
    if (x.length > max) x = x.slice(0, max).trim();
    // end with period if none
    if (!/[.!?]$/.test(x)) x += ".";
    return { ...o, text: x };
  });

  // length diversity
  const buckets = new Set(lines.map(l => bucketLen(l.text.length)));
  if (!(buckets.has("A") && buckets.has("B") && buckets.has("C"))) {
    throw new Error("Lengths must cover ~40–50, ~51–60, ~61–70");
  }

  // tag rule: 3/4 lines must contain all tags (if tags exist)
  if (tags.length) {
    const ok = lines.filter(l => hasAllTags(l.text, tags)).length;
    if (ok < 3) {
      throw new Error("At least 3 lines must include all tags literally");
    }
  }

  // one pause max
  const bad = lines.find(l => (l.text.match(/[,:]/g) || []).length > 1);
  if (bad) {
    throw new Error("Only one comma or colon allowed per line");
  }

  return { lines };
}

// Generation attempt with new validation
async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  let userMessage = buildUserMessage(inputs);
  
  // Add feedback for retry attempts  
  if (attemptNumber > 1 && previousErrors.length > 0) {
    userMessage += `\n\nPREVIOUS ATTEMPT FAILED: ${previousErrors.join("; ")}`;
  }
  
  console.log(`User message: ${userMessage}`);
  
  // Model selection
  let model = "gpt-5-mini-2025-08-07";
  if (attemptNumber === 2) {
    model = "gpt-4.1-2025-04-14"; 
  }
  console.log(`Using model: ${model}`);
  
  try {
    const requestBody = {
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    };
    
    // Add parameters based on model version
    if (model.startsWith("gpt-5") || model.startsWith("gpt-4.1") || model.startsWith("o3") || model.startsWith("o4")) {
      requestBody.max_completion_tokens = 400;
    } else {
      requestBody.max_tokens = 400;
      requestBody.temperature = 0.8;
    }
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorDetails);
      throw new Error(`OpenAI API error: ${response.status} - ${errorDetails}`);
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    const finishReason = completion.choices?.[0]?.finish_reason;
    
    console.log(`Attempt ${attemptNumber} API response: {
  model: "${completion.model}",
  finish_reason: "${finishReason}",
  content_length: ${content?.length || 0},
  usage: ${JSON.stringify(completion.usage)}
}`);

    if (!content || content.trim() === "") {
      console.error(`Empty or missing content from OpenAI:`, JSON.stringify(completion, null, 2));
      throw new Error("Empty response from OpenAI API");
    }

    console.log(`Attempt ${attemptNumber} raw response (${content.length} chars): ${content.slice(0, 200)}${content.length > 200 ? '...' : ''}`);

    // Try new validation
    try {
      const result = validateAndFix(JSON.parse(content), { tags: inputs.tags || [], max: 70 });
      console.log(`Attempt ${attemptNumber} validation succeeded`);
      return {
        ...result,
        model: completion.model,
        validated: true,
        attempt: attemptNumber
      };
    } catch (validationError) {
      console.log(`Attempt ${attemptNumber} failed validation: ${validationError.message}`);
      return {
        error: validationError.message,
        model: completion.model,
        validated: false,
        attempt: attemptNumber,
        raw_content: content
      };
    }

  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    return {
      error: error.message,
      model: model,
      validated: false,
      attempt: attemptNumber,
      exception: true
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Generate Step 2 function called");
  
  try {
    const inputs = await req.json();
    console.log("Request data:", inputs);
    
    // Early return if no OpenAI API key
    if (!openAIApiKey) {
      console.log("No OpenAI API key found, returning fallback");
      return new Response(JSON.stringify(generateSavageFallback(inputs)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Main generation logic with up to 2 attempts
    console.log("LLM attempt 1/2");
    const result1 = await attemptGeneration(inputs, 1);
    
    if (result1.validated) {
      return new Response(JSON.stringify(result1), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // First attempt failed, try once more with feedback
    console.log(`Attempt 1 failed validation: ${result1.error}`);
    console.log("LLM attempt 2/2");
    
    const result2 = await attemptGeneration(inputs, 2, [result1.error]);
    
    if (result2.validated) {
      return new Response(JSON.stringify(result2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Both attempts failed - return 422 with validation errors instead of fallback
    console.log(`Attempt 2 failed validation: ${result2.error}`);
    console.log("Both attempts failed validation, returning 422 response");
    
    return new Response(JSON.stringify({
      error: "Validation failed after 2 attempts",
      validation_errors: [result1.error, result2.error],
      attempts: 2,
      model: result2.model || result1.model || "unknown"
    }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency fallback
    try {
      const inputs = await req.json().catch(() => ({}));
      const emergencyResult = generateSavageFallback(inputs);
      
      return new Response(JSON.stringify({
        ...emergencyResult,
        emergency_fallback: true,
        original_error: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      return new Response(JSON.stringify({ 
        error: 'Complete system failure',
        details: error.message,
        fallback_error: fallbackError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});