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
  lowerThird: { 
    type: "lowerThirdBanner",
    zones: [
      { pos: "bottom", x: 0, y: "75%", w: "100%", h: "25%", align: "center", valign: "middle", padding: "5%" }
    ]
  },
  sideBarLeft: { 
    type: "sideBarLeft",
    zones: [
      { pos: "left", x: 0, y: 0, w: "25%", h: "100%", align: "center", valign: "middle", padding: "5%" }
    ]
  },
  badgeSticker: { 
    type: "badgeStickerCallout",
    zones: [
      { pos: "top-right", x: "75%", y: 0, w: "25%", h: "25%", align: "center", valign: "middle", padding: "10%" }
    ]
  },
  subtleCaption: { 
    type: "subtleCaption",
    zones: [
      { pos: "bottom", x: 0, y: "90%", w: "100%", h: "10%", align: "center", valign: "middle", padding: "2%" }
    ]
  },
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

// Post-processor for visual options
function normalize(s: string): string {
  return s.trim().replace(/\s{2,}/g, " ");
}

function okLen(s: string): boolean {
  const n = s.split(/\s+/).length; 
  return n >= 3 && n <= 6;
}

export function finalizeVisuals(json: any): any {
  const seen = new Set();
  json.visualOptions = json.visualOptions
    .map((o: any) => ({ ...o, prompt: normalize(o.prompt) }))
    .filter((o: any) => o.prompt && okLen(o.prompt))
    .filter((o: any) => {
      if (seen.has(o.prompt.toLowerCase())) return false; 
      seen.add(o.prompt.toLowerCase()); 
      return true;
    });

  // Light shuffle for randomness
  json.visualOptions.sort(() => Math.random() - 0.5);
  return json;
}

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
    
    const systemPrompt = `Return ONLY JSON:
{"visualOptions":[
  {"lane":"literal","prompt":""},
  {"lane":"supportive","prompt":""},
  {"lane":"alternate","prompt":""},
  {"lane":"creative","prompt":""}
]}

Rules:
- Each "prompt" is a SHORT subject (3–6 words). Natural, scannable.
- NO extra words like "Context", "option1", layout tokens, commas-afterthoughts, or style words.
- Align with category+subcategory, the selected tone, the user's text, and tags.
- Lanes must be DISTINCT:
  * literal = mirrors the text's main idea/action/object
  * supportive = audience/props that reinforce the text
  * alternate = different perspective/scene element from same context
  * creative = symbolic/metaphoric idea
- Randomize wording and focus each time (use synonyms and varied subjects). Avoid reusing the same noun/verb across options if possible.
- Keep it positive/sincere for romantic/sentimental; playful for humorous; edgy for savage, etc.
- Examples of good outputs (just the subject): 
  "Person blowing out candles", "Friends cheering by cake",
  "Room filled with balloons", "Confetti shaped like stars"`;

    const userPrompt = `Category: ${session.category}
Subcategory: ${session.subcategory}
Tone: ${tone}
TextContent: "${textContent}"
Tags: ${tags.join(', ')}`;

    console.log('🎯 Calling GPT for visual generation...');
    const result = await openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      model: 'gpt-4.1-2025-04-14',
      max_completion_tokens: 300,
      edgeOnly: true
    });

    // Apply post-processor for clean, randomized results
    const processedResult = finalizeVisuals(result);
    
    // Validate we have enough options
    if (!processedResult.visualOptions || processedResult.visualOptions.length < 4) {
      console.warn('⚠️ Insufficient visual options after processing, using fallback');
      const fallbackOptions = [
        { lane: "literal", prompt: "Simple visual concept" },
        { lane: "supportive", prompt: "Supporting scene elements" },
        { lane: "alternate", prompt: "Different perspective view" },
        { lane: "creative", prompt: "Abstract symbolic representation" }
      ];
      processedResult.visualOptions = fallbackOptions;
    }

    const finalResult = {
      visualOptions: processedResult.visualOptions || [],
      negativePrompt: "no background text, no signage, no watermarks, no logos, no typography",
      model: 'gpt-4.1-2025-04-14'
    };

    console.log('✅ Visual generation successful:', finalResult);
    return finalResult;
  } catch (error) {
    console.error('Error in generateVisualOptions:', error);
    // Fallback to structured options on error
    const errorResult = {
      visualOptions: [
        { lane: "literal", prompt: "Main subject focus" },
        { lane: "supportive", prompt: "Supporting elements scene" },
        { lane: "alternate", prompt: "Alternative perspective view" },
        { lane: "creative", prompt: "Creative symbolic approach" }
      ],
      negativePrompt: "no background text, no signage, no watermarks, no logos, no typography",
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
