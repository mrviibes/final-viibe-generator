// V5: Voice Rotation System - Natural Comedy without Forced Templates

export type ComedianVoice = "hart" | "wong" | "burr" | "gaffigan" | "noah" | "sykes" | "hedberg" | "mulaney";

const VOICE_STYLES: Record<ComedianVoice, {
  hint: string;
  approach: string;
  delivery: string;
}> = {
  hart: {
    hint: "High-energy panic storytelling",
    approach: "frantic animated reactions",
    delivery: "Use 'Man listen' optionally, focus on physical comedy"
  },
  wong: {
    hint: "Absurd honest observations", 
    approach: "brutal family truth with wild imagery",
    delivery: "Vivid similes and unexpected comparisons"
  },
  burr: {
    hint: "Working-class rant roast",
    approach: "irritated confrontational truth",
    delivery: "Build frustration then release with profanity"
  },
  gaffigan: {
    hint: "Clean self-deprecating whisper",
    approach: "internal voice food/family humor", 
    delivery: "Innocent observations with quiet asides"
  },
  noah: {
    hint: "Global cultural contrast",
    approach: "thoughtful social commentary",
    delivery: "Optional 'In X vs Y' comparisons"
  },
  sykes: {
    hint: "Dry sassy maternal wisdom",
    approach: "everyday observations with attitude",
    delivery: "Confident delivery with sharp timing"
  },
  hedberg: {
    hint: "Surreal deadpan one-liners",
    approach: "absurd logical connections",
    delivery: "Matter-of-fact delivery of weird truths"
  },
  mulaney: {
    hint: "Precise narrative storytelling",
    approach: "nostalgic childhood wonder",
    delivery: "Clean setup with tidy unexpected flip"
  }
};

export function selectComedianForRating(rating: string): ComedianVoice {
  const pools: Record<string, ComedianVoice[]> = {
    "G": ["gaffigan", "hedberg", "mulaney"],
    "PG-13": ["hart", "wong", "noah", "sykes", "mulaney"],
    "R": ["burr", "wong", "sykes", "hart"],
    "Explicit": ["wong", "burr", "sykes"]
  };
  
  const pool = pools[rating] || pools["PG-13"];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function createVoiceRotation(rating: string, count: number = 4): ComedianVoice[] {
  const pools: Record<string, ComedianVoice[]> = {
    "G": ["gaffigan", "hedberg", "mulaney", "noah"],
    "PG-13": ["hart", "wong", "noah", "sykes"],
    "R": ["burr", "wong", "sykes", "hart"], 
    "Explicit": ["wong", "burr", "sykes", "hart"]
  };
  
  const pool = [...(pools[rating] || pools["PG-13"])];
  const selected: ComedianVoice[] = [];
  
  // Shuffle and pick unique voices
  for (let i = 0; i < count && pool.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(randomIndex, 1)[0]);
  }
  
  // Fill remaining slots if needed
  while (selected.length < count) {
    const allVoices = pools[rating] || pools["PG-13"];
    selected.push(allVoices[selected.length % allVoices.length]);
  }
  
  return selected;
}

export function getVoiceHint(voice: ComedianVoice): string {
  const style = VOICE_STYLES[voice];
  return `${style.hint}. ${style.delivery}. Keep it natural and complete.`;
}

export function validateNaturalDelivery(line: string): {
  isNatural: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check for robotic patterns
  if (/^(Man listen Jesse in America|You ever tonight|So I walk into my tonight)/.test(line)) {
    issues.push("fragmented opening");
    score -= 50;
  }

  // Check for incomplete endings
  if (/\b(the|and|was|had|with|for|but|that|to|at|in|on|so|even|is|my)\.\s*$/i.test(line)) {
    issues.push("incomplete ending");
    score -= 40;
  }

  // Check for natural flow
  if (line.split(' ').length < 6) {
    issues.push("too short for natural delivery");
    score -= 20;
  }

  // Check for proper sentence structure
  if (!/^[A-Z].*[a-z)]\.$/.test(line)) {
    issues.push("improper sentence structure");
    score -= 15;
  }

  return {
    isNatural: score >= 70,
    score,
    issues
  };
}

export function detectAndRepairFragments(line: string): string {
  let repaired = line.trim();

  // Enhanced fragment patterns targeting specific issues from user feedback
  const fragmentRepairs: [RegExp, string][] = [
    // Specific patterns we've seen in the user's feedback
    [/^Man listen Jesse in America\b.*$/i, "Man listen Jesse parties like the cake owes him money."],
    [/^You ever tonight\.?\s*$/i, "You ever notice parties end with cleanup regret."],
    [/^So I walk into my tonight\.?\s*$/i, "So I walk into this party confused and leave more confused."],
    
    // Double word patterns like "the cake and the cake"
    [/\b(\w+)\s+and\s+the\s+\1\b/gi, "$1"],
    
    // Incomplete comparisons
    [/\bbut in \w+\.\s*$/i, " but in Brazil the party never stops."],
    [/\bin \w+ \w+ are \w+ and \w+ but in \w+\.\s*$/i, " in Germany birthdays are polite but in Brazil they explode with joy."],
    
    // Common incomplete endings
    [/\b(the|and|was|had|with|for|but|that|to|at|in|on|so|even|is|my)\.\s*$/i, " and everyone nodded awkwardly."],
    [/\bcome to\.\s*$/i, " come to celebrate chaos."],
    [/\bmake Jesse any\.\s*$/i, " make Jesse question everything."],
    [/\bpeople come to\.\s*$/i, " people come to witness the spectacle."],
    [/\bcake was so bad even the\.\s*$/i, " cake was so bad the candles refused to cooperate."],
    [/\bfirst then the real reason\.\s*$/i, " first then reality slapped everyone awake."],
    [/\bdidn't make Jesse any\.\s*$/i, " didn't make Jesse any wiser."],
    [/\bso bad even the\.\s*$/i, " so bad even the decorations gave up."],
    
    // Wildfire metaphor fixes
    [/\blike I'm trying to blow out a tiny wildfire\.\s*$/i, " like trying to blow out a tiny wildfire and losing."],
    
    // Forced voice cue fixes
    [/^Silas man listen\b/i, "Man listen, Silas"],
  ];

  // Apply repairs
  for (const [pattern, replacement] of fragmentRepairs) {
    if (pattern.test(repaired)) {
      repaired = repaired.replace(pattern, replacement);
      break;
    }
  }

  // Fix dangling single letters
  repaired = repaired.replace(/\b[a-z]\.\s*$/i, " anyway.");

  // Ensure proper ending
  if (!repaired.endsWith('.')) {
    repaired += '.';
  }

  return repaired;
}