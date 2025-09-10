import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced system prompt with anti-cliché guardrails and comedic variety
function getSystemPrompt(tone: string, category: string, subcategory: string): string {
  const randomSeed = Math.floor(Math.random() * 10000);
  
  const basePrompt = `Return ONLY valid JSON in this exact format:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

Generate 4 distinct text lines that match the ${tone} tone perfectly.

COMEDIC VARIETY MANDATE (Each option MUST use a different device):
• Option 1: ROAST/PUNCHLINE - Sharp, direct hit with unexpected twist
• Option 2: MISDIRECTION/TWIST - Setup expectation, then subvert it  
• Option 3: HYPERBOLE/EXAGGERATION - Over-the-top absurd take
• Option 4: ABSURD/LEFT-FIELD - Completely unexpected observation

ANTI-CLICHÉ GUARDRAILS:
${getClicheBanList(category, subcategory)}
• Avoid predictable references unless tagged by user
• Skip obvious props, decorations, or expected elements
• Find unexpected angles instead of surface-level observations
• Make people think "I never thought of it that way"

LENGTH RULES:
• Each line: 15-90 characters (strict maximum 90)
• Aim for obvious length variety in each batch
• Include at least one short line (≤40 chars) and one long line (≥75 chars)

CORE WRITING RULES:
• Write like a real person talking - natural, conversational, human
• Each line gets ONE comma OR colon maximum - never both, never multiple commas
• Complete sentences with proper punctuation
• No corporate buzzwords or AI-sounding phrases
• No semicolons, em dashes, or multiple pauses
• No markdown formatting (*bold* #hashtag @mentions)

HUMAN WRITING GUIDELINES:
• Use contractions naturally (you're, don't, can't, won't, it's)
• Write how people actually talk in real conversations
• Avoid formal or academic language
• Make it feel authentic and relatable
• Skip overused transition words and filler

${getToneSpecificGuidance(tone)}

RANDOMNESS SEED: RND-${randomSeed} (use this for diverse sampling)

Write like a human having a real conversation - authentic ${tone.toLowerCase()} voice that flows naturally.`;

  return basePrompt;
}

// Category-specific cliché ban lists
function getClicheBanList(category: string, subcategory: string): string {
  const lower = `${category}.${subcategory}`.toLowerCase();
  
  if (lower.includes('birthday')) {
    return `• BANNED for Birthday (unless tagged): cake, candles, balloons, confetti, party hats, gifts, wishes, years older, getting old, aging, wrinkles
• Focus on: life choices, personality quirks, habits, relationships, unexpected observations`;
  }
  
  if (lower.includes('wedding')) {
    return `• BANNED for Wedding (unless tagged): rings, vows, champagne, roses, dress, groom, bride, altar, "I do"
• Focus on: relationship dynamics, commitment fears, family drama, life changes`;
  }
  
  if (lower.includes('halloween')) {
    return `• BANNED for Halloween (unless tagged): costumes, candy, trick-or-treat, ghosts, pumpkins, scary
• Focus on: adult behavior, social awkwardness, sugar crashes, identity exploration`;
  }
  
  if (lower.includes('christmas')) {
    return `• BANNED for Christmas (unless tagged): Santa, presents, tree, snow, cookies, reindeer, stockings
• Focus on: family dynamics, spending habits, winter depression, expectations vs reality`;
  }
  
  return `• Avoid obvious props and decorations for ${subcategory}
• Find unexpected angles instead of surface-level observations`;
}

function getToneGuidance(tone: string): string {
  const lowerTone = tone.toLowerCase();
  if (lowerTone.includes('savage') || lowerTone.includes('roast')) {
    return 'Sharp wit or clever insult';
  } else if (lowerTone.includes('romantic') || lowerTone.includes('sentimental')) {
    return 'Heartfelt sentiment';
  } else if (lowerTone.includes('inspirational') || lowerTone.includes('motivational')) {
    return 'Uplifting message';
  } else {
    return 'Thoughtful reflection';
  }
}

