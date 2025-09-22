import { ParsedTags } from "./tags.ts";
import { selectComedianVoiceV3, getVoiceInstructionsV3 } from "../shared/viibe_config_v3.ts";
import { selectFreshPopCultureEntity, formatEntityForJoke, isPopCultureRequiredForStyle } from "../shared/popCultureV3.ts";

export function buildPrompt(input: {
  category: string; subcategory: string; tone: string; style: string;
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: { hard: string[]; soft: string[] };
  minLen: number; maxLen: number; simplified?: boolean; voiceHint?: string;
}) {
  const themes = input.tags.soft.slice(0,5).join(" | ") || "none";
  const hard = input.tags.hard.join(", ") || "none";

  // Select comedian voice for this line
  const comedianVoice = selectComedianVoiceV3(input.rating);
  const voiceInstructions = getVoiceInstructionsV3(comedianVoice);

  // Get pop culture entity if needed
  let popCultureEntity = "";
  if (isPopCultureRequiredForStyle(input.style)) {
    const entity = selectFreshPopCultureEntity();
    if (entity) {
      popCultureEntity = formatEntityForJoke(entity);
    }
  }

  // Tone-specific enforcement
  const toneInstructions = getToneInstructions(input.tone);
  
  const lines = [
    `Return one sentence only. Length ${input.minLen}-${input.maxLen} characters. One period.`,
    "No commas. No em dashes.",
    `Write a real joke in ${input.style}. Keep it clearly about ${input.category} > ${input.subcategory}.`,
    "CRITICAL: Sound like a comedian on stage, not AI writing. Use natural conversational delivery.",
    input.voiceHint || voiceInstructions,
    "STRUCTURE: Write a complete one-sentence joke with natural comedian rhythm and clear punchline.",
    toneInstructions,
    `Rating ${input.rating}:`,
    "G: clean wholesome humor.",
    "PG-13: allow damn or hell only, mild edge appropriate for teens.",
    "R: allow fuck or shit but no sexual content, adult language only.",
    "Explicit: include a raunchy innuendo tied to context.",
    `Hard tags appear literally: ${hard}.`,
    `Soft tags guide tone only: ${themes}. Do not echo soft tags.`,
    "CRITICAL: Complete the sentence fully. No fragments ending with incomplete thoughts.",
  ];

  // Add pop culture instruction if entity selected
  if (popCultureEntity) {
    lines.push(`Include fresh reference to: ${popCultureEntity}.`);
  }
  
  // Add category-specific lexicon requirements
  const categoryInstructions = getCategoryInstructions(input.category, input.subcategory, input.tone);
  if (categoryInstructions) {
    lines.push(categoryInstructions);
  }
  
  if (/Thanksgiving/i.test(input.subcategory)) {
    lines.push("Use at least one of: turkey, gravy, pie, table, toast, leftovers, cranberry, family, stuffing.");
  }
  if (input.simplified) {
    lines.unshift("Be concise.");
  }

  return lines.join("\n");
}

// Get tone-specific instructions
function getToneInstructions(tone: string): string {
  const toneMap: { [key: string]: string } = {
    "Inspirational": "TONE: Inspirational means uplifting, hopeful, motivational. Use positive words like: believe, rise, stronger, heart, fight, dream, overcome, achieve. AVOID sarcasm, roasting, or negative humor.",
    "Playful": "TONE: Playful means cheerful, lively, mischievous fun. Use words like: silly, ridiculous, goofy, funny, hilarious.",
    "Serious": "TONE: Serious means respectful, formal, matter-of-fact. Avoid overly silly language.",
    "Savage": "TONE: Savage means bold, edgy, roasting humor with sharp wit.",
    "Sarcastic": "TONE: Sarcastic means witty, ironic, with subtle mockery.",
  };
  
  return toneMap[tone] || `TONE: Match the ${tone} tone appropriately.`;
}

// Get category-specific instructions
function getCategoryInstructions(category: string, subcategory: string, tone: string): string | null {
  if (category === "Sports" && subcategory === "American Football" && tone === "Inspirational") {
    return "REQUIRED: Include one football word (team, field, goal, yard, coach, quarterback, touchdown, plays) AND one uplifting word (believe, rise, stronger, heart, fight, dream, overcome).";
  }
  
  if (category === "Celebrations" && subcategory === "Birthday") {
    return "Use at least one of: birthday, cake, candles, balloons, party, wish, celebrate, age.";
  }
  
  return null;
}

// Legacy function for compatibility
export function buildPromptLegacy(ctx: {
  context: string; tone: string; rating: string; style: string; tags: ParsedTags;
}) {
  const hardTags = ctx.tags.hard.slice(0, 3);
  const softTags = ctx.tags.soft.slice(0, 4);
  
  // Build tag enforcement requirements
  const tagRequirements = [];
  if (hardTags.length > 0) {
    tagRequirements.push(`REQUIRED: Include explicit reference to at least one of: [${hardTags.join(", ")}]`);
    tagRequirements.push(`Preserve capitalization for proper nouns (names, places).`);
  }
  
  return [
    "Return 4 one sentence jokes. One period. No em dashes. 40 to 100 chars.",
    "Use the selected structure. Follow rating guidelines strictly.",
    ...tagRequirements,
    `Context: ${ctx.context}`,
    `Tone: ${ctx.tone}. Rating: ${ctx.rating}. Style: ${ctx.style}.`,
    hardTags.length ? `MUST include: ${hardTags.join(", ")}` : "",
    softTags.length ? `Themes for guidance: ${softTags.join(" | ")}` : ""
  ].filter(Boolean).join("\n");
}