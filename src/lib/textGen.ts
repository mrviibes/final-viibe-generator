import { supabase } from "@/integrations/supabase/client";

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
  tags: string[];
  mode?: string; // Backward compatibility
  style?: 'standard' | 'story' | 'punchline-first' | 'pop-culture' | 'wildcard';
  rating?: 'G' | 'PG' | 'PG-13' | 'R';
}

interface TextGenOutput {
  lines: Array<{
    lane: string;
    text: string;
  }>;
}

// Tag parsing utility for both client and server
function parseTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    
    // Check if starts and ends with quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      // Soft tag - remove quotes and store lowercased
      const unquoted = trimmed.slice(1, -1).trim();
      if (unquoted) {
        softTags.push(unquoted.toLowerCase());
      }
    } else {
      // Hard tag - keep original case for printing, but store for checks
      hardTags.push(trimmed);
    }
  }
  
  return { hardTags, softTags };
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
    if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length !== 4) {
      return null;
    }
    
    // Validate each line
    const lengths: number[] = [];
    for (const line of parsed.lines) {
      if (!line.lane || !line.text || typeof line.text !== 'string') {
        return null;
      }
      
      // Character limits: 40-80 chars
      const length = line.text.length;
      if (length < 40 || length > 80) {
        return null;
      }
      
      lengths.push(length);
    }
    
    // Validate length distribution: one line per bucket [40-50], [50-60], [60-70], [70-80]
    const buckets = [
      lengths.filter(l => l >= 40 && l <= 50).length,
      lengths.filter(l => l >= 50 && l <= 60).length,
      lengths.filter(l => l >= 60 && l <= 70).length,
      lengths.filter(l => l >= 70 && l <= 80).length
    ];
    
    // Each bucket should have exactly 1 line
    if (!buckets.every(count => count === 1)) {
      return null;
    }
    
    // If we have input context, validate tag handling, style, and rating
    if (inputs) {
      const { hardTags, softTags } = parseTags(inputs.tags);
      
      // Count how many lines contain all hard tags
      let linesWithAllHardTags = 0;
      for (const line of parsed.lines) {
        const lowerText = line.text.toLowerCase();
        const hasAllHardTags = hardTags.every(tag => 
          lowerText.includes(tag.toLowerCase())
        );
        if (hasAllHardTags) {
          linesWithAllHardTags++;
        }
        
        // Check no soft tags appear literally
        for (const softTag of softTags) {
          if (lowerText.includes(softTag)) {
            return null; // Soft tag appeared literally
          }
        }
      }
      
      // Must have exactly 3 lines with all hard tags
      if (hardTags.length > 0 && linesWithAllHardTags !== 3) {
        return null;
      }
      
      // Style validation
      if (inputs.style === 'pop-culture') {
        const popCultureTerms = [
          'taylor swift', 'kanye', 'kardashian', 'elon musk', 'netflix', 'disney', 'marvel', 'tiktok', 'instagram', 
          'spotify', 'iphone', 'android', 'fortnite', 'minecraft', 'uber', 'airbnb', 'zoom'
        ];
        
        let popCultureCount = 0;
        for (const line of parsed.lines) {
          const lowerText = line.text.toLowerCase();
          if (popCultureTerms.some(term => lowerText.includes(term))) {
            popCultureCount++;
          }
        }
        
        if (popCultureCount < 4) {
          return null; // Not enough pop culture references
        }
      }
      
      // Rating validation
      if (inputs.rating === 'R') {
        const edgyTerms = ['damn', 'hell', 'ass', 'shit', 'fuck', 'savage', 'brutal', 'roast', 'destroy', 'trash', 'worst'];
        let edgyCount = 0;
        for (const line of parsed.lines) {
          const lowerText = line.text.toLowerCase();
          if (edgyTerms.some(term => lowerText.includes(term))) {
            edgyCount++;
          }
        }
        
        if (edgyCount < 2) {
          return null; // Not edgy enough for R rating
        }
      } else if (inputs.rating === 'G') {
        const profanityTerms = ['damn', 'hell', 'ass', 'shit', 'fuck', 'bitch', 'crap', 'suck', 'stupid', 'idiot', 'loser'];
        for (const line of parsed.lines) {
          const lowerText = line.text.toLowerCase();
          if (profanityTerms.some(term => lowerText.includes(term))) {
            return null; // Contains profanity for G rating
          }
        }
      }
    }
    
    return parsed as TextGenOutput;
  } catch {
    return null;
  }
}

