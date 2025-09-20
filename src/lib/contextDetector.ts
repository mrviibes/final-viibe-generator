// Enhanced context detection and classification system
import { detectSubSubcategory, getLexiconForContext, selectContextualWords } from './contextLexicon';

export interface DetectedContext {
  primary: string;
  secondary?: string;
  confidence: number;
  lexiconWords: string[];
  categoryPath: string[];
  metadata: {
    hasPopCulture: boolean;
    hasLocation: boolean;
    hasPersonalReference: boolean;
    suggestedTone?: string;
    suggestedRating?: string;
  };
}

export interface ContextAnalysis {
  detectedContext: DetectedContext | null;
  enhancedTags: string[];
  suggestedLexicon: string[];
  contextualPromptAdditions: string[];
  generationRecipe: GenerationRecipe;
}

export interface GenerationRecipe {
  contextType: string;
  lexiconSource: string;
  wordsInjected: string[];
  toneAdjustments: string[];
  ratingAdjustments: string[];
  comedianVoiceHints: string[];
  fallbackStrategy: string;
  timestamp: number;
}

// CONTEXT CLASSIFICATION PATTERNS
const CONTEXT_CLASSIFIERS = {
  location: {
    patterns: [
      /\b(london|new york|los angeles|chicago|miami|boston|seattle|austin|portland)\b/i,
      /\b(paris|tokyo|rome|madrid|berlin|amsterdam|sydney|toronto)\b/i,
      /\b(beach|mountains|city|downtown|suburb|neighborhood|hood)\b/i
    ],
    weight: 0.8
  },
  
  relationship: {
    patterns: [
      /\b(dating|relationship|marriage|wedding|boyfriend|girlfriend|husband|wife)\b/i,
      /\b(single|coupled|engaged|married|divorced|breakup|hookup)\b/i,
      /\b(tinder|bumble|hinge|match|swipe|ghost|breadcrumb)\b/i
    ],
    weight: 0.9
  },
  
  work: {
    patterns: [
      /\b(job|work|career|office|boss|meeting|deadline|promotion|salary)\b/i,
      /\b(tech|finance|startup|corporate|freelance|remote|wfh)\b/i,
      /\b(programmer|developer|designer|manager|director|ceo|engineer)\b/i
    ],
    weight: 0.7
  },
  
  entertainment: {
    patterns: [
      /\b(netflix|streaming|binge|series|movie|show|tv|youtube|tiktok)\b/i,
      /\b(music|concert|festival|album|artist|spotify|playlist)\b/i,
      /\b(gaming|xbox|playstation|nintendo|twitch|steam)\b/i
    ],
    weight: 0.6
  },
  
  sports: {
    patterns: [
      /\b(basketball|football|soccer|baseball|hockey|tennis|golf)\b/i,
      /\b(nba|nfl|fifa|olympics|lebron|brady|messi|jordan)\b/i,
      /\b(game|match|season|playoffs|championship|draft|trade)\b/i
    ],
    weight: 0.8
  },
  
  food: {
    patterns: [
      /\b(pizza|burger|sushi|tacos|coffee|restaurant|cooking|recipe)\b/i,
      /\b(foodie|chef|kitchen|delivery|takeout|uber eats|grubhub)\b/i,
      /\b(breakfast|lunch|dinner|brunch|snack|meal|diet|healthy)\b/i
    ],
    weight: 0.5
  },
  
  social: {
    patterns: [
      /\b(instagram|facebook|twitter|snapchat|social media|influencer)\b/i,
      /\b(post|story|like|follow|comment|hashtag|viral|trending)\b/i,
      /\b(selfie|photo|picture|filter|aesthetic|vibe|mood)\b/i
    ],
    weight: 0.6
  }
};

