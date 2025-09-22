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
    positivePrompt: `TEXT: Render this caption once: "[FINAL_TEXT]".
PLACEMENT: Place the caption in a single dedicated band at the top OR bottom margin. 
STYLE: Bold, sans-serif, high contrast, fully legible. 
Keep the caption completely outside the subject's face, head, eyes, or body. 
Keep the caption away from cake, balloons, clothing, and other objects. 
Caption must sit in empty background space or margin only.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate captions, no extra captions, no split or fragmented captions, no text at both top and bottom, no text on faces, heads, eyes, or bodies, no text on objects (cake, balloons, clothing, walls, props), no distorted text, no low-contrast text`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `TEXT: Render this caption once: "[FINAL_TEXT]".
PLACEMENT: Place caption in empty margins, away from people's faces.
STYLE: Bold sans-serif, high contrast, fully legible.
Keep all text outside subject bounding box, away from faces, heads, eyes, or bodies.
SCENE: [SCENE_DESCRIPTION]
SPACE: Preserve clear empty space for the caption.`,
    negativePrompt: `no duplicate captions, no extra captions, no bottom text, no extra text bands, no split captions, never place text over faces, heads, eyes, or bodies, keep all text outside subject bounding box, no text on objects (cake, balloons, walls, clothing)`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT: Render this caption once: "[FINAL_TEXT]".
PLACEMENT: Place caption in one dedicated band at the bottom margin only. 
Never float text over the subject, ball, hoop, cake, or crowd.
STYLE: Bold sans-serif, high contrast, fully legible, professional format.
Keep text completely outside of faces, heads, bodies, and props.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate captions, no extra text or random characters, no garbled or partial words, no text at top, mid-frame, or floating anywhere, no text over faces, heads, eyes, or bodies, no text on objects (ball, hoop, cake, crowd, bleachers), no split captions, no distorted text, no watermarks or logos`
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