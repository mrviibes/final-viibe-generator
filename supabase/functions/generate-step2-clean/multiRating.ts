// Multi-rating comedy generator with comedian voice assignment
import { ParsedTags } from "./tags.ts";

export interface RatingResult {
  voice: string;
  text: string;
}

export interface MultiRatingOutput {
  G: RatingResult[];
  "PG-13": RatingResult[];
  R: RatingResult[];
  Explicit: RatingResult[];
}

// Expanded rating-specific comedian voice banks for true variety
const COMEDIAN_VOICE_BANKS = {
  G: [
    { name: "Jim Gaffigan", style: "Clean observational, family-safe wordplay" },
    { name: "Nate Bargatze", style: "Innocent storytelling, wholesome confusion" },
    { name: "Ellen DeGeneres", style: "Gentle teasing, relatable daily observations" },
    { name: "Brian Regan", style: "Animated clean storytelling with physical comedy" },
    { name: "Jerry Seinfeld", style: "Observational 'what's the deal with' structure" },
    { name: "Bob Newhart", style: "Deadpan phone conversation style, understated" }
  ],
  "PG-13": [
    { name: "Kevin Hart", style: "High-energy panic, mild profanity (damn/hell)" },
    { name: "Trevor Noah", style: "Smart observations with light edge" },
    { name: "Ali Wong", style: "Honest sass with controlled attitude" },
    { name: "Taylor Tomlinson", style: "Millennial anxiety with dating disasters" },
    { name: "Hasan Minhaj", style: "Cultural storytelling with political undertones" },
    { name: "Sebastian Maniscalco", style: "Exasperated family humor with gestures" },
    { name: "John Mulaney", style: "Precise nostalgic storytelling" }
  ],
  R: [
    { name: "Bill Burr", style: "Strong profanity, adult themes, ranty energy" },
    { name: "Chris Rock", style: "Sharp social commentary with f-bombs" },
    { name: "Wanda Sykes", style: "Brutal honesty with adult language" },
    { name: "Dave Chappelle", style: "Cultural insights with provocative edge" },
    { name: "Ricky Gervais", style: "Edgy British cruelty, boundary-pushing" },
    { name: "Anthony Jeselnik", style: "Dark deadpan with shocking twists" },
    { name: "Patrice O'Neal", style: "Confrontational relationship truths" }
  ],
  Explicit: [
    { name: "Sarah Silverman", style: "Raunchy innuendo tied to premise" },
    { name: "Joan Rivers", style: "Savage sexual references and shock value" },
    { name: "Amy Schumer", style: "Explicit sexual comedy, no filter" },
    { name: "Doug Stanhope", style: "Dark explicit social commentary" },
    { name: "Lisa Lampanelli", style: "Insult comedy with explicit language" },
    { name: "Andrew Dice Clay", style: "Crude nursery rhymes and explicit stories" }
  ]
} as const;

// Anti-repeat tracking for true variety
let usedComediansByRating: Record<string, Set<string>> = {
  G: new Set(),
  "PG-13": new Set(),
  R: new Set(),
  Explicit: new Set()
};

export function selectComedianForRating(rating: string): { name: string; style: string } {
  const bank = COMEDIAN_VOICE_BANKS[rating as keyof typeof COMEDIAN_VOICE_BANKS] || COMEDIAN_VOICE_BANKS["PG-13"];
  const usedSet = usedComediansByRating[rating] || new Set();
  
  // Get available comedians (not yet used)
  const availableComedians = bank.filter(comedian => !usedSet.has(comedian.name));
  
  // If all comedians have been used, reset the tracking
  if (availableComedians.length === 0) {
    console.log(`🔄 Resetting comedian rotation for ${rating} rating`);
    usedComediansByRating[rating] = new Set();
    return bank[Math.floor(Math.random() * bank.length)];
  }
  
  // Select from available comedians
  const selectedComedian = availableComedians[Math.floor(Math.random() * availableComedians.length)];
  usedSet.add(selectedComedian.name);
  usedComediansByRating[rating] = usedSet;
  
  console.log(`🎭 Selected ${selectedComedian.name} for ${rating} (${usedSet.size}/${bank.length} used)`);
  return selectedComedian;
}

