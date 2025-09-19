// Text Rendering Configuration - Centralized constants for the new text system

export const LAYOUT_PRIORITY = [
  "memeTopBottom",
  "lowerThird", 
  "negativeSpace",
  "subtleCaption"
] as const;

export const STYLE_SELECTION = {
  with_caption: ["DESIGN"] as const, // Force DESIGN for text to improve caption fidelity
  no_caption: ["REALISTIC"] as const
} as const;

export const RETRY_TIERS = [
  { layout: "memeTopBottom", style: "DESIGN" },
  { layout: "lowerThird", style: "DESIGN" },
  { layout: "memeTopBottom", style: "GENERAL" }
] as const;

// Enhanced retry tiers for long captions (≥12 words or ≥80 characters)
export const LONG_CAPTION_RETRY_TIERS = [
  { layout: "memeTopBottom", style: "DESIGN", strength: 2 },
  { layout: "memeTopBottom", style: "DESIGN", strength: 3 },
  { layout: "memeTopBottom", style: "GENERAL", strength: 3 },
  { layout: "programmaticOverlay", style: "DESIGN", strength: 1 }
] as const;

export type LayoutType = typeof LAYOUT_PRIORITY[number] | "programmaticOverlay";
export type StyleType = typeof STYLE_SELECTION.with_caption[number] | typeof STYLE_SELECTION.no_caption[number];
export type RetryTier = typeof RETRY_TIERS[number];
export type LongCaptionRetryTier = typeof LONG_CAPTION_RETRY_TIERS[number];

// Helper functions for layout and style selection
export function decideLayoutAndStyle(attempt: number): RetryTier {
  const tiers = RETRY_TIERS;
  return tiers[Math.min(attempt, tiers.length - 1)];
}

// Long caption detection and retry logic
export function isLongCaption(text: string): boolean {
  const wordCount = text.trim().split(/\s+/).length;
  const charCount = text.length;
  return wordCount >= 12 || charCount >= 80;
}

export function decideLongCaptionLayoutAndStyle(attempt: number): LongCaptionRetryTier {
  const tiers = LONG_CAPTION_RETRY_TIERS;
  return tiers[Math.min(attempt, tiers.length - 1)];
}

export function getPreferredLayout(hasCaption: boolean): LayoutType {
  return hasCaption ? LAYOUT_PRIORITY[0] : LAYOUT_PRIORITY[2]; // memeTopBottom for text, negativeSpace for no text
}

export function getPreferredStyle(hasCaption: boolean): StyleType {
  // Always use DESIGN for captions to maximize text rendering success
  return hasCaption ? "DESIGN" : STYLE_SELECTION.no_caption[0];
}

// Layout success probability mapping for intelligent validation
// Layout configuration with explicit size constraints
export const LAYOUT_CONFIG = {
  memeTopBottom: { 
    description: "bold caption top/bottom band", 
    token: "top_bottom_band", 
    max_height_pct: 25,
    success_rate: 0.95
  },
  lowerThird: { 
    description: "banner caption bottom third", 
    token: "lower_third_band", 
    max_height_pct: 20,
    success_rate: 0.90
  },
  negativeSpace: { 
    description: "caption in natural margin", 
    token: "negative_space_margin", 
    max_height_pct: 20,
    success_rate: 0.75
  },
  sideBarLeft: { 
    description: "left 25% text panel", 
    token: "left_sidebar", 
    max_height_pct: 25,
    success_rate: 0.85
  },
  sideBarRight: { 
    description: "right 25% text panel", 
    token: "right_sidebar", 
    max_height_pct: 25,
    success_rate: 0.85
  },
  badgeSticker: { 
    description: "caption inside badge/sticker", 
    token: "badge_element", 
    max_height_pct: 15,
    success_rate: 0.90
  },
  subtleCaption: { 
    description: "small unobtrusive caption", 
    token: "subtle_overlay", 
    max_height_pct: 10,
    success_rate: 0.80
  },
  programmaticOverlay: {
    description: "fallback programmatic overlay",
    token: "programmatic_overlay",
    max_height_pct: 100, // No constraint for programmatic overlay
    success_rate: 1.0
  }
} as const;

// Legacy support
export const LAYOUT_SUCCESS_RATES = {
  memeTopBottom: LAYOUT_CONFIG.memeTopBottom.success_rate,
  lowerThird: LAYOUT_CONFIG.lowerThird.success_rate,
  sideBarLeft: LAYOUT_CONFIG.sideBarLeft.success_rate,
  badgeSticker: LAYOUT_CONFIG.badgeSticker.success_rate,
  negativeSpace: LAYOUT_CONFIG.negativeSpace.success_rate,
  subtleCaption: LAYOUT_CONFIG.subtleCaption.success_rate
} as const;

export function getLayoutSuccessRate(layout: LayoutType): number {
  return LAYOUT_CONFIG[layout]?.success_rate || 0.5;
}

export function getLayoutMaxHeight(layout: LayoutType): number {
  return LAYOUT_CONFIG[layout]?.max_height_pct || 25;
}

// Size-aware validation configuration
export const SIZE_VALIDATION_CONFIG = {
  check_caption_size: true,
  max_height_pct_tolerance: 1.05, // Allow 5% tolerance
  min_font_size_threshold: 0.8, // Minimum relative font size before considering it too small
  text_density_threshold: 0.3 // Maximum text density (characters per layout area)
} as const;

// Enhanced retry tiers with size-specific constraints
export const SIZE_RETRY_TIERS = [
  { layout: "memeTopBottom", style: "DESIGN", strength: 1, size_emphasis: "NORMAL" },
  { layout: "memeTopBottom", style: "DESIGN", strength: 2, size_emphasis: "STRICT" },
  { layout: "memeTopBottom", style: "DESIGN", strength: 3, size_emphasis: "MAXIMUM" },
  { layout: "lowerThird", style: "DESIGN", strength: 2, size_emphasis: "STRICT" },
  { layout: "programmaticOverlay", style: "DESIGN", strength: 1, size_emphasis: "FALLBACK" }
] as const;

export type SizeRetryTier = typeof SIZE_RETRY_TIERS[number];

export function decideSizeAwareLayoutAndStyle(attempt: number): SizeRetryTier {
  const tiers = SIZE_RETRY_TIERS;
  return tiers[Math.min(attempt, tiers.length - 1)];
}