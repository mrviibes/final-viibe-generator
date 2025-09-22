// Clean background-only prompt system with category lexicon
const CATEGORY_LEXICON: Record<string, string[]> = {
  birthday: ["cake", "candles", "balloons", "party", "celebration", "decorations"],
  sports: ["field", "equipment", "athlete", "competition", "action", "stadium"],
  romance: ["flowers", "date", "intimate", "romantic", "candlelight", "couple"],
  work: ["office", "meeting", "professional", "business", "workplace", "career"],
  family: ["home", "gathering", "loved ones", "togetherness", "bonding", "memories"]
};

const STALE_PHRASES = [
  /everyone nodded awkwardly/gi,
  /CHECK CHECK/gi,
  /\btest\b/gi,
  /sample text/gi,
  /placeholder/gi
];

function getCategoryLexicon(category: string, subcategory: string): string[] {
  const cat = category.toLowerCase();
  return CATEGORY_LEXICON[cat] || ["scene", "moment", "setting"];
}

function buildCleanPrompt(category: string, subcategory: string, layout: string): { positive: string; negative: string } {
  const lexicon = getCategoryLexicon(category, subcategory);
  const layoutBand = layout === 'memeTopBottom' ? 'top or bottom' : 
                    layout === 'lowerThird' ? 'bottom' :
                    layout === 'negativeSpace' ? 'open space' : 'bottom';
  
  const positive = [
    `SCENE: ${category} > ${subcategory}. One hero subject. Natural light. Shallow DOF.`,
    `ACTION: Show the moment that matches the caption idea (no text).`,
    `STYLE: Realistic, clean composition, clear face, clean background space at ${layoutBand}.`,
    `FRAMING: Leave a safe empty band for caption at ${layoutBand}, height ≤25% of image.`,
    `DETAILS: ${lexicon.slice(0, 4).join(", ")}.`
  ].join("\n");

  const negative = [
    "no embedded text, no words, no letters, no logos, no watermarks",
    "no face occlusion, no object blocking face", 
    "no extreme tilt, no heavy clutter in caption band",
    "no duplicate people, no extra hands, no warped elements"
  ].join("\n");

  return { positive, negative };
}

// Background-only prompt builder (recommended approach)
export function buildPrompt(i: {
  caption: string; 
  category: string; 
  sub: string; 
  layout: string;
  hardTags: string[]; 
  softTags: string[];
}) {
  const { positive, negative } = buildCleanPrompt(i.category, i.sub, i.layout);
  
  // Filter stale phrases from caption
  let cleanCaption = i.caption;
  STALE_PHRASES.forEach(pattern => {
    cleanCaption = cleanCaption.replace(pattern, "");
  });
  
  // Generate 4 distinct background descriptions for overlay use
  return [
    "BACKGROUND-ONLY GENERATION (text will be overlaid):",
    positive,
    "",
    "Generate 4 distinct visual scene variations:",
    "1. Close-up dramatic moment",
    "2. Wide establishing shot", 
    "3. Creative artistic angle",
    "4. Atmospheric mood piece",
    "",
    `AVOID: ${negative}`
  ].join("\n");
}