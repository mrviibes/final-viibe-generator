const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: '10:16' | '16:10' | '9:16' | '16:9' | '3:2' | '2:3' | '4:3' | '3:4' | '1:1';
  model: 'V_3_TURBO';
  magic_prompt_option: 'AUTO';
  seed?: number;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
}

export interface IdeogramGenerateResponse {
  created: string;
  data: Array<{
    prompt: string;
    resolution: string;
    url: string;
    is_image_safe: boolean;
  }>;
}

export class IdeogramAPIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'IdeogramAPIError';
  }
}

let apiKey: string | null = null;

export function setIdeogramApiKey(key: string) {
  apiKey = key;
  localStorage.setItem('ideogram_api_key', key);
}

export function getIdeogramApiKey(): string | null {
  if (apiKey) return apiKey;
  
  const stored = localStorage.getItem('ideogram_api_key');
  if (stored) {
    apiKey = stored;
    return stored;
  }
  
  return null;
}

export function clearIdeogramApiKey() {
  apiKey = null;
  localStorage.removeItem('ideogram_api_key');
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  const key = getIdeogramApiKey();
  if (!key) {
    throw new IdeogramAPIError('No API key provided');
  }

  const formData = new FormData();
  formData.append('prompt', request.prompt);
  formData.append('aspect_ratio', request.aspect_ratio);
  formData.append('model', request.model);
  formData.append('magic_prompt_option', request.magic_prompt_option);
  
  if (request.seed !== undefined) {
    formData.append('seed', request.seed.toString());
  }
  
  if (request.style_type) {
    formData.append('style_type', request.style_type);
  }

  try {
    const response = await fetch(IDEOGRAM_API_BASE, {
      method: 'POST',
      headers: {
        'Api-Key': key,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new IdeogramAPIError(errorMessage, response.status);
    }

    const data = await response.json();
    return data as IdeogramGenerateResponse;
  } catch (error) {
    if (error instanceof IdeogramAPIError) {
      throw error;
    }
    
    throw new IdeogramAPIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}