import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateVisuals } from "./generate.ts";
import { PRIMARY_MODEL } from "./model.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string;
  layout_token: string;
  tags?: {
    hard: string[];
    soft: string[];
  } | string[];
}

// Parse tags from input with exact specification compliance
function parseTagsFromInput(inputTags?: { hard: string[]; soft: string[] } | string[]): { hardTags: string[]; softTags: string[] } {
  // Handle new structured format
  if (inputTags && typeof inputTags === 'object' && !Array.isArray(inputTags)) {
    return {
      hardTags: inputTags.hard || [],
      softTags: inputTags.soft || []
    };
  }
  
  // Handle legacy array format - parse for hard/soft tags using exact specification
  const tagArray = Array.isArray(inputTags) ? inputTags : [];
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tagArray) {
    const normalized = normalizeTagInput(tag);
    if (!normalized) continue;
    
    // EXACT specification: "Reid" or @Reid = hard tag
    const hard = /^".+"$|^@.+/.test(normalized);
    
    if (hard) {
      // Remove @ prefix or quotes to get text
      const text = normalized.replace(/^@/, "").replace(/^["']|["']$/g, "");
      if (text) hardTags.push(text);
    } else {
      softTags.push(normalized.toLowerCase());
    }
  }
  
  return { hardTags, softTags };
}

// Normalize tag input with ASCII quotes (exact spec)
function normalizeTagInput(rawTag: string): string {
  if (!rawTag) return '';
  return rawTag.trim()
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
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
    
    // Handle both new structured and legacy tag formats
    let tags: { hard: string[]; soft: string[] } | string[] = [];
    
    if (inputs.tags && typeof inputs.tags === 'object' && !Array.isArray(inputs.tags)) {
      // New structured format
      tags = {
        hard: Array.isArray(inputs.tags.hard) ? inputs.tags.hard.filter(t => typeof t === 'string' && t.trim().length > 0) : [],
        soft: Array.isArray(inputs.tags.soft) ? inputs.tags.soft.filter(t => typeof t === 'string' && t.trim().length > 0) : []
      };
    } else if (Array.isArray(inputs.tags)) {
      // Legacy array format
      tags = inputs.tags.filter(t => typeof t === 'string' && t.trim().length > 0);
    }

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

    console.log('🚀 Starting simplified visual generation:', { final_text, category, subcategory, mode, layout_token, tags });

    const { hardTags, softTags } = parseTagsFromInput(tags);
    
    // Build input for generation
    const generationInput = {
      caption: final_text,
      category,
      sub: subcategory,
      layout: layout_token,
      hardTags,
      softTags
    };

    // Use new simplified generation approach
    const result = await generateVisuals(generationInput, OPENAI_API_KEY);

    // Convert result to expected format
    const response = {
      success: true,
      model: result.fallback ? 'fallback' : (result.model || PRIMARY_MODEL),
      concepts: result.lines.map((text: string, idx: number) => ({
        lane: `option${idx + 1}`,
        text
      })),
      fallback: result.fallback || false,
      simplified: result.simplified || false,
      prompt_tokens: result.meta?.prompt_tokens || 0,
      completion_tokens: result.meta?.completion_tokens || 0
    };

    // Log real causes for debugging
    console.log('✅ Visual generation completed:', {
      model: result.model || PRIMARY_MODEL,
      meta: result.meta,
      simplified: !!result.simplified,
      fallback: !!result.fallback,
      failure_reason: result.failure_reason
    });

    return new Response(
      JSON.stringify({ 
        ...response,
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