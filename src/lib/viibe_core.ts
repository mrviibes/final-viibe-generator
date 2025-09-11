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

// Use direct Edge Function endpoint for visual generation
export async function generateVisualOptions(session: Session, { tone, tags = [], textContent = "", textLayoutId = "negativeSpace", recommendationMode = "balanced" }: { tone: string; tags?: string[]; textContent?: string; textLayoutId?: string; recommendationMode?: "balanced" | "cinematic" | "surreal" | "dynamic" | "chaos" | "exaggerated" }): Promise<{
  visualOptions: Array<{ lane: string; prompt: string }>;
  negativePrompt: string;
  model: string;
}> {
  try {
    console.log('🎨 generateVisualOptions calling new Edge Function:', { 
      category: session.category, 
      subcategory: session.subcategory, 
      tone, 
      tags, 
      entity: session.entity,
      textContent,
      textLayoutId,
      recommendationMode
    });

    // Parse visual tags into hard tags (appear literally) and soft tags (influence style)
    const { hardTags, softTags } = parseVisualTags(tags);
    console.log('🏷️ Parsed visual tags:', { hardTags, softTags });
    
    // Call the new generate-visuals Edge Function
    const { data, error } = await supabase.functions.invoke('generate-visuals', {
      body: {
        final_text: textContent,
        category: session.category,
        subcategory: session.subcategory,
        mode: recommendationMode,
        layout_token: textLayoutId
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(error.message || 'Visual generation failed');
    }

    if (!data?.success) {
      console.error('Visual generation failed:', data?.error);
      throw new Error(data?.error || 'No concepts returned');
    }

    // Transform the response to match expected format
    const visualOptions = data.concepts.map((concept: any) => ({
      lane: concept.lane,
      prompt: concept.text
    }));

    const finalResult = {
      visualOptions,
      negativePrompt: "no bland stock photo, no empty room, no generic object, no illegible clutter, no watermarks, no logos, no extra on-image text",
      model: data.model || 'gpt-5-mini-2025-08-07'
    };

    console.log('✅ Visual generation successful:', finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error in generateVisualOptions:', error);
    // Return error state instead of empty options
    const errorResult = {
      visualOptions: [],
      negativePrompt: "no bland stock photo, no empty room, no generic object, no illegible clutter, no watermarks, no logos, no extra on-image text",
      model: "error"
    };
    (errorResult as any).errorCode = "GENERATION_FAILED";
    throw error; // Re-throw to trigger proper error handling in UI
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
