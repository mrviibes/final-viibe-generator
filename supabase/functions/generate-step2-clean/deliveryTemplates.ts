// Comedian delivery templates for natural stage-ready rhythm
export interface DeliveryTemplate {
  comedian: string;
  rating: string;
  template: string;
  cadenceWords: string[];
  setupMarkers: string[];
  punchMarkers: string[];
}

// Templates by rating and comedian for authentic delivery patterns
export const DELIVERY_TEMPLATES: Record<string, DeliveryTemplate[]> = {
  "G": [
    {
      comedian: "jim_gaffigan",
      rating: "G",
      template: "You ever notice {setup}? Yeah, {punch}.",
      cadenceWords: ["you ever notice", "yeah", "basically", "apparently"],
      setupMarkers: ["you ever notice", "have you seen", "why is it"],
      punchMarkers: ["yeah", "basically", "turns out", "apparently"]
    },
    {
      comedian: "nate_bargatze", 
      rating: "G",
      template: "So apparently {setup}. Turns out {punch}.",
      cadenceWords: ["so apparently", "turns out", "I guess", "probably"],
      setupMarkers: ["so apparently", "I found out", "my wife says"],
      punchMarkers: ["turns out", "I guess", "probably", "which explains"]
    },
    {
      comedian: "ellen_degeneres",
      rating: "G", 
      template: "Okay so {setup}. Which means {punch}.",
      cadenceWords: ["okay so", "which means", "right", "obviously"],
      setupMarkers: ["okay so", "here's what happened", "you know what"],
      punchMarkers: ["which means", "obviously", "right", "so basically"]
    }
  ],
  "PG-13": [
    {
      comedian: "kevin_hart",
      rating: "PG-13",
      template: "Man listen, {setup}. Next thing I know, {punch}!",
      cadenceWords: ["man listen", "next thing I know", "I swear", "hold up"],
      setupMarkers: ["man listen", "yo check this", "hold up"],
      punchMarkers: ["next thing I know", "I swear", "suddenly", "and boom"]
    },
    {
      comedian: "ali_wong",
      rating: "PG-13", 
      template: "{setup} — which is basically {punch}.",
      cadenceWords: ["which is basically", "honestly", "real talk", "no joke"],
      setupMarkers: ["real talk", "honestly", "listen"],
      punchMarkers: ["which is basically", "and that's", "so basically", "meaning"]
    },
    {
      comedian: "trevor_noah",
      rating: "PG-13",
      template: "In America, {setup}. But in my country, {punch}.",
      cadenceWords: ["in America", "but in my country", "you see", "because"],
      setupMarkers: ["in America", "you know", "here's the thing"],
      punchMarkers: ["but in my country", "back home", "where I'm from", "you see"]
    }
  ],
  "R": [
    {
      comedian: "bill_burr",
      rating: "R",
      template: "I swear to God, {setup}. Because {punch}.",
      cadenceWords: ["I swear to God", "because", "fucking", "honestly"],
      setupMarkers: ["I swear to God", "let me tell you", "listen here"],
      punchMarkers: ["because", "so", "and that's why", "which fucking explains"]
    },
    {
      comedian: "chris_rock", 
      rating: "R",
      template: "{setup}. But {punch}.",
      cadenceWords: ["but", "now", "see", "that's when"],
      setupMarkers: ["everybody knows", "we all seen", "you know what"],
      punchMarkers: ["but", "now", "see", "that's when you know"]
    },
    {
      comedian: "wanda_sykes",
      rating: "R",
      template: "{setup}. Honey, {punch}.",
      cadenceWords: ["honey", "child", "listen", "mmm-hmm"],
      setupMarkers: ["let me tell you", "child", "honey"],
      punchMarkers: ["honey", "child", "mmm-hmm", "and that's the truth"]
    }
  ],
  "Explicit": [
    {
      comedian: "sarah_silverman",
      rating: "Explicit",
      template: "{setup}. Basically {punch}.",
      cadenceWords: ["basically", "which is", "so", "meaning"],
      setupMarkers: ["okay so", "here's the thing", "you know what"],
      punchMarkers: ["basically", "which is like", "so essentially", "meaning"]
    },
    {
      comedian: "joan_rivers",
      rating: "Explicit", 
      template: "Can we talk? {setup}. {punch}.",
      cadenceWords: ["can we talk", "I mean", "seriously", "come on"],
      setupMarkers: ["can we talk", "let's be honest", "I mean"],
      punchMarkers: ["I mean", "seriously", "come on", "enough said"]
    },
    {
      comedian: "amy_schumer",
      rating: "Explicit",
      template: "{setup}. And trust me, {punch}.",
      cadenceWords: ["and trust me", "believe me", "no joke", "seriously"],
      setupMarkers: ["so last night", "you guys", "this one time"],
      punchMarkers: ["and trust me", "believe me", "I'm not lying", "seriously"]
    }
  ]
};

