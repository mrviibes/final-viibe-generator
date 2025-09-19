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
    'PG': 'Clean but sharp humor with clever burns. Light roasts with bite but family-friendly. Think prime Jimmy Fallon but with more edge.',
    'PG-13': 'Aggressive sarcasm with mild profanity (damn, hell, ass). Sharp innuendo and brutal roasts required. Think Kevin Hart/Ali Wong at their meanest.',
    'R': 'MUST include strong profanity (fuck, shit, bitch) and brutal personal attacks. Savage roasts, alcohol/drug jokes, sexual references mandatory. Think Bill Burr unleashed.',
    'Explicit': 'ZERO tame lines allowed. Every line must be raunchy sexual humor, explicit content, or savage personal destruction. Think Amy Schumer/Joan Rivers at absolute maximum filth.'
  };
  
  return definitions[rating] || definitions['PG-13'];
}