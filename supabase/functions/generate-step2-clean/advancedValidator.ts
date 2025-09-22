import { ParsedTags } from "./tags.ts";
import { validateNaturalDelivery, detectAndRepairFragments, applyDeliveryTemplate } from "./deliveryTemplates.ts";

type Rating = "G"|"PG-13"|"R"|"Explicit";

const BUCKETS: [number,number][] = [[40,60],[61,80],[81,100]];

// Enhanced pop culture entities with current references
const POP = {
  music: ["taylor swift","drake","bad bunny","beyonce","ice spice","travis scott","olivia rodrigo","doja cat","the weeknd","billie eilish"],
  film_tv: ["barbie","oppenheimer","succession","stranger things","euphoria","marvel","wednesday","house of dragon","rings of power","squid game"],
  internet: ["elon musk","mrbeast","tiktok","threads","memes","chatgpt","crypto","nft","metaverse","twitter"],
  sports: ["lebron","messi","serena williams","simone biles","steph curry","shaq","tom brady","cristiano ronaldo","tiger woods","usain bolt"]
};

// Comedian voices by rating with specific style patterns
const VOICES: Record<Rating,string[]> = {
  "G":      ["jim gaffigan","nate bargatze","ellen degeneres"],
  "PG-13":  ["kevin hart","trevor noah","ali wong"],
  "R":      ["bill burr","chris rock","wanda sykes"],
  "Explicit":["sarah silverman","joan rivers","amy schumer"]
};

// Voice style patterns for validation
const VOICE_PATTERNS = {
  "kevin hart": /\b(short|height|tiny|little|scared|nervous|wife|crowd|energy)\b/i,
  "trevor noah": /\b(social|society|culture|different|perspective|observe|accent|country)\b/i,
  "ali wong": /\b(weird|bizarre|absurd|crazy|mom|pregnancy|husband|asian)\b/i,
  "bill burr": /\b(angry|mad|stupid|idiots|rant|boston|sports|relationship)\b/i,
  "chris rock": /\b(black|white|people|relationship|marriage|money|society)\b/i,
  "sarah silverman": /\b(inappropriate|taboo|shocking|cute|innocent|twisted)\b/i
};

// Context lexicons for different subcategories
const CONTEXT_LEXICONS = {
  "Password reset": ["password","login","reset","verify","code","two factor","captcha","security","account","forgot"],
  "Birthday": ["cake","candles","party","balloons","wish","slice","confetti","celebration","gift","age"],
  "Basketball": ["hoop","rim","court","dribble","rebound","buzzer","foul","free throw","timeout","screen"],
  "Soccer practice": ["pitch","keeper","goal","drill","boot","practice","field","ball","team","coach"],
  "Work emails": ["inbox","subject","cc","bcc","reply all","signature","meeting","deadline","boss","office"],
  "Christmas": ["tree","lights","presents","santa","reindeer","cookies","snow","family","holiday","spirit"],
  "Thanksgiving": ["turkey","gravy","pie","table","toast","leftovers","cranberry","family","stuffing","grateful"]
};

// Session tracking for pop culture freshness
let recentPopEntities: string[] = [];
let currentBatchEntities: string[] = [];

// ---------- low-level guards ----------
const onePeriod = (s: string) => (s.match(/\./g)||[]).length === 1;
const noBanned = (s: string) => !/[,—]/.test(s);
const capFirst = (s: string) => s.replace(/^[a-z]/, m => m.toUpperCase());
const endWithDot = (s: string) => s.endsWith(".") ? s : s + ".";
const insideRange = (s: string, lo: number, hi: number) => s.length >= lo && s.length <= hi;

