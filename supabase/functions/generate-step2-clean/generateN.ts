import { buildPrompt } from "./buildPrompt.ts";
import { ParsedTags } from "./tags.ts";
import { startNewPopCultureBatch } from "../shared/popCultureV3.ts";
import { enforceBatch } from "./enforceBatch.ts";
import { MODEL_CONFIG, getTokenParameter, supportsTemperature } from "../shared/modelConfig.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MODEL = MODEL_CONFIG.PRIMARY;

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

// REMOVED: No more forced cues in V3 system
// Comedian voices will drive natural punchline-first delivery

const BASKETBALL_LEX = ["hoop","rim","court","dribble","rebound","buzzer","foul","free throw","timeout","screen","turnover","fast break"];

// Removed: assignBuckets - handled by enforceBatch

// Removed: ensureNaturalDelivery - replaced by enforceBatch voice system

function fitLengthWordSafe(line: string, lo: number, hi: number): string {
  let s = line.replace(/[—]/g, " ").replace(/,/g, "").replace(/\s+\./g, ".").trim();
  if (!s.endsWith(".")) s += ".";
  
  // Enhanced fragment detection for common incomplete patterns
  const fragmentPatterns = [
    [/\b(the|and|was|had|with|for|but|that|to|at|in|on|so|even)\.\s*$/i, " tonight."],
    [/\bcome to\.\s*$/i, " come to celebrate."],
    [/\bso bad even the\.\s*$/i, " so bad even the cake left early."],
    [/\bfirst then the real reason\.\s*$/i, " first then reality hit hard."],
    [/\bcake was so bad even the\.\s*$/i, " cake was so bad the candles quit."],
    [/\bpeople come to\.\s*$/i, " people come to party."],
    [/\bmake Jesse any\.\s*$/i, " make Jesse happy."],
    [/\bdidn't make Jesse any\.\s*$/i, " didn't make Jesse smile."],
    [/\bYou ever tonight\.\s*$/i, " You ever notice parties get weird."],
    [/\bMan listen Jesse in America\.\s*$/i, " Man listen Jesse parties hard."],
    [/\bSo I walk into my tonight\.\s*$/i, " So I walk into this party confused."]
  ];
  
  // Apply fragment repairs
  for (const [pattern, replacement] of fragmentPatterns) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement);
      break;
    }
  }
  
  // Fix common cut-offs like "every g." / "Jesse d." / "damn pl."
  s = s.replace(/\b([a-z]{1,2})\.\s*$/i, " show.");
  s = s.replace(/\bpl\.\s*$/i, "play.");
  s = s.replace(/\bd\.\s*$/i, "down.");
  s = s.replace(/\bg\.\s*$/i, "game.");
  s = s.replace(/\bcandles\s+and\.\s*$/i, "candles and made a wish.");
  s = s.replace(/\bblew\s+out\s+and\.\s*$/i, "blew out the candles.");
  
  // Ensure it ends with a complete word + period
  if (!/[a-z)]\.\s*$/i.test(s)) s = s.replace(/\.\s*$/, " show.");
  s = s.replace(/^\s*[a-z]/, m => m.toUpperCase());
  
  // Word-safe length fitting - never cut mid-word
  if (s.length <= hi && s.length >= lo) return s;
  
  if (s.length > hi) {
    const cut = s.slice(0, hi);
    const lastSpace = cut.lastIndexOf(" ");
    const safe = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    s = safe.replace(/\.$/, "") + ".";
    
    // After cutting, check if we created a new fragment
    if (/\b(the|and|was|had|with|for|but|that|to|at|in|on)\.\s*$/i.test(s)) {
      s = s.replace(/\b(the|and|was|had|with|for|but|that|to|at|in|on)\.\s*$/i, " tonight.");
    }
  }
  
  if (s.length < lo) {
    s = s.replace(/\.$/, " tonight.");
  }
  
  return s;
}

// Removed: diversifyContextLexicon - handled by enforceBatch ensureContext

// Removed: enforceHardTag - replaced by enforceBatch spreadHardTag

// Removed: postProcessBatch - replaced by enforceBatch unified system

const BDAY = ["cake","candles","party","balloons","wish","slice"];
function ensureBirthdayLexicon(s: string): string {
  return BDAY.some(w=>s.toLowerCase().includes(w))
    ? s
    : s.replace(/\.$/, " over the cake.");
}

