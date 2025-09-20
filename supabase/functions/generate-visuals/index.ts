import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Token budget management
const MAX_TOTAL_TOKENS = 4000;
const MAX_COMPLETION_TOKENS = 1200;
const SOFT_PROMPT_BUDGET = MAX_TOTAL_TOKENS - MAX_COMPLETION_TOKENS;

// Progressive model fallback
const MODELS = [
  { name: 'gpt-5-2025-08-07', tokens: MAX_COMPLETION_TOKENS, useMaxCompletionTokens: true },
  { name: 'gpt-4.1-2025-04-14', tokens: 1000, useMaxCompletionTokens: true },
  { name: 'gpt-5-mini-2025-08-07', tokens: 800, useMaxCompletionTokens: true }
];

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string;
  layout_token: string;
  tags?: string[];
}

// Token estimation (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Truncate prompt to fit budget
function truncatePrompt(prompt: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (prompt.length <= maxChars) return prompt;
  
  console.log(`⚠️ Truncating prompt from ${prompt.length} to ${maxChars} chars`);
  return prompt.substring(0, maxChars) + '...';
}

// Lean prompt builder - minimal token usage
function buildVisualPrompt({caption, category, subcategory, mode, tags}: {
  caption: string;
  category: string; 
  subcategory: string;
  mode: string;
  tags: string[];
}) {
  return [
    "You output 4 one-sentence scene ideas. No lists. No numbering.",
    "Lane1=literal-from-caption keywords. Lane2=category-context.",
    "Lane3=funny-exaggeration. Lane4=funny-absurd.", 
    "Max 18 words per line. No ellipses. No placeholders.",
    `Caption: "${caption}".`,
    `Category: ${category} / ${subcategory}.`,
    `Tags: ${tags.slice(0,8).join(", ") || "none"}.`,
    `Mode: ${mode}.`
  ].join("\n");
}

// Ultra-minimal system prompt
const SYSTEM_MINI = `Return 4 lines, one sentence each, 18 words max.
Lane1 literal, Lane2 context, Lane3 exaggeration, Lane4 absurd.
No numbering, no extra text.`;

// Extract meaningful keywords from caption text
function extractKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'ought', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'them', 'their', 'what', 'where', 'when', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'like'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.has(word) && 
      !word.match(/^\d+$/)
    );

  return Array.from(new Set(words))
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
}

// Semantic validation functions - replace exact keyword matching
const exaggerationCues = ['over-the-top', 'giant', 'massive', 'extreme', 'wild', 'dramatic', 'exaggerated', 'oversized'];
const surrealCues = ['impossible', 'floating', 'melting', 'absurd', 'surreal', 'bizarre', 'chaotic', 'weird'];
const categoryVocab = ['christmas', 'santa', 'tree', 'gifts', 'holiday', 'festive', 'celebration', 'birthday', 'cake', 'party'];

function hasOverlap(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase())).length;
}

function hasAny(text: string, cues: string[]): boolean {
  const lower = text.toLowerCase();
  return cues.some(cue => lower.includes(cue));
}

function hasContrast(text: string): boolean {
  return /but|however|while|instead|opposite/.test(text.toLowerCase());
}

function violatesScale(text: string): boolean {
  return /tiny|giant|massive|miniature|huge|microscopic/.test(text.toLowerCase());
}

function isLiteral(text: string, keywords: string[]): boolean {
  return hasOverlap(text, keywords) >= 2;
}

function isContextual(text: string): boolean {
  return hasAny(text, categoryVocab) >= 1;
}

function isLikelyFunny(text: string): boolean {
  return hasAny(text, exaggerationCues) || hasContrast(text);
}

function isLikelyAbsurd(text: string): boolean {
  return hasAny(text, surrealCues) || violatesScale(text);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?]+/g) || []).length;
}

// Semantic validation - replace exact keyword matching
function validateVisuals(lines: string[], keywords: string[]): boolean {
  if (lines.length !== 4) return false;
  
  const okLen = lines.every(l => wordCount(l) <= 18 && sentenceCount(l) >= 1);
  const roleOK = 
    isLiteral(lines[0], keywords) &&
    isContextual(lines[1]) &&
    isLikelyFunny(lines[2]) &&
    isLikelyAbsurd(lines[3]);

  return okLen && roleOK;
}

