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

export const VIIBE_CONFIG = {
  system: VIIBE_CONFIG_V2.system,
  precedence: VIIBE_CONFIG_V2.precedence,
  toneValidation: VIIBE_CONFIG_V2.toneValidation as ToneValidationConfig,
  comedianVoices: VIIBE_CONFIG_V2.comedianVoices as ComedianVoiceConfig,
  popCulture: VIIBE_CONFIG_V2.popCulture as PopCultureConfig,
  visualLanes: VIIBE_CONFIG_V2.visualLanes as VisualLanesConfig,
  tagEnforcement: VIIBE_CONFIG_V2.tagEnforcement as TagEnforcementConfig
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