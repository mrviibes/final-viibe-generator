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
PLACEMENT: Top/bottom band - CRITICAL: Caption must occupy no more than 25% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Scale font DOWN to stay within height limit.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear top/bottom band for the caption. DO NOT EXCEED 25% HEIGHT.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill canvas, NEVER exceed size limits`,
    strengthLevels: {
      level2: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Top/bottom band - MAXIMUM 25% height constraint. Scale font smaller if needed.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Font size must stay within bounds.
SCENE: [SCENE_DESCRIPTION]
SPACE: STRICTLY preserve top/bottom band within 25% height limit. NEVER overflow.`,
      level3: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Top/bottom band - ABSOLUTE 25% height limit. Use smallest readable font if necessary.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Prioritize constraint compliance over size.
SCENE: [SCENE_DESCRIPTION]
SPACE: MANDATORY 25% height limit. Reduce font size before breaking constraint.`
    }
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Natural empty margin space - CRITICAL: No more than 20% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Scale font to stay within limits.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear empty space for caption. DO NOT EXCEED 20% HEIGHT.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill space, NEVER exceed size limits`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Clean banner across bottom third - CRITICAL: Maximum 20% of image height.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Font size must respect height limit.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear bottom third within 20% height constraint.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER stretch text to fill banner, NEVER exceed 20% height`
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
PLACEMENT: Inside contained badge or sticker element - CRITICAL: Maximum 15% of canvas area.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Scale down to fit badge constraints.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear badge area within 15% size limit.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER overflow badge bounds, NEVER exceed 15% area`
  },
  {
    id: "subtleCaption",
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `TEXT: Render this exact caption once: "[FINAL_TEXT]".
PLACEMENT: Small, unobtrusive - CRITICAL: Maximum 10% of image height, but fully legible.
STYLE: Modern sans-serif, bold, high contrast, fully legible. Minimize size while maintaining readability.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear corner space within 10% height constraint.`,
    negativePrompt: `no duplicate captions, no split or fragmented captions, no extra background words, no distorted or garbled text, no filler text or random names, no watermarks or logos, NEVER exceed 10% height, keep minimal but readable`
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