import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const AVOID_WORDS = [
  // Generic phrases that kill comedy
  "timing is everything", "truth hurts", "laughter is the best medicine",
  "it is what it is", "at the end of the day", "everything happens for a reason",
  "when life gives you", "blessed", "grateful", "living my best life",
  "adulting", "squad goals", "relationship goals", "mood", "same energy",
  "no cap", "periodt", "slay", "stan", "tea", "lowkey", "highkey",
  "sending thoughts and prayers", "this too shall pass", "stay positive",
  
  // Overused meme formats - EXPANDED
  "nobody asked but", "tell me you're", "the audacity", "choose your fighter",
  "this you?", "I'm deceased", "not me", "the way I", "bestie",
  "plot twist", "mission failed successfully", "peak chaos", "vibes detected",
  "reality called", "based on a true story", "unfortunately", "energy detected",
  "achievement unlocked", "premium nonsense", "warranty voided", "tutorial level",
  
  // Cliché social media language  
  "living for", "obsessed with", "here for it", "not sorry", "unapologetic",
  "authentic self", "journey", "growth mindset", "manifesting"
];

function getTopicalAnchors(category: string, subcategory: string): string[] {
  const anchors: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      anchors.push("group chat", "budget", "age", "calendar", "surprise", "awkward", "planning", "photos", "memory", "reminder");
    } else if (subcategory === "Christmas Day") {
      anchors.push("travel delay", "family group chat", "budget panic", "awkward tradition", "thermostat war", "receipt", "shipping delay", "leftover", "matching pajama", "office party", "hr training", "dietary drama", "assembly", "missing screw", "instruction", "battery", "wifi", "credit card", "parking", "checkout line");
    } else if (subcategory === "New Year's Eve") {
      anchors.push("resolution", "gym membership", "diet", "app download", "uber surge", "parking", "group chat", "countdown app", "phone battery", "photo backup");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      anchors.push("budget", "planning", "guest list", "seating chart", "vendor", "timeline", "weather", "group chat", "photo", "coordination");
    } else if (subcategory === "Graduation") {
      anchors.push("job search", "student loan", "resume", "linkedin", "interview", "networking", "apartment hunt", "moving", "family photo");
    }
  }
  
  return anchors;
}

function getClicheBanList(category: string, subcategory: string): string[] {
  const bans: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      bans.push("cake", "candles", "balloons", "party hat", "gift", "present", "wish", "blow out");
    } else if (subcategory === "Christmas Day") {
      // RELAXED: Allow "tree", "ornaments" if used wittily. Hard ban only mega-clichés
      bans.push("santa", "ho ho ho", "sleigh", "reindeer", "chimney", "cookies", "milk", "stockings", "north pole", "elves", "workshop", "jingle bells", "deck the halls", "silent night");
    } else if (subcategory === "New Year's Eve") {
      bans.push("midnight", "countdown", "champagne", "resolution", "fireworks", "ball drop", "auld lang syne", "kiss at midnight");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      bans.push("altar", "vows", "rings", "bouquet", "dress", "tuxedo", "ceremony", "reception", "dancing", "cake cutting");
    } else if (subcategory === "Graduation") {
      bans.push("cap and gown", "diploma", "tassel", "ceremony", "valedictorian", "commencement");
    }
  }
  
  return bans;
}

// Add vibe keywords that should appear in lines to ground them in the subcategory
function getVibeKeywords(category: string, subcategory: string): string[] {
  const vibes: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      vibes.push("birthday", "born", "age", "year older", "celebration");
    } else if (subcategory === "Christmas Day") {
      vibes.push("christmas", "holiday", "december", "festive", "family gathering", "winter break");
    } else if (subcategory === "New Year's Eve") {
      vibes.push("new year", "resolution", "january", "fresh start", "year end");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      vibes.push("wedding", "marriage", "married", "spouse", "honeymoon");
    } else if (subcategory === "Graduation") {
      vibes.push("graduation", "graduate", "degree", "school", "student");
    }
  }
  
  return vibes;
}

