// Style and rating definitions for text generation

export function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow (40-80 chars)',
    'story': 'ALL 4 lines must be mini-narratives with setup → payoff structure. Length: 60-100 chars for narrative flow.',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact (40-80 chars)',
    'pop-culture': 'ALL 4 lines must include specific celebrities, movies, TV shows, music artists, apps, or trending topics (40-80 chars)',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected (40-80 chars)'
  };
  
  return definitions[style] || definitions['standard'];
}

export function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals. Wholesome and light.',
    'PG-13': 'Good humor with optional mild edge. Can include light roasting and mild profanity (damn, hell) but not required.',
    'R': 'Strong roast content. MUST include strong profanity (fuck, shit, ass, bitch), brutal roasts, sexual references, or nasty commentary. No holding back.',
    'Explicit': 'Full NSFW mode. Explicit sexual content, brutal profanity, savage personal attacks, dark humor. Absolutely ruthless and dirty.'
  };
  
  return definitions[rating] || definitions['PG-13'];
}