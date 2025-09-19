// 20 Comedian Voice Bank for randomized humor styles

export interface ComedianVoice {
  id: string;
  name: string;
  style: string;
  beats: string[];
  tone: string;
  signature: string;
}

export const COMEDIAN_VOICES: ComedianVoice[] = [
  {
    id: "kevin_hart",
    name: "Kevin Hart",
    style: "energetic_storytelling",
    beats: ["fast riff", "self own", "exaggeration", "physical comedy"],
    tone: "high-energy",
    signature: "Fast-paced, self-deprecating energy with physical references"
  },
  {
    id: "ali_wong",
    name: "Ali Wong",
    style: "raw_fearless",
    beats: ["raunchy", "brazen", "family digs", "pregnancy humor"],
    tone: "brutally honest",
    signature: "Raw, unapologetic family and relationship humor"
  },
  {
    id: "dave_chappelle",
    name: "Dave Chappelle",
    style: "sharp_commentary",
    beats: ["cultural turn", "understatement", "social observation"],
    tone: "sly and pointed",
    signature: "Sharp cultural commentary with sly delivery"
  },
  {
    id: "taylor_tomlinson",
    name: "Taylor Tomlinson",
    style: "relatable_millennial",
    beats: ["dating anxiety", "self roast", "millennial struggles"],
    tone: "self-aware",
    signature: "Relatable millennial anxiety and dating disasters"
  },
  {
    id: "ricky_gervais",
    name: "Ricky Gervais",
    style: "edgy_wit",
    beats: ["mocking", "dark humor", "celebrity roast"],
    tone: "sardonic",
    signature: "Edgy, mocking wit with zero filter"
  },
  {
    id: "trevor_noah",
    name: "Trevor Noah",
    style: "global_cultural",
    beats: ["immigrant pov", "soft jab", "cultural comparison"],
    tone: "worldly",
    signature: "Global perspective with gentle but pointed observations"
  },
  {
    id: "sebastian_maniscalco",
    name: "Sebastian Maniscalco",
    style: "physical_family",
    beats: ["exasperated", "gesture words", "family dysfunction"],
    tone: "animated",
    signature: "Exasperated family humor with physical storytelling"
  },
  {
    id: "bill_burr",
    name: "Bill Burr",
    style: "blunt_observational",
    beats: ["angry tag", "no filter", "brutal honesty"],
    tone: "unfiltered rage",
    signature: "Blunt, angry observations with zero apologies"
  },
  {
    id: "hasan_minhaj",
    name: "Hasan Minhaj",
    style: "narrative_political",
    beats: ["setup pivot", "political wink", "storytelling"],
    tone: "smart and smooth",
    signature: "Storytelling with political undertones and smooth delivery"
  },
  {
    id: "nate_bargatze",
    name: "Nate Bargatze",
    style: "deadpan_clean",
    beats: ["clean obvious", "slow twist", "understated"],
    tone: "deadpan innocent",
    signature: "Deadpan delivery with innocent but clever observations"
  },
  {
    id: "sarah_silverman",
    name: "Sarah Silverman",
    style: "dark_cute",
    beats: ["wrong but playful", "twisted logic", "innocent delivery"],
    tone: "deceptively sweet",
    signature: "Dark humor delivered with childlike innocence"
  },
  {
    id: "louis_ck",
    name: "Louis CK",
    style: "confessional",
    beats: ["inappropriate admit", "self-hatred", "oversharing"],
    tone: "self-loathing",
    signature: "Uncomfortable confessions and inappropriate admissions"
  },
  {
    id: "wanda_sykes",
    name: "Wanda Sykes",
    style: "sassy",
    beats: ["snap line", "social edge", "attitude"],
    tone: "no-nonsense sass",
    signature: "Sassy attitude with sharp social commentary"
  },
  {
    id: "chris_rock",
    name: "Chris Rock",
    style: "loud",
    beats: ["relationship heat", "social truth", "animated delivery"],
    tone: "loud and pointed",
    signature: "Loud, pointed observations about relationships and society"
  },
  {
    id: "jo_koy",
    name: "Jo Koy",
    style: "family",
    beats: ["mom jokes", "act out", "family dynamics"],
    tone: "family-focused",
    signature: "Family dynamics with physical acting and mom impressions"
  },
  {
    id: "norm_macdonald",
    name: "Norm MacDonald",
    style: "odd_deadpan",
    beats: ["weird left turn", "anti-joke", "unexpected"],
    tone: "bizarrely deadpan",
    signature: "Bizarre deadpan delivery with unexpected twists"
  },
  {
    id: "mitch_hedberg",
    name: "Mitch Hedberg",
    style: "surreal_one_liner",
    beats: ["misdirection", "wordplay", "absurd logic"],
    tone: "dreamy surreal",
    signature: "Surreal one-liners with unexpected misdirection"
  },
  {
    id: "amy_schumer",
    name: "Amy Schumer",
    style: "dirty_selfaware",
    beats: ["raunchy self", "sexual honesty", "body humor"],
    tone: "unapologetically dirty",
    signature: "Unapologetically dirty and self-aware sexual humor"
  },
  {
    id: "george_carlin",
    name: "George Carlin",
    style: "cynic",
    beats: ["societal rant shard", "linguistic", "philosophical"],
    tone: "cynical philosopher",
    signature: "Cynical philosophical rants about society and language"
  },
  {
    id: "joan_rivers",
    name: "Joan Rivers",
    style: "savage_glam",
    beats: ["fashion roast", "celebrity drag", "glamorous cruelty"],
    tone: "glamorously savage",
    signature: "Savage celebrity and fashion roasts with glamorous cruelty"
  }
];