function getSystemPrompt(category: string, subcategory: string, tone: string, tags: string[]): string {
  const banList = getClicheBanList(category, subcategory);
  const anchors = getTopicalAnchors(category, subcategory);
  const vibes = getVibeKeywords(category, subcategory);
  
  const banPhrase = banList.length > 0 ? `\n\nSTRICTLY AVOID these overused props: ${banList.join(", ")}. Find unexpected angles instead.` : "";
  const anchorPhrase = anchors.length > 0 ? `\n\nTOPICALITY REQUIREMENT: At least 3 of 4 lines must include one of these fresh angles: ${anchors.join(", ")}. Avoid banned props but ground lines in the actual situation.` : "";
  const vibePhrase = vibes.length > 0 ? `\n\nVIBE GROUNDING: At least 2 of 4 lines should reference "${subcategory}" context using: ${vibes.join(", ")} (or similar natural phrasing).` : "";
  
  const comedyInstructions = tone === "Savage" || tone === "Humorous" || tone === "Playful" ? 
    `\n\nCOMEDY VOICE: Write like a tight stand-up comedian crafting one-liners. Use at least 3 different comedy devices:
- Observational humor ("when you realize...")  
- Contrast/irony ("supposed to be X but...")
- Exaggeration ("47 notifications for...")
- Timing/punchlines ("...and that's when I knew...")
- Unexpected comparisons ("like a budget meeting with...")
- Specific details that hit universal truths
Make each line feel like it could get a laugh from a comedy club audience.` : "";
  
  return `You are a professional comedy writer generating tight one-liners for memes and image overlays. Generate exactly 4 killer lines.

Output ONLY valid JSON in this exact format:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

CONTENT RULES:
- Each line: 15–90 characters
- LENGTH RULES: Aim for obvious variety; include at least one short (≤40) and one long (≥75) line per batch
- All 4 lines completely different
- Simple punctuation: commas, periods, colons only
- NO em-dashes (—) or double dashes (--)

TONE: ${tone}
- ${tone === "Savage" || tone === "Humorous" || tone === "Playful" ? "Sharp, witty, roast-style comedy that hits hard" : "Sincere, heartfelt, uplifting"}${comedyInstructions}

CATEGORY FOCUS:
- Context: ${category} > ${subcategory}
- Subcategory drives the situation${banPhrase}${anchorPhrase}${vibePhrase}

${tags.length > 0 ? `\nTAG ENFORCEMENT (CRITICAL):
- Tags provided: [${tags.join(", ")}]
- AT LEAST 3 of 4 lines MUST include ALL tags literally (not synonyms)
- Weave tags naturally into different positions in each line` : ""}

QUALITY STANDARDS:
- Ban tired phrases: ${AVOID_WORDS.slice(0, 10).join(", ")}, etc.
- Conversational, punchy, quotable
- 4 distinct comedic approaches with different setups and punchlines`;
}

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
    message += `\nTAGS: ${tags.join(", ")}`;
  } else {
    message += `\nTAGS: (none)`;
  }
  
  // Add anti-cliché instruction and JSON reminder
  message += `\n\nAVOID PREDICTABLE REFERENCES: Don't default to obvious props or decorations. Find unexpected angles and surprising observations instead.`;
  message += `\n\nRespond with JSON only.`;
  
  return message;
}

function checkComedyVariety(lines: Array<{lane: string, text: string}>): string | null {
  // Check for at least 2 different comedy patterns
  const patterns = {
    hasQuestion: lines.some(line => line.text.includes('?')),
    hasExclamation: lines.some(line => line.text.includes('!')),
    hasComparison: lines.some(line => /\b(like|than|vs|versus)\b/i.test(line.text)),
    hasContrast: lines.some(line => /\b(but|however|except|until|unless)\b/i.test(line.text)),
    hasReference: lines.some(line => /\b(when|if|that moment|every time)\b/i.test(line.text)),
    hasNarrative: lines.some(line => /\b(today|yesterday|tomorrow|now|then|first|next|finally)\b/i.test(line.text))
  };
  
  const patternCount = Object.values(patterns).filter(Boolean).length;
  if (patternCount < 2) {
    return "Missing comedy variety - need at least 2 different humor patterns (questions, exclamations, comparisons, contrasts, references, narrative)";
  }
  
  return null;
}