// ENHANCED CONTEXT DETECTION
export function analyzeContext(
  text: string,
  category: string,
  subcategory: string,
  tags: string[] = [],
  tone?: string
): ContextAnalysis {
  const analysisText = `${text} ${category} ${subcategory} ${tags.join(' ')}`.toLowerCase();
  
  // Detect primary context with confidence scoring
  let bestMatch: { type: string; confidence: number } | null = null;
  
  for (const [contextType, classifier] of Object.entries(CONTEXT_CLASSIFIERS)) {
    let matches = 0;
    let totalPatterns = classifier.patterns.length;
    
    for (const pattern of classifier.patterns) {
      if (pattern.test(analysisText)) {
        matches++;
      }
    }
    
    const confidence = (matches / totalPatterns) * classifier.weight;
    
    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = { type: contextType, confidence };
    }
  }
  
  // Detect sub-subcategory
  const subSubcategory = detectSubSubcategory(analysisText, category, subcategory);
  
  // Build detected context
  let detectedContext: DetectedContext | null = null;
  
  if (bestMatch && bestMatch.confidence > 0.3) {
    const lexiconWords = subSubcategory 
      ? selectContextualWords(subSubcategory, tone || 'humorous', 5)
      : [];
    
    detectedContext = {
      primary: bestMatch.type,
      secondary: subSubcategory || undefined,
      confidence: bestMatch.confidence,
      lexiconWords,
      categoryPath: [category, subcategory, subSubcategory].filter(Boolean),
      metadata: {
        hasPopCulture: /\b(netflix|tiktok|instagram|celebrity|viral|trending|meme)\b/i.test(analysisText),
        hasLocation: CONTEXT_CLASSIFIERS.location.patterns.some(p => p.test(analysisText)),
        hasPersonalReference: /\b(my|me|i|you|your|we|us|our)\b/i.test(analysisText),
        suggestedTone: inferToneFromContext(bestMatch.type, analysisText),
        suggestedRating: inferRatingFromContext(bestMatch.type, analysisText)
      }
    };
  }
  
  // Generate contextual enhancements
  const enhancedTags = enhanceTagsWithContext(tags, detectedContext);
  const suggestedLexicon = detectedContext?.lexiconWords || [];
  const contextualPromptAdditions = buildContextualPromptAdditions(detectedContext, tone);
  
  // Create generation recipe
  const generationRecipe: GenerationRecipe = {
    contextType: detectedContext?.primary || 'generic',
    lexiconSource: detectedContext?.secondary || 'none',
    wordsInjected: suggestedLexicon,
    toneAdjustments: contextualPromptAdditions.filter(a => a.includes('tone')),
    ratingAdjustments: contextualPromptAdditions.filter(a => a.includes('rating')),
    comedianVoiceHints: getComedianVoiceHints(detectedContext),
    fallbackStrategy: determineFallbackStrategy(detectedContext),
    timestamp: Date.now()
  };
  
  return {
    detectedContext,
    enhancedTags,
    suggestedLexicon,
    contextualPromptAdditions,
    generationRecipe
  };
}

// CONTEXT-AWARE TONE INFERENCE
function inferToneFromContext(contextType: string, text: string): string | undefined {
  const toneHints = {
    work: /\b(stress|deadline|boss|meeting|corporate)\b/i.test(text) ? 'savage' : 'serious',
    relationship: /\b(dating|single|breakup|ghost)\b/i.test(text) ? 'humorous' : 'romantic',
    entertainment: 'playful',
    sports: /\b(losing|sucks|terrible|awful)\b/i.test(text) ? 'savage' : 'humorous',
    location: /\b(expensive|crowded|traffic|weather)\b/i.test(text) ? 'savage' : 'playful',
    social: /\b(influencer|fake|validation|attention)\b/i.test(text) ? 'savage' : 'playful'
  };
  
  return toneHints[contextType as keyof typeof toneHints];
}

// CONTEXT-AWARE RATING INFERENCE
function inferRatingFromContext(contextType: string, text: string): string | undefined {
  const profanityPattern = /\b(fuck|shit|damn|ass|bitch)\b/i;
  const adultPattern = /\b(sex|dating|hookup|naked|drunk|party)\b/i;
  
  if (profanityPattern.test(text)) return 'R';
  if (adultPattern.test(text)) return 'PG-13';
  
  const contextRatings = {
    work: 'PG-13', // Work contexts often benefit from mild edge
    relationship: adultPattern.test(text) ? 'PG-13' : 'PG',
    entertainment: 'PG',
    sports: 'PG-13', // Sports roasts work well with mild attitude
    social: 'PG-13' // Social media contexts often sarcastic
  };
  
  return contextRatings[contextType as keyof typeof contextRatings];
}