function buildUserMessage(inputs: TextGenInput): string {
  const tagsStr = inputs.tags.length > 0 ? `, tags: [${inputs.tags.map(t => `"${t}"`).join(",")}]` : "";
  
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
  
  // Create tone/style-aware fallback instead of generic ones
  const toneAdjectives = {
    'Savage': ['brutal', 'ruthless', 'savage', 'merciless'],
    'Humorous': ['ridiculous', 'hilarious', 'absurd', 'comical'],
    'Playful': ['silly', 'quirky', 'adorable', 'fun'],
    'Sentimental': ['heartwarming', 'nostalgic', 'touching', 'meaningful'],
    'Serious': ['profound', 'thoughtful', 'significant', 'deep'],
    'Inspirational': ['empowering', 'uplifting', 'motivating', 'transformative']
  };
  
  const contextWords = {
    'Birthday': ['celebration', 'milestone', 'aging', 'party'],
    'Wedding': ['commitment', 'love', 'ceremony', 'union'],
    'Holiday': ['tradition', 'family', 'gathering', 'celebration'],
    'Friend': ['friendship', 'loyalty', 'bond', 'connection'],
    'Self': ['growth', 'journey', 'reflection', 'experience'],
    'Work': ['career', 'productivity', 'hustle', 'grind'],
    'Dating': ['romance', 'connection', 'chemistry', 'spark']
  };
  
  const adj = toneAdjectives[tone] || toneAdjectives['Humorous'];
  const ctx = contextWords[subcategory] || ['life', 'reality', 'experience', 'moment'];
  
  if (style === 'pop-culture') {
    return {
      lines: [
        { lane: "option1", text: "Netflix couldn't script this level of chaos." },
        { lane: "option2", text: "This moment deserves its own TikTok trend honestly." },
        { lane: "option3", text: "Marvel writers could never create a plot twist this unexpected." },
        { lane: "option4", text: "Even Taylor Swift wouldn't write a song about this level of drama happening." }
      ]
    };
  }
  
  if (rating === 'R') {
    return {
      lines: [
        { lane: "option1", text: `This ${ctx[0]} is absolutely fucking ${adj[0]}.` },
        { lane: "option2", text: `Reality just ${adj[1]} me harder than I deserved honestly.` },
        { lane: "option3", text: `Plot twist: ${ctx[1]} decided to be a ${adj[2]} ass situation today.` },
        { lane: "option4", text: `Based on a true ${ctx[2]} that nobody asked for but damn here we are anyway.` }
      ]
    };
  }
  
  return {
    lines: [
      { lane: "option1", text: `When ${ctx[0]} gives you ${adj[0]} moments, make memes.` },
      { lane: "option2", text: `Plot twist: this ${adj[1]} ${ctx[1]} actually happened to me.` },
      { lane: "option3", text: `Based on a ${adj[2]} ${ctx[2]} story that nobody asked for but here we are.` },
      { lane: "option4", text: `${ctx[3]} called and left a ${adj[3]} voicemail but I'm too busy to listen.` }
    ]
  };
}

