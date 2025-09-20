// Input precedence and auto-remap logic
import { VIIBE_CONFIG, type Step2Input, type AutoRemap } from './config.ts';

export function applyInputPrecedence(inputs: any): any {
  const processed = { ...inputs };
  
  // Apply auto-remapping rules for conflicting tone/rating combinations
  for (const remap of VIIBE_CONFIG.precedence.autoRemaps as AutoRemap[]) {
    if (processed.tone === remap.if.tone && processed.rating === remap.if.rating) {
      console.log(`🔄 Auto-remapping: ${remap.if.tone} + ${remap.if.rating} → ${remap.then.rating}`);
      processed.rating = remap.then.rating;
      break;
    }
  }
  
  // Style inheritance - Wildcard uses current tone rules
  if (processed.style === "wildcard") {
    processed._inheritedStyle = "standard";
  }
  
  return processed;
}

export function validatePrecedenceCompliance(inputs: any): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for conflicting combinations that should have been auto-remapped
  const prohibitedCombos = [
    { tone: "Sentimental", rating: "R" },
    { tone: "Sentimental", rating: "Explicit" },
    { tone: "Romantic", rating: "R" },
    { tone: "Romantic", rating: "Explicit" }
  ];
  
  for (const combo of prohibitedCombos) {
    if (inputs.tone === combo.tone && inputs.rating === combo.rating) {
      issues.push(`Prohibited combination: ${combo.tone} + ${combo.rating} should have been auto-remapped`);
    }
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}