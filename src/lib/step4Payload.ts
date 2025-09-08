// Step-4 Payload Builder - Clean structured JSON for image generation

export interface Step4Payload {
  prompt: string;
  text: string;
  style_type: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_2A_TURBO';
  layout_token: string;
  magic_prompt_option: 'AUTO';
  negative_prompt?: string;
}

// Style mapping for Step-4 payload
export function mapStyleToStep4(visualStyle: string): Step4Payload['style_type'] {
  const styleMap: Record<string, Step4Payload['style_type']> = {
    'realistic': 'REALISTIC',
    'caricature': 'DESIGN', // Ideogram limitation
    'anime': 'ANIME',
    '3d animated': 'RENDER_3D',
    'illustrated': 'DESIGN', // Ideogram limitation
    'pop art': 'DESIGN', // Ideogram limitation
    'general': 'GENERAL'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}

// Aspect ratio mapping for Step-4 payload
export function mapAspectRatioToStep4(aspectRatio: string): Step4Payload['aspect_ratio'] {
  const ratioMap: Record<string, Step4Payload['aspect_ratio']> = {
    'Portrait': 'ASPECT_9_16',
    'Landscape': 'ASPECT_16_9',
    'Square': 'ASPECT_1_1',
    'Tall': 'ASPECT_10_16',
    'Wide': 'ASPECT_16_10'
  };
  
  return ratioMap[aspectRatio] || 'ASPECT_16_9';
}

// Layout token mapping for Step-4 payload
export function mapLayoutToStep4(layoutId: string): string {
  const layoutMap: Record<string, string> = {
    'negativeSpace': 'negative_space',
    'memeTopBottom': 'meme_top_bottom',
    'lowerThird': 'lower_third',
    'sideBarLeft': 'side_bar_left',
    'badgeSticker': 'badge_sticker',
    'subtleCaption': 'subtle_caption'
  };
  
  return layoutMap[layoutId] || 'negative_space';
}

// Layout-aware prompt builder (visual only, no text injection)
function buildLayoutAwarePrompt(layoutToken: string, chosenVisual: string, visualTags?: string): string {
  const basePrompt = chosenVisual || 'family living room with cozy atmosphere';
  
  const layoutPrompts: Record<string, string> = {
    'side_bar_left': `${basePrompt}, clear left panel (30-35% width), shift subject right`,
    'lower_third': `${basePrompt}, leave bottom 25% completely clear and uncluttered for text banner`,
    'meme_top_bottom': `${basePrompt}, clear top band and clear bottom band`,
    'subtle_caption': `${basePrompt}, clear narrow bottom strip`,
    'badge_sticker': `${basePrompt}, badge space top-right`,
    'negative_space': `${basePrompt}, clear empty area near largest margin`
  };
  
  let finalPrompt = layoutPrompts[layoutToken] || layoutPrompts['negative_space'];
  
  // Add visual tags if available
  if (visualTags && visualTags !== "None") {
    finalPrompt += `, ${visualTags}`;
  }
  
  return finalPrompt;
}

// Auto-generate negative prompt for overlay layouts
function buildNegativePrompt(layoutToken: string): string {
  const overlayLayouts = ['side_bar_left', 'lower_third', 'meme_top_bottom', 'subtle_caption', 'badge_sticker'];
  
  if (overlayLayouts.includes(layoutToken)) {
    return 'text, letters, words, captions, labels, writing, typography, subtitles';
  }
  
  return '';
}

// Validate final text (≤70 chars, basic punctuation rules)
function validateText(text: string): string {
  let validated = text.trim();
  
  // Truncate if too long
  if (validated.length > 70) {
    validated = validated.substring(0, 67) + '...';
  }
  
  return validated;
}

export interface Step4BuilderInput {
  finalText: string;
  visualStyle: string;
  aspectRatio: string;
  layoutId: string;
  chosenVisual?: string;
  visualTags?: string;
  negativePrompt?: string;
}

// Main Step-4 payload builder
export function buildStep4Payload(input: Step4BuilderInput): Step4Payload {
  const layoutToken = mapLayoutToStep4(input.layoutId);
  const prompt = buildLayoutAwarePrompt(layoutToken, input.chosenVisual || '', input.visualTags);
  const autoNegativePrompt = buildNegativePrompt(layoutToken);
  
  const payload: Step4Payload = {
    prompt,
    text: validateText(input.finalText),
    style_type: mapStyleToStep4(input.visualStyle),
    aspect_ratio: mapAspectRatioToStep4(input.aspectRatio),
    model: 'V_2A_TURBO',
    layout_token: layoutToken,
    magic_prompt_option: 'AUTO',
    negative_prompt: input.negativePrompt || autoNegativePrompt || undefined
  };
  
  // Log for debugging
  console.log('Step-4 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}