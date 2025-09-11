// Style and rating definitions for text generation

export function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow',
    'story': 'Slight setup with quick narrative payoff - brief mini-stories that land the joke',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact',
    'pop-culture': 'Include relevant celebrities, movies, trends, or memes (avoid dated references)',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected'
  };
  
  return definitions[style] || definitions['standard'];
}

export function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals.',
    'PG': 'Light sarcasm and playful roasting allowed. Keep it gentle and fun.',
    'PG-13': 'Sharper roasts, mild innuendo, and cultural references. Never hateful or explicit.',
    'R': 'Boundary-pushing roasts and edgy humor, but maintain safety filters (no hate/harassment/explicit content)'
  };
  
  return definitions[rating] || definitions['PG-13'];
}