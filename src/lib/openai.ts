import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MODEL, isGPT5Model, getTokenParameter, supportsTemperature } from "./modelConfig";

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
      max_completion_tokens = 1500,
      model = DEFAULT_MODEL,
      edgeOnly = true
    } = options;

    // STRICT MODE: Only use the requested model, no fallbacks
    const retryModels = [model];

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
          
          // STRICT MODE: edgeOnly = true, no fallbacks to direct API
          throw edgeError;
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

    const isGPT5 = isGPT5Model(model);
    const tokenLimit = max_completion_tokens || max_tokens;
    const tokenParameter = getTokenParameter(model);

    // Build request body
    const requestBody: any = {
      model,
      messages,
      [tokenParameter]: tokenLimit
    };

    // Always add response_format for JSON, and temperature for non-GPT5 models
    requestBody.response_format = { type: "json_object" };
    if (supportsTemperature(model)) {
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
    // Shortened prompt to avoid token limits
    const prompt = `5 ${category} suggestions for "${searchTerm}". Popular, engaging entries.

JSON format:
{"suggestions": [{"title": "Name", "description": "Brief"}]}`;

    try {
      const result = await this.chatJSON([
        { role: 'user', content: prompt }
      ], {
        max_completion_tokens: 300,
        model: DEFAULT_MODEL
      });

      const suggestions = result?.suggestions || [];
      
      // If AI fails, combine with fallback database
      if (suggestions.length === 0) {
        return this.getPopCultureFallbacks(category, searchTerm);
      }
      
      return suggestions;
    } catch (error) {
      console.error('Pop culture search failed:', error);
      return this.getPopCultureFallbacks(category, searchTerm);
    }
  }

  private getPopCultureFallbacks(category: string, searchTerm: string): OpenAISearchResult[] {
    const term = searchTerm.toLowerCase();
    
    // Comprehensive fallback database
    const fallbackDatabase: Record<string, OpenAISearchResult[]> = {
      movies: [
        { title: "Avengers: Endgame", description: "Epic superhero finale" },
        { title: "The Dark Knight", description: "Batman vs Joker masterpiece" },
        { title: "Titanic", description: "Epic romance disaster film" },
        { title: "Star Wars", description: "Space opera saga" },
        { title: "Marvel Movies", description: "Superhero cinematic universe" },
        { title: "Disney Films", description: "Animated classics and new hits" },
        { title: "Horror Movies", description: "Scary films and thrillers" },
        { title: "Comedy Films", description: "Laugh-out-loud comedies" },
        { title: "Action Movies", description: "High-octane adventures" },
        { title: "Romantic Movies", description: "Love stories and rom-coms" }
      ],
      music: [
        { title: "Taylor Swift", description: "Pop superstar and songwriter" },
        { title: "Bad Bunny", description: "Reggaeton and Latin trap king" },
        { title: "Drake", description: "Hip-hop and R&B megastar" },
        { title: "Billie Eilish", description: "Alternative pop sensation" },
        { title: "The Weeknd", description: "R&B and pop hitmaker" },
        { title: "Hip-Hop Hits", description: "Latest rap and hip-hop tracks" },
        { title: "Pop Classics", description: "Timeless pop anthems" },
        { title: "Rock Legends", description: "Iconic rock bands and songs" },
        { title: "Country Music", description: "Modern and classic country" },
        { title: "Electronic Dance", description: "EDM and dance hits" }
      ],
      celebrities: [
        { title: "Adam Sandler", description: "Comedy movie star and SNL alum" },
        { title: "Will Ferrell", description: "Anchorman and Step Brothers comedian" },
        { title: "Jim Carrey", description: "The Mask and Ace Ventura star" },
        { title: "Kevin Hart", description: "Stand-up comedian and actor" },
        { title: "Chris Rock", description: "Stand-up legend and comedian" },
        { title: "Steve Carell", description: "The Office and movie comedy star" },
        { title: "Ben Stiller", description: "Zoolander and Meet the Parents actor" },
        { title: "Eddie Murphy", description: "Beverly Hills Cop and comedy legend" },
        { title: "Dwayne Johnson", description: "The Rock actor and wrestler" },
        { title: "Ryan Reynolds", description: "Deadpool actor and comedian" },
        { title: "Zendaya", description: "Spider-Man and Euphoria star" },
        { title: "Chris Evans", description: "Captain America actor" },
        { title: "Margot Robbie", description: "Barbie and Harley Quinn star" },
        { title: "Leonardo DiCaprio", description: "Titanic and Oscar-winning actor" },
        { title: "Jennifer Lawrence", description: "Hunger Games and Silver Linings star" },
        { title: "Robert Downey Jr.", description: "Iron Man and Sherlock Holmes actor" },
        { title: "Scarlett Johansson", description: "Black Widow and Lost in Translation star" },
        { title: "Social Media Stars", description: "TikTok and Instagram influencers" },
        { title: "Marvel Actors", description: "MCU superhero stars" },
        { title: "Comedy Legends", description: "Stand-up and movie comedians" },
        { title: "Reality TV Stars", description: "Popular reality show personalities" },
        { title: "Athletes", description: "Sports superstars" }
      ],
      'tv shows': [
        { title: "Stranger Things", description: "Supernatural 80s nostalgia" },
        { title: "The Office", description: "Workplace mockumentary comedy" },
        { title: "Game of Thrones", description: "Fantasy epic series" },
        { title: "Breaking Bad", description: "Chemistry teacher turned criminal" },
        { title: "Friends", description: "Classic NYC friend group sitcom" },
        { title: "Netflix Originals", description: "Streaming platform exclusives" },
        { title: "Reality TV", description: "Competition and lifestyle shows" },
        { title: "Anime Series", description: "Popular Japanese animation" },
        { title: "Comedy Shows", description: "Sitcoms and sketch comedy" },
        { title: "Drama Series", description: "Compelling dramatic storylines" }
      ],
      memes: [
        { title: "Distracted Boyfriend", description: "Classic choice meme format" },
        { title: "This is Fine", description: "Dog in burning room meme" },
        { title: "Drake Pointing", description: "Approval/disapproval format" },
        { title: "Surprised Pikachu", description: "Shocked reaction meme" },
        { title: "Woman Yelling at Cat", description: "Dinner table argument meme" },
        { title: "TikTok Trends", description: "Viral TikTok meme formats" },
        { title: "Twitter Memes", description: "Social media viral content" },
        { title: "Reaction GIFs", description: "Animated response images" },
        { title: "Internet Slang", description: "Online phrases and terms" },
        { title: "Viral Videos", description: "YouTube and social media hits" }
      ],
      trends: [
        { title: "Social Media Trends", description: "Latest platform crazes" },
        { title: "Fashion Trends", description: "Current style movements" },
        { title: "Dance Trends", description: "Viral choreography and moves" },
        { title: "Food Trends", description: "Popular recipes and restaurants" },
        { title: "Tech Trends", description: "Latest gadgets and apps" },
        { title: "Fitness Trends", description: "Popular workout styles" },
        { title: "Travel Trends", description: "Hot destinations and experiences" },
        { title: "Beauty Trends", description: "Makeup and skincare crazes" },
        { title: "Gaming Trends", description: "Popular games and streamers" },
        { title: "Lifestyle Trends", description: "Cultural movements and habits" }
      ]
    };

    let categoryResults = fallbackDatabase[category.toLowerCase()] || [];
    
    // Filter results based on search term if provided
    if (term && term.length > 0) {
      // First, look for exact matches (prioritize these)
      const exactMatches = categoryResults.filter(item => 
        item.title.toLowerCase() === term ||
        item.title.toLowerCase().includes(term)
      );
      
      // Then look for partial matches in title or description
      const partialMatches = categoryResults.filter(item => 
        !exactMatches.includes(item) && (
          item.title.toLowerCase().includes(term) || 
          item.description.toLowerCase().includes(term)
        )
      );
      
      // Combine exact matches first, then partial matches
      const filtered = [...exactMatches, ...partialMatches];
      
      if (filtered.length > 0) {
        categoryResults = filtered;
      }
    }
    
    // Return up to 5 results, shuffled for variety
    return categoryResults
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
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
        max_completion_tokens: 1000,
        model: DEFAULT_MODEL
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