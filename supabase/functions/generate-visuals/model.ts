// Centralized model configuration to prevent failures
export const PRIMARY_MODEL = "gpt-5-2025-08-07";
export const FALLBACK_MODEL = "gpt-5-mini-2025-08-07";
export const TIMEOUT_MS = 45000; // Increased for reliability
export const MAX_COMPLETION_TOKENS = 500; // Reduced for faster response