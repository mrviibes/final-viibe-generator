import { buildPrompt } from "./buildPrompt.ts";
import { ParsedTags, normalizeTags } from "./tags.ts";
import { repairWithVoiceStencils, validateStencilRepair } from './voiceStencils.ts';
import { COMEDIAN_VOICES, ComedianVoice, getRandomVoices } from '../../../src/lib/comedianVoices.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const PRIMARY_MODEL = "gpt-5-2025-08-07";
const FALLBACK_MODEL = "gpt-4.1-mini-2025-04-14";
const TIMEOUT_MS = 25000;
const MAX_COMPLETION_TOKENS = 120;

type Ctx = {
  category: string;
  subcategory: string;
  tone: "Humorous"|"Savage"|"Playful"|"Romantic"|"Sentimental";
  style: "punchline-first"|"story"|"pop-culture"|"wildcard";
  rating: "G"|"PG-13"|"R"|"Explicit";
  tags: ParsedTags;
};

const BUCKETS: Array<[number, number]> = [
  [30,70],
  [50,90], 
  [60,120],
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

// Strip category leakage from generated text
function stripCategoryLeakage(s: string): string {
  return s.replace(/^(\w+\s*>\s*\w+\s*)+/i,"").trim();
}

// Repair broken joke fragments
function repairJoke(s: string): string {
  let joke = stripCategoryLeakage(s);
  
  // Fix common fragment patterns
  joke = joke.replace(/[—,]/g,"").replace(/\s+\./g,".").trim();
  if (!joke.endsWith(".")) joke += ".";
  if ((joke.match(/\./g)||[]).length !== 1) joke = joke.replace(/\./g,"") + ".";
  
  // Enforce birthday lexicon
  if (!BDAY.some(w=> new RegExp(`\\b${w}\\b`,"i").test(joke))) {
    joke = joke.replace(/\.$/, " cake.");
  }
  
  // Length normalization (40-100 chars word-safe)
  if (joke.length > 100) {
    const cut = joke.slice(0,100);
    joke = (cut.slice(0,cut.lastIndexOf(" "))||cut).replace(/\.+$/,"")+".";
  }
  if (joke.length < 40) joke = joke.replace(/\.$/, " tonight.");
  
  // Ensure proper capitalization
  return joke[0].toUpperCase() + joke.slice(1);
}

export async function generateN(ctx: Ctx, n: number): Promise<string[]> {
  console.log(`🎭 Generating ${n} jokes with voice stencil system`, {
    category: ctx.category,
    subcategory: ctx.subcategory,
    hardTags: ctx.tags.hard,
    model: PRIMARY_MODEL,
    timeout: TIMEOUT_MS
  });
  
  // Select 4 unique comedian voices for this batch
  const voices = getRandomVoices(4);
  console.log(`🎭 Selected voices:`, voices.map(v => v.name));
  
  // Normalize tags to prevent crashes
  const normalizedTags = normalizeTags(ctx.tags);
  const safeCtx = { ...ctx, tags: normalizedTags };
  
  // Minimal prompt for reliability
  const prompt = buildPrompt({ 
    ...safeCtx, 
    minLen: 40, 
    maxLen: 100,
    requestMultiple: true
  });
  
  try {
    // Primary model attempt with timeout
    const res = await callModelWithTimeout(prompt, PRIMARY_MODEL);
    console.log(`✅ Primary model (${PRIMARY_MODEL}) success:`, {
      responseLength: res.text.length,
      model: res.model || PRIMARY_MODEL
    });
    
    return processWithVoiceStencils(res.text, safeCtx, voices, n);
    
  } catch (primaryError) {
    console.log(`❌ Primary model failed:`, {
      model: PRIMARY_MODEL,
      error: primaryError.message,
      timeout: TIMEOUT_MS
    });
    
    try {
      // Fallback model attempt
      const res = await callModelWithTimeout(prompt, FALLBACK_MODEL);
      console.log(`✅ Fallback model (${FALLBACK_MODEL}) success:`, {
        responseLength: res.text.length,
        model: res.model || FALLBACK_MODEL
      });
      
      return processWithVoiceStencils(res.text, safeCtx, voices, n);
      
    } catch (fallbackError) {
      console.error(`❌ Both models failed:`, {
        primary: { model: PRIMARY_MODEL, error: primaryError.message },
        fallback: { model: FALLBACK_MODEL, error: fallbackError.message }
      });
      
      // Return voice stencil fallback
      return generateVoiceStencilFallback(safeCtx, voices, n);
    }
  }
}

function processWithVoiceStencils(rawText: string, ctx: Ctx, voices: ComedianVoice[], n: number): string[] {
  console.log(`🔧 Processing raw output with voice stencils: "${rawText}"`);
  
  // Strip category leakage first
  const cleanText = stripCategoryLeakage(rawText);
  console.log(`🧹 After category cleanup: "${cleanText}"`);
  
  // Parse individual lines
  const rawLines = cleanText
    .split(/[\n\r]+/)
    .map(line => line.trim().replace(/^\d+\.\s*/, ''))
    .filter(line => line.length > 0)
    .slice(0, n);
  
  console.log(`📝 Raw lines:`, rawLines);
  
  // Apply voice stencil repair system
  const repairedLines = repairWithVoiceStencils(rawLines, voices, ctx.rating);
  console.log(`🎭 After voice stencil repair:`, repairedLines);
  
  // Validate the repair quality
  const validation = validateStencilRepair(repairedLines);
  console.log(`✅ Stencil validation - Score: ${validation.score}, Stage-ready: ${validation.stageReadyCount}/4`);
  
  if (validation.issues.length > 0) {
    console.log(`⚠️ Validation issues:`, validation.issues);
  }
  
  // Final processing with birthday lexicon
  const processedLines = repairedLines.map(line => {
    let processed = ensureBirthdayLexicon(line);
    return finalQC(processed);
  });
  
  console.log(`✅ Final processed lines:`, processedLines);
  
  // Ensure exactly n unique lines
  const uniqueLines = [...new Set(processedLines)];
  while (uniqueLines.length < n) {
    uniqueLines.push("Jesse's cake had so many candles the smoke alarm filed a complaint.");
  }
  
  return uniqueLines.slice(0, n);
}

function generateVoiceStencilFallback(ctx: Ctx, voices: ComedianVoice[], n: number): string[] {
  console.log(`🚨 Using voice stencil fallback for ${ctx.category}/${ctx.subcategory}`);
  
  const tags = normalizeTags(ctx.tags);
  const hardTag = tags.hard[0] || "Jesse";
  
  // Voice-specific fallback templates with birthday words
  const voiceTemplates = {
    "Kevin Hart": `Man listen, ${hardTag} blew out the candles and then the cake exploded.`,
    "Ali Wong": `${hardTag} cut the cake like a surgeon having a breakdown.`,
    "Chris Rock": `Everybody loves birthdays. But ${hardTag} brings chaos instead.`,
    "John Mulaney": `${hardTag} made a wish. The candles filed for workers compensation.`,
    "Bill Burr": `Why does ${hardTag} celebrate? Because the cake demands it apparently.`,
    "Wanda Sykes": `So ${hardTag} blows out candles but the party fights back.`,
    "default": `${hardTag} celebrated with cake and everyone nodded awkwardly.`
  };
  
  const fallbackLines = voices.slice(0, n).map(voice => 
    voiceTemplates[voice.name] || voiceTemplates["default"]
  );
  
  // Fill remaining slots if needed
  while (fallbackLines.length < n) {
    fallbackLines.push(`The birthday party lasted longer than ${hardTag} expected.`);
  }
  
  return fallbackLines.slice(0, n);
}

// Enhanced callModel with timeout and detailed error reporting
async function callModelWithTimeout(prompt: string, model: string): Promise<{ text: string; model: string }> {
  console.log(`🎤 Calling ${model} with ${TIMEOUT_MS}ms timeout`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  const startTime = Date.now();
  
  try {
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: 'Return 4 jokes. One sentence each. 40-100 chars. One period. No commas or em dashes. Topic must include a birthday word (cake, candles, balloons, party, wish).' },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS
    };
    
    console.log(`📤 Request to ${model}:`, { 
      promptLength: prompt.length,
      maxTokens: MAX_COMPLETION_TOKENS,
      timeout: TIMEOUT_MS 
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ API error (${response.status}):`, {
        model,
        status: response.status,
        error: errorData,
        latency
      });
      throw new Error(`API ${response.status}: ${errorData}`);
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    console.log(`✅ ${model} success:`, {
      latency,
      responseLength: text.length,
      finishReason: data.choices?.[0]?.finish_reason
    });
    
    if (!text) {
      throw new Error('Empty response from model');
    }
    
    return { text, model };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`❌ ${model} failed:`, {
      error: error.message,
      latency,
      timeout: controller.signal.aborted
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
  return formatOKWithLength(s, 30, 120);
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
