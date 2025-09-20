import { supabase } from "@/integrations/supabase/client";
import { getTagArrays, sanitizeInput, ensureHardTags } from "@/lib/parseTags";

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
  style?: 'standard' | 'story' | 'punchline-first' | 'pop-culture' | 'wildcard';
  rating?: 'G' | 'PG' | 'PG-13' | 'R';
}

interface TextGenOutput {
  lines: Array<{
    lane: string;
    text: string;
  }>;
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

export async function generateStep2Lines(inputs: TextGenInput): Promise<TextGenOutput> {
  console.log('🚀 Generating step2 lines with inputs:', inputs);
  
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

    console.log('✅ Validation passed, enforcing hard tags if needed');
    
    // Apply hard tag enforcement before returning
    const mustEnforceHardTags = hardTags.length > 0;
    let finalLines = result.lines;
    
    if (mustEnforceHardTags) {
      const lineTexts = finalLines.map((line: any) => line.text);
      const enforcedTexts = ensureHardTags(lineTexts, hardTags, 3);
      
      finalLines = finalLines.map((line: any, idx: number) => ({
        ...line,
        text: enforcedTexts[idx] || line.text
      }));
      
      console.log('✅ Applied hard tag enforcement to text generation');
    }
    
    return {
      lines: finalLines.map((line: any) => ({
        lane: line.lane || 'default',
        text: line.text || ''
      }))
    };

  } catch (error) {
    console.error('❌ Text generation error:', error);
    // Re-throw to surface in UI with toast notifications
    throw error;
  }
}