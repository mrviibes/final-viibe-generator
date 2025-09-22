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
    positivePrompt: `TEXT: "[FINAL_TEXT]" in meme format. Bold sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "negativeSpace",
    label: "Negative Space",
    description: "Text integrated seamlessly into natural empty areas",
    positivePrompt: `TEXT: "[FINAL_TEXT]" in negative space. Clean sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "lowerThird",
    label: "Lower Third Banner",
    description: "Clean banner-style caption across bottom third",
    positivePrompt: `TEXT: "[FINAL_TEXT]" in lower third banner. Bold sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "sideBarLeft",
    label: "Side Bar (Left)",
    description: "Vertical caption panel on the left side",
    positivePrompt: `TEXT: "[FINAL_TEXT]" on left side. Bold sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "sideBarRight",
    label: "Side Bar (Right)",
    description: "Vertical caption panel on the right side",
    positivePrompt: `TEXT: "[FINAL_TEXT]" on right side. Bold sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "badgeSticker",
    label: "Badge/Sticker Callout",
    description: "Text inside a clean modern badge or sticker element",
    positivePrompt: `TEXT: "[FINAL_TEXT]" in badge format. Bold sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
  },
  {
    id: "subtleCaption",
    label: "Subtle Caption",
    description: "Minimal caption overlay, unobtrusive but legible",
    positivePrompt: `TEXT: "[FINAL_TEXT]" as subtle caption. Clean sans-serif, high contrast.
SCENE: [SCENE_DESCRIPTION]`,
    negativePrompt: `no duplicate text, no distorted letters, no extra captions`
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