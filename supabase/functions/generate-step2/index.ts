import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// System prompt with comedian style palette and Spartan writing rules
const SYSTEM_PROMPT_WITH_ANCHORS = `Return ONLY valid JSON:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

COMEDIAN STYLE PALETTE (MANDATORY - each option has specific voice):
• Option 1: Deadpan/Spartan (20-35 chars) - Dry, matter-of-fact, minimal words
• Option 2: Observational (36-50 chars) - "Have you noticed..." style, relatable observations  
• Option 3: Extended thought (51-80 chars) - Longer setup, can roast IF tone allows
• Option 4: Absurdist/Twist (81-100 chars) - Unexpected punchline, surreal logic

TONE GATING (CRITICAL):
• Option 3 can only roast/insult if tone is Savage/Humorous
• For Sentimental/Romantic/Inspirational: Option 3 becomes thoughtful extended sentiment
• All other options adapt to tone while keeping their style voice

TAG HANDLING (STRICTLY ENFORCED):
• If tags exist: At least 3 of 4 lines must include ALL tags literally
• Tags appear naturally, different positions across lines
• Do not skip tags in more than 1 line

SPARTAN HOUSE RULES (NON-NEGOTIABLE):
• No semicolons (;) or em dashes (—) ever
• No markdown (*bold* #hashtag @mentions)  
• No clichés or filler phrases
• Options 1-3: Max ONE pause (comma OR colon), Option 4: Max TWO pauses
• Clean sentences, not fragments

BANNED WORDS (never use):
can, may, just, really, literally, actually, probably, basically, maybe, utilize, moreover, additionally, furthermore, overall, ultimately, "in conclusion", "at the end of the day", "here's how", "let's explore"

OCCASION THROTTLE:
• Context props are background, not punchlines
• Maximum 1 explicit occasion mention across all 4 lines
• Focus on wit and personality over scene details

LENGTH EXAMPLES:
✓ Option 1 (30 chars): "Your cake expired."
✓ Option 2 (45 chars): "Why do birthday parties feel like job interviews?"
✓ Option 3 (75 chars): "Your candles cost more than your last three relationships combined."
✓ Option 4 (95 chars): "This confetti applied for witness protection after seeing you dance at family gatherings."`;

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

COMEDIAN STYLE PALETTE (MANDATORY - each option has specific voice):
• Option 1: Deadpan/Spartan (20-35 chars) - Dry, matter-of-fact, minimal words
• Option 2: Observational (36-50 chars) - "Have you noticed..." style, relatable observations
• Option 3: Extended thought (51-80 chars) - Longer setup, can roast IF tone allows  
• Option 4: Absurdist/Twist (81-100 chars) - Unexpected punchline, surreal logic

TONE GATING (CRITICAL):
• Option 3 can only roast/insult if tone is Savage/Humorous
• For Sentimental/Romantic/Inspirational: Option 3 becomes thoughtful extended sentiment
• All other options adapt to tone while keeping their style voice

TAG HANDLING (STRICTLY ENFORCED):
• If tags exist: At least 3 of 4 lines must include ALL tags literally
• Tags appear naturally, different positions across lines
• Do not skip tags in more than 1 line

