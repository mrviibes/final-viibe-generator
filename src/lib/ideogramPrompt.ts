import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export interface IdeogramPrompts {
  positive_prompt: string;
  negative_prompt: string;
  safety_modifications?: {
    prompt_modified: boolean;
    tags_modified: string[];
  };
}

// Font mappings for each tone
const fontsByTone: Record<string, string[]> = {
  romantic: ['elegant serif', 'flowing script'],
  savage: ['bold sans-serif', 'strong condensed'],
  humorous: ['playful rounded', 'friendly sans'],
  celebratory: ['bold script', 'festive serif'],
  motivational: ['strong sans-serif', 'impactful condensed'],
  thankful: ['warm serif', 'grateful script'],
  default: ['clean sans-serif', 'readable serif']
};

// Randomization elements for variety
const lightingVariations = [
  'golden hour lighting', 'soft natural lighting', 'dramatic cinematic lighting',
  'warm atmospheric lighting', 'moody ambient lighting', 'crisp daylight'
];

const angleVariations = [
  'dynamic angle', 'elegant composition', 'cinematic framing',
  'artistic perspective', 'balanced view', 'compelling shot'
];

const moodEnhancers: Record<string, string[]> = {
  romantic: ['intimate atmosphere', 'tender moment', 'loving connection'],
  savage: ['fierce energy', 'bold attitude', 'powerful presence'],
  humorous: ['playful energy', 'fun atmosphere', 'lighthearted mood'],
  celebratory: ['joyful energy', 'festive spirit', 'triumphant mood'],
  motivational: ['inspiring energy', 'determined spirit', 'empowering presence'],
  thankful: ['grateful warmth', 'appreciative energy', 'heartfelt connection'],
  default: ['engaging atmosphere', 'compelling mood', 'captivating energy']
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Enhanced content sanitization for safety compliance
export function sanitizeVisualTag(tag: string): { cleaned: string | null; wasModified: boolean } {
  const safetyReplacements: Record<string, string> = {
    // Explicit terms
    'fake tits': 'elegant figure',
    'big tits': 'confident person',
    'hot busty woman': 'confident woman',
    'busty woman': 'confident woman',
    'cumshot': 'artistic splash',
    'busty': 'confident',
    'tits': 'figure',
    'boobs': 'figure',
    'sexy': 'elegant',
    'nude': 'artistic figure',
    'naked': 'artistic figure',
    'porn': 'artistic content',
    'xxx': 'artistic',
    'erotic': 'romantic',
    'sexual': 'intimate',
    'nsfw': 'artistic',
    'adult': 'mature',
    // Violence/inappropriate
    'kill': 'dramatic',
    'death': 'dramatic scene',
    'blood': 'red elements',
    'violence': 'action',
    'gun': 'prop',
    'weapon': 'prop',
    // Drugs/substances
    'drug': 'substance',
    'cocaine': 'powder',
    'weed': 'plant',
    'alcohol': 'beverage'
  };

  const lowerTag = tag.toLowerCase().trim();
  let wasModified = false;
  
  // Check if tag contains inappropriate content
  for (const [inappropriate, replacement] of Object.entries(safetyReplacements)) {
    if (lowerTag.includes(inappropriate)) {
      console.log(`Content safety: Replaced "${inappropriate}" with "${replacement}" in visual tag`);
      return { cleaned: replacement, wasModified: true };
    }
  }
  
  // Filter out completely inappropriate tags
  const blockedPatterns = [
    /\b(fuck|shit|damn|hell|ass|bitch)\b/i,
    /\b(hitler|nazi|terrorist)\b/i,
    /\b(suicide|murder|rape)\b/i
  ];
  
  for (const pattern of blockedPatterns) {
    if (pattern.test(lowerTag)) {
      console.log(`Content safety: Filtered out blocked tag: "${tag}"`);
      return { cleaned: null, wasModified: true };
    }
  }
  
  // Return original tag if it's safe
  return { cleaned: tag, wasModified: false };
}

// Sanitize entire prompt for safety
export function sanitizePrompt(prompt: string): { cleaned: string; wasModified: boolean } {
  let cleaned = prompt;
  let wasModified = false;
  
  // Replace problematic phrases in the full prompt
  const promptReplacements: Record<string, string> = {
    'fake tits': 'elegant figure',
    'big tits': 'confident appearance',
    'hot busty': 'confident',
    'cumshot on': 'artistic splash on',
    'nude woman': 'artistic figure',
    'sexy woman': 'elegant woman'
  };
  
  for (const [inappropriate, replacement] of Object.entries(promptReplacements)) {
    const regex = new RegExp(inappropriate, 'gi');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, replacement);
      wasModified = true;
      console.log(`Content safety: Replaced "${inappropriate}" with "${replacement}" in prompt`);
    }
  }
  
  return { cleaned, wasModified };
}