// Core delivery application function
export function applyDeliveryTemplate(rawText: string, rating: string, comedianVoice?: string): string {
  const ratingTemplates = DELIVERY_TEMPLATES[rating] || DELIVERY_TEMPLATES["PG-13"];
  
  // Select template based on comedian voice or random from rating
  let template: DeliveryTemplate;
  if (comedianVoice) {
    template = ratingTemplates.find(t => t.comedian === comedianVoice) || ratingTemplates[0];
  } else {
    template = ratingTemplates[Math.floor(Math.random() * ratingTemplates.length)];
  }
  
  // Split the raw text into setup and punch components
  const { setup, punch } = extractSetupAndPunch(rawText);
  
  // Apply the template
  let deliveredLine = template.template
    .replace('{setup}', setup)
    .replace('{punch}', punch);
  
  // Ensure proper capitalization and punctuation
  deliveredLine = deliveredLine.trim();
  if (!deliveredLine.endsWith('.')) deliveredLine += '.';
  deliveredLine = deliveredLine.replace(/^[a-z]/, m => m.toUpperCase());
  
  // Fix double punctuation from template application
  deliveredLine = deliveredLine.replace(/\.\./g, '.');
  deliveredLine = deliveredLine.replace(/\.\?/g, '?');
  deliveredLine = deliveredLine.replace(/\.\!/g, '!');
  
  return deliveredLine;
}

// Extract setup and punch from raw text
function extractSetupAndPunch(text: string): { setup: string; punch: string } {
  // Remove ending punctuation for processing
  const cleaned = text.replace(/[\.\!\?]+$/, '').trim();
  
  // Look for natural break points for setup -> punch
  const breakMarkers = [
    'but ', 'so ', 'then ', 'because ', 'until ', 'except ', 'however ',
    'meanwhile ', 'suddenly ', 'unfortunately ', 'thankfully '
  ];
  
  for (const marker of breakMarkers) {
    const markerIndex = cleaned.toLowerCase().indexOf(marker);
    if (markerIndex > 10) { // Ensure meaningful setup length
      const setup = cleaned.slice(0, markerIndex).trim();
      const punch = cleaned.slice(markerIndex + marker.length).trim();
      if (setup.length > 8 && punch.length > 8) {
        return { setup, punch };
      }
    }
  }
  
  // No natural break found - split roughly in middle around a word boundary
  const words = cleaned.split(' ');
  if (words.length >= 4) {
    const midPoint = Math.floor(words.length / 2);
    // Find the best split point around the middle
    let splitPoint = midPoint;
    
    // Prefer to split after common setup words
    const setupWords = ['when', 'after', 'before', 'since', 'while', 'during', 'every', 'last'];
    for (let i = 1; i < words.length - 1; i++) {
      if (setupWords.includes(words[i].toLowerCase()) && Math.abs(i - midPoint) <= 2) {
        splitPoint = i + 1;
        break;
      }
    }
    
    const setup = words.slice(0, splitPoint).join(' ');
    const punch = words.slice(splitPoint).join(' ');
    
    return { setup, punch };
  }
  
  // Fallback for very short text
  return { setup: cleaned, punch: "that's the truth" };
}

// Validate that delivery sounds natural (not robotic)
export function validateNaturalDelivery(text: string): {
  isNatural: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;
  
  // Check for robotic patterns
  const roboticPatterns = [
    /^(this is|that is|it is|here is|there is)/i,
    /^(the fact that|the reality is|in conclusion)/i,
    /(simply put|basically speaking|in other words)$/i,
    /^(one could say|it could be argued)/i
  ];
  
  for (const pattern of roboticPatterns) {
    if (pattern.test(text)) {
      issues.push('Sounds like AI/academic writing, not comedian speech');
      score -= 30;
      break;
    }
  }
  
  // Check for human conversational markers
  const humanMarkers = [
    /^(man|yo|listen|look|okay|so|wait|hold up)/i,
    /(you know|I mean|you see|right)/i,
    /^(yesterday|last week|this morning|the other day)/i,
    /(honestly|seriously|no joke|I swear)/i
  ];
  
  const hasHumanMarkers = humanMarkers.some(marker => marker.test(text));
  if (!hasHumanMarkers) {
    issues.push('Lacks conversational delivery markers');
    score -= 20;
  }
  
  // Check for complete thoughts
  const endsAbruptly = /\b(the|and|was|with|for|to|at|in|on)\s*\.$/i.test(text);
  if (endsAbruptly) {
    issues.push('Ends with incomplete thought/fragment');
    score -= 25;
  }
  
  // Check for natural rhythm (not too many short words in a row)
  const words = text.split(' ');
  let shortWordStreak = 0;
  let maxShortStreak = 0;
  
  for (const word of words) {
    if (word.length <= 3) {
      shortWordStreak++;
      maxShortStreak = Math.max(maxShortStreak, shortWordStreak);
    } else {
      shortWordStreak = 0;
    }
  }
  
  if (maxShortStreak > 4) {
    issues.push('Too many short words in sequence - lacks rhythm');
    score -= 15;
  }
  
  return {
    isNatural: score >= 70,
    score: Math.max(score, 0),
    issues
  };
}

