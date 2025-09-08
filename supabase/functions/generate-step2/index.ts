import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Comedian-mode system prompt prioritizing humor over rules
const SYSTEM_PROMPT = `Return ONLY JSON:
{"lines":[
  {"lane":"option1","text":""},
  {"lane":"option2","text":""},
  {"lane":"option3","text":""},
  {"lane":"option4","text":""}
]}

Rules:
- 4 unique one-liner jokes in JSON.
- Length: 35–70 chars. Natural variation: one short, one medium, one long, one random.
- Structure: one sentence each, max one comma OR one colon. No em-dash, no "--".
- Tags: if provided → at least 3 of 4 lines must literally include all tags. Tags can be separated and placed anywhere.
- Tone:
  * Savage = like a roast comic (Comedy Central).
  * Playful = like a cheeky sitcom gag.
  * Humorous = like a dad joke/observational comic.
  * Romantic = like a flirty one-liner.
  * Sentimental = like a toast at a wedding.
  * Nostalgic = like a "back in my day" storyteller.
  * Inspirational = like a motivational comic.
  * Serious = no joke, just plain.
- Randomize the comic "voice":
  Each line can sound like a different comedian — sarcastic, absurdist, deadpan, slapstick, sharp roast, etc.
  (E.g. one could be Seinfeld-style observation, another Ricky Gervais roast, another Mitch Hedberg absurdism, another Joan Rivers savage glam-roast).
- Props/anchors are optional seasoning, not mandatory. Use sparingly so jokes don't all feel the same.
- Priority: humor first, JSON shape second. If forced, pick the funniest line.
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

// Comedian-mode fallback generator
function generateSavageFallback(inputs: any): any {
  console.log("Using comedian-mode fallback");
  
  const { tags = [], tone = "Savage" } = inputs;
  
  // Target lengths: ~40, ~55, ~65, and one random 35–70
  let baseTemplates: string[] = [];
  
  if (tone.toLowerCase().includes("savage") || tone.toLowerCase().includes("humorous")) {
    if (tags.length > 0) {
      const tagList = tags.join(", ");
      baseTemplates = [
        `${tags[0]} walked into this joke and left.`, // ~40 chars
        `Your ${tags[0]} energy is giving ${tags[tags.length-1]} vibes.`, // ~55 chars  
        `That ${tagList} combo hits different when you're this basic.`, // ~65 chars
        `Honestly? ${tags[0]} deserves better than this mess.` // ~55 chars
      ];
    } else {
      baseTemplates = [
        `This party already peaked and left.`, // ~36 chars
        `Even your cake is questioning its life choices here.`, // ~53 chars
        `Those decorations are working harder than you ever have.`, // ~57 chars
        `Confetti has more personality than this crowd.` // ~47 chars
      ];
    }
  } else if (tone.toLowerCase().includes("sentimental") || tone.toLowerCase().includes("romantic")) {
    if (tags.length > 0) {
      const tagList = tags.join(", ");
      baseTemplates = [
        `${tags[0]} brings such warmth to my heart.`, // ~40 chars
        `Every moment with ${tags[0]} feels like ${tags[tags.length-1]} magic.`, // ~60 chars
        `This ${tagList} celebration reminds us what truly matters.`, // ~58 chars
        `Sweet ${tags[0]} memories we'll treasure forever.` // ~48 chars
      ];
    } else {
      baseTemplates = [
        `Every moment here feels so precious.`, // ~36 chars
        `These memories will warm our hearts for years to come.`, // ~54 chars
        `Such a beautiful celebration of all the love we share.`, // ~55 chars
        `Grateful for these perfect moments together.` // ~44 chars
      ];
    }
  } else { // Other tones - comedic variety
    if (tags.length > 0) {
      const tagList = tags.join(", ");
      baseTemplates = [
        `${tags[0]} said what now?`, // ~20-30 chars (expand it)
        `Apparently ${tags[0]} and ${tags[tags.length-1]} are a thing today.`, // ~60 chars
        `This whole ${tagList} situation is peak entertainment honestly.`, // ~65 chars
        `Plot twist: ${tags[0]} was the main character.` // ~47 chars
      ];
      // Fix short first one
      baseTemplates[0] = `Wait, ${tags[0]} said what exactly here?`; // ~38 chars
    } else {
      baseTemplates = [
        `Well this escalated quickly somehow.`, // ~37 chars
        `Plot twist nobody saw coming but here we absolutely are.`, // ~57 chars
        `The audacity of this entire situation is honestly impressive.`, // ~61 chars
        `Main character energy is strong with this one.` // ~47 chars
      ];
    }
  }
  
  // Ensure one pause max and clean up
  const finalTemplates = baseTemplates.map((text, index) => {
    let clean = onePause(text.trim());
    
    // Ensure it ends with punctuation
    if (!/[.!?]$/.test(clean)) clean += ".";
    
    // Ensure length range 35-70
    if (clean.length < 35) {
      const expansions = [" obviously", " clearly", " honestly", " definitely"];
      clean = clean.replace(".", `${expansions[index % expansions.length]}.`);
    }
    if (clean.length > 70) {
      clean = clean.slice(0, 70).trim() + ".";
    }
    
    return clean;
  });
  
  return {
    lines: finalTemplates.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),  
    model: "comedian-mode-fallback",
    validated: true,
    reason: "comedian_fallback",
    tone: tone,
    tags_used: tags.length > 0,
    fallback_version: "comedian-mode"
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

// Helper functions for Light Validator

function hasAllTags(text: string, tags: string[]): boolean {
  return (tags || []).every(t => text.toLowerCase().includes(String(t).toLowerCase()));
}

// Light Validator - comedian-mode focused on humor over rule checklist
function validateAndFix(json: any, { tags = [], min = 35, max = 70 }): { lines: any[] } {
  if (!json?.lines || json.lines.length !== 4) {
    throw new Error("Need 4 lines");
  }

  const lines = json.lines.map((o: any) => {
    let x = onePause(String(o.text || "").trim());
    if (x.length > max) x = x.slice(0, max).trim();
    if (!/[.!?]$/.test(x)) x += ".";
    return { ...o, text: x };
  });

  // length range check
  const badLen = lines.find(l => l.text.length < min || l.text.length > max);
  if (badLen) {
    throw new Error(`Each line must be between ${min}–${max} characters`);
  }

  // one-pause max
  const badPause = lines.find(l => (l.text.match(/[,:]/g) || []).length > 1);
  if (badPause) {
    throw new Error("Only one comma or colon allowed per line");
  }

  // tag rule
  if (tags.length) {
    const ok = lines.filter(l => hasAllTags(l.text, tags)).length;
    if (ok < 3) {
      throw new Error("At least 3 lines must include all tags literally");
    }
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