// Step-4 Payload Builder - Clean structured JSON for image generation

export interface Step4Payload {
  prompt: string;
  text: string;
  style_type: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_2A_TURBO' | 'V_3';
  layout_token: string;
  magic_prompt_option: 'AUTO';
  negative_prompt?: string;
}

// Style mapping for Step-4 payload
export function mapStyleToStep4(visualStyle: string): Step4Payload['style_type'] {
  const styleMap: Record<string, Step4Payload['style_type']> = {
    'realistic': 'REALISTIC',
    'caricature': 'DESIGN',
    'anime': 'ANIME',
    '3d animated': 'RENDER_3D',
    'illustrated': 'DESIGN',
    'pop art': 'DESIGN',
    'general': 'GENERAL'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'REALISTIC';
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

// Sanitize prompt to remove any text/style labels and extract only visual scene
function sanitizePromptForScene(prompt: string): string {
  if (!prompt) return '';
  
  // Remove common labels like "Text: ...", "Style: ...", "Background: ..."
  let sanitized = prompt
    .replace(/Text:\s*[^,]*,?\s*/gi, '')
    .replace(/Style:\s*[^,]*,?\s*/gi, '')
    .replace(/Background:\s*[^,]*,?\s*/gi, '')
    .replace(/Visual:\s*/gi, '');
  
  // Extract content after "Visual:" if present
  const visualMatch = prompt.match(/Visual:\s*([^,]+)/i);
  if (visualMatch) {
    sanitized = visualMatch[1].trim();
  }
  
  return sanitized.trim();
}

// Auto-inject birthday props for Celebrations → Birthday
function injectBirthdayProps(scene: string, category?: string, subcategory?: string): string {
  if (category?.toLowerCase() === 'celebrations' && subcategory?.toLowerCase() === 'birthday') {
    const BIRTHDAY_PROPS = ['balloons', 'confetti', 'birthday cake', 'party hats', 'gifts', 'streamers'];
    
    // Check if scene already has birthday props
    const hasExistingProps = BIRTHDAY_PROPS.some(prop => 
      scene.toLowerCase().includes(prop.toLowerCase())
    );
    
    if (!hasExistingProps) {
      // Pick 2 random props (deterministic based on scene content)
      const seed = scene.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const shuffled = [...BIRTHDAY_PROPS].sort(() => (seed % 13) / 13 - 0.5);
      const selectedProps = shuffled.slice(0, 2);
      
      // Add party setting if missing
      const hasPartySetting = /table|room|party|decor/i.test(scene);
      const setting = hasPartySetting ? '' : ', on a party table';
      
      return `${scene}, surrounded by ${selectedProps.join(' and ')}${setting}`;
    }
  }
  
  return scene;
}

// Layout-aware prompt builder (visual scene only, no text injection)
function buildLayoutAwarePrompt(layoutToken: string, chosenVisual: string, visualTags?: string, category?: string, subcategory?: string): string {
  // Sanitize and inject birthday props if needed
  let sanitizedVisual = sanitizePromptForScene(chosenVisual || 'family living room with cozy atmosphere');
  sanitizedVisual = injectBirthdayProps(sanitizedVisual, category, subcategory);
  
  const layoutPrompts: Record<string, string> = {
    'side_bar_left': `${sanitizedVisual}, clear left panel`,
    'lower_third': `${sanitizedVisual}, clear lower third`,
    'meme_top_bottom': `${sanitizedVisual}, clear top band, clear bottom band`,
    'subtle_caption': `${sanitizedVisual}, clear narrow bottom strip`,
    'badge_sticker': `${sanitizedVisual}, badge space top-right`,
    'negative_space': `${sanitizedVisual}, clear empty area near largest margin`
  };
  
  let finalPrompt = layoutPrompts[layoutToken] || layoutPrompts['negative_space'];
  
  // Add visual tags only (never text overlay content)
  if (visualTags && visualTags !== "None" && !visualTags.toLowerCase().includes('text:')) {
    // Filter out any text-related content from visual tags
    const cleanVisualTags = visualTags.replace(/text:\s*[^,]+,?\s*/gi, '').trim();
    if (cleanVisualTags) {
      finalPrompt += `, ${cleanVisualTags}`;
    }
  }
  
  return finalPrompt;
}

// Enhanced negative prompt to block unwanted text generation
function buildNegativePrompt(layoutToken: string): string {
  return 'no background text, no watermarks, no signage, no logos, no typography, no written words, no captions, no labels, no UI elements';
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
  category?: string;
  subcategory?: string;
}

// Main Step-4 payload builder
export function buildStep4Payload(input: Step4BuilderInput, model?: 'V_2A_TURBO' | 'V_3'): Step4Payload {
  const layoutToken = mapLayoutToStep4(input.layoutId);
  const prompt = buildLayoutAwarePrompt(
    layoutToken, 
    input.chosenVisual || '', 
    input.visualTags, 
    input.category, 
    input.subcategory
  );
  
  const payload: Step4Payload = {
    prompt,
    text: validateText(input.finalText),
    style_type: mapStyleToStep4(input.visualStyle),
    aspect_ratio: mapAspectRatioToStep4(input.aspectRatio),
    model: model || 'V_2A_TURBO',
    layout_token: layoutToken,
    magic_prompt_option: 'AUTO',
    negative_prompt: input.negativePrompt || buildNegativePrompt(layoutToken) || undefined
  };
  
  // Log for debugging
  console.log('=== Step-4 Payload Debug ===');
  console.log('Original visual:', input.chosenVisual);
  console.log('Sanitized prompt:', prompt);
  console.log('Category/Subcategory:', input.category, '/', input.subcategory);
  console.log('Final payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}