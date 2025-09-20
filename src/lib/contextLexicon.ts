// Rich contextual lexicon database for authentic content generation
// Maps contexts to relevant vocabulary, slang, and cultural references

export interface LexiconEntry {
  general: string[];          // Universal words for this context
  slang: string[];           // Informal/slang terms
  cultural: string[];        // Pop culture references specific to context
  emotional: string[];       // Emotion-laden words for this context
  technical: string[];       // Context-specific jargon
}

export interface ContextLexicon {
  [context: string]: LexiconEntry;
}

// COMPREHENSIVE LEXICON DATABASE
export const CONTEXT_LEXICON: ContextLexicon = {
  // CITIES & LOCATIONS
  "london": {
    general: ["Tube", "pub", "queue", "mate", "bloke", "quid", "lorry", "lift", "flat", "bin"],
    slang: ["innit", "bloody", "cheeky", "mental", "proper", "mental", "knackered", "gutted"],
    cultural: ["Big Ben", "Thames", "Queen", "football", "tea", "fish and chips", "double decker", "Mind the Gap"],
    emotional: ["rainy", "dreary", "posh", "classy", "stuffy", "charming", "historic", "foggy"],
    technical: ["Underground", "Oyster card", "Borough", "Westminster", "Piccadilly", "Heathrow"]
  },
  
  "new_york": {
    general: ["subway", "bodega", "cab", "pizza", "bagel", "apartment", "block", "avenue"],
    slang: ["fuhgeddaboudit", "deadass", "mad", "brick", "schmuck", "yo", "facts", "cap"],
    cultural: ["Yankees", "Times Square", "Broadway", "Manhattan", "Brooklyn", "Statue of Liberty"],
    emotional: ["hustling", "gritty", "fast-paced", "aggressive", "ambitious", "ruthless"],
    technical: ["MetroCard", "uptown", "downtown", "boroughs", "FDR Drive", "JFK"]
  },
  
  "los_angeles": {
    general: ["freeway", "traffic", "beach", "Hollywood", "studios", "palm trees", "hills"],
    slang: ["hella", "gnarly", "rad", "dude", "bro", "sketchy", "fire", "lowkey"],
    cultural: ["Lakers", "In-N-Out", "Sunset Strip", "Venice Beach", "Beverly Hills", "Malibu"],
    emotional: ["chill", "laid-back", "superficial", "sunny", "fake", "dreamy"],
    technical: ["405", "PCH", "LAX", "Valley", "West Side", "Downtown"]
  },

  // RELATIONSHIPS
  "dating": {
    general: ["swipe", "match", "date", "chemistry", "spark", "connection", "vibe", "flirt"],
    slang: ["slide into DMs", "ghosting", "breadcrumbing", "situationship", "Netflix and chill"],
    cultural: ["Tinder", "Bumble", "Hinge", "dating apps", "rom-com", "meet-cute"],
    emotional: ["butterflies", "awkward", "cringe", "romantic", "disappointed", "hopeful"],
    technical: ["profile", "bio", "algorithm", "compatibility", "red flags", "green flags"]
  },
  
  "marriage": {
    general: ["wedding", "spouse", "ring", "vows", "ceremony", "reception", "honeymoon"],
    slang: ["ball and chain", "wifey", "hubby", "tied the knot", "put a ring on it"],
    cultural: ["something blue", "bachelor party", "maid of honor", "first dance", "cake cutting"],
    emotional: ["committed", "settled", "blissful", "stressed", "overwhelmed", "grateful"],
    technical: ["prenup", "registry", "venue", "catering", "photographer", "officiant"]
  },

  // WORK & CAREERS
  "tech": {
    general: ["code", "bug", "deploy", "server", "database", "API", "framework", "Git"],
    slang: ["ship it", "hack", "ninja", "rockstar", "unicorn", "disrupt", "pivot", "iterate"],
    cultural: ["Silicon Valley", "startup", "IPO", "venture capital", "Y Combinator", "FAANG"],
    emotional: ["burned out", "caffeinated", "imposter syndrome", "innovative", "stressed"],
    technical: ["JavaScript", "Python", "AWS", "Docker", "Kubernetes", "microservices"]
  },
  
  "finance": {
    general: ["money", "profit", "loss", "investment", "portfolio", "market", "stocks", "bonds"],
    slang: ["bull", "bear", "diamond hands", "paper hands", "moon", "hodl", "stonks"],
    cultural: ["Wall Street", "NYSE", "Bitcoin", "GameStop", "Reddit", "Robin Hood"],
    emotional: ["volatile", "risky", "conservative", "aggressive", "anxious", "greedy"],
    technical: ["P&L", "ROI", "derivatives", "hedge fund", "ETF", "401k"]
  },

  // SPORTS
  "basketball": {
    general: ["dribble", "shoot", "dunk", "rebound", "foul", "court", "hoop", "ball"],
    slang: ["balling", "swish", "brick", "ankle breaker", "poster", "clutch", "trash talk"],
    cultural: ["NBA", "March Madness", "Lakers", "Warriors", "LeBron", "Jordan", "Kobe"],
    emotional: ["competitive", "intense", "explosive", "athletic", "dominant", "clutch"],
    technical: ["three-pointer", "free throw", "pick and roll", "zone defense", "full court press"]
  },
  
  "football": {
    general: ["quarterback", "touchdown", "field goal", "tackle", "pass", "run", "helmet"],
    slang: ["hail mary", "sack", "blitz", "pick six", "red zone", "two minute warning"],
    cultural: ["Super Bowl", "NFL", "fantasy football", "tailgate", "Monday Night Football"],
    emotional: ["aggressive", "brutal", "strategic", "intense", "patriotic", "tribal"],
    technical: ["down and distance", "snap count", "audible", "play action", "shotgun formation"]
  },

  // FOOD & DINING
  "pizza": {
    general: ["cheese", "sauce", "crust", "slice", "pepperoni", "delivery", "oven", "dough"],
    slang: ["za", "pie", "greasy", "cheesy", "loaded", "thin crust", "deep dish"],
    cultural: ["New York style", "Chicago deep dish", "Italian", "Dominos", "Pizza Hut"],
    emotional: ["comfort food", "guilty pleasure", "satisfying", "indulgent", "nostalgic"],
    technical: ["wood fired", "stone oven", "marinara", "mozzarella", "gluten-free"]
  },

  // ENTERTAINMENT
  "netflix": {
    general: ["streaming", "binge", "series", "season", "episode", "queue", "algorithm"],
    slang: ["Netflix and chill", "binge-watching", "cliffhanger", "spoilers", "canceled"],
    cultural: ["Stranger Things", "The Office", "true crime", "Korean drama", "reality TV"],
    emotional: ["addictive", "escapist", "lazy", "relaxing", "procrastinating", "guilty"],
    technical: ["autoplay", "recommendations", "original content", "4K", "HDR"]
  },

  // SOCIAL MEDIA
  "instagram": {
    general: ["post", "story", "like", "follow", "comment", "hashtag", "filter", "feed"],
    slang: ["gram", "Insta", "influencer", "thirst trap", "flex", "aesthetic", "vibe check"],
    cultural: ["selfie", "foodie", "OOTD", "travel blogger", "fitness influencer", "beauty guru"],
    emotional: ["validation-seeking", "fake", "curated", "performative", "aspirational"],
    technical: ["algorithm", "engagement", "reach", "impressions", "sponsored content"]
  },

  // WEATHER & SEASONS
  "winter": {
    general: ["snow", "cold", "ice", "freeze", "jacket", "boots", "heating", "fireplace"],
    slang: ["freezing my ass off", "bundled up", "seasonal depression", "cabin fever"],
    cultural: ["Christmas", "New Year", "skiing", "hot chocolate", "cozy", "hibernation"],
    emotional: ["miserable", "cozy", "depressing", "magical", "harsh", "brutal"],
    technical: ["below freezing", "wind chill", "blizzard", "frostbite", "hypothermia"]
  },

  // TRANSPORTATION
  "uber": {
    general: ["ride", "driver", "app", "pickup", "destination", "rating", "surge", "car"],
    slang: ["rideshare", "Ubering", "surge pricing", "ghost car", "cancel", "pool"],
    cultural: ["gig economy", "side hustle", "DUI alternative", "drunk ride", "airport run"],
    emotional: ["convenient", "expensive", "sketchy", "reliable", "awkward", "grateful"],
    technical: ["GPS", "ETA", "dynamic pricing", "route optimization", "background check"]
  }
};

