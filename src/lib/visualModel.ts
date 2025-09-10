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
  errorCode?: 'timeout' | 'unauthorized' | 'network' | 'parse_error';
}

const VISUAL_OPTIONS_COUNT = 4;

// Auto-enrichment functions
function autoEnrichInputs(inputs: VisualInputs): VisualInputs {
  const enriched = { ...inputs };
  
  // Detect group chat context
  const hasGroupChatContext = inputs.finalLine?.toLowerCase().includes('group chat') || 
                            inputs.tags.some(tag => tag.toLowerCase().includes('group')) ||
                            inputs.tags.some(tag => tag.toLowerCase().includes('chat'));
  
  // Auto-extract nouns from finalLine if provided
  if (inputs.finalLine && inputs.tags.length < 5) {
    const extractedNouns = extractNounsFromText(inputs.finalLine);
    enriched.tags = [...inputs.tags, ...extractedNouns].slice(0, 8); // Max 8 tags
  }
  
  // Add group chat enrichment
  if (hasGroupChatContext && !enriched.tags.some(tag => tag.toLowerCase().includes('group chat'))) {
    enriched.tags = ['group chat', 'chat bubbles', 'phone screen', ...enriched.tags].slice(0, 8);
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
    'birthday': ['cake', 'candles', 'balloons', 'group chat', 'friends'],
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
  // Relaxed validation - only reject extremely problematic options
  return options.filter(option => {
    // Only reject if completely empty or malformed
    if (!option.subject || !option.background || !option.prompt) {
      console.warn('🚫 Rejected empty option');
      return false;
    }
    
    // Very basic minimum length check (reduced from 100 to 30)
    if (option.prompt.length < 30) {
      console.warn('🚫 Rejected extremely short prompt:', option.prompt);
      return false;
    }
    
    return true;
  });
}

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity, subjectOption, dimensions } = inputs;
  const primaryTags = tags.slice(0, 3).join(', ') || 'dynamic energy';
  const occasion = subcategory || 'general';
  const entity = specificEntity || 'subject';
  
  // Dynamic synonym pools to avoid repetitive fallbacks
  const energyWords = ['explosive', 'dramatic', 'intense', 'vibrant', 'electrifying', 'captivating'];
  const sceneWords = ['scene', 'environment', 'atmosphere', 'setting', 'backdrop', 'landscape'];
  const randomEnergy = energyWords[Math.floor(Math.random() * energyWords.length)];
  const randomScene = sceneWords[Math.floor(Math.random() * sceneWords.length)];
  
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
      subject: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${randomScene}`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} ${visualStyle || 'modern'} environment showcasing ${primaryTags}, ${randomEnergy} composition without text or typography [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns, high-frequency texture, harsh shadows in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "subject+background", 
      subject: `${needsPeople ? `${peopleContext} immersed in ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} moment`,
      background: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} atmosphere with ${primaryTags}`,
      prompt: `${needsPeople ? `${peopleContext} immersed in ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} moment positioned on right third in ${randomEnergy} ${tone} atmosphere with ${primaryTags} [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: faces crossing center, busy patterns in center] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
    },
    {
      slot: "object",
      subject: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} symbols and elements`,
      background: `Bold ${tone} ${randomScene} with ${primaryTags} accents`,
      prompt: `${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${occasion} symbols and elements anchored bottom third on bold ${tone} ${randomScene} with ${primaryTags} accents [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: reflective glare in center, busy patterns] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: dark text]`
    },
    {
      slot: "tone-twist",
      subject: `${needsPeople ? `${peopleContext} expressing ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} energy for ${occasion}`,
      background: `Imaginative ${visualStyle || 'artistic'} world with ${primaryTags} influences`,
      prompt: `${needsPeople ? `${peopleContext} expressing ` : ''}${randomEnergy.charAt(0).toUpperCase() + randomEnergy.slice(1)} ${tone} energy for ${occasion} positioned off-center in imaginative ${visualStyle || 'artistic'} world with ${primaryTags} influences [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: limbs crossing center, harsh shadows in safe zone] [ASPECTS: 1:1 base, crop-safe 4:5, 9:16] [TEXT_HINT: light text]`
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
  
const systemPrompt = `Generate 4 vivid visual concepts for social graphics. Keep prompts concise (60-80 words each).

