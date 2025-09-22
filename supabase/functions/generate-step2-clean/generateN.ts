import { buildPrompt } from "./buildPrompt.ts";
import { ParsedTags } from "./tags.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MODEL = 'gpt-4.1-2025-04-14';

type Ctx = {
  category: string;
  subcategory: string;
  tone: "Humorous"|"Savage"|"Playful"|"Romantic"|"Sentimental";
  style: "punchline-first"|"story"|"pop-culture"|"wildcard";
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: ParsedTags;
};

const BUCKETS: Array<[number, number]> = [
  [40,60],
  [61,80], 
  [81,100],
];

function pickBucket(): [number,number] {
  return BUCKETS[Math.floor(Math.random()*BUCKETS.length)];
}

function enforceHardTagFront(s: string, hard: string[], forceFront: boolean): string {
  if (!hard.length) return s;
  const tag = hard[0]; // first hard tag
  const has = s.toLowerCase().includes(tag.toLowerCase());
  if (!has) s = `${tag} ${s[0].toLowerCase()}${s.slice(1)}`;
  if (forceFront && !s.toLowerCase().startsWith(tag.toLowerCase()))
    s = `${tag} ${s[0].toLowerCase()}${s.slice(1)}`;
  return s;
}

const BDAY = ["cake","candles","party","balloons","wish","slice"];
function ensureBirthdayLexicon(s: string): string {
  return BDAY.some(w=>s.toLowerCase().includes(w))
    ? s
    : s.replace(/\.$/, " over the cake.");
}

export async function generateN(ctx: Ctx, n: number): Promise<string[]> {
  const outs: string[] = [];
  const used = new Set<string>(); // avoid exact dupes

  for (let i=0; i<n; i++) {
    const [minLen, maxLen] = pickBucket();
    const prompt = buildPrompt({ ...ctx, minLen, maxLen });
    const res = await callModel(prompt);

    let lines = res.text
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    // allow model to return 1 or many; we keep first usable
    let best = lines.find(s => s.length>=minLen && s.length<=maxLen) ?? lines[0] ?? "";

    // sanitize soft tags, enforce context and style, validate
    best = stripSoftEcho([best], ctx.tags.soft)[0];
    best = enforceBirthdayLine(best, ctx.tags.hard, minLen, maxLen, i); // birthday enforcement with hard tags

    if (!formatOK(best) || used.has(best)) {
      // one retry with shorter prompt
      const prompt2 = buildPrompt({ ...ctx, minLen, maxLen, simplified: true });
      const res2 = await callModel(prompt2);
      const alt = res2.text.split("\n").map(s=>s.trim()).find(s => s.length>=minLen && s.length<=maxLen) ?? "";
      let cleaned = stripSoftEcho([alt], ctx.tags.soft)[0];
      cleaned = enforceBirthdayLine(cleaned, ctx.tags.hard, minLen, maxLen, i);
      if (formatOK(cleaned) && !used.has(cleaned)) {
        best = cleaned;
      }
    }

    outs.push(best);
    used.add(best);
  }

  return outs;
}

async function callModel(prompt: string): Promise<{ text: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a professional comedian. Return exactly the requested jokes.' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 150
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  
  return { text };
}

function stripSoftEcho(lines: string[], softTags: string[]): string[] {
  return lines.map(line => {
    let cleaned = line;
    softTags.forEach(tag => {
      const regex = new RegExp(`\\b${tag}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    return cleaned.replace(/\s+/g, ' ').trim();
  });
}

function formatOKWithLength(s: string, lo: number, hi: number): boolean {
  return /^[A-Z]/.test(s)
    && !/,|—/.test(s)
    && (s.match(/\./g)||[]).length===1
    && s.length>=lo && s.length<=hi;
}

export function formatOK(s: string) {
  return formatOKWithLength(s, 40, 100);
}

function ensuredPeriod(s: string) { return s.replace(/\.+$/,"") + "."; }

function ensurePunchFirst(s: string) {
  const ok = / first then /i.test(s) || /^(spoiler|plot twist|fine|zero) first then /i.test(s);
  return ok ? s : `Spoiler first then ${s[0].toLowerCase()}${s.slice(1)}`;
}

function ensureRomantic(s: string) {
  const has = /(love|heart|warm|dear|sweet|admire|tender)/i.test(s);
  return has ? s : s.replace(/\.$/, " and my heart knows it.");
}

function ensureThanksgiving(s: string) {
  const THANKS = ["turkey","gravy","pie","table","toast","leftovers","cranberry","family","stuffing"];
  const hit = THANKS.some(w => s.toLowerCase().includes(w));
  return hit ? s : s.replace(/\.$/, " at the table.");
}

function ensureLexicon(s: string, category: string, sub: string) {
  const LEX: Record<string,string[]> = {
    "Soccer practice":["pitch","keeper","goal","drill","boot","practice"],
    "Basketball":["court","hoop","dribble","rebound","buzzer","layup"],
    "Work emails":["inbox","subject","cc","bcc","reply all","signature"],
    "Birthday":["cake","candles","party","wish","balloons","slice"],
  };
  const words = LEX[sub] ?? LEX[category] ?? [];
  const hit = words.some(w => s.toLowerCase().includes(w));
  return hit && words.length ? s : (words.length ? s.replace(/\.$/," " + words[0] + ".") : s);
}

// main post-process for Birthday enforcement 
function enforceBirthdayLine(s: string, hard: string[], lo: number, hi: number, i: number): string {
  s = ensureBirthdayLexicon(s);                       // add birthday word if missing
  s = enforceHardTagFront(s, hard, i % 2 === 0);      // start with tag on 1st/3rd lines
  s = s.replace(/\s+\./g,".").replace(/^[a-z]/,m=>m.toUpperCase());
  if (!formatOKWithLength(s, lo, hi)) s = s.slice(0, Math.max(lo, Math.min(hi, s.length-1))).replace(/\.$/,"") + ".";
  return s;
}

export function enforceContextToneStyle(s: string, ctx: {
  category: string; subcategory: string; tone: string; style: string;
}) {
  let out = s.trim().replace(/\s+\./g,".");
  if (ctx.style === "punchline-first") out = ensurePunchFirst(out);
  if (ctx.category === "Celebrations" && /Thanksgiving/i.test(ctx.subcategory) && ctx.tone === "Romantic") {
    out = ensureThanksgiving(out);
    out = ensureRomantic(out);
  }
  out = ensureLexicon(out, ctx.category, ctx.subcategory);
  out = ensuredPeriod(out).replace(/^[a-z]/, m => m.toUpperCase());
  return out;
}
