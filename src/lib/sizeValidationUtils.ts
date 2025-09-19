// Size Validation Utilities - Smart size constraint validation
import { LAYOUT_CONFIG, SIZE_VALIDATION_CONFIG, decideSizeAwareLayoutAndStyle } from './textRenderingConfig';
import { validateCaptionMatch } from './visualValidator';

export interface SizeValidationResult {
  isValid: boolean;
  violationProbability: number;
  recommendedFontScale: number;
  shouldUseAlternativeLayout: boolean;
  alternativeLayout?: string;
  sizeIssues: string[];
}

/**
 * Validates if a caption is likely to exceed size constraints for a given layout
 */
export function validateCaptionSize(
  caption: string,
  layoutId: string,
  attempt: number = 1
): SizeValidationResult {
  const layoutConfig = LAYOUT_CONFIG[layoutId] || LAYOUT_CONFIG.memeTopBottom;
  const maxHeightPct = layoutConfig.max_height_pct;
  
  const wordCount = caption.trim().split(/\s+/).length;
  const charCount = caption.length;
  const sizeIssues: string[] = [];
  
  // Calculate text density metrics
  const textDensity = charCount / maxHeightPct;
  const wordDensity = wordCount / maxHeightPct;
  
  let violationProbability = 0;
  
  // Base probability from text density
  if (textDensity > 8) {
    violationProbability += 0.3;
    sizeIssues.push('high_character_density');
  }
  
  if (wordDensity > 2) {
    violationProbability += 0.3;
    sizeIssues.push('high_word_density');
  }
  
  // Penalties for very long captions
  if (wordCount > 15) {
    violationProbability += 0.2;
    sizeIssues.push('excessive_word_count');
  }
  
  if (charCount > 100) {
    violationProbability += 0.15;
    sizeIssues.push('excessive_character_count');
  }
  
  // Layout-specific penalties
  switch (layoutId) {
    case 'subtleCaption':
      if (wordCount > 8) {
        violationProbability += 0.4;
        sizeIssues.push('too_long_for_subtle');
      }
      break;
    
    case 'badgeSticker':
      if (wordCount > 6) {
        violationProbability += 0.3;
        sizeIssues.push('too_long_for_badge');
      }
      break;
    
    case 'lowerThird':
      if (wordCount > 12) {
        violationProbability += 0.2;
        sizeIssues.push('too_long_for_lower_third');
      }
      break;
  }
  
  // Constraint penalty for small layouts
  if (maxHeightPct < 15) {
    violationProbability += 0.2;
    sizeIssues.push('strict_layout_constraint');
  }
  
  // Cap probability at 1.0
  violationProbability = Math.min(1.0, violationProbability);
  
  // Determine if valid based on threshold
  const isValid = violationProbability <= SIZE_VALIDATION_CONFIG.text_density_threshold;
  
  // Calculate recommended font scale
  let recommendedFontScale = 1.0;
  if (violationProbability > 0.3) {
    recommendedFontScale = Math.max(0.5, 1.0 - (violationProbability * 0.5));
  }
  
  // Determine if alternative layout should be used
  const shouldUseAlternativeLayout = !isValid && attempt < 3;
  let alternativeLayout: string | undefined;
  
  if (shouldUseAlternativeLayout) {
    // Use size-aware retry logic
    const retryTier = decideSizeAwareLayoutAndStyle(attempt);
    alternativeLayout = retryTier.layout;
  }
  
  return {
    isValid,
    violationProbability,
    recommendedFontScale,
    shouldUseAlternativeLayout,
    alternativeLayout,
    sizeIssues
  };
}

/**
 * Checks if a rendered image likely has size violations based on text patterns
 */
export function detectRenderedSizeViolation(
  expectedText: string,
  renderedText: string,
  layoutId: string
): { hasViolation: boolean; confidence: number; issues: string[] } {
  const issues: string[] = [];
  let confidence = 0;
  
  // Check caption match quality first
  const matchResult = validateCaptionMatch(expectedText, renderedText);
  
  // Look for patterns that indicate size violations
  
  // 1. Text splitting patterns (common when text is too large)
  const splitPatterns = [
    /(.+)\s+(.+)\s+(.+).*\n.*(.+)/, // Multi-line split
    /^[A-Z\s]{2,15}$/, // Short all-caps fragments
    /\b\w{1,3}\s+\w{1,3}\s+\w{1,3}\b/, // Very short word fragments
  ];
  
  if (splitPatterns.some(pattern => pattern.test(renderedText))) {
    issues.push('text_splitting_detected');
    confidence += 0.4;
  }
  
  // 2. Font size indicators (very small or cramped text)
  if (renderedText.length > 50 && renderedText.split('\n').length > 2) {
    issues.push('multi_line_cramping');
    confidence += 0.3;
  }
  
  // 3. Layout-specific violation patterns
  const layoutConfig = LAYOUT_CONFIG[layoutId];
  if (layoutConfig && layoutConfig.max_height_pct < 20) {
    // For small layouts, even minor issues are concerning
    if (!matchResult.exactMatch) {
      issues.push('small_layout_text_issues');
      confidence += 0.2;
    }
  }
  
  // 4. OCR mismatch that suggests rendering issues
  if (!matchResult.legible) {
    issues.push('ocr_illegibility');
    confidence += 0.3;
  }
  
  if (matchResult.isSplit) {
    issues.push('confirmed_text_split');
    confidence += 0.5;
  }
  
  confidence = Math.min(1.0, confidence);
  const hasViolation = confidence > 0.3;
  
  return { hasViolation, confidence, issues };
}

/**
 * Gets optimal layout for caption based on size constraints
 */
export function getOptimalLayoutForCaption(caption: string): string {
  const wordCount = caption.trim().split(/\s+/).length;
  const charCount = caption.length;
  
  // For very short captions, any layout works
  if (wordCount <= 3 && charCount <= 30) {
    return 'subtleCaption';
  }
  
  // For medium captions, prefer reliable layouts
  if (wordCount <= 8 && charCount <= 60) {
    return 'lowerThird';
  }
  
  // For longer captions, use most reliable layout
  if (wordCount <= 15 && charCount <= 100) {
    return 'memeTopBottom';
  }
  
  // For very long captions, always use memeTopBottom or fallback
  return 'memeTopBottom';
}

/**
 * Smart retry strategy for size violations
 */
export function getNextRetryStrategy(
  caption: string,
  currentLayout: string,
  attempt: number,
  sizeViolation: boolean
): { layout: string; strength: number; fontScale: number } {
  if (sizeViolation) {
    // Use size-aware retry tiers
    const retryTier = decideSizeAwareLayoutAndStyle(attempt);
    
    // Calculate progressive font scaling
    let fontScale = 1.0;
    if (attempt > 1) {
      fontScale = Math.max(0.6, 1.0 - (attempt * 0.15));
    }
    
    return {
      layout: retryTier.layout,
      strength: retryTier.strength || 1,
      fontScale
    };
  }
  
  // Standard retry logic for non-size issues
  const layouts = ['memeTopBottom', 'lowerThird', 'negativeSpace'];
  const layoutIndex = Math.min(attempt - 1, layouts.length - 1);
  
  return {
    layout: layouts[layoutIndex],
    strength: Math.min(attempt, 3),
    fontScale: 1.0
  };
}