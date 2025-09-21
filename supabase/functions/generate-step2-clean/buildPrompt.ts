import { ParsedTags } from "./tags.ts";

export function buildPrompt(ctx: {
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