// Enhanced fragment repair for common incomplete patterns
function repairEnding(s: string): string {
  const fragmentRepairs = [
    [/\b(and|the|to|for|with|of|on|so|even|but|that|at|in)\.\s*$/i, " now."],
    [/\bcome to\.\s*$/i, " come to the party."],
    [/\bso bad even the\.\s*$/i, " so bad even the cake complained."],
    [/\bcake was so bad even the\.\s*$/i, " cake was so bad even the candles refused to stay lit."],
    [/\bpeople come to\.\s*$/i, " people come to the party."],
    [/\bmake Jesse any\.\s*$/i, " make Jesse any happier."],
    [/\bdidn't make Jesse any\.\s*$/i, " didn't make Jesse any younger."],
    [/\bhell no I\.\s*$/i, " hell no I said."],
    [/\bhell no I now\.\s*$/i, " hell no I can't even."],
    [/\b([a-z]{1,2})\.\s*$/i, " show."], // Fix single/double letter endings
    [/\bpl\.\s*$/i, "play."],
    [/\bd\.\s*$/i, "down."],
    [/\bg\.\s*$/i, "game."]
  ];
  
  for (const [pattern, replacement] of fragmentRepairs) {
    if (pattern.test(s)) {
      return s.replace(pattern, replacement);
    }
  }
  
  return s;
}

// Safe trim to word boundary
function trimWordSafe(s: string, hi: number): string {
  if (s.length <= hi) return s;
  const cut = s.slice(0, hi);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return safe.replace(/\.+$/, "") + ".";
}

// Enforce single sentence and length band
function formatLine(s: string, lo: number, hi: number): string {
  let t = s.trim().replace(/[—,]/g, "").replace(/\s+/g, " ");
  t = endWithDot(t);
  t = repairEnding(t);
  
  // Squash multiple sentences to one
  if (!onePeriod(t)) {
    const firstSentence = t.split('.')[0].trim();
    t = firstSentence + ".";
  }
  
  // Length fitting with word safety
  if (!insideRange(t, lo, hi)) {
    if (t.length > hi) {
      t = trimWordSafe(t, hi);
    } else {
      // Extend short lines
      t = t.replace(/\.$/, " tonight.");
    }
  }
  
  t = capFirst(t).replace(/\s+\./g, ".");
  return t;
}

// ---------- pop culture freshness ----------
function pickFreshEntity(excludeRecent: string[] = []): string {
  const flat = [...POP.music, ...POP.film_tv, ...POP.internet, ...POP.sports];
  const available = flat.filter(e => 
    !excludeRecent.includes(e) && 
    !recentPopEntities.includes(e) && 
    !currentBatchEntities.includes(e)
  );
  
  if (available.length === 0) {
    // Reset if we've exhausted all entities
    recentPopEntities = [];
    currentBatchEntities = [];
    return flat[Math.floor(Math.random() * flat.length)];
  }
  
  const selected = available[Math.floor(Math.random() * available.length)];
  currentBatchEntities.push(selected);
  
  return selected;
}

function injectPop(line: string, entity: string): string {
  // Check if entity already present
  if (new RegExp(`\\b${entity.replace(/\s+/g, "\\s+")}\\b`, "i").test(line)) {
    return line;
  }
  
  // Format entity name properly (e.g., "taylor swift" -> "Taylor Swift")
  const formattedEntity = entity.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Add clean comparison at end
  return line.replace(/\.$/, ` like ${formattedEntity}.`);
}

// ---------- comedian voice validation ----------
function validateVoiceMatch(line: string, voice: string): boolean {
  const pattern = VOICE_PATTERNS[voice.toLowerCase()];
  if (!pattern) return true; // No specific pattern, allow it
  
  return pattern.test(line);
}

function enhanceVoiceMatch(line: string, voice: string, rating: string): string {
  // First, apply delivery template for natural comedian rhythm
  let enhanced = applyDeliveryTemplate(line, rating, voice);
  
  // Check if enhanced line sounds natural
  const naturalCheck = validateNaturalDelivery(enhanced);
  if (!naturalCheck.isNatural) {
    console.log(`⚠️ Enhanced voice line not natural: ${naturalCheck.issues.join(', ')}`);
    
    // If still not natural, try fragment repair
    enhanced = detectAndRepairFragments(enhanced);
  }
  
  // Legacy enhancements for compatibility
  if (!validateVoiceMatch(enhanced, voice)) {
    const voiceEnhancements = {
      "kevin hart": [" man", " yo", " short"],
      "trevor noah": [" you know", " different", " society"],
      "ali wong": [" weird", " crazy", " bizarre"],
      "bill burr": [" angry", " stupid", " mad"],
      "chris rock": [" people", " relationship", " money"],
      "sarah silverman": [" inappropriate", " twisted", " cute"]
    };
    
    const enhancements = voiceEnhancements[voice.toLowerCase()];
    if (enhancements) {
      const enhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
      enhanced = enhanced.replace(/\.$/, `${enhancement}.`);
    }
  }
  
  return enhanced;
}

// ---------- hard/soft tags ----------
function enforceHardTagFront(line: string, hard: string[]): string {
  if (!hard.length) return line;
  const tag = hard[0];
  return `${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}

function spreadHardTag(line: string, tag: string, idx: number): string {
  if (!tag) return line;
  
  // Check if tag already present
  if (line.toLowerCase().includes(tag.toLowerCase())) return line;
  
  switch (idx) {
    case 0: // Line 1: front placement
      return `${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
    case 1: // Line 2: after first word
      const words = line.split(' ');
      if (words.length > 1) {
        return `${words[0]} ${tag} ${words.slice(1).join(' ')}`;
      }
      return `${tag} ${line}`;
    default: // Lines 3-4: tail placement
      return line.replace(/\.$/, ` with ${tag}.`);
  }
}

function enforceHard(line: string, hard: string[]): string {
  if (!hard.length) return line;
  const tag = hard[0];
  const hasTag = line.toLowerCase().includes(tag.toLowerCase());
  
  if (hasTag) return line;
  
  // Try natural injection first
  const patterns = [
    /(\b(?:is|are|was|were|has|have|does|do|gets|got|makes|made)\b)/i,
    /(\b(?:and|but|while|when|if|because|since)\b)/i,
    /(\b(?:with|for|by|at|on|in)\b)/i
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match.index !== undefined) {
      const insertPos = match.index + match[0].length;
      return line.slice(0, insertPos) + ` ${tag}` + line.slice(insertPos);
    }
  }
  
  // Fallback: prepend tag
  return `${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
}

function stripSoft(line: string, soft: string[]): string {
  if (!soft.length) return line;
  let cleaned = line;
  
  const re = new RegExp(`\\b(${soft.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "ig");
  cleaned = cleaned.replace(re, "that");
  
  return cleaned.replace(/\s+/g, " ").trim();
}

// ---------- context anchoring ----------
function ensureContextAnchor(line: string, subcategory: string): string {
  const lexicon = CONTEXT_LEXICONS[subcategory] || [];
  if (!lexicon.length) return line;
  
  const hasContext = lexicon.some(word => 
    new RegExp(`\\b${word}\\b`, "i").test(line)
  );
  
  if (hasContext) return line;
  
  // Inject context word naturally
  const contextWord = lexicon[Math.floor(Math.random() * lexicon.length)];
  return line.replace(/\.$/, ` ${contextWord}.`);
}

// ---------- tone enforcement ----------
function ensureToneWords(line: string, tone: string): string {
  const toneWords = {
    "Romantic": ["love", "heart", "warm", "dear", "sweet", "tender", "cherish", "adore"],
    "Savage": ["brutal", "destroy", "savage", "ruthless", "devastate", "annihilate"],
    "Playful": ["silly", "fun", "playful", "goofy", "mischief", "giggly"],
    "Sentimental": ["memories", "nostalgia", "touching", "emotional", "heartfelt", "precious"]
  };
  
  const words = toneWords[tone] || [];
  if (!words.length) return line;
  
  const hasTone = words.some(word => 
    new RegExp(`\\b${word}\\b`, "i").test(line)
  );
  
  if (hasTone) return line;
  
  // Inject tone word naturally
  const toneWord = words[Math.floor(Math.random() * words.length)];
  
  if (tone === "Romantic") {
    return line.replace(/\.$/, ` and my ${toneWord} knew it.`);
  } else if (tone === "Savage") {
    return line.replace(/\.$/, ` ${toneWord} style.`);
  } else if (tone === "Playful") {
    return line.replace(/\.$/, ` in a ${toneWord} way.`);
  } else if (tone === "Sentimental") {
    return line.replace(/\.$/, ` like a precious ${toneWord}.`);
  }
  
  return line;
}

// ---------- ending variety enforcement ----------
const ENDING_POOL = ["tonight.", "after all.", "at the party.", "for real.", "honestly.", "apparently.", "somehow."];
let usedEndings: string[] = [];

function enforceEndingVariety(line: string): string {
  // Check if line has repetitive ending
  const repetitiveEndings = ["man.", "dude.", "bro.", "yo."];
  const hasRepetitive = repetitiveEndings.some(ending => line.endsWith(ending));
  
  if (!hasRepetitive) return line;
  
  // Find available ending
  const availableEndings = ENDING_POOL.filter(ending => !usedEndings.includes(ending));
  const selectedEnding = availableEndings.length > 0 
    ? availableEndings[Math.floor(Math.random() * availableEndings.length)]
    : ENDING_POOL[Math.floor(Math.random() * ENDING_POOL.length)];
  
  usedEndings.push(selectedEnding);
  if (usedEndings.length > 3) usedEndings = usedEndings.slice(-3); // Keep last 3
  
  // Replace ending
  return line.replace(/\s+(man|dude|bro|yo)\.$/, ` ${selectedEnding}`);
}

// ---------- sentence structure validation ----------
function validateJokeStructure(line: string): string {
  // Check if line is just setup without punchline
  const setupPatterns = [
    /^Why does .+\?$/i,
    /^What .+ when .+\?$/i,
    /^How .+ like .+\?$/i
  ];
  
  const isOnlySetup = setupPatterns.some(pattern => pattern.test(line));
  
  if (isOnlySetup) {
    // Convert question to statement with punchline
    return line.replace(/\?$/, " like even Santa nodded in agreement.");
  }
  
  // Check for incomplete thoughts ending with prepositions
  if (/\b(to|at|with|for|by|in|on|of|and|but|so)\.$/.test(line)) {
    return line.replace(/\s+\w+\.$/, " right now.");
  }
  
  return line;
}

// ---------- main orchestrator ----------
export function validateAndRepairBatch(raw: string[], opts: {
  rating: Rating,
  category: string,
  subcategory: string,
  hardTags: string[],
  softTags: string[],
  comedianVoice?: string,
  requirePop?: boolean,
  tone?: string
}): string[] {
  // Reset batch tracking
  currentBatchEntities = [];
  usedEndings = []; // Reset ending variety tracker
  
  // Assign length buckets for variety
  const buckets = [...BUCKETS, BUCKETS[Math.floor(Math.random() * BUCKETS.length)]];
  
  let out = raw.slice(0, 4).map((line, i) => {
    let s = line.trim();
    
    // 1. Strip soft tag echoes
    s = stripSoft(s, opts.softTags);
    
    // 2. Ensure context anchoring
    s = ensureContextAnchor(s, opts.subcategory);
    
    // 3. Tone enforcement (if specified)
    if (opts.tone) {
      s = ensureToneWords(s, opts.tone);
    }
    
    // 4. Optional pop culture injection
    if (opts.requirePop) {
      const entity = pickFreshEntity();
      s = injectPop(s, entity);
    }
    
    // 5. Format and fit to length bucket
    const [lo, hi] = buckets[i];
    s = formatLine(s, lo, hi);
    
    // 6. Enhance comedian voice match if specified
    if (opts.comedianVoice) {
      s = enhanceVoiceMatch(s, opts.comedianVoice, opts.rating);
    }
    
    // 7. Enforce ending variety
    s = enforceEndingVariety(s);
    
    // 8. Validate joke structure
    s = validateJokeStructure(s);
    
    // 9. Final validation and repair
    if (!noBanned(s) || !onePeriod(s)) {
      s = formatLine(s, lo, hi);
    }
    
    return s;
  });
  
  // Enforce hard tag presence in at least 3/4 lines with creative placement
  if (opts.hardTags.length > 0) {
    const tag = opts.hardTags[0];
    let hits = out.filter(l => l.toLowerCase().includes(tag.toLowerCase())).length;
    
    if (hits < 3) {
      for (let i = 0; i < out.length && hits < 3; i++) {
        if (!out[i].toLowerCase().includes(tag.toLowerCase())) {
          out[i] = spreadHardTag(out[i], tag, i);
          hits++;
        }
      }
    }
  }
  
  // Update recent entities tracking
  if (currentBatchEntities.length > 0) {
    recentPopEntities = [...recentPopEntities, ...currentBatchEntities].slice(-10); // Keep last 10
  }
  
  return out;
}

// ---------- validation scoring ----------
export function scoreBatchQuality(lines: string[], opts: {
  rating: Rating,
  category: string,
  subcategory: string,
  hardTags: string[],
  comedianVoice?: string
}): {
  overallScore: number,
  formatScore: number,
  contextScore: number,
  voiceScore: number,
  tagScore: number,
  naturalityScore: number,
  issues: string[]
} {
  const issues: string[] = [];
  let formatScore = 0;
  let contextScore = 0;
  let voiceScore = 0;
  let tagScore = 0;
  
  // Format validation
  lines.forEach((line, i) => {
    const bucket = BUCKETS[i % BUCKETS.length];
    if (onePeriod(line) && noBanned(line) && insideRange(line, bucket[0], bucket[1]) && /^[A-Z]/.test(line)) {
      formatScore += 25;
    } else {
      issues.push(`Line ${i+1}: Format issues`);
    }
  });
  
  // Context validation
  const lexicon = CONTEXT_LEXICONS[opts.subcategory] || [];
  if (lexicon.length > 0) {
    lines.forEach((line, i) => {
      const hasContext = lexicon.some(word => new RegExp(`\\b${word}\\b`, "i").test(line));
      if (hasContext) {
        contextScore += 25;
      } else {
        issues.push(`Line ${i+1}: Missing context anchor`);
      }
    });
  } else {
    contextScore = 100; // No specific context requirements
  }
  
  // Voice validation
  if (opts.comedianVoice) {
    lines.forEach((line, i) => {
      if (validateVoiceMatch(line, opts.comedianVoice)) {
        voiceScore += 25;
      } else {
        issues.push(`Line ${i+1}: Doesn't match ${opts.comedianVoice} voice`);
      }
    });
  } else {
    voiceScore = 100; // No voice requirement
  }
  
  // Tag validation
  if (opts.hardTags.length > 0) {
    const tag = opts.hardTags[0].toLowerCase();
    const hits = lines.filter(l => l.toLowerCase().includes(tag)).length;
    tagScore = Math.min(100, (hits / 3) * 100); // Need 3/4 for 100%
    if (hits < 3) {
      issues.push(`Hard tag "${opts.hardTags[0]}" only in ${hits}/4 lines`);
    }
  } else {
    tagScore = 100; // No tag requirement
  }
  
  // Natural delivery validation
  let naturalityScore = 0;
  lines.forEach((line, i) => {
    const naturalCheck = validateNaturalDelivery(line);
    if (naturalCheck.isNatural) {
      naturalityScore += 25;
    } else {
      issues.push(`Line ${i+1}: Sounds robotic (${naturalCheck.score}%)`);
    }
  });
  
  const overallScore = Math.round((formatScore + contextScore + voiceScore + tagScore + naturalityScore) / 5);
  
  return {
    overallScore,
    formatScore,
    contextScore,
    voiceScore,
    tagScore,
    naturalityScore,
    issues
  };
}

// ---------- retry logic ----------
export function shouldRetryBatch(score: ReturnType<typeof scoreBatchQuality>): boolean {
  return score.overallScore < 75 || score.issues.length > 2;
}

// ---------- pop culture management ----------
export function resetPopCultureSession(): void {
  recentPopEntities = [];
  currentBatchEntities = [];
}

export function getPopCultureStatus(): {
  recentEntities: string[],
  currentBatchEntities: string[],
  availableEntities: number
} {
  const flat = [...POP.music, ...POP.film_tv, ...POP.internet, ...POP.sports];
  const available = flat.filter(e => !recentPopEntities.includes(e) && !currentBatchEntities.includes(e));
  
  return {
    recentEntities: [...recentPopEntities],
    currentBatchEntities: [...currentBatchEntities],
    availableEntities: available.length
  };
}