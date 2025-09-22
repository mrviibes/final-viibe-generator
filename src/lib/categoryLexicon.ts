// Category-specific lexicon for enhanced visual generation
export const CATEGORY_LEXICON: Record<string, { 
  primary: string[]; 
  mood: string[]; 
  props: string[];
}> = {
  birthday: {
    primary: ["birthday cake", "birthday celebration", "party scene"],
    mood: ["joyful", "festive", "celebratory", "warm", "happy"],
    props: ["candles", "balloons", "party hats", "confetti", "presents", "decorations"]
  },
  
  sports: {
    primary: ["athletic moment", "sports action", "competition scene"],
    mood: ["dynamic", "energetic", "competitive", "intense", "focused"],
    props: ["equipment", "field", "stadium", "uniform", "crowd", "scoreboard"]
  },
  
  romance: {
    primary: ["romantic moment", "intimate scene", "couple together"],
    mood: ["tender", "loving", "intimate", "romantic", "warm"],
    props: ["flowers", "candles", "wine", "sunset", "hearts", "rings"]
  },
  
  work: {
    primary: ["professional setting", "workplace scene", "career moment"],
    mood: ["focused", "determined", "professional", "ambitious", "productive"],
    props: ["office", "laptop", "documents", "meeting room", "business attire", "handshake"]
  },
  
  family: {
    primary: ["family gathering", "home scene", "family moment"],
    mood: ["warm", "loving", "connected", "cozy", "harmonious"],
    props: ["home", "dinner table", "photos", "couch", "kitchen", "garden"]
  },
  
  holidays: {
    primary: ["holiday celebration", "seasonal scene", "festive moment"],
    mood: ["festive", "magical", "seasonal", "traditional", "joyful"],
    props: ["decorations", "lights", "tree", "gifts", "snow", "ornaments"]
  },
  
  travel: {
    primary: ["travel adventure", "destination scene", "journey moment"],
    mood: ["adventurous", "exciting", "exotic", "peaceful", "inspiring"],
    props: ["luggage", "passport", "camera", "landmarks", "transportation", "maps"]
  }
};

// Stale phrase detection and blacklisting
export const STALE_PHRASES = [
  /everyone nodded awkwardly/gi,
  /CHECK CHECK/gi,
  /\btest\b.*\btest\b/gi,
  /sample text/gi,
  /placeholder/gi,
  /lorem ipsum/gi,
  /dummy text/gi,
  /temp.*content/gi
];

export function getCategoryLexicon(category: string, subcategory?: string): { 
  primary: string[]; 
  mood: string[]; 
  props: string[];
} {
  const cat = category.toLowerCase();
  const lexicon = CATEGORY_LEXICON[cat];
  
  if (!lexicon) {
    return {
      primary: ["scene", "moment", "setting"],
      mood: ["engaging", "compelling", "interesting"],
      props: ["elements", "details", "atmosphere"]
    };
  }
  
  return lexicon;
}

export function buildCategoryPrompt(category: string, subcategory: string, layout: string): {
  sceneDescription: string;
  visualElements: string;
  negativePrompt: string;
} {
  const lexicon = getCategoryLexicon(category, subcategory);
  const layoutBand = getLayoutBand(layout);
  
  const sceneDescription = [
    `SCENE: ${category} > ${subcategory}.`,
    `FOCUS: ${lexicon.primary[0]} with ${lexicon.mood.slice(0, 2).join(" and ")} atmosphere.`,
    `COMPOSITION: Clear ${layoutBand} band for text overlay (≤25% height).`
  ].join(" ");
  
  const visualElements = [
    `STYLE: Realistic photography, natural lighting, shallow depth of field.`,
    `PROPS: ${lexicon.props.slice(0, 3).join(", ")}.`,
    `MOOD: ${lexicon.mood.slice(0, 2).join(", ")} energy.`
  ].join(" ");
  
  const negativePrompt = [
    "no embedded text, no letters, no words, no signage, no logos",
    "no face occlusion, no objects blocking subject", 
    "no extreme angles, no clutter in text band",
    "no duplicate elements, no distorted features"
  ].join(", ");
  
  return { sceneDescription, visualElements, negativePrompt };
}

function getLayoutBand(layout: string): string {
  switch (layout) {
    case 'memeTopBottom': return 'top and bottom';
    case 'lowerThird': return 'bottom third';
    case 'negativeSpace': return 'negative space';
    case 'subtleCaption': return 'bottom';
    default: return 'bottom';
  }
}

export function filterStaleContent(text: string): string {
  let cleaned = text;
  
  STALE_PHRASES.forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });
  
  return cleaned.trim();
}