// TAG ENHANCEMENT WITH CONTEXT
function enhanceTagsWithContext(tags: string[], context: DetectedContext | null): string[] {
  if (!context) return tags;
  
  const enhanced = [...tags];
  
  // Add contextual tags based on detected context
  if (context.metadata.hasLocation && !tags.some(t => t.toLowerCase().includes('location'))) {
    enhanced.push('location specific');
  }
  
  if (context.metadata.hasPopCulture && !tags.some(t => t.toLowerCase().includes('pop'))) {
    enhanced.push('pop culture');
  }
  
  // Add lexicon words as soft tags
  context.lexiconWords.forEach(word => {
    if (!enhanced.some(t => t.toLowerCase().includes(word.toLowerCase()))) {
      enhanced.push(word);
    }
  });
  
  return enhanced;
}

// CONTEXTUAL PROMPT ADDITIONS
function buildContextualPromptAdditions(context: DetectedContext | null, tone?: string): string[] {
  if (!context) return [];
  
  const additions: string[] = [];
  
  // Add context-specific instructions
  switch (context.primary) {
    case 'location':
      additions.push('Include location-specific references and local culture/slang');
      if (context.secondary) {
        const lexicon = getLexiconForContext(context.secondary);
        if (lexicon) {
          additions.push(`Use authentic ${context.secondary} vocabulary: ${lexicon.slang.slice(0, 3).join(', ')}`);
        }
      }
      break;
      
    case 'relationship':
      additions.push('Focus on relationship dynamics and dating culture references');
      if (tone === 'savage') {
        additions.push('Include dating app references and modern relationship frustrations');
      }
      break;
      
    case 'work':
      additions.push('Include workplace culture and professional context');
      if (context.metadata.hasPersonalReference) {
        additions.push('Make it relatable to personal work experiences');
      }
      break;
      
    case 'sports':
      additions.push('Use sports terminology and competitive energy');
      additions.push('Reference current players, teams, or memorable moments');
      break;
      
    case 'entertainment':
      additions.push('Include current streaming/social media references');
      if (context.metadata.hasPopCulture) {
        additions.push('Reference trending shows, memes, or cultural moments');
      }
      break;
  }
  
  return additions;
}

// COMEDIAN VOICE HINTS BASED ON CONTEXT
function getComedianVoiceHints(context: DetectedContext | null): string[] {
  if (!context) return [];
  
  const voiceHints = {
    location: ['Bill Burr (city rants)', 'Sebastian Maniscalco (cultural observations)'],
    relationship: ['Ali Wong (relationship chaos)', 'Taylor Tomlinson (dating disasters)'],
    work: ['Hasan Minhaj (corporate commentary)', 'Dave Chappelle (workplace dynamics)'],
    sports: ['Bill Burr (sports fury)', 'Kevin Hart (competitive energy)'],
    entertainment: ['Trevor Noah (media commentary)', 'Sarah Silverman (pop culture satire)'],
    social: ['Joan Rivers (social media savagery)', 'Ricky Gervais (online behavior mockery)']
  };
  
  return voiceHints[context.primary as keyof typeof voiceHints] || [];
}

// FALLBACK STRATEGY DETERMINATION
function determineFallbackStrategy(context: DetectedContext | null): string {
  if (!context) return 'generic';
  
  if (context.confidence > 0.7) {
    return `contextual_${context.primary}_${context.secondary || 'general'}`;
  } else if (context.confidence > 0.4) {
    return `partial_${context.primary}`;
  } else {
    return 'enhanced_generic';
  }
}

// RECIPE LOGGING HELPER
export function logGenerationRecipe(recipe: GenerationRecipe, result: 'success' | 'fallback' | 'failure'): void {
  console.log('🧪 GENERATION RECIPE:', JSON.stringify({
    ...recipe,
    result,
    processingTime: Date.now() - recipe.timestamp
  }, null, 2));
}