// Configuration for background-only image generation
export const BACKGROUND_ONLY_CONFIG = {
  // Always generate backgrounds without text for perfect overlay
  FORCE_BACKGROUND_ONLY: true,
  
  // Text overlay enforcement
  MAX_TEXT_HEIGHT_PERCENT: 25,
  
  // Quality gate thresholds
  SPELLING_ACCURACY_THRESHOLD: 80,
  RETRY_ON_QUALITY_FAILURE: false, // Use overlay fallback instead
  
  // Layout mapping for clean generation
  LAYOUT_MAPPING: {
    'memeTopBottom': 'top and bottom bands',
    'lowerThird': 'bottom third area',
    'negativeSpace': 'negative space areas',
    'subtleCaption': 'bottom overlay space',
    'badge': 'corner badge space'
  }
};

// Validate that visual generation uses background-only approach
export function validateBackgroundOnlyMode(response: any): {
  valid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check if background-only mode is enforced
  if (!response.generation_mode || response.generation_mode !== 'background-only') {
    issues.push('Background-only mode not enforced');
    recommendations.push('Force background-only generation for clean overlay');
  }
  
  // Check if overlay is recommended
  if (!response.overlay_recommended) {
    issues.push('Text overlay not recommended');
    recommendations.push('Use CaptionOverlay component for text placement');
  }
  
  // Check quality gates
  if (!response.quality_gates?.text_injection_disabled) {
    issues.push('Text injection not properly disabled');
    recommendations.push('Disable text injection in image generation');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    recommendations
  };
}

// Log visual generation compliance
export function logVisualCompliance(response: any, layout: string, caption: string) {
  const validation = validateBackgroundOnlyMode(response);
  
  console.log('🎯 Background-Only Generation Compliance:', {
    valid: validation.valid,
    mode: response.generation_mode,
    overlay_required: response.overlay_recommended,
    layout: layout,
    caption_length: caption.length,
    quality_gates: response.quality_gates,
    issues: validation.issues,
    recommendations: validation.recommendations
  });
  
  if (!validation.valid) {
    console.warn('⚠️ Visual generation compliance issues:', validation.issues);
  }
}