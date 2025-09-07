/* =========================================================
   VIIBE CORE – fresh minimal engine for Steps 1–4
   - Small, readable, and safe to extend
   - Uses gpt-4.1-mini by default (lean JSON prompts)
   - Deterministic fallbacks so UI never breaks
   ========================================================= */

import { openAIService } from "@/lib/openai";

export const MODELS = {
  text: "gpt-4.1-mini-2025-04-14",
  visual: "gpt-4.1-mini-2025-04-14",
};

const MAX_TEXT_CHARS = 80;           // tweak if you want 100 later

/* -----------------------------
   Layout library (IDs only)
----------------------------- */
export const LAYOUTS = {
  negativeSpace: { type: "negativeSpace" },
  memeTopBottom: {
    type: "memeTopBottom",
    zones: [
      { pos: "top", x: 0, y: 0, w: "100%", h: "18%", align: "center", allCaps: true, stroke: "2px black" },
      { pos: "bottom", x: 0, y: "82%", w: "100%", h: "18%", align: "center", allCaps: true, stroke: "2px black" },
    ],
  },
  lowerThird: { type: "lowerThirdBanner" },
  sideBarLeft: { type: "sideBarLeft" },
  badgeSticker: { type: "badgeStickerCallout" },
  subtleCaption: { type: "subtleCaption" },
};

/* -----------------------------
   Anchors & negatives
----------------------------- */
const ANCHORS: Record<string, string[]> = {
  "celebrations.birthday": ["cake", "candles", "balloons", "confetti", "party hats", "gifts"],
  "sports.hockey": ["ice rink", "stick", "puck", "goal net", "helmets", "locker room"],
  "sports.basketball": ["indoor court", "hoop", "net", "sneakers", "scoreboard", "bench"],
  "daily-life.work commute": ["train", "bus", "subway", "traffic", "coffee", "headphones", "platform"],
  "_celebrations": ["balloons", "confetti", "streamers", "cake"],
  "_sports": ["scoreboard", "jersey", "bench", "crowd"],
  "_daily-life": ["coffee", "phone", "bag", "window light"],
};

const NEGATIVES: Record<string, string> = {
  celebrations: "no background lettering, no banners with words, no signage, no extra text",
  sports: "no laptops, no desks, no coffee mugs, no signage text",
  "daily-life": "no party props, no sports gear, no signage text",
  default: "no watermarks, no logos, no misspellings, no extra text",
};

const SOLO_ACTION: Record<string, string> = {
  birthday: "blowing out candles (smoke visible)",
  hockey: "hard stop with ice spray",
  basketball: "jump shot mid-air",
  "work commute": "walking with coffee through station",
  _default: "interacting with key props in motion",
};

/* -----------------------------
   Minimal session helpers
----------------------------- */
export interface Session {
  category: string;
  subcategory: string;
  entity: string | null;
  contextId: string;
  tone?: string;
  tags?: string[];
}

export function createSession({ category, subcategory, entity }: { category: string; subcategory: string; entity?: string }): Session {
  return {
    category,
    subcategory,
    entity: entity || null,
    contextId: entity ? `${lc(category)}.${lc(subcategory)}.${lc(entity)}` : `${lc(category)}.${lc(subcategory)}`,
  };
}

const lc = (s: string) => String(s || "").toLowerCase();
export const dedupe = (a: (string | undefined)[]): string[] => Array.from(new Set((a || []).filter(Boolean) as string[]));

