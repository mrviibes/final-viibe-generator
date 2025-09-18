// Appearance Extraction System for Physical Descriptor Prioritization
// Extracts and structures appearance attributes to ensure consistent image generation

export interface AppearanceAttributes {
  // Physical characteristics
  hair_color?: string;
  skin_tone?: string;
  age_group?: string;
  gender?: string;
  body_type?: string;
  
  // Clothing and accessories
  outfit?: {
    type?: string;
    color?: string;
    style?: string;
  };
  accessories?: string[];
  
  // Context and positioning
  pose?: string;
  expression?: string;
  
  // Extracted source info for debugging
  source_field?: string;
  raw_text?: string;
}

// Hair color patterns and variations
const HAIR_COLOR_PATTERNS = {
  blonde: ['blonde', 'blond', 'fair hair', 'light hair', 'golden hair', 'platinum', 'bleached'],
  brunette: ['brunette', 'brown hair', 'dark brown', 'chestnut', 'chocolate hair'],
  black: ['black hair', 'dark hair', 'jet black', 'ebony hair', 'raven hair'],
  red: ['red hair', 'redhead', 'ginger', 'auburn', 'copper hair', 'strawberry blonde'],
  gray: ['gray hair', 'grey hair', 'silver hair', 'white hair', 'salt and pepper'],
  other: ['blue hair', 'pink hair', 'purple hair', 'green hair', 'colored hair']
};

// Gender and age patterns
const GENDER_PATTERNS = {
  male: ['man', 'guy', 'male', 'boy', 'gentleman', 'dude', 'father', 'dad', 'husband', 'boyfriend'],
  female: ['woman', 'girl', 'female', 'lady', 'mother', 'mom', 'wife', 'girlfriend', 'gal'],
  neutral: ['person', 'individual', 'someone', 'they', 'character']
};

const AGE_PATTERNS = {
  child: ['child', 'kid', 'boy', 'girl', 'toddler', 'baby', 'infant'],
  teen: ['teen', 'teenager', 'adolescent', 'high school', 'student'],
  young_adult: ['young adult', 'college', 'university', '20s', 'twenties'],
  adult: ['adult', 'grown up', '30s', '40s', 'thirties', 'forties', 'middle age'],
  senior: ['senior', 'elderly', 'old', 'grandparent', '60s', '70s', 'retired']
};

// Outfit and clothing patterns
const OUTFIT_PATTERNS = {
  jersey: ['jersey', 'sports jersey', 'team shirt', 'uniform'],
  formal: ['suit', 'dress', 'formal', 'business', 'tie', 'blazer'],
  casual: ['t-shirt', 'jeans', 'casual', 'hoodie', 'sweater'],
  athletic: ['workout', 'gym', 'athletic', 'sports', 'running']
};

const COLOR_PATTERNS = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey',
  'brown', 'tan', 'navy', 'maroon', 'teal', 'lime', 'silver', 'gold'
];

/**
 * Extracts appearance attributes from text input
 */
export function extractAppearanceAttributes(text: string, sourceField: string = 'unknown'): AppearanceAttributes {
  if (!text || typeof text !== 'string') {
    return { source_field: sourceField, raw_text: text };
  }

  const lowerText = text.toLowerCase();
  const attributes: AppearanceAttributes = {
    source_field: sourceField,
    raw_text: text
  };

  // Extract hair color
  for (const [color, patterns] of Object.entries(HAIR_COLOR_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      attributes.hair_color = color;
      break;
    }
  }

  // Extract gender
  for (const [gender, patterns] of Object.entries(GENDER_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      attributes.gender = gender;
      break;
    }
  }

  // Extract age group
  for (const [age, patterns] of Object.entries(AGE_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      attributes.age_group = age;
      break;
    }
  }

  // Extract outfit information
  const outfit: { type?: string; color?: string; style?: string } = {};
  
  // Outfit type
  for (const [type, patterns] of Object.entries(OUTFIT_PATTERNS)) {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      outfit.type = type;
      break;
    }
  }

  // Outfit color
  for (const color of COLOR_PATTERNS) {
    if (lowerText.includes(color)) {
      outfit.color = color;
      break;
    }
  }

  if (outfit.type || outfit.color) {
    attributes.outfit = outfit;
  }

  // Extract basic pose/expression hints
  const posePatterns = ['sitting', 'standing', 'running', 'jumping', 'walking', 'lying', 'crouching'];
  const expressionPatterns = ['smiling', 'laughing', 'serious', 'angry', 'sad', 'surprised', 'confused'];

  for (const pose of posePatterns) {
    if (lowerText.includes(pose)) {
      attributes.pose = pose;
      break;
    }
  }

  for (const expression of expressionPatterns) {
    if (lowerText.includes(expression)) {
      attributes.expression = expression;
      break;
    }
  }

  return attributes;
}

