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
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: MANDATORY dedicated horizontal text bands at top/bottom - NEVER on objects, cakes, balloons, or scene elements.
TEXT BANDS: Create distinct typography layers separate from scene. Text must float above/below image content.
STYLE: Bold sans-serif in high-contrast bands with solid backgrounds, fully legible, professional meme format.
SCENE: [SCENE_DESCRIPTION]  
CRITICAL: Scene objects (cakes, balloons, signs, clothing, walls) must have NO TEXT on them. Text only in dedicated bands.`,
    negativePrompt: `NEVER write text on cakes, balloons, t-shirts, signs, walls, or any scene objects. no text on cake surfaces, no text on object surfaces, no embedded scene text, no cake writing, no balloon text, no sign text, no duplicate captions, no split captions, no fragmented text, no distorted text, no object-surface text placement`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Natural empty margin space, no more than 25% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear empty space for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Clean banner across bottom third, no more than 25% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear bottom third for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
  },
  {
    id: "sideBarLeft",
    label: "Side Bar (Left)",
    description: "Vertical caption panel on the left side",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Left side panel, within 25% of canvas width, aligned cleanly.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear left panel for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
  },
  {
    id: "sideBarRight",
    label: "Side Bar (Right)",
    description: "Vertical caption panel on the right side",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Right side panel, within 25% of canvas width, aligned cleanly.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear right panel for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
  },
  {
    id: "badgeSticker",
    label: "Badge/Sticker Callout",
    description: "Text inside a clean modern badge or sticker element",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Inside contained badge or sticker element, no larger than 20% of canvas area.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear badge area for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
  },
  {
    id: "subtleCaption",
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Small, unobtrusive, less than 10% of image height, but fully legible.
STYLE: Modern sans-serif, bold, high contrast, fully legible.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear corner space for the caption.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos`
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