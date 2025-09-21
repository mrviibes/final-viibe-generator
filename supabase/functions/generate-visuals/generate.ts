import { buildPrompt } from "./buildPrompt.ts";
import { callModel } from "./call.ts";
import { toLines, validate } from "./validate.ts";
import { stripSoft } from "./sanitize.ts";

// Progressive retry then emergency fallback - do not loop forever
export async function generateVisuals(input: any, apiKey: string) {
  // try 1
  let p1 = buildPrompt(input);
  let r1 = await callModel(p1, apiKey);
  if (r1.ok) {
    let l1 = stripSoft(toLines(r1.text), input.softTags);
    if (validate(l1)) return { lines: l1, meta: r1.meta };
  }

  // try 2 simplified
  const simple = { ...input, softTags: [] };
  let p2 = buildPrompt(simple);
  let r2 = await callModel(p2, apiKey);
  if (r2.ok) {
    let l2 = toLines(r2.text);
    if (validate(l2)) return { lines: l2, meta: r2.meta, simplified: true };
  }

  // emergency fallback
  return { lines: fallback(input), fallback: true };
}

function fallback(i: any) {
  const kw = i.caption.toLowerCase().split(/\W+/).filter(Boolean).slice(0,5).join(" ");
  const ctx = `${i.category} ${i.sub}`.trim();
  return [
    `Literal scene from "${kw}" with clear subject in ${ctx}.`,
    `Clean ${ctx} setting that fits the caption action.`,
    `Exaggerated version of the action to be funny.`,
    `Absurd reimagining that still references the action.`
  ];
}