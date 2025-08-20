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
  suggestion: string;
  slot: string;
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
  
  const systemPrompt = `You are the Vibe Maker Visual Stylist.
Given the event, tone, final text, and tags, generate 4 different visual prompts.
Each prompt must match the chosen visual style and one of these slots:
1. Background-only
2. Subject + background
3. Object-focused
4. Tone twist / exaggeration
Keep each suggestion under 120 characters.
Return JSON only: {"visuals":["...","...","...","..."]}`;

  const userPrompt = `Context:
Category: ${category} > ${subcategory}
Tone: ${tone}
Chosen text: "${finalLine || ''}"
Visual style: ${visualStyle || 'realistic'}
Tags: ${tags.join(', ')}

Task:
Produce 4 distinct visual suggestions:
1) Background-only
2) Subject + background
3) Object-focused
4) Tone twist / exaggeration
All must fit the chosen visual style.
Each suggestion under 120 characters.
Output JSON only: {"visuals":["...","...","...","..."]}`;

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
    if (!result?.visuals || !Array.isArray(result.visuals)) {
      throw new Error('Invalid response format from AI');
    }

    // Ensure we have exactly 4 options and map to slot framework
    const slots = ['Background-only', 'Subject + background', 'Object-focused', 'Tone twist / exaggeration'];
    const validOptions = result.visuals
      .filter((visual: string) => visual && visual.trim().length > 0)
      .slice(0, 4)
      .map((visual: string, index: number) => ({
        suggestion: visual.trim(),
        slot: slots[index] || 'Creative'
      }));

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
        suggestion: "Clean gradient background with subtle texture",
        slot: "Background-only"
      },
      {
        suggestion: "Character in celebratory scene with party elements",
        slot: "Subject + background"
      },
      {
        suggestion: "Close-up of decorative object matching the occasion",
        slot: "Object-focused"
      },
      {
        suggestion: "Playful visual metaphor reflecting the chosen tone",
        slot: "Tone twist / exaggeration"
      }
    ];

    return {
      options: fallbackOptions.slice(0, n),
      model: 'fallback'
    };
  }
}