// SUB-SUBCATEGORY DETECTION PATTERNS
export const SUB_SUBCATEGORY_PATTERNS: { [key: string]: RegExp[] } = {
  // City detection patterns
  london: [/london/i, /british/i, /england/i, /uk/i, /tube/i, /pub/i, /tea/i],
  new_york: [/new.?york/i, /nyc/i, /manhattan/i, /brooklyn/i, /subway/i, /bodega/i],
  los_angeles: [/los.?angeles/i, /la/i, /hollywood/i, /california/i, /freeway/i],
  
  // Dating patterns
  dating: [/dating/i, /tinder/i, /bumble/i, /match/i, /swipe/i, /single/i],
  marriage: [/wedding/i, /married/i, /spouse/i, /husband/i, /wife/i, /ring/i],
  
  // Work patterns  
  tech: [/tech/i, /coding/i, /programmer/i, /developer/i, /startup/i, /silicon.?valley/i],
  finance: [/finance/i, /money/i, /stock/i, /investment/i, /wall.?street/i, /crypto/i],
  
  // Sports patterns
  basketball: [/basketball/i, /nba/i, /dunk/i, /hoop/i, /lebron/i, /jordan/i],
  football: [/football/i, /nfl/i, /quarterback/i, /touchdown/i, /super.?bowl/i],
  
  // Food patterns
  pizza: [/pizza/i, /slice/i, /pepperoni/i, /cheese/i, /crust/i],
  
  // Entertainment patterns
  netflix: [/netflix/i, /streaming/i, /binge/i, /series/i, /show/i],
  
  // Social media patterns
  instagram: [/instagram/i, /insta/i, /post/i, /story/i, /influencer/i, /selfie/i],
  
  // Weather patterns
  winter: [/winter/i, /snow/i, /cold/i, /christmas/i, /holiday/i, /freeze/i],
  
  // Transportation patterns
  uber: [/uber/i, /lyft/i, /rideshare/i, /driver/i, /pickup/i, /ride/i]
};

