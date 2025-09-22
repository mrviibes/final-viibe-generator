// Quality gates and monitoring for visual generation
export interface QualityCheck {
  passed: boolean;
  message: string;
  metric?: number;
  threshold?: number;
}

export interface QualityReport {
  overall: boolean;
  checks: {
    textSize: QualityCheck;
    spelling: QualityCheck;
    faceVisibility: QualityCheck;
    layoutCompliance: QualityCheck;
  };
  metadata: {
    layout: string;
    model: string;
    overlayUsed: boolean;
    retryCount?: number;
  };
}

// Text size validation - critical 25% height enforcement
export function validateTextSize(textHeight: number, imageHeight: number): QualityCheck {
  const percentage = (textHeight / imageHeight) * 100;
  const threshold = 25;
  
  return {
    passed: percentage <= threshold,
    message: `Text occupies ${percentage.toFixed(1)}% of image height`,
    metric: percentage,
    threshold
  };
}

// Spelling accuracy check using simple similarity
export function validateSpelling(renderedText: string, originalText: string): QualityCheck {
  const clean1 = renderedText.toLowerCase().replace(/[^\w\s]/g, '');
  const clean2 = originalText.toLowerCase().replace(/[^\w\s]/g, '');
  
  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);
  
  let matches = 0;
  words2.forEach(word => {
    if (words1.some(w => w.includes(word) || word.includes(w))) {
      matches++;
    }
  });
  
  const accuracy = words2.length > 0 ? (matches / words2.length) * 100 : 0;
  const threshold = 80;
  
  return {
    passed: accuracy >= threshold,
    message: `Spelling accuracy: ${accuracy.toFixed(1)}%`,
    metric: accuracy,
    threshold
  };
}

// Face visibility check (placeholder for future OCR integration)
export function validateFaceVisibility(imageData?: string): QualityCheck {
  // Placeholder - would use face detection API in production
  return {
    passed: true,
    message: "Face visibility check passed (placeholder)"
  };
}

// Layout compliance check
export function validateLayoutCompliance(layout: string, textBounds?: { width: number; height: number; x: number; y: number }): QualityCheck {
  if (!textBounds) {
    return {
      passed: true,
      message: "Layout compliance check skipped (no bounds data)"
    };
  }
  
  // Check if text is in expected position based on layout
  const isCompliant = layout === 'memeTopBottom' ? 
    (textBounds.y < 100 || textBounds.y > 400) : // Top or bottom placement
    textBounds.y > 300; // Bottom placement for other layouts
  
  return {
    passed: isCompliant,
    message: `Layout compliance: ${isCompliant ? 'passed' : 'failed'} for ${layout}`
  };
}

// Comprehensive quality assessment
export function runQualityGates(params: {
  textHeight: number;
  imageHeight: number;
  renderedText: string;
  originalText: string;
  layout: string;
  model: string;
  overlayUsed: boolean;
  imageData?: string;
  textBounds?: { width: number; height: number; x: number; y: number };
}): QualityReport {
  
  const checks = {
    textSize: validateTextSize(params.textHeight, params.imageHeight),
    spelling: validateSpelling(params.renderedText, params.originalText),
    faceVisibility: validateFaceVisibility(params.imageData),
    layoutCompliance: validateLayoutCompliance(params.layout, params.textBounds)
  };
  
  const overall = Object.values(checks).every(check => check.passed);
  
  const report: QualityReport = {
    overall,
    checks,
    metadata: {
      layout: params.layout,
      model: params.model,
      overlayUsed: params.overlayUsed
    }
  };
  
  // Log quality report for monitoring
  console.log('🎯 Visual Quality Report:', {
    overall: overall ? 'PASSED' : 'FAILED',
    failedChecks: Object.entries(checks)
      .filter(([_, check]) => !check.passed)
      .map(([name, check]) => `${name}: ${check.message}`),
    metadata: report.metadata
  });
  
  return report;
}

// Auto-retry logic based on quality failures
export function shouldRetryGeneration(report: QualityReport): { retry: boolean; reason?: string } {
  if (report.overall) {
    return { retry: false };
  }
  
  // Critical failures that warrant retry
  if (!report.checks.textSize.passed) {
    return { 
      retry: true, 
      reason: `Text size violation: ${report.checks.textSize.message}` 
    };
  }
  
  if (!report.checks.spelling.passed && report.checks.spelling.metric && report.checks.spelling.metric < 60) {
    return { 
      retry: true, 
      reason: `Severe spelling errors: ${report.checks.spelling.message}` 
    };
  }
  
  return { retry: false };
}