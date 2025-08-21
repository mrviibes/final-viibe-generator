import { openAIService } from './openai';
import { 
  systemPrompt, 
  buildDeveloperPrompt, 
  fewShotAnchors, 
  fallbackByTone, 
  bannedPatterns, 
  bannedWords,
  VibeInputs 
} from './vibeManual';

export interface VibeCandidate {
  line: string;
  blocked: boolean;
  reason?: string;
}

export interface VibeResult {
  candidates: string[];
  picked: string;
  audit: {
    model: string;
    usedFallback: boolean;
    blockedCount: number;
    reason?: string;
    retryAttempt?: number;
    originalModel?: string;
  };
}

function getFallbackVariants(tone: string, category: string, subcategory: string): string[] {
  const baseFallback = fallbackByTone[tone.toLowerCase()] || fallbackByTone.humorous;
  
  // Create 4 distinct variations based on tone and context
  const variations = [
    baseFallback,
    `${baseFallback} today`,
    `${baseFallback} vibes`,
    `${baseFallback} energy`
  ];
  
  return variations;
}

function postProcess(line: string, tone: string, requiredTags?: string[]): VibeCandidate {
  // Trim spaces
  let cleaned = line.trim();
  
  // Remove banned patterns (emojis, hashtags, quotes, newlines)
  for (const pattern of bannedPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Fix common text generation errors
  // Remove duplicate words (e.g., "to beance to become" -> "to become")
  cleaned = cleaned.replace(/\b(\w+)\s+\w*\1/gi, '$1');
  
  // Fix repeated "to" patterns specifically
  cleaned = cleaned.replace(/\bto\s+\w*to\b/gi, 'to');
  
  // Remove double spaces and clean up
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Hard truncate to 100 characters
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100);
  }
  
  // Check for banned words
  const lowerCleaned = cleaned.toLowerCase();
  for (const word of bannedWords) {
    if (lowerCleaned.includes(word)) {
      return {
        line: fallbackByTone[tone.toLowerCase()] || fallbackByTone.humorous,
        blocked: true,
        reason: `Contains banned word: ${word}`
      };
    }
  }
  
  // Check if empty after cleaning
  if (!cleaned || cleaned.length === 0) {
    return {
      line: fallbackByTone[tone.toLowerCase()] || fallbackByTone.humorous,
      blocked: true,
      reason: 'Empty after cleaning'
    };
  }
  
  // Check tag coverage for important tags (skip visual-only tags) - relaxed approach
  if (requiredTags && requiredTags.length > 0) {
    const visualOnlyTags = ['person', 'people', 'group', 'man', 'woman', 'male', 'female'];
    const contentTags = requiredTags.filter(tag => !visualOnlyTags.includes(tag.toLowerCase()));
    
    if (contentTags.length > 0) {
      // Create a simple synonyms map for common terms
      const synonymsMap: Record<string, string[]> = {
        'work': ['job', 'career', 'office', 'workplace', 'employment'],
        'job': ['work', 'career', 'employment', 'position'],
        'career': ['work', 'job', 'profession', 'employment'],
        'birthday': ['bday', 'birth', 'celebration', 'party'],
        'party': ['celebration', 'bash', 'gathering', 'event'],
        'funny': ['hilarious', 'comedy', 'humor', 'joke', 'laughter'],
        'movie': ['film', 'cinema', 'flick'],
        'music': ['song', 'album', 'band', 'artist'],
        'love': ['romance', 'relationship', 'dating', 'crush'],
        'food': ['eat', 'meal', 'cooking', 'restaurant', 'dining']
      };
      
      // Extract keywords from tags and check for matches with synonyms
      const hasTagCoverage = contentTags.some(tag => {
        const lowerTag = tag.toLowerCase();
        
        // Direct match
        if (lowerCleaned.includes(lowerTag)) return true;
        
        // Check for synonyms
        const synonyms = synonymsMap[lowerTag] || [];
        if (synonyms.some(synonym => lowerCleaned.includes(synonym))) return true;
        
        // Check for partial word matches (e.g., "birthday" matches "birth")
        if (lowerTag.length > 4) {
          const rootWord = lowerTag.slice(0, -2); // Remove last 2 chars for partial match
          if (lowerCleaned.includes(rootWord)) return true;
        }
        
        return false;
      });
      
      if (!hasTagCoverage) {
        // Don't block for tag issues - just mark it
        return {
          line: cleaned,
          blocked: false,
          reason: `Partial tag coverage: ${contentTags.join(', ')}`
        };
      }
    }
  }
  
  return {
    line: cleaned,
    blocked: false
  };
}