CRITICAL RULES:
- Return ONLY pure JSON - no code blocks, no prose, no extra text
- Use double quotes for all keys and strings
- Each prompt must be 60-80 words maximum for efficiency
- 4 slots: "background-only", "subject+background", "object", "tone-twist"

IMPORTANT: Your response must be valid JSON that begins with { and ends with }. No markdown formatting.

{
  "options": [
    {
      "slot": "background-only",
      "subject": "brief description",
      "background": "brief description", 
      "prompt": "compact prompt with [TAGS:] [TEXT_SAFE_ZONE:] etc (60-80 words)"
    }
  ]
}`;

function getStyleKeywords(visualStyle?: string): string {
  const styles: Record<string, string> = {
    'auto': 'optimal style selection',
    'general': 'clean, standard appearance',
    'realistic': 'photographic, detailed, natural lighting',
    'design': 'flat graphics, clean illustration, modern design',
    '3d': 'clean 3D rendering, smooth surfaces, CGI quality',
    'anime': 'Japanese animation style, cartoon aesthetic',
    // Legacy mappings
    'illustrated': 'clean illustration, vibrant colors', 
    '3d-animated': 'clean 3D animation, smooth surfaces',
    'minimalist': 'simple, clean, minimal design',
    'caricature': 'exaggerated cartoon style',
    'pop-art': 'bold graphic design, vibrant colors'
  };
  return styles[visualStyle || 'general'] || 'modern visual style';
}

  const userPrompt = `Context: ${category} > ${subcategory}, ${tone} tone, ${visualStyle || '3d-animated'} style
Tags: ${tags.join(', ')}
${finalLine ? `Text: "${finalLine}"` : ''}

${tags.some(tag => tag.toLowerCase().includes('group chat')) || finalLine?.toLowerCase().includes('group chat') ? 
  'IMPORTANT: Include at least one option showing a group chat/messaging interface with birthday celebration theme.' : ''}

Generate 4 compact visual concepts. Each prompt: 60-80 words with [TAGS: ${tags.join(', ')}] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy center] [ASPECTS: ${dimensions || 'flexible'}] [TEXT_HINT: dark text]