// CONTEXT ENHANCEMENT FUNCTIONS
export function detectSubSubcategory(text: string, category: string, subcategory: string): string | null {
  const searchText = `${text} ${category} ${subcategory}`.toLowerCase();
  
  for (const [context, patterns] of Object.entries(SUB_SUBCATEGORY_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(searchText))) {
      return context;
    }
  }
  
  return null;
}

export function getLexiconForContext(context: string): LexiconEntry | null {
  return CONTEXT_LEXICON[context] || null;
}

export function selectContextualWords(
  context: string, 
  tone: string, 
  count: number = 5
): string[] {
  const lexicon = getLexiconForContext(context);
  if (!lexicon) return [];
  
  const words: string[] = [];
  
  // Select words based on tone
  switch (tone.toLowerCase()) {
    case 'savage':
    case 'humorous':
      words.push(...lexicon.slang.slice(0, 2));
      words.push(...lexicon.emotional.slice(0, 2));
      words.push(...lexicon.general.slice(0, 1));
      break;
      
    case 'sentimental':
    case 'romantic':
      words.push(...lexicon.emotional.slice(0, 3));
      words.push(...lexicon.cultural.slice(0, 2));
      break;
      
    case 'serious':
      words.push(...lexicon.technical.slice(0, 2));
      words.push(...lexicon.general.slice(0, 3));
      break;
      
    default: // playful, etc.
      words.push(...lexicon.general.slice(0, 2));
      words.push(...lexicon.cultural.slice(0, 2));
      words.push(...lexicon.slang.slice(0, 1));
  }
  
  // Remove duplicates and limit to requested count
  return Array.from(new Set(words)).slice(0, count);
}

