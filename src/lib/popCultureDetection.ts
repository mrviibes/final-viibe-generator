// Pop Culture Context Detection for Enhanced Text Rendering

// Common artist names and music terms that trigger poster-like layouts
const ARTIST_NAMES = [
  'the weeknd', 'drake', 'taylor swift', 'beyonce', 'kanye west', 'kanye', 'eminem', 
  'rihanna', 'justin bieber', 'ariana grande', 'ed sheeran', 'billie eilish',
  'post malone', 'travis scott', 'dua lipa', 'bruno mars', 'lady gaga', 'jay-z',
  'kendrick lamar', 'j cole', 'nicki minaj', 'cardi b', 'bad bunny', 'olivia rodrigo',
  'doja cat', 'lil nas x', 'harry styles', 'adele', 'shawn mendes', 'selena gomez'
];

const MUSIC_TERMS = [
  'hits', 'songs', 'albums', 'tracks', 'singles', 'ep', 'mixtape', 'playlist',
  'discography', 'bangers', 'chart', 'billboard', 'grammy', 'tour', 'concert',
  'studio', 'record', 'music', 'beat', 'lyrics', 'verse', 'chorus', 'hook'
];

const CELEBRITY_TERMS = [
  'celebrity', 'famous', 'star', 'icon', 'legend', 'influencer', 'tiktok',
  'instagram', 'twitter', 'social media', 'viral', 'trending', 'meme'
];

export interface PopCultureContext {
  isPopCulture: boolean;
  detectedTerms: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export function detectPopCultureContext(text: string): PopCultureContext {
  const lowerText = text.toLowerCase();
  const detectedTerms: string[] = [];
  
  // Check for artist names
  ARTIST_NAMES.forEach(artist => {
    if (lowerText.includes(artist)) {
      detectedTerms.push(artist);
    }
  });
  
  // Check for music terms
  MUSIC_TERMS.forEach(term => {
    if (lowerText.includes(term)) {
      detectedTerms.push(term);
    }
  });
  
  // Check for celebrity terms
  CELEBRITY_TERMS.forEach(term => {
    if (lowerText.includes(term)) {
      detectedTerms.push(term);
    }
  });
  
  const isPopCulture = detectedTerms.length > 0;
  
  // Determine risk level based on number and type of terms
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (detectedTerms.length >= 3) {
    riskLevel = 'high';
  } else if (detectedTerms.length >= 2 || ARTIST_NAMES.some(artist => lowerText.includes(artist))) {
    riskLevel = 'medium';
  }
  
  return {
    isPopCulture,
    detectedTerms,
    riskLevel
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
  
  // Add stronger blockers for higher risk levels
  if (context.riskLevel === 'high') {
    popCultureBlockers.push(
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