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
}

export interface VisualResult {
  options: VisualOption[];
  model: string;
}

const VISUAL_OPTIONS_COUNT = 4;

export async function generateVisualRecommendations(
  inputs: VisualInputs,
  n: number = VISUAL_OPTIONS_COUNT
): Promise<VisualResult> {
  const { category, subcategory, tone, tags, visualStyle, finalLine } = inputs;
  
  const systemPrompt = `You are a visual concept recommender for posters and social graphics. 
Propose safe, family-friendly, logo-free visual concepts that work well for social media sharing.
Each concept should have a clear subject and appropriate background that matches the context.
Keep concepts visually appealing and culturally appropriate.`;

  const userPrompt = `Generate ${n} visual concept options for a graphic with these details:

Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Visual Style: ${visualStyle || 'Not specified'}
${finalLine ? `Text Content: "${finalLine}"` : ''}
Tags: ${tags.join(', ')}

Return exactly ${n} options as a JSON object with this structure:
{
  "options": [
    {
      "subject": "Brief description of the main subject/focus",
      "background": "Brief description of the background/setting", 
      "prompt": "Complete compact prompt combining subject + background for image generation"
    }
  ]
}

Each option should be distinct and appropriate for the context. Make the prompt field concise but descriptive enough for image generation.`;

  try {
    const result = await openAIService.chatJSON([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.8,
      max_tokens: 1000,
      model: 'gpt-5-2025-08-07'
    });

    // Validate the response structure
    if (!result?.options || !Array.isArray(result.options)) {
      throw new Error('Invalid response format from AI');
    }

    // Ensure we have the requested number of options
    const validOptions = result.options
      .filter((opt: any) => opt.subject && opt.background && opt.prompt)
      .slice(0, n);

    if (validOptions.length === 0) {
      throw new Error('No valid visual options generated');
    }

    return {
      options: validOptions,
      model: 'gpt-5-2025-08-07'
    };
  } catch (error) {
    console.error('Error generating visual recommendations:', error);
    
    // Fallback options
    const fallbackOptions: VisualOption[] = [
      {
        subject: "Simple centered composition",
        background: "Clean gradient background",
        prompt: "Simple centered composition with clean gradient background, minimalist design"
      },
      {
        subject: "Geometric patterns",
        background: "Solid color backdrop",
        prompt: "Geometric patterns on solid color backdrop, modern abstract design"
      },
      {
        subject: "Nature elements",
        background: "Soft blurred scenery",
        prompt: "Nature elements with soft blurred scenery background, organic feel"
      },
      {
        subject: "Typography focus",
        background: "Textured surface",
        prompt: "Typography focused design on textured surface background, clean layout"
      }
    ];

    return {
      options: fallbackOptions.slice(0, n),
      model: 'fallback'
    };
  }
}