export function expandWithSynonyms(context: string, inputWords: string[]): string[] {
  const lexicon = getLexiconForContext(context);
  if (!lexicon) return inputWords;
  
  const expanded = [...inputWords];
  const allContextWords = [
    ...lexicon.general,
    ...lexicon.slang,
    ...lexicon.cultural,
    ...lexicon.emotional,
    ...lexicon.technical
  ];
  
  // Add related words from the same context
  inputWords.forEach(word => {
    const relatedWords = allContextWords.filter(contextWord => 
      contextWord.toLowerCase().includes(word.toLowerCase()) ||
      word.toLowerCase().includes(contextWord.toLowerCase())
    );
    expanded.push(...relatedWords.slice(0, 2));
  });
  
  return Array.from(new Set(expanded));
}

// CONTEXTUAL FALLBACK GENERATORS
export function generateContextualFallback(
  context: string,
  tone: string,
  rating: string = 'PG-13'
): string[] {
  const lexicon = getLexiconForContext(context);
  if (!lexicon) {
    return generateGenericFallback(tone, rating);
  }
  
  const contextWords = selectContextualWords(context, tone, 3);
  const fallbacks: string[] = [];
  
  // Generate contextual fallbacks using lexicon
  const [word1, word2, word3] = contextWords;
  
  switch (tone.toLowerCase()) {
    case 'savage':
      if (rating === 'R') {
        fallbacks.push(
          `${word1} hit different when you realize ${word2} is basically ${word3} but with attitude.`,
          `Plot twist: ${word1} called and said ${word2} isn't fucking worth the ${word3}.`,
          `${word1} energy meets ${word2} reality and suddenly ${word3} makes perfect sense.`,
          `When ${word1} goes wrong, even ${word2} starts looking like a goddamn ${word3}.`
        );
      } else {
        fallbacks.push(
          `${word1} hit different when you realize ${word2} is basically expensive ${word3}.`,
          `Plot twist: ${word1} called and said ${word2} isn't worth the ${word3}.`,
          `${word1} energy meets ${word2} reality and suddenly ${word3} makes sense.`,
          `When ${word1} goes wrong, even ${word2} starts looking like ${word3}.`
        );
      }
      break;
      
    case 'humorous':
      fallbacks.push(
        `${word1} is like ${word2} but with more ${word3} and less common sense.`,
        `Plot twist: ${word1} actually works if you pretend ${word2} is just fancy ${word3}.`,
        `${word1} called and left a ${word2} voicemail but it was just ${word3} sounds.`,
        `When ${word1} meets ${word2}, you get ${word3} but make it chaotic.`
      );
      break;
      
    case 'sentimental':
      fallbacks.push(
        `There's something beautiful about ${word1} that reminds me of ${word2} and ${word3}.`,
        `${word1} taught me that ${word2} isn't just about ${word3}, it's about connection.`,
        `Sometimes ${word1} feels like ${word2} wrapped in ${word3} and served with love.`,
        `The best ${word1} moments happen when ${word2} meets ${word3} perfectly.`
      );
      break;
      
    default:
      fallbacks.push(
        `${word1} vibes with a side of ${word2} and a sprinkle of ${word3}.`,
        `Plot twist: ${word1} is actually ${word2} in disguise as ${word3}.`,
        `${word1} energy meets ${word2} chaos equals ${word3} but make it fun.`,
        `When ${word1} calls, ${word2} picks up but ${word3} does all the talking.`
      );
  }
  
  return fallbacks.slice(0, 4);
}

function generateGenericFallback(tone: string, rating: string): string[] {
  // Generic fallbacks when no context is detected
  const genericWords = ["life", "reality", "chaos", "vibes"];
  
  return [
    `${tone} energy activated with a side of ${genericWords[0]}.`,
    `Plot twist: ${genericWords[1]} called and it's ${tone.toLowerCase()}.`,
    `When ${genericWords[2]} meets ${tone.toLowerCase()}, you get ${genericWords[3]}.`,
    `${genericWords[0]} but make it ${tone.toLowerCase()} and serve it ${rating === 'R' ? 'fucking' : 'really'} cold.`
  ];
}