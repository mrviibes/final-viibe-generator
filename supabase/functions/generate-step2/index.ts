import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// New system prompt enforcing distinct text options with proper length and tonal variety
const SYSTEM_PROMPT_WITH_ANCHORS = `Return ONLY valid JSON:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

CRITICAL: Generate 4 DISTINCT text options that feel completely different in tone, pacing, and length.

LENGTH VARIETY (ENFORCED):
• Option 1 → Short quip (under 40 characters)
• Option 2 → Medium playful line (40–70 characters)  
• Option 3 → Longer, storylike gag (70–100 characters)
• Option 4 → Wildcard length (different rhythm than others)

TONAL VARIETY (ENFORCED):
Must include at least one from each angle:
• Literal/safe (cake, balloons, candles, birthday basics)
• Supportive/celebratory (warm, congratulatory, positive)  
• Alternate playful (quirky metaphor, silly twist, object humor)
• Roast/mischievous (light jab, but not mean-spirited)

TAG HANDLING:
• Rotate tags across options so one concept doesn't dominate all four
• Use 2–3 different tags per generation when available
• Natural integration, not forced cramming

CATEGORY & SUBCATEGORY:
• Subcategory drives anchors (Birthday → cake, candles, balloons, confetti, gifts)
• At least 1 anchor word in every line when anchors available

TONE CONSISTENCY:
• Respect the chosen tone as the base, but allow variety within it:
  * Humorous = silly, playful, witty wordplay
  * Savage = roast comic energy (sharp, biting) 
  * Sentimental = warm, heartfelt
  * Romantic = affectionate, dreamy
  * Inspirational = uplifting, positive

STYLE RULES:
• Conversational, natural phrasing (sounds human, not robotic)
• Simple punctuation: commas, periods, colons only
• No em-dashes (—) or double dashes (--)
• Ban clichés: "truth hurts", "timing is everything", "laughter is the best medicine"
• NO SINGLE-TAG DOMINANCE - vary your approaches across all 4 options`;

// System prompt for categories WITHOUT anchors
const SYSTEM_PROMPT_NO_ANCHORS = `Return ONLY valid JSON:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

CRITICAL: Generate 4 DISTINCT text options that feel completely different in tone, pacing, and length.

LENGTH VARIETY (ENFORCED):
• Option 1 → Short quip (under 40 characters)
• Option 2 → Medium playful line (40–70 characters)
• Option 3 → Longer, storylike gag (70–100 characters)  
• Option 4 → Wildcard length (different rhythm than others)

TONAL VARIETY (ENFORCED):
Must include at least one from each angle:
• Literal/safe (concept basics)
• Supportive/celebratory (warm, congratulatory, positive)
• Alternate playful (quirky metaphor, silly twist, conceptual humor)
• Roast/mischievous (light jab, but not mean-spirited)

TAG HANDLING:
• Rotate tags across options so one concept doesn't dominate all four
• Use 2–3 different tags per generation when available
• Natural integration, not forced cramming

CATEGORY & SUBCATEGORY:
• Do NOT force props or scene objects for this subcategory
• Focus on the concept/theme instead

TONE CONSISTENCY:
• Respect the chosen tone as the base, but allow variety within it:
  * Humorous = silly, playful, witty wordplay
  * Savage = roast comic energy (sharp, biting)
  * Sentimental = warm, heartfelt  
  * Romantic = affectionate, dreamy
  * Inspirational = uplifting, positive

STYLE RULES:
• Conversational, natural phrasing (sounds human, not robotic)
• Simple punctuation: commas, periods, colons only
• No em-dashes (—) or double dashes (--)
• Ban clichés: "truth hurts", "timing is everything", "laughter is the best medicine"
• NO SINGLE-TAG DOMINANCE - vary your approaches across all 4 options`;

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

// Enhanced user message construction
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}`;

  // Get category-specific anchors
  const ctxKey = `${category.toLowerCase()}.${subcategory.toLowerCase()}`;
  const anchors = ANCHORS[ctxKey] || [];
  
  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS (may be empty): ${tags.join(", ")}`;
  } else {
    message += `\nTAGS (may be empty): `;
  }
  
  // Only include anchors if they exist for this category/subcategory
  if (anchors.length > 0) {
    message += `\nANCHORS (use ≥1 per line): ${anchors.join(", ")}`;
  }
  
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
    
    // Anchor enforcement with polite repair (only if anchors exist for this category)
    const ctxKey = `${inputs.category?.toLowerCase() || ''}.${inputs.subcategory?.toLowerCase() || ''}`;
    const anchors = ANCHORS[ctxKey] || [];
    
    if (anchors.length > 0) {
      processedLines.forEach((line, index) => {
        const hasAnchor = anchors.some(anchor => 
          line.text.toLowerCase().includes(anchor.toLowerCase())
        );
        
        if (!hasAnchor) {
          const anchor = anchors[index % anchors.length];
          const anchorPhrase = ` with ${anchor}`;
          line.text = line.text.replace(/\.$/, `${anchorPhrase}.`);
          repairs.push(`Line ${index + 1}: Added anchor "${anchor}"`);
        }
      });
    }
    
    // Updated length validation for new variety system
    const targetBands = [[20, 39], [40, 69], [70, 100], [20, 100]]; // Short, Medium, Long, Wildcard
    
    processedLines.forEach((line, index) => {
      const [minLen, maxLen] = targetBands[index];
      const length = line.text.length;
      
      if (length < minLen) {
        // Expand safely to meet minimum
        const expansions = [" clearly", " obviously", " truly", " absolutely"];
        const expansion = expansions[index % expansions.length];
        line.text = line.text.replace(/\.$/, `${expansion}.`);
        repairs.push(`Line ${index + 1}: Expanded for minimum length (${length} -> ${line.text.length})`);
      } else if (length > maxLen) {
        // Don't truncate - mark attempt as failed
        errors.push(`Line ${index + 1}: ${length} chars exceeds max ${maxLen} (target band: ${minLen}-${maxLen})`);
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
    
    // Enhanced length variety check - must span at least 30 chars and have distinct bands
    const lengths = processedLines.map(line => line.text.length);
    const lengthRange = Math.max(...lengths) - Math.min(...lengths);
    if (lengthRange < 30) {
      errors.push("Insufficient length variety");
    }
    
    // Check for distinct length bands
    const shortCount = lengths.filter(l => l <= 39).length;
    const mediumCount = lengths.filter(l => l >= 40 && l <= 69).length; 
    const longCount = lengths.filter(l => l >= 70).length;
    
    if (shortCount === 0 || (mediumCount === 0 && longCount === 0)) {
      errors.push("Missing required length variety (need short + medium/long mix)");
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
    
    // Choose system prompt based on whether anchors exist
    const ctxKey = `${inputs.category?.toLowerCase() || ''}.${inputs.subcategory?.toLowerCase() || ''}`;
    const anchors = ANCHORS[ctxKey] || [];
    const systemPrompt = anchors.length > 0 ? SYSTEM_PROMPT_WITH_ANCHORS : SYSTEM_PROMPT_NO_ANCHORS;
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
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
