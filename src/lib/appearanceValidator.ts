// Appearance Validation System
// Provides validation helpers for generated images to ensure appearance consistency

import { AppearanceAttributes } from './appearanceExtractor';

export interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-1 scale
  mismatches: string[];
  retryRecommended: boolean;
  retryInstructions?: string;
}

/**
 * Validates appearance consistency (placeholder for future computer vision)
 * Currently returns recommendations based on common failure patterns
 */
export function validateAppearanceConsistency(
  attributes: AppearanceAttributes,
  imageUrl?: string,
  generatedPrompt?: string
): ValidationResult {
  const mismatches: string[] = [];
  let confidence = 0.8; // Default moderate confidence
  
  // For now, we can't analyze the actual image, but we can provide 
  // retry logic based on known problem patterns
  
  // If we have critical appearance attributes but no strong constraints in prompt
  const hasCriticalAttributes = !!(
    attributes.hair_color || 
    attributes.outfit?.color || 
    attributes.gender
  );
  
  if (hasCriticalAttributes && generatedPrompt) {
    const promptLower = generatedPrompt.toLowerCase();
    
    // Check if hair color constraint was properly emphasized
    if (attributes.hair_color && !promptLower.includes('must')) {
      mismatches.push(`Hair color (${attributes.hair_color}) may not be enforced strongly enough`);
      confidence -= 0.2;
    }
    
    // Check if gender was specified clearly
    if (attributes.gender && attributes.gender !== 'neutral' && 
        !promptLower.includes(attributes.gender === 'male' ? 'man' : 'woman')) {
      mismatches.push(`Gender (${attributes.gender}) may not be clear in prompt`);
      confidence -= 0.2;
    }
    
    // Check if outfit color was specified
    if (attributes.outfit?.color && !promptLower.includes(attributes.outfit.color)) {
      mismatches.push(`Outfit color (${attributes.outfit.color}) may not be specified`);
      confidence -= 0.1;
    }
  }
  
  const retryRecommended = mismatches.length > 0 || confidence < 0.6;
  
  return {
    isValid: confidence >= 0.6,
    confidence,
    mismatches,
    retryRecommended,
    retryInstructions: retryRecommended 
      ? buildRetryInstructions(attributes, mismatches)
      : undefined
  };
}

/**
 * Builds retry instructions for appearance consistency
 */
function buildRetryInstructions(
  attributes: AppearanceAttributes, 
  mismatches: string[]
): string {
  const instructions: string[] = [];
  
  if (attributes.hair_color) {
    instructions.push(`Emphasize: MUST BE ${attributes.hair_color} hair, no other hair colors`);
  }
  
  if (attributes.gender && attributes.gender !== 'neutral') {
    instructions.push(`Emphasize: MUST BE ${attributes.gender}, no gender substitution`);
  }
  
  if (attributes.outfit?.color) {
    instructions.push(`Emphasize: MUST wear ${attributes.outfit.color} clothing`);
  }
  
  return instructions.join('. ');
}

/**
 * Determines if a retry is needed based on common failure patterns
 */
export function shouldRetryForAppearance(
  attributes: AppearanceAttributes,
  attemptCount: number = 0
): boolean {
  // Don't retry more than 2 times for appearance issues
  if (attemptCount >= 2) return false;
  
  // Retry if we have high-priority appearance attributes
  const hasHighPriorityAttributes = !!(
    attributes.hair_color || 
    (attributes.outfit?.color && attributes.outfit?.type)
  );
  
  return hasHighPriorityAttributes;
}

/**
 * Builds strengthened prompts for retry attempts
 */
export function buildStrengthenedAppearancePrompt(
  originalPrompt: string,
  attributes: AppearanceAttributes,
  attemptCount: number
): string {
  let strengthened = originalPrompt;
  
  // Add stronger language based on attempt count
  const intensity = attemptCount === 0 ? 'MUST BE' : 'ABSOLUTELY MUST BE';
  
  // Prepend critical appearance constraints
  const criticalConstraints: string[] = [];
  
  if (attributes.hair_color) {
    criticalConstraints.push(`${intensity} ${attributes.hair_color} hair (no other hair colors)`);
  }
  
  if (attributes.gender && attributes.gender !== 'neutral') {
    criticalConstraints.push(`${intensity} ${attributes.gender} (no gender substitution)`);
  }
  
  if (attributes.outfit?.color && attributes.outfit?.type) {
    criticalConstraints.push(`${intensity} ${attributes.outfit.color} ${attributes.outfit.type}`);
  }
  
  if (criticalConstraints.length > 0) {
    strengthened = `CRITICAL REQUIREMENTS: ${criticalConstraints.join(', ')}. ${strengthened}`;
  }
  
  return strengthened;
}