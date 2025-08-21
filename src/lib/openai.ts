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
  } = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    const {
      temperature = 0.8,
      max_tokens = 2500,
      max_completion_tokens,
      model = 'gpt-5-mini-2025-08-07'
    } = options;

    // Retry strategy: try current model, then fallback models
    const retryModels = [
      model,
      model.startsWith('gpt-5-mini') ? 'gpt-5-2025-08-07' : model,
      'gpt-4.1-2025-04-14'
    ].filter((m, i, arr) => arr.indexOf(m) === i); // Remove duplicates

    let lastError: Error | null = null;
    let retryAttempt = 0;

    for (const tryModel of retryModels) {
      try {
        const result = await this.attemptChatJSON(messages, {
          temperature,
          max_tokens,
          max_completion_tokens,
          model: tryModel
        });
        
        // Add metadata about the API call
        if (result && typeof result === 'object') {
          result._apiMeta = {
            modelUsed: tryModel,
            retryAttempt,
            originalModel: model
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
      model = 'gpt-5-mini-2025-08-07'
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

    // Try to parse JSON
    try {
      const parsed = JSON.parse(content);
      console.log('Successfully parsed JSON:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content that failed to parse:', content);
      
      // For any model, try to extract JSON from the response
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
      
      throw new Error(`Invalid JSON response from OpenAI (model: ${model})`);
    }
  }

  async searchPopCulture(category: string, searchTerm: string): Promise<OpenAISearchResult[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    const prompt = `Generate 5 creative and relevant ${category.toLowerCase()} suggestions related to "${searchTerm}". Focus on popular, well-known entries that would be engaging for users. Keep descriptions concise (1-2 sentences).`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "pop_culture_suggestions",
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["title", "description"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Parse the structured JSON response
      const parsed = JSON.parse(content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to safe parsing if structured response fails
      if (error instanceof Error && error.message.includes('JSON')) {
        try {
          const data = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-5-mini-2025-08-07',
              messages: [
                {
                  role: 'user',
                  content: `${prompt} Return as valid JSON array: [{"title": "...", "description": "..."}]`
                }
              ],
              max_tokens: 800,
              temperature: 0.7,
            }),
          });
          
          if (data.ok) {
            const fallbackData = await data.json();
            const fallbackContent = fallbackData.choices[0]?.message?.content;
            return safeParseArray(fallbackContent || '');
          }
        } catch {
          // Ignore fallback errors
        }
      }
      throw error;
    }
  }

  async generateShortTexts(params: GenerateTextParams): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not set');
    }

    const { tone, category, subtopic, pick, tags = [], characterLimit } = params;
    
    let contextParts = [];
    if (category) contextParts.push(`Category: ${category}`);
    if (subtopic) contextParts.push(`Topic: ${subtopic}`);
    if (pick) contextParts.push(`Specific focus: ${pick}`);
    
    const context = contextParts.join(', ');
    
    let prompt = `Generate exactly 4 short ${tone.toLowerCase()} text options for: ${context}.`;
    
    if (tags.length > 0) {
      prompt += ` IMPORTANT: Each option MUST include ALL of these exact words/tags: ${tags.join(', ')}.`;
    }
    
    prompt += ` Each option must be ${characterLimit} characters or fewer. Be creative and engaging. Return as a JSON array of strings.`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 600,
          temperature: 0.8,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "text_options",
              schema: {
                type: "object",
                properties: {
                  options: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 4,
                    maxItems: 4
                  }
                },
                required: ["options"]
              }
            }
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsed = JSON.parse(content);
      const options = parsed.options || [];
      
      // Enforce character limit on client side as final guard
      return options.map((option: string) => {
        const cleaned = option.replace(/^["']|["']$/g, '').trim();
        return cleaned.length > characterLimit ? cleaned.slice(0, characterLimit) : cleaned;
      }).slice(0, 4); // Ensure exactly 4 options
      
    } catch (error) {
      console.error('OpenAI text generation error:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();