/**
 * Combines multiple appearance extractions, with priority order
 */
export function combineAppearanceAttributes(
  extractions: AppearanceAttributes[],
  priorityOrder: string[] = ['chosen_visual', 'rec_subject', 'final_line', 'tags']
): AppearanceAttributes {
  const combined: AppearanceAttributes = {};

  // Sort extractions by priority
  const sortedExtractions = extractions.sort((a, b) => {
    const aPriority = priorityOrder.indexOf(a.source_field || 'unknown');
    const bPriority = priorityOrder.indexOf(b.source_field || 'unknown');
    return aPriority - bPriority;
  });

  // Merge attributes, with higher priority overriding lower
  for (const extraction of sortedExtractions) {
    if (extraction.hair_color && !combined.hair_color) combined.hair_color = extraction.hair_color;
    if (extraction.gender && !combined.gender) combined.gender = extraction.gender;
    if (extraction.age_group && !combined.age_group) combined.age_group = extraction.age_group;
    if (extraction.skin_tone && !combined.skin_tone) combined.skin_tone = extraction.skin_tone;
    if (extraction.pose && !combined.pose) combined.pose = extraction.pose;
    if (extraction.expression && !combined.expression) combined.expression = extraction.expression;
    
    if (extraction.outfit && !combined.outfit) {
      combined.outfit = extraction.outfit;
    }
  }

  return combined;
}

/**
 * Generates appearance constraint text for positive prompts
 */
export function buildAppearanceConstraints(attributes: AppearanceAttributes): string {
  if (!attributes || Object.keys(attributes).length <= 2) {
    return '';
  }

  const constraints: string[] = [];

  // Build subject description
  const subjectParts: string[] = [];
  
  if (attributes.age_group && attributes.age_group !== 'adult') {
    subjectParts.push(attributes.age_group);
  }

  if (attributes.gender && attributes.gender !== 'neutral') {
    subjectParts.push(attributes.gender === 'male' ? 'man' : 'woman');
  } else if (!attributes.gender) {
    subjectParts.push('person');
  }

  // Hair color is critical - make it explicit
  if (attributes.hair_color) {
    subjectParts.push(`with ${attributes.hair_color} hair`);
  }

  // Outfit details
  if (attributes.outfit?.color && attributes.outfit?.type) {
    subjectParts.push(`wearing ${attributes.outfit.color} ${attributes.outfit.type}`);
  } else if (attributes.outfit?.type) {
    subjectParts.push(`wearing ${attributes.outfit.type}`);
  } else if (attributes.outfit?.color) {
    subjectParts.push(`wearing ${attributes.outfit.color} clothing`);
  }

  if (subjectParts.length > 0) {
    constraints.push(`SUBJECT (must appear exactly as described): ${subjectParts.join(' ')}.`);
    constraints.push('Must match exactly. No substitutions.');
  }

  return constraints.join(' ');
}

/**
 * Generates contextual negative prompts to block unwanted variations
 */
export function buildAppearanceNegatives(attributes: AppearanceAttributes): string[] {
  const negatives: string[] = [];

  // Block incorrect hair colors
  if (attributes.hair_color) {
    const otherHairColors = Object.keys(HAIR_COLOR_PATTERNS)
      .filter(color => color !== attributes.hair_color)
      .join(', no ');
    negatives.push(`no ${otherHairColors} hair`);
  }

  // Block wrong outfit colors
  if (attributes.outfit?.color) {
    const otherColors = COLOR_PATTERNS
      .filter(color => color !== attributes.outfit?.color)
      .slice(0, 3) // Limit to avoid prompt bloat
      .join(', no ');
    negatives.push(`no ${otherColors} clothing`);
  }

  // Block gender substitution if specified
  if (attributes.gender && attributes.gender !== 'neutral') {
    const oppositeGender = attributes.gender === 'male' ? 'female' : 'male';
    negatives.push(`no ${oppositeGender} subject`);
  }

  return negatives;
}

/**
 * Validates if generated image matches appearance requirements
 * This is a placeholder for future image validation logic
 */
export function validateAppearanceMatch(
  attributes: AppearanceAttributes, 
  imageUrl: string
): { isValid: boolean; mismatches: string[] } {
  // Placeholder for future OCR/computer vision validation
  // For now, return valid to avoid blocking generation
  return {
    isValid: true,
    mismatches: []
  };
}