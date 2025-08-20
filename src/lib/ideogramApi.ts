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
  
  const makeRequest = async (proxyType: ProxySettings['type']): Promise<Response> => {
    // Create JSON payload wrapped in image_request object
    const payload: any = {
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      model: request.model,
      magic_prompt_option: request.magic_prompt_option,
    };
    
    if (request.seed !== undefined) {
      payload.seed = request.seed;
    }
    
    if (request.style_type) {
      payload.style_type = request.style_type;
    }

    const requestBody = { image_request: payload };

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

    // Debug log the request structure (without sensitive headers)
    console.log('Ideogram API request:', { url: url.replace(key, '[REDACTED]'), body: requestBody });

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
  };

  try {
    let response: Response;
    let lastError: Error | null = null;
    
    // Try the configured proxy method first
    try {
      response = await makeRequest(settings.type);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // If the configured method fails, try fallback strategies
      if (settings.type === 'direct') {
        console.log('Direct request failed, trying CORS proxy fallback...');
        try {
          response = await makeRequest('cors-anywhere');
        } catch (fallbackError) {
          console.log('CORS proxy also failed, trying proxy.cors.sh...');
          response = await makeRequest('proxy-cors-sh');
        }
      } else {
        // If proxy failed, try direct as fallback
        console.log(`${settings.type} proxy failed, trying direct request...`);
        response = await makeRequest('direct');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      
      // Check for specific CORS demo error
      if (response.status === 403 && errorText.includes('corsdemo')) {
        throw new IdeogramAPIError(
          'CORS proxy requires activation. Please visit https://cors-anywhere.herokuapp.com/corsdemo and enable temporary access, then try again.',
          403
        );
      }
      
      // Check for specific 400 error related to image_request structure
      if (response.status === 400 && errorText.includes('image_request')) {
        throw new IdeogramAPIError(
          'Request format error: The payload must be wrapped as { image_request: {...} }. This has been corrected automatically.',
          400
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
    
    // Check if it's a CORS error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new IdeogramAPIError(
        'CORS error: Unable to connect to Ideogram API directly. Please enable CORS proxy in settings.',
        0
      );
    }
    
    throw new IdeogramAPIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}