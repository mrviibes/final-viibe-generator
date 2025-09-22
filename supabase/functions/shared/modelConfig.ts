// Centralized model configuration to prevent "mini" drift
export const MODEL_CONFIG = {
  PRIMARY: 'gpt-5-2025-08-07',
  MINI: 'gpt-5-mini-2025-08-07',
  NANO: 'gpt-5-nano-2025-08-07',
  GPT4: 'gpt-4.1-2025-04-14'
} as const;

export const DEFAULT_MODEL = MODEL_CONFIG.PRIMARY;

export function isGPT5Model(model: string): boolean {
  return model.startsWith('gpt-5');
}

export function getTokenParameter(model: string): 'max_completion_tokens' | 'max_tokens' {
  return isGPT5Model(model) ? 'max_completion_tokens' : 'max_tokens';
}

export function supportsTemperature(model: string): boolean {
  // GPT-5 models don't support temperature parameter
  return !isGPT5Model(model);
}