/* -----------------------------
   OpenAI JSON call (lean)
----------------------------- */
async function llmJSON({ 
  model, 
  system, 
  user, 
  maxTokens = 400, 
  temperature = 0.8 
}: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<any | null> {
  if (!openAIService.hasApiKey()) return null; // no API key -> caller must use fallback
  
  try {
    const result = await openAIService.chatJSON([
      { role: "system", content: system },
      { role: "user", content: user }
    ], {
      temperature,
      max_completion_tokens: maxTokens,
      model
    });
    return result;
  } catch (error) {
    console.error("llmJSON error:", error);
    return null;
  }
}

/* =========================================================
   STEP 2 – TEXT (AI Assist)  -> generate 4 short options
   - tags appear in EVERY line (include subcategory as a tag)
   - ≤ MAX_TEXT_CHARS, human tone, no lane labels
========================================================= */
const SYS_TEXT = `
Return ONLY JSON:
{"lines":[
 {"lane":"platform","text":"..."},
 {"lane":"audience","text":"..."},
 {"lane":"skill","text":"..."},
 {"lane":"absurdity","text":"..."}
]}
Style rules:
- Conversational, punchy, use contractions. No robotic fillers.
- Target lengths: ~48, ~60, ~72, <= ${MAX_TEXT_CHARS}.
- No lane words/prefixes inside text. Only commas/periods/colons (no em-dash / --).
- ALL TAGS must appear in EVERY line (case-insensitive).
- Include at least one concrete ANCHOR per line for the subcategory.
- Tone guides style (Humorous/Playful light; Savage roast behavior not identity; Sentimental/Serious respectful).
- Avoid clichés (timing is everything, laughter is the best medicine, truth hurts, etc.).
`;

function userTextPrompt({ category, subcategory, tone, tags, anchors }: {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  anchors: string[];
}) {
  return `Category: ${category}\nSubcategory: ${subcategory}\nTone: ${tone}\nTAGS (must appear in every line): ${tags.join(", ")}\nANCHORS (use at least one each line): ${anchors.join(", ")}\nGenerate JSON now.`;
}

function validateText(lines: any[], { tags, anchors }: { tags: string[]; anchors: string[] }): Array<{ lane: string; text: string }> | null {
  if (!Array.isArray(lines) || lines.length !== 4) return null;
  const lanes = ["platform", "audience", "skill", "absurdity"];
  const cleaned = lines.map((L, i) => {
    let txt = String(L?.text || "").replace(/^\s*(platform|audience|skill|absurdity|skillability)\s*:\s*/i, "").trim();
    if (!txt) return null;
    const low = txt.toLowerCase();
    // must contain at least one anchor
    if (!anchors.some(a => low.includes(a.toLowerCase()))) return null;
    // enforce all tags
    for (const t of tags) if (!low.includes(String(t).toLowerCase())) txt += `, ${t}`;
    txt = txt.replace(/[—–]|--/g, ":").trim();
    if (txt.length > MAX_TEXT_CHARS) txt = txt.slice(0, MAX_TEXT_CHARS).trim();
    return { lane: lanes[i], text: txt };
  });
  return cleaned.every(Boolean) ? (cleaned as Array<{ lane: string; text: string }>) : null;
}

// deterministic local fallback (keeps tags/anchors)
function textFallback({ subcategory, tone, tags, anchors }: {
  subcategory: string;
  tone: string;
  tags: string[];
  anchors: string[];
}): Array<{ lane: string; text: string }> {
  const name = tags.find(t => /^[a-z][a-z\s.'-]{1,24}$/i.test(t)) || (tags[0] || "Friend");
  const a = anchors[0] || "cake", b = anchors[1] || "balloons";
  const roast = lc(tone) === "savage";
  const lines = [
    roast ? `${name} makes the ${a} nervous.` : `${name} and the ${a} steal the scene.`,
    roast ? `Guests breathe again when ${name} stops touching the ${b}.` : `The room warms up—${name} near the ${b}.`,
    roast ? `${name} tries one breath; half the ${a} survive.` : `${name} tries one breath; the ${a} play along.`,
    roast ? `Even the ${b} flinch when ${name} leads.` : `Even the ${b} look amazed for a beat.`
  ].map(s => {
    let out = s;
    const low = out.toLowerCase();
    for (const t of tags) if (!low.includes(String(t).toLowerCase())) out += ` ${t}`;
    if (!out.toLowerCase().includes(subcategory.toLowerCase())) out += ` ${subcategory}`;
    if (out.length > MAX_TEXT_CHARS) out = out.slice(0, MAX_TEXT_CHARS).trim();
    return out;
  });
  return [
    { lane: "platform", text: lines[0] },
    { lane: "audience", text: lines[1] },
    { lane: "skill", text: lines[2] },
    { lane: "absurdity", text: lines[3] },
  ];
}

export async function generateTextOptions(session: Session, { tone, tags = [] }: { tone: string; tags?: string[] }): Promise<Array<{ lane: string; text: string }>> {
  const { category, subcategory } = session;
  const anchors = (ANCHORS[session.contextId] || ANCHORS[`${lc(category)}.${lc(subcategory).split(" ")[0]}`] ||
                   ANCHORS[`_${lc(category)}`] || ["props"]).slice(0, 6);
  const tagsAll = dedupe([lc(subcategory), ...tags]); // force topic tag
  const json = await llmJSON({
    model: MODELS.text,
    system: SYS_TEXT,
    user: userTextPrompt({ category, subcategory, tone, tags: tagsAll, anchors }),
    maxTokens: 240,
    temperature: 0.8
  });
  const fixed = json ? validateText(json.lines, { tags: tagsAll, anchors }) : null;
  return fixed || textFallback({ subcategory, tone, tags: tagsAll, anchors });
}

/* =========================================================
   STEP 3 – VISUALS (AI Assist) -> 4 lanes + negatives
   (style applied later; no style words here)
========================================================= */
const SYS_VIS = `
Return ONLY JSON:
{
  "visualOptions":[
    {"lane":"objects","prompt":"..."},
    {"lane":"group","prompt":"..."},
    {"lane":"solo","prompt":"..."},
    {"lane":"creative","prompt":"..."}
  ],
  "negativePrompt":"..."
}
Rules:
- objects = props/environment only (no people).
- group   = multiple people, candid gestures.
- solo    = ONE person doing an action (clear verb/cue).
- creative= symbolic/abstract arrangement, bold perspective.
- Use ALL tags in EVERY lane. Vary emphasis so lanes feel different.
- If tag is clothing -> apply to solo/group. Activity tags -> action in solo/group; props in objects/creative.
- Keep each prompt <= 300 chars.
- Do NOT include style words (realistic, anime, 3D); style is applied later.
`;

function userVisPrompt({ category, subcategory, tone, tags, anchors, negatives, soloAction }: {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  anchors: string[];
  negatives: string;
  soloAction: string;
}) {
  return `Category: ${category}\nSubcategory: ${subcategory}\nTone: ${tone}\nTags: ${tags.join(", ")}\nAnchors: ${anchors.join(", ")}\nSoloAction: ${soloAction}\nFor negativePrompt include: ${negatives}.`;
}

function validateVisual(json: any): { visualOptions: Array<{ lane: string; prompt: string }>; negativePrompt: string } | null {
  if (!json?.visualOptions || json.visualOptions.length !== 4) return null;
  const map = Object.fromEntries(json.visualOptions.map((v: any) => [v.lane, v.prompt || ""]));
  if (!map.objects || /\b(person|people|man|woman|crowd)\b/i.test(map.objects)) return null;
  if (!map.group || !/\b(people|friends|team|crowd|group)\b/i.test(map.group)) return null;
  if (!map.solo || !/\b(one|single)\b/i.test(map.solo)) return null;
  if (!map.creative || !/\b(symbolic|abstract|arrangement|metaphor)\b/i.test(map.creative)) return null;
  const neg = json.negativePrompt || "";
  return { visualOptions: json.visualOptions, negativePrompt: neg || NEGATIVES.default };
}

function visFallback({ category, subcategory, tags, anchors }: {
  category: string;
  subcategory: string;
  tags: string[];
  anchors: string[];
}): { visualOptions: Array<{ lane: string; prompt: string }>; negativePrompt: string; model: string } {
  const a = anchors[0] || "cake", b = anchors[1] || "balloons";
  return {
    visualOptions: [
      { lane: "objects", prompt: `Close-up of ${a} and ${b} arranged with clear empty area for headline, ${tags.join(", ")}.` },
      { lane: "group", prompt: `Friends around ${a}, candid gestures and laughter, ${tags.join(", ")}.` },
      { lane: "solo", prompt: `One person ${SOLO_ACTION[lc(subcategory)] || SOLO_ACTION._default}; motion cue visible, ${tags.join(", ")}.` },
      { lane: "creative", prompt: `Symbolic abstract arrangement of ${a} and ${b}, unexpected perspective, ${tags.join(", ")}.` }
    ],
    negativePrompt: (NEGATIVES[lc(category)] || NEGATIVES.default),
    model: "fallback"
  };
}

export async function generateVisualOptions(session: Session, { tone, tags = [] }: { tone: string; tags?: string[] }): Promise<{
  visualOptions: Array<{ lane: string; prompt: string }>;
  negativePrompt: string;
  model: string;
}> {
  const { category, subcategory } = session;
  const anchors = (ANCHORS[session.contextId] || ANCHORS[`_${lc(category)}`] || ["props"]).slice(0, 6);
  const negatives = (NEGATIVES[lc(category)] || NEGATIVES.default);
  const soloAction = (SOLO_ACTION[lc(subcategory)] || SOLO_ACTION._default);
  const tagsAll = dedupe([lc(subcategory), ...tags]);
  const json = await llmJSON({
    model: MODELS.visual,
    system: SYS_VIS,
    user: userVisPrompt({ category, subcategory, tone, tags: tagsAll, anchors, negatives, soloAction }),
    maxTokens: 520,
    temperature: 0.7
  });
  const fixed = json ? validateVisual(json) : null;
  if (fixed) {
    return { ...fixed, model: MODELS.visual };
  }
  return visFallback({ category, subcategory, tags: tagsAll, anchors });
}

/* =========================================================
   STEP 4 – Final payload composer (for renderer/Ideogram)
========================================================= */
export function composeFinalPayload({
  session, textContent = "", textLayoutId = "negativeSpace",
  visualStyle = "realistic", chosenVisual, negativePrompt,
  dimensions = "square"
}: {
  session: Session;
  textContent?: string;
  textLayoutId?: string;
  visualStyle?: string;
  chosenVisual?: { prompt: string };
  negativePrompt?: string;
  dimensions?: string;
}) {
  return {
    textContent,
    textLayoutSpec: LAYOUTS[textLayoutId as keyof typeof LAYOUTS] || LAYOUTS.negativeSpace,
    visualStyle,                               // apply at render time
    visualPrompt: chosenVisual?.prompt || "",
    negativePrompt: negativePrompt || (NEGATIVES[lc(session.category)] || NEGATIVES.default),
    dimensions,
    contextId: session.contextId,
    tone: session.tone || "",
    tags: session.tags || []
  };
}