SPARTAN HOUSE RULES (NON-NEGOTIABLE):
• No semicolons (;) or em dashes (—) ever
• No markdown (*bold* #hashtag @mentions)
• No clichés or filler phrases  
• Options 1-3: Max ONE pause (comma OR colon), Option 4: Max TWO pauses
• Clean sentences, not fragments

BANNED WORDS (never use):
can, may, just, really, literally, actually, probably, basically, maybe, utilize, moreover, additionally, furthermore, overall, ultimately, "in conclusion", "at the end of the day", "here's how", "let's explore"

OCCASION THROTTLE:
• Context props are background, not punchlines
• Maximum 1 explicit occasion mention across all 4 lines
• Focus on wit and personality over scene details

LENGTH EXAMPLES:
✓ Option 1 (30 chars): "Your cake expired."
✓ Option 2 (45 chars): "Why do birthday parties feel like job interviews?"
✓ Option 3 (75 chars): "Your candles cost more than your last three relationships combined."
✓ Option 4 (95 chars): "This confetti applied for witness protection after seeing you dance at family gatherings."`;

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
function generateSavageFallback(inputs: any): any {
  console.log("Using comedian style fallback");
  
  const { tags = [], tone = "Savage" } = inputs;
  const tagString = tags.length > 0 ? tags.join(" ") : "";
  
  // Style-based templates (category-agnostic)
  let styleTemplates: string[] = [];
  
  if (tone.toLowerCase().includes("savage") || tone.toLowerCase().includes("humorous")) {
    styleTemplates = [
      tagString ? `${tagString} expired.` : "That expired.", // Deadpan (20-35)
      tagString ? `Why does ${tagString} feel like a job interview?` : "Why does this feel like a job interview?", // Observational (36-50)
      tagString ? `${tagString} costs more than your last three relationships combined.` : "This costs more than your last three relationships combined.", // Extended roast (51-80)
      tagString ? `${tagString} applied for witness protection after seeing your dance moves at family gatherings.` : "Everything here applied for witness protection after seeing your dance moves at family gatherings." // Absurdist (81-100)
    ];
  } else if (tone.toLowerCase().includes("sentimental") || tone.toLowerCase().includes("romantic")) {
    styleTemplates = [
      tagString ? `${tagString} warms hearts.` : "This warms hearts.", // Deadpan (20-35)
      tagString ? `Have you noticed how ${tagString} brings people together?` : "Have you noticed how moments bring people together?", // Observational (36-50)
      tagString ? `${tagString} represents all the beautiful memories we treasure most dearly.` : "This represents all the beautiful memories we treasure most dearly.", // Extended sentiment (51-80)
      tagString ? `${tagString} whispers secrets of love that only true hearts understand completely and forever.` : "This whispers secrets of love that only true hearts understand completely and forever." // Absurdist (81-100)
    ];
  } else { // Inspirational or other tones
    styleTemplates = [
      tagString ? `${tagString} inspires.` : "This inspires.", // Deadpan (20-35)
      tagString ? `Have you noticed how ${tagString} motivates us?` : "Have you noticed how moments motivate us?", // Observational (36-50)
      tagString ? `${tagString} reminds us that anything is truly possible when we believe.` : "This reminds us that anything is truly possible when we believe.", // Extended thought (51-80)
      tagString ? `${tagString} dances with possibilities that dreams never imagined before in their wildest moments.` : "This dances with possibilities that dreams never imagined before in their wildest moments." // Absurdist (81-100)
    ];
  }
  
  // Ensure proper length bands: 20-35, 36-50, 51-80, 81-100
  const targetBands = [[20, 35], [36, 50], [51, 80], [81, 100]];
  const finalTemplates = styleTemplates.map((template, index) => {
    const [minLen, maxLen] = targetBands[index];
    let text = template;
    
    // Adjust length if needed
    if (text.length < minLen) {
      const expansions = [" now", " here", " always", " forever"];
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
    reason: "comedian_style_fallback",
    tone: tone,
    tags_used: tags.length > 0,
    lengths: finalTemplates.map(t => t.length)
  };
}

// Enhanced user message with style palette and tone gating
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}`;

  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")}`;
  } else {
    message += `\nTAGS: (none)`;
  }
  
  // Get category-specific anchors and mark as optional context
  const ctxKey = `${category.toLowerCase()}.${subcategory.toLowerCase()}`;
  const anchors = ANCHORS[ctxKey] || [];
  
  if (anchors.length > 0) {
    message += `\nCONTEXT PROPS: ${anchors.join(", ")} (use sparingly for context)`;
  }
  
  // Style palette reminder
  message += `\n\nSTYLE PALETTE:
• Option 1: Deadpan (20-35 chars) - Dry, minimal
• Option 2: Observational (36-50 chars) - "Have you noticed..." 
• Option 3: Extended (51-80 chars) - ${tone.toLowerCase().includes('savage') || tone.toLowerCase().includes('humorous') ? 'Can roast' : 'Thoughtful sentiment'}
• Option 4: Absurdist (81-100 chars) - Surreal twist punchline`;

  // Tone gating hint
  if (!tone.toLowerCase().includes('savage') && !tone.toLowerCase().includes('humorous')) {
    message += `\n\nTONE GATING: No roasts/insults - keep Option 3 as thoughtful extended sentiment`;
  }
  
  return message;
}

