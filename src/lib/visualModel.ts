import { openAIService } from './openai';

export interface VisualInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  visualStyle?: string;
  finalLine?: string;
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
  const { category, subcategory, tone, tags, visualStyle, finalLine } = inputs;
  const primaryTags = tags.slice(0, 2).join(', ') || 'simple design';
  const occasion = subcategory || 'general';
  
  return [
    {
      slot: "background-only",
      subject: "Simple text overlay",
      background: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements`,
      prompt: `${tone} ${visualStyle || 'modern'} background with ${primaryTags} elements, clean typography space`
    },
    {
      slot: "subject+background", 
      subject: `Central ${occasion} themed composition`,
      background: `Complementary ${tone} environment with ${primaryTags}`,
      prompt: `Central ${occasion} themed composition in complementary ${tone} environment with ${primaryTags}`
    },
    {
      slot: "object",
      subject: `Featured ${occasion} objects or symbols`,
      background: `Minimal ${tone} backdrop`,
      prompt: `Featured ${occasion} objects or symbols on minimal ${tone} backdrop, ${primaryTags} style`
    },
    {
      slot: "tone-twist",
      subject: `${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion}`,
      background: `Creative ${visualStyle || 'artistic'} setting`,
      prompt: `${tone.charAt(0).toUpperCase() + tone.slice(1)} interpretation of ${occasion} in creative ${visualStyle || 'artistic'} setting`
    }
  ];
}

export async function generateVisualRecommendations(
  inputs: VisualInputs,
  n: number = VISUAL_OPTIONS_COUNT
): Promise<VisualResult> {
  const { category, subcategory, tone, tags, visualStyle, finalLine } = inputs;
  
  const systemPrompt = `You are a visual concept recommender for posters and social graphics. 
Use the 4-slot framework: background-only, subject+background, object, tone-twist.
Propose safe, family-friendly, logo-free visual concepts that work well for social media sharing.
Incorporate ALL provided inputs: category, subcategory, tone, visual style, final text line, and tags.
Keep concepts visually appealing and culturally appropriate.`;

  const userPrompt = `Generate exactly 4 visual concept options using the slot framework for these details:

Category: ${category}
Subcategory: ${subcategory}  
Tone: ${tone}
Visual Style: ${visualStyle || 'Not specified'}
${finalLine ? `Text Content: "${finalLine}"` : ''}
Tags: ${tags.join(', ')}

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