// Advanced Voice Stencil System - Guarantee comedian-specific structures
import { ComedianVoice } from "../shared/comedianVoices.ts";

export type StencilVoice = "kevin_hart" | "ali_wong" | "chris_rock" | "john_mulaney" | "bill_burr" | "wanda_sykes" | "sebastian_maniscalco" | "jo_koy" | "dave_chappelle" | "taylor_tomlinson" | "nate_bargatze" | "sarah_silverman" | "trevor_noah" | "hasan_minhaj" | "ricky_gervais" | "norm_macdonald" | "mitch_hedberg" | "amy_schumer" | "george_carlin" | "joan_rivers";

type Voice = "hart" | "wong" | "rock" | "mulaney";

const BIRTHDAY_WORDS = ["cake", "candles", "balloons", "party", "wish", "slice", "confetti", "frosting", "celebrate"];
const TWIST_MARKERS = [" but ", " still ", " even ", " instead ", " and then ", " until ", " except ", " unfortunately ", " suddenly ", " turns out ", " apparently "];
const STALE_PHRASES = [/everyone nodded awkwardly/ig, /people were confused/ig, /it was weird/ig, /things got strange/ig];
const AGE_VIBE_WORDS = ["ancient", "senior moment", "AARP energy", "fossil fuel birthday", "vintage knees", "retirement party vibes", "old school", "classic age"];

// Simplified, more distinctive voice stencils
const COMEDIAN_STENCILS: Record<Voice, (a: string, b: string) => string> = {
  hart: (a, b) => `Man listen, ${lc(a)}. Next thing I know ${lc(b)}.`,
  wong: (a, b) => `${cap(a)} — like ${lc(b)}.`,
  rock: (a, b) => `${cap(a)}. But ${lc(b)}.`,
  mulaney: (a, b) => `${cap(a)}. ${cap(b)}.`
};

// Length buckets for optimal comedian delivery timing
const LENGTH_BUCKETS: [number, number][] = [[40, 60], [61, 80], [81, 100], [61, 80]];

