/* =========================================================
   VIIBE CORE – Stripped down to manual input only
   - Keeps API structure but removes all rules/prompting
   - Manual input flow with basic fallbacks
   ========================================================= */

export const MODELS = {
  text: "gpt-4.1-mini-2025-04-14", 
  visual: "gpt-4.1-mini-2025-04-14",
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

export async function generateVisualOptions(session: Session, { tone, tags = [], textContent = "", textLayoutId = "negativeSpace" }: { tone: string; tags?: string[]; textContent?: string; textLayoutId?: string }): Promise<{
  visualOptions: Array<{ lane: string; prompt: string }>;
  negativePrompt: string;
  model: string;
}> {
  try {
        console.log('🎨 generateVisualOptions called with:', { 
      category: session.category, 
      subcategory: session.subcategory, 
      tone, 
      tags, 
      entity: session.entity,
      textContent,
      textLayoutId 
    });
    
    const systemPrompt = `You MUST generate layout-safe visual prompts. Each prompt MUST end with the required layout token(s).

Layout tokens (REQUIRED - apply exactly one based on textLayoutId):
- negativeSpace  -> MUST end with "clear empty area near largest margin"
- memeTopBottom  -> MUST end with "clear top band, clear bottom band" 
- lowerThird     -> MUST end with "clear lower third"
- sideBarLeft    -> MUST end with "clear left panel"
- badgeSticker   -> MUST end with "badge space top-right"
- subtleCaption  -> MUST end with "clear narrow bottom strip"

CRITICAL REQUIREMENTS:
- Return ONLY JSON:
{
  "visualOptions":[
    {"lane":"literal","prompt":""},
    {"lane":"supportive","prompt":""},
    {"lane":"alternate","prompt":""},
    {"lane":"creative","prompt":""}
  ],
  "negativePrompt":""
}
- EVERY prompt MUST end with the layout token for the specified textLayoutId
- Subject prompts: short (2-6 words), avoid typography/signage/watermark/logo words, no style words (realistic/anime/3D)
- Option1 literal=mirror textContent; Option2 supportive=audience/props; Option3 alternate=angle/perspective; Option4 creative=symbol/metaphor
- Include tone + tags naturally
- Example format: "birthday cake, clear lower third" (subject + comma + layout token)
- negativePrompt must include: "no background text, no signage, no watermarks, no logos"

EXAMPLE for lowerThird layout:
{
  "visualOptions":[
    {"lane":"literal","prompt":"Person blowing out candles, clear lower third"},
    {"lane":"supportive","prompt":"Friends around cake, clear lower third"},
    {"lane":"alternate","prompt":"Room with balloons, clear lower third"},
    {"lane":"creative","prompt":"Cake shaped like star, clear lower third"}
  ],
  "negativePrompt":"no background text, no signage, no watermarks, no logos"
}`;

    const userPrompt = `Category: ${session.category}
Subcategory: ${session.subcategory}
Tone: ${tone}
TextContent: "${textContent}"
TextLayoutId: ${textLayoutId}  # one of: negativeSpace|memeTopBottom|lowerThird|sideBarLeft|badgeSticker|subtleCaption
Tags: ${tags.join(', ')}
${session.entity ? `Entity: ${session.entity}` : ''}`;

    console.log('🎯 Calling GPT directly for visual generation...');
    const result = await openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-4.1-2025-04-14',
      max_completion_tokens: 300,
      edgeOnly: true
    });

    const finalResult = {
      visualOptions: result.visualOptions || [],
      negativePrompt: result.negativePrompt || "no background text, no watermarks, no signage, no logos",
      model: 'gpt-4.1-2025-04-14'
    };

    console.log('✅ Visual generation successful:', finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error in generateVisualOptions:', error);
    // Fallback to empty options on error
    const errorResult = {
      visualOptions: [],
      negativePrompt: "no background text, no watermarks, no signage, no logos",
      model: "error"
    };
    (errorResult as any).errorCode = "GENERATION_FAILED";
    return errorResult;
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
    negativePrompt: negativePrompt || "no background text, no watermarks, no signage, no logos",
    dimensions,
    contextId: session.contextId,
    tone: session.tone || "",
    tags: session.tags || []
  };
}
