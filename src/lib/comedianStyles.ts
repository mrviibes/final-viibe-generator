// Comedian voice banks with specific delivery patterns and length constraints

export interface ComedianStyle {
  name: string;
  lengthRange: [number, number];
  deliveryPattern: string;
  examples: string[];
}

export const COMEDIAN_STYLES: Record<string, ComedianStyle> = {
  // Short, aggressive roasts
  billBurr: {
    name: "Bill Burr",
    lengthRange: [40, 70],
    deliveryPattern: "Confrontational roast with working-class edge",
    examples: [
      "This guy throws like he's mad at the ball",
      "She drives like the GPS personally offended her"
    ]
  },

  // High-energy panic reactions  
  kevinHart: {
    name: "Kevin Hart",
    lengthRange: [50, 85],
    deliveryPattern: "Animated panic with self-deprecating energy",
    examples: [
      "Zero points first, then celebrates like he just won the championship",
      "Last time I saw moves that bad, the Titanic was still floating"
    ]
  },

  // Absurd imagery comparisons
  aliWong: {
    name: "Ali Wong",
    lengthRange: [55, 90],
    deliveryPattern: "Brutal honest observations with vivid imagery",
    examples: [
      "Watching him cook is like watching a toddler perform surgery",
      "Her dance moves look like a drunk flamingo having an existential crisis"
    ]
  },

  // Deadpan one-liners
  mitchHedberg: {
    name: "Mitch Hedberg",
    lengthRange: [35, 75],
    deliveryPattern: "Surreal one-liners with unexpected twists",
    examples: [
      "I used to hate mornings. I still do, but I used to too",
      "His cooking is so bad, the smoke alarm cheers him on"
    ]
  },

  // Sharp, brutal precision
  anthonyJeselnik: {
    name: "Anthony Jeselnik",
    lengthRange: [30, 65],
    deliveryPattern: "Dark deadpan with shocking twists",
    examples: [
      "His jokes are like his hairline. Slowly disappearing",
      "She texts back so slow, archaeologists find her messages"
    ]
  },

  // Storytelling with narrative beats
  johnMulaney: {
    name: "John Mulaney",
    lengthRange: [60, 100],
    deliveryPattern: "Precise storytelling with childlike wonder",
    examples: [
      "Last weekend he tried to parallel park for so long, seasons changed",
      "His cooking skills are like a magic trick where the food just disappears"
    ]
  }
};

// Length bucket assignments for variety
export const LENGTH_BUCKETS = [
  [40, 60],   // Short punchy
  [61, 80],   // Medium build
  [81, 100]   // Longer setup-payoff
] as const;

// Style-specific delivery patterns
export const STYLE_PATTERNS = {
  roast: {
    structure: "Direct insult with specific comparison",
    maxLength: 70,
    pattern: "[Subject] [action] like [vivid comparison]"
  },
  absurd: {
    structure: "Weird comparison with unexpected imagery", 
    maxLength: 90,
    pattern: "[Action description] is like [absurd animal/object comparison]"
  },
  punchlineFirst: {
    structure: "Gag first, then setup reveal",
    maxLength: 85,
    pattern: "[Punchline result] first, then [setup explanation]"
  },
  shortStory: {
    structure: "Tiny scene with flip ending",
    maxLength: 100,
    pattern: "[Time marker] [subject] [action], then [unexpected consequence]"
  }
} as const;

// Assign comedian to option with length bucket
export function assignComedianToOption(
  optionNumber: number, 
  style: string = "punchline-first"
): { comedian: ComedianStyle; lengthBucket: [number, number] } {
  
  const comedianKeys = Object.keys(COMEDIAN_STYLES);
  const comedianKey = comedianKeys[optionNumber % comedianKeys.length];
  const comedian = COMEDIAN_STYLES[comedianKey];
  
  // Assign length bucket in rotation
  const bucketIndex = optionNumber % LENGTH_BUCKETS.length;
  const lengthBucket = LENGTH_BUCKETS[bucketIndex];
  
  // Override with comedian's preferred range if shorter
  const finalBucket: [number, number] = [
    Math.max(lengthBucket[0], comedian.lengthRange[0]),
    Math.min(lengthBucket[1], comedian.lengthRange[1])
  ];
  
  return { comedian, lengthBucket: finalBucket };
}