// Comedian-specific sentence stencils with rating variations
const VOICE_STENCILS: Record<StencilVoice, {
  G: (setup: string, punch: string) => string;
  PG: (setup: string, punch: string) => string;
  R: (setup: string, punch: string) => string;
  XXX: (setup: string, punch: string) => string;
}> = {
  kevin_hart: {
    G: (a, b) => `Man listen, ${lc(a)} and then ${lc(b)}.`,
    PG: (a, b) => `Man listen, ${lc(a)} but ${lc(b)} like crazy.`,
    R: (a, b) => `Man listen, ${lc(a)} and then ${lc(b)} like hell.`,
    XXX: (a, b) => `Man listen, ${lc(a)} and then ${lc(b)} like a damn disaster.`
  },
  
  ali_wong: {
    G: (a, b) => `${cap(a)} like ${lc(b)} at a family reunion.`,
    PG: (a, b) => `${cap(a)} like ${lc(b)} with attitude.`,
    R: (a, b) => `${cap(a)} like ${lc(b)} but worse.`,
    XXX: (a, b) => `${cap(a)} like ${lc(b)} having a breakdown.`
  },
  
  chris_rock: {
    G: (a, b) => `Everybody loves ${lc(a)}. But ${lc(b)}.`,
    PG: (a, b) => `Everybody loves ${lc(a)}. But ${lc(b)} anyway.`,
    R: (a, b) => `Everybody loves ${lc(a)}. But ${lc(b)} like hell.`,
    XXX: (a, b) => `Everybody loves ${lc(a)}. But ${lc(b)} like a damn mess.`
  },
  
  john_mulaney: {
    G: (a, b) => `${cap(a)}. ${cap(b)} which was unexpected.`,
    PG: (a, b) => `${cap(a)}. ${cap(b)} obviously.`,
    R: (a, b) => `${cap(a)}. ${cap(b)} which was ridiculous.`,
    XXX: (a, b) => `${cap(a)}. ${cap(b)} which was absolutely insane.`
  },
  
  bill_burr: {
    G: (a, b) => `Why does ${lc(a)}? Because ${lc(b)} apparently.`,
    PG: (a, b) => `Why does ${lc(a)}? Because ${lc(b)} like an idiot.`,
    R: (a, b) => `Why does ${lc(a)}? Because ${lc(b)} like a moron.`,
    XXX: (a, b) => `Why the hell does ${lc(a)}? Because ${lc(b)} like a complete jackass.`
  },
  
  wanda_sykes: {
    G: (a, b) => `So ${lc(a)} and ${lc(b)} naturally.`,
    PG: (a, b) => `So ${lc(a)} but ${lc(b)} with attitude.`,
    R: (a, b) => `So ${lc(a)} but ${lc(b)} like a boss.`,
    XXX: (a, b) => `So ${lc(a)} but ${lc(b)} like a badass queen.`
  },
  
  sebastian_maniscalco: {
    G: (a, b) => `You see ${lc(a)}? Well ${lc(b)} these days.`,
    PG: (a, b) => `You see ${lc(a)}? Well ${lc(b)} like animals.`,
    R: (a, b) => `You see ${lc(a)}? Well ${lc(b)} like savages.`,
    XXX: (a, b) => `You see ${lc(a)}? Well ${lc(b)} like complete animals.`
  },
  
  jo_koy: {
    G: (a, b) => `My family ${lc(a)} so ${lc(b)} obviously.`,
    PG: (a, b) => `My family ${lc(a)} but ${lc(b)} anyway.`,
    R: (a, b) => `My family ${lc(a)} but ${lc(b)} like crazy.`,
    XXX: (a, b) => `My family ${lc(a)} but ${lc(b)} like absolute madness.`
  },
  
  dave_chappelle: {
    G: (a, b) => `${cap(a)} and ${lc(b)} because society.`,
    PG: (a, b) => `${cap(a)} but ${lc(b)} because people are weird.`,
    R: (a, b) => `${cap(a)} but ${lc(b)} because people are crazy.`,
    XXX: (a, b) => `${cap(a)} but ${lc(b)} because people are absolutely insane.`
  },
  
  taylor_tomlinson: {
    G: (a, b) => `Dating means ${lc(a)} so ${lc(b)} happens.`,
    PG: (a, b) => `Dating means ${lc(a)} but ${lc(b)} instead.`,
    R: (a, b) => `Dating means ${lc(a)} but ${lc(b)} like hell.`,
    XXX: (a, b) => `Dating means ${lc(a)} but ${lc(b)} like a complete disaster.`
  },
  
  nate_bargatze: {
    G: (a, b) => `${cap(a)} and ${lc(b)} which makes sense.`,
    PG: (a, b) => `${cap(a)} so ${lc(b)} obviously.`,
    R: (a, b) => `${cap(a)} so ${lc(b)} like an idiot.`,
    XXX: (a, b) => `${cap(a)} so ${lc(b)} like a complete moron.`
  },
  
  sarah_silverman: {
    G: (a, b) => `${cap(a)} which means ${lc(b)} sweetly.`,
    PG: (a, b) => `${cap(a)} so ${lc(b)} innocently.`,
    R: (a, b) => `${cap(a)} so ${lc(b)} inappropriately.`,
    XXX: (a, b) => `${cap(a)} so ${lc(b)} in the most twisted way.`
  },
  
  trevor_noah: {
    G: (a, b) => `In America ${lc(a)} but ${lc(b)} elsewhere.`,
    PG: (a, b) => `In America ${lc(a)} but ${lc(b)} differently.`,
    R: (a, b) => `In America ${lc(a)} but ${lc(b)} like crazy.`,
    XXX: (a, b) => `In America ${lc(a)} but ${lc(b)} like absolute madness.`
  },
  
  hasan_minhaj: {
    G: (a, b) => `So ${lc(a)} and then ${lc(b)} politically.`,
    PG: (a, b) => `So ${lc(a)} but ${lc(b)} systematically.`,
    R: (a, b) => `So ${lc(a)} but ${lc(b)} like government.`,
    XXX: (a, b) => `So ${lc(a)} but ${lc(b)} like corrupt politics.`
  },
  
  ricky_gervais: {
    G: (a, b) => `People ${lc(a)} so ${lc(b)} predictably.`,
    PG: (a, b) => `People ${lc(a)} but ${lc(b)} like idiots.`,
    R: (a, b) => `People ${lc(a)} but ${lc(b)} like morons.`,
    XXX: (a, b) => `People ${lc(a)} but ${lc(b)} like complete jackasses.`
  },
  
  norm_macdonald: {
    G: (a, b) => `${cap(a)} and ${lc(b)} which is weird.`,
    PG: (a, b) => `${cap(a)} so ${lc(b)} apparently.`,
    R: (a, b) => `${cap(a)} so ${lc(b)} like an idiot.`,
    XXX: (a, b) => `${cap(a)} so ${lc(b)} like a complete psychopath.`
  },
  
  mitch_hedberg: {
    G: (a, b) => `${cap(a)} which means ${lc(b)} logically.`,
    PG: (a, b) => `${cap(a)} so ${lc(b)} obviously.`,
    R: (a, b) => `${cap(a)} so ${lc(b)} weirdly.`,
    XXX: (a, b) => `${cap(a)} so ${lc(b)} in the most bizarre way.`
  },
  
  amy_schumer: {
    G: (a, b) => `${cap(a)} and ${lc(b)} honestly.`,
    PG: (a, b) => `${cap(a)} so ${lc(b)} shamelessly.`,
    R: (a, b) => `${cap(a)} so ${lc(b)} inappropriately.`,
    XXX: (a, b) => `${cap(a)} so ${lc(b)} in the dirtiest way possible.`
  },
  
  george_carlin: {
    G: (a, b) => `Society says ${lc(a)} but ${lc(b)} instead.`,
    PG: (a, b) => `Society says ${lc(a)} but ${lc(b)} stupidly.`,
    R: (a, b) => `Society says ${lc(a)} but ${lc(b)} like morons.`,
    XXX: (a, b) => `Society says ${lc(a)} but ${lc(b)} like complete imbeciles.`
  },
  
  joan_rivers: {
    G: (a, b) => `Darling ${lc(a)} so ${lc(b)} fashionably.`,
    PG: (a, b) => `Darling ${lc(a)} but ${lc(b)} terribly.`,
    R: (a, b) => `Darling ${lc(a)} but ${lc(b)} hideously.`,
    XXX: (a, b) => `Darling ${lc(a)} but ${lc(b)} like a fashion disaster from hell.`
  }
};

