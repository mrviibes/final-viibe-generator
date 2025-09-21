// Multi-rating comedy generator with comedian voice assignment
import { ParsedTags } from "./tags.ts";

export interface RatingResult {
  voice: string;
  text: string;
}

export interface MultiRatingOutput {
  G: RatingResult;
  "PG-13": RatingResult;
  R: RatingResult;
  Explicit: RatingResult;
}

// Rating-specific comedian voice banks
const COMEDIAN_VOICE_BANKS = {
  G: [
    { name: "Jim Gaffigan", style: "Clean observational, family-safe wordplay" },
    { name: "Nate Bargatze", style: "Innocent storytelling, wholesome confusion" },
    { name: "Ellen DeGeneres", style: "Gentle teasing, relatable daily observations" }
  ],
  "PG-13": [
    { name: "Kevin Hart", style: "High-energy panic, mild profanity (damn/hell)" },
    { name: "Trevor Noah", style: "Smart observations with light edge" },
    { name: "Ali Wong", style: "Honest sass with controlled attitude" }
  ],
  R: [
    { name: "Bill Burr", style: "Strong profanity, adult themes, ranty energy" },
    { name: "Chris Rock", style: "Sharp social commentary with f-bombs" },
    { name: "Wanda Sykes", style: "Brutal honesty with adult language" }
  ],
  Explicit: [
    { name: "Sarah Silverman", style: "Raunchy innuendo tied to premise" },
    { name: "Joan Rivers", style: "Savage sexual references and shock value" },
    { name: "Amy Schumer", style: "Explicit sexual comedy, no filter" }
  ]
} as const;

export function selectComedianForRating(rating: string): { name: string; style: string } {
  const bank = COMEDIAN_VOICE_BANKS[rating as keyof typeof COMEDIAN_VOICE_BANKS] || COMEDIAN_VOICE_BANKS["PG-13"];
  const randomIndex = Math.floor(Math.random() * bank.length);
  return bank[randomIndex];
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
    G: "Family-friendly humor only. No profanity, innuendo, or targeting individuals. Wholesome and light.",
    "PG-13": "Sharp roasts with real bite. MUST include mild profanity (damn, hell, crap) OR clever innuendo OR savage attitude. Get edgy.",
    R: "Go hard. MUST include strong profanity (fuck, shit, ass, bitch), brutal roasts, sexual references, or nasty commentary. No holding back.",
    Explicit: "Full NSFW mode. Explicit sexual content, brutal profanity, savage personal attacks, dark humor. Absolutely ruthless and dirty."
  };

  const hardTagsStr = tags.hard.length ? tags.hard.join(", ") : "none";
  const softTagsStr = tags.soft.length ? tags.soft.slice(0, 6).join(" | ") : "none";

  return [
    "Return one sentence. 40–100 characters. One period. No em dashes.",
    `Write a real joke in ${style} style. Sound like ${comedian.name}.`,
    `Context: ${context}. Keep it visibly about that context.`,
    `Rating: ${rating} - ${ratingInstructions[rating as keyof typeof ratingInstructions]}`,
    `Comedian style: ${comedian.style}`,
    `Tone: ${tone}`,
    hardTagsStr !== "none" ? `Hard tags: ${hardTagsStr} must appear literally.` : "Hard tags: none",
    softTagsStr !== "none" ? `Themes: ${softTagsStr} (guide tone only, do not appear verbatim)` : "Themes: none"
  ].join("\n");
}

export function validateRatingJoke(text: string, rating: string, tags: ParsedTags): boolean {
  // Basic format validation
  const charCount = text.length;
  if (charCount < 40 || charCount > 100) return false;
  
  const periodCount = (text.match(/\./g) || []).length;
  if (periodCount !== 1) return false;
  
  if (text.includes('—')) return false;
  
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
      // Must have mild profanity OR clever innuendo
      const mildProfanity = ['damn', 'hell', 'crap'];
      const hasMildProfanity = mildProfanity.some(word => lowerText.includes(word));
      const hasAttitude = /(savage|roast|burn|destroy|wreck)/i.test(text);
      if (!hasMildProfanity && !hasAttitude) return false;
      break;
      
    case "R":
      // Must have strong profanity
      const strongProfanity = ['fuck', 'shit', 'ass', 'bitch'];
      if (!strongProfanity.some(word => lowerText.includes(word))) return false;
      break;
      
    case "Explicit":
      // Must have sexual innuendo or explicit content
      const explicitTerms = ['sex', 'sexual', 'orgasm', 'kinky', 'horny', 'naked', 'screw', 'bang'];
      const hasExplicit = explicitTerms.some(term => lowerText.includes(term));
      const strongProfanityPresent = ['fuck', 'shit', 'ass', 'bitch'].some(word => lowerText.includes(word));
      if (!hasExplicit && !strongProfanityPresent) return false;
      break;
  }
  
  // Hard tag validation - at least 3 of 4 ratings should include hard tags
  if (tags.hard.length > 0) {
    const hasHardTags = tags.hard.some(tag => 
      lowerText.includes(tag.toLowerCase())
    );
    // For now, just check if hard tags are present (upstream will validate 3/4 rule)
    if (!hasHardTags) return false;
  }
  
  return true;
}