Return pure JSON only.`;

  try {
    const startTime = Date.now();
    console.log('🚀 Starting visual generation with optimized settings...');
    
    // Helper to create a fresh timeout promise for each attempt (increased to 45s for reliability)
    const makeTimeoutPromise = (ms = 45000) => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), ms);
    });

    // Primary attempt with GPT-4.1 for better reliability
    let result;
    try {
      console.log('🎯 Using GPT-4.1 for visual generation with Edge Function enforcement...');
      result = await Promise.race([
        openAIService.chatJSON([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ], {
          max_completion_tokens: 800,
          model: 'gpt-4.1-2025-04-14',
          edgeOnly: true
        }),
        makeTimeoutPromise()
      ]);
    } catch (firstError) {
      console.error('❌ Primary attempt failed:', firstError);
      
      // Check for specific error types and retry appropriately
      if (firstError instanceof Error) {
        if (firstError.message.includes('truncated') || firstError.message.includes('length')) {
          console.log('🔄 Retrying with shorter prompt due to truncation...');
          const compactUserPrompt = `${category}>${subcategory}, ${tone}, ${tags.slice(0,2).join(',')}. Generate 4 visual JSON concepts. Pure JSON only.`;
          
          result = await Promise.race([
            openAIService.chatJSON([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: compactUserPrompt }
            ], {
              max_completion_tokens: 600,
              model: 'gpt-4.1-2025-04-14',
              edgeOnly: true
            }),
            makeTimeoutPromise()
          ]);
        } else if (firstError.message.includes('JSON') || firstError.message.includes('parse')) {
          console.log('🔄 Retrying with minimal prompt due to parse error...');
          const minimalPrompt = `${category}, ${tone}. Generate 4 visual concepts as JSON.`;
          
          result = await Promise.race([
            openAIService.chatJSON([
              { role: 'system', content: systemPrompt },
              { role: 'user', content: minimalPrompt }
            ], {
              max_completion_tokens: 800,
              model: 'gpt-4.1-2025-04-14',
              edgeOnly: true
            }),
            makeTimeoutPromise()
          ]);
        } else {
          throw firstError;
        }
      } else {
        throw firstError;
      }
    }
    
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

    // Apply relaxed validation to reject only severely problematic options
    validOptions = validateVisualOptions(validOptions);

    // Always ensure we have exactly 4 options
    while (validOptions.length < 4) {
      console.log(`🔄 Adding fallback option ${validOptions.length + 1}/4`);
      const fallbacks = getSlotBasedFallbacks(enrichedInputs);
      const missingSlots = ['background-only', 'subject+background', 'object', 'tone-twist']
        .filter(slot => !validOptions.some(opt => opt.slot === slot));
      
      if (missingSlots.length > 0) {
        const slotFallback = fallbacks.find(f => f.slot === missingSlots[0]);
        if (slotFallback) {
          validOptions.push(slotFallback);
          continue;
        }
      }
      
      // Generic fallback if slot-based doesn't work
      validOptions.push(fallbacks[validOptions.length % fallbacks.length]);
    }

    // Ensure we have exactly 4 options, no more
    validOptions = validOptions.slice(0, 4);

    // Check if we need a group chat + birthday option
    const hasGroupChatContext = enrichedInputs.finalLine?.toLowerCase().includes('group chat') || 
                              enrichedInputs.tags.some(tag => tag.toLowerCase().includes('group')) ||
                              enrichedInputs.tags.some(tag => tag.toLowerCase().includes('chat'));
    const isBirthday = enrichedInputs.subcategory === 'birthday';
    
    if (hasGroupChatContext && isBirthday) {
      const hasGroupChatOption = validOptions.some(opt => 
        opt.prompt.toLowerCase().includes('group chat') || 
        opt.prompt.toLowerCase().includes('chat bubble') ||
        opt.subject.toLowerCase().includes('group chat')
      );
      
      if (!hasGroupChatOption) {
        // Replace the 'object' or 'tone-twist' slot with group chat + birthday option
        const replaceIndex = validOptions.findIndex(opt => opt.slot === 'object') !== -1 ? 
          validOptions.findIndex(opt => opt.slot === 'object') : 
          validOptions.findIndex(opt => opt.slot === 'tone-twist');
        
        if (replaceIndex !== -1) {
          validOptions[replaceIndex] = {
            slot: "group-chat-birthday",
            subject: "Friends celebrating in group chat conversation",
            background: "Phone screen interface with birthday chat bubbles and party emojis",
            prompt: `Birthday celebration happening in group chat conversation, phone screen showing multiple chat bubbles with party emojis, cake icons, and birthday wishes, friends celebrating together digitally, ${tone} mood with vibrant colors [TAGS: ${tags.join(', ')}, group chat, birthday, chat bubbles] [TEXT_SAFE_ZONE: center 60x35] [CONTRAST_PLAN: auto] [NEGATIVE_PROMPT: busy patterns in center, harsh shadows] [ASPECTS: ${dimensions || '1:1'}] [TEXT_HINT: dark text]`
          };
          console.log('🎉 Injected group chat + birthday option');
        }
      }
    }

    return {
      options: validOptions,
      model: result._apiMeta?.modelUsed || 'gpt-5-mini-2025-08-07'
    };
  } catch (error) {
    console.error('❌ Visual generation failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      inputs: { category, subcategory, tone, tags: tags.slice(0, 3) }
    });
    
    // Determine specific error type for better user guidance
    let errorCode: 'TIMEOUT' | 'TRUNCATED' | 'PARSE_ERROR' | 'GENERATION_FAILED' = 'GENERATION_FAILED';
    
    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        errorCode = 'TIMEOUT';
        console.warn('⚠️ Visual generation timed out after 45s');
      } else if (error.message.includes('truncated') || error.message.includes('length')) {
        errorCode = 'TRUNCATED';
        console.warn('⚠️ Response was truncated - prompt too long');
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorCode = 'PARSE_ERROR';
        console.warn('⚠️ Response parsing failed');
      }
    }
    
    // Use contextual fallbacks instead of generic ones
    const fallbackOptions = getSlotBasedFallbacks(enrichedInputs);

    return {
      options: fallbackOptions,
      model: 'fallback',
      errorCode: errorCode as any
    };
  }
}