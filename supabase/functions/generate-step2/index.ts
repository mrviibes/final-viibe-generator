import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Tone-first system prompt
function getSystemPrompt(tone: string, hasAnchors: boolean): string {
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

LINE CHARACTERISTICS:
• Option 1: Short & punchy (15-35 chars) - Direct impact
• Option 2: Mid-length observation (25-50 chars) - Relatable insight  
• Option 3: Extended thought (40-70 chars) - ${getToneGuidance(tone)}
• Option 4: Creative twist (45-70 chars) - Unexpected angle

CORE WRITING RULES:
• Write complete sentences that end with proper punctuation
• Avoid overused words: can, may, just, really, literally, actually, probably, basically, maybe
• No semicolons, em dashes, or excessive commas
• No markdown formatting (*bold* #hashtag @mentions)
• Keep it natural and conversational

${getToneSpecificGuidance(tone)}

Quality over rigid structure - prioritize ${tone.toLowerCase()} feeling and natural flow.`;

  return basePrompt;
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

// Category-specific anchor dictionaries for optional context
const ANCHORS = {
  "celebrations.birthday": ["cake", "candles", "balloons", "confetti", "party hats", "gifts"],
  "celebrations.wedding": ["ring", "vows", "champagne", "roses", "bride", "groom"],
  "sports.hockey": ["ice rink", "stick", "puck", "goal net", "helmets", "locker room"],
  "sports.basketball": ["court", "hoop", "net", "sneakers", "scoreboard", "bench"],
  "vibes & punchlines.dad jokes": [],
  "vibes & punchlines.puns": [],
  "pop culture.celebrities": []
};

// Tone-aware fallback generation with curated content banks
function generateToneAwareFallback(inputs: any): any {
  console.log("Using tone-aware fallback generation");
  
  const { tags = [], tone = "Savage", category = "", subcategory = "" } = inputs;
  const lowerTone = tone.toLowerCase();
  
  let fallbackLines: string[] = [];
  
  if (lowerTone.includes('savage') || lowerTone.includes('roast')) {
    fallbackLines = [
      "That expired.",
      "Why does this feel like a job interview?", 
      "This costs more than your last three relationships.",
      "Everything here applied for witness protection after you arrived."
    ];
  } else if (lowerTone.includes('romantic') || lowerTone.includes('sentimental')) {
    fallbackLines = [
      "This moment sparkles.",
      "Have you noticed how time stops here?",
      "Every detail here whispers stories of love and connection.",
      "This feeling dances through memories that hearts treasure forever."
    ];
  } else if (lowerTone.includes('inspirational') || lowerTone.includes('motivational')) {
    fallbackLines = [
      "Dreams start here.",
      "Notice how possibilities multiply in moments like this?",
      "Every step forward creates new paths to amazing destinations.", 
      "This energy transforms ordinary moments into extraordinary adventures."
    ];
  } else {
    // Default balanced tone
    fallbackLines = [
      "This moment matters.",
      "Have you noticed how special this feels?",
      "Everything here tells a story worth remembering and sharing.",
      "This experience creates connections that time cannot diminish or fade."
    ];
  }
  
  // Add tags naturally if provided
  if (tags.length > 0) {
    const tagString = tags.join(" ");
    fallbackLines = fallbackLines.map((line, index) => {
      // Add tags to first 3 lines to meet tag requirement
      if (index < 3) {
        return `${tagString} ${line.toLowerCase()}`;
      }
      return line;
    });
  }
  
  return {
    lines: fallbackLines.map((text, index) => ({
      lane: `option${index + 1}`,
      text: text
    })),
    model: "tone-aware-fallback",
    validated: true,
    reason: "fallback_generation",
    tone: tone,
    tags_used: tags.length > 0,
    lengths: fallbackLines.map(t => t.length)
  };
}

// Enhanced user message building
function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [] } = inputs;
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}`;

  // Include tags if provided
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")} (include naturally in at least 3 of 4 lines)`;
  } else {
    message += `\nTAGS: (none)`;
  }
  
  // Get category-specific context hints
  const ctxKey = `${category.toLowerCase()}.${subcategory.toLowerCase()}`;
  const anchors = ANCHORS[ctxKey] || [];
  
  if (anchors.length > 0) {
    message += `\nCONTEXT HINTS: ${anchors.join(", ")} (optional background context)`;
  }
  
  return message;
}

// Relaxed validation with focus on core quality
function validateAndRepair(rawText: string, inputs: any): { result: any | null; errors: string[]; repairs: string[] } {
  const errors: string[] = [];
  const repairs: string[] = [];
  
  // Relaxed banned words (only the worst offenders)
  const AVOID_WORDS = ['utilize', 'moreover', 'additionally', 'furthermore', 'ultimately'];
  
  try {
    const parsed = JSON.parse(rawText);
    
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      errors.push("Invalid JSON structure - need 4 lines");
      return { result: null, errors, repairs };
    }
    
    const { tags = [], tone = "" } = inputs;
    
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
    
    // Relaxed length validation (more flexible ranges)
    processedLines.forEach((line, index) => {
      const lineLength = line.text.length;
      
      // More generous length limits
      if (lineLength < 10) {
        errors.push(`Option ${index + 1}: Too short (${lineLength} chars) - minimum 10 characters`);
      } else if (lineLength > 75) {
        errors.push(`Option ${index + 1}: Too long (${lineLength} chars) - maximum 75 characters`);
      }
    });
    
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
    
    // Avoid worst offender words
    processedLines.forEach((line, index) => {
      const lowerText = line.text.toLowerCase();
      AVOID_WORDS.forEach(word => {
        if (lowerText.includes(word)) {
          errors.push(`Option ${index + 1}: Contains overused word "${word}"`);
        }
      });
    });
    
    // Tag handling - try to have tags in most lines if provided
    if (tags.length > 0) { 
      const hasAnyTag = (text: string, tags: string[]) =>
        tags.some(tag => text.toLowerCase().includes(tag.toLowerCase()));
      
      const linesWithTags = processedLines.filter(line => hasAnyTag(line.text, tags));
      
      if (linesWithTags.length < 2) {
        // Only flag if really no tags used
        errors.push(`Tag suggestion: Consider including tags [${tags.join(', ')}] in more lines`);
      }
    }
    
    // Deduplication check
    const texts = processedLines.map(line => line.text.toLowerCase().trim());
    const uniqueTexts = new Set(texts);
    if (uniqueTexts.size < 4) {
      errors.push("Duplicate content detected - all 4 lines should be unique");
    }
    
    // Only fail on critical errors, treat others as warnings
    const criticalErrors = errors.filter(err => 
      err.includes("Empty or placeholder") || 
      err.includes("Invalid JSON") ||
      err.includes("Duplicate content")
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
    
    // Use the new tone-first system prompt
    const systemPrompt = getSystemPrompt(inputs.tone || 'Balanced', true);
    
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