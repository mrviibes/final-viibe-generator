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
    
    const systemPrompt = `Generate 4 DISTINCT visual prompts with explicit lane roles and layout tokens.

Return ONLY valid JSON:
{
  "visualOptions":[
    {"lane":"literal","prompt":"..."},
    {"lane":"supportive","prompt":"..."},
    {"lane":"alternate","prompt":"..."},
    {"lane":"creative","prompt":"..."}
  ],
  "negativePrompt":"..."
}

LAYOUT TOKENS (REQUIRED - append exactly one based on textLayoutId):
- negativeSpace  → ", clear empty area near largest margin"
- memeTopBottom  → ", clear top band, clear bottom band" 
- lowerThird     → ", clear lower third"
- sideBarLeft    → ", clear left panel"
- badgeSticker   → ", badge space top-right"
- subtleCaption  → ", clear narrow bottom strip"

LANE ROLE ENFORCEMENT (CRITICAL):
1. LITERAL = Direct visual match to textContent/main anchor
   - Use the primary subject mentioned in text
   - Most straightforward interpretation

2. SUPPORTIVE = Audience/environment reacting to the scene
   - MUST avoid the main anchor used by Literal
   - Focus on: crowd, audience, setting, props, reactions
   - If Literal uses "cake", Supportive uses "party guests" or "decorations"

3. ALTERNATE = Completely different perspective/subject
   - MUST avoid main anchor AND supportive elements
   - Different angle, time, or viewpoint of same context
   - If birthday context: Literal=cake, Supportive=guests, Alternate=gift table

4. CREATIVE = Abstract/symbolic/metaphorical representation
   - MUST be conceptually different from all above
   - Symbolic objects, artistic interpretations, metaphors
   - If birthday: Literal=cake, Supportive=guests, Alternate=gifts, Creative=time passing

VARIANCE RULES (ENFORCE STRICTLY):
- NO overlap between lanes (if Literal uses X, others cannot use X)
- NO rephrasing same concept ("person at cake" vs "man near cake" = FORBIDDEN)
- Each lane must introduce NEW visual elements
- At least 3 different anchor objects across the 4 prompts
- Force cognitive diversity, not linguistic variations

PROMPT FORMAT:
- Short subject description (2-6 words)
- NO style words (realistic/anime/3D/etc)
- NO text-related words (signage/watermark/logo)  
- End with comma + layout token
- Example: "birthday cake, clear lower third"

NEGATIVE PROMPT REQUIREMENTS:
Must include: "no background text, no signage, no watermarks, no logos, no typography"

BULLETPROOF EXAMPLE for lowerThird + birthday cake text:
{
  "visualOptions":[
    {"lane":"literal","prompt":"Birthday cake with candles, clear lower third"},
    {"lane":"supportive","prompt":"Party guests celebrating, clear lower third"},
    {"lane":"alternate","prompt":"Gift table with presents, clear lower third"},
    {"lane":"creative","prompt":"Hourglass with confetti, clear lower third"}
  ],
  "negativePrompt":"no background text, no signage, no watermarks, no logos, no typography"
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
