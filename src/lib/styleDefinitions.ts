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
    'PG': 'Clean, safe, playful humor. Light roasts and dad joke energy. Think Jimmy Fallon style.',
    'PG-13': 'Snappy, sarcastic with mild profanity (damn, hell). Light innuendo allowed. Think Kevin Hart/Ali Wong style.',
    'R': 'Strong profanity (fuck, shit), brutal roasts, alcohol/drug jokes. More savage than PG-13. Think Bill Burr/George Carlin style.',
    'Explicit': 'Full NSFW with raunchy sexual humor. Unapologetically dirty and savage. Think Amy Schumer/Joan Rivers XXX mode.'
  };
  
  return definitions[rating] || definitions['PG-13'];
}