export function buildPromptForRating(
  rating: string, 
  comedian: { name: string; style: string },
  context: string,
  tone: string,
  style: string,
  tags: ParsedTags
): string {
  const ratingInstructions = {
    G: "FAMILY-FRIENDLY ONLY: Absolutely no profanity, innuendo, or adult themes. Wholesome, clean humor suitable for children. Think Saturday morning cartoons.",
    "PG-13": "MILD EDGE REQUIRED: Must include light profanity (damn, hell, crap) OR sharp attitude OR clever innuendo. Distinctly more bite than G-rated but not harsh.",
    R: "ADULT LANGUAGE MANDATORY: Must include strong profanity (fuck, shit, ass, bitch) OR explicit sexual references OR brutal roasts. Clear adult content.",
    Explicit: "FULL NSFW REQUIRED: Must contain explicit sexual content, graphic profanity, savage personal attacks, or extreme dark humor. No limits."
  };

  const hardTagsStr = tags.hard.length ? tags.hard.join(", ") : "none";
  const softTagsStr = tags.soft.length ? tags.soft.slice(0, 6).join(" | ") : "none";
  
  // Context-specific lexicon enforcement
  let contextWords = "";
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes('thanksgiving')) {
    contextWords = "THANKSGIVING LEXICON REQUIRED: Use at least one of: turkey, gravy, pie, table, toast, leftovers, cranberry, family, stuffing.";
  } else if (contextLower.includes('birthday')) {
    contextWords = "BIRTHDAY LEXICON REQUIRED: Use at least one of: cake, candles, party, wish, balloons, celebrate.";
  } else if (contextLower.includes('christmas')) {
    contextWords = "CHRISTMAS LEXICON REQUIRED: Use at least one of: Christmas, tree, presents, Santa, holiday, celebration, gifts.";
  }
  
  // Structure enforcement based on style
  let styleInstructions = "";
  if (style === 'punchline-first') {
    styleInstructions = "MANDATORY PUNCHLINE-FIRST: Must start with 'Spoiler first then', 'Plot twist first then', or 'Fine first then' followed by the actual joke. No exceptions.";
  } else if (style === 'story') {
    styleInstructions = "STORY STRUCTURE: Mini narrative with setup → conflict/twist → punchline. Must have clear beginning, middle, end.";
  } else if (style === 'pop-culture') {
    styleInstructions = "POP CULTURE REQUIRED: Must reference specific celebrities, movies, TV shows, apps, or current trends. Make the reference central to the joke.";
  } else if (style === 'wildcard') {
    styleInstructions = "WILDCARD CHAOS: Use any structure (roast, absurd, story, punchline-first) but make it unexpected or surreal.";
  }
  
  // Special handling for Romantic tone
  let toneInstructions = "";
  if (tone.toLowerCase() === "romantic") {
    toneInstructions = [
      "ROMANTIC TONE OVERRIDE:",
      "- NO profanity allowed (overrides rating)",
      "- MUST include affectionate language: love, adore, heart, warm, sweet, tender",
      "- If birthday context: MUST include birthday words: cake, candles, party, wish, balloons",
      "- Pop culture allowed but max ONE entity per batch",
      "- Keep it genuinely affectionate, not generic hype"
    ].join("\n");
  }

  return [
    "Return one sentence. 40–100 characters. One period. NO COMMAS ANYWHERE.",
    `Write a real joke in ${style} style. Sound like ${comedian.name}.`,
    `Context: ${context}. Keep it visibly about that context.`,
    contextWords ? contextWords : "",
    styleInstructions ? styleInstructions : "",
    `Rating: ${rating} - ${ratingInstructions[rating as keyof typeof ratingInstructions]}`,
    toneInstructions ? toneInstructions : "",
    `Comedian style: ${comedian.style}`,
    `Tone: ${tone}`,
    hardTagsStr !== "none" ? `Hard tags: ${hardTagsStr} MUST appear literally.` : "Hard tags: none",
    softTagsStr !== "none" ? `Themes: ${softTagsStr} (guide tone only, do not appear verbatim)` : "Themes: none",
    "CRITICAL: Start with capital letter. Perfect grammar. One sentence only. NO COMMAS."
  ].filter(Boolean).join("\n");
}

