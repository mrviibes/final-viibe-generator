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

export async function generateVisualOptions(session: Session, { tone, tags = [], textContent = "", textLayoutId = "negativeSpace", spiceLevel = "spicy" }: { tone: string; tags?: string[]; textContent?: string; textLayoutId?: string; spiceLevel?: "balanced" | "spicy" | "wild" }): Promise<{
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
    
    const systemPrompt = `Generate 4 DISTINCT visual prompts for image generation. Return ONLY valid JSON:

{
  "visualOptions":[
    {"lane":"option1","prompt":"..."},
    {"lane":"option2","prompt":"..."},
    {"lane":"option3","prompt":"..."},
    {"lane":"option4","prompt":"..."}
  ],
  "negativePrompt":"..."
}

CRITICAL RULES:

1. **Strong Variance Required**
   - Each option must be a COMPLETELY different visual concept
   - NO similar subjects (if one uses "cake", others cannot use "cake", "dessert", or "food")
   - NO rephrasing same idea ("birthday party" vs "celebration" = FORBIDDEN)
   - Force cognitive diversity across all 4 options

2. **Dynamic Compact Clause Format (6-16 words)**:
   Each prompt must include ALL of these elements in a compact clause:
   - ONE dynamic action verb (bursting, shattering, sprinting, lunging, whipping, colliding, floating, spinning, cascading, erupting)
   - ONE camera/perspective cue (low-angle shot, overhead view, dutch angle, extreme close-up, tracking shot, wide-angle, macro view)
   - ONE lighting/mood/color accent (rim light, backlit glow, neon cyan, moody teal, golden hour, dramatic shadows, vibrant magenta)
   - The layout token at the end
   
   **Spice Level Behavior**:
   - balanced → tasteful motion/lighting cues, mild color accents, natural dynamics
   - spicy → pronounced motion, bold camera angles, strong color accents, energetic action
   - wild → maximal motion/energy, surreal or symbolic twists (SFW), striking color palettes, dramatic dynamics

3. **Layout Tokens** (append exactly one based on textLayoutId):
   - negativeSpace  → ", clear empty area near largest margin"
   - memeTopBottom  → ", clear top band, clear bottom band" 
   - lowerThird     → ", clear lower third"
   - sideBarLeft    → ", clear left panel"
   - badgeSticker   → ", badge space top-right"
   - subtleCaption  → ", clear narrow bottom strip"

4. **Visual Concept Enforcement**:
   - **Option1**: Direct literal interpretation with dynamic action
   - **Option2**: Environment/audience/setting perspective with different camera angle
   - **Option3**: Related but different object/angle with unique lighting  
   - **Option4**: Abstract/symbolic representation with dramatic visual elements

5. **Format Requirements**:
   - NO engine style words (realistic/anime/3D/cinematic/etc)
   - NO text-related terms (signage/watermark/logo/typography)
   - Each camera cue and main noun must be different across all 4 options

6. **Negative Prompt**: Always include "no background text, no signage, no watermarks, no logos, no typography"

EXAMPLE for birthday + spicy + lowerThird:
{
  "visualOptions":[
    {"lane":"option1","prompt":"cake bursting with candles, low-angle shot, golden hour glow, clear lower third"},
    {"lane":"option2","prompt":"crowd cheering wildly, overhead view, neon party lights, clear lower third"},  
    {"lane":"option3","prompt":"confetti cascading down, macro close-up, vibrant magenta accent, clear lower third"},
    {"lane":"option4","prompt":"balloon floating upward, dutch angle, dramatic backlight, clear lower third"}
  ],
  "negativePrompt":"no background text, no signage, no watermarks, no logos, no typography"
}`;

    const userPrompt = `Category: ${session.category}
Subcategory: ${session.subcategory}
Tone: ${tone}
SpiceLevel: ${spiceLevel}  # one of: balanced|spicy|wild
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
