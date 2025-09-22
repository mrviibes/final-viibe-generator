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

  // Common fragment patterns with specific repairs
  const fragmentRepairs: [RegExp, string][] = [
    [/^Man listen Jesse in America\b.*$/i, "Man listen Jesse parties so hard even the cake gets nervous."],
    [/^You ever tonight\.?\s*$/i, "You ever notice parties always end with regret."],
    [/^So I walk into my tonight\.?\s*$/i, "So I walk into this party and immediately want to leave."],
    [/\b(the|and|was|had|with|for|but|that|to|at|in|on|so|even|is|my)\.\s*$/i, " and the cake still looked confused."],
    [/\bcome to\.\s*$/i, " come to celebrate."],
    [/\bmake Jesse any\.\s*$/i, " make Jesse happy."],
    [/\bpeople come to\.\s*$/i, " people come to party."],
    [/\bcake was so bad even the\.\s*$/i, " cake was so bad the candles quit."],
    [/\bfirst then the real reason\.\s*$/i, " first then reality hit hard."],
    [/\bdidn't make Jesse any\.\s*$/i, " didn't make Jesse smile."],
    [/\bso bad even the\.\s*$/i, " so bad even the decorations left early."]
  ];

  // Apply repairs
  for (const [pattern, replacement] of fragmentRepairs) {
    if (pattern.test(repaired)) {
      repaired = repaired.replace(pattern, replacement);
      break;
    }
  }

  // Fix dangling single letters
  repaired = repaired.replace(/\b[a-z]\.\s*$/i, " show.");

  // Ensure proper ending
  if (!repaired.endsWith('.')) {
    repaired += '.';
  }

  return repaired;
}

export function spreadHardTagCreatively(lines: string[], hardTag: string): string[] {
  if (!hardTag || lines.length === 0) return lines;

  const tag = hardTag.trim();
  const tagLower = tag.toLowerCase();
  
  // Check which lines already have the tag
  const hasTag = lines.map(line => line.toLowerCase().includes(tagLower));
  const needsTag = hasTag.filter(Boolean).length < 3; // Need at least 3/4 lines
  
  if (!needsTag) return lines; // Already sufficient coverage

  return lines.map((line, index) => {
    if (hasTag[index]) return line; // Already has tag

    // Creative placement strategies
    switch (index % 4) {
      case 0: // Front placement
        return `${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
      
      case 1: // After first word
        const words = line.split(' ');
        if (words.length > 1) {
          return `${words[0]} ${tag} ${words.slice(1).join(' ')}`;
        }
        return `${tag} ${line.toLowerCase()}`;
      
      case 2: // Before last word
        const beforeLast = line.replace(/\s+([^\s]+)\.\s*$/, ` with ${tag} $1.`);
        return beforeLast !== line ? beforeLast : `${tag} ${line.toLowerCase()}`;
      
      case 3: // End placement
        return line.replace(/\.\s*$/, ` and ${tag} knows it.`);
      
      default:
        return `${tag} ${line.toLowerCase()}`;
    }
  });
}

export function applyFallbackCompletion(line: string, category: string): string {
  const contextWords = {
    "Birthday": ["cake", "candles", "party", "balloons", "wish"],
    "Basketball": ["court", "hoop", "dribble", "rebound", "buzzer"],
    "Christmas": ["tree", "lights", "stocking", "wrapping", "carols"]
  };

  const words = contextWords[category] || ["show"];
  const fallbackWord = words[Math.floor(Math.random() * words.length)];

  // If line seems incomplete, add safe completion
  if (line.length < 45 || /\b(and|the|to|for|with|of|on|so|but)\.\s*$/i.test(line)) {
    return line.replace(/\.\s*$/, ` and the ${fallbackWord} doesn't care.`);
  }

  return line;
}

export function validateCompleteJoke(line: string): boolean {
  // Must be 40-100 chars
  if (line.length < 40 || line.length > 100) return false;
  
  // Must have exactly one period
  if ((line.match(/\./g) || []).length !== 1) return false;
  
  // Must not have commas or em dashes
  if (/[,—]/.test(line)) return false;
  
  // Must start with capital letter
  if (!/^[A-Z]/.test(line)) return false;
  
  // Must end with complete word + period
  if (!/[a-z)]\.\s*$/.test(line)) return false;
  
  // Must have reasonable word count (6+ words for natural flow)
  if (line.split(/\s+/).length < 6) return false;
  
  return true;
}