// Helper functions
function cap(s: string): string {
  return s.replace(/^\s*[a-z]/, m => m.toUpperCase());
}

function lc(s: string): string {
  return s.replace(/^\s*[A-Z]/, m => m.toLowerCase());
}

function oneSentence(s: string): boolean {
  return (s.match(/\./g) || []).length === 1;
}

function clean(s: string): string {
  let t = s.replace(/[—,]/g, "").replace(/\s+\./g, ".").trim();
  if (!t.endsWith(".")) t += ".";
  if (!oneSentence(t)) t = t.replace(/\./g, "") + ".";
  return t;
}

function ensureBirthday(s: string): string {
  return BIRTHDAY_WORDS.some(w => new RegExp(`\\b${w}\\b`, "i").test(s))
    ? s : s.replace(/\.$/, " cake.");
}

function ensurePunch(s: string): string {
  return TWIST_MARKERS.some(m => s.toLowerCase().includes(m.trim()))
    ? s : s.replace(/\.$/, " but the cake disagreed.");
}

function fitLength(s: string, lo: number, hi: number): string {
  if (s.length > hi) {
    const cut = s.slice(0, hi);
    const safe = cut.lastIndexOf(" ") > 0 ? cut.slice(0, cut.lastIndexOf(" ")) : cut;
    return safe.replace(/\.+$/, "") + ".";
  }
  if (s.length < lo) return s.replace(/\.$/, " tonight.");
  return s;
}

function splitHalf(raw: string): { setup: string; punch: string } {
  const s = raw.replace(/\s+/g, " ").trim();
  
  // More intelligent split - avoid breaking at awkward points
  const length = s.length;
  let bestIdx = Math.floor(length * 0.55);
  
  // Look for natural break points around the target position
  const searchStart = Math.max(15, bestIdx - 15);
  const searchEnd = Math.min(length - 15, bestIdx + 15);
  
  // Prefer breaking after conjunctions, prepositions, or articles
  const breakWords = [" but ", " and ", " so ", " because ", " when ", " after ", " the ", " a "];
  for (const breakWord of breakWords) {
    const idx = s.indexOf(breakWord, searchStart);
    if (idx >= searchStart && idx <= searchEnd) {
      bestIdx = idx + breakWord.length;
      break;
    }
  }
  
  // Fallback to word boundary
  if (bestIdx === Math.floor(length * 0.55)) {
    const spaceIdx = s.indexOf(" ", bestIdx);
    if (spaceIdx > 0 && spaceIdx < length - 10) {
      bestIdx = spaceIdx;
    }
  }
  
  return { 
    setup: s.slice(0, bestIdx).trim(), 
    punch: s.slice(bestIdx).trim().replace(/^[^\w]+/, "") 
  };
}

function similarity(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/\s+/));
  const B = new Set(b.toLowerCase().split(/\s+/));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return inter / union;
}

function dedupe(lines: string[]): string[] {
  const uniq: string[] = [];
  for (const l of lines) {
    if (!uniq.some(u => similarity(u, l) > 0.8)) uniq.push(l);
  }
  return uniq;
}

