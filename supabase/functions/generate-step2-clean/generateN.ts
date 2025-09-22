import { buildPrompt } from "./buildPrompt.ts";
import { ParsedTags } from "./tags.ts";
import { startNewPopCultureBatch } from "../shared/popCultureV3.ts";
import { VIIBE_CONFIG_V3 } from "../shared/viibe_config_v3.ts";
import { validateAndRepairBatch, scoreBatchQuality, shouldRetryBatch } from "./advancedValidator.ts";
import { 
  validateNaturalDelivery, 
  detectAndRepairFragments,
  selectComedianForRating
} from "./deliveryTemplates.ts";

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

// REMOVED: No more forced cues in V3 system
// Comedian voices will drive natural punchline-first delivery

const BASKETBALL_LEX = ["hoop","rim","court","dribble","rebound","buzzer","foul","free throw","timeout","screen","turnover","fast break"];

function assignBuckets(n: number = 4): [number,number][] {
  // Ensure we use all buckets for variety, cycling through them
  const buckets: [number,number][] = [];
  for (let i = 0; i < n; i++) {
    buckets.push(BUCKETS[i % BUCKETS.length]);
  }
  return buckets;
}

function ensureNaturalDelivery(line: string, tone: string, lineIndex: number, rating: string, comedianVoice?: string): string {
  // V5: Focus on fragment repair and quality validation only
  let cleaned = line.trim();
  
  // Detect and repair any fragments
  cleaned = detectAndRepairFragments(cleaned);
  
  // Validate natural delivery but don't force templates
  const naturalCheck = validateNaturalDelivery(cleaned);
  if (!naturalCheck.isNatural) {
    console.log(`⚠️ Line ${lineIndex}: ${naturalCheck.issues.join(', ')} (score: ${naturalCheck.score})`);
  }
  
  // Ensure proper capitalization and punctuation
  if (!cleaned.endsWith('.')) cleaned += '.';
  cleaned = cleaned.replace(/^[a-z]/, m => m.toUpperCase());
  
  return cleaned;
}

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

function diversifyContextLexicon(lines: string[], category: string): string[] {
  const BIRTHDAY_LEX = ["cake","candles","party","balloons","wish","slice","confetti"];
  const BASKETBALL_LEX = ["hoop","rim","court","dribble","rebound","buzzer"];
  
  // Choose lexicon based on category
  const pool = category.toLowerCase().includes("birthday") || category.toLowerCase().includes("celebration") 
    ? BIRTHDAY_LEX 
    : BASKETBALL_LEX;
  
  return lines.map((l, i) => {
    const hasLex = pool.some(w => l.toLowerCase().includes(w));
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

function postProcessBatch(rawLines: string[], hardTag: string, ctx: Ctx): string[] {
  let lines = [...new Set(rawLines.map(s => s.trim()))].slice(0, 4);
  const buckets = assignBuckets(lines.length);
  
  // Select comedian for consistent voice across batch
  const selectedComedian = selectComedianForRating(ctx.rating);
  console.log(`🎭 Using comedian voice: ${selectedComedian} for ${ctx.rating} rating`);

  // Process each line with context-aware pipeline
  lines = lines.map((l, i) => {
    // 1. Normalize
    let s = l.trim();
    
    // 2. Universal age filter for Birthday content (V3: all birthday content, not just Romantic)
    if (ctx.category.toLowerCase().includes("birthday") || ctx.category.toLowerCase().includes("celebration")) {
      s = s.replace(/\b\d+\b/g, ""); // strip all numbers/ages
      s = s.replace(/\b(older|younger|age|years old|turning)\b/gi, ""); // strip age-related words
      s = s.replace(/\s+/g, " ").trim(); // clean up extra spaces
      s = ensureBirthdayLexicon(s);
    }
    
    // 3. Romantic tone enforcement (add affectionate words)
    if (ctx.tone === "Romantic") {
      if (!/(love|heart|warm|dear|sweet|tender|adore)/i.test(s)) {
        s = s.replace(/\.$/, " and my heart knows it.");
      }
    }
    
    // 4. Word-safe length fitting FIRST
    s = fitLengthWordSafe(s, buckets[i][0], buckets[i][1]);
    
    // 5. V4: Natural delivery with comedian templates
    s = ensureNaturalDelivery(s, ctx.tone, i, ctx.rating, selectedComedian);
    
    // 6. Final length check (ensure templates didn't exceed limits)
    if (s.length > buckets[i][1]) {
      s = fitLengthWordSafe(s, buckets[i][0], buckets[i][1]);
    }
    
    // 7. Final QC
    s = finalQC(s);
    
    return s;
  });
  
  // Apply hard tag enforcement at the end
  if (hardTag) lines = enforceHardTag(lines, hardTag);
  
  return lines;
}

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

  // Apply enhanced validation and repair
  const hardTag = ctx.tags.hard[0] || "";
  
  // Select comedian voice for the batch
  const batchComedian = selectComedianForRating(ctx.rating);
  
  // Use advanced validator for comprehensive quality control
  const validated = validateAndRepairBatch(rawLines, {
    rating: ctx.rating,
    category: ctx.category,
    subcategory: ctx.subcategory,
    hardTags: ctx.tags.hard,
    softTags: ctx.tags.soft,
    requirePop: ctx.style === "pop-culture",
    comedianVoice: batchComedian,
    tone: ctx.tone
  });
  
  // Score the batch quality
  const qualityScore = scoreBatchQuality(validated, {
    rating: ctx.rating,
    category: ctx.category,
    subcategory: ctx.subcategory,
    hardTags: ctx.tags.hard,
    comedianVoice: batchComedian
  });
  
  console.log(`📊 Batch quality score: ${qualityScore.overallScore}%`);
  if (qualityScore.issues.length > 0) {
    console.log(`⚠️ Quality issues: ${qualityScore.issues.join(", ")}`);
  }
  
  // If quality is too low, try one retry with post-processing fallback
  if (shouldRetryBatch(qualityScore) && rawLines.length >= 2) {
    console.log(`🔄 Quality too low (${qualityScore.overallScore}%), applying fallback post-processing`);
    const fallbackProcessed = postProcessBatch(rawLines, hardTag, ctx);
    
    // Re-validate the fallback
    const fallbackValidated = validateAndRepairBatch(fallbackProcessed, {
      rating: ctx.rating,
      category: ctx.category,
      subcategory: ctx.subcategory,
      hardTags: ctx.tags.hard,
      softTags: ctx.tags.soft,
      requirePop: ctx.style === "pop-culture",
      comedianVoice: batchComedian,
      tone: ctx.tone
    });
    
    return fallbackValidated;
  }
  
  return validated;
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
