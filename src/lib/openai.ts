import { supabase } from "@/integrations/supabase/client";

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface OpenAISearchResult {
  title: string;
  description: string;
}

export interface GenerateTextParams {
  tone: string;
  category?: string;
  subtopic?: string;
  pick?: string;
  tags?: string[];
  characterLimit: number;
  mode?: string;
}

// Helper to safely parse JSON arrays from API responses
function safeParseArray(content: string): OpenAISearchResult[] {
  try {
    // Remove any markdown code blocks
    const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse OpenAI response:', error);
    return [];
  }
}

export class OpenAIService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key');
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = null;
    localStorage.removeItem('openai_api_key');
  }

  async chatJSON(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
    edgeOnly?: boolean;
  } = {}): Promise<any> {
    const {
      temperature = 0.8,
      max_tokens = 500,
      max_completion_tokens = 1500, // Increased for GPT-5
      model = 'gpt-5-2025-08-07',
      edgeOnly = false
    } = options;

    const retryModels = [
      'gpt-5-2025-08-07'
    ];

    let lastError: Error | null = null;
    let retryAttempt = 0;

    for (const tryModel of retryModels) {
      try {
        let result;
        
        // Try Edge Function first (always available), fallback to direct API if user has key
        try {
          console.log(`Attempting Edge Function call with model: ${tryModel}`);
          const { data, error } = await supabase.functions.invoke('ai-chat-json', {
            body: {
              messages,
              options: {
                temperature,
                max_tokens,
                max_completion_tokens,
                model: tryModel
              }
            }
          });

          if (error) {
            throw new Error(error.message || 'Edge Function error');
          }

          // No fallbacks - let retry handle it
          if (tryModel.includes('gpt-5') && (!data || !data.content || data.content.trim() === '')) {
            console.log(`Empty response from ${tryModel}, will retry with next model`);
          }

          result = data;
          console.log('Edge Function call successful');
        } catch (edgeError) {
          console.warn('Edge Function failed:', edgeError);
          
          // If edgeOnly is true, don't fallback to direct API
          if (edgeOnly) {
            throw edgeError;
          }
          
          // Fallback to direct API if user has a key
          if (this.apiKey) {
            result = await this.attemptChatJSON(messages, {
              temperature,
              max_tokens,
              max_completion_tokens,
              model: tryModel
            });
          } else {
            throw edgeError;
          }
        }
        
        // Add metadata about the API call
        if (result && typeof result === 'object') {
          result._apiMeta = {
            modelUsed: tryModel,
            retryAttempt,
            originalModel: model,
            method: this.apiKey && result._apiMeta ? 'direct' : 'edge-function'
          };
        }
        
        return result;
      } catch (error) {
        console.warn(`Model ${tryModel} failed:`, error);
        lastError = error as Error;
        retryAttempt++;
        
        // Don't retry if it's an auth error
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
        }
      }
    }

    throw lastError || new Error('All model attempts failed');
  }

  private async attemptChatJSON(messages: Array<{role: string; content: string}>, options: {
    temperature?: number;
    max_tokens?: number;
    max_completion_tokens?: number;
    model?: string;
  }): Promise<any> {
    const {
      temperature = 0.8,
      max_tokens = 2500,
      max_completion_tokens,
      model = 'gpt-5-2025-08-07'
    } = options;

    const isGPT5Model = model?.startsWith('gpt-5');
    const tokenLimit = max_completion_tokens || max_tokens;
    const tokenParameter = isGPT5Model ? 'max_completion_tokens' : 'max_tokens';

    // Build request body
    const requestBody: any = {
      model,
      messages,
      [tokenParameter]: tokenLimit
    };

    // Always add response_format for JSON, and temperature for non-GPT5 models
    requestBody.response_format = { type: "json_object" };
    if (!isGPT5Model) {
      requestBody.temperature = temperature;
    }

    console.log(`Attempting API call with model: ${model}, tokens: ${tokenLimit}`);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;
    
    console.log(`API Response Debug - Model: ${model}, Finish Reason: ${finishReason}, Content Length: ${content?.length || 0}`);
    console.log(`Raw content preview: ${content?.substring(0, 200) || 'NO CONTENT'}`);
    
    if (!content || content.trim() === '') {
      if (finishReason === 'length') {
        throw new Error('Response truncated - prompt too long. Try shorter input.');
      }
      throw new Error(`No content received from OpenAI (finish_reason: ${finishReason})`);
    }

    // Enhanced JSON parsing with cleanup
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content that failed to parse:', content);
      
      // Clean content by removing common wrapping patterns
      let cleanedContent = content
        .replace(/```json\s*|\s*```/g, '') // Remove code fences
        .replace(/^[^{]*/, '') // Remove text before first {
        .replace(/[^}]*$/, '') // Remove text after last }
        .trim();
      
      // Try parsing cleaned content
      try {
        const parsed = JSON.parse(cleanedContent);
        console.log('Successfully parsed cleaned JSON:', parsed);
        return parsed;
      } catch (cleanError) {
        // Final attempt: extract largest JSON block
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted JSON from response:', extracted);
            return extracted;
          } catch (e) {
            console.error('Failed to parse extracted JSON:', e);
          }
        }
      }
      
      throw new Error(`Invalid JSON response from OpenAI (model: ${model})`);
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    const prompt = `Generate exactly 5 creative and relevant ${category.toLowerCase()} suggestions related to "${searchTerm}". Focus on popular, well-known entries that would be engaging for users. Keep descriptions concise (1-2 sentences).

Return as a json object with this exact format:
{
  "suggestions": [
    {"title": "Suggestion Title", "description": "Brief description"}
  ]
}`;

    try {
      const result = await this.chatJSON([
        { role: 'user', content: prompt }
      ], {
        max_completion_tokens: 1000, // Increased for GPT-5
        model: 'gpt-5-2025-08-07'
      });

      return result?.suggestions || [];
    } catch (error) {
      console.error('Pop culture search failed:', error);
      
      // Return fallback suggestions based on category
      const fallbacks: Record<string, OpenAISearchResult[]> = {
        movies: [
          { title: "Popular Action Movie", description: "High-energy blockbuster with thrilling sequences" },
          { title: "Acclaimed Drama", description: "Award-winning dramatic performance" }
        ],
        music: [
          { title: "Chart-topping Hit", description: "Current popular song everyone's talking about" },
          { title: "Classic Rock Anthem", description: "Timeless rock song that never gets old" }
        ],
        default: [
          { title: "Trending Topic", description: "Popular culture reference everyone knows" },
          { title: "Cultural Icon", description: "Widely recognized cultural phenomenon" }
        ]
      };
      
      return fallbacks[category.toLowerCase()] || fallbacks.default;
    }
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    const { tone, category, subtopic, pick, tags = [], characterLimit, mode } = params;
    
    let prompt = `Generate exactly 4 short ${tone.toLowerCase()} text options for: ${category}${subtopic ? `, ${subtopic}` : ''}${pick ? `, ${pick}` : ''}.`;
    
    if (tags.length > 0) {
      prompt += ` Include these: ${tags.join(', ')}.`;
    }
    
    // Add mode-specific instructions
    if (mode === "comedian-mix") {
      prompt = `Generate exactly 4 HILARIOUS text options using different comedian styles. 40–80 chars each, punchy, fresh.`;
      if (tags.length > 0) prompt += ` Include: ${tags.join(', ')}.`;
    } else if (mode && mode !== "regenerate") {
      const modeMap = {
        "story-mode": " Use mini-story format.",
        "punchline-first": " Lead with punchline.",
        "pop-culture": " Include trending references.",
        "roast-level": " Increase savage tone.",
        "wildcard": " Be experimental."
      };
      prompt += modeMap[mode] || "";
    }
    
    prompt += ` Max ${characterLimit} chars each. Creative and engaging.

Return as a json object: {"options": ["text 1", "text 2", "text 3", "text 4"]}`;

    try {
      const result = await this.chatJSON([
        { role: 'user', content: prompt }
      ], {
        max_completion_tokens: 1000, // Increased for GPT-5
        model: 'gpt-5-2025-08-07'
      });

      const options = result?.options || [];
      
      // Enforce character limit and ensure exactly 4 options
      const processedOptions = options.map((option: string) => {
        const cleaned = option.replace(/^["']|["']$/g, '').trim();
        return cleaned.length > characterLimit ? cleaned.slice(0, characterLimit) : cleaned;
      }).slice(0, 4);

      // Ensure we have exactly 4 valid options or throw
      if (processedOptions.length < 4 || processedOptions.some(opt => !opt || opt.trim() === '')) {
        throw new Error('Insufficient valid options generated');
      }

      return processedOptions;
      
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      // Throw instead of returning fallbacks - let textGen.ts handle this
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();