// Enhanced validator with comedian style palette and Spartan rules
function validateAndRepair(rawText: string, inputs: any): { result: any | null; errors: string[]; repairs: string[] } {
  const errors: string[] = [];
  const repairs: string[] = [];
  
  // Spartan banned words
  const SPARTAN_BANNED_WORDS = [
    'can', 'may', 'just', 'really', 'literally', 'actually', 'probably', 'basically', 'maybe', 
    'utilize', 'moreover', 'additionally', 'furthermore', 'overall', 'ultimately',
    'in conclusion', 'at the end of the day', 'here\'s how', 'let\'s explore'
  ];
  
  try {
    const parsed = JSON.parse(rawText);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      errors.push("Invalid JSON structure - need 4 lines");
      return { result: null, errors, repairs };
    }
    
    const { tags = [], tone = "" } = inputs;
    
    // Process lines: Spartan cleanup first
    const processedLines = parsed.lines.map((line: any, index: number) => {
      let text = line.text || "";
      
      // Remove Spartan violations
      if (text.includes(";") || text.includes("—") || text.includes("--")) {
        text = text.replace(/;/g, ",").replace(/—/g, " ").replace(/--/g, " ").replace(/\s+/g, " ").trim();
        repairs.push(`Line ${index + 1}: Fixed Spartan punctuation`);
      }
      
      // Remove markdown
      if (text.includes("*") || text.includes("#") || text.includes("@")) {
        text = text.replace(/[*#@]/g, "").replace(/\s+/g, " ").trim();
        repairs.push(`Line ${index + 1}: Removed markdown`);
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
    
    // Length band validation (comedian style palette)
    const lengthBands = [[20, 35], [36, 50], [51, 80], [81, 100]];
    processedLines.forEach((line, index) => {
      const [minLen, maxLen] = lengthBands[index];
      const lineLength = line.text.length;
      
      if (lineLength < minLen) {
        errors.push(`Option ${index + 1}: Too short (${lineLength} chars) - need ${minLen}-${maxLen} for ${['Deadpan', 'Observational', 'Extended', 'Absurdist'][index]} style`);
      } else if (lineLength > maxLen) {
        errors.push(`Option ${index + 1}: Too long (${lineLength} chars) - max ${maxLen} for ${['Deadpan', 'Observational', 'Extended', 'Absurdist'][index]} style`);
      }
    });
    
    // Spartan banned words check
    processedLines.forEach((line, index) => {
      const lowerText = line.text.toLowerCase();
      SPARTAN_BANNED_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word.replace(/'/g, "\\'")}\\b`, 'i');
        if (regex.test(lowerText)) {
          errors.push(`Option ${index + 1}: Contains banned Spartan word "${word}"`);
        }
      });
    });
    
    // Punctuation rules (lane-aware pause limits)
    processedLines.forEach((line, index) => {
      const pauseCount = (line.text.match(/[,:]/g) || []).length;
      const maxPauses = index === 3 ? 2 : 1; // Option 4 gets 2, others get 1
      if (pauseCount > maxPauses) {
        errors.push(`Option ${index + 1}: Too many pauses (${pauseCount}) - max ${maxPauses} comma${maxPauses > 1 ? 's' : ''} OR colon${maxPauses > 1 ? 's' : ''} per line`);
      }
    });
    
    // Tone gating for Option 3 (Extended thought)
    if (processedLines.length > 2 && !tone.toLowerCase().includes('savage') && !tone.toLowerCase().includes('humorous')) {
      const option3Text = processedLines[2].text.toLowerCase();
      const roastWords = ['stupid', 'ugly', 'loser', 'pathetic', 'failure', 'worst', 'terrible', 'awful', 'suck', 'hate'];
      if (roastWords.some(word => option3Text.includes(word))) {
        errors.push(`Option 3: Cannot roast with ${tone} tone - must be thoughtful sentiment instead`);
      }
    }
    
    // TAG HANDLING: At least 3 of 4 lines must include ALL tags literally
    if (tags.length > 0) { 
      const hasAllTags = (text: string, tags: string[]) =>
        tags.every(tag => text.toLowerCase().includes(tag.toLowerCase()));
      
      const linesWithAllTags = processedLines.filter(line => hasAllTags(line.text, tags));
      
      if (linesWithAllTags.length < 3) {
        errors.push(`Tag rule violation: Only ${linesWithAllTags.length} of 4 lines have all tags [${tags.join(', ')}] - need at least 3`);
        
        // Simple repair attempt
        for (let i = 0; i < 3 && linesWithAllTags.length < 3; i++) {
          const line = processedLines[i];
          if (!hasAllTags(line.text, tags)) {
            const tagText = tags.join(" ");
            const newText = `${tagText} ${line.text.toLowerCase()}`;
            
            // Only apply if within length band
            const [minLen, maxLen] = lengthBands[i];
            if (newText.length >= minLen && newText.length <= maxLen) {
              line.text = newText;
              repairs.push(`Option ${i + 1}: Added tags at start`);
            }
          }
        }
      }
    }
    
    // Occasion throttle
    const ctxKey = `${inputs.category?.toLowerCase() || ''}.${inputs.subcategory?.toLowerCase() || ''}`;
    const anchors = ANCHORS[ctxKey] || [];
    const occasionTokens = [
      inputs.category?.toLowerCase(),
      inputs.subcategory?.toLowerCase(),
      ...anchors
    ].filter((token, index, arr) => arr.indexOf(token) === index && token);
    
    if (occasionTokens.length > 0) {
      const linesWithOccasionTokens = processedLines.filter(line => 
        occasionTokens.some(token => line.text.toLowerCase().includes(token.toLowerCase()))
      );
      
      if (linesWithOccasionTokens.length > 1) {
        errors.push(`Occasion throttle: Found ${linesWithOccasionTokens.length} lines with occasion words - max 1 allowed`);
      }
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
    let feedback = `PREVIOUS ATTEMPT FAILED: ${previousErrors.join("; ")}`;
    
    // Add specific guidance for length band failures
    if (previousErrors.some(err => err.includes("Too short") || err.includes("Too long"))) {
      feedback += `\n\nCRITICAL LENGTH BANDS:
• Option 1: 20-35 chars (Deadpan style)
• Option 2: 36-50 chars (Observational style)
• Option 3: 51-80 chars (Extended thought)
• Option 4: 81-100 chars (Absurdist twist)`;
    }
    
    // Add specific guidance for Spartan rule failures
    if (previousErrors.some(err => err.includes("banned") || err.includes("pauses"))) {
      feedback += `\n\nSPARTAN RULES: No semicolons, em dashes, banned words. Options 1-3: max 1 pause, Option 4: max 2 pauses`;
    }
    
    // Add tag guidance
    if (previousErrors.some(err => err.includes("tag"))) {
      feedback += `\n\nTAG RULE: At least 3/4 lines must include ALL tags literally`;
    }
    
    // Add tone gating guidance
    if (previousErrors.some(err => err.includes("Cannot roast"))) {
      feedback += `\n\nTONE GATING: Option 3 cannot roast with non-Savage tones`;
    }
    
    feedback += `\n\nCORRECT FORMAT EXAMPLE:
{"lines":[
  {"lane":"option1","text":"That expired."}, 
  {"lane":"option2","text":"Why does this feel like a job interview?"},
  {"lane":"option3","text":"This costs more than your last relationship did."},
  {"lane":"option4","text":"Everything here applied for witness protection after you arrived."}
]}`;
    userMessage += `\n\n${feedback}`;
  }
  
  console.log(`LLM attempt ${attemptNumber}/2`);
  console.log("User message:", userMessage);
  
  try {
    // Model cascade: GPT-5 flagship for comedian creativity, GPT-4.1 for retry  
    const models = ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14'];
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
