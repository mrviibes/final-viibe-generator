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

export async function generateVisualOptions(session: Session, { tone, tags = [], textContent = "", textLayoutId = "negativeSpace", recommendationMode = "balanced" }: { tone: string; tags?: string[]; textContent?: string; textLayoutId?: string; recommendationMode?: "balanced" | "cinematic" | "surreal" | "dynamic" | "chaos" | "exaggerated" }): Promise<{
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

    // Parse visual tags into hard tags (appear literally) and soft tags (influence style)
    const { hardTags, softTags } = parseVisualTags(tags);
    console.log('🏷️ Parsed visual tags:', { hardTags, softTags });
    
    // Generate mode-specific style guidance with stronger effects
    const getModeGuidance = (mode: string) => {
      switch (mode) {
        case 'cinematic':
          return 'Movie-poster energy: hero moment, spotlights, dynamic camera, dramatic color contrast. Add motion cues (spray, turf flecks, confetti), crowd bokeh, epic atmosphere.';
        case 'surreal':
          return 'Bend reality to heighten the joke (floating gear, oversized props, dream color fog). Impossible physics allowed; maintain subcategory identity.';
        case 'dynamic':
          return 'Freeze a peak action beat (mid-air dive, sprint, tackle, leap). Emphasize speed trails, motion blur, sweat, impact debris; keep background readable.';
        case 'chaos':
          return 'Mash two unexpected visual ideas tied to subcategory and the joke. Bold palettes, playful composition; still leave layout space clean.';
        case 'exaggerated':
          return 'Caricature—big heads, small bodies (funny but polished), expressive faces. Keep gear accurate to subcategory so it reads instantly.';
        default: // balanced
          return 'Polished, realistic sports/photojournalism look. Clear subject action relevant to subcategory, clean composition for layout.';
      }
    };

    const systemPrompt = `You generate 4 vivid, funny, cinematic visual scene ideas as JSON only.  
Return EXACTLY:

{
  "visualOptions":[
    {"lane":"option1","prompt":"..."},
    {"lane":"option2","prompt":"..."},
    {"lane":"option3","prompt":"..."},
    {"lane":"option4","prompt":"..."}
  ],
  "negativePrompt":"..."
}

## Core Rules:
- Visuals must tie directly to the provided joke/caption text.  
- Must be cinematic, exciting, and imaginative — NOT generic filler.  
- Always leave [${textLayoutId}] clean for text placement.  
- Concepts should feel like fun, shareable meme images that match the joke.  

## Negative Rules:
no bland stock photo, no empty rooms, no balloons/cake placeholders unless the joke explicitly requires them,  
no random objects with no context, no abstract shapes, no watermarks, no logos, no on-image text.  

## Mode Behavior (enforce one block based on user's [${recommendationMode}] selection):

[Balanced]  
- Polished, realistic photography style.  
- Clear subject action directly tied to [${session.subcategory}] and the joke.  
- Clean composition, good lighting, readable negative space.  

[Cinematic Action]  
- Movie-poster energy.  
- Dramatic lighting, spotlight, motion blur, debris/confetti in air.  
- Epic atmosphere, stadium or stage feel.  

[Dynamic Action]  
- Freeze-frame chaos or peak energy moment.  
- Mid-air dives, jumping, slipping, crashing, sweating, exploding candles, exaggerated motion.  
- Focused subject with visible kinetic effects.  

[Surreal / Dreamlike]  
- Impossible or dreamlike imagery tied to joke (floating objects, melting props, warped reflections, giant clocks).  
- Bend physics and scale but keep [${session.subcategory}] context recognizable.  

[Randomized Chaos]  
- Unexpected mashup of joke + [${session.subcategory}] + something absurd.  
- Wild palettes, glitchy energy, "surprise me" feel.  
- Must remain funny, not abstract filler.  

[Exaggerated Proportions]  
- Cartoonish caricature style.  
- Oversized heads, tiny bodies, comically exaggerated props.  
- Big emotions, meme-friendly composition.  

---

## Now generate 4 distinct visual concepts that:  
- Match the chosen mode,  
- Tie directly to the joke text,  
- Feel cinematic and exciting,  
- And could stand alone as a funny, shareable image.`;

    const userPrompt = `Context:\n- final_text: "${textContent}"\n- category: ${session.category}\n- subcategory: ${session.subcategory}\n- mode: ${recommendationMode}\n- layout_token: ${textLayoutId}\n- hard_tags: ${hardTags.join(', ') || 'none'}\n- soft_tags: ${softTags.join(', ') || 'none'}`;

    console.log('🎯 Calling GPT directly for visual generation...');
    const result = await openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-5-mini-2025-08-07',
      max_completion_tokens: 800,
      edgeOnly: true
    });

    const concepts = (result.concepts || []).map((c: any) => ({ lane: c.lane, prompt: c.text }));
    const legacyVisuals = (result.visualOptions || []).map((v: any) => ({ lane: v.lane, prompt: v.prompt }));
    const mergedOptions = concepts.length ? concepts : legacyVisuals;
    const finalResult = {
      visualOptions: mergedOptions,
      negativePrompt: "no generic placeholders, no bland stock photo, no random empty rooms, no abstract shapes, no watermarks, no logos, no on-image text",
      model: 'gpt-5-mini-2025-08-07'
    };

    console.log('✅ Visual generation successful:', finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error in generateVisualOptions:', error);
    // Fallback to empty options on error
    const errorResult = {
      visualOptions: [],
      negativePrompt: "no bland stock photo, no empty room, no generic object, no illegible clutter, no watermarks, no logos, no extra on-image text",
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
    negativePrompt: negativePrompt || "no bland stock photo, no empty room, no generic object, no illegible clutter, no watermarks, no logos, no extra on-image text",
    dimensions,
    contextId: session.contextId,
    tone: session.tone || "",
    tags: session.tags || []
  };
}
