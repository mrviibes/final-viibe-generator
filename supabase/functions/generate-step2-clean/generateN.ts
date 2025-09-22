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

const PUNCHLINE_CUES = [
  "Spoiler first then", "Plot twist first then", "Zero defense first then", "Fine first then"
];

const BASKETBALL_LEX = ["hoop","rim","court","dribble","rebound","buzzer","foul","free throw","timeout","screen","turnover","fast break"];

function assignBuckets(n: number = 4): [number,number][] {
  const arr = [...BUCKETS];
  while (arr.length < n) arr.push(BUCKETS[Math.floor(Math.random() * BUCKETS.length)]);
  return arr.slice(0, n);
}

function ensurePunchlineCue(line: string): string {
  // if it already has a cue, keep it but fix spacing
  if (/\bfirst\b/i.test(line)) return line.replace(/\bfirst[, ]*then\b/i, " first then ");
  // otherwise add a random cue
  const cue = PUNCHLINE_CUES[Math.floor(Math.random() * PUNCHLINE_CUES.length)];
  return `${cue} ${line[0].toLowerCase()}${line.slice(1)}`;
}

function completeSentence(line: string, lo: number, hi: number): string {
  let s = line.replace(/[—]/g, " ").replace(/,/g, "").replace(/\s+\./g, ".").trim();
  s = s.endsWith(".") ? s : s + ".";
  
  // fix common cut-offs like "every g." / "Jesse d." / "damn pl."
  s = s.replace(/\b([a-z]{1,2})\.\s*$/i, " game.");
  s = s.replace(/\bpl\.\s*$/i, "play.");
  s = s.replace(/\bd\.\s*$/i, "down.");
  s = s.replace(/\bg\.\s*$/i, "game.");
  
  if (!/[a-z)]\.\s*$/i.test(s)) s = s.replace(/\.\s*$/, " game.");
  s = s.replace(/^\s*[a-z]/, m => m.toUpperCase());
  
  // length adjustments
  if (s.length > hi) s = s.slice(0, hi).replace(/\s+\S*$/, "") + ".";
  if (s.length < lo) s = s.replace(/\.\s*$/, " on the court.");
  
  return s;
}

function diversifyLexicon(lines: string[]): string[] {
  const pool = [...BASKETBALL_LEX];
  return lines.map((l, i) => {
    const hasLex = BASKETBALL_LEX.some(w => l.toLowerCase().includes(w));
    if (hasLex) return l;
    const w = pool[i % pool.length];
    return l.replace(/\.\s*$/, " " + w + ".");
  });
}

function enforceHardTag(lines: string[], tag: string): string[] {
  if (!tag) return lines;
  const t = tag.toLowerCase();
  let withTag = lines.map(l => l.toLowerCase().includes(t));
  
  // inject where missing
  lines = lines.map((l, i) => withTag[i] ? l : `${tag} ${l[0].toLowerCase()}${l.slice(1)}`);
  
  // put tag at front on the first two lines only
  lines = lines.map((l, i) => {
    if (i < 2 && !l.toLowerCase().startsWith(t)) {
      return `${tag} ${l[0].toLowerCase()}${l.slice(1)}`;
    }
    return l;
  });
  
  return lines;
}

function postProcessBatch(rawLines: string[], hardTag: string): string[] {
  let lines = [...new Set(rawLines.map(s => s.trim()))].slice(0, 4);
  const buckets = assignBuckets(lines.length);

  lines = lines.map((l, i) => completeSentence(ensurePunchlineCue(l), buckets[i][0], buckets[i][1]));
  lines = diversifyLexicon(lines);
  if (hardTag) lines = enforceHardTag(lines, hardTag);

  // final validation
  lines = lines.map((l, i) => {
    let s = l.replace(/[—]/g, " ").replace(/,/g, "").replace(/\s+\./g, ".");
    s = (s.match(/\./g) || []).length === 1 ? s : s + ".";
    if (s.length < buckets[i][0] || s.length > buckets[i][1]) {
      s = completeSentence(s, buckets[i][0], buckets[i][1]);
    }
    return s;
  });
  
  return lines;
}

const BDAY = ["cake","candles","party","balloons","wish","slice"];
function ensureBirthdayLexicon(s: string): string {
  return BDAY.some(w=>s.toLowerCase().includes(w))
    ? s
    : s.replace(/\.$/, " over the cake.");
}

export async function generateN(ctx: Ctx, n: number): Promise<string[]> {
  const rawLines: string[] = [];

  // Generate all lines first
  for (let i = 0; i < n; i++) {
    const prompt = buildPrompt({ ...ctx, minLen: 40, maxLen: 100 });
    const res = await callModel(prompt);

    let lines = res.text
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    // get best line from model output
    let best = lines.find(s => s.length >= 40 && s.length <= 100) ?? lines[0] ?? "";
    
    // basic soft tag stripping
    best = stripSoftEcho([best], ctx.tags.soft)[0];
    
    if (!best || !formatOK(best)) {
      // one retry with simplified prompt
      const prompt2 = buildPrompt({ ...ctx, minLen: 40, maxLen: 100, simplified: true });
      const res2 = await callModel(prompt2);
      const alt = res2.text.split("\n").map(s => s.trim()).find(s => s.length >= 40 && s.length <= 100) ?? "";
      const cleaned = stripSoftEcho([alt], ctx.tags.soft)[0];
      if (formatOK(cleaned)) {
        best = cleaned;
      }
    }

    rawLines.push(best || "Generated content unavailable.");
  }

  // Apply post-processing to entire batch for consistency
  const hardTag = ctx.tags.hard[0] || "";
  const processed = postProcessBatch(rawLines, hardTag);
  
  return processed;
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
