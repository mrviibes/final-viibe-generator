import { ParsedTags } from "./tags.ts";
import { selectComedianVoiceV3, getVoiceInstructionsV3 } from "../shared/viibe_config_v3.ts";
import { selectFreshPopCultureEntity, formatEntityForJoke, isPopCultureRequiredForStyle } from "../shared/popCultureV3.ts";

export function buildPrompt(input: {
  category: string; subcategory: string; tone: string; style: string;
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: { hard: string[]; soft: string[] };
  minLen: number; maxLen: number; simplified?: boolean;
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

  const lines = [
    `Return one sentence only. Length ${input.minLen}-${input.maxLen} characters. One period.`,
    "No commas. No em dashes.",
    `Write a real joke in ${input.style}. Keep it clearly about ${input.category} > ${input.subcategory}.`,
    voiceInstructions,
    `Rating ${input.rating}:`,
    "G: clean wholesome humor.",
    "PG-13: allow damn or hell only, mild edge appropriate for teens.",
    "R: allow fuck or shit but no sexual content, adult language only.",
    "Explicit: include a raunchy innuendo tied to context.",
    `Hard tags appear literally: ${hard}.`,
    `Soft tags guide tone only: ${themes}. Do not echo soft tags.`,
  ];

  // Add pop culture instruction if entity selected
  if (popCultureEntity) {
    lines.push(`Include fresh reference to: ${popCultureEntity}.`);
  }
  if (/Thanksgiving/i.test(input.subcategory)) {
    lines.push("Use at least one of: turkey, gravy, pie, table, toast, leftovers, cranberry, family, stuffing.");
  }
  if (input.simplified) {
    lines.unshift("Be concise.");
  }

  return lines.join("\n");
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