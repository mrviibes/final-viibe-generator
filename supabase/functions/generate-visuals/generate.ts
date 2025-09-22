import { buildPrompt } from "./buildPrompt.ts";
import { callModel } from "./call.ts";
import { toLines, validate } from "./validate.ts";
import { stripSoft } from "./sanitize.ts";
import { PRIMARY_MODEL, FALLBACK_MODEL } from "./model.ts";

// Progressive retry with model transparency - do not loop forever
export async function generateVisuals(input: any, apiKey: string) {
  console.log(`🎨 Starting visual generation with primary model: ${PRIMARY_MODEL}`);
  
  // try 1: GPT-5 primary
  let p1 = buildPrompt(input);
  let r1 = await callModel(p1, apiKey, PRIMARY_MODEL);
  if (r1.ok) {
    let l1 = stripSoft(toLines(r1.text), input.softTags);
    if (validate(l1)) {
      console.log(`✅ Success with ${PRIMARY_MODEL}`);
      return { lines: l1, meta: r1.meta, model: PRIMARY_MODEL };
    } else {
      console.log(`⚠️ ${PRIMARY_MODEL} validation failed`);
    }
  } else {
    console.log(`❌ ${PRIMARY_MODEL} failed: ${r1.error}`);
  }

  // try 2: GPT-5-mini fallback
  console.log(`🔄 Falling back to ${FALLBACK_MODEL}`);
  const simple = { ...input, softTags: [] };
  let p2 = buildPrompt(simple);
  let r2 = await callModel(p2, apiKey, FALLBACK_MODEL);
  if (r2.ok) {
    let l2 = toLines(r2.text);
    if (validate(l2)) {
      console.log(`✅ Success with ${FALLBACK_MODEL}`);
      return { lines: l2, meta: r2.meta, model: FALLBACK_MODEL, simplified: true };
    } else {
      console.log(`⚠️ ${FALLBACK_MODEL} validation failed`);
    }
  } else {
    console.log(`❌ ${FALLBACK_MODEL} failed: ${r2.error}`);
  }

  // emergency template fallback
  console.log(`🚨 Using template fallback`);
  return { lines: fallback(input), fallback: true, model: "template" };
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