// Enhanced fragment detection and repair
export function detectAndRepairFragments(text: string): string {
  let repaired = text.trim();
  
  // Common fragment patterns and their repairs
  const fragmentRepairs = [
    // Preposition endings
    [/\b(with|for|to|at|in|on|by|from|of|about|under|over)\s*\.\s*$/i, " the party."],
    [/\bcome to\s*\.\s*$/i, " come to the conclusion."],
    [/\bso bad even the\s*\.\s*$/i, " so bad even the cake complained."],
    [/\bcake was so bad even\s*\.\s*$/i, " cake was so bad even the candles refused."],
    [/\bpeople come to\s*\.\s*$/i, " people come to celebrate."],
    [/\bmake Jesse any\s*\.\s*$/i, " make Jesse any happier."],
    [/\bdidn't make Jesse any\s*\.\s*$/i, " didn't make Jesse any younger."],
    
    // Article endings
    [/\ba\s+[aeiou]\w*\s*\.\s*$/i, " a party."],
    [/\bthe\s*\.\s*$/i, " the celebration."],
    [/\ban\s*\.\s*$/i, " an event."],
    
    // Conjunction endings  
    [/\band\s*\.\s*$/i, " and everything."],
    [/\bbut\s*\.\s*$/i, " but whatever."],
    [/\bor\s*\.\s*$/i, " or something."],
    
    // Verb endings
    [/\bwas\s*\.\s*$/i, " was incredible."],
    [/\bhad\s*\.\s*$/i, " had issues."],
    [/\bwent\s*\.\s*$/i, " went wrong."],
    
    // Truncated words (single letters)
    [/\b[a-z]\s*\.\s*$/i, " around."],
    [/\bpl\s*\.\s*$/i, " play."],
    [/\bd\s*\.\s*$/i, " down."],
    [/\bg\s*\.\s*$/i, " great."]
  ];
  
  // Apply repairs
  for (const [pattern, replacement] of fragmentRepairs) {
    if (pattern.test(repaired)) {
      repaired = repaired.replace(pattern as RegExp, replacement as string);
      break; // Only apply one repair to avoid over-modification
    }
  }
  
  // Ensure proper capitalization after repair
  repaired = repaired.replace(/^[a-z]/, m => m.toUpperCase());
  
  return repaired;
}

// Apply comedian-specific voice enhancements
export function enhanceVoiceSignature(text: string, comedianVoice: string): string {
  const voiceEnhancements: Record<string, (text: string) => string> = {
    'kevin_hart': (t) => {
      if (!/^(man|yo|listen|hold up)/i.test(t)) {
        return `Man listen, ${t[0].toLowerCase()}${t.slice(1)}`;
      }
      return t;
    },
    
    'bill_burr': (t) => {
      if (!/fucking|shit|damn/i.test(t) && !/(I swear|honestly|let me tell you)/i.test(t)) {
        return t.replace(/\.$/, " and I'm not fucking around.");
      }
      return t;
    },
    
    'jim_gaffigan': (t) => {
      if (!/you ever notice|apparently|basically/i.test(t)) {
        return `You ever notice ${t[0].toLowerCase()}${t.slice(1, -1)}? Yeah, that's weird.`;
      }
      return t;
    },
    
    'ali_wong': (t) => {
      if (!/honestly|real talk|basically/i.test(t)) {
        return t.replace(/\.$/, " — which is basically my life story.");
      }
      return t;
    },
    
    'nate_bargatze': (t) => {
      if (!/so apparently|turns out|I guess/i.test(t)) {
        return `So apparently ${t[0].toLowerCase()}${t.slice(1, -1)}. I guess that's normal.`;
      }
      return t;
    }
  };
  
  const enhancer = voiceEnhancements[comedianVoice];
  return enhancer ? enhancer(text) : text;
}

// Select appropriate comedian for rating
export function selectComedianForRating(rating: string): string {
  const comedians = DELIVERY_TEMPLATES[rating]?.map(t => t.comedian) || [];
  if (comedians.length === 0) return 'default';
  
  return comedians[Math.floor(Math.random() * comedians.length)];
}