function getToneSpecificGuidance(tone: string): string {
  const lowerTone = tone.toLowerCase();
  
  if (lowerTone.includes('savage') || lowerTone.includes('roast')) {
    return `SAVAGE TONE GUIDANCE:
• Be cleverly cutting, not cruel
• Use wit and wordplay for impact
• Target behaviors or situations, not personal appearance
• Make it funny-sharp, not mean-spirited`;
  } 
  
  if (lowerTone.includes('romantic') || lowerTone.includes('sentimental')) {
    return `ROMANTIC/SENTIMENTAL TONE GUIDANCE:
• Express genuine warmth and affection
• Focus on positive emotions and connection
• Use gentle, loving language
• Celebrate the relationship or moment`;
  }
  
  if (lowerTone.includes('inspirational') || lowerTone.includes('motivational')) {
    return `INSPIRATIONAL TONE GUIDANCE:
• Encourage and uplift
• Focus on potential and possibilities
• Use empowering, positive language
• Motivate action or positive thinking`;
  }
  
  return `GENERAL TONE GUIDANCE:
• Match the ${tone} feeling consistently
• Keep language appropriate to the tone
• Focus on the emotional impact you want to create`;
}

// Varied tone-aware fallback generation without clichés
function generateToneAwareFallback(inputs: any): any {
  console.log("Using tone-aware fallback generation");
  
  const { tags = [], tone = "Savage", category = "", subcategory = "" } = inputs;
  const lowerTone = tone.toLowerCase();
  const randomSeed = Math.floor(Math.random() * 4);
  
  let fallbackSets: string[][] = [];
  
  if (lowerTone.includes('savage') || lowerTone.includes('roast')) {
    fallbackSets = [
      [
        "That expired last Tuesday.",
        "Your energy screams 'return policy needed.'",
        "This situation applied for witness protection after you arrived.",  
        "Everything here suddenly developed trust issues."
      ],
      [
        "Peak chaos energy detected.",
        "Why does this feel like a job interview nobody wanted?",
        "This costs more than your last three relationships combined.",
        "Plot twist: the real entertainment was the friends we lost along the way."
      ],
      [
        "Mission failed successfully.",
        "Your vibes called in sick today, apparently.",
        "This scenario definitely wasn't in the instruction manual.",
        "Results may vary, warranty clearly voided."
      ],
      [
        "That's some premium nonsense right there.",
        "Someone definitely skipped the tutorial level.",
        "This energy could power a small anxiety disorder.",
        "Achievement unlocked: made things weird without trying."
      ]
    ];
  } else if (lowerTone.includes('romantic') || lowerTone.includes('sentimental')) {
    fallbackSets = [
      [
        "This moment holds magic.",
        "You notice how time slows in perfect moments?",
        "Every heartbeat writes poetry only two people understand.",
        "This feeling creates memories that dance through decades."
      ],
      [
        "Hearts recognize home here.",
        "Love whispers secrets only souls can hear clearly.",
        "This connection sparkles brighter than any photograph could capture.",
        "Time stops when two hearts finally find their rhythm together."
      ],
      [
        "Pure magic lives here.",
        "Your eyes hold stories worth reading forever and always.",
        "This tenderness transforms ordinary seconds into precious treasures.",
        "Every touch writes love letters across grateful skin."
      ],
      [  
        "This warmth feels infinite.",
        "Love creates its own gravity, pulling hearts closer naturally.",
        "These moments become the songs hearts hum during lonely nights.",
        "Connection this deep makes the universe feel perfectly aligned."
      ]
    ];
  } else if (lowerTone.includes('inspirational') || lowerTone.includes('motivational')) {
    fallbackSets = [
      [
        "Dreams start right here.",
        "Notice how possibilities multiply when you show up?",
        "Every bold step forward creates new paths to extraordinary places.",
        "This energy transforms ordinary moments into launching pads for greatness."
      ],
      [
        "Your potential just woke up.",
        "Courage compounds when you choose growth over comfort repeatedly.",
        "This decision echoes through every future version of yourself.",
        "Amazing happens when preparation meets the moment you stop waiting."
      ],
      [
        "Breakthrough territory ahead.",
        "Your next level self is applauding this exact moment.",
        "Growth lives in the space between comfortable and impossible.",
        "This is how legends begin: one authentic choice at a time."
      ],
      [
        "Victory starts with showing up.",
        "Excellence whispers before it roars, and you're listening perfectly.",
        "This moment proves you're stronger than every excuse that once held you back.",
        "Champions aren't born ready; they're forged in moments exactly like this one."
      ]
    ];
  } else {
    // Default balanced tone with more variety
    fallbackSets = [
      [
        "This moment tells stories.",
        "You notice how experiences layer meaning over time?",
        "Everything here creates connections that ripple through memory.",
        "This feeling writes itself into the collection of moments that matter."
      ],
      [
        "Reality shifts here slightly.",
        "Some moments insist on being remembered differently than others.",
        "This experience adds weight to the archive of significant encounters.",
        "Life deposits these scenes in the vault reserved for replay value."
      ],
      [
        "Context changes everything here.",
        "Certain moments demand their own category in the mental filing system.",
        "This encounter earns permanent residence in the highlight reel.",
        "Memory will polish this experience until it gleams with significance."
      ],
      [
        "Time bends around this.",
        "Some experiences refuse to fit into standard measurement categories.",
        "This moment graduates from event to story worth telling repeatedly.",
        "The universe occasionally provides moments that explain everything else."
      ]
    ];
  }
  
  // Select a random set to avoid repetition
  const selectedSet = fallbackSets[randomSeed % fallbackSets.length];
  
  // Add tags naturally if provided
  let finalLines = selectedSet;
  if (tags.length > 0) {
    const tagString = tags.join(" ");
    finalLines = selectedSet.map((line, index) => {
      // Add tags to first 3 lines to meet tag requirement
      if (index < 3) {
        return `${tagString} ${line.toLowerCase()}`;
      }
      return line;
    });
  }
  
  return {
    lines: finalLines.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "varied-fallback",
    validated: true,
    reason: "fallback_generation",
    tone: tone,
    tags_used: tags.length > 0,
    lengths: finalLines.map(t => t.length),
    set_used: randomSeed % fallbackSets.length
  };
}

