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

async function generateCandidate(inputs: VibeInputs, temperature: number = 0.9): Promise<VibeCandidate> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildDeveloperPrompt(inputs) + fewShotAnchors }
    ];
    
    const result = await openAIService.chatJSON(messages, {
      temperature,
      max_tokens: 60,
      model: 'gpt-4o-mini'
    });
    
    const line = result.line || '';
    return postProcess(line, inputs.tone);
  } catch (error) {
    console.error('Failed to generate candidate:', error);
    return {
      line: fallbackByTone[inputs.tone.toLowerCase()] || fallbackByTone.humorous,
      blocked: true,
      reason: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function generateCandidates(inputs: VibeInputs, n: number = 3): Promise<VibeResult> {
  // Generate candidates with slightly different temperatures for variety
  const temperatures = [0.8, 0.9, 1.0];
  const candidatePromises = Array.from({ length: n }, (_, i) => 
    generateCandidate(inputs, temperatures[i % temperatures.length])
  );
  
  const candidateResults = await Promise.all(candidatePromises);
  
  // Filter out blocked candidates
  const validCandidates = candidateResults.filter(c => !c.blocked);
  const blockedCount = candidateResults.length - validCandidates.length;
  
  let finalCandidates: string[] = [];
  let picked: string = '';
  let usedFallback = false;
  let reason: string | undefined;
  
  if (validCandidates.length > 0) {
    // Sort by length (shortest first) and take unique lines
    const uniqueLines = Array.from(new Set(validCandidates.map(c => c.line)));
    finalCandidates = uniqueLines.sort((a, b) => a.length - b.length).slice(0, 4);
    picked = finalCandidates[0]; // Shortest safe candidate
  } else {
    // All blocked, use fallback
    const fallback = fallbackByTone[inputs.tone.toLowerCase()] || fallbackByTone.humorous;
    finalCandidates = [fallback];
    picked = fallback;
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
  const result = await generateCandidates(inputs, 3);
  return result.picked;
}