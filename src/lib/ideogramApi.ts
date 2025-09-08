const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh' | 'allorigins' | 'thingproxy';
  apiKey?: string; // For proxy.cors.sh
}

const PROXY_CONFIGS = {
  'direct': '',
  'cors-anywhere': 'https://cors-anywhere.herokuapp.com/',
  'proxy-cors-sh': 'https://proxy.cors.sh/',
  'allorigins': 'https://api.allorigins.win/raw?url=',
  'thingproxy': 'https://thingproxy.freeboard.io/fetch/'
};

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_1' | 'V_1_TURBO' | 'V_2' | 'V_2_TURBO' | 'V_2A' | 'V_2A_TURBO' | 'V_3';
  magic_prompt_option: 'AUTO';
  seed?: number;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME';
  negative_prompt?: string;
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
let proxySettings: ProxySettings = { type: 'direct' };

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

export function setProxySettings(settings: ProxySettings) {
  proxySettings = settings;
  localStorage.setItem('ideogram_proxy_settings', JSON.stringify(settings));
}

export function getProxySettings(): ProxySettings {
  const stored = localStorage.getItem('ideogram_proxy_settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      proxySettings = parsed;
      return parsed;
    } catch {
      // Invalid JSON, fallback to default
    }
  }
  return proxySettings;
}

// Model management for V3 testing
export function setIdeogramModel(model: 'V_2A_TURBO' | 'V_3') {
  localStorage.setItem('ideogram_model', model);
}

export function getIdeogramModel(): 'V_2A_TURBO' | 'V_3' {
  const stored = localStorage.getItem('ideogram_model');
  return (stored === 'V_3') ? 'V_3' : 'V_2A_TURBO';
}

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  try {
    const testUrls: Record<ProxySettings['type'], string> = {
      'direct': 'https://httpbin.org/status/200',
      'cors-anywhere': 'https://cors-anywhere.herokuapp.com/https://httpbin.org/status/200',
      'proxy-cors-sh': 'https://proxy.cors.sh/https://httpbin.org/status/200',
      'allorigins': 'https://api.allorigins.win/raw?url=https://httpbin.org/status/200',
      'thingproxy': 'https://thingproxy.freeboard.io/fetch/https://httpbin.org/status/200'
    };

    const headers: Record<string, string> = {};
    if (proxyType === 'cors-anywhere') {
      headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    const response = await fetch(testUrls[proxyType], { 
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Auto-select the best working proxy
export async function findBestProxy(): Promise<ProxySettings['type']> {
  const proxyTypes: ProxySettings['type'][] = ['direct', 'proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere'];
  
  for (const proxyType of proxyTypes) {
    try {
      const works = await testProxyConnection(proxyType);
      if (works) {
        console.log(`Auto-selected proxy: ${proxyType}`);
        return proxyType;
      }
    } catch (error) {
      console.log(`Failed to test ${proxyType}:`, error);
    }
  }
  
  // Fallback to direct if nothing works
  return 'direct';
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  // Remove client-side API key check - let backend handle it
  // This prevents blocking calls when backend generation succeeds

  // Import supabase client dynamically
  const { supabase } = await import('@/integrations/supabase/client');
  
  try {
    console.log('Calling Supabase Edge Function for Ideogram generation...');
    
    const { data, error } = await supabase.functions.invoke('ideogram-generate', {
        body: {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          model: request.model,
          magic_prompt_option: request.magic_prompt_option,
          style_type: request.style_type,
          negative_prompt: request.negative_prompt
        }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new IdeogramAPIError(`Generation failed: ${error.message}`, 500);
    }

    if (data.error) {
      console.error('Generation error from edge function:', data.error);
      throw new IdeogramAPIError(data.error, 500);
    }

    if (!data.image_url) {
      throw new IdeogramAPIError('No image URL returned from generation', 500);
    }

    // Return in the expected format
    return {
      created: new Date().toISOString(),
      data: [{
        prompt: request.prompt,
        resolution: request.aspect_ratio,
        url: data.image_url,
        is_image_safe: true
      }]
    };

  } catch (error) {
    if (error instanceof IdeogramAPIError) {
      throw error;
    }
    
    console.error('Unexpected error calling edge function:', error);
    throw new IdeogramAPIError(
      `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}