function checkTopicalAnchors(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): string | null {
  const anchors = getTopicalAnchors(category, subcategory);
  if (anchors.length === 0) return null;
  
  const anchoredLines = lines.filter(line => {
    const lowerText = line.text.toLowerCase();
    return anchors.some(anchor => lowerText.includes(anchor.toLowerCase()));
  });
  
  if (anchoredLines.length < 3) {
    return `Topical grounding insufficient: ${anchoredLines.length}/4 lines include topical anchors. Need at least 3 from: ${anchors.join(", ")}`;
  }
  
  return null;
}

function checkVibeGrounding(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): string | null {
  const vibes = getVibeKeywords(category, subcategory);
  if (vibes.length === 0) return null;
  
  const vibeGroundedLines = lines.filter(line => {
    const lowerText = line.text.toLowerCase();
    return vibes.some(vibe => lowerText.includes(vibe.toLowerCase()));
  });
  
  if (vibeGroundedLines.length < 2) {
    return `Vibe grounding insufficient: ${vibeGroundedLines.length}/4 lines reference ${subcategory}. Need at least 2 using: ${vibes.join(", ")}`;
  }
  
  return null;
}

function validateAndRepair(lines: Array<{lane: string, text: string}>, category: string, subcategory: string, tone: string, tags: string[]): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[];
  repairedLines?: Array<{lane: string, text: string}>;
  lengths?: number[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let repairedLines = [...lines];
  
  // Character limits (critical)
  for (const line of lines) {
    if (line.text.length > 90) {
      errors.push(`Line too long: "${line.text}" (${line.text.length} chars, max 90)`);
    }
    if (line.text.length < 15) {
      errors.push(`Line too short: "${line.text}" (${line.text.length} chars, min 15)`);
    }
  }
  
  // Length spread check (warning, not critical)
  const lengths = lines.map(line => line.text.length);
  const hasShort = lengths.some(len => len <= 40);
  const hasLong = lengths.some(len => len >= 75);
  
  if (!hasShort || !hasLong) {
    warnings.push("Missing length variety - prefer at least one line ≤40 and one ≥75 characters");
  }
  
  // Banned words check (critical)
  const banList = getClicheBanList(category, subcategory);
  const bannedFound: string[] = [];
  
  for (const line of lines) {
    const lowerText = line.text.toLowerCase();
    for (const ban of banList) {
      if (lowerText.includes(ban.toLowerCase())) {
        bannedFound.push(`"${ban}" in "${line.text}"`);
      }
    }
    
    // Check avoid words
    for (const avoid of AVOID_WORDS) {
      if (lowerText.includes(avoid.toLowerCase())) {
        bannedFound.push(`Cliché "${avoid}" in "${line.text}"`);
      }
    }
  }
  
  if (bannedFound.length > 0) {
    errors.push(`Banned phrases found: ${bannedFound.join("; ")}`);
  }
  
  // Tag coverage (critical if tags provided)
  if (tags.length > 0) {
    const taggedLines = lines.filter(line => {
      const lowerText = line.text.toLowerCase();
      return tags.every(tag => lowerText.includes(tag.toLowerCase()));
    });
    
    if (taggedLines.length < 3) {
      errors.push(`Tag coverage insufficient: ${taggedLines.length}/4 lines include all tags [${tags.join(", ")}]. Need at least 3.`);
    }
  }
  
  // Topical anchors check (critical)
  const anchorError = checkTopicalAnchors(lines, category, subcategory);
  if (anchorError) {
    errors.push(anchorError);
  }
  
  // Vibe grounding check (warning)
  const vibeError = checkVibeGrounding(lines, category, subcategory);
  if (vibeError) {
    warnings.push(vibeError);
  }
  
  // Comedy variety (warning)
  const varietyError = checkComedyVariety(lines);
  if (varietyError) {
    warnings.push(varietyError);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    repairedLines: repairedLines,
    lengths
  };
}