// Context-aware fallbacks - replace generic baseball with category-specific
function visualFallback({caption, category, subcategory}: {caption: string; category: string; subcategory: string}): string[] {
  const kw = caption.toLowerCase().split(/\W+/).filter(Boolean).slice(0,5);
  const c = category.toLowerCase();
  
  if (c.includes("christmas") || c.includes("holiday") || c.includes("santa")) {
    return [
      `Santa at a workbench matching "${kw.join(" ")}" with elves scrambling.`,
      `Cozy living room tree scene tied to "${kw.join(" ")}" in-frame props.`,
      `Cake of lights so overpacked it threatens the fuse box.`,
      `Snow globe city where the caption idea literally walks by the glass.`
    ];
  }
  
  if (c.includes("birthday") || c.includes("celebration")) {
    return [
      `Birthday party scene with "${kw.join(" ")}" theme and colorful decorations.`,
      `Festive cake and balloons setup matching "${kw.join(" ")}" concept.`,
      `Over-the-top birthday celebration with excessive decorations everywhere.`,
      `Absurd birthday scenario where "${kw.join(" ")}" takes center stage.`
    ];
  }
  
  if (c.includes("sport")) {
    return [
      `Athletic scene featuring "${kw.join(" ")}" with sports equipment visible.`,
      `Stadium or gym setting that showcases ${subcategory} without text.`,
      `Exaggerated sports moment with over-the-top athletic action.`,
      `Absurd sports scenario where normal rules don't apply.`
    ];
  }
  
  // Generic fallbacks as last resort
  return [
    `Literal scene from "${kw.join(" ")}" with clear subject and action.`,
    `Clean category shot that shows ${subcategory} without text overlay.`,
    `Exaggerated version of the action so it is clearly comedic.`,
    `Absurd reimagining that still references the original concept.`
  ];
}

// Progressive retry with simplification
async function tryGenerateWithRetry(input: VisualInput): Promise<any> {
  const keywords = extractKeywords(input.final_text);
  
  // 1. Try full prompt
  try {
    const fullPrompt = buildVisualPrompt({
      caption: input.final_text,
      category: input.category,
      subcategory: input.subcategory,
      mode: input.mode,
      tags: input.tags || []
    });
    
    return await tryOnce(fullPrompt, 'full');
  } catch (e1) {
    console.log('Full prompt failed, trying simplified:', e1.message);
    
    // 2. Try simplified prompt (drop mode, reduce tags)
    try {
      const simplifiedPrompt = buildVisualPrompt({
        caption: input.final_text,
        category: input.category,
        subcategory: input.subcategory,
        mode: 'balanced', // simplified mode
        tags: (input.tags || []).slice(0, 3) // fewer tags
      });
      
      return await tryOnce(simplifiedPrompt, 'simplified');
    } catch (e2) {
      console.log('Simplified prompt failed, trying minimal:', e2.message);
      
      // 3. Try minimal prompt (caption + lanes only)
      try {
        const minimalPrompt = [
          "4 scene ideas. Lane1=literal. Lane2=context. Lane3=funny. Lane4=absurd.",
          `Caption: "${input.final_text}".`,
          `Category: ${input.category}.`
        ].join("\n");
        
        return await tryOnce(minimalPrompt, 'minimal');
      } catch (e3) {
        console.log('All attempts failed, using fallback:', e3.message);
        
        // 4. Use context-aware fallback
        const fallbackLines = visualFallback({
          caption: input.final_text,
          category: input.category,
          subcategory: input.subcategory
        });
        
        return {
          success: true,
          model: 'fallback',
          concepts: fallbackLines.map((text, idx) => ({
            lane: `option${idx + 1}`,
            text
          })),
          fallback: true,
          errors: [e1.message, e2.message, e3.message],
          prompt_tokens: 0,
          completion_tokens: 0
        };
      }
    }
  }
}

