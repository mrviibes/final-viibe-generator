import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseTags, type ParsedTags } from "./tags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const MODEL_PRIMARY = "gpt-5-2025-08-07";
const MODEL_BACKUP = "gpt-4.1-2025-04-14";
const TIMEOUT_MS = 25000;
const MAX_OUT = 120;

// Core LLM call with retry logic
async function callLLM(model: string, messages: any[], signal: AbortSignal) {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: MAX_OUT,
      // No temperature for GPT-5 models
    }),
    signal
  });
}

// Generate with primary model, fallback to backup
export async function generateStep2(ctx: {
  category: string; subcategory: string; tone: string; rating: "G"|"PG-13"|"R"|"Explicit";
  style: "punchline-first"|"story"|"pop-culture"|"wildcard";
  tags: { hard: string[]; soft: string[] }
}) {
  const messages = buildPrompt(ctx);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    console.log(`🎯 Trying primary model: ${MODEL_PRIMARY}`);
    const r = await callLLM(MODEL_PRIMARY, messages, ctrl.signal);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return { 
      model: MODEL_PRIMARY, 
      raw: data.choices?.[0]?.message?.content || "",
      fallback: false 
    };
  } catch (e) {
    console.log(`⚠️ Primary failed, trying backup: ${MODEL_BACKUP}`);
    try {
      const r2 = await callLLM(MODEL_BACKUP, messages, ctrl.signal);
      if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
      const data2 = await r2.json();
      return { 
        model: MODEL_BACKUP, 
        raw: data2.choices?.[0]?.message?.content || "", 
        fallback: true, 
        reason: String(e).slice(0, 160) 
      };
    } catch (e2) {
      throw new Error(`Both models failed: ${e} | ${e2}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// Build minimal, reliable prompt
function buildPrompt(ctx: any) {
  const lex = ctx.subcategory === "Birthday"
    ? "Use one birthday word: cake or candles or balloons or party or wish."
    : "Stay visibly on the chosen topic.";
  return [
    { role: "system", content:
      "Return 4 jokes. One sentence each. 40 to 100 characters. One period. No commas or em dashes."
    },
    { role: "user", content:
      `Topic: ${ctx.category} > ${ctx.subcategory}.
Style: ${ctx.style}. Tone: ${ctx.tone}. Rating: ${ctx.rating}.
Hard tags: ${ctx.tags.hard.join(" ") || "none"}.
Soft tags guide vibe only and must not appear literally: ${ctx.tags.soft.join(" ") || "none"}.
${lex}`
    }
  ];
}

// Parse model text into 4 lines
function toLines(raw: string): string[] {
  return raw.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
}

// Repair and enforce quality
const LEX_BDAY = ["cake","candles","balloons","party","wish","slice","confetti"];
const TWIST = [" but "," still "," even "," instead "," and then "];
const STALE = [/everyone nodded awkwardly/ig, /check check/ig, /in america/i];

function clean(s: string) {
  let t = s.replace(/[—,]/g,"").replace(/\s+\./g,".").trim();
  STALE.forEach(r => t = t.replace(r,""));
  if (!t.endsWith(".")) t += ".";
  if ((t.match(/\./g)||[]).length !== 1) t = t.replace(/\./g,"") + ".";
  return t.replace(/\s{2,}/g," ").trim();
}

function ensureTopic(s: string, sub: string) {
  if (sub === "Birthday") {
    return LEX_BDAY.some(w=> new RegExp(`\\b${w}\\b`, "i").test(s))
      ? s : s.replace(/\.$/, " cake.");
  }
  return s;
}

function ensureTwist(s: string) {
  return TWIST.some(m=> s.toLowerCase().includes(m.trim()))
    ? s : s.replace(/\.$/, " but the punchline won anyway.");
}

function fitLen(s: string, lo: number, hi: number) {
  if (s.length > hi) {
    const cut = s.slice(0, hi);
    const safe = cut.lastIndexOf(" ") > 0 ? cut.slice(0, cut.lastIndexOf(" ")) : cut;
    return safe.replace(/\.+$/,"") + ".";
  }
  if (s.length < lo) return s.replace(/\.$/," tonight.");
  return s;
}

function spreadHardTag(lines: string[], tag?: string) {
  if (!tag) return lines;
  const t = tag.toLowerCase();
  return lines.map((l,i)=>{
    if (l.toLowerCase().includes(t)) return l;
    if (i===0) return `${tag} ${l[0].toLowerCase()}${l.slice(1)}`;
    if (i===1) return l.replace(/^\w+/, `$& ${tag}`);
    return l.replace(/\.$/, ` with ${tag}.`);
  });
}

function dedupe(lines: string[]) {
  const out: string[]=[];
  for(const l of lines){
    if(!out.some(u=>similarity(u,l)>0.85)) out.push(l);
  }
  return out;
}

function similarity(a: string, b: string) {
  const A=new Set(a.toLowerCase().split(/\s+/)), B=new Set(b.toLowerCase().split(/\s+/));
  const inter=[...A].filter(x=>B.has(x)).length;
  const uni=new Set([...A,...B]).size;
  return inter/uni;
}

const BUCKETS: [number,number][]= [[40,60],[61,80],[81,100],[61,80]];

export function postProcess(raw: string, meta: {
  category: string; subcategory: string; rating: "G"|"PG-13"|"R"|"Explicit";
  hardTag?: string; voices: string[];
}) {
  let lines = toLines(raw);
  lines = lines.map(clean);
  lines = lines.map((s,i)=> fitLen(ensureTwist(ensureTopic(s, meta.subcategory)), ...BUCKETS[i]));
  lines = spreadHardTag(lines, meta.hardTag);
  lines = dedupe(lines);
  while (lines.length < 4) lines.push("The joke factory ran out of cake but the punchline still showed up.");
  
  // Rating touch
  if (meta.rating === "R") {
    lines = lines.map(s => /\b(fuck|shit)\b/i.test(s) ? s : s.replace(/\.$/, " damn."));
  }
  if (meta.rating === "G") {
    lines = lines.map(s => s.replace(/\b(fuck|shit|ass|bitch|damn|hell)\b/gi, "oops"));
  }
  return lines.slice(0,4);
}

// Voice rotation for comedian labeling
function rotateVoices(rating: string): string[] {
  return ["hart", "wong", "rock", "mulaney"];
}

// Main generation orchestrator
export async function generateAndRepairStep2(ctx: any) {
  const tags = ctx.tags || { hard: [], soft: [] };
  const { model, raw, fallback, reason } = await generateStep2({ ...ctx, tags });
  const voices = rotateVoices(ctx.rating);
  const lines = postProcess(raw, {
    category: ctx.category,
    subcategory: ctx.subcategory,
    rating: ctx.rating,
    hardTag: tags.hard?.[0],
    voices
  });
  return {
    options: lines,
    meta: { 
      model, 
      fallback: !!fallback, 
      reason: fallback ? String(reason).slice(0,160) : undefined, 
      voices 
    }
  };
}

serve(async (req) => {
  const requestStartTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const inputs = await req.json();
    console.log('📝 Clean Step-2 Pipeline - Received inputs:', {
      category: inputs.category,
      subcategory: inputs.subcategory,
      tone: inputs.tone,
      rating: inputs.rating,
      style: inputs.style,
      tagCount: inputs.tags?.hard?.length || 0
    });

    // Validate required inputs
    if (!inputs.category || !inputs.subcategory) {
      return new Response(JSON.stringify({
        error: 'Missing required inputs: category, subcategory',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // FAIL FAST - No API key = immediate error
    if (!openAIApiKey) {
      console.error('❌ CRITICAL: No OpenAI API key');
      return new Response(JSON.stringify({
        error: 'OpenAI API key not configured',
        success: false,
        model: 'none'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const ctx = {
        category: inputs.category,
        subcategory: inputs.subcategory,
        tone: inputs.tone || 'Humorous',
        rating: inputs.rating || 'PG-13',
        style: inputs.style || 'punchline-first',
        tags: parseTags(inputs.tags)
      };

      console.log(`🎯 Clean generation: ${ctx.category}/${ctx.subcategory} | ${ctx.tone} | ${ctx.rating}`);
      
      const result = await generateAndRepairStep2(ctx);
      
      console.log(`✅ Generated 4 lines using ${result.meta.model}`);
      if (result.meta.fallback) {
        console.log(`⚠️ Used fallback: ${result.meta.reason}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        options: result.options,
        meta: {
          model: result.meta.model,
          voices: result.meta.voices,
          fallback: result.meta.fallback,
          reason: result.meta.reason,
          style: ctx.style,
          tone: ctx.tone,
          validated: true
        },
        timing: {
          total_ms: Date.now() - requestStartTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (error) {
      console.error('❌ Generation failed:', error);
      
      // Emergency fallback
      const fallbackOptions = [
        "The joke factory ran out of cake but the punchline still showed up.",
        "Things went sideways faster than a birthday balloon in traffic.",
        "Life is like birthday candles, someone always blows it too early.",
        "The party was chaos but at least the cake survived somehow."
      ];
      
      return new Response(JSON.stringify({
        success: true,
        options: fallbackOptions,
        meta: {
          model: 'emergency-fallback',
          voices: ["hart", "wong", "rock", "mulaney"],
          fallback: true,
          reason: `Both GPT-5 and GPT-4.1 failed: ${error.message}`,
          style: inputs.style || 'punchline-first',
          tone: inputs.tone || 'Humorous',
          validated: false
        },
        timing: {
          total_ms: Date.now() - requestStartTime
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

  } catch (error) {
    console.error('❌ Request parsing failed:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});