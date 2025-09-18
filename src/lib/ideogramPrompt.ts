import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';
import { buildUniversalTextPrompt, universalTextPlacementTemplates } from './universalTextTemplates';
import { isLongCaption } from './textRenderingConfig';
import { 
  extractAppearanceAttributes, 
  combineAppearanceAttributes, 
  buildAppearanceConstraints, 
  buildAppearanceNegatives,
  type AppearanceAttributes 
} from './appearanceExtractor';
import { 
  detectPopCultureContext, 
  getEnhancedNegativePrompt, 
  shouldForceDesignStyle,
  type PopCultureContext 
} from './popCultureDetection';

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
  inspirational: ['clean sans-serif', 'readable sans-serif'],
  thankful: ['warm serif', 'grateful script'],
  default: ['clean sans-serif', 'readable sans-serif']
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
      textPlacement: 'subtle caption overlay at bottom, small clean sans-serif, center aligned, high contrast'
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
      composition: 'composition with clear negative space at bottom',
      textPlacement: 'subtle caption overlay at bottom, small clean sans-serif, center aligned, high contrast'
    },
    'clear empty area near largest margin': {
      composition: 'composition with clear negative space at bottom',
      textPlacement: 'subtle caption overlay at bottom, small clean sans-serif, center aligned, high contrast'
    }
  };
  
  for (const [token, layout] of Object.entries(layoutMappings)) {
    if (handoff.chosen_visual.toLowerCase().includes(token)) {
      return layout;
    }
  }
  
  return {
    composition: 'composition with clear space for integrated text',
    textPlacement: 'subtle caption overlay at bottom, small clean sans-serif, center aligned, high contrast'
  };
}

