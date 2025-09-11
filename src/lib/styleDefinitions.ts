// Style and rating definitions for text generation

export function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow',
    'story': 'Slight setup with quick narrative payoff - brief mini-stories that land the joke',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact',
    'pop-culture': 'MANDATORY: Every line must include celebrities, movies, TV shows, music, apps, or trending topics',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected'
  };
  
  return definitions[style] || definitions['standard'];
}

export function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals.',
    'PG': 'Light sarcasm and playful roasting allowed. Keep it gentle and fun.',
    'PG-13': 'Sharper roasts, mild innuendo, and cultural references. Never hateful or explicit.',
    'R': 'MANDATORY: Must be savage, edgy, and boundary-pushing with strong language and brutal roasts'
  };
  
  return definitions[rating] || definitions['PG-13'];
}