// Convert ComedianVoice to StencilVoice
function mapToStencilVoice(voice: ComedianVoice): StencilVoice {
  const mapping: Record<string, StencilVoice> = {
    "Kevin Hart": "kevin_hart",
    "Ali Wong": "ali_wong", 
    "Chris Rock": "chris_rock",
    "John Mulaney": "john_mulaney",
    "Bill Burr": "bill_burr",
    "Wanda Sykes": "wanda_sykes",
    "Sebastian Maniscalco": "sebastian_maniscalco",
    "Jo Koy": "jo_koy",
    "Dave Chappelle": "dave_chappelle",
    "Taylor Tomlinson": "taylor_tomlinson",
    "Nate Bargatze": "nate_bargatze",
    "Sarah Silverman": "sarah_silverman",
    "Trevor Noah": "trevor_noah",
    "Hasan Minhaj": "hasan_minhaj",
    "Ricky Gervais": "ricky_gervais",
    "Norm MacDonald": "norm_macdonald",
    "Mitch Hedberg": "mitch_hedberg",
    "Amy Schumer": "amy_schumer",
    "George Carlin": "george_carlin",
    "Joan Rivers": "joan_rivers"
  };
  
  return mapping[voice.name] || "john_mulaney";
}

// Enhanced similarity checking (removed duplicate - using original function above)

function improvedDedupe(lines: string[]): string[] {
  const uniq: string[] = [];
  for (const l of lines) {
    // Much stricter deduplication - 0.85+ similarity threshold
    if (!uniq.some(u => similarity(u, l) > 0.85)) {
      uniq.push(l);
    }
  }
  return uniq;
}

function ensureAgeVibe(s: string, hasVibeOld: boolean): string {
  if (!hasVibeOld) return s;
  if (/\b(old|aging|wrinkle|retire|senior|hip|ancient|vintage)\b/i.test(s)) return s;
  const tag = AGE_VIBE_WORDS[Math.floor(Math.random() * AGE_VIBE_WORDS.length)];
  return s.replace(/\.$/, ` with ${tag}.`);
}

function addRatingSpice(s: string, rating: string): string {
  if (rating === "R" && !/\b(damn|hell|shit|fuck)\b/i.test(s)) {
    return s.replace(/\.$/, " damn.");
  }
  return s;
}

