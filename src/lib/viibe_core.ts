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

export async function generateVisualOptions(session: Session, { tone, tags = [], textContent = "", textLayoutId = "negativeSpace", recommendationMode = "balanced" }: { tone: string; tags?: string[]; textContent?: string; textLayoutId?: string; recommendationMode?: "balanced" | "cinematic" | "surreal" | "dynamic" | "chaos" }): Promise<{
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
    
    // Generate mode-specific style guidance
    const getModeGuidance = (mode: string) => {
      switch (mode) {
        case 'cinematic':
          return 'Add dramatic lighting, movie-poster quality, intense atmosphere';
        case 'surreal':
          return 'Add dreamlike elements, impossible physics, unexpected details';
        case 'dynamic':
          return 'Add high energy, movement, action, dramatic framing';
        case 'chaos':
          return 'Mix completely different styles, angles, and unexpected combinations';
        default: // balanced
          return 'Keep it polished but natural, mix realism with creativity';
      }
    };

    const systemPrompt = `Generate 4 COMPLETELY different visual concepts for image generation. Return ONLY valid JSON:

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

1. **Maximum Diversity Required**:
   - Each option must be a TOTALLY different visual concept
   - NO similar subjects, angles, or styles between options
   - Think: person vs object vs scene vs abstract concept
   - Force creative variety - if one is close-up, another is far away
   - Different moods, different energy levels, different visual approaches

2. **Simple, Clear Descriptions (8-15 words)**:
   - Write like you're describing it to a friend
   - Use everyday language, not technical photography terms
   - Focus on what people will see, not camera settings
   - Natural descriptions: "person looking surprised" not "low-angle shot of startled subject"
   - Keep it simple: "bright sunny day" not "golden hour rim lighting"

3. **Concept Variety by Option**:
   - **Option1**: Focus on a person or character (different expression/pose each time)
   - **Option2**: Focus on objects or things (completely different from Option1)
   - **Option3**: Focus on a scene or environment (wide view, setting)
   - **Option4**: Focus on an abstract or creative concept (artistic, unexpected)

4. **Layout Space** (add one based on textLayoutId):
   - negativeSpace  → ", space for text"
   - memeTopBottom  → ", space at top and bottom" 
   - lowerThird     → ", space at bottom"
   - sideBarLeft    → ", space on left side"
   - badgeSticker   → ", space in corner"
   - subtleCaption  → ", space for small text"

5. **Recommendation Mode Effects**:
   ${getModeGuidance(recommendationMode)}

6. **Keep It Natural**:
   - NO technical terms (aperture, ISO, focal length, etc.)
   - NO confusing photography jargon
   - Write how humans naturally describe images
   - Make it easy to understand what the image will look like

7. **Negative Prompt**: "no text, no words, no letters, no watermarks"

EXAMPLE for birthday + balanced:
{
  "visualOptions":[
    {"lane":"option1","prompt":"person blowing out birthday candles with big smile, space at bottom"},
    {"lane":"option2","prompt":"colorful balloons floating in bright room, space at bottom"},  
    {"lane":"option3","prompt":"party decorations scattered on table, space at bottom"},
    {"lane":"option4","prompt":"abstract celebration with confetti explosion, space at bottom"}
  ],
  "negativePrompt":"no text, no words, no letters, no watermarks"
}`;

    const userPrompt = `Category: ${session.category}
Subcategory: ${session.subcategory}
Tone: ${tone}
Recommendation Mode: ${recommendationMode}
Text Content: "${textContent}"
Layout: ${textLayoutId}
Tags: ${tags.join(', ') || 'none'}
${session.entity ? `Specific Topic: ${session.entity}` : ''}`;

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