function ensureTagCoverage(lines: Array<{lane: string, text: string}>, tags: string[]): Array<{lane: string, text: string}> {
  if (tags.length === 0) return lines;
  
  const result = [...lines];
  let taggedCount = 0;
  
  // Count lines that already include all tags
  for (let i = 0; i < result.length; i++) {
    const lowerText = result[i].text.toLowerCase();
    const hasAllTags = tags.every(tag => lowerText.includes(tag.toLowerCase()));
    if (hasAllTags) taggedCount++;
  }
  
  console.log(`Tag coverage before adjustment: ${taggedCount}/4 lines include all tags [${tags.join(", ")}]`);
  
  // If we need more tagged lines, modify lines to include tags
  if (taggedCount < 3) {
    const tagStr = tags.join(" ");
    let modifications = 0;
    
    for (let i = 0; i < result.length && taggedCount + modifications < 3; i++) {
      const lowerText = result[i].text.toLowerCase();
      const hasAllTags = tags.every(tag => lowerText.includes(tag.toLowerCase()));
      
      if (!hasAllTags) {
        const originalText = result[i].text;
        let newText = "";
        
        // Try different insertion strategies
        if (originalText.length + tagStr.length + 2 <= 90) {
          // Prefix style
          newText = `${tagStr}: ${originalText.toLowerCase()}`;
        } else if (originalText.length + tagStr.length + 7 <= 90) {
          // Middle insertion
          const words = originalText.split(' ');
          const midPoint = Math.floor(words.length / 2);
          words.splice(midPoint, 0, `with ${tagStr}`);
          newText = words.join(' ');
        } else {
          // Suffix style - truncate if needed
          const maxOriginalLength = 90 - tagStr.length - 3;
          const truncated = originalText.length > maxOriginalLength 
            ? originalText.slice(0, maxOriginalLength).trim() 
            : originalText;
          newText = `${truncated} — ${tagStr}`;
        }
        
        // Ensure we don't exceed character limit
        if (newText.length <= 90) {
          result[i].text = newText;
          modifications++;
          console.log(`Modified line ${i + 1}: "${originalText}" → "${newText}"`);
        }
      }
    }
    
    console.log(`Tag coverage after adjustment: ${taggedCount + modifications}/4 lines include all tags`);
  }
  
  return result;
}

