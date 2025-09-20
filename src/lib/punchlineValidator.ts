// Punchline structure validation for stage-ready comedy
export interface PunchlineValidation {
  isStageReady: boolean;
  hasSetup: boolean;
  hasTwist: boolean;
  hasVisualImagery: boolean;
  hasComedianVoice: boolean;
  fillerWords: number;
  confidence: number;
  issues: string[];
}

// Filler phrases that indicate AI-generated content rather than comedian delivery
const FILLER_PHRASES = [
  'timing is everything',
  'truth hurts', 
  'laughter is the best medicine',
  'life is like',
  'it is what it is',
  'at the end of the day',
  'when life gives you',
  'been there done that',
  'story of my life',
  'welcome to my world',
  'that\'s life for you',
  'such is life'
];

// Abstract/generic words that lack concrete imagery
const ABSTRACT_WORDS = [
  'situation', 'experience', 'journey', 'adventure', 'moment', 'feeling',
  'energy', 'vibe', 'mood', 'essence', 'reality', 'truth', 'life'
];

// Comedian voice indicators - phrases that suggest authentic delivery
const COMEDIAN_VOICE_INDICATORS = [
  // Conversational openers
  /^(man,|listen,|look,|okay,|so,|wait,|hold up)/i,
  // Story starters  
  /^(yesterday|last week|this morning|the other day|remember when)/i,
  // Direct address
  /^(you know what|here's the thing|can we talk about|why is it that)/i,
  // Comparative setups
  /(is like|reminds me of|looks like|sounds like)/i,
  // Emphatic delivery
  /(I swear|no joke|seriously|honestly|for real)/i
];

// Visual imagery patterns - concrete, specific descriptions
const VISUAL_PATTERNS = [
  // Physical descriptions
  /(looks like|sounds like|smells like|feels like)/i,
  // Specific actions
  /(running|walking|dancing|crying|laughing|screaming)/i,
  // Concrete objects
  /(car|house|phone|food|clothes|money)/i,
  // Body parts/physical
  /(face|hair|eyes|hands|legs|voice)/i
];

export function validatePunchlineStructure(text: string): PunchlineValidation {
  const issues: string[] = [];
  let confidence = 100;
  
  // Check for filler phrases
  const fillerCount = FILLER_PHRASES.filter(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  ).length;
  
  if (fillerCount > 0) {
    issues.push(`Contains ${fillerCount} filler phrase(s)`);
    confidence -= fillerCount * 20;
  }
  
  // Check for abstract words (reduces visual imagery)
  const abstractCount = ABSTRACT_WORDS.filter(word =>
    text.toLowerCase().includes(word.toLowerCase())
  ).length;
  
  if (abstractCount > 2) {
    issues.push('Too many abstract words, lacks concrete imagery');
    confidence -= 15;
  }
  
  // Check for comedian voice indicators
  const hasComedianVoice = COMEDIAN_VOICE_INDICATORS.some(pattern =>
    pattern.test(text)
  );
  
  if (!hasComedianVoice) {
    issues.push('Lacks comedian voice/delivery indicators');
    confidence -= 25;
  }
  
  // Check for visual imagery
  const hasVisualImagery = VISUAL_PATTERNS.some(pattern =>
    pattern.test(text)
  ) || text.split(' ').some(word => 
    // Check for specific, concrete nouns
    /^(pizza|beer|coffee|mom|dad|boss|teacher|doctor|car|phone)$/i.test(word)
  );
  
  if (!hasVisualImagery) {
    issues.push('Lacks visual imagery or concrete details');
    confidence -= 20;
  }
  
  // Check for setup-twist structure (simplified)
  const words = text.split(' ');
  const hasSetup = words.length > 8; // Minimum length for setup
  const hasTwist = text.includes(',') || text.includes(' but ') || 
                   text.includes(' then ') || text.includes(' so ') ||
                   words.length > 12; // Long enough for development
  
  if (!hasSetup) {
    issues.push('Line too short for proper setup');
    confidence -= 15;
  }
  
  if (!hasTwist) {
    issues.push('No clear twist or development detected');
    confidence -= 20;
  }
  
  // Adjust confidence based on overall issues
  if (issues.length === 0) {
    confidence = Math.min(confidence + 10, 100);
  }
  
  return {
    isStageReady: confidence >= 70 && issues.length <= 2,
    hasSetup,
    hasTwist,
    hasVisualImagery,
    hasComedianVoice,
    fillerWords: fillerCount,
    confidence: Math.max(confidence, 0),
    issues
  };
}

export function validateBatchPunchlines(lines: Array<{ text: string }>): {
  overallScore: number;
  stageReadyCount: number;
  totalIssues: string[];
  lineValidations: PunchlineValidation[];
} {
  const lineValidations = lines.map(line => validatePunchlineStructure(line.text));
  const stageReadyCount = lineValidations.filter(v => v.isStageReady).length;
  const overallScore = lineValidations.reduce((sum, v) => sum + v.confidence, 0) / lines.length;
  
  const allIssues = lineValidations.flatMap(v => v.issues);
  const uniqueIssues = Array.from(new Set(allIssues));
  
  return {
    overallScore,
    stageReadyCount,
    totalIssues: uniqueIssues,
    lineValidations
  };
}