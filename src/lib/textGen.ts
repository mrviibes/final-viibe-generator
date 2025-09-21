import { supabase } from "@/integrations/supabase/client";
import { getTagArrays, sanitizeInput, ensureHardTags } from "@/lib/parseTags";
import { analyzeContext } from '@/lib/contextDetector';
import { generateContextualFallback } from '@/lib/contextLexicon';
import { ensureHardTagsInFallback, enforceHardTagsPostGeneration } from '@/lib/hardTagEnforcer';
import { validateBatchPunchlines } from '@/lib/punchlineValidator';
import { validateStructureVariety, enforceStructureVariety } from '@/lib/structureValidator';

const SYSTEM_PROMPT = `You are a text line generator for memes and image overlays. Your job is to create exactly 4 one-liners based on the given category, subcategory, tone, and tags.

STRICT RULES:
1. Output ONLY valid JSON in this exact format:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

2. CONTENT RULES:
- Each line must be ≤ 80 characters
- All 4 lines must be completely different
- Use simple punctuation: commas, periods, colons
- NO em-dashes (—) or double dashes (--)
- Ban clichés like "timing is everything", "truth hurts", "laughter is the best medicine"

3. CATEGORY/SUBCATEGORY:
- Subcategory drives context (Birthday > Celebration)
- Focus on unexpected angles instead of obvious props

4. TONE HANDLING:
- Savage/Humorous/Playful → funny, roast-style, witty
- Serious/Sentimental/Nostalgic/Romantic/Inspirational → sincere, heartfelt, uplifting

5. TAG RULES (STRICTLY ENFORCED):
- If no tags → generate normally
- If tags exist: At least 3 out of 4 lines must include ALL tags literally (not synonyms)
- Tags must appear in different spots in the line
- Do not skip tags in more than 1 line

6. VARIETY:
- Create 4 distinct options with varied approaches
- Conversational, natural, human-sounding`;

interface TextGenInput {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[] | {
    hard: string[];
    soft: string[];
  };
  mode?: string; // Backward compatibility
  style?: 'punchline-first' | 'story' | 'pop-culture' | 'wildcard';
  rating?: 'G' | 'PG' | 'PG-13' | 'R' | 'Explicit';
}

interface TextGenOutput {
  lines: Array<{
    lane: string;
    text: string;
  }>;
}

export interface MultiRatingOutput {
  G: { voice: string; text: string }[];
  "PG-13": { voice: string; text: string }[];
  R: { voice: string; text: string }[];
  Explicit: { voice: string; text: string }[];
}

export interface MultiRatingResult {
  ratings: MultiRatingOutput;
  model: string;
  timing: { total_ms: number };
}

