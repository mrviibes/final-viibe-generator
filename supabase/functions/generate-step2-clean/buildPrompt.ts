import { ParsedTags } from "./tags.ts";

export function buildPrompt(ctx: {
  context: string; tone: string; rating: string; style: string; tags: ParsedTags;
}) {
  const themes = ctx.tags.soft.slice(0, 6).join(" | ");
  return [
    "Return 4 one sentence jokes. One period. No em dashes. 40 to 100 chars.",
    "Use the selected structure. Inject hard tags exactly.",
    "Soft tags guide tone only. Do not echo soft tags literally.",
    `Context: ${ctx.context}`,
    `Tone: ${ctx.tone}. Rating: ${ctx.rating}. Style: ${ctx.style}.`,
    ctx.tags.hard.length ? `Hard tags: ${ctx.tags.hard.join(", ")}` : "Hard tags: none",
    themes ? `Themes: ${themes}` : "Themes: none"
  ].join("\n");
}