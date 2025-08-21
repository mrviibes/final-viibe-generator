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

    // Configure URL and headers based on proxy type
    switch (proxyType) {
      case 'cors-anywhere':
        url = PROXY_CONFIGS['cors-anywhere'] + IDEOGRAM_API_BASE;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        break;
      case 'proxy-cors-sh':
        url = PROXY_CONFIGS['proxy-cors-sh'] + IDEOGRAM_API_BASE;
        if (settings.apiKey) {
          headers['x-cors-api-key'] = settings.apiKey;
        }
        break;
      case 'allorigins':
        url = PROXY_CONFIGS['allorigins'] + encodeURIComponent(IDEOGRAM_API_BASE);
        break;
      case 'thingproxy':
        url = PROXY_CONFIGS['thingproxy'] + IDEOGRAM_API_BASE;
        break;
      case 'direct':
      default:
        // Use direct URL
        break;
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
            'CORS_DEMO_REQUIRED',
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

  // Auto-select best proxy if user hasn't manually configured one
  let proxyMethods: ProxySettings['type'][];
  
  if (settings.type === 'direct') {
    // If user selected direct, try auto-selection first, then fallbacks
    const bestProxy = await findBestProxy();
    proxyMethods = [bestProxy];
    if (bestProxy !== 'proxy-cors-sh') proxyMethods.push('proxy-cors-sh');
    if (bestProxy !== 'allorigins') proxyMethods.push('allorigins');
    if (bestProxy !== 'thingproxy') proxyMethods.push('thingproxy');
    if (bestProxy !== 'cors-anywhere') proxyMethods.push('cors-anywhere');
  } else {
    // User has specific preference, try it first then fallbacks
    proxyMethods = [settings.type];
    const fallbacks: ProxySettings['type'][] = ['proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere', 'direct'];
    for (const fallback of fallbacks) {
      if (fallback !== settings.type) {
        proxyMethods.push(fallback);
      }
    }
  }

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