function sanitizeAndValidate(text: string, inputs?: TextGenInput): TextGenOutput | null {
  try {
    // Clean up the response
    let cleaned = text.trim();
    
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\s*|\s*```/g, '');
    
    // Parse JSON
    const parsed = JSON.parse(cleaned);
    
    // Validate structure
    if (!parsed.lines || !Array.isArray(parsed.lines)) {
      return null;
    }
    
    if (parsed.lines.length === 0) {
      return null;
    }
    
    // Validate each line with relaxed rules
    const validLines = [];
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        continue;
      }
      
      // Very relaxed character limits: 20-150 chars
      const length = line.text.length;
      if (length < 20 || length > 150) {
        continue;
      }
      
      validLines.push(line);
    }
    
    if (validLines.length === 0) {
      return null;
    }
    
    // Very relaxed validation for inputs
    if (inputs) {
      // Handle both legacy and new tag formats
      let hardTags: string[] = [];
      
      if (Array.isArray(inputs.tags)) {
        const { hard } = getTagArrays(inputs.tags.join(", "));
        hardTags = hard;
      } else if (inputs.tags && typeof inputs.tags === 'object') {
        hardTags = inputs.tags.hard || [];
      }
      
      // Only check tag coverage if there are many hard tags
      if (hardTags.length > 2) {
        let linesWithSomeTags = 0;
        for (const line of validLines) {
          const lowerText = line.text.toLowerCase();
          const hasSomeTags = hardTags.some(tag => 
            lowerText.includes(tag.toLowerCase())
          );
          if (hasSomeTags) {
            linesWithSomeTags++;
          }
        }
        
        // Require at least 30% of lines to have some tags
        if (linesWithSomeTags / validLines.length < 0.3) {
          return null;
        }
      }
    }
    
    return { lines: validLines };
  } catch {
    return null;
  }
}

function buildUserMessage(inputs: TextGenInput): string {
  // Handle both legacy and new tag formats
  let tagsStr = "";
  
  if (Array.isArray(inputs.tags)) {
    tagsStr = inputs.tags.length > 0 ? `, tags: [${inputs.tags.map(t => `"${t}"`).join(",")}]` : "";
  } else if (inputs.tags && typeof inputs.tags === 'object') {
    const allTags = [...inputs.tags.hard.map(t => `"${t}"`), ...inputs.tags.soft];
    tagsStr = allTags.length > 0 ? `, tags: [${allTags.join(",")}]` : "";
  }
  
  let modeInstruction = "";
  if (inputs.mode && inputs.mode !== "regenerate") {
    switch (inputs.mode) {
      case "story-mode":
        modeInstruction = ". MODE: Generate as short 2-3 sentence mini-stories with narrative flow";
        break;
      case "punchline-first":
        modeInstruction = ". MODE: Structure as joke payoff first, then tie-back. Snappy, meme-ready format";
        break;
      case "pop-culture":
        modeInstruction = ". MODE: Include trending memes, shows, sports, or current slang references";
        break;
      case "roast-level":
        modeInstruction = ". MODE: Increase savage/teasing tone while staying playful and fun";
        break;
      case "wildcard":
        modeInstruction = ". MODE: Generate surreal, absurd, or experimental humor. Be creative and unexpected";
        break;
    }
  }
  
  return `Generate 4 one-liners for:
Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}${tagsStr}${modeInstruction}`;
}

function generateFallbackLines(inputs: TextGenInput): TextGenOutput {
  const { category, subcategory, tone, style, rating } = inputs;
  
  // Use imported enhanced fallback systems
  
  // Handle both legacy and new tag formats for context analysis
  let tags: string[] = [];
  let hardTags: string[] = [];
  
  if (Array.isArray(inputs.tags)) {
    tags = inputs.tags;
    const { hard } = getTagArrays(inputs.tags.join(", "));
    hardTags = hard;
  } else if (inputs.tags && typeof inputs.tags === 'object') {
    tags = [...inputs.tags.hard, ...inputs.tags.soft];
    hardTags = inputs.tags.hard || [];
  }
  
  // Analyze context for enhanced fallbacks
  const contextAnalysis = analyzeContext(
    `${category} ${subcategory}`,
    category,
    subcategory,
    tags,
    tone
  );
  
  console.log('🎯 Generating stage-ready fallback with recipe:', contextAnalysis.generationRecipe);
  
  // Try contextual fallback first with comedian voice structure
  if (contextAnalysis.detectedContext?.secondary) {
    const contextualFallbacks = generateContextualFallback(
      contextAnalysis.detectedContext.secondary,
      tone,
      rating || 'PG-13'
    );
    
    if (contextualFallbacks.length >= 4) {
      // Apply hard tag enforcement to contextual fallbacks
      const tagEnforcedFallbacks = ensureHardTagsInFallback(contextualFallbacks, hardTags);
      
      return {
        lines: tagEnforcedFallbacks.map((text, idx) => ({
          lane: `option${idx + 1}`,
          text
        }))
      };
    }
  }
  
  // Enhanced stage-ready fallback with comedian voice structure and authentic delivery
  const comedianFallbacks = generateComedianStyleFallbacks(
    contextAnalysis.suggestedLexicon,
    tone,
    rating || 'PG-13',
    style,
    hardTags // Pass hard tags for authentic integration
  );
  
  // Apply hard tag enforcement to comedian fallbacks
  const fallbackTexts = comedianFallbacks.map(f => f.text);
  const tagEnforcedTexts = ensureHardTagsInFallback(fallbackTexts, hardTags);
  
  return {
    lines: tagEnforcedTexts.map((text, idx) => ({
      lane: `option${idx + 1}`,
      text
    }))
  };
}

function generateComedianStyleFallbacks(
  lexiconWords: string[],
  tone: string,
  rating: string,
  style?: string,
  hardTags?: string[]
): Array<{ lane: string; text: string }> {
  const words = lexiconWords.length > 0 ? lexiconWords.slice(0, 4) : ['life', 'reality', 'experience', 'moment'];
  
  // Enhanced comedian-style fallbacks with authentic delivery and tag integration
  const taggedWord = hardTags && hardTags.length > 0 ? hardTags[0] : null;
  
  if (rating === 'XXX') {
    // Enhanced XXX with raunch + comedian timing + visual imagery (no lazy shock text)
    const xxxFallbacks = taggedWord ? [
      { lane: "option1", text: `${taggedWord} kisses like he's blowing into a Nintendo cartridge, loud messy and somehow nostalgic.` },
      { lane: "option2", text: `Watching ${taggedWord} eat wings is porn for napkins, wet desperate and leaving nothing but regret stains.` },
      { lane: "option3", text: `${taggedWord} said he's romantic, then lit candles on a pizza box and called it foreplay.` },
      { lane: "option4", text: `${taggedWord}'s love life is like Costco samples, short cheap and everyone still feels dirty after.` }
    ] : [
      { lane: "option1", text: `This ${words[0]} kisses like a plumber fixing a leak, wet loud and you still owe money after.` },
      { lane: "option2", text: `${words[1]} goes down smoother than a politician's promises, sweet at first then you realize you got fucked.` },
      { lane: "option3", text: `Plot twist: ${words[2]} decided to ride me harder than a mechanical bull with daddy issues.` },
      { lane: "option4", text: `Based on a true ${words[3]} that left me more satisfied than a Karen finding the manager.` }
    ];
    return xxxFallbacks;
  }
  
  if (rating === 'R') {
    const rFallbacks = taggedWord ? [
      { lane: "option1", text: `${taggedWord} folds laundry like it insulted his fuckin' family, angry and personal.` },
      { lane: "option2", text: `Watching ${taggedWord} parallel park is like watching a drunk surgeon, dangerous and somehow still disappointing.` },
      { lane: "option3", text: `${taggedWord} eats wings with so much sauce the napkins apply for workers comp.` },
      { lane: "option4", text: `Plot twist: ${taggedWord} lit candles on a pizza box and called it romance, the fire alarm called it foreplay.` }
    ] : [
      { lane: "option1", text: `This ${words[0]} hit different, like getting punched by reality's ugly fucking cousin.` },
      { lane: "option2", text: `${words[1]} just roasted me harder than my mom at family dinner damn.` },
      { lane: "option3", text: `Plot twist: ${words[2]} decided to be a complete asshole situation today.` },
      { lane: "option4", text: `Based on a true ${words[3]} that nobody fucking asked for but here we are.` }
    ];
    return rFallbacks;
  }
  
  if (style === 'pop-culture') {
    return [
      { lane: "option1", text: `Netflix couldn't script this level of ${words[0]} chaos honestly.` },
      { lane: "option2", text: `This ${words[1]} deserves its own TikTok trend and I'm here for it.` },
      { lane: "option3", text: `Marvel writers could never create a ${words[2]} twist this unexpected.` },
      { lane: "option4", text: `Even Taylor Swift wouldn't write about this level of ${words[3]} drama.` }
    ];
  }
  
  // Enhanced default comedian-style fallbacks with authentic stage delivery
  if (tone === 'Savage') {
    const savageFallbacks = taggedWord ? [
      { lane: "option1", text: `${taggedWord} really said hold my beer and watch me disappoint everyone professionally.` },
      { lane: "option2", text: `${taggedWord} approached this like a drunk surgeon, confident but nobody should watch.` },
      { lane: "option3", text: `Plot twist: ${taggedWord} decided to be the villain in my origin story, and honestly I respect the commitment.` },
      { lane: "option4", text: `Based on a true ${taggedWord} experience that my therapist charges extra to hear about.` }
    ] : [
      { lane: "option1", text: `This ${words[0]} really said hold my beer and watch me disappoint everyone.` },
      { lane: "option2", text: `${words[1]} just roasted me like a Sunday dinner nobody wanted to attend.` },
      { lane: "option3", text: `Plot twist: ${words[2]} decided to be the villain in my origin story.` },
      { lane: "option4", text: `Based on a true ${words[3]} that my therapist charges extra to hear.` }
    ];
    return savageFallbacks;
  }
  
  // Default humorous fallbacks with stage-ready comedian structure
  const defaultFallbacks = taggedWord ? [
    { lane: "option1", text: `When ${taggedWord} gives you lemons, he makes memes and calls it therapy because that's who he is.` },
    { lane: "option2", text: `Plot twist: this ${taggedWord} situation actually happened and I survived to tell it with minimal trauma.` },
    { lane: "option3", text: `Based on a ${taggedWord} story that my friends refuse to believe but my therapist validates.` },
    { lane: "option4", text: `${taggedWord} called and left a voicemail but I'm too busy processing the emotional damage.` }
  ] : [
    { lane: "option1", text: `When ${words[0]} gives you lemons, make memes and call it therapy.` },
    { lane: "option2", text: `Plot twist: this ${words[1]} actually happened and I survived to tell it.` },
    { lane: "option3", text: `Based on a ${words[2]} story that my friends refuse to believe.` },
    { lane: "option4", text: `${words[3]} called and left a voicemail but I'm too busy processing trauma.` }
  ];
  return defaultFallbacks;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Check if it's a network error that's worth retrying
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      if (!errorMessage.includes('failed to fetch') && 
          !errorMessage.includes('network') && 
          !errorMessage.includes('timeout')) {
        // Not a network error, don't retry
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function generateMultiRatingLines(inputs: TextGenInput): Promise<MultiRatingResult> {
  console.log('🚀 Generating multi-rating lines with inputs:', inputs);
  
  // ROBUST INPUT COERCION
  const coercedInputs = {
    category: inputs.category || 'daily-life',
    subcategory: inputs.subcategory || 'general',
    tone: inputs.tone || 'Humorous',
    tags: inputs.tags || [],
    style: inputs.style || 'punchline-first'
  };

  // Parse tags properly - handle different input formats
  let hardTags: string[] = [];
  let softTags: string[] = [];
  
  if (Array.isArray(coercedInputs.tags)) {
    // Legacy array format - join and parse
    const joinedTags = coercedInputs.tags.join(',');
    const parsedArray = getTagArrays(joinedTags);
    if (Array.isArray(parsedArray)) {
      hardTags = parsedArray.filter((tag: string) => 
        tag.startsWith('"') && tag.endsWith('"')
      ).map((tag: string) => tag.slice(1, -1));
      softTags = parsedArray.filter((tag: string) => 
        !tag.startsWith('"') || !tag.endsWith('"')
      );
    }
  } else if (typeof coercedInputs.tags === 'object' && coercedInputs.tags !== null) {
    // New object format with hard/soft properties
    const tagObj = coercedInputs.tags as any;
    if (tagObj.hard && Array.isArray(tagObj.hard)) {
      hardTags = tagObj.hard;
    }
    if (tagObj.soft && Array.isArray(tagObj.soft)) {
      softTags = tagObj.soft;
    }
  }

  const payload = {
    category: coercedInputs.category,
    subcategory: coercedInputs.subcategory,
    tone: coercedInputs.tone,
    tags: [...hardTags.map(t => `"${t}"`), ...softTags],
    style: coercedInputs.style
  };

  try {
    console.log('📡 Calling generate-step2-clean for multi-rating generation');
    
    const response = await supabase.functions.invoke('generate-step2-clean', {
      body: payload
    });

    if (response.error) {
      console.error('❌ Supabase function error:', response.error);
      throw new Error(`Function error: ${response.error.message}`);
    }

    if (!response.data?.success || !response.data?.ratings) {
      console.error('❌ Invalid response structure:', response.data);
      throw new Error('Invalid response structure from function');
    }

    console.log('✅ Multi-rating generation successful');
    return {
      ratings: response.data.ratings,
      model: response.data.model || 'unknown',
      timing: response.data.timing || { total_ms: 0 }
    };

  } catch (error) {
    console.error('❌ Multi-rating generation failed:', error);
    
    // Emergency fallback - generate all ratings with simple templates
    const fallbackRatings: MultiRatingOutput = {
      G: [
        { voice: "Jim Gaffigan", text: `${coercedInputs.category} is like my sock drawer, organized chaos.` },
        { voice: "Ellen DeGeneres", text: `${coercedInputs.category}? Classic. I'm pretending I planned this.` }
      ],
      "PG-13": [
        { voice: "Kevin Hart", text: `${coercedInputs.category} went sideways faster than expected, damn.` },
        { voice: "Ali Wong", text: `${coercedInputs.category} really said “plot twist” and left.` }
      ],
      R: [
        { voice: "Bill Burr", text: `This ${coercedInputs.category} mess is a trainwreck—and I’m the conductor.` },
        { voice: "Dave Chappelle", text: `${coercedInputs.category} got real, real quick. Buckle up.` }
      ],
      Explicit: [
        { voice: "Sarah Silverman", text: `${coercedInputs.category} screwed me harder than my ex.` },
        { voice: "Ricky Gervais", text: `${coercedInputs.category} is a beautiful disaster—and I brought the matches.` }
      ],
    };
    
    return {
      ratings: fallbackRatings,
      model: 'fallback',
      timing: { total_ms: 0 }
    };
  }
}

export async function generateStep2Lines(inputs: TextGenInput): Promise<TextGenOutput> {
  console.log('🚀 Generating step2 lines with inputs (legacy mode):', inputs);
  
  // ROBUST INPUT COERCION
  const coercedInputs = {
    ...inputs,
    tags: Array.isArray(inputs.tags) ? inputs.tags : 
          (typeof inputs.tags === 'string' ? [inputs.tags] : inputs.tags),
    style: inputs.style || 'standard',
    rating: inputs.rating || 'PG-13'
  };
  
  // Parse tags into hard and soft categories using enhanced parsing
  let hardTags: string[] = [];
  let softTags: string[] = [];
  
  if (Array.isArray(coercedInputs.tags)) {
    const { hard, soft } = getTagArrays(coercedInputs.tags.join(", "));
    hardTags = hard;
    softTags = soft;
  } else if (coercedInputs.tags && typeof coercedInputs.tags === 'object') {
    hardTags = coercedInputs.tags.hard || [];
    softTags = coercedInputs.tags.soft || [];
  }
  
  // Send structured tag data to backend
  const structuredInputs = {
    ...coercedInputs,
    tags: {
      hard: hardTags,
      soft: softTags
    }
  };
  
  console.log('📋 Sending structured tag data:', { hardTags, softTags });
  
  try {
    const result = await retryWithBackoff(async () => {
      console.log('📡 Attempting Edge Function call...');
      
      const { data, error } = await supabase.functions.invoke('generate-step2-clean', {
        body: structuredInputs
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        
        // Check for content safety violations
        if (error.message?.includes('CONTENT_SAFETY_VIOLATION')) {
          const errorMessage = error.message.replace('CONTENT_SAFETY_VIOLATION: ', '');
          throw new Error(`CONTENT_SAFETY_VIOLATION: OpenAI rejected the request due to content policy. This usually happens when soft tags contain inappropriate language like gender stereotypes or offensive phrases. Error: ${errorMessage}`);
        }
        
        // Enhanced error message for network issues
        if (error.message?.includes('Failed to send a request') || 
            error.message?.includes('Failed to fetch')) {
          throw new Error(`Network connection failed. Please check your internet connection and try again. (${error.message})`);
        }
        
        throw new Error(`Step2 invoke error: ${error.message}`);
      }

      return data;
    }, 3, 1000);

    console.log('✅ Generation response received:', result?.success ? 'SUCCESS' : 'FAILED');

    // STRICT SUCCESS CHECK - FAIL FAST
    if (result?.success === false) {
      const errorMsg = result.error || 'Generation failed without specific error';
      console.error('❌ Generation failed:', errorMsg);
      throw new Error(`Generation failed: ${errorMsg}`);
    }

    if (!result?.lines || !Array.isArray(result.lines)) {
      console.error('❌ Invalid response structure:', result);
      throw new Error('Invalid response: missing or invalid lines array');
    }

    if (result.lines.length < 4) {
      console.error('❌ Insufficient lines returned:', result.lines.length);
      throw new Error(`Only ${result.lines.length} lines returned, need 4`);
    }

    console.log('✅ Validation passed, applying enhanced hard tag enforcement');
    
    // Apply structure variety enforcement and fragment fixes
    const structureValidation = validateStructureVariety(result.lines);
    console.log('🎭 Structure analysis:', {
      variety: structureValidation.hasRequiredVariety,
      absurd: structureValidation.hasAbsurdImagery,
      structures: structureValidation.structureCount
    });
    
    let processedLines = enforceStructureVariety(result.lines);
    
    // Apply post-generation hard tag enforcement  
    if (hardTags.length > 0) {
      const enforcement = enforceHardTagsPostGeneration(
        processedLines.map((line: any) => line.text),
        hardTags,
        3
      );
      
      if (enforcement.wasModified) {
        processedLines = processedLines.map((line: any, idx: number) => ({
          ...line,
          text: enforcement.enforcedLines[idx] || line.text
        }));
        
        console.log('✅ Enhanced hard tag enforcement applied:', {
          coverage: `${enforcement.tagCoverage.toFixed(1)}%`,
          modified: enforcement.wasModified
        });
      }
    }
    
    return {
      lines: processedLines.map((line: any) => ({
        lane: line.lane || 'default',
        text: line.text || ''
      }))
    };

  } catch (error) {
    console.error('❌ Text generation error, falling back to stage-ready fallbacks:', error);
    
    // Enhanced fallback with hard tag enforcement that survives all failures
    const fallbackResult = generateFallbackLines(inputs);
    console.log('🎭 Using stage-ready fallback generation with tag enforcement');
    
    return fallbackResult;
  }
}