export async function generateStep2Lines(inputs: TextGenInput): Promise<{
  lines: Array<{ lane: string; text: string }>;
  model: string;
  validated?: boolean;
  issues?: string[];
}> {
  const startTime = Date.now();
  console.log("Starting parallel text generation (server + client)");
  
  try {
    console.log("Calling Supabase Edge Function for text generation");
    
    // Map old mode to style for backward compatibility
    let style = inputs.style;
    let rating = inputs.rating || 'PG-13';
    
    if (!style && inputs.mode) {
      switch (inputs.mode) {
        case 'comedian-mix':
          style = 'standard';
          break;
        case 'story-mode':
          style = 'story';
          break;
        case 'punchline-first':
          style = 'punchline-first';
          break;
        case 'pop-culture':
          style = 'pop-culture';
          break;
        case 'wildcard':
          style = 'wildcard';
          break;
        default:
          style = 'standard';
      }
    }
    
    style = style || 'standard';
    
    const requestInputs = {
      ...inputs,
      style,
      rating,
      mode: inputs.mode || 'comedian-mix' // Keep for backward compatibility
    };
    
    // Add timeout and parallel execution
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Generation timeout')), 10000);
    });
    
    const generatePromise = supabase.functions.invoke('generate-step2', {
      body: requestInputs
    });
    
    const result = await Promise.race([generatePromise, timeoutPromise]);
    const { data, error } = result;

    const duration = Date.now() - startTime;
    console.log(`Text generation completed in ${duration}ms`);

    if (error) {
      console.error("Edge function error:", error);
      const fallbackLines = generateFallbackLines(requestInputs);
      return {
        lines: fallbackLines.lines,
        model: "fallback",
        validated: false
      };
    }

    // Check if server marked it as validated - trust server validation
    if (data.validated === true) {
      console.log("Server validated response - using it");
      return {
        lines: data.lines || generateFallbackLines(requestInputs).lines,
        model: data.model || "server-validated",
        validated: true,
        issues: data.issues || []
      };
    }
    
    // If server didn't validate, do client-side validation
    const validated = sanitizeAndValidate(JSON.stringify(data), inputs);
    if (!validated) {
      console.log("Response failed validation, attempting retry");
      
      // Try once more with strict flag
      const { data: retryData, error: retryError } = await supabase.functions.invoke('generate-step2', {
        body: { ...requestInputs, strict: true }
      });
      
      if (!retryError && retryData) {
        // Trust server validation on retry
        if (retryData.validated === true) {
          return {
            lines: retryData.lines,
            model: retryData.model,
            validated: true,
            issues: retryData.issues || []
          };
        }
        
        const retryValidated = sanitizeAndValidate(JSON.stringify(retryData), inputs);
        if (retryValidated) {
          return {
            lines: retryValidated.lines,
            model: retryData.model,
            validated: true
          };
        }
      }
    }

    // If we got a fallback model response, try client-side OpenAI as backup
    if (data.model === "fallback") {
      console.log("Server returned fallback, attempting client-side generation");
      
      try {
        const { openAIService } = await import("@/lib/openai");
        
        if (openAIService.hasApiKey()) {
          console.log("Using client-side OpenAI as backup");
          
          const clientLines = await openAIService.generateShortTexts({
            category: inputs.category,
            subtopic: inputs.subcategory,
            tone: inputs.tone,
            tags: inputs.tags,
            characterLimit: 80,
            mode: requestInputs.mode
          });
          
          if (clientLines && clientLines.length >= 4) {
            return {
              lines: clientLines.slice(0, 4).map((text, index) => ({
                lane: `option${index + 1}`,
                text
              })),
              model: "client-openai",
              validated: false
            };
          }
        }
      } catch (clientError) {
        console.error("Client-side OpenAI error:", clientError);
      }
    }

    return {
      lines: data.lines || generateFallbackLines(inputs).lines,
      model: data.model || "fallback",
      validated: data.validated,
      issues: data.issues
    };
  } catch (error) {
    console.error("Text generation error:", error);
    const fallbackLines = generateFallbackLines(inputs);
    return {
      lines: fallbackLines.lines,
      model: "fallback",
      validated: false
    };
  }
}