function getToneAwareFallback(category: string, subcategory: string, tone: string, tags: string[]): Array<{lane: string, text: string}> {
  // Try to create category-specific fallback that follows our rules
  if (category === "Celebrations" && subcategory === "Christmas Day") {
    if (tone === "Savage" || tone === "Humorous") {
      let fallbackLines = [
        { lane: "option1", text: "Christmas morning: when adult assembly skills meet childhood expectations" },
        { lane: "option2", text: "Holiday budget vs. December reality, a tragic love story in 37 receipts" },
        { lane: "option3", text: "Family group chat peace treaty negotiations failed, thermostat warfare continues" },
        { lane: "option4", text: "Christmas dinner: dietary restrictions meet traditional guilt, nobody wins" }
      ];
      
      return ensureTagCoverage(fallbackLines, tags);
    } else {
      let fallbackLines = [
        { lane: "option1", text: "Christmas brings us together, assembly instructions and all" },
        { lane: "option2", text: "Holiday traditions: where organized chaos meets matching pajama diplomacy" },
        { lane: "option3", text: "December teaches patience, one missing screw at a time" },
        { lane: "option4", text: "Christmas love comes with shipping delays and family group chat drama" }
      ];
      
      return ensureTagCoverage(fallbackLines, tags);
    }
  }
  
  if (category === "Celebrations" && subcategory === "Birthday") {
    if (tone === "Savage" || tone === "Humorous") {
      let fallbackLines = [
        { lane: "option1", text: "Another year older, group chat notifications unchanged." },
        { lane: "option2", text: "Age is just a number. Mine's in witness protection." },
        { lane: "option3", text: "Birthday planning: where optimism goes to die slowly." },
        { lane: "option4", text: "Growing up is optional, phone storage is not." }
      ];
      
      return ensureTagCoverage(fallbackLines, tags);
    }
  }
  
  // Generic fallback that avoids banned phrases
  let fallbackLines = [
    { lane: "option1", text: "When moments get memorable, documentation required." },
    { lane: "option2", text: "This situation brought to you by poor planning." },
    { lane: "option3", text: "Life's like a group chat: everyone's got opinions." },
    { lane: "option4", text: "Some days require assembly, instructions sold separately." }
  ];
  
  return ensureTagCoverage(fallbackLines, tags);
}

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
    
    // Model cascade
    const models = ['gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07'];
    const model = models[Math.min(attemptNumber - 1, models.length - 1)];
    
    console.log(`Using model: ${model}`);
    
    // Use the enhanced system prompt
    const systemPrompt = getSystemPrompt(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }
    };
    
    // Model-specific parameters
    if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1')) {
      requestBody.max_completion_tokens = 300;
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
    
    // Parse and validate
    let parsedLines = null;
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.lines && Array.isArray(parsed.lines) && parsed.lines.length === 4) {
        parsedLines = parsed.lines;
      } else {
        throw new Error("Invalid JSON structure - need 4 lines");
      }
    } catch (e) {
      console.log("Failed to parse JSON from model:", e.message);
      throw new Error(`JSON parse error: ${e.message}`);
    }
    
    // Validate with our rules
    const validation = validateAndRepair(parsedLines, inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
    
    if (validation.isValid) {
      console.log(`Attempt ${attemptNumber} succeeded`);
      return {
        success: true,
        lines: parsedLines,
        model: data.model,
        warnings: validation.warnings,
        lengths: validation.lengths
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, validation.errors.join(", "));
      return { 
        success: false,
        errors: validation.errors,
        rawLines: parsedLines,
        model: data.model
      };
    }
    
  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    throw error;
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
      const fallbackLines = getToneAwareFallback(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
      return new Response(JSON.stringify({
        lines: fallbackLines,
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try up to 2 attempts
    const maxAttempts = 2;
    let rawCandidate: Array<{lane: string, text: string}> | null = null;
    let finalResult: Array<{lane: string, text: string}> | null = null;
    let allErrors: string[] = [];
    let modelUsed = "unknown";
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`LLM attempt ${attempt}/${maxAttempts}`);
      
      try {
        const result = await attemptGeneration(inputs, attempt, allErrors);
        modelUsed = result.model || modelUsed;
        
        if (result.success && result.lines) {
          finalResult = result.lines;
          console.log(`Success after ${attempt} attempt(s), lengths:`, result.lengths);
          break;
        } else {
          // Preserve the first valid parsed response as a candidate
          if (result.rawLines && !rawCandidate) {
            rawCandidate = result.rawLines;
            console.log(`Preserved raw candidate from attempt ${attempt}:`, rawCandidate.map(l => `"${l.text}" (${l.text.length})`));
          }
          if (result.errors) {
            allErrors.push(...result.errors.map(e => `Attempt ${attempt}: ${e}`));
          }
        }
      } catch (error) {
        console.log(`Attempt ${attempt} error:`, error);
        allErrors.push(`Attempt ${attempt}: ${error.message}`);
      }
    }
    
    // If we have a valid result, return it
    if (finalResult) {
      console.log(`Success: Returning valid result from LLM attempts`);
      const tagEnforcedResult = ensureTagCoverage(finalResult, inputs.tags || []);
      return new Response(JSON.stringify({
        lines: tagEnforcedResult,
        model: modelUsed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If we have raw candidate from earlier attempts that parsed but failed validation, use those
    if (rawCandidate) {
      console.log(`Using preserved raw candidate from earlier attempt instead of fallback`);
      const tagEnforcedCandidate = ensureTagCoverage(rawCandidate, inputs.tags || []);
      return new Response(JSON.stringify({
        lines: tagEnforcedCandidate,
        model: `${modelUsed} (unvalidated)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Final fallback
    console.log(`API completely failed, using tone-aware fallback:`, allErrors);
    const fallbackLines = getToneAwareFallback(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
    
    return new Response(JSON.stringify({
      lines: fallbackLines,
      model: "fallback"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency fallback
    const fallbackLines = getToneAwareFallback("", "", "Balanced", []);
    
    return new Response(JSON.stringify({
      lines: fallbackLines,
      model: "emergency-fallback",
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});