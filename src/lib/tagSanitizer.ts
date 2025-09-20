// Tag sanitization system to prevent OpenAI content safety violations

export interface TagSuggestion {
  originalTag: string;
  suggestedAlternatives: string[];
  reason: string;
}

// Mapping of problematic phrases to safe alternatives
const PROBLEMATIC_TAG_MAPPINGS: Record<string, string[]> = {
  // Gender stereotype issues
  "punches like a girl": ["weak punches", "sloppy swing", "awkward jabs", "tentative strikes"],
  "throws like a girl": ["awkward throws", "weak throws", "clumsy tosses", "poor form"],
  "runs like a girl": ["awkward running", "clumsy sprint", "poor form", "unsteady pace"],
  "fights like a girl": ["weak fighting", "poor technique", "awkward combat", "tentative strikes"],
  
  // Potential offensive language patterns
  "dumb blonde": ["airhead", "ditzy", "absent-minded", "scatterbrained"],
  "crazy woman": ["dramatic person", "over-reactive", "emotional", "intense personality"],
  "lazy black": ["unmotivated", "sluggish", "inactive", "low energy"],
  "cheap jew": ["frugal", "penny-pinching", "cost-conscious", "budget-minded"],
  
  // Violence/harm related
  "kill yourself": ["give up", "quit trying", "stop bothering", "move on"],
  "want to die": ["exhausted", "overwhelmed", "fed up", "at wit's end"],
  "suicide": ["giving up", "quitting", "surrendering", "throwing in towel"],
  
  // Sexual content that might trigger filters
  "sluts": ["party people", "social butterflies", "outgoing types", "free spirits"],
  "whores": ["expensive tastes", "high maintenance", "demanding", "picky"],
  
  // Racial/ethnic stereotypes
  "ghetto": ["low-budget", "cheap", "rough around edges", "unrefined"],
  "redneck": ["rural", "country", "down-to-earth", "simple"],
  "trailer trash": ["low-class", "rough", "unrefined", "basic"]
};

// Additional patterns that commonly trigger content filters
const PROBLEMATIC_PATTERNS = [
  // Hate speech indicators
  /\b(hate|kill|murder|destroy)\s+(all\s+)?(women|men|blacks|whites|jews|muslims|christians|gays|trans)\b/i,
  
  // Self-harm references
  /\b(kill|hurt|harm)\s+(myself|yourself|themselves)\b/i,
  
  // Extreme violence
  /\b(torture|mutilate|dismember|decapitate)\b/i,
  
  // Sexual violence
  /\b(rape|sexual assault|molest)\b/i,
  
  // Drug-related that might be flagged
  /\b(meth|heroin|cocaine|crack)\s+(addict|user|dealer)\b/i
];

export function sanitizeTag(tag: string): TagSuggestion | null {
  const normalizedTag = tag.toLowerCase().trim();
  
  // Check direct mappings first
  for (const [problematic, alternatives] of Object.entries(PROBLEMATIC_TAG_MAPPINGS)) {
    if (normalizedTag.includes(problematic.toLowerCase())) {
      return {
        originalTag: tag,
        suggestedAlternatives: alternatives,
        reason: `"${problematic}" may violate content policies due to stereotypes or offensive language`
      };
    }
  }
  
  // Check problematic patterns
  for (const pattern of PROBLEMATIC_PATTERNS) {
    if (pattern.test(normalizedTag)) {
      return {
        originalTag: tag,
        suggestedAlternatives: ["inappropriate content", "safe alternative", "family-friendly option"],
        reason: "Contains language that may violate content safety policies"
      };
    }
  }
  
  return null; // Tag is safe
}

export function sanitizeTagList(tags: string[]): {
  safeTags: string[];
  suggestions: TagSuggestion[];
} {
  const safeTags: string[] = [];
  const suggestions: TagSuggestion[] = [];
  
  for (const tag of tags) {
    const suggestion = sanitizeTag(tag);
    if (suggestion) {
      suggestions.push(suggestion);
    } else {
      safeTags.push(tag);
    }
  }
  
  return { safeTags, suggestions };
}

// Real-time validation for input fields
export function validateTagInput(input: string): {
  isValid: boolean;
  warning?: string;
  suggestions?: string[];
} {
  const suggestion = sanitizeTag(input);
  
  if (suggestion) {
    return {
      isValid: false,
      warning: suggestion.reason,
      suggestions: suggestion.suggestedAlternatives
    };
  }
  
  return { isValid: true };
}