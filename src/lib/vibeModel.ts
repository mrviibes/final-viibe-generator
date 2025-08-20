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

function postProcess(line: string, tone: string): VibeCandidate {
  // Trim spaces
  let cleaned = line.trim();
  
  // Remove banned patterns (emojis, hashtags, quotes, newlines)
  for (const pattern of bannedPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
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

    const userPrompt = `Write 4 different lines for this context:

Category: ${inputs.category} > ${inputs.subcategory}
Tone: ${inputs.tone}
Tags: ${inputs.tags?.join(', ') || ''}
${inputs.recipient_name && inputs.recipient_name !== "-" ? `Recipient: ${inputs.recipient_name}` : ''}

Requirements:
• Each line must be under 100 characters
• Make at least 1 short option (under 50 characters)  
• Make at least 1 longer option (80-100 characters)
• All 4 must be genuinely different - varied wording, not just punctuation
• Match the ${inputs.tone} tone consistently across all options
• No emojis, hashtags, or quotes${specialInstructions}

Output only this JSON format:
{"lines":["option1","option2","option3","option4"]}`;

    const messages = [
      { role: 'system', content: systemPromptUpdated },
      { role: 'user', content: userPrompt }
    ];
    
    const result = await openAIService.chatJSON(messages, {
      temperature: 0.8,
      max_tokens: 300,
      model: 'gpt-4o-mini'
    });
    
    // Extract lines from JSON response
    const lines = result.lines || [];
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error('Invalid response format - no lines array');
    }
    
    // Post-process each line
    const candidates = lines.map((line: string) => postProcess(line, inputs.tone));
    
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
    const fallback = fallbackByTone[inputs.tone.toLowerCase()] || fallbackByTone.humorous;
    
    // Pad to 4 with slight variations of fallback
    while (finalCandidates.length < 4) {
      finalCandidates.push(fallback);
    }
    
    picked = finalCandidates[0];
    usedFallback = true;
    reason = 'Padded with fallbacks due to insufficient unique candidates';
  } else {
    // All blocked, use fallback variants
    const fallbackVariants = getFallbackVariants(inputs.tone, inputs.category, inputs.subcategory);
    finalCandidates = fallbackVariants;
    picked = fallbackVariants[0];
    usedFallback = true;
    reason = candidateResults.find(c => c.reason)?.reason || 'All candidates blocked';
  }
  
  return {
    candidates: finalCandidates,
    picked,
    audit: {
      model: 'gpt-4o-mini',
      usedFallback,
      blockedCount,
      reason
    }
  };
}

export async function generateFinalLine(inputs: VibeInputs): Promise<string> {
  const result = await generateCandidates(inputs, 4);
  return result.picked;
}