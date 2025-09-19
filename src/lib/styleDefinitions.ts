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
    'PG': 'Light sarcasm and playful roasting allowed. Add some sass and attitude but keep it clean.',
    'PG-13': 'Sharp roasts with real bite. MUST include mild profanity (damn, hell, crap) OR clever innuendo OR savage attitude. Get edgy.',
    'R': 'Go hard. MUST include strong profanity (fuck, shit, ass, bitch), brutal roasts, sexual references, or nasty commentary. No holding back.',
    'XXX': 'Full NSFW mode. Explicit sexual content, brutal profanity, savage personal attacks, dark humor. Absolutely ruthless and dirty.'
  };
  
  return definitions[rating] || definitions['PG-13'];
}