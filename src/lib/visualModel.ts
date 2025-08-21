import { openAIService } from './openai';

export interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  visualStyle?: string;
  finalLine?: string;
  specificEntity?: string; // For personas like "Teresa Giudice"
  subjectOption?: string; // single-person, multiple-people, no-subject
  dimensions?: string; // square, 4:5, 9:16, etc.
}

export interface VisualOption {
  subject: string;
  background: string;
  prompt: string;
  slot?: string;
}

export interface VisualResult {
  options: VisualOption[];
  model: string;
}

const VISUAL_OPTIONS_COUNT = 4;

// Auto-enrichment functions
function autoEnrichInputs(inputs: VisualInputs): VisualInputs {
  const enriched = { ...inputs };
  
  // Auto-extract nouns from finalLine if provided
  if (inputs.finalLine && inputs.tags.length < 5) {
    const extractedNouns = extractNounsFromText(inputs.finalLine);
    enriched.tags = [...inputs.tags, ...extractedNouns].slice(0, 8); // Max 8 tags
  }
  
  // Auto-seed category-specific tags if not provided
  if (inputs.tags.length < 3) {
    const categoryTags = getCategorySpecificTags(inputs.category, inputs.subcategory);
    enriched.tags = [...inputs.tags, ...categoryTags].slice(0, 6);
  }
  
  return enriched;
}