export function buildIdeogramPrompts(handoff: IdeogramHandoff, options: { injectText?: boolean; strengthLevel?: number } = {}): IdeogramPrompts {
  const shouldInjectText = options.injectText !== false;
  
  // PHASE 0: Pop culture context detection for enhanced text handling
  const popCultureContext = handoff.key_line 
    ? detectPopCultureContext(handoff.key_line) 
    : { isPopCulture: false, detectedTerms: [], riskLevel: 'low' as const };
  
  console.log('🎯 Pop culture detection:', popCultureContext);
  
  // PHASE 1: Extract appearance attributes from all input sources
  const appearanceExtractions: AppearanceAttributes[] = [];
  
  if (handoff.chosen_visual) {
    appearanceExtractions.push(extractAppearanceAttributes(handoff.chosen_visual, 'chosen_visual'));
  }
  if (handoff.rec_subject) {
    appearanceExtractions.push(extractAppearanceAttributes(handoff.rec_subject, 'rec_subject'));
  }
  if (handoff.key_line) {
    appearanceExtractions.push(extractAppearanceAttributes(handoff.key_line, 'final_line'));
  }
  if (handoff.reference_tags) {
    appearanceExtractions.push(extractAppearanceAttributes(handoff.reference_tags, 'tags'));
  }
  
  // Combine with priority: chosen_visual > rec_subject > final_line > tags
  const combinedAppearance = combineAppearanceAttributes(appearanceExtractions);
  console.log('🎯 Appearance extraction:', combinedAppearance);
  
  // PHASE 1.5: Extract explicit subject requirements for mandatory enforcement
  const extractSubjectRequirements = (text: string): string[] => {
    const requirements: string[] = [];
    const ageMatches = text.match(/(\d+)-?year-?old|\b(adult|teenager|teen|child|elderly|senior)\b/gi);
    const genderMatches = text.match(/\b(man|woman|male|female|boy|girl|person)\b/gi);
    const descriptorMatches = text.match(/\b(creepy|scary|friendly|tall|short|thin|heavy)\b/gi);
    
    if (ageMatches) requirements.push(...ageMatches.map(m => m.toLowerCase()));
    if (genderMatches) requirements.push(...genderMatches.map(m => m.toLowerCase()));
    if (descriptorMatches) requirements.push(...descriptorMatches.map(m => m.toLowerCase()));
    
    return requirements;
  };
  
  const subjectRequirements = [
    ...extractSubjectRequirements(handoff.chosen_visual || ''),
    ...extractSubjectRequirements(handoff.rec_subject || '')
  ];
  
  // Extract layout ID from design notes (format: "Layout: layoutId")
  const layoutMatch = handoff.design_notes?.match(/Layout:\s*(\w+)/);
  const layoutId = layoutMatch?.[1];
  
  // Check if we have a valid universal template for the layout
  const layoutTemplate = universalTextPlacementTemplates.find(t => 
    t.id === layoutId ||
    t.id.toLowerCase() === layoutId?.toLowerCase()
  );
  
  console.log('🎯 Layout detection:', { layoutId, templateFound: !!layoutTemplate, designNotes: handoff.design_notes });
  
  if (shouldInjectText && handoff.key_line && handoff.key_line.trim() && layoutTemplate) {
    console.log('✅ Using Universal Template System:', layoutTemplate.label);
    
    // PHASE 2: Build appearance-prioritized scene description with mandatory subject enforcement
    const subject = handoff.chosen_visual || handoff.rec_subject || `${handoff.tone} ${handoff.category} scene`;
    const cleanSubject = subject.replace(/,?\s*(clear empty area|clear top band|clear bottom band|clear lower third|clear left panel|badge space|clear narrow bottom)/gi, '').trim();
    
    // Force DESIGN style for text rendering to improve caption fidelity
    let targetStyle = handoff.visual_style && handoff.visual_style.toLowerCase() !== 'auto' 
      ? handoff.visual_style 
      : 'design'; // Default to DESIGN for better text rendering
    
    // Override REALISTIC to DESIGN when text is being injected
    if (shouldInjectText && targetStyle.toLowerCase() === 'realistic photo') {
      targetStyle = 'design';
      console.log('🎯 Text injection: Switching from REALISTIC to DESIGN style for better caption rendering');
    }
    
    const styleSpec = `in ${targetStyle} style`;
    
    // Build mandatory subject constraints first
    let subjectBlock = '';
    if (subjectRequirements.length > 0) {
      subjectBlock = `SUBJECT (must match exactly): ${cleanSubject}. Must include: ${subjectRequirements.join(', ')}. No substitutions allowed.\n\n`;
    }
    
    // Build appearance constraints
    const appearanceConstraints = buildAppearanceConstraints(combinedAppearance);
    const baseSceneDescription = `${handoff.tone} ${cleanSubject} ${styleSpec}`;
    
    // Prioritize subject enforcement, then appearance, then scene
    const sceneDescription = subjectBlock + (appearanceConstraints 
      ? `${appearanceConstraints}\n\n${baseSceneDescription}`
      : baseSceneDescription);
    
    const { positivePrompt, negativePrompt } = buildUniversalTextPrompt(
      layoutTemplate.id, 
      handoff.key_line, 
      sceneDescription,
      options.strengthLevel || 1
    );
    
    // PHASE 3: Add contextual negative prompts for appearance consistency + pop culture + subject enforcement
    const appearanceNegatives = buildAppearanceNegatives(combinedAppearance);
    
    // Subject enforcement negatives
    const subjectNegatives: string[] = [];
    if (subjectRequirements.some(req => req.includes('adult') || req.includes('year-old'))) {
      subjectNegatives.push('no children', 'no boys', 'no girls', 'no teens', 'no teenagers');
    }
    if (subjectRequirements.some(req => req.includes('man') || req.includes('male'))) {
      subjectNegatives.push('no women', 'no females', 'no girls');
    }
    if (subjectRequirements.some(req => req.includes('woman') || req.includes('female'))) {
      subjectNegatives.push('no men', 'no males', 'no boys');
    }
    subjectNegatives.push('no substitutions for the subject', 'no altering subject age or gender');
    
    // Enhanced text rendering negatives
    const textNegatives = shouldInjectText 
      ? ['blurry text', 'missing text', 'broken letters', 'garbled letters', 'extra background text', 'multiple text boxes', 'duplicate captions', 'split text', 'fragmented text']
      : ['blurry text', 'missing text'];
    
    let enhancedNegativePrompt = [
      negativePrompt,
      ...appearanceNegatives,
      ...subjectNegatives,
      ...textNegatives
    ].join(', ');
    
    // Apply pop culture enhancements
    enhancedNegativePrompt = getEnhancedNegativePrompt(enhancedNegativePrompt, popCultureContext);
    
    // Strengthen text rendering instructions with mandatory directive
    const strengthenedPositive = shouldInjectText 
      ? `TEXT INSTRUCTION (MANDATORY): Render this exact text once: "${handoff.key_line}". One single block only. No splitting. No duplication. No misspellings. No substitutions.\n\n${positivePrompt}`
      : positivePrompt;
    
    console.log('🎯 Universal Template Output:', { 
      positivePrompt: positivePrompt.substring(0, 100) + '...', 
      negativePrompt: enhancedNegativePrompt.substring(0, 100) + '...',
      appearanceConstraints: !!appearanceConstraints,
      appearanceNegatives: appearanceNegatives.length
    });
    
    return {
      positive_prompt: strengthenedPositive,
      negative_prompt: enhancedNegativePrompt,
      safety_modifications: {
        prompt_modified: false,
        tags_modified: []
      }
    };
  }
  
  // Fallback to legacy system for backward compatibility
  const textParts: string[] = [];
  const sceneParts: string[] = [];
  
  // Get layout configuration first
  const layout = getLayoutInstruction(handoff);
  
  // PHASE 2 (Legacy): Add appearance constraints FIRST before scene description
  const appearanceConstraints = buildAppearanceConstraints(combinedAppearance);
  if (appearanceConstraints) {
    sceneParts.push(appearanceConstraints);
  }
  
  // 2. SCENE DESCRIPTION: Core subject with tone + SUBCATEGORY LOCK
  const subject = handoff.chosen_visual || handoff.rec_subject || `${handoff.tone} ${handoff.category} scene`;
  const cleanSubject = subject.replace(/,?\s*(clear empty area near largest margin|clear top band|clear bottom band|clear lower third|clear left panel|badge space top-right|clear narrow bottom strip)/gi, '').trim();
  
  // Check if this is a generic/random visual that shouldn't get category-specific treatment
  const isGenericVisual = handoff.chosen_visual && (
    handoff.chosen_visual.toLowerCase().includes('random') || 
    handoff.chosen_visual.toLowerCase().includes('everyday') ||
    handoff.chosen_visual.toLowerCase().includes('abstract') ||
    handoff.chosen_visual.toLowerCase().includes('generic')
  );
  
  // 3. Style specification with text injection and pop culture override
  let targetStyle = handoff.visual_style && handoff.visual_style.toLowerCase() !== 'auto' 
    ? handoff.visual_style 
    : (shouldInjectText ? 'design' : 'realistic photo'); // Default to DESIGN for text injection
  
  // Override to DESIGN style for text injection or high-risk pop culture content
  if ((shouldInjectText || shouldForceDesignStyle(popCultureContext)) && targetStyle.toLowerCase() === 'realistic photo') {
    targetStyle = 'design';
    console.log('🎯 Style override: Switching from REALISTIC to DESIGN for better text/content handling');
  }
  
  const styleSpec = `in ${targetStyle} style`;

  sceneParts.push(`${handoff.tone} ${cleanSubject} ${styleSpec}.`);
  
  // 4. SUBCATEGORY LOCK: Only enforce if not a generic visual choice
  if (handoff.subcategory_primary && !isGenericVisual) {
    sceneParts.push(`Subject must be ${handoff.subcategory_primary}. Do not generate any other sport or activity.`);
  } else if (isGenericVisual) {
    console.log('🎯 Respecting generic visual choice, skipping subcategory enforcement');
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
  
  // 7. Visual tags if provided (filtered for safety and generic choice respect)
  let modifiedTags: string[] = [];
  if (handoff.visual_tags_csv && handoff.visual_tags_csv !== "None" && !isGenericVisual) {
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
  } else if (isGenericVisual) {
    console.log('🎯 Skipping category-specific visual tags for generic choice');
  }
  
  // CRITICAL: Text instructions FIRST with maximum priority - New text-first structure
  if (shouldInjectText && handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    const textInstruction = `Text: "${handoff.key_line}". ${selectedFont}, legible.`;
    textParts.unshift(textInstruction);
  }
  
  // CRITICAL: Text instructions FIRST, then scene description
  const allParts = [...textParts, ...sceneParts];
  let positivePrompt = allParts.join(' ');
  
  // Add multiple redundant text requirements for better success
  if (shouldInjectText && handoff.key_line && handoff.key_line.trim()) {
    positivePrompt += ` Text visible: "${handoff.key_line}".`;
  }
  
  // Add overlay-mode text avoidance directive only when explicitly avoiding text
  if (!shouldInjectText && handoff.key_line && handoff.key_line.trim()) {
    // Simplified instruction for overlay caption  
    positivePrompt += ` Clear space for text overlay. No text in image.`;
  }
  
  // Sanitize the final prompt
  const promptSanitization = sanitizePrompt(positivePrompt);
  positivePrompt = promptSanitization.cleaned;
  
  // PHASE 3 (Legacy): Enhanced negative prompt with appearance blockers + pop culture + subject enforcement
  const appearanceNegatives = buildAppearanceNegatives(combinedAppearance);
  
  // Subject enforcement negatives for legacy system
  const legacySubjectNegatives: string[] = [];
  if (subjectRequirements.some(req => req.includes('adult') || req.includes('year-old'))) {
    legacySubjectNegatives.push('no children', 'no boys', 'no girls', 'no teens');
  }
  if (subjectRequirements.some(req => req.includes('man') || req.includes('male'))) {
    legacySubjectNegatives.push('no women', 'no females');
  }
  if (subjectRequirements.some(req => req.includes('woman') || req.includes('female'))) {
    legacySubjectNegatives.push('no men', 'no males');
  }
  legacySubjectNegatives.push('no substitutions for the subject', 'no altering subject age or gender');
  
  const baseNegativePrompt = shouldInjectText 
    ? "no filler props, no empty rooms, no abstract shapes, no watermarks, no logos, no extra on image text, no broken or garbled letters, no multiple text boxes, no duplicate captions" 
    : "no embedded text, no letters, no words, no signage, no watermarks, no logos";
  
  let enhancedNegativePrompt = [
    baseNegativePrompt,
    ...appearanceNegatives,
    ...legacySubjectNegatives
  ].filter(item => item).join(', ');
  
  // Apply pop culture enhancements for legacy system too
  enhancedNegativePrompt = getEnhancedNegativePrompt(enhancedNegativePrompt, popCultureContext);

  return {
    positive_prompt: positivePrompt,
    negative_prompt: enhancedNegativePrompt,
    safety_modifications: {
      prompt_modified: promptSanitization.wasModified,
      tags_modified: modifiedTags
    }
  };
}

// Create stricter layout versions for retry attempts
export function buildStricterLayoutPrompts(handoff: IdeogramHandoff, stricterLayoutToken: string): IdeogramPrompts {
  console.log('🎯 Building stricter layout prompts with token:', stricterLayoutToken);
  
  // Create a modified handoff with stricter layout token
  const modifiedHandoff = {
    ...handoff,
    design_notes: handoff.design_notes ? 
      `${handoff.design_notes}, ${stricterLayoutToken}` : 
      stricterLayoutToken
  };
  
  const basePrompts = buildIdeogramPrompts(modifiedHandoff);
  
  // Add even more explicit text rendering instructions for stricter layout
  if (handoff.key_line && handoff.key_line.trim()) {
    const fonts = getToneFonts(handoff.tone);
    const selectedFont = getRandomElement(fonts);
    
    const stricterTextInstructions = `Text: "${handoff.key_line}" in ${stricterLayoutToken}. High contrast ${selectedFont}.`;
    
    basePrompts.positive_prompt = `${stricterTextInstructions} ${basePrompts.positive_prompt}`;
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

export function getStyleTypeForIdeogram(visualStyle: string, hasTextInjection?: boolean): 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME' {
  // FORCE DESIGN style for text injection - this is critical for text rendering success
  if (hasTextInjection) {
    console.log('🎯 Forcing DESIGN style for text injection (better text rendering)');
    return 'DESIGN';
  }
  
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