function getToneFonts(tone: string): string[] {
  return fontsByTone[tone.toLowerCase()] || fontsByTone.default;
}

function getLayoutInstruction(handoff: IdeogramHandoff): { composition: string; textPlacement: string } {
  if (!handoff.chosen_visual) {
    return {
      composition: 'composition with ample negative space for text overlay',
      textPlacement: 'LARGE bold readable text at bottom, high contrast sans-serif, center aligned, prominent display'
    };
  }
  
  // Map layout tokens to specific text rendering instructions for text-in-image mode
  const layoutMappings = {
    'clear top band': {
      composition: 'composition with clear horizontal band at top',
      textPlacement: 'bold readable text at top of image, meme-style format, large sans-serif font, center aligned'
    },
    'clear bottom band': {
      composition: 'composition with clear horizontal band at bottom', 
      textPlacement: 'bold readable text at bottom of image, meme-style format, large sans-serif font, center aligned'
    },
    'clear lower third': {
      composition: 'composition with clear lower third area',
      textPlacement: 'elegant text in lower third banner style, clean typography, left aligned'
    },
    'clear left panel': {
      composition: 'composition with clear vertical left panel',
      textPlacement: 'vertical text on left side, readable font, top to bottom orientation'
    },
    'badge space top-right': {
      composition: 'composition with clear corner space top-right',
      textPlacement: 'text as badge callout in top-right corner, compact design'
    },
    'clear narrow bottom strip': {
      composition: 'composition with clear narrow horizontal strip at bottom',
      textPlacement: 'LARGE readable text in bottom strip, bold sans-serif, center aligned, high contrast'
    }
  };
  
  for (const [token, layout] of Object.entries(layoutMappings)) {
    if (handoff.chosen_visual.toLowerCase().includes(token)) {
      return layout;
    }
  }
  
  return {
    composition: 'composition with clear space for integrated text',
    textPlacement: 'LARGE bold readable text, high contrast sans-serif, center aligned, prominent display'
  };
}

export function buildIdeogramPrompts(handoff: IdeogramHandoff, options: { injectText?: boolean } = {}): IdeogramPrompts {
  const textParts: string[] = [];
  const sceneParts: string[] = [];
  
  // Get layout configuration first
  const layout = getLayoutInstruction(handoff);
  
  // 1. TEXT-FIRST: EXPLICIT TEXT RENDERING INSTRUCTION (highest priority)
  // Default to text-in-image mode unless explicitly set to false
  const shouldInjectText = options.injectText !== false;
  
  if (shouldInjectText && handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    const textStyle = getRandomElement(['strong shadow', 'bold glow', 'high contrast stroke']);
    
    // Put text instruction at the very beginning with explicit styling
    textParts.push(`Render the following text directly in the image: "${handoff.key_line}". Style: ${layout.textPlacement}, ${selectedFont}, ${textStyle}, CRITICAL: text must be LARGE, clearly visible and spelled correctly.`);
  }
  
  // 2. SCENE DESCRIPTION: Core subject with tone + SUBCATEGORY LOCK
  const subject = handoff.chosen_visual || handoff.rec_subject || `${handoff.tone} ${handoff.category} scene`;
  const cleanSubject = subject.replace(/,?\s*(clear empty area near largest margin|clear top band|clear bottom band|clear lower third|clear left panel|badge space top-right|clear narrow bottom strip)/gi, '').trim();
  
  // 3. Style specification - enhance realistic photos with graphic text capability
  const styleSpec = handoff.visual_style && handoff.visual_style.toLowerCase() !== 'auto' 
    ? `in ${handoff.visual_style} style` 
    : 'in realistic photo style with integrated graphic text elements';
  
  sceneParts.push(`${handoff.tone} ${cleanSubject} ${styleSpec}.`);
  
  // 4. SUBCATEGORY LOCK: Enforce the chosen subcategory
  if (handoff.subcategory_primary) {
    sceneParts.push(`Subject must be ${handoff.subcategory_primary}. Do not generate any other sport or activity.`);
  }
  
  // 4. Cinematic lighting and atmosphere (randomized)
  const lighting = getRandomElement(lightingVariations);
  const angle = getRandomElement(angleVariations);
  sceneParts.push(`${lighting}, ${angle} with cinematic atmosphere.`);
  
  // 5. Layout instruction for composition
  sceneParts.push(`${layout.composition}.`);
  
  // 6. Tone-driven feeling (randomized)
  const moodOptions = moodEnhancers[handoff.tone.toLowerCase()] || moodEnhancers.default;
  const mood = getRandomElement(moodOptions);
  sceneParts.push(`Emphasize ${mood}.`);
  
  // 7. Visual tags if provided (filtered for safety)
  let modifiedTags: string[] = [];
  if (handoff.visual_tags_csv && handoff.visual_tags_csv !== "None") {
    const tagResults = handoff.visual_tags_csv
      .split(',')
      .map(tag => sanitizeVisualTag(tag.trim()))
      .filter(result => result.cleaned !== null);
      
    const safeVisualElements = tagResults
      .map(result => result.cleaned)
      .join(', ');
    
    // Track modifications for user feedback
    modifiedTags = tagResults
      .filter(result => result.wasModified)
      .map(result => result.cleaned || '');
    
    if (safeVisualElements) {
      sceneParts.push(`Visual elements: ${safeVisualElements}.`);
    }
  }
  
  // CRITICAL: Text instructions FIRST, then scene description
  const allParts = [...textParts, ...sceneParts];
  let positivePrompt = allParts.join(' ');
  
  // Add overlay-mode text avoidance directive only when explicitly avoiding text
  if (!shouldInjectText && handoff.key_line && handoff.key_line.trim()) {
    const layoutArea = layout.textPlacement.includes('bottom') ? 'bottom area' : 
                      layout.textPlacement.includes('top') ? 'top area' :
                      layout.textPlacement.includes('left') ? 'left area' : 
                      'designated text area';
    positivePrompt += ` Reserve the ${layoutArea} as clear space for overlay caption added later. Do not render any text, letters, numbers, or captions in the image.`;
  }
  
  // Sanitize the final prompt
  const promptSanitization = sanitizePrompt(positivePrompt);
  positivePrompt = promptSanitization.cleaned;
  
  // Choose negative prompt based on text injection mode  
  const negativePrompt = shouldInjectText 
    ? "no misspelled text, no duplicated words, no random letters, no blurry or overlapping text, no unwanted logos, no unrelated sports or activities" // Focused for text mode
    : "no flat stock photo, no generic studio portrait, no bland empty background, no overexposed lighting, no clipart, no watermarks, no washed-out colors, no awkward posing, no corporate vibe, no embedded text, no letters, no words, no signage"; // Enhanced for overlay mode

  return {
    positive_prompt: positivePrompt,
    negative_prompt: negativePrompt,
    safety_modifications: {
      prompt_modified: promptSanitization.wasModified,
      tags_modified: modifiedTags
    }
  };
}

// Create stricter layout versions for retry attempts
export function buildStricterLayoutPrompts(handoff: IdeogramHandoff, stricterLayoutToken: string = "clear top band"): IdeogramPrompts {
  console.log('🎯 Building stricter layout prompts with token:', stricterLayoutToken);
  
  // Create a modified handoff with stricter layout token
  const modifiedHandoff = {
    ...handoff,
    design_notes: handoff.design_notes ? 
      `${handoff.design_notes}, ${stricterLayoutToken}` : 
      stricterLayoutToken,
    visual_style: 'DESIGN' // Force DESIGN style for better text rendering
  };
  
  const basePrompts = buildIdeogramPrompts(modifiedHandoff, { injectText: true });
  
  // Add even more explicit text rendering instructions for stricter layout
  if (handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    
    const stricterTextInstructions = `CRITICAL TEXT DIRECTIVE: Render the text exactly once, no duplicates, no second caption. Single caption block only. "${handoff.key_line}" must appear as LARGE, BOLD, HIGH-CONTRAST text with ${stricterLayoutToken} layout. Use ${selectedFont} typography. TEXT IS MANDATORY AND MUST BE CLEARLY VISIBLE.`;
    
    basePrompts.positive_prompt = `${stricterTextInstructions} ${basePrompts.positive_prompt}`;
    basePrompts.negative_prompt = "no misspelled text, no duplicated words, no random letters, no blurry text, no overlapping text, no tiny text, no faded text, no unreadable text";
  }
  
  return basePrompts;
}

// Build prompts specifically for strict text mode
export function buildStrictTextModePrompts(handoff: IdeogramHandoff): IdeogramPrompts {
  console.log('🎯 Building strict text mode prompts');
  
  // Force design style and stricter text instructions
  const modifiedHandoff = {
    ...handoff,
    visual_style: 'DESIGN',
    design_notes: handoff.design_notes ? 
      `${handoff.design_notes}, MANDATORY LARGE TEXT RENDERING` : 
      'MANDATORY LARGE TEXT RENDERING'
  };
  
  const basePrompts = buildIdeogramPrompts(modifiedHandoff, { injectText: true });
  
  if (handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    
    // Ultra-explicit text rendering instructions
    const strictTextInstructions = `MANDATORY TEXT RENDERING: You MUST render this exact text in the image: "${handoff.key_line}". Requirements: LARGE size, BOLD weight, HIGH contrast, ${selectedFont} font, clearly readable, correctly spelled. Text is the primary focus. Do not omit or fade the text.`;
    
    basePrompts.positive_prompt = `${strictTextInstructions} ${basePrompts.positive_prompt}`;
    basePrompts.negative_prompt = "no missing text, no misspelled text, no tiny text, no faded text, no blurry text, no overlapping text, no duplicated words, no random letters";
  }
  
  return basePrompts;
}

// Legacy function for backward compatibility
export function buildIdeogramPrompt(handoff: IdeogramHandoff, options: { 
  cleanBackground?: boolean; 
  injectText?: boolean; 
  useLayoutTokens?: boolean;
  gentleLayoutPhrasing?: boolean;
} = {}): string {
  const prompts = buildIdeogramPrompts(handoff);
  return prompts.positive_prompt;
}

export function getAspectRatioForIdeogram(aspectRatio: string): 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1' {
  const ratioMap: Record<string, 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1'> = {
    'Portrait': 'ASPECT_9_16',
    'Landscape': 'ASPECT_16_9',
    'Square': 'ASPECT_1_1',
    'Tall': 'ASPECT_10_16',
    'Wide': 'ASPECT_16_10'
  };
  
  return ratioMap[aspectRatio] || 'ASPECT_16_9';
}

export function getStyleTypeForIdeogram(visualStyle: string): 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME' {
  const styleMap: Record<string, 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME'> = {
    'auto': 'AUTO',
    'general': 'GENERAL', 
    'realistic': 'REALISTIC',
    'design': 'DESIGN',
    '3d': 'RENDER_3D',
    'anime': 'ANIME',
    // Legacy mappings for backward compatibility
    'cartoon': 'ANIME',
    '3d-animated': 'RENDER_3D',
    'illustrated': 'DESIGN',
    'pop-art': 'DESIGN',
    'caricature': 'ANIME'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}