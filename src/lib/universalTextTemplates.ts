// Universal Prompt Templates for Modern Text Placement
// Each template ensures cinematic, modern sans-serif styling

export interface TextPlacementTemplate {
  id: string;
  label: string;
  positivePrompt: string;
  negativePrompt: string;
  description: string;
  strengthLevels?: {
    level2: string;
    level3: string;
  };
}

export const universalTextPlacementTemplates: TextPlacementTemplate[] = [
  {
    id: "memeTopBottom",
    label: "Meme Top/Bottom",
    description: "Bold captions in clear horizontal bands at top and/or bottom",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: one single bold caption spanning the meme top/bottom band. 
Style: modern sans-serif, large, high contrast, meme-ready. 
Do not split the caption into multiple boxes. 
Do not reword, shorten, or paraphrase the caption. 
Render the caption as one continuous sentence exactly as provided. 
Text must be fully clear, legible, and unbroken.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`,
    strengthLevels: {
      level2: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: one single caption block only spanning the meme top/bottom band. Do not split into multiple boxes.
Style: modern sans-serif, large, high contrast, meme-ready.
Do not reword, shorten, paraphrase, or introduce spelling mistakes.
The text must be fully clear, legible, and match exactly as one continuous sentence.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`,
      level3: `TEXT INSTRUCTION (CRITICAL - ABSOLUTE PRIORITY): The caption is mandatory and critical.
Render this exact text once: "[FINAL_TEXT]".
Placement: one single caption block only spanning the meme top/bottom band.
Style: modern sans-serif, large, high contrast, meme-ready.
Absolutely no splitting, duplication, paraphrasing, or spelling mistakes.
The caption must be rendered exactly once, in one block, with perfect spelling and clarity.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`
    },
    negativePrompt: `no multiple text boxes, no split captions, no reworded text, no broken or garbled letters,
no paraphrased or shortened text, no spelling mistakes, no duplicated captions,
no abstract filler shapes, no empty generic backgrounds, 
no watermarks, no logos, no ornamental or handwritten fonts, no faded or blurry text, no subject substitutions`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: integrated seamlessly into natural empty/negative space of the image.
Style: clean modern sans-serif, elegant alignment, soft stroke or glow for readability.
The text must be large enough to read but feel naturally part of the scene.

[SCENE_DESCRIPTION]
Composition must include ample negative space for caption placement.`,
    negativePrompt: `no floating text boxes, no comic font, no overlapping main subject,
no distorted text, no duplicated words, no blurry letters,
no extra random captions, no watermarks, no logos`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT INSTRUCTION (CRITICAL - ABSOLUTE PRIORITY): Render this exact text once: "[FINAL_TEXT]".
Placement: clean banner-style caption across bottom third of the image.
Style: cinematic lower-third aesthetic, modern sans-serif, centered or justified alignment,
subtle semi-transparent band if needed for readability.
Text must be sharp, clear, and high contrast against background. No garbling, no distortion.
TEXT MUST BE PERFECTLY LEGIBLE AND MATCH EXACTLY.

[SCENE_DESCRIPTION]
Composition must leave space for a lower-third banner.`,
    negativePrompt: `no thick cartoon banners, no bold comic fonts, no clashing colors,
no duplicated captions, no blurry text, no watermarks, no logos`
  },
  {
    id: "sideBarLeft",
    label: "Side Bar (Left)",
    description: "Vertical caption panel on the left side",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: vertical side caption panel (left) with modern design aesthetic.
Style: clean modern sans-serif, vertical or stacked alignment,
subtle background strip if needed for readability.
Text must be clear, elegant, and cinematic.

[SCENE_DESCRIPTION]
Composition must leave space on left side for sidebar text.`,
    negativePrompt: `no comic book panels, no tacky colored boxes, no duplicated captions,
no overlapping subject, no blurry or warped text, no watermarks`
  },
  {
    id: "sideBarRight",
    label: "Side Bar (Right)",
    description: "Vertical caption panel on the right side",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: vertical side caption panel (right) with modern design aesthetic.
Style: clean modern sans-serif, vertical or stacked alignment,
subtle background strip if needed for readability.
Text must be clear, elegant, and cinematic.

[SCENE_DESCRIPTION]
Composition must leave space on right side for sidebar text.`,
    negativePrompt: `no comic book panels, no tacky colored boxes, no duplicated captions,
no overlapping subject, no blurry or warped text, no watermarks`
  },
  {
    id: "badgeSticker",
    label: "Badge/Sticker Callout",
    description: "Text inside a clean modern badge or sticker element",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: text inside a clean modern badge/sticker element.
Style: cinematic design aesthetic, minimal badge shapes (circle, ribbon, starburst),
modern sans-serif font, high readability, subtle drop shadow or stroke if needed.
Badge must feel professional, not clipart.

[SCENE_DESCRIPTION]
Composition must include room for decorative badge caption.`,
    negativePrompt: `no tacky emoji-style stickers, no cluttered clipart,
no distorted shapes, no comic fonts, no duplicated text,
no blurry lettering, no watermarks, no logos`
  },
  {
    id: "subtleCaption",
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: minimal caption overlay near bottom or corner, unobtrusive but legible.
Style: elegant modern sans-serif, small but high-contrast,
subtle shadow or glow for readability.
The caption must be cinematic and refined, not oversized.

[SCENE_DESCRIPTION]
Composition must include unobtrusive caption area.`,
    negativePrompt: `no oversized meme text, no comic fonts, no tacky outlines,
no blurry captions, no duplicated text, no watermarks, no logos`
  }
];

// Helper function to build final prompt with text and scene
export function buildUniversalTextPrompt(
  templateId: string, 
  finalText: string, 
  sceneDescription: string,
  strengthLevel: number = 1
): { positivePrompt: string; negativePrompt: string } {
  const template = universalTextPlacementTemplates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  let basePrompt = template.positivePrompt;
  
  // Apply strength level if available
  if (strengthLevel === 2 && template.strengthLevels?.level2) {
    basePrompt = template.strengthLevels.level2;
  } else if (strengthLevel === 3 && template.strengthLevels?.level3) {
    basePrompt = template.strengthLevels.level3;
  }
  
  const positivePrompt = basePrompt
    .replace('[FINAL_TEXT]', finalText)
    .replace('[SCENE_DESCRIPTION]', sceneDescription);
    
  return {
    positivePrompt,
    negativePrompt: template.negativePrompt
  };
}

// Legacy mapping for backward compatibility
export const legacyLayoutMappings = {
  negativeSpace: "negativeSpace",
  memeTopBottom: "memeTopBottom", 
  lowerThird: "lowerThird",
  sideBarLeft: "sideBarLeft",
  badgeSticker: "badgeSticker",
  subtleCaption: "subtleCaption"
};