const IDEOGRAM_API_BASE = 'https://api.ideogram.ai/generate';

export interface ProxySettings {
  type: 'direct' | 'cors-anywhere' | 'proxy-cors-sh';
  apiKey?: string; // For proxy.cors.sh
}

const PROXY_CONFIGS = {
  'cors-anywhere': 'https://cors-anywhere.herokuapp.com/',
  'proxy-cors-sh': 'https://proxy.cors.sh/'
};

export interface IdeogramGenerateRequest {
  prompt: string;
  aspect_ratio: 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1';
  model: 'V_1' | 'V_1_TURBO' | 'V_2' | 'V_2_TURBO' | 'V_2A' | 'V_2A_TURBO' | 'V_3';
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

export async function testProxyConnection(proxyType: ProxySettings['type']): Promise<boolean> {
  try {
    const testUrl = proxyType === 'direct' 
      ? 'https://httpbin.org/status/200'
      : proxyType === 'cors-anywhere'
      ? 'https://cors-anywhere.herokuapp.com/https://httpbin.org/status/200'
      : 'https://proxy.cors.sh/https://httpbin.org/status/200';
    
    const response = await fetch(testUrl, { 
      method: 'GET',
      headers: proxyType === 'cors-anywhere' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function generateIdeogramImage(request: IdeogramGenerateRequest): Promise<IdeogramGenerateResponse> {
  const key = getIdeogramApiKey();
  if (!key) {
    throw new IdeogramAPIError('No API key provided');
  }

  const settings = getProxySettings();
  
  const makeRequest = async (proxyType: ProxySettings['type'], currentModel: string): Promise<Response> => {
    let url = IDEOGRAM_API_BASE;
    const headers: Record<string, string> = {
      'Api-Key': key,
      'Content-Type': 'application/json',
    };

    if (proxyType === 'cors-anywhere') {
      url = PROXY_CONFIGS['cors-anywhere'] + IDEOGRAM_API_BASE;
      headers['X-Requested-With'] = 'XMLHttpRequest';
    } else if (proxyType === 'proxy-cors-sh') {
      url = PROXY_CONFIGS['proxy-cors-sh'] + IDEOGRAM_API_BASE;
      if (settings.apiKey) {
        headers['x-cors-api-key'] = settings.apiKey;
      }
    }

    // Always use JSON format wrapped in image_request
    const payload: any = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      model: currentModel,
      magic_prompt_option: request.magic_prompt_option,
    };
    
    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }
    
    if (request.style_type) {
      payload.style_type = request.style_type;
    }

    const requestBody = JSON.stringify({ image_request: payload });

    // Debug log the request structure (without sensitive headers)
    console.log('Ideogram API request:', { 
      url: url.replace(key, '[REDACTED]'), 
      model: currentModel,
      payload: { ...payload, prompt: payload.prompt.substring(0, 50) + '...' }
    });

    return fetch(url, {
      method: 'POST',
      headers,
      body: requestBody,
    });
  };

  let currentModel = request.model;
  let lastError: Error | null = null;

  // Auto-retry logic with model downgrade
  const tryRequest = async (proxyType: ProxySettings['type'], model: string): Promise<IdeogramGenerateResponse> => {
    try {
      const response = await makeRequest(proxyType, model);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Request failed with ${response.status}:`, errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        
        // Check for specific CORS demo error
        if (response.status === 403 && errorText.includes('corsdemo')) {
          throw new IdeogramAPIError(
            'CORS proxy requires activation. Please visit https://cors-anywhere.herokuapp.com/corsdemo and enable temporary access, then try again.',
            403
          );
        }
        
        // Check for 415 errors (common with proxy issues)
        if (response.status === 415) {
          throw new IdeogramAPIError(
            'Media type error (415). This may be a proxy configuration issue.',
            415
          );
        }
        
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
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Try different proxy methods and model downgrades
  const proxyMethods: ProxySettings['type'][] = [settings.type];
  if (settings.type !== 'proxy-cors-sh') proxyMethods.push('proxy-cors-sh');
  if (settings.type !== 'cors-anywhere') proxyMethods.push('cors-anywhere');
  if (settings.type !== 'direct') proxyMethods.push('direct');

  for (const proxyType of proxyMethods) {
    try {
      return await tryRequest(proxyType, currentModel);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`${proxyType} failed with model ${currentModel}:`, lastError.message);
      
      // If V3 failed and we haven't tried V2A_TURBO yet, try downgrading
      if (currentModel === 'V_3' && (error as any).status !== 403) {
        try {
          console.log('Retrying with V_2A_TURBO model...');
          return await tryRequest(proxyType, 'V_2A_TURBO');
        } catch (downgradeError) {
          console.log(`${proxyType} also failed with V_2A_TURBO:`, downgradeError);
        }
      }
    }
  }
  // If all methods failed, throw the last error
  if (lastError instanceof IdeogramAPIError) {
    throw lastError;
  }
  
  // Check if it's a CORS error
  if (lastError instanceof TypeError && lastError.message.includes('Failed to fetch')) {
    throw new IdeogramAPIError(
      'CORS error: Unable to connect to Ideogram API directly. Try enabling a CORS proxy in settings.',
      0
    );
  }
  
  // Check for common content filtering keywords that might cause issues
  const contentFilteringKeywords = ['marijuana', 'cannabis', 'weed', 'joint', 'drug', 'smoking'];
  const hasFilteredContent = contentFilteringKeywords.some(keyword => 
    request.prompt.toLowerCase().includes(keyword)
  );
  
  if (hasFilteredContent) {
    throw new IdeogramAPIError(
      'Content may have been flagged by content filters. Try using different words or themes to test if the API is working.',
      400
    );
  }
  
  throw new IdeogramAPIError(
    `All connection methods failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}