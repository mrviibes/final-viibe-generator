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
      max_tokens = 60,
      max_completion_tokens,
      model = 'gpt-4o-mini'
    } = options;

    // For GPT-5 models, always use max_completion_tokens; for older models, use max_tokens
    const isGPT5Model = model?.includes('gpt-5');
    const tokenLimit = max_completion_tokens || max_tokens;
    const tokenParameter = isGPT5Model ? 'max_completion_tokens' : 'max_tokens';

    // Build request body - GPT-5 models don't accept temperature parameter
    const requestBody: any = {
      model,
      messages,
      [tokenParameter]: tokenLimit,
      response_format: { type: "json_object" }
    };

    // Only add temperature for non-GPT-5 models
    if (!isGPT5Model) {
      requestBody.temperature = temperature;
    }

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
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content);
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
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 600,
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
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: `${prompt} Return as valid JSON array: [{"title": "...", "description": "..."}]`
                }
              ],
              max_tokens: 600,
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
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 400,
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