function extractNounsFromText(text: string): string[] {
  // Simple noun extraction - filter common words and keep substantive terms
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const commonWords = new Set(['the', 'and', 'but', 'for', 'are', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
  
  return words
    .filter(word => !commonWords.has(word))
    .slice(0, 3); // Max 3 extracted nouns
}

function getCategorySpecificTags(category: string, subcategory: string): string[] {
  const celebrationMap: Record<string, string[]> = {
    'birthday': ['cake', 'candles', 'balloons'],
    'christmas-day': ['tree', 'gifts', 'ornaments'],
    'halloween': ['pumpkin', 'costume', 'spooky'],
    'wedding': ['rings', 'flowers', 'celebration'],
    'default': ['party', 'festive', 'celebration']
  };
  
  const categoryMap: Record<string, string[] | Record<string, string[]>> = {
    'celebrations': celebrationMap,
    'sports': ['athletic', 'competition', 'energy'],
    'daily-life': ['routine', 'casual', 'everyday'],
    'pop-culture': ['trendy', 'iconic', 'reference'],
    'default': ['modern', 'creative']
  };
  
  if (categoryMap[category]) {
    if (typeof categoryMap[category] === 'object' && !Array.isArray(categoryMap[category])) {
      const subMap = categoryMap[category] as Record<string, string[]>;
      return subMap[subcategory] || subMap['default'] || ['modern', 'creative'];
    }
    if (Array.isArray(categoryMap[category])) {
      return categoryMap[category] as string[];
    }
  }
  
  return categoryMap['default'] as string[];
}

// Validation functions
function hasVagueFillers(text: string): boolean {
  const vaguePatterns = [
    /something\s+like/i,
    /\belements?\b/i,
    /\bgeneral\b/i,
    /\bvarious\b/i,
    /\bsome\s+kind/i,
    /\btypes?\s+of/i,
    /\bmight\s+show/i,
    /\bcould\s+include/i
  ];
  
  return vaguePatterns.some(pattern => pattern.test(text));
}

function validateVisualOptions(options: VisualOption[]): VisualOption[] {
  return options.filter(option => {
    // Reject options with vague fillers
    if (hasVagueFillers(option.subject) || hasVagueFillers(option.background)) {
      console.warn('🚫 Rejected vague option:', option.subject);
      return false;
    }
    
    // Ensure minimum detail in prompts
    if (option.prompt.length < 100) {
      console.warn('🚫 Rejected short prompt:', option.prompt.substring(0, 50));
      return false;
    }
    
    return true;
  });
}

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 2).join(', ') || 'simple design';
  const occasion = subcategory || 'general';
  const entity = specificEntity || 'subject';
  
  // Determine if we need people in the image based on tags or context
  const needsPeople = tags.some(tag => 
    tag.toLowerCase().includes('person') || 
    tag.toLowerCase().includes('people') || 
    tag.toLowerCase().includes('man') || 
    tag.toLowerCase().includes('woman') ||
    tag.toLowerCase().includes('group')
  );
  
  const peopleContext = needsPeople ? 
    (tags.find(tag => tag.toLowerCase().includes('group')) ? 'group of people' : 
     tags.find(tag => tag.toLowerCase().includes('woman')) ? 'woman' :
     tags.find(tag => tag.toLowerCase().includes('man')) ? 'man' : 'person') : '';
  
  // Create entity-aware fallbacks
  if (specificEntity && tags.some(tag => tag.toLowerCase().includes('jail'))) {
    return [
      {
        slot: "background-only",
        subject: "Prison bars texture overlay",
        background: `Dark jail cell background with dramatic ${tone} lighting`,
        prompt: `Dark jail cell background with prison bars, dramatic ${tone} lighting, no text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: dark] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        slot: "subject+background",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind bars`,
        background: `Prison setting with atmospheric lighting`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind prison bars positioned on left third, dramatic jail setting, ${tone} mood lighting [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      },
      {
        slot: "object",
        subject: "Handcuffs and judge gavel symbols",
        background: `Minimal courtroom or legal backdrop`,
        prompt: `Legal symbols like handcuffs and gavel anchored bottom third, minimal courtroom backdrop, ${tone} style [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
      },
      {
        slot: "tone-twist",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment reimagined`,
        background: `Stylized setting reflecting personality`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment with ${tone} interpretation positioned off-center, stylized background reflecting their known traits [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
      }
    ];
  }
  
  return [
    {
      slot: "background-only",
      subject: "Clean visual composition",
      background: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements`,
      prompt: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements, clean composition without text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "subject+background", 
      subject: `${needsPeople ? `${peopleContext} in ` : ''}Central ${occasion} themed composition`,
      background: `Complementary ${tone} environment with ${primaryTags}`,
      prompt: `${needsPeople ? `${peopleContext} in ` : ''}Central ${occasion} themed composition positioned on right third in complementary ${tone} environment with ${primaryTags} [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    },
    {
      slot: "object",
      subject: `Featured ${occasion} objects or symbols`,
      background: `Minimal ${tone} backdrop`,
      prompt: `Featured ${occasion} objects or symbols anchored bottom third on minimal ${tone} backdrop, ${primaryTags} style [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: reflective glare in center, busy patterns] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "tone-twist",
      subject: `${needsPeople ? `${peopleContext} with ` : ''}${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion}`,
      background: `Creative ${visualStyle || 'artistic'} setting`,
      prompt: `${needsPeople ? `${peopleContext} with ` : ''}${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion} positioned off-center in creative ${visualStyle || 'artistic'} setting [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    }
  ];
}

export async function generateVisualRecommendations(
  inputs: VisualInputs,
  n: number = VISUAL_OPTIONS_COUNT
): Promise<VisualResult> {
  // Auto-enrich inputs before processing
  const enrichedInputs = autoEnrichInputs(inputs);
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = enrichedInputs;
  
const systemPrompt = `You are a visual concept recommender for memes and social graphics with pop-culture knowledge.

Core rules:
• Use the 4-slot framework: background-only, subject+background, object, tone-twist.
• Incorporate ALL inputs: category, subcategory, tone, visual style, text content, tags, entity/person, subject composition, dimensions.
• Use ALL provided {tags} verbatim. Do not paraphrase, change plurality, or translate them.
• Do NOT include any rendered typography in the image itself unless "Text Content" explicitly instructs it. Assume text will be overlaid later.
• CRITICAL: Avoid vague language like "something like", "elements", "general", "various", "types of", "could include".

Readability and layout:
• Text alignment default: center.
• Reserve a TEXT_SAFE_ZONE centered at 60% width by 35% height. Keep it low-detail, low-contrast.
• CONTRAST_PLAN: if the background is bright, create a subtle darker gradient in the safe zone. If the background is dark, create a subtle lighter gradient in the safe zone. Avoid hard edges.
• NEGATIVE_PROMPT: no busy patterns, no high-frequency texture, no faces or limbs crossing the TEXT_SAFE_ZONE, no harsh shadows or specular highlights inside it.
• CROP_STRATEGY: design optimized for specified dimensions, with crop-safe center for alternates.

People and subjects:
• Follow the subject option exactly: "single-person" = one person, "multiple-people" = 2-4 people, "no-subject" = no people.
• Specify age range, body position, pose, expression, camera distance, and interaction.
• For specific entities, reference iconic traits and moments without using protected likenesses unless explicitly provided.

Dimensions and composition:
• If dimensions specified, optimize composition for that aspect ratio.
• Square (1:1): balanced, centered compositions
• Portrait (4:5, 9:16): vertical emphasis, subjects positioned for vertical crop
• Landscape (16:9): horizontal flow, wide establishing shots

Style lexicon by visual style:
• realistic/photo-real: crisp details, natural lighting, photographic depth
• illustrated/cartoon: clean lines, vibrant colors, stylized forms
• collage: layered textures, mixed media, artistic composition
• minimalist: clean space, simple forms, subtle gradients

Slot differentiation:
• background-only: text-friendly surfaces. Gradients, soft bokeh, or minimal scenes.
• subject+background: subject placed on left or right third. Keep center clean for text.
• object: single object anchored low third. Keep center negative space.
• tone-twist: add an idea-level twist while preserving the safe zone.

Output:
• Return exactly 4 JSON options using your schema.
• Inside each option's "prompt", include these micro-directives:
  [TAGS: ...] include the exact provided tags
  [TEXT_SAFE_ZONE: center 60x35]
  [CONTRAST_PLAN: light|dark|auto]
  [NEGATIVE_PROMPT: ...]
  [ASPECTS: optimized for {dimensions}]
  [TEXT_HINT: light text|dark text] suggestion for overlay color`;

  const userPrompt = `Generate exactly 4 visual concept options using the slot framework for these details:

Category: ${category}
Subcategory: ${subcategory}  
Tone: ${tone}
Visual Style: ${visualStyle || 'Not specified'}
${finalLine ? `Text Content: "${finalLine}"` : 'No text content - create visual-only images'}
${specificEntity ? `Specific Entity/Person: ${specificEntity}` : ''}
${subjectOption ? `Subject Composition: ${subjectOption}` : ''}
${dimensions ? `Target Dimensions: ${dimensions}` : ''}
Tags: ${tags.join(', ')}

CRITICAL REQUIREMENT: You MUST use the exact tags provided (${tags.join(', ')}) verbatim in the [TAGS: ] micro-directive. Do not paraphrase, substitute, or interpret these tags.

SLOT-SPECIFIC COMPOSITION RULES:
• background-only: Soft gradient or subtle texture. No faces, no objects in center. Gentle lighting falloff into the TEXT_SAFE_ZONE.
• subject+background: Subject on left or right third, eye line toward center. Background depth of field. Keep center negative space.
• object: Single object, 30–40% of frame, anchored bottom third. Center remains low-detail.
• tone-twist: Conceptual twist that matches tone. Twist sits off-center. Center stays clean.

PEOPLE & DEMOGRAPHICS:
- Follow the subject composition exactly: ${subjectOption || 'not specified'}
- If subject composition is "single-person": exactly one person with age range, pose, expression, camera distance
- If subject composition is "multiple-people": exactly 2-4 people with age range, poses, interactions
- If subject composition is "no-subject": NO people, focus on objects, backgrounds, or abstract concepts
- Include body position, gaze direction, and hand placement when people are present

DIMENSION OPTIMIZATION:
- Target dimensions: ${dimensions || 'flexible'}
- If square (1:1): balanced, centered compositions
- If portrait (4:5, 9:16): vertical emphasis, position subjects for vertical crops
- If landscape (16:9): horizontal flow, wide establishing shots

${specificEntity && tags.some(tag => tag.toLowerCase().includes('jail')) ? 
`SPECIAL INSTRUCTIONS: Since this involves ${specificEntity} and jail-related tags, create 2 options directly related to jail/prison themes (bars, cells, courthouse) and 2 options that reference other iconic aspects of ${specificEntity} that fans would recognize.` : 
specificEntity ? 
`SPECIAL INSTRUCTIONS: Since this involves ${specificEntity}, reference their iconic traits and moments without using protected likenesses unless explicitly provided.` : ''}

Return exactly this JSON structure with 4 options, each prompt MUST include all micro-directives:
{
  "options": [
    {
      "slot": "background-only",
      "subject": "Text-friendly background description",
      "background": "Background details",
      "prompt": "Complete visual description + [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: light|dark|auto] [NEGATIVE_PROMPT: busy patterns, strong shadows, limbs crossing center, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text|dark text]"
    },
    {
      "slot": "subject+background", 
      "subject": "Subject positioned on third, demographics if applicable",
      "background": "Background with depth of field",
      "prompt": "Complete visual description + [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: light|dark|auto] [NEGATIVE_PROMPT: busy patterns, strong shadows, limbs crossing center, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text|dark text]"
    },
    {
      "slot": "object",
      "subject": "Single key object anchored bottom third",
      "background": "Minimal backdrop", 
      "prompt": "Complete visual description + [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: light|dark|auto] [NEGATIVE_PROMPT: busy patterns, strong shadows, limbs crossing center, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text|dark text]"
    },
    {
      "slot": "tone-twist",
      "subject": "Creative ${tone} interpretation with twist off-center",
      "background": "Setting that amplifies mood while preserving safe zone",
      "prompt": "Complete visual description + [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: light|dark|auto] [NEGATIVE_PROMPT: busy patterns, strong shadows, limbs crossing center, reflective glare in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text|dark text]"
    }
  ]
}

Each prompt must be descriptive for image generation and include ALL required micro-directives.`;

  try {
    const startTime = Date.now();
    console.log('🚀 Starting visual generation with optimized settings...');
    
    // Create a timeout promise for fast fallback
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Visual generation timeout - using fallback')), 7000);
    });

    // Race between AI generation and timeout
    const aiPromise = openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.6, // Reduced for more precise, less generic language
      max_completion_tokens: 1200,
      model: 'gpt-5-mini-2025-08-07'
    });

    const result = await Promise.race([aiPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Visual generation completed in ${duration}ms`);

    // Validate the response structure and slots
    if (!result?.options || !Array.isArray(result.options) || result.options.length !== 4) {
      throw new Error('Invalid response format from AI - expected exactly 4 options');
    }

    const expectedSlots = ['background-only', 'subject+background', 'object', 'tone-twist'];
    let validOptions = result.options
      .filter((opt: any) => opt.subject && opt.background && opt.prompt && opt.slot)
      .map((opt: any, index: number) => ({
        ...opt,
        slot: opt.slot || expectedSlots[index] // Ensure slot is present
      }));

    // Apply quality validation to reject vague options
    validOptions = validateVisualOptions(validOptions);

    // If we rejected too many options, fill with high-quality fallbacks
    if (validOptions.length < 4) {
      console.warn(`⚠️ Only ${validOptions.length} quality options generated, adding fallbacks`);
      const fallbacks = getSlotBasedFallbacks(enrichedInputs);
      validOptions = [...validOptions, ...fallbacks].slice(0, 4);
    }

    return {
      options: validOptions,
      model: result._apiMeta?.modelUsed || 'gpt-5-mini-2025-08-07'
    };
  } catch (error) {
    console.error('Error generating visual recommendations:', error);
    console.warn('⚠️ Visual generation using fallback options. API may be unavailable or having issues.');
    
    // Use contextual fallbacks instead of generic ones
    const fallbackOptions = getSlotBasedFallbacks(enrichedInputs);

    return {
      options: fallbackOptions,
      model: 'fallback'
    };
  }
}