export async function generateN(ctx: Ctx, n: number): Promise<string[]> {
  // Start new batch for pop culture tracking
  startNewPopCultureBatch();
  
  const rawLines: string[] = [];

  // Generate lines with standard prompts - voice variety handled by enforceBatch
  for (let i = 0; i < n; i++) {
    const prompt = buildPrompt({ 
      ...ctx, 
      minLen: 40, 
      maxLen: 100
    });
    
    const res = await callModel(prompt);

    let lines = res.text
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    // Get best line from model output
    let best = lines.find(s => s.length >= 40 && s.length <= 100) ?? lines[0] ?? "";
    
    // Basic soft tag stripping
    best = stripSoftEcho([best], ctx.tags.soft)[0];
    
    if (!best || best.length < 40) {
      console.log(`⚠️ First attempt failed, trying simplified prompt...`);
      // Fallback to minimal prompt
      const simplePrompt = `Generate a ${ctx.tone.toLowerCase()} joke about ${ctx.category}. Include "${ctx.tags.hard[0] || 'someone'}" in the joke. 40-100 characters. One sentence.`;
      const res2 = await callModel(simplePrompt);
      let alt = res2.text.split("\n").map(s => s.trim()).find(s => s.length >= 40 && s.length <= 100) ?? "";
      alt = stripSoftEcho([alt], ctx.tags.soft)[0];
      
      if (alt && alt.length >= 40) {
        best = alt;
        console.log(`✅ Simplified prompt worked: "${alt}"`);
      } else {
        console.log(`❌ Both attempts failed for generation ${i + 1}`);
      }
    }

    rawLines.push(best || "Generated content unavailable.");
  }

  // Apply unified enforceBatch system
  const enforcedLines = enforceBatch(rawLines, {
    rating: ctx.rating,
    category: ctx.category,
    subcategory: ctx.subcategory,
    hardTag: ctx.tags.hard[0] || ""
  });
  
  console.log(`🎭 Enforced batch with voice variety and natural delivery`);
  
  return enforcedLines;
}

async function callModel(prompt: string): Promise<{ text: string }> {
  console.log(`🎤 Sending prompt to ${MODEL}:`, prompt.substring(0, 200) + '...');
  
  const requestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a professional comedian performing on stage. Generate exactly one complete joke sentence.' },
      { role: 'user', content: prompt }
    ],
    [getTokenParameter(MODEL)]: 500
  };
  
  console.log(`📤 Request body:`, JSON.stringify(requestBody, null, 2));
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error ${response.status}:`, errorText);
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`📥 Raw API response:`, JSON.stringify(data, null, 2));
  
  const text = (data.choices?.[0]?.message?.content || '').trim();
  const finishReason = data.choices?.[0]?.finish_reason;
  const usage = data.usage;
  
  console.log(`🎭 Generated text: "${text}" (${text.length} chars)`);
  console.log(`📊 Finish reason: ${finishReason}, Usage:`, usage);
  
  if (!text) {
    console.error(`⚠️ Empty response detected! Finish reason: ${finishReason}`);
    throw new Error(`Empty response from OpenAI. Finish reason: ${finishReason}`);
  }
  
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

function finalQC(s: string): string {
  // Clean formatting
  s = s.replace(/\s+\./g, ".").replace(/[—,]/g, "");
  
  // Ensure exactly one sentence (one period)
  if ((s.match(/\./g) || []).length !== 1) {
    s = s.replace(/\./g, "") + ".";
  }
  
  // Fix multiple periods and spaces before period
  s = s.replace(/\.{2,}$/, ".").replace(/\s+\.$/, ".");
  
  // Capitalize first letter
  s = s.replace(/^[a-z]/, m => m.toUpperCase());
  
  // Must end with a whole word
  if (!/[a-z)]\.$/.test(s)) {
    s = s.replace(/\.$/, " now.");
  }
  
  return s;
}

// Helper function to select comedian voice based on rating (legacy mapping)
function selectComedianVoiceLegacy(rating: string): string {
  const voices = {
    "G": ["jim_gaffigan", "nate_bargatze", "ellen_degeneres"],
    "PG-13": ["kevin_hart", "trevor_noah", "ali_wong"],
    "R": ["bill_burr", "chris_rock", "wanda_sykes"],
    "Explicit": ["sarah_silverman", "joan_rivers", "amy_schumer"]
  };
  
  const ratingVoices = voices[rating as keyof typeof voices] || voices["PG-13"];
  return ratingVoices[Math.floor(Math.random() * ratingVoices.length)];
}

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
