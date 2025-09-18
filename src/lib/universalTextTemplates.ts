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
Style: modern sans-serif, medium-large, high contrast, meme-ready. 
Text must occupy no more than 30-35% of total image height.
Keep caption proportional to scene, not dominating the composition.
Do not split the caption into multiple boxes. 
Do not reword, shorten, or paraphrase the caption. 
Render the caption as one continuous sentence exactly as provided. 
Text must be fully clear, legible, and unbroken.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`,
    strengthLevels: {
      level2: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: one single caption block only spanning the meme top/bottom band. Do not split into multiple boxes.
Style: modern sans-serif, medium-large, high contrast, meme-ready.
Text must occupy no more than 30-35% of total image height.
Keep caption proportional to scene, not dominating the composition.
Do not reword, shorten, paraphrase, or introduce spelling mistakes.
The text must be fully clear, legible, and match exactly as one continuous sentence.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`,
      level3: `TEXT INSTRUCTION (CRITICAL - ABSOLUTE PRIORITY): The caption is mandatory and critical.
Render this exact text once: "[FINAL_TEXT]".
Placement: one single caption block only spanning the meme top/bottom band.
Style: modern sans-serif, medium-large, high contrast, meme-ready.
Text must occupy no more than 30-35% of total image height.
Keep caption proportional to scene, not dominating the composition.
Absolutely no splitting, duplication, paraphrasing, or spelling mistakes.
The caption must be rendered exactly once, in one block, with perfect spelling and clarity.

[SCENE_DESCRIPTION]
Composition must preserve the meme top and bottom bands for caption placement.`
    },
    negativePrompt: `no oversized captions, no text covering more than 35% of image, no text dominating the scene,
no multiple text boxes, no split captions, no reworded text, no broken or garbled letters,
no paraphrased or shortened text, no spelling mistakes, no duplicated captions,
no background words, no song titles, no album names, no filler text, no poster text, no fake names, no track listings,
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
Text must occupy no more than 25% of total image height.
The text must be proportional to scene and avoid covering main subjects.

[SCENE_DESCRIPTION]
Composition must include ample negative space for caption placement.`,
    negativePrompt: `no oversized captions, no text covering more than 25% of image, no text dominating the scene,
no floating text boxes, no comic font, no overlapping main subject,
no distorted text, no duplicated words, no blurry letters,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
no extra random captions, no watermarks, no logos`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT INSTRUCTION (CRITICAL - ABSOLUTE PRIORITY): Render this exact text once: "[FINAL_TEXT]".
Placement: clean banner-style caption confined to bottom third of the image only.
Style: cinematic lower-third aesthetic, modern sans-serif, centered or justified alignment,
subtle semi-transparent band if needed for readability.
Text must occupy no more than 25% of total image height.
Do not extend into main subject area.
Text must be sharp, clear, and high contrast against background. No garbling, no distortion.

[SCENE_DESCRIPTION]
Composition must leave space for a lower-third banner.`,
    negativePrompt: `no oversized captions, no text covering more than 25% of image height, no text extending into main subject area,
no thick cartoon banners, no bold comic fonts, no clashing colors,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
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
Text block must stay within left 25% of canvas width, not cover main subject.
Text must be clear, elegant, and cinematic.

[SCENE_DESCRIPTION]
Composition must leave space on left side for sidebar text.`,
    negativePrompt: `no text outside left panel, no text covering more than 25% width, no text dominating the scene,
no comic book panels, no tacky colored boxes, no duplicated captions,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
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
Text block must stay within right 25% of canvas width, not cover main subject.
Text must be clear, elegant, and cinematic.

[SCENE_DESCRIPTION]
Composition must leave space on right side for sidebar text.`,
    negativePrompt: `no text outside right panel, no text covering more than 25% width, no text dominating the scene,
no comic book panels, no tacky colored boxes, no duplicated captions,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
no overlapping subject, no blurry or warped text, no watermarks`
  },
  {
    id: "badgeSticker",
    label: "Badge/Sticker Callout",
    description: "Text inside a clean modern badge or sticker element",
    positivePrompt: `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "[FINAL_TEXT]".
Placement: text must appear inside a small and contained badge or sticker element.
Style: cinematic design aesthetic, minimal badge shapes (circle, ribbon, starburst),
modern sans-serif font, high readability, subtle drop shadow or stroke if needed.
Badge size must be no more than 15-20% of total image area.
Badge must not dominate or cover main subject. Badge must feel professional, not clipart.

[SCENE_DESCRIPTION]
Composition must include room for decorative badge caption.`,
    negativePrompt: `no oversized badges, no badges covering more than 20% of canvas, no meme bands, no text dominating the scene,
no tacky emoji-style stickers, no cluttered clipart,
no distorted shapes, no comic fonts, no duplicated text,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
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
Text must occupy less than 10% of total image height.
The caption must be cinematic and refined, truly subtle and unobtrusive.

[SCENE_DESCRIPTION]
Composition must include unobtrusive caption area.`,
    negativePrompt: `no oversized captions, no text covering more than 10% of image height, no meme-style bold blocks,
no oversized meme text, no comic fonts, no tacky outlines,
no background words, no song titles, no album names, no filler text, no poster text, no fake names,
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