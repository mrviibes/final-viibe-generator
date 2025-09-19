// Pop Culture Context Detection with Entity Management
import { getCurrentBatchEntity, validateContentForIdentityViolations } from './entityManager';

// Dynamic pop culture detection using managed entities
const MUSIC_TERMS = [
  'hits', 'songs', 'albums', 'tracks', 'singles', 'ep', 'mixtape', 'playlist',
  'discography', 'bangers', 'chart', 'billboard', 'grammy', 'tour', 'concert',
  'studio', 'record', 'music', 'beat', 'lyrics', 'verse', 'chorus', 'hook'
];

const GENERAL_POP_TERMS = [
  'viral', 'trending', 'meme', 'tiktok', 'instagram', 'twitter', 'social media',
  'netflix', 'streaming', 'binge', 'app', 'platform'
];

export interface PopCultureContext {
  isPopCulture: boolean;
  detectedTerms: string[];
  riskLevel: 'low' | 'medium' | 'high';
  selectedEntity: string | null;
  identityViolations: string[];
}

export function detectPopCultureContext(text: string): PopCultureContext {
  const lowerText = text.toLowerCase();
  const detectedTerms: string[] = [];
  
  // Check for current batch entity
  const selectedEntity = getCurrentBatchEntity();
  if (selectedEntity && lowerText.includes(selectedEntity.toLowerCase())) {
    detectedTerms.push(selectedEntity);
  }
  
  // Check for music terms
  MUSIC_TERMS.forEach(term => {
    if (lowerText.includes(term)) {
      detectedTerms.push(term);
    }
  });
  
  // Check for general pop culture terms
  GENERAL_POP_TERMS.forEach(term => {
    if (lowerText.includes(term)) {
      detectedTerms.push(term);
    }
  });
  
  // Check for identity protection violations
  const identityViolations = validateContentForIdentityViolations(text);
  
  const isPopCulture = detectedTerms.length > 0 || selectedEntity !== null;
  
  // Determine risk level based on number and type of terms
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (identityViolations.length > 0) {
    riskLevel = 'high'; // Identity violations are high risk
  } else if (detectedTerms.length >= 3) {
    riskLevel = 'high';
  } else if (detectedTerms.length >= 2 || selectedEntity !== null) {
    riskLevel = 'medium';
  }
  
  return {
    isPopCulture,
    detectedTerms,
    riskLevel,
    selectedEntity,
    identityViolations
  };
}

export function getEnhancedNegativePrompt(baseNegativePrompt: string, context: PopCultureContext): string {
  if (!context.isPopCulture) {
    return baseNegativePrompt;
  }
  
  const popCultureBlockers = [
    'no background words', 'no song titles', 'no album names', 'no track listings',
    'no artist names in background', 'no fake music text', 'no poster layouts',
    'no album covers', 'no discography text', 'no music charts', 'no playlist text',
    'no concert posters', 'no tour dates', 'no record labels'
  ];
  
  // Add identity protection blockers
  if (context.identityViolations.length > 0 || context.riskLevel === 'high') {
    popCultureBlockers.push(
      'no personal identity targeting', 'no physical appearance jokes',
      'no identity-based discrimination', 'focus on behaviors not traits',
      'no entertainment industry text', 'no celebrity gossip text', 
      'no magazine headlines', 'no tabloid layouts'
    );
  }
  
  return `${baseNegativePrompt}, ${popCultureBlockers.join(', ')}`;
}

export function shouldForceDesignStyle(context: PopCultureContext): boolean {
  // Force DESIGN style for medium to high risk pop culture content
  return context.isPopCulture && context.riskLevel !== 'low';
}