// Single attempt with a given prompt
async function tryOnce(prompt: string, attemptType: string): Promise<any> {
  // Check token budget and auto-truncate if needed
  const estimatedTokens = estimateTokens(prompt);
  let finalPrompt = prompt;
  
  if (estimatedTokens > SOFT_PROMPT_BUDGET) {
    finalPrompt = truncatePrompt(prompt, SOFT_PROMPT_BUDGET);
  }
  
  console.log(`${attemptType} attempt - Prompt tokens: ${estimateTokens(finalPrompt)}`);
  
  // Try models in sequence
  for (const modelConfig of MODELS) {
    console.log(`Trying ${modelConfig.name} for ${attemptType} attempt`);
    
    const body: Record<string, unknown> = {
      model: modelConfig.name,
      messages: [
        { role: 'system', content: SYSTEM_MINI },
        { role: 'user', content: finalPrompt }
      ],
      [modelConfig.useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens']: modelConfig.tokens,
    };

    try {
      const controller = new AbortController();
      const timeoutMs = modelConfig.name.includes('gpt-5') ? 15000 : 12000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!r.ok) {
        console.log(`${modelConfig.name} failed with status ${r.status}`);
        continue;
      }

      const data = await r.json();
      const content = data?.choices?.[0]?.message?.content;
      const finishReason = data?.choices?.[0]?.finish_reason;
      
      if (!content || content.trim() === '') {
        console.log(`${modelConfig.name} returned empty content (finish_reason: ${finishReason})`);
        continue;
      }

      if (finishReason === 'length') {
        console.log(`${modelConfig.name} hit token limit (finish_reason: length)`);
        continue;
      }

      // Parse response - expect simple lines, not JSON
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^(lane|option|\d+\.|\-)/i))
        .slice(0, 4);

      if (lines.length !== 4) {
        console.log(`${modelConfig.name} returned ${lines.length} lines instead of 4`);
        continue;
      }

      // Apply semantic validation
      const keywords = extractKeywords(finalPrompt);
      if (!validateVisuals(lines, keywords)) {
        console.log(`${modelConfig.name} failed semantic validation`);
        continue;
      }

      // Success!
      return {
        success: true,
        model: modelConfig.name,
        concepts: lines.map((text, idx) => ({
          lane: `option${idx + 1}`,
          text: text.substring(0, 150) // Cap length
        })),
        prompt_tokens: estimateTokens(finalPrompt),
        completion_tokens: estimateTokens(content),
        finish_reason: finishReason
      };

    } catch (error) {
      console.error(`${modelConfig.name} error:`, error.message);
      if (error.name === 'AbortError') {
        console.log(`${modelConfig.name} timeout`);
      }
      continue;
    }
  }
  
  throw new Error(`All models failed for ${attemptType} attempt`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY missing');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OPENAI_API_KEY missing',
        reason: 'missing_api_key'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputs = (await req.json()) as Partial<VisualInput>;

    // Basic input validation
    const final_text = String(inputs.final_text || '').trim();
    const category = String(inputs.category || '').trim();
    const subcategory = String(inputs.subcategory || '').trim();
    const mode = String(inputs.mode || 'balanced').trim();
    const layout_token = String(inputs.layout_token || 'negativeSpace').trim();
    const tags = Array.isArray(inputs.tags) ? inputs.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : [];

    if (!final_text || !category || !subcategory) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: final_text, category, subcategory',
        reason: 'missing_fields'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🚀 Starting lean visual generation:', { final_text, category, subcategory, mode, layout_token, tags });

    // Use progressive retry with simplification
    const result = await tryGenerateWithRetry({
      final_text,
      category,
      subcategory,
      mode,
      layout_token,
      tags
    });

    console.log('✅ Visual generation completed:', {
      model: result.model,
      fallback: result.fallback,
      conceptCount: result.concepts.length,
      promptTokens: result.prompt_tokens,
      completionTokens: result.completion_tokens
    });

    return new Response(
      JSON.stringify({ 
        ...result,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('generate-visuals error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error',
      reason: 'unexpected_error',
      debug_info: {
        error_type: error.constructor.name,
        stack: error.stack?.substring(0, 500)
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});