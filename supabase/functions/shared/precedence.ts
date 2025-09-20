// Input precedence and auto-remap logic
import { VIIBE_CONFIG, type Step2Input, type AutoRemap, isAnimalContext, shouldBlockExplicitForAnimals } from './config.ts';

export function applyInputPrecedence(inputs: any): any {
  const processed = { ...inputs };
  
  // Apply auto-remapping rules for conflicting tone/rating combinations AND animal safety
  for (const remap of VIIBE_CONFIG.precedence.autoRemaps as AutoRemap[]) {
    // Handle tone-based remaps
    if (remap.if.tone && processed.tone === remap.if.tone && processed.rating === remap.if.rating) {
      console.log(`🔄 Auto-remapping: ${remap.if.tone} + ${remap.if.rating} → ${remap.then.rating}`);
      processed.rating = remap.then.rating;
      break;
    }
    
    // Handle category-based remaps (animal safety)
    if (remap.if.category && processed.rating === remap.if.rating) {
      const category = processed.category?.toLowerCase() || '';
      const subcategory = processed.subcategory?.toLowerCase() || '';
      
      if ((remap.if.category === 'animals' && isAnimalContext(category, subcategory)) ||
          (remap.if.subcategory && subcategory === remap.if.subcategory.toLowerCase())) {
        console.log(`🐾 Animal safety auto-remap: ${category}/${subcategory} + ${remap.if.rating} → ${remap.then.rating}`);
        processed.rating = remap.then.rating;
        processed._animalSafetyApplied = true;
        break;
      }
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
  
  // Check for animal safety violations
  const category = inputs.category?.toLowerCase() || '';
  const subcategory = inputs.subcategory?.toLowerCase() || '';
  
  if (isAnimalContext(category, subcategory) && inputs.rating === 'Explicit') {
    issues.push(`Animal safety violation: ${category}/${subcategory} + Explicit should have been auto-remapped to R`);
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}