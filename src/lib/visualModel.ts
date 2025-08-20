import { openAIService } from './openai';

export interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  visualStyle?: string;
  finalLine?: string;
  specificEntity?: string; // For personas like "Teresa Giudice"
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

function getSlotBasedFallbacks(inputs: VisualInputs): VisualOption[] {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity } = inputs;
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
        prompt: `Dark jail cell background with prison bars, dramatic ${tone} lighting, no text or typography`
      },
      {
        slot: "subject+background",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind bars`,
        background: `Prison setting with atmospheric lighting`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} silhouette behind prison bars, dramatic jail setting, ${tone} mood lighting, no text overlays`
      },
      {
        slot: "object",
        subject: "Handcuffs and judge gavel symbols",
        background: `Minimal courtroom or legal backdrop`,
        prompt: `Legal symbols like handcuffs and gavel, minimal courtroom backdrop, ${tone} style, no text`
      },
      {
        slot: "tone-twist",
        subject: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment reimagined`,
        background: `Stylized setting reflecting personality`,
        prompt: `${entity}${needsPeople ? ` ${peopleContext}` : ''} iconic moment with ${tone} interpretation, stylized background reflecting their known traits, no text overlays`
      }
    ];
  }
  
  return [
    {
      slot: "background-only",
      subject: "Clean visual composition",
      background: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements`,
      prompt: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements, clean composition without text or typography`
    },
    {
      slot: "subject+background", 
      subject: `${needsPeople ? `${peopleContext} in ` : ''}Central ${occasion} themed composition`,
      background: `Complementary ${tone} environment with ${primaryTags}`,
      prompt: `${needsPeople ? `${peopleContext} in ` : ''}Central ${occasion} themed composition in complementary ${tone} environment with ${primaryTags}, no text overlays`
    },
    {
      slot: "object",
      subject: `Featured ${occasion} objects or symbols`,
      background: `Minimal ${tone} backdrop`,
      prompt: `Featured ${occasion} objects or symbols on minimal ${tone} backdrop, ${primaryTags} style, no text`
    },
    {
      slot: "tone-twist",
      subject: `${needsPeople ? `${peopleContext} with ` : ''}${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion}`,
      background: `Creative ${visualStyle || 'artistic'} setting`,
      prompt: `${needsPeople ? `${peopleContext} with ` : ''}${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion} in creative ${visualStyle || 'artistic'} setting, no text overlays`
    }
  ];
}

export async function generateVisualRecommendations(
  inputs: VisualInputs,
  n: number = VISUAL_OPTIONS_COUNT
): Promise<VisualResult> {
  const { category, subcategory, tone, tags, visualStyle, finalLine, specificEntity } = inputs;
  
const systemPrompt = `You are a visual concept recommender for memes and social graphics who understands pop culture references and specific personalities. 
Use the 4-slot framework: background-only, subject+background, object, tone-twist.
When a specific entity/person is mentioned, create contextually aware concepts that reference their known traits, catchphrases, or iconic moments.
For controversial topics, create tasteful but edgy concepts that capture the essence without being offensive.
Incorporate ALL provided inputs: category, subcategory, tone, visual style, final text line, tags, and specific entity.
Make concepts shareable and culturally relevant.
When specifying people as subjects, be clear about demographics (man, woman, group of people, etc.) and include details about number of people, poses, and interactions.`;

  const userPrompt = `Generate exactly 4 visual concept options using the slot framework for these details:

Category: ${category}
Subcategory: ${subcategory}  
Tone: ${tone}
Visual Style: ${visualStyle || 'Not specified'}
${finalLine ? `Text Content: "${finalLine}"` : 'No text content - create visual-only images'}
${specificEntity ? `Specific Entity/Person: ${specificEntity}` : ''}
Tags: ${tags.join(', ')}

CRITICAL REQUIREMENT: You MUST use the exact tags provided (${tags.join(', ')}) verbatim in your visual concepts. Do not paraphrase, substitute, or interpret these tags - use them exactly as written. If the tags include specific terms like "joints", "marijuana", "butts", "shattered", etc., you must incorporate these exact words into your visual descriptions.

PEOPLE & SUBJECT REQUIREMENTS:
- If tags mention "person", "people", "man", "woman", or "group", include those specific demographics in your concepts
- For "group" tags, specify 2-4 people interacting
- For "man" or "woman" tags, specify one person of that gender
- Include details about poses, expressions, and interactions when people are involved
- DO NOT include any text, typography, or written content in the image prompts unless specifically requested

${specificEntity && tags.some(tag => tag.toLowerCase().includes('jail')) ? 
`SPECIAL INSTRUCTIONS: Since this involves ${specificEntity} and jail-related tags, create 2 options directly related to jail/prison themes (bars, cells, courthouse) and 2 options that reference other iconic aspects of ${specificEntity} that fans would recognize. All options should avoid text overlays.` : 
specificEntity ? 
`SPECIAL INSTRUCTIONS: Since this involves ${specificEntity}, make sure to reference their known personality traits, catchphrases, or iconic moments that fans would immediately recognize. Focus on visual elements only, no text.` : 'Focus on creating clean visual compositions without text or typography overlays.'}

Return exactly this JSON structure with 4 options:
{
  "options": [
    {
      "slot": "background-only",
      "subject": "Brief description focusing on text-friendly background",
      "background": "Background that complements the text and context",
      "prompt": "Complete prompt for background-focused image generation"
    },
    {
      "slot": "subject+background", 
      "subject": "Central subject that relates to subcategory and tags",
      "background": "Background that enhances the main subject",
      "prompt": "Complete prompt combining subject and background"
    },
    {
      "slot": "object",
      "subject": "Key objects or symbols relevant to the context",
      "background": "Simple backdrop that doesn't compete with objects", 
      "prompt": "Complete prompt focusing on key objects and symbols"
    },
    {
      "slot": "tone-twist",
      "subject": "Creative interpretation reflecting the specified tone",
      "background": "Setting that amplifies the tone and mood",
      "prompt": "Complete prompt with tone-driven creative approach"
    }
  ]
}

Ensure each option incorporates the subcategory, tone, visual style, final text content, and at least 2 tags. Make prompts concise but descriptive for image generation.`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.8,
      max_tokens: 600,
      model: 'gpt-4o-mini'
    });

    // Validate the response structure and slots
    if (!result?.options || !Array.isArray(result.options) || result.options.length !== 4) {
      throw new Error('Invalid response format from AI - expected exactly 4 options');
    }

    const expectedSlots = ['background-only', 'subject+background', 'object', 'tone-twist'];
    const validOptions = result.options
      .filter((opt: any) => opt.subject && opt.background && opt.prompt && opt.slot)
      .map((opt: any, index: number) => ({
        ...opt,
        slot: opt.slot || expectedSlots[index] // Ensure slot is present
      }));

    if (validOptions.length !== 4) {
      throw new Error('Invalid visual options - missing required fields');
    }

    return {
      options: validOptions,
      model: 'gpt-4o-mini'
    };
  } catch (error) {
    console.error('Error generating visual recommendations:', error);
    console.warn('⚠️ Visual generation using fallback options. API may be unavailable or having issues.');
    
    // Use contextual fallbacks instead of generic ones
    const fallbackOptions = getSlotBasedFallbacks(inputs);

    return {
      options: fallbackOptions,
      model: 'fallback'
    };
  }
}