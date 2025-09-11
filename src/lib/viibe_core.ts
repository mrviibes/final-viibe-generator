/* =========================================================
   VIIBE CORE – Stripped down to manual input only
   - Keeps API structure but removes all rules/prompting
   - Manual input flow with basic fallbacks
   ========================================================= */

export const MODELS = {
  text: "gpt-5-mini-2025-08-07", 
  visual: "gpt-5-mini-2025-08-07",
};

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

/* =========================================================
   STEP 2 – TEXT (Disabled - Manual Input Only)
========================================================= */
export async function generateTextOptions(session: Session, { tone, tags = [] }: { tone: string; tags?: string[] }): Promise<Array<{ lane: string; text: string }>> {
  // Always return empty array - forcing manual input
  return [];
}

/* =========================================================
   STEP 3 – VISUALS (Direct GPT with User's Format)  
========================================================= */
import { openAIService } from './openai';
import { parseVisualTags } from './textUtils';
import { supabase } from '@/integrations/supabase/client';

export async function generateVisualOptions(
  session: Session,
  { tone, tags, textContent, textLayoutId, recommendationMode }: {
    tone?: string;
    tags?: string[];
    textContent: string;
    textLayoutId: string;
    recommendationMode?: string;
  }
): Promise<{
  visualOptions: Array<{ lane: string; prompt: string }>;
  negativePrompt: string;
  model: string;
}> {
  console.log('generateVisualOptions called with:', {
    session,
    tone,
    tags,
    textContent,
    textLayoutId,
    recommendationMode
  });

  const payload = {
    final_text: textContent,
    category: session.category,
    subcategory: session.subcategory,
    mode: recommendationMode || 'balanced',
    layout_token: textLayoutId,
  };

  console.log('Calling generate-visuals with payload:', payload);

  try {
    const { data, error } = await supabase.functions.invoke('generate-visuals', {
      body: payload
    });

    console.log('generate-visuals response:', { data, error });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Visual generation failed: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      throw new Error('No response from visual generation service');
    }

    if (!data.success) {
      console.error('API returned failure:', data);
      const errorMsg = data.error || 'Failed to generate visuals';
      const details = data.attempted_models ? ` (tried: ${data.attempted_models.join(', ')})` : '';
      throw new Error(`${errorMsg}${details}`);
    }

    const concepts = data.concepts || [];
    if (!Array.isArray(concepts) || concepts.length === 0) {
      console.error('No concepts returned:', data);
      throw new Error('No visual concepts were generated - all models returned empty results');
    }

    // Validate concepts have required structure
    const validConcepts = concepts.filter((concept: any) => 
      concept && typeof concept.text === 'string' && concept.text.trim().length > 0
    );

    if (validConcepts.length === 0) {
      throw new Error('All generated concepts were invalid or empty');
    }

    console.log(`Generated ${validConcepts.length}/${concepts.length} valid concepts`);

    return {
      visualOptions: validConcepts.map((concept: any, index: number) => ({
        lane: concept.lane || `option${index + 1}`,
        prompt: concept.text.trim()
      })),
      negativePrompt: 'blurry, low quality, text overlay, watermark, generic stock photo',
      model: data.model || 'unknown'
    };
  } catch (error) {
    console.error('generateVisualOptions error:', error);
    // Re-throw with more context
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Visual generation failed: ${message}`);
  }
}

/* =========================================================
   STEP 4 – Final payload composer (Simple Pass-through)
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
    visualStyle,
    visualPrompt: chosenVisual?.prompt || "",
    negativePrompt: negativePrompt || "no bland stock photo, no empty room, no generic object, no illegible clutter, no watermarks, no logos, no extra on-image text",
    dimensions,
    contextId: session.contextId,
    tone: session.tone || "",
    tags: session.tags || []
  };
}