// Random voice selection functions
export function getRandomVoices(count: number = 4): ComedianVoice[] {
  const shuffled = [...COMEDIAN_VOICES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function getVoiceById(id: string): ComedianVoice | undefined {
  return COMEDIAN_VOICES.find(voice => voice.id === id);
}

export function getVoicesByStyle(style: string): ComedianVoice[] {
  return COMEDIAN_VOICES.filter(voice => voice.style.includes(style));
}

// Generate comedian-specific prompt instructions
export function generateVoicePrompt(voice: ComedianVoice, rating: string): string {
  const ratingModifier = getRatingModifier(rating);
  
  return `Channel ${voice.name}'s ${voice.signature}. ${voice.beats.join(', ')}. ${ratingModifier}`;
}

// Rating-specific comedian pools
export const RATING_COMEDIAN_POOLS = {
  'PG': ['nate_bargatze', 'kevin_hart', 'jo_koy', 'sebastian_maniscalco'],
  'PG-13': ['ali_wong', 'trevor_noah', 'taylor_tomlinson', 'ricky_gervais'],
  'R': ['bill_burr', 'george_carlin', 'chris_rock', 'wanda_sykes'],
  'Explicit': ['amy_schumer', 'joan_rivers', 'louis_ck', 'sarah_silverman']
};

export function getComediansByRating(rating: string): ComedianVoice[] {
  const poolIds = RATING_COMEDIAN_POOLS[rating] || RATING_COMEDIAN_POOLS['PG-13'];
  return poolIds.map(id => COMEDIAN_VOICES.find(voice => voice.id === id)).filter(Boolean) as ComedianVoice[];
}

export function getRandomComediansByRating(rating: string, count: number = 4): ComedianVoice[] {
  const pool = getComediansByRating(rating);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, pool.length));
}

function getRatingModifier(rating: string): string {
  switch (rating) {
    case 'PG':
      return 'Keep it wholesome and family-friendly with playful energy.';
    case 'PG-13':
      return 'Include mild profanity (damn, hell) or sharp sarcastic attitude.';
    case 'R':
      return 'Use strong profanity (fuck, shit, ass) and savage brutal roasts.';
    case 'Explicit':
      return 'Go full NSFW with explicit sexual language and ruthlessly dirty content.';
    default:
      return 'Include some edge and attitude.';
  }
}