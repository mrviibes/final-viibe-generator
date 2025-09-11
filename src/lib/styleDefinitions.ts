// Style and rating definitions for text generation

export function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow',
    'story': 'ALL 4 lines must be mini-narratives with setup → payoff structure. Think brief mini-stories that unfold.',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact',
    'pop-culture': 'ALL 4 lines must include specific celebrities, movies, TV shows, music artists, apps, or trending topics',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected'
  };
  
  return definitions[style] || definitions['standard'];
}

export function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals.',
    'PG': 'Light sarcasm and playful roasting allowed. Keep it gentle and fun.',
    'PG-13': 'Sharper roasts, mild innuendo, and cultural references. Mild profanity allowed.',
    'R': 'Must include profanity (shit, fuck, ass), sexual references, brutal roasts, and boundary-pushing content'
  };
  
  return definitions[rating] || definitions['PG-13'];
}