// Enhanced user message building without anchor hints
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  const randomToken = `RND-${Math.floor(Math.random() * 10000)}`;
  
  // Generate randomized length targets for variety
  const lengthTargets = Array.from({length: 4}, () => 
    Math.floor(Math.random() * 76) + 15 // 15-90 range
  ).sort((a, b) => a - b); // Show spread clearly
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Randomness Token: ${randomToken}
LENGTH TARGETS (approx): [${lengthTargets.join(', ')}]`;

  // Include tags if provided with stronger enforcement
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")} (include naturally in at least 3 of 4 lines - STRICTLY ENFORCED)`;
  } else {
    message += `\nTAGS: (none)`;
  }
  
  // Add anti-cliché instruction
  message += `\n\nAVOID PREDICTABLE REFERENCES: Don't default to obvious props or decorations. Find unexpected angles and surprising observations instead.`;
  
  return message;
}

// Enhanced validation with cliché detection and uniqueness checking
function validateAndRepair(rawText: string, inputs: any): { result: any | null; errors: string[]; repairs: string[] } {
  const errors: string[] = [];
  const repairs: string[] = [];
  
  // Enhanced banned words including clichés
  const AVOID_WORDS = ['utilize', 'moreover', 'additionally', 'furthermore', 'ultimately'];
  
  // Category-specific cliché detection
  const getClichePhrases = (category: string, subcategory: string): string[] => {
    const lower = `${category}.${subcategory}`.toLowerCase();
    
    if (lower.includes('birthday')) {
      return ['another year', 'getting old', 'blow out', 'make a wish', 'over the hill', 'age is just'];
    }
    if (lower.includes('wedding')) {
      return ['til death do us part', 'happily ever after', 'big day', 'tie the knot', 'better half'];
    }
    return ['once in a lifetime', 'special day', 'memorable moment'];
  };
  
  try {
    const parsed = JSON.parse(rawText);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      errors.push("Invalid JSON structure - need 4 lines");
      return { result: null, errors, repairs };
    }
    
    const { tags = [], tone = "", category = "", subcategory = "" } = inputs;
    const clichePhrases = getClichePhrases(category, subcategory);
    
    // Process lines with basic cleanup
    const processedLines = parsed.lines.map((line: any, index: number) => {
      let text = line.text || "";
      
      // Basic cleanup - fix semicolons and em dashes
      if (text.includes(";") || text.includes("—")) {
        text = text.replace(/;/g, ",").replace(/—/g, "-");
        repairs.push(`Line ${index + 1}: Fixed punctuation`);
      }
      
      // Remove markdown
      if (text.includes("*") || text.includes("#") || text.includes("@")) {
        text = text.replace(/[*#@]/g, "");
        repairs.push(`Line ${index + 1}: Removed markdown`);
      }
      
      // Ensure complete sentence
      if (!/[.!?]$/.test(text.trim())) {
        text = text.trim() + ".";
        repairs.push(`Line ${index + 1}: Added punctuation`);
      }
      
      return {
        ...line,
        text: text.trim()
      };
    });
    
    // Enhanced length validation with 90-char max and spread requirements
    const lineLengths = processedLines.map(line => line.text.length);
    const shortLines = lineLengths.filter(len => len <= 40);
    const longLines = lineLengths.filter(len => len >= 75);
    
    processedLines.forEach((line, index) => {
      const lineLength = line.text.length;
      
      if (lineLength < 15) {
        errors.push(`Option ${index + 1}: Too short (${lineLength} chars) - minimum 15 characters`);
      } else if (lineLength > 90) {
        errors.push(`Option ${index + 1}: Too long (${lineLength} chars) - maximum 90 characters`);
      }
    });
    
    // Check for length spread requirement
    if (shortLines.length === 0) {
      errors.push("Missing short line - need at least one line ≤40 characters for variety");
    }
    if (longLines.length === 0) {
      errors.push("Missing long line - need at least one line ≥75 characters for variety");
    }
    
    // Check for completely empty or placeholder text
    processedLines.forEach((line, index) => {
      if (!line.text || line.text.length < 5 || line.text === "..." || line.text === "text") {
        errors.push(`Option ${index + 1}: Empty or placeholder text`);
      }
    });
    
    // Strict punctuation rule: max one pause per line (comma OR colon)
    processedLines.forEach((line, index) => {
      const pauseCount = (line.text.match(/[,:]/g) || []).length;
      if (pauseCount > 1) {
        errors.push(`Option ${index + 1}: Too many pauses (${pauseCount}) - max 1 comma OR colon per line`);
      }
    });
    
    // Enhanced cliché detection
    processedLines.forEach((line, index) => {
      const lowerText = line.text.toLowerCase();
      
      // Check for overused words
      AVOID_WORDS.forEach(word => {
        if (lowerText.includes(word)) {
          errors.push(`Option ${index + 1}: Contains overused word "${word}"`);
        }
      });
      
      // Check for category-specific clichés
      clichePhrases.forEach(phrase => {
        if (lowerText.includes(phrase.toLowerCase())) {
          errors.push(`Option ${index + 1}: Contains cliché phrase "${phrase}"`);
        }
      });
    });
    
    // Enhanced uniqueness check
    const texts = processedLines.map(line => line.text.toLowerCase().trim());
    const uniqueTexts = new Set(texts);
    if (uniqueTexts.size < 4) {
      errors.push("Duplicate content detected - all 4 lines should be unique");
    }
    
    // Check for comedic variety (savage tone specific)
    if (tone.toLowerCase().includes('savage')) {
      const hasVariety = checkComedyVariety(processedLines.map(l => l.text));
      if (!hasVariety) {
        errors.push("Insufficient comedic variety - need different devices (roast, twist, hyperbole, absurd)");
      }
    }
    
    // Stronger tag coverage enforcement - require 3/4 lines with all tags
    if (tags.length > 0) { 
      const hasAllTags = (text: string, tags: string[]) =>
        tags.every(tag => text.toLowerCase().includes(tag.toLowerCase()));
      
      const linesWithAllTags = processedLines.filter(line => hasAllTags(line.text, tags));
      
      if (linesWithAllTags.length < 3) {
        errors.push(`CRITICAL: Tag coverage insufficient - only ${linesWithAllTags.length}/4 lines include all tags [${tags.join(', ')}]. Need at least 3/4 lines with ALL tags.`);
      }
    }
    
    // Only fail on critical errors, treat others as warnings
    const criticalErrors = errors.filter(err => 
      err.includes("Empty or placeholder") || 
      err.includes("Invalid JSON") ||
      err.includes("Duplicate content") ||
      err.includes("Contains cliché phrase") ||
      err.includes("CRITICAL: Tag coverage") ||
      err.includes("Too long") ||
      err.includes("Missing short line") ||
      err.includes("Missing long line")
    );
    
    if (criticalErrors.length === 0) {
      return {
        result: { lines: processedLines },
        errors: [], // Return success even with warnings
        repairs
      };
    }
    
    return { result: null, errors: criticalErrors, repairs };
    
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    return { result: null, errors, repairs };
  }
}

// Helper function to check comedy variety
function checkComedyVariety(lines: string[]): boolean {
  // Simple heuristic - look for different patterns
  const patterns = {
    roast: /\b(expired|failed|worst|disaster|applied for|protection)\b/i,
    twist: /\b(plot twist|turns out|actually|surprise|meanwhile)\b/i,
    hyperbole: /\b(literally|absolutely|completely|totally|entirely|all)\b/i,
    absurd: /\b(universe|quantum|physics|dimension|aliens|witness protection)\b/i
  };
  
  const usedPatterns = new Set();
  lines.forEach(line => {
    Object.entries(patterns).forEach(([type, regex]) => {
      if (regex.test(line)) {
        usedPatterns.add(type);
      }
    });
  });
  
  return usedPatterns.size >= 2; // At least 2 different patterns
}

// Updated generation with improved model cascade and tone-first approach
async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  try {
    let userMessage = buildUserMessage(inputs);
    
    // Add feedback for retry attempts
    if (attemptNumber > 1 && previousErrors.length > 0) {
      userMessage += `\n\nPREVIOUS ATTEMPT ISSUES: ${previousErrors.join("; ")}
      
Please fix these issues while maintaining the ${inputs.tone} tone and natural flow.`;
    }
    
    console.log(`LLM attempt ${attemptNumber}/2`);
    console.log("User message:", userMessage);
    
    // Improved model cascade - prioritize gpt-4.1-2025-04-14 and gpt-5-mini-2025-08-07
    const models = ['gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07'];
    const model = models[Math.min(attemptNumber - 1, models.length - 1)];
    
    console.log(`Using model: ${model}`);
    
    // Use the enhanced system prompt with category/subcategory for anti-cliché guardrails
    const systemPrompt = getSystemPrompt(inputs.tone || 'Balanced', inputs.category || '', inputs.subcategory || '');
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }
    };
    
    // Model-specific parameters with reduced token counts
    if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1')) {
      requestBody.max_completion_tokens = 300; // Reduced for faster, focused output
    } else {
      requestBody.max_tokens = 300;
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
    
    // Enhanced logging
    console.log(`Attempt ${attemptNumber} API response:`, {
      model: data.model,
      finish_reason: data.choices?.[0]?.finish_reason,
      content_length: data.choices?.[0]?.message?.content?.length || 0,
      usage: data.usage
    });
    
    // Check for missing content
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Empty or missing content from OpenAI:", data);
      throw new Error("Empty response from OpenAI API");
    }
    
    const rawContent = data.choices[0].message.content.trim();
    
    if (!rawContent) {
      throw new Error("Empty response from OpenAI API");
    }
    
    console.log(`Attempt ${attemptNumber} raw response (${rawContent.length} chars):`, 
      rawContent.substring(0, 200) + (rawContent.length > 200 ? "..." : ""));
    
    // Parse and preserve raw output
    let rawLines = null;
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.lines && Array.isArray(parsed.lines)) {
        rawLines = parsed.lines;
      }
    } catch (e) {
      console.log("Failed to parse JSON from model");
    }
    
    // Validate with relaxed rules
    const { result, errors, repairs } = validateAndRepair(rawContent, inputs);
    
    if (result) {
      console.log(`Attempt ${attemptNumber} succeeded with ${repairs.length} repairs`);
      return {
        lines: result.lines,
        model: `${data.model} (validated)`,
        validated: true,
        repairs,
        attempt: attemptNumber,
        lengths: result.lines.map((l: any) => l.text.length)
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, errors.join(", "));
      return { 
        errors, 
        rawLines: rawLines,
        model: data.model,
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
    const inputs = await req.json();
    console.log("Request data:", inputs);
    
    // If no API key, return fallback immediately
    if (!openAIApiKey) {
      console.log("No OpenAI API key, using tone-aware fallback");
      const fallback = generateToneAwareFallback(inputs);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Self-test mode for debugging
    if (inputs.self_test) {
      console.log("Self-test mode activated");
      const testCases = [
        { category: "Celebrations", subcategory: "Birthday", tone: "Romantic", tags: [] },
        { category: "Celebrations", subcategory: "Birthday", tone: "Savage", tags: ["cake"] },
        { category: "Celebrations", subcategory: "Halloween", tone: "Savage", tags: [] }
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
    
    // Try up to 2 attempts with improved cascade
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
    
    // If validation failed but we have model output, use it (prefer model over fallback)
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
      console.log("API completely failed, using tone-aware fallback:", allErrors);
      finalResult = generateToneAwareFallback(inputs);
      finalResult.llm_errors = allErrors;
      finalResult.fallback_reason = "api_completely_failed";
    }
    
    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency fallback based on tone
    const tone = error.inputs?.tone || "Balanced";
    const emergencyFallback = generateToneAwareFallback(error.inputs || { tone });
    emergencyFallback.error = error.message;
    emergencyFallback.model = "emergency-fallback";
    
    return new Response(JSON.stringify(emergencyFallback), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});