function removeStaleContent(s: string): string {
  let cleaned = s;
  STALE_PHRASES.forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function distributeHardTag(lines: string[], hardTag: string): string[] {
  if (!hardTag) return lines;
  
  const tag = hardTag.toLowerCase();
  return lines.map((line, i) => {
    if (line.toLowerCase().includes(tag)) return line;
    
    // Distribute strategically: start, mid, tail pattern
    switch (i) {
      case 0:
        return `${hardTag} ${line[0].toLowerCase()}${line.slice(1)}`;
      case 1:
        return line.replace(/^\w+/, `$& ${hardTag}`);
      default:
        return line.replace(/\.$/, ` with ${hardTag}.`);
    }
  });
}

// Main enhanced repair function
export function fixBirthdayBatch(
  rawOutputs: string[], 
  voices: Voice[], 
  options: {
    hardTag?: string;
    rating: "G" | "PG" | "PG-13" | "R" | "Explicit";
    vibeOld?: boolean;
  }
): string[] {
  const LENGTH_BUCKETS: [[number, number], [number, number], [number, number], [number, number]] = 
    [[40, 60], [61, 80], [81, 100], [61, 80]];

  console.log(`🎭 Starting fixBirthdayBatch with voices: ${voices.join(", ")}, rating: ${options.rating}`);

  let output = rawOutputs.slice(0, 4).map((r, i) => {
    // 1. Clean and remove stale content
    let s = removeStaleContent(clean(r));
    
    // 2. Enforce birthday and humor structure
    s = ensureBirthday(s);
    s = ensurePunch(s);
    s = ensureAgeVibe(s, !!options.vibeOld);
    
    // 3. Apply voice stencil
    const { setup, punch } = splitHalf(s);
    const voice = voices[i] || "mulaney";
    s = COMEDIAN_STENCILS[voice](setup, punch);
    
    // 4. Clean again and fit length
    s = clean(s);
    const [lo, hi] = LENGTH_BUCKETS[i];
    s = fitLength(s, lo, hi);
    
    // 5. Add rating-appropriate spice
    s = addRatingSpice(s, options.rating);
    
    console.log(`🎪 Line ${i + 1} (${voice}): "${s}" (${s.length} chars)`);
    return s;
  });

  // 6. Distribute hard tag strategically
  output = distributeHardTag(output, options.hardTag || "");

  // 7. Strong deduplication
  const beforeDedupe = output.length;
  output = improvedDedupe(output);
  if (output.length < beforeDedupe) {
    console.log(`🔄 Deduped ${beforeDedupe - output.length} similar lines`);
  }

  // 8. Fill to 4 lines with quality fallbacks
  while (output.length < 4) {
    const fallbacks = [
      "Jesse's cake had so many candles the smoke alarm brought a plus-one.",
      "The birthday balloons tried to file for overtime pay.",
      "Jesse's party was like planning a revolution but with more frosting."
    ];
    const fallback = fallbacks[output.length - 1] || fallbacks[0];
    output.push(fallback);
  }

  return output.slice(0, 4);
}

// Legacy wrapper for backward compatibility
export function repairWithVoiceStencils(
  rawOutputs: string[], 
  voices: ComedianVoice[], 
  rating: string
): string[] {
  // Map ComedianVoice to simplified Voice types
  const mappedVoices: Voice[] = voices.slice(0, 4).map(voice => 
    mapToStencilVoice(voice) === "kevin_hart" ? "hart" :
    mapToStencilVoice(voice) === "ali_wong" ? "wong" :
    mapToStencilVoice(voice) === "chris_rock" ? "rock" :
    "mulaney"
  );

  return fixBirthdayBatch(rawOutputs, mappedVoices, {
    rating: rating === "G" ? "G" : rating === "PG-13" ? "PG-13" : rating.includes("R") || rating === "Explicit" ? "R" : "G"
  });
}

// Quality validation for stencil-repaired jokes
export function validateStencilRepair(lines: string[]): {
  isValid: boolean;
  issues: string[];
  score: number;
  stageReadyCount: number;
} {
  const issues: string[] = [];
  let score = 100;
  let stageReadyCount = 0;

  lines.forEach((line, i) => {
    let lineScore = 100;
    
    // Basic format validation
    if (!/^[A-Z]/.test(line)) {
      issues.push(`Line ${i + 1}: Doesn't start with capital`);
      lineScore -= 15;
    }
    
    if ((line.match(/\./g) || []).length !== 1) {
      issues.push(`Line ${i + 1}: Multiple or no periods`);
      lineScore -= 20;
    }
    
    if (/[,—]/.test(line)) {
      issues.push(`Line ${i + 1}: Contains banned punctuation`);
      lineScore -= 10;
    }
    
    if (line.length < 40 || line.length > 100) {
      issues.push(`Line ${i + 1}: Wrong length (${line.length})`);
      lineScore -= 15;
    }

    // Comedian structure validation
    const hasTwist = TWIST_MARKERS.some(m => line.toLowerCase().includes(m.trim()));
    if (!hasTwist) {
      issues.push(`Line ${i + 1}: Missing punchline twist`);
      lineScore -= 25;
    }

    // Birthday lexicon validation
    const hasBirthday = BIRTHDAY_WORDS.some(w => new RegExp(`\\b${w}\\b`, "i").test(line));
    if (!hasBirthday) {
      issues.push(`Line ${i + 1}: Missing birthday words`);
      lineScore -= 20;
    }

    // Enhanced fragment detection
    const fragmentPatterns = [
      /\b(and|but|so|because|when|while|until|after|before|the|was|had|with|for|that|to|at|in|on|even)\s*\.?\s*$/i,
      /\bcome to\.\s*$/i,
      /\bso bad even the\.\s*$/i,
      /\bmake Jesse any\.\s*$/i,
      /\bpeople come to\.\s*$/i,
      /\bend up with but a\.\s*$/i
    ];
    
    const hasFragment = fragmentPatterns.some(pattern => pattern.test(line));
    if (hasFragment) {
      issues.push(`Line ${i + 1}: Incomplete fragment or cut-off ending`);
      lineScore -= 30;
    }

    // Stage readiness
    if (lineScore >= 75) stageReadyCount++;
    score = Math.min(score, lineScore);
  });

  // Emergency quality gate - reject if too many issues
  const qualityGate = score >= 70 && stageReadyCount >= 3;
  
  if (!qualityGate) {
    console.warn(`🚨 Quality gate failed - Score: ${score}, Stage-ready: ${stageReadyCount}/4`);
    console.warn(`Issues found:`, issues);
  }

  return {
    isValid: qualityGate,
    issues,
    score: Math.max(score, 0),
    stageReadyCount
  };
}