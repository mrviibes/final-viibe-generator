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
    positivePrompt: `Text: "[FINAL_TEXT]". Top/bottom band, clean sans-serif, readable size.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, split text, wrong spelling`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `Text: "[FINAL_TEXT]". In empty space, clean font, readable.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, overlapping subject, wrong spelling`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `Text: "[FINAL_TEXT]". Bottom third banner, clean font.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, wrong spelling, overlapping subject`
  },
  {
    id: "sideBarLeft",
    label: "Side Bar (Left)",
    description: "Vertical caption panel on the left side",
    positivePrompt: `Text: "[FINAL_TEXT]". Left side panel, clean font.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, wrong spelling, overlapping subject`
  },
  {
    id: "sideBarRight",
    label: "Side Bar (Right)",
    description: "Vertical caption panel on the right side",
    positivePrompt: `Text: "[FINAL_TEXT]". Right side panel, clean font.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, wrong spelling, overlapping subject`
  },
  {
    id: "badgeSticker",
    label: "Badge/Sticker Callout",
    description: "Text inside a clean modern badge or sticker element",
    positivePrompt: `Text: "[FINAL_TEXT]". In small badge, clean font.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, wrong spelling, oversized badge`
  },
  {
    id: "subtleCaption",
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `Text: "[FINAL_TEXT]". Small corner text, clean font.

[SCENE_DESCRIPTION]`,
    negativePrompt: `blurry text, wrong spelling, oversized text`
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