export function validateRatingJoke(text: string, rating: string, tags: ParsedTags): boolean {
  // Basic format validation
  const charCount = text.length;
  if (charCount < 40 || charCount > 100) return false;
  
  const periodCount = (text.match(/\./g) || []).length;
  if (periodCount !== 1) return false;
  
  // Commas: allow at most one, ban em-dash
  const commaCount = (text.match(/,/g) || []).length;
  if (commaCount > 1 || text.includes('—')) return false;
  
  // Grammar validation - must start with capital letter
  if (!/^[A-Z]/.test(text)) return false;
  
  // Check for grammar fragments
  if (/(^|\s)a\s+[aeiou]/i.test(text)) return false; // "a experience" -> should be "an"
  if (/\bi'm\b/i.test(text)) return false; // should be "I'm"
  
  // Rating-specific validation
  const lowerText = text.toLowerCase();
  
  switch (rating) {
    case "G":
      // No profanity allowed
      const profanityWords = ['damn', 'hell', 'crap', 'fuck', 'shit', 'ass', 'bitch'];
      if (profanityWords.some(word => lowerText.includes(word))) return false;
      if (/(sex|sexual|nsfw|kinky|horny|naked)/i.test(text)) return false;
      break;
      
    case "PG-13":
      // Must have mild profanity OR clever innuendo OR sharp attitude
      const mildProfanity = ['damn', 'hell', 'crap', 'suck', 'screw'];
      const hasMildProfanity = mildProfanity.some(word => lowerText.includes(word));
      const hasAttitude = /(savage|roast|burn|destroy|wreck|brutal|harsh|bite|edge)/i.test(text);
      const hasInnuendo = /(bang|screw|hard|stiff|wet|tight|comes|climax)/i.test(text);
      if (!hasMildProfanity && !hasAttitude && !hasInnuendo) return false;
      break;
      
    case "R":
      // Must have strong profanity OR explicit sexual terms OR extremely brutal content
      const strongProfanity = ['fuck', 'shit', 'ass', 'bitch', 'bastard', 'prick'];
      const hasStrong = strongProfanity.some(word => lowerText.includes(word));
      const hasExplicitTermR = ['sex', 'sexual', 'orgasm', 'kinky', 'horny', 'naked', 'penetrat', 'aroused', 'erection'].some(term => lowerText.includes(term));
      const hasBrutalContent = /(fucking|shitting|bitching|savage|brutal|destroy|annihilate|murder)/i.test(text);
      if (!hasStrong && !hasExplicitTermR && !hasBrutalContent) return false;
      break;
      
    case "Explicit":
      // Must have explicit sexual content OR extreme profanity OR graphic descriptions
      const explicitTerms = ['sex', 'sexual', 'orgasm', 'kinky', 'horny', 'naked', 'penetrat', 'aroused', 'erection', 'masturbat', 'climax', 'cumming'];
      const extremeProfanity = ['fuck', 'shit', 'ass', 'bitch', 'cunt', 'cock', 'pussy', 'dick'];
      const hasExplicit = explicitTerms.some(term => lowerText.includes(term));
      const hasExtremeProfanity = extremeProfanity.some(word => lowerText.includes(word));
      const hasGraphicContent = /(fucking|sucking|licking|penetrating|thrusting|moaning)/i.test(text);
      if (!hasExplicit && !hasExtremeProfanity && !hasGraphicContent) return false;
      break;
  }
  
  return true;
}

export function validateHardTagsInBatch(jokes: string[], hardTags: string[]): boolean {
  if (hardTags.length === 0) return true;
  
  // Count how many jokes contain all hard tags
  const jokesWithAllTags = jokes.filter(joke => 
    hardTags.every(tag => joke.toLowerCase().includes(tag.toLowerCase()))
  ).length;
  
  // Require at least 3 of 4 jokes to contain hard tags
  return jokesWithAllTags >= 3;
}

// Context lexicon enforcement
const CONTEXT_LEXICONS = {
  "soccer practice": ["pitch", "keeper", "goal", "boot", "practice", "drill", "field", "ball"],
  "thanksgiving": ["turkey", "gravy", "pie", "table", "toast", "leftovers", "cranberry", "family", "stuffing"],
  "birthday": ["cake", "candles", "party", "wish", "balloons", "celebrate"],
  "christmas": ["christmas", "tree", "presents", "santa", "holiday", "celebration", "gifts"]
};

function isPunchlineFirst(s: string): boolean {
  return /^(spoiler first then|plot twist first then|fine first then|zero first then)/i.test(s) || /\b first then \b/i.test(s);
}

function hasRomanticTone(s: string): boolean {
  return /(love|heart|warm|dear|sweet|admire|tender)/i.test(s);
}

function hasContextWords(s: string, context: string): boolean {
  const contextKey = context.toLowerCase();
  for (const [key, words] of Object.entries(CONTEXT_LEXICONS)) {
    if (contextKey.includes(key)) {
      return words.some(w => s.toLowerCase().includes(w));
    }
  }
  return true; // If no specific lexicon, pass validation
}

function formatOK(s: string): boolean {
  return /^[A-Z]/.test(s) && 
         !/,|—/.test(s) && 
         (s.match(/\./g) || []).length === 1 && 
         s.length >= 40 && s.length <= 100;
}

export function enforceContextAndTone(text: string, context: string, tone: string, style: string): string {
  let result = text.trim().replace(/\s+\./g, ".");
  
  // Enforce punchline-first style
  const isPunchlineStyle = style === 'punchline-first';
  if (isPunchlineStyle && !isPunchlineFirst(result)) {
    result = "Spoiler first then " + result[0].toLowerCase() + result.slice(1);
  }
  
  // Add context words if missing
  if (!hasContextWords(result, context)) {
    const contextKey = context.toLowerCase();
    if (contextKey.includes('soccer')) {
      result = result.replace(/\.$/, " on the pitch.");
    } else if (contextKey.includes('thanksgiving')) {
      result = result.replace(/\.$/, " at the table.");
    } else if (contextKey.includes('birthday')) {
      result = result.replace(/\.$/, " at the party.");
    } else if (contextKey.includes('christmas')) {
      result = result.replace(/\.$/, " for the holidays.");
    }
  }
  
  // Add romantic tone if needed
  if (tone.toLowerCase() === 'romantic' && !hasRomanticTone(result)) {
    result = result.replace(/\.$/, " and my heart knows it.");
  }
  
  // Clean up grammar
  result = result.replace(/\.$/, ".").replace(/^[a-z]/, m => m.toUpperCase());
  
  return result;
}

export function validateRomanticTone(text: string, context: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Ban profanity for romantic tone
  const profanityWords = ['damn', 'hell', 'crap', 'fuck', 'shit', 'ass', 'bitch'];
  if (profanityWords.some(word => lowerText.includes(word))) return false;
  
  // Require affectionate language
  const affectionWords = ['love', 'adore', 'heart', 'warm', 'sweet', 'tender', 'cherish', 'treasure'];
  const hasAffection = affectionWords.some(word => lowerText.includes(word));
  
  // Check for birthday context words if it's a birthday context
  if (lowerContext.includes('birthday')) {
    const birthdayWords = ['cake', 'candles', 'party', 'wish', 'balloons', 'celebrate'];
    const hasBirthdayContext = birthdayWords.some(word => lowerText.includes(word));
    return hasAffection || hasBirthdayContext;
  }
  
  return hasAffection;
}