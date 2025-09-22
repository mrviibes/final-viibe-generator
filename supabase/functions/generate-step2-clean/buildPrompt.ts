import { ParsedTags } from "./tags.ts";
import { selectComedianVoiceV3, getVoiceInstructionsV3 } from "../shared/viibe_config_v3.ts";
import { selectFreshPopCultureEntity, formatEntityForJoke, isPopCultureRequiredForStyle } from "../shared/popCultureV3.ts";

// Minimal prompt builder for maximum reliability
export function buildPrompt(input: {
  category: string; subcategory: string; tone: string; style: string;
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: { hard: string[]; soft: string[] };
  minLen: number; maxLen: number; simplified?: boolean; voiceHint?: string;
  requestMultiple?: boolean;
}) {
  const hard = input.tags.hard.join(", ") || "none";

  // Ultra-minimal system message for reliability
  if (input.requestMultiple) {
    return `Return 4 jokes. One sentence each. 40-100 chars. One period. No commas or em dashes. Topic must include a birthday word (cake, candles, balloons, party, wish).
Hard tags (must appear literally): ${hard}.`;
  } else {
    return `Return 1 joke. One sentence. 40-100 chars. One period. No commas or em dashes. Topic must include a birthday word (cake, candles, balloons, party, wish).
Hard tags (must appear literally): ${hard}.`;
  }
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