async function generateMultipleCandidates(inputs: VibeInputs): Promise<VibeCandidate[]> {
  try {
    const systemPromptUpdated = `You are a witty, creative copywriter specializing in short-form content. 
Your task is to write 4 distinct options that vary in length and approach while maintaining the specified tone.
Always output valid JSON only.`;

    // Enhanced instructions for movie/pop culture + quotes
    const isMovie = inputs.category === "pop culture" && inputs.subcategory?.toLowerCase().includes("movie");
    const hasQuotes = inputs.tags?.some(tag => tag.toLowerCase().includes("quote")) || false;
    const hasPersonalRoast = inputs.tags?.some(tag => tag.toLowerCase().includes("making fun") || tag.toLowerCase().includes("bald") || tag.toLowerCase().includes("roast")) || false;

    let specialInstructions = "";
    if (isMovie && hasQuotes) {
      specialInstructions = "\n• When creating content about a specific movie with quote tags, reference the movie's iconic characters, themes, or memorable elements\n• Make it sound like it could be dialogue or a reference from that movie's universe";
    }
    if (hasPersonalRoast && inputs.recipient_name && inputs.recipient_name !== "-") {
      specialInstructions += `\n• Incorporate ${inputs.recipient_name} naturally into the movie context while maintaining the roasting tone`;
    }

    const tagRequirement = inputs.tags && inputs.tags.length > 0 
      ? `\n• Aim to include or reference these tags naturally (paraphrasing is fine): ${inputs.tags.join(', ')}`
      : '';

    const userPrompt = `Write 4 different lines for this context:

Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.tags?.join(', ') || 'none specified'}
${inputs.recipient_name && inputs.recipient_name !== "-" ? `Recipient: ${inputs.recipient_name}` : ''}

Requirements:
• Each line must be under 100 characters
• Make at least 1 short option (under 50 characters)  
• Make at least 1 longer option (80-100 characters)
• All 4 must be genuinely different - varied wording, not just punctuation
• Match the ${inputs.tone} tone consistently across all options
• No emojis, hashtags, or quotes${tagRequirement}${specialInstructions}

Output only this JSON format:
{"lines":["option1","option2","option3","option4"]}`;

    const messages = [
      { role: 'system', content: systemPromptUpdated },
      { role: 'user', content: userPrompt }
    ];
    
    const result = await openAIService.chatJSON(messages, {
      max_completion_tokens: 500,
      model: 'gpt-4.1-2025-04-14'
    });
    
    // Store the API metadata for later use
    const apiMeta = result._apiMeta;
    
    // Extract lines from JSON response
    const lines = result.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('Invalid response format - no lines array');
    }
    
    // Post-process each line with tag validation
    const candidates = lines.map((line: string) => postProcess(line, inputs.tone, inputs.tags));
    
    // Add API metadata to candidates for later extraction
    if (apiMeta && candidates.length > 0) {
      (candidates as any)._apiMeta = apiMeta;
    }
    
    return candidates;
  } catch (error) {
    console.error('Failed to generate multiple candidates:', error);
    // Return fallback variants instead of duplicates
    const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
    return fallbackVariants.map((line, index) => ({
      line,
      blocked: true,
      reason: index === 0 ? `API Error: ${error instanceof Error ? error.message : 'Unknown error'}` : 'Fallback variant'
    }));
  }
}

export async function generateCandidates(inputs: VibeInputs, n: number = 4): Promise<VibeResult> {
  const candidateResults = await generateMultipleCandidates(inputs);
  
  // Extract API metadata if available
  const apiMeta = (candidateResults as any)._apiMeta || null;
  
  // Filter out blocked candidates and remove duplicates
  const validCandidates = candidateResults.filter(c => !c.blocked);
  const uniqueValidLines = Array.from(new Set(validCandidates.map(c => c.line)));
  const blockedCount = candidateResults.length - validCandidates.length;
  
  let finalCandidates: string[] = [];
  let picked: string = '';
  let usedFallback = false;
  let reason: string | undefined;
  
  if (uniqueValidLines.length >= 4) {
    // We have enough unique valid lines
    finalCandidates = uniqueValidLines.slice(0, 4);
    
    // Shuffle the array to avoid always showing short ones first
    for (let i = finalCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [finalCandidates[i], finalCandidates[j]] = [finalCandidates[j], finalCandidates[i]];
    }
    
    // Pick the first one after shuffling
    picked = finalCandidates[0];
  } else if (uniqueValidLines.length > 0) {
    // We have some valid lines but need to pad with fallbacks
    finalCandidates = [...uniqueValidLines];
    
    // Check if we have any lines that were blocked only for tag coverage
    const tagOnlyBlocked = candidateResults.filter(c => 
      c.blocked && c.reason?.includes('tag coverage')
    );
    
    // If we have tag-only blocked lines, use them instead of generic fallbacks
    if (tagOnlyBlocked.length > 0) {
      const tagBlockedLines = tagOnlyBlocked.map(c => c.line);
      finalCandidates.push(...tagBlockedLines);
    }
    
    // Only use generic fallback as last resort
    const fallback = fallbackByTone[inputs.tone.toLowerCase()] || fallbackByTone.humorous;
    while (finalCandidates.length < 4) {
      finalCandidates.push(fallback);
    }
    
    picked = finalCandidates[0];
    usedFallback = tagOnlyBlocked.length === 0; // Only mark as fallback if we used generic ones
    reason = tagOnlyBlocked.length > 0 ? 'Used lines with partial tag coverage' : 'Padded with fallbacks due to insufficient unique candidates';
  } else {
    // Check if all were blocked only for tag coverage
    const allTagOnlyBlocked = candidateResults.every(c => 
      c.blocked && c.reason?.includes('tag coverage')
    );
    
    if (allTagOnlyBlocked && candidateResults.length > 0) {
      // Use the model's original lines since they were only blocked for tags
      finalCandidates = candidateResults.map(c => c.line);
      picked = finalCandidates[0];
      usedFallback = false;
      reason = 'Used model output with partial tag coverage';
    } else {
      // Genuine blocks (banned words, etc.) - use tone-based fallbacks
      const fallback = fallbackByTone[inputs.tone.toLowerCase()] || fallbackByTone.humorous;
      finalCandidates = [fallback, `${fallback} today`, `${fallback} vibes`, `${fallback} energy`];
      picked = finalCandidates[0];
      usedFallback = true;
      reason = candidateResults.find(c => c.reason)?.reason || 'All candidates blocked';
    }
  }
  
  return {
    candidates: finalCandidates,
    picked,
    audit: {
      model: apiMeta?.modelUsed || 'gpt-4.1-2025-04-14',
      usedFallback,
      blockedCount,
      reason,
      retryAttempt: apiMeta?.retryAttempt || 0,
      originalModel: apiMeta?.originalModel
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}