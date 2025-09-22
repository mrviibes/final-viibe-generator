import { ParsedTags } from "./tags.ts";
import { selectComedianVoiceV3, getVoiceInstructionsV3 } from "../shared/viibe_config_v3.ts";
import { selectFreshPopCultureEntity, formatEntityForJoke, isPopCultureRequiredForStyle } from "../shared/popCultureV3.ts";

export function buildPrompt(input: {
  category: string; subcategory: string; tone: string; style: string;
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: { hard: string[]; soft: string[] };
  minLen: number; maxLen: number; simplified?: boolean; voiceHint?: string;
  requestMultiple?: boolean;
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

  // Build prompt based on request type
  if (input.requestMultiple) {
    // Request multiple jokes in one call for better consistency
    // Use clean subcategory as context, NEVER as literal text
    let prompt = `Write 4 ${input.style} jokes about ${input.subcategory.toLowerCase()} celebrations. `;
    prompt += `Context: This is about ${input.subcategory.toLowerCase()} events (part of ${input.category}). `;
    prompt += `Each joke: ${input.minLen}-${input.maxLen} characters, ${input.tone} tone, ${input.rating} rating. `;
    prompt += `Format: One joke per line, numbered 1-4. Do NOT include category names in the joke text. `;
    
    // Add category-specific lexicon requirements
    if (input.subcategory.toLowerCase().includes('birthday')) {
      prompt += `REQUIRED: Each joke must include at least one birthday word: cake, candles, balloons, party, wish, celebrate. `;
    }
    
    if (hard !== "none") {
      prompt += `REQUIRED: Include "${hard}" in each joke naturally. `;
    }
    
    prompt += voiceInstructions;
    
    // Add pop culture if needed
    if (popCultureEntity) {
      prompt += ` Reference: ${popCultureEntity}.`;
    }
    
    prompt += `\n\nExample format:\n1. [joke with ${hard}]\n2. [joke with ${hard}]\n3. [joke with ${hard}]\n4. [joke with ${hard}]`;
    prompt += `\n\nDO NOT start jokes with category names like "Celebrations >" or "Birthday >".`;
    
    return prompt;
  } else {
    // Single joke request (fallback)
    // Use clean subcategory as context, NEVER as literal text
    let prompt = `Write one ${input.style} joke about ${input.subcategory.toLowerCase()} celebrations. `;
    prompt += `Context: This is about ${input.subcategory.toLowerCase()} events (part of ${input.category}). `;
    prompt += `${input.minLen}-${input.maxLen} characters. ${input.tone} tone. ${input.rating} rating. `;
    prompt += `Do NOT include category names in the joke text. `;
    
    // Add category-specific lexicon requirements
    if (input.subcategory.toLowerCase().includes('birthday')) {
      prompt += `Include at least one birthday word: cake, candles, balloons, party, wish, celebrate. `;
    }
    
    if (hard !== "none") {
      prompt += `Include: ${hard}. `;
    }
    
    prompt += voiceInstructions;

    // Add pop culture if needed
    if (popCultureEntity) {
      prompt += ` Reference: ${popCultureEntity}.`;
    }
    
    return prompt;
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