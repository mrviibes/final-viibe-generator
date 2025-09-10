import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export interface IdeogramPrompts {
  positive_prompt: string;
  negative_prompt: string;
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

function getToneFonts(tone: string): string[] {
  return fontsByTone[tone.toLowerCase()] || fontsByTone.default;
}

function getLayoutToken(handoff: IdeogramHandoff): string {
  if (!handoff.chosen_visual) return 'composition with ample negative space for text overlay';
  
  // Extract layout tokens from chosen visual
  const layoutTokens = [
    'clear empty area near largest margin',
    'clear top band', 'clear bottom band', 'clear lower third',
    'clear left panel', 'badge space top-right', 'clear narrow bottom strip'
  ];
  
  for (const token of layoutTokens) {
    if (handoff.chosen_visual.toLowerCase().includes(token)) {
      return `composition ensures ${token} for text overlay`;
    }
  }
  
  return 'composition with ample negative space for text overlay';
}

export function buildIdeogramPrompts(handoff: IdeogramHandoff): IdeogramPrompts {
  const parts: string[] = [];
  
  // 1. Core subject with tone
  const subject = handoff.chosen_visual || handoff.rec_subject || `${handoff.tone} ${handoff.category} scene`;
  const cleanSubject = subject.replace(/,?\s*(clear empty area near largest margin|clear top band|clear bottom band|clear lower third|clear left panel|badge space top-right|clear narrow bottom strip)/gi, '').trim();
  
  // 2. Style specification
  const styleSpec = handoff.visual_style && handoff.visual_style.toLowerCase() !== 'auto' 
    ? `in ${handoff.visual_style} style` 
    : 'in realistic photo style';
  
  parts.push(`${handoff.tone} ${cleanSubject} ${styleSpec}.`);
  
  // 3. Cinematic lighting and atmosphere (randomized)
  const lighting = getRandomElement(lightingVariations);
  const angle = getRandomElement(angleVariations);
  parts.push(`${lighting}, ${angle} with cinematic atmosphere.`);
  
  // 4. Layout token for text space
  const layoutInstruction = getLayoutToken(handoff);
  parts.push(`${layoutInstruction}.`);
  
  // 5. Tone-driven feeling (randomized)
  const moodOptions = moodEnhancers[handoff.tone.toLowerCase()] || moodEnhancers.default;
  const mood = getRandomElement(moodOptions);
  parts.push(`Emphasize ${mood}.`);
  
  // 6. Visual tags if provided
  if (handoff.visual_tags_csv && handoff.visual_tags_csv !== "None") {
    parts.push(`Visual elements: ${handoff.visual_tags_csv}.`);
  }
  
  // 7. Text overlay with styling rules
  if (handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    const alignments = ['left', 'center', 'right'];
    const alignment = getRandomElement(alignments);
    const styles = ['subtle shadow', 'soft glow', 'clean stroke', 'elegant gradient'];
    const textStyle = getRandomElement(styles);
    
    parts.push(`Overlay text: "${handoff.key_line}" styled with ${selectedFont}, ${alignment} aligned, ${textStyle} for maximum contrast and readability.`);
  }
  
  // Static negative prompt for consistent quality
  const negative_prompt = `no flat stock photo, no generic studio portrait, no bland empty background, no overexposed lighting, no clipart, no watermarks, no washed-out colors, no awkward posing, no corporate vibe`;
  
  return {
    positive_prompt: parts.join(' '),
    negative_prompt
  };
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