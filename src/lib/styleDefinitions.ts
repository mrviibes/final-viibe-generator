// Style and rating definitions for text generation

export function getStyleDefinition(style: string): string {
  const definitions = {
    'punchline-first': 'Always a one-liner joke. Start with the funny hit, explain after. Must be comedic structure, never flat description (40-80 chars)',
    'story': 'Mini stand-up story that always ends with a laugh. Longer narrative with setup and payoff (70-100 chars)',
    'pop-culture': 'Same joke structures but guarantees cultural references. Always includes celebrities, movies, TV, music, apps, or trends (40-80 chars)',
    'wildcard': 'Pure chaos using random joke structures (roast, absurd, punchline-first, story). Can be surreal or dark but still a joke shape (40-80 chars)'
  };
  
  return definitions[style] || definitions['punchline-first'];
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