// Text Rendering Configuration - Centralized constants for the new text system

export const LAYOUT_PRIORITY = [
  "memeTopBottom",
  "lowerThird", 
  "negativeSpace",
  "subtleCaption"
] as const;

export const STYLE_SELECTION = {
  with_caption: ["DESIGN", "GENERAL"] as const,
  no_caption: ["REALISTIC"] as const
} as const;

export const RETRY_TIERS = [
  { layout: "memeTopBottom", style: "DESIGN" },
  { layout: "lowerThird", style: "DESIGN" },
  { layout: "memeTopBottom", style: "GENERAL" }
] as const;

export type LayoutType = typeof LAYOUT_PRIORITY[number];
export type StyleType = typeof STYLE_SELECTION.with_caption[number] | typeof STYLE_SELECTION.no_caption[number];
export type RetryTier = typeof RETRY_TIERS[number];

// Helper functions for layout and style selection
export function decideLayoutAndStyle(attempt: number): RetryTier {
  const tiers = RETRY_TIERS;
  return tiers[Math.min(attempt, tiers.length - 1)];
}

export function getPreferredLayout(hasCaption: boolean): LayoutType {
  return hasCaption ? LAYOUT_PRIORITY[0] : LAYOUT_PRIORITY[2]; // memeTopBottom for text, negativeSpace for no text
}

export function getPreferredStyle(hasCaption: boolean): StyleType {
  return hasCaption ? STYLE_SELECTION.with_caption[0] : STYLE_SELECTION.no_caption[0];
}

// Layout success probability mapping for intelligent validation
export const LAYOUT_SUCCESS_RATES = {
  memeTopBottom: 0.95,   // 95% success rate (most reliable)
  lowerThird: 0.90,      // 90% success rate
  sideBarLeft: 0.85,     // 85% success rate  
  badgeSticker: 0.90,    // 90% success rate
  negativeSpace: 0.75,   // 75% success rate (improved from 20%)
  subtleCaption: 0.80    // 80% success rate (improved from 30%)
} as const;

export function getLayoutSuccessRate(layout: LayoutType): number {
  return LAYOUT_SUCCESS_RATES[layout] || 0.5;
}