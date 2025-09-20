// Unified configuration system for both Step 2 and Step 3
import { VIIBE_CONFIG_V2 } from './viibe_config_v2.ts';

export const NUM_TEXT_OPTIONS = VIIBE_CONFIG_V2.system.optionsPerStep.text as 4;
export const NUM_VISUAL_OPTIONS = VIIBE_CONFIG_V2.system.optionsPerStep.visual as 4;

export interface AutoRemap {
  if: { tone: string; rating: string };
  then: { rating: string };
}

export interface ToneValidationConfig {
  comedyDisabledTones: string[];
  validators: {
    forceFunny: {
      enabledTones: string[];
      disabledTones: string[];
    };
    ratingQuotas: {
      enabledTones: string[];
      disabledTones: string[];
    };
  };
}

export interface ComedianVoiceConfig {
  banks: Record<string, string[]>;
  alwaysRandomizePerLine: boolean;
  enabledForAllTones: boolean;
}

export interface PopCultureConfig {
  enableCooldown: boolean;
  oneEntityPerBatch: boolean;
  cooldownBatches: number;
}

export interface VisualLanesConfig {
  structure: Record<string, string>;
  requirements: {
    funnyConcepts: number;
    seriousConcepts: number;
    banFiller: string[];
  };
}

export interface TagEnforcementConfig {
  hardTagsRequiredIn: number;
  enforceAfterFallbacks: boolean;
  degradeNotBypass: boolean;
}

export interface LengthBucketsConfig {
  ranges: Array<[number, number]>;
  randomizePerBatch: boolean;
  enforceVariety: boolean;
}

export interface FunnyEnhancementsConfig {
  requirePopCultureOrAbsurd: boolean;
  requireOneStoryWithTwist: boolean;
  banFlatDescriptions: boolean;
  enabledTones: string[];
  flatDescriptionPatterns: string[];
}

export interface RatingGatesConfig {
  animals: { blockExplicit: boolean; allowROnly: boolean };
  pets: { blockExplicit: boolean; allowROnly: boolean };
  dogPark: { blockExplicit: boolean; allowROnly: boolean };
  wildlife: { blockExplicit: boolean; allowROnly: boolean };
}

export interface AnimalSafetyConfig {
  banVerbs: string[];
  softSubs: Record<string, string>;
}

export interface ExplicitTermsAnimalsConfig {
  ban: string[];
}

export const VIIBE_CONFIG = {
  system: VIIBE_CONFIG_V2.system,
  precedence: VIIBE_CONFIG_V2.precedence,
  toneValidation: VIIBE_CONFIG_V2.toneValidation as ToneValidationConfig,
  comedianVoices: VIIBE_CONFIG_V2.comedianVoices as ComedianVoiceConfig,
  popCulture: VIIBE_CONFIG_V2.popCulture as PopCultureConfig,
  visualLanes: VIIBE_CONFIG_V2.visualLanes as VisualLanesConfig,
  tagEnforcement: VIIBE_CONFIG_V2.tagEnforcement as TagEnforcementConfig,
  lengthBuckets: VIIBE_CONFIG_V2.lengthBuckets as LengthBucketsConfig,
  funnyEnhancements: VIIBE_CONFIG_V2.funnyEnhancements as FunnyEnhancementsConfig,
  ratingGates: VIIBE_CONFIG_V2.ratingGates as RatingGatesConfig,
  animalSafety: VIIBE_CONFIG_V2.animalSafety as AnimalSafetyConfig,
  explicitTermsAnimals: VIIBE_CONFIG_V2.explicitTermsAnimals as ExplicitTermsAnimalsConfig
};

// Type definitions
export type Tone = 'Humorous'|'Savage'|'Playful'|'Romantic'|'Sentimental'|'Wildcard';
export type Rating = 'PG'|'PG-13'|'R'|'Explicit';

export interface Step2Input { 
  category: string; 
  subcategory: string; 
  tone: Tone; 
  style: string; 
  rating: Rating; 
  tags: string[]; 
}

export interface TextLine { 
  lane: 'option1'|'option2'|'option3'|'option4'; 
  text: string; 
}

export interface VisualLine { 
  lane: 'option1'|'option2'|'option3'|'option4'; 
  text: string; 
}

// Validation helpers
export function isComedyEnabled(tone: string): boolean {
  return !VIIBE_CONFIG.toneValidation.comedyDisabledTones.includes(tone);
}

export function shouldEnableValidator(validatorName: 'forceFunny' | 'ratingQuotas', tone: string): boolean {
  const validator = VIIBE_CONFIG.toneValidation.validators[validatorName];
  return validator.enabledTones.includes(tone) && !validator.disabledTones.includes(tone);
}

// Enforce option count - fail fast if trying to set different values
export function validateOptionCount(textOptions?: number, visualOptions?: number): void {
  if (textOptions && textOptions !== NUM_TEXT_OPTIONS) {
    throw new Error(`Invalid text option count: ${textOptions}. Must be ${NUM_TEXT_OPTIONS}`);
  }
  if (visualOptions && visualOptions !== NUM_VISUAL_OPTIONS) {
    throw new Error(`Invalid visual option count: ${visualOptions}. Must be ${NUM_VISUAL_OPTIONS}`);
  }
}

// Animal safety helper functions
export function isAnimalContext(category: string, subcategory: string): boolean {
  const animalCategories = ['animals', 'pets', 'wildlife'];
  const animalSubcategories = ['dog park', 'pets', 'animals', 'wildlife', 'zoo', 'veterinarian', 'pet store', 'animal shelter'];
  
  return animalCategories.includes(category.toLowerCase()) || 
         animalSubcategories.includes(subcategory.toLowerCase());
}

export function shouldBlockExplicitForAnimals(category: string, subcategory: string, rating: Rating): boolean {
  if (!isAnimalContext(category, subcategory)) return false;
  return rating === 'Explicit';
}

export function sanitizeAnimalVerbs(text: string): { sanitized: string; wasModified: boolean } {
  let sanitized = text;
  let wasModified = false;
  
  const { animalSafety } = VIIBE_CONFIG;
  
  for (const [badVerb, replacement] of Object.entries(animalSafety.softSubs)) {
    const regex = new RegExp(`\\b${badVerb}\\b`, 'gi');
    if (regex.test(sanitized)) {
      sanitized = sanitized.replace(regex, replacement);
      wasModified = true;
      console.log(`🐾 Animal safety: Replaced "${badVerb}" with "${replacement}"`);
    }
  }
  
  return { sanitized, wasModified };
}

export function filterExplicitTermsForAnimals(text: string, category: string, subcategory: string): { cleaned: string; wasModified: boolean } {
  if (!isAnimalContext(category, subcategory)) {
    return { cleaned: text, wasModified: false };
  }
  
  let cleaned = text;
  let wasModified = false;
  const { explicitTermsAnimals } = VIIBE_CONFIG;
  
  for (const term of explicitTermsAnimals.ban) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '[filtered]');
      wasModified = true;
      console.log(`🚫 Animal explicit filter: Removed "${term}" from animal context`);
    }
  }
  
  return { cleaned, wasModified };
}