import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import unified configuration system
import { 
  NUM_TEXT_OPTIONS, 
  VIIBE_CONFIG, 
  isComedyEnabled, 
  shouldEnableValidator,
  validateOptionCount,
  type Step2Input,
  type TextLine,
  type Tone,
  type Rating
} from '../shared/config.ts';
import { applyInputPrecedence, validatePrecedenceCompliance } from '../shared/precedence.ts';
import { startNewBatch, isEntityAvailable, markEntityUsed } from '../shared/popCulture.ts';
import { selectVoicesForAllLines, getVoiceInstructions } from '../shared/comedianVoices.ts';
import { 
  parseTags, 
  validateTagCoverage, 
  enforceTagCoverage, 
  type TagValidationResult 
} from '../shared/tagEnforcement.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Validate configuration on startup
validateOptionCount(NUM_TEXT_OPTIONS);

// Global Blacklist System
const GLOBAL_BLACKLIST = {
  people: ["louis ck"],
  entities: [],
  enforce_everywhere: true,
  log_if_matched: true
};

// Sport Context Words for Clean Tones
const SPORT_CONTEXT_POOLS = {
  basketball: ["court", "hoop", "net", "dribble", "assist", "rebound", "buzzer", "tipoff", "timeout", "fast break"],
  baseball: ["field", "diamond", "bat", "pitch", "swing", "catch", "home run", "dugout", "stadium", "glove"],
  football: ["touchdown", "huddle", "snap", "kickoff", "fumble", "helmet", "line", "end zone", "pass"]
};

// Words to specifically avoid in generated content - reduced list
const AVOID_WORDS = [
  'literally', 'honestly', 'obviously', 'basically', 'actually', 'seriously',
  'totally', 'absolutely', 'definitely', 'perfectly', 'completely', 'extremely',
  'super', 'mega', 'ultra', 'insane', 'crazy', 'wild', 'sick', 'dope',
  'fire', 'lit', 'savage', 'beast', 'goat', 'king', 'queen', 'legend'
];

function getTopicalAnchors(category: string, subcategory: string): string[] {
  const categoryMappings: Record<string, Record<string, string[]>> = {
    "Celebrations": {
      "Birthday": ["group chat", "budget", "age", "calendar", "surprise", "awkward", "planning", "photos", "memory", "reminder"],
      "Wedding": ["dress", "venue", "budget", "planning", "stress", "family", "photos", "dance", "cake", "flowers"],
      "Holiday": ["family", "tradition", "food", "gifts", "stress", "travel", "decorations", "weather", "shopping", "reunion"]
    },
    "Roasts": {
      "Friend": ["history", "secrets", "habits", "quirks", "fails", "embarrassing", "inside jokes", "mutual friends", "memories", "texts"],
      "Self": ["age", "choices", "habits", "appearance", "career", "relationships", "fitness", "skills", "procrastination", "reality"],
      "Celebrity": ["career", "scandals", "social media", "movies", "music", "fashion", "relationships", "controversies", "comebacks", "tabloids"]
    },
    "Everyday": {
      "Work": ["meetings", "deadlines", "coffee", "emails", "boss", "commute", "lunch", "overtime", "colleagues", "stress"],
      "Dating": ["apps", "profiles", "conversations", "ghosting", "first dates", "expectations", "red flags", "texting", "commitment", "single"],
      "Social Media": ["followers", "likes", "comments", "stories", "posts", "algorithm", "trends", "influencers", "content", "validation"]
    }
  };

  return categoryMappings[category]?.[subcategory] || ["life", "reality", "experience", "situation", "moment", "time"];
}

function getClicheBanList(category: string, subcategory: string): string[] {
  const baseClicheList = [
    "another year older", "another year wiser", "aged like fine wine", "over the hill",
    "blessed", "grateful", "journey", "adventure", "memories", "moments",
    "perfect", "amazing", "incredible", "awesome", "fantastic",
    "goals", "squad", "fam", "bestie", "slay", "queen", "king",
    "vibes", "mood", "energy", "blessed", "iconic", "legendary"
  ];
  
  const categorySpecific: Record<string, Record<string, string[]>> = {
    "Celebrations": {
      "Birthday": ["cake", "candles", "wishes", "party", "celebration", "special day"],
      "Wedding": ["big day", "happily ever after", "meant to be", "soulmates"],
      "Holiday": ["holiday spirit", "magical time", "family time", "tradition"]
    }
  };
  
  const specificList = categorySpecific[category]?.[subcategory] || [];
  return [...baseClicheList, ...specificList];
}

function getVibeKeywords(subcategory: string): string[] {
  const vibeMap: Record<string, string[]> = {
    "Birthday": ["aging", "adulting", "planning disasters", "group dynamics", "nostalgic", "milestone panic"],
    "Wedding": ["commitment anxiety", "family drama", "budget stress", "perfection pressure", "romance reality"],
    "Holiday": ["family chaos", "tradition pressure", "gift stress", "food comas", "travel nightmares"],
    "Friend": ["inside jokes", "shared trauma", "loyalty tests", "growth differences", "comfort zones"],
    "Self": ["personal growth", "reality checks", "habit patterns", "self-awareness", "life phases"],
    "Celebrity": ["public personas", "career arcs", "cultural impact", "controversy cycles", "relevance"],
    "Work": ["corporate culture", "productivity theater", "office politics", "career ambitions", "work-life blur"],
    "Dating": ["modern romance", "digital connection", "vulnerability", "compatibility", "relationship dynamics"],
    "Social Media": ["digital validation", "curated reality", "attention economy", "comparison culture", "online personas"]
  };
  
  return vibeMap[subcategory] || ["human nature", "social dynamics", "modern life", "personal quirks"];
}

function getToneDefinition(tone: string): { definition: string; dos: string[]; donts: string[]; examples: string[] } {
  const toneDetails: Record<string, { definition: string; dos: string[]; donts: string[]; examples: string[] }> = {
    "Savage": {
      definition: "Brutally honest and cutting. No mercy, but with wit.",
      dos: [
        "Point out uncomfortable truths",
        "Use sharp, direct language", 
        "Be merciless but clever",
        "Target real flaws and weaknesses",
        "Use surgical precision in your cuts"
      ],
      donts: [
        "Be needlessly cruel without humor",
        "Use generic insults",
        "Be boring or predictable",
        "Pull punches or be gentle",
        "Apologize or soften the blow"
      ],
      microExamples: [
        "Your life choices make reality TV look classy",
        "Even your GPS suggests alternate routes around your problems",
        "You're proof that participation trophies were a mistake"
      ]
    },
    "Humorous": {
      definition: "Clever and funny observations that make people laugh, not wince.",
      dos: [
        "Find the absurd in everyday situations",
        "Use timing and setup for punchlines",
        "Make relatable observations",
        "Use wordplay and clever connections",
        "Point out ironic contradictions"
      ],
      donts: [
        "Be mean-spirited or harsh",
        "Use tired joke formats",
        "Over-explain the humor",
        "Force puns or wordplay",
        "Be too aggressive or cutting"
      ],
      microExamples: [
        "Adulting is just Googling how to do things",
        "My life runs on caffeine and good intentions",
        "Reality called but I sent it to voicemail"
      ]
    },
    "Playful": {
      definition: "Light, fun, and mischievous. Like teasing someone you genuinely like.",
      dos: [
        "Use gentle teasing and banter",
        "Be silly and lighthearted",
        "Make playful observations",
        "Use fun comparisons and metaphors",
        "Keep energy upbeat and bouncy"
      ],
      donts: [
        "Be cutting or harsh",
        "Use serious or heavy topics",
        "Be sarcastic in a mean way",
        "Make people feel bad",
        "Use dark or cynical humor"
      ],
      microExamples: [
        "You collect hobbies like other people collect dust",
        "Your cooking skills are charmingly experimental",
        "You're like a human golden retriever with anxiety"
      ]
    },
    "Sentimental": {
      definition: "Warm, nostalgic, and emotionally connected. Heartfelt but not cheesy.",
      dos: [
        "Reference shared experiences",
        "Use warm, inclusive language",
        "Acknowledge genuine connections",
        "Balance emotion with authenticity",
        "Create a sense of belonging"
      ],
      donts: [
        "Be overly saccharine or fake",
        "Use generic greeting card language",
        "Over-sentimentalize everything",
        "Ignore the humor element entirely",
        "Be preachy or lecture-y"
      ],
      microExamples: [
        "We've survived worse together and lived to laugh about it",
        "Still can't believe we've made it this far without adult supervision",
        "Thanks for being weird with me all these years"
      ]
    },
    "Serious": {
      definition: "Thoughtful and meaningful without being heavy. Respectful depth.",
      dos: [
        "Use measured, thoughtful language",
        "Acknowledge real challenges",
        "Be authentic and genuine",
        "Respect the gravity of situations",
        "Find wisdom in experiences"
      ],
      donts: [
        "Be preachy or condescending",
        "Use overly formal language",
        "Lose the humor entirely",
        "Be depressing or heavy",
        "Sound like a self-help book"
      ],
      microExamples: [
        "Growth happens in the spaces between what we planned and what actually happened",
        "Some chapters are harder to write than others",
        "The best lessons usually come disguised as inconveniences"
      ]
    },
    "Inspirational": {
      definition: "Uplifting and motivating without being preachy. Genuine encouragement.",
      dos: [
        "Focus on potential and growth",
        "Use encouraging but realistic language",
        "Acknowledge challenges while emphasizing strength",
        "Be genuinely supportive",
        "Celebrate progress and effort"
      ],
      donts: [
        "Use generic motivational quotes",
        "Ignore real struggles",
        "Be unrealistically positive",
        "Sound like a life coach",
        "Dismiss valid concerns"
      ],
      microExamples: [
        "You're writing a story that no one else could tell",
        "Your weird is exactly the kind the world needs more of",
        "Every stumble forward still counts as progress"
      ]
    }
  };
  
  return toneDetails[tone] || toneDetails["Humorous"];
}

// Style and rating definitions for text generation
function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow (40-80 chars)',
    'story': 'ALL 4 lines must be mini-narratives with setup → payoff structure. Length: 60-100 chars for narrative flow.',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact (40-80 chars)',
    'pop-culture': 'ALL 4 lines must include specific celebrities, movies, TV shows, music artists, apps, or trending topics (40-80 chars)',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected (40-80 chars)'
  };
  
  return definitions[style] || definitions['standard'];
}

function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals. Wholesome and light.',
    'PG': 'Light sarcasm and playful roasting allowed. Keep it gentle and fun. Mild teasing only.',
    'PG-13': 'Sharper roasts, cultural digs, mild innuendo. MUST include at least one edgy element per batch. Mild profanity (damn, hell) allowed.',
    'R': 'MUST include explicit profanity (shit, fuck, ass, etc), savage roasts, sexual references, or boundary-pushing content. Be brutal and edgy.'
  };
  
  return definitions[rating] || definitions['PG-13'];
}

function checkToneAlignment(lines: Array<{lane: string, text: string}>, tone: string): { aligned: boolean; issues: string[] } {
  const issues: string[] = [];
  
  switch (tone) {
    case "Savage":
      const savageCount = lines.filter(line => {
        const text = line.text.toLowerCase();
        return /\b(brutal|harsh|savage|ruthless|merciless|cutting|sharp|vicious)\b/.test(text) ||
               /\b(worst|terrible|awful|pathetic|useless|hopeless|disaster)\b/.test(text) ||
               /\b(fail|failure|mess|joke|waste|train wreck)\b/.test(text);
      }).length;
      
      if (savageCount < 2) {
        issues.push(`Only ${savageCount}/4 lines are savage enough. Need more brutal, cutting humor.`);
      }
      break;
      
    case "Sentimental":
      const sentimentalCount = lines.filter(line => {
        const text = line.text.toLowerCase();
        return /\b(we|us|our|together|shared|remember|always|still|never forget)\b/.test(text) ||
               /\b(love|care|appreciate|treasure|cherish|grateful|thankful)\b/.test(text) ||
               /\b(years|time|memories|moments|friendship|connection)\b/.test(text);
      }).length;
      
      if (sentimentalCount < 2) {
        issues.push(`Only ${sentimentalCount}/4 lines are sentimental enough. Need more emotional warmth and connection.`);
      }
      break;
      
    case "Playful":
      const playfulCount = lines.filter(line => {
        const text = line.text.toLowerCase();
        return /\b(silly|funny|weird|quirky|adorable|cute|goofy|dorky)\b/.test(text) ||
               /\b(like|just|kinda|sorta|totally|super|pretty)\b/.test(text);
      }).length;
      
      if (playfulCount < 2) {
        issues.push(`Only ${playfulCount}/4 lines are playful enough. Need more lighthearted, teasing energy.`);
      }
      break;
  }
  
  return {
    aligned: issues.length === 0,
    issues
  };
}

// Legacy function - now uses shared implementation
function parseTagsLocal(tags: string[]): { hardTags: string[]; softTags: string[] } {
  return parseTags(tags);
}

// Check global blacklist
function checkBlacklist(text: string): { blocked: boolean; matches: string[] } {
  const matches: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const person of GLOBAL_BLACKLIST.people) {
    if (lowerText.includes(person.toLowerCase())) {
      matches.push(person);
    }
  }
  
  for (const entity of GLOBAL_BLACKLIST.entities) {
    if (lowerText.includes(entity.toLowerCase())) {
      matches.push(entity);
    }
  }
  
  if (matches.length > 0 && GLOBAL_BLACKLIST.log_if_matched) {
    console.log(`🚫 Blacklist violation: ${matches.join(', ')}`);
  }
  
  return {
    blocked: matches.length > 0,
    matches
  };
}

// Legacy function - now uses shared implementation
function selectComedianVoiceLocal(tone: string, rating: string): string | null {
  return selectVoicesForAllLines(tone, rating, 1)[0] || null;
}

// Get tone overrides for clean tones
function getToneOverrides(tone: string): any {
  const toneOverrides: Record<string, any> = {
    "Sentimental": {
      disable_force_funny: true,
      disable_rating_quotas: true, 
      allow_clean_language: true,
      require_positive_or_supportive: true,
      sport_context_words_required: 2,
      sport_context_pool: [...SPORT_CONTEXT_POOLS.basketball, ...SPORT_CONTEXT_POOLS.baseball, ...SPORT_CONTEXT_POOLS.football]
    },
    "Romantic": {
      disable_force_funny: true,
      disable_rating_quotas: true,
      allow_clean_language: true,
      require_positive_or_affectionate: true, 
      sport_context_words_required: 2,
      sport_context_pool: [...SPORT_CONTEXT_POOLS.basketball, ...SPORT_CONTEXT_POOLS.baseball, ...SPORT_CONTEXT_POOLS.football]
    }
  };
  
  return toneOverrides[tone] || null;
}

// Legacy function - now uses shared implementation
function applyInputPrecedenceLocal(inputs: any): any {
  return applyInputPrecedence(inputs);
}

// Length bucket assignment for variety
function assignLengthBuckets(): Array<[number, number]> {
  const buckets = VIIBE_CONFIG.lengthBuckets.ranges;
  if (VIIBE_CONFIG.lengthBuckets.randomizePerBatch) {
    // Shuffle array to get different ranges per batch
    const shuffled = [...buckets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  return buckets;
}

// Check for flat descriptions
function checkFlatDescriptions(lines: Array<{lane: string, text: string}>, tone: string): { hasFlatDescriptions: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Only check for comedy-enabled tones
  if (!VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(tone)) {
    return { hasFlatDescriptions: false, issues: [] };
  }
  
  const patterns = VIIBE_CONFIG.funnyEnhancements.flatDescriptionPatterns;
  
  const flatLines = lines.filter(line => {
    const text = line.text.toLowerCase();
    return patterns.some(pattern => text.includes(pattern.toLowerCase())) ||
           // Additional flat pattern detection
           /^[^.!?]*\b(is|are|was|were)\s+\w+\s+(at|in|on)\s+\w+[.!?]?$/.test(text) ||
           text.split(' ').length < 6; // Very short, likely flat
  });
  
  if (flatLines.length > 1) {
    issues.push(`${flatLines.length} lines are flat descriptions. Need more dynamic, comedic approaches.`);
  }
  
  return {
    hasFlatDescriptions: flatLines.length > 1,
    issues
  };
}

// Check for comedy structure variety
function checkComedyStructureVariety(lines: Array<{lane: string, text: string}>, tone: string): { hasVariety: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(tone)) {
    return { hasVariety: true, issues: [] };
  }
  
  const structures = {
    roast: 0,
    absurd: 0,
    punchlineFirst: 0,
    story: 0
  };
  
  lines.forEach(line => {
    const text = line.text.toLowerCase();
    
    // Roast detection
    if (/\b(your|you're|you are)\b/.test(text) && /\b(worst|terrible|awful|fail|disaster|mess)\b/.test(text)) {
      structures.roast++;
    }
    // Absurd comparison detection  
    else if (/\b(like|as|than)\b/.test(text) && /\b(suddenly|randomly|somehow|mysteriously|would|could)\b/.test(text)) {
      structures.absurd++;
    }
    // Punchline-first detection
    else if ((text.includes(',') || text.includes(':') || text.includes(' - ')) && text.split(' ').length > 6) {
      structures.punchlineFirst++;
    }
    // Story detection
    else if (/\b(then|when|after|before|until|so|first|decided|realized)\b/.test(text)) {
      structures.story++;
    }
  });
  
  const usedStructures = Object.values(structures).filter(count => count > 0).length;
  if (usedStructures < 3) {
    issues.push(`Only ${usedStructures}/4 comedy structures used. Need variety: roast, absurd comparison, punchline-first, short story.`);
  }
  
  return {
    hasVariety: usedStructures >= 3,
    issues
  };
}

// Check for pop culture or absurd requirements
function checkPopCultureOrAbsurd(lines: Array<{lane: string, text: string}>, tone: string): { hasRequiredContent: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!VIIBE_CONFIG.funnyEnhancements.requirePopCultureOrAbsurd || 
      !VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(tone)) {
    return { hasRequiredContent: true, issues: [] };
  }
  
  const popCultureCount = lines.filter(line => {
    const text = line.text.toLowerCase();
    return /\b(netflix|tiktok|instagram|spotify|amazon|google|uber|disney|marvel|taylor swift|kardashian)\b/.test(text) ||
           /\b(app|show|movie|song|celebrity|influencer|viral|trending|meme)\b/.test(text) ||
           /\b(iphone|android|facebook|twitter|youtube|snapchat)\b/.test(text);
  }).length;
  
  const absurdCount = lines.filter(line => {
    const text = line.text.toLowerCase();
    return /\b(like|as|than)\b/.test(text) && 
           (/\b(drunk|high|confused|lost|broken|dead)\b/.test(text) ||
            /\b(surgery|hospital|court|prison|therapy)\b/.test(text) ||
            /\b(alien|zombie|robot|dinosaur|unicorn)\b/.test(text));
  }).length;
  
  if (popCultureCount + absurdCount < 2) {
    issues.push(`Need 2+ lines with pop culture references OR absurd comparisons. Found ${popCultureCount} pop culture + ${absurdCount} absurd.`);
  }
  
  return {
    hasRequiredContent: (popCultureCount + absurdCount) >= 2,
    issues
  };
}

// Check for story with twist requirement
function checkStoryWithTwist(lines: Array<{lane: string, text: string}>, tone: string): { hasStoryWithTwist: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!VIIBE_CONFIG.funnyEnhancements.requireOneStoryWithTwist || 
      !VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(tone)) {
    return { hasStoryWithTwist: true, issues: [] };
  }
  
  const storyWithTwistCount = lines.filter(line => {
    const text = line.text.toLowerCase();
    const hasNarrative = /\b(then|when|after|before|until|so|decided|realized|discovered|happened|turned out)\b/.test(text);
    const hasTwist = /\b(but|except|actually|turns out|surprise|plot twist|however|unfortunately)\b/.test(text) ||
                     text.includes(',') && text.split(',').length >= 2;
    return hasNarrative && hasTwist && text.split(' ').length >= 8;
  }).length;
  
  if (storyWithTwistCount < 1) {
    issues.push(`Need 1+ mini-story with twist ending. Use narrative words (then, when, decided) + twist words (but, turns out, actually).`);
  }
  
  return {
    hasStoryWithTwist: storyWithTwistCount >= 1,
    issues
  };
}

function getSystemPrompt(category: string, subcategory: string, tone: string, tags: string[], style?: string, rating?: string): string {
  // Gate validators by tone
  const comedyEnabled = isComedyEnabled(tone);
  const forceFunnyEnabled = shouldEnableValidator('forceFunny', tone);
  const ratingQuotasEnabled = shouldEnableValidator('ratingQuotas', tone);
  const { hardTags, softTags } = parseTags(tags);
  
  // Get tone overrides
  const toneOverride = getToneOverrides(tone);
  
  // Select comedian voice
  const comedianVoice = selectComedianVoice(tone, rating || 'PG-13');
  
  // Assign length buckets for variety
  const lengthBuckets = assignLengthBuckets();
  
  const styleDefinitions = {
    'standard': 'Balanced one-liners with varied length',
    'story': 'Mini-narratives with setup → payoff',
    'pop-culture': 'Include celebrities, movies, TV, music, apps',
    'punchline-first': 'Hit joke early, then tag-back',
    'wildcard': 'Use current tone rules with creative approach'
  };
  
  const ratingDefs = {
    'G': 'Family-friendly only',
    'PG': 'Light sarcasm allowed', 
    'PG-13': 'Sharper roasts, mild profanity (damn, hell)',
    'R': 'Explicit profanity (shit, fuck, ass), savage roasts'
  };
  
  // Build length assignments per line
  const lengthAssignments = lengthBuckets.map((range, index) => 
    `Option${index + 1}: ${range[0]}-${range[1]} chars`
  ).join(', ');
  
  const styleDesc = styleDefinitions[style || 'standard'] || styleDefinitions['standard'];
  let ratingDesc = ratingDefs[rating || 'PG-13'] || ratingDefs['PG-13'];
  
  // Override rating description for clean tones
  if (toneOverride?.disable_rating_quotas) {
    ratingDesc = `Keep language clean and ${toneOverride.require_positive_or_supportive ? 'supportive' : 'affectionate'}`;
  }
  
  let systemPrompt = `Generate 4 ${tone.toLowerCase()} lines for ${subcategory}. 

LENGTH VARIETY (CRITICAL): ${lengthAssignments}
Each line MUST fit its assigned range for variety.

STYLE: ${styleDesc}. ${ratingDesc}.

COMEDY STRUCTURE ROTATION: Vary between:
- Roast: Direct targeting ("Your [thing] is...")  
- Absurd comparison: Unexpected similes ("Like a [thing] on [situation]")
- Punchline-first: "Joke first, then setup explanation"
- Short story: "Setup happened, then twist ending"

JSON: {"lines": [{"lane": "option1", "text": "..."}, {"lane": "option2", "text": "..."}, {"lane": "option3", "text": "..."}, {"lane": "option4", "text": "..."}]}`;

  // Add comedian voice instruction
  if (comedianVoice) {
    systemPrompt += `\n\nCOMEDIAN VOICE: Channel ${comedianVoice} style - vary voice per line for diversity.`;
  }
  
  // Add sport context requirement for clean tones
  if (toneOverride?.sport_context_words_required) {
    systemPrompt += `\n\nSPORT CONTEXT: Include ${toneOverride.sport_context_words_required}+ sport words in total: ${toneOverride.sport_context_pool.slice(0, 10).join(', ')}, etc.`;
  }
  
  // Add hard tag requirements
  if (hardTags.length > 0) {
    systemPrompt += `\n\nHARD TAGS: Must literally include these in 3 of 4 lines: ${hardTags.map(t => `"${t}"`).join(', ')}`;
  }
  
  // Add funny enhancement rules for comedy-enabled tones
  if (VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(tone)) {
    systemPrompt += `\n\nFUNNY ENHANCEMENTS (REQUIRED):
- Must include 2+ pop culture references (Netflix, TikTok, celebrities, apps) OR absurd comparisons
- Must include 1+ mini-story with twist ending ("Setup happened, but turns out...")
- Ban flat descriptions like "Jesse is tall at basketball" - make them dynamic and comedic
- Each line should use different comedy approach for variety`;
  }
  
  return systemPrompt;
}

function buildUserMessage(inputs: any, previousErrors: string[] = []): string {
  let message = `${inputs.category}: ${inputs.subcategory}, ${inputs.tone} tone`;

  if (previousErrors.length > 0) {
    message += `\nFix: ${previousErrors.slice(0, 2).join(", ")}`;
  }

  return message;
}

function checkComedyVariety(lines: Array<{lane: string, text: string}>): { hasVariety: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check voice variety using expected patterns
  const voicePatterns = {
    deadpan: /\b(just|literally|apparently|basically|somehow)\b/i,
    blunt: /\b(look|listen|honestly|real talk|straight up)\b/i,
    absurdist: /\b(suddenly|randomly|somehow|mysteriously|inexplicably)\b/i,
    narrative: /\b(then|when|after|before|until|so)\b/i
  };
  
  const detectedVoices = new Set();
  lines.forEach(line => {
    const text = line.text;
    Object.entries(voicePatterns).forEach(([voice, pattern]) => {
      if (pattern.test(text)) {
        detectedVoices.add(voice);
      }
    });
  });
  
  if (detectedVoices.size < 3) {
    issues.push(`Insufficient voice variety. Need more distinct comedic approaches (deadpan, blunt, absurdist, narrative).`);
  }
  
  // Check for repeated sentence structures
  const structures = lines.map(line => {
    const text = line.text;
    if (text.includes("you're") || text.includes("you are")) return "you-statement";
    if (text.includes("i'm") || text.includes("i am") || text.includes("my")) return "i-statement"; 
    if (text.includes("we're") || text.includes("we are") || text.includes("our")) return "we-statement";
    if (text.includes("when") || text.includes("if")) return "conditional";
    return "other";
  });
  
  const uniqueStructures = new Set(structures);
  if (uniqueStructures.size < 3) {
    issues.push(`Too many similar sentence structures. Need more variety in how lines are constructed.`);
  }
  
  // Check for repeated keywords
  const allWords = lines.flatMap(line => 
    line.text.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  );
  const wordCounts = allWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const repeatedWords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 1 && !['your', 'that', 'this', 'with', 'like', 'just', 'even', 'still'].includes(word))
    .map(([word]) => word);
    
  if (repeatedWords.length > 2) {
    issues.push(`Word repetition: ${repeatedWords.join(', ')} appear multiple times. Need more varied vocabulary.`);
  }
  
  return {
    hasVariety: issues.length === 0,
    issues
  };
}

function checkTopicalAnchors(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): { hasAnchors: boolean; issues: string[] } {
  const issues: string[] = [];
  const anchors = getTopicalAnchors(category, subcategory);
  
  const linesWithAnchors = lines.filter(line => {
    const text = line.text.toLowerCase();
    return anchors.some(anchor => text.includes(anchor.toLowerCase()));
  }).length;
  
  if (linesWithAnchors < 2) {
    issues.push(`Only ${linesWithAnchors}/4 lines contain topical anchors (${anchors.slice(0, 5).join(', ')}...). Need more specific ${subcategory} references.`);
  }
  
  return {
    hasAnchors: issues.length === 0,
    issues
  };
}

function checkVibeGrounding(lines: Array<{lane: string, text: string}>, subcategory: string): { hasVibe: boolean; issues: string[] } {
  const issues: string[] = [];
  const vibeKeywords = getVibeKeywords(subcategory);
  
  const linesWithVibe = lines.filter(line => {
    const text = line.text.toLowerCase();
    return vibeKeywords.some(keyword => 
      text.includes(keyword.toLowerCase()) || 
      // Check for semantic matches
      (keyword.includes('stress') && (text.includes('pressure') || text.includes('anxiety'))) ||
      (keyword.includes('reality') && (text.includes('truth') || text.includes('facts')))
    );
  }).length;
  
  if (linesWithVibe < 2) {
    issues.push(`Only ${linesWithVibe}/4 lines capture the right vibe for ${subcategory}. Need more of these themes: ${vibeKeywords.slice(0, 3).join(', ')}.`);
  }
  
  return {
    hasVibe: issues.length === 0,
    issues
  };
}

function checkStyleCompliance(lines: Array<{lane: string, text: string}>, style: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  switch (style) {
    case 'story':
      const narrativeCount = lines.filter(line => {
        const text = line.text.toLowerCase();
        return /\b(then|when|after|before|until|so|first|next|finally)\b/.test(text) ||
               /\b(decided|realized|discovered|happened|turned out)\b/.test(text);
      }).length;
      
      if (narrativeCount < 3) {
        issues.push(`Story style requires narrative flow. Only ${narrativeCount}/4 lines use story structure. Add words like "then", "when", "decided", etc.`);
      }
      break;
      
    case 'pop-culture':
      const popCultureCount = lines.filter(line => {
        const text = line.text.toLowerCase();
        return /\b(netflix|tiktok|instagram|spotify|amazon|google|uber|disney|marvel|taylor swift|kardashian)\b/.test(text) ||
               /\b(app|show|movie|song|celebrity|influencer|viral|trending|meme)\b/.test(text);
      }).length;
      
      if (popCultureCount < 3) {
        issues.push(`Pop-culture style requires current references. Only ${popCultureCount}/4 lines include pop culture. Add Netflix, TikTok, celebrities, apps, etc.`);
      }
      break;
      
    case 'punchline-first':
      const punchlineFirstCount = lines.filter(line => {
        const text = line.text;
        // Check if the line starts with the punchline (short impactful phrase)
        const words = text.split(' ');
        return words.length > 5 && text.includes(',') || text.includes(':') || text.includes(' - ');
      }).length;
      
      if (punchlineFirstCount < 2) {
        issues.push(`Punchline-first style needs impact upfront. Structure: "Punchline, then setup" or "Joke: explanation".`);
      }
      break;
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

function checkRatingCompliance(lines: Array<{lane: string, text: string}>, rating: string, tone?: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Skip rating checks if tone overrides disable them
  const toneOverride = getToneOverrides(tone || '');
  if (toneOverride?.disable_rating_quotas) {
    return { compliant: true, issues: [] };
  }
  
  switch (rating) {
    case 'R':
      const hasExplicitContent = lines.some(line => {
        const text = line.text.toLowerCase();
        return /\b(fuck|shit|ass|damn|hell|bitch|crap)\b/.test(text) ||
               /\b(sex|sexual|nude|naked|horny|kinky)\b/.test(text) ||
               /\b(suck|blow|screw|bang|hard|wet|tight)\b/.test(text);
      });
      
      if (!hasExplicitContent) {
        issues.push(`R-rating requires explicit content. Must include profanity (fuck, shit, ass) or sexual references.`);
      }
      break;
      
    case 'PG-13':
      const hasEdgyContent = lines.some(line => {
        const text = line.text.toLowerCase();
        return /\b(damn|hell|crap|sucks|stupid|idiot)\b/.test(text) ||
               /\b(drunk|wasted|party|wild|crazy)\b/.test(text) ||
               text.includes('innuendo') || text.includes('suggestive');
      });
      
      if (!hasEdgyContent) {
        issues.push(`PG-13 rating requires at least one edgy element. Add mild profanity (damn, hell) or suggestive content.`);
      }
      break;
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

function validateAndRepair(lines: Array<{lane: string, text: string}>, inputs: {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  style?: string;
  rating?: string;
  hardTags: string[];
  softTags: string[];
}): { isValid: boolean; errors: string[]; warnings: string[]; lengths: number[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check blacklist first
  for (const line of lines) {
    const blacklistCheck = checkBlacklist(line.text);
    if (blacklistCheck.blocked) {
      errors.push(`Blacklist violation: ${blacklistCheck.matches.join(', ')}`);
    }
  }
  
  // Structure validation (errors = must fix)
  if (!lines || !Array.isArray(lines)) {
    errors.push("Invalid structure - must be array of lines");
    return { isValid: false, errors, warnings, lengths: [] };
  }
  
  if (lines.length !== 4) {
    errors.push(`Must have exactly 4 lines, got ${lines.length}`);
    return { isValid: false, errors, warnings, lengths: [] };
  }
  
  // Length variety validation - check if lines fall into different buckets
  const lengths = lines.map(line => line.text?.length || 0);
  const tooShort = lengths.filter(len => len < 20).length;
  const tooLong = lengths.filter(len => len > 120).length;
  
  if (tooShort > 0) {
    warnings.push(`${tooShort} lines too short (min 20 chars)`);
  }
  if (tooLong > 0) {
    warnings.push(`${tooLong} lines too long (max 120 chars)`);
  }
  
  // Check for length variety - lines should span different ranges
  if (VIIBE_CONFIG.lengthBuckets.enforceVariety) {
    const lengthRanges = lengths.map(len => {
      if (len <= 60) return 'short';
      if (len <= 80) return 'medium';  
      if (len <= 100) return 'long';
      return 'max';
    });
    const uniqueRanges = new Set(lengthRanges);
    if (uniqueRanges.size < 3) {
      warnings.push(`Insufficient length variety. Lines cluster in ${uniqueRanges.size}/4 ranges. Need more spread: ${lengths.join(', ')} chars`);
    }
  }
  
  // Empty lines check (error)
  const emptyLines = lines.filter(line => !line.text || line.text.trim().length === 0).length;
  if (emptyLines > 0) {
    errors.push(`${emptyLines} empty lines found`);
  }
  
  // Quality checks (warnings only - don't fail validation)
  const varietyCheck = checkComedyVariety(lines);
  if (!varietyCheck.hasVariety) {
    warnings.push(...varietyCheck.issues);
  }
  
  const toneCheck = checkToneAlignment(lines, inputs.tone);
  if (!toneCheck.aligned) {
    warnings.push(...toneCheck.issues);
  }
  
  if (inputs.style) {
    const styleCheck = checkStyleCompliance(lines, inputs.style);
    if (!styleCheck.compliant) {
      warnings.push(...styleCheck.issues);
    }
  }
  
  if (inputs.rating) {
    const ratingCheck = checkRatingCompliance(lines, inputs.rating, inputs.tone);
    if (!ratingCheck.compliant) {
      warnings.push(...ratingCheck.issues);
    }
  }
  
  // Sport context validation for clean tones
  const toneOverride = getToneOverrides(inputs.tone);
  if (toneOverride?.sport_context_words_required) {
    let sportWordCount = 0;
    const sportWords = toneOverride.sport_context_pool;
    
    lines.forEach(line => {
      const text = line.text.toLowerCase();
      sportWords.forEach(word => {
        if (text.includes(word.toLowerCase())) {
          sportWordCount++;
        }
      });
    });
    
    if (sportWordCount < toneOverride.sport_context_words_required) {
      warnings.push(`Sport context: ${sportWordCount}/${toneOverride.sport_context_words_required} required sport words found`);
    }
  }
  
  // Enhanced hard tag validation - require 3 of 4 lines
  if (inputs.hardTags.length > 0) {
    let linesWithHardTags = 0;
    for (const line of lines) {
      const hasAllTags = inputs.hardTags.every(tag => 
        line.text.toLowerCase().includes(tag.toLowerCase())
      );
      if (hasAllTags) linesWithHardTags++;
    }
    
    if (linesWithHardTags < 3) {
      errors.push(`Hard tags: Only ${linesWithHardTags}/4 lines contain ALL required tags. Need 3+ lines with all tags: ${inputs.hardTags.join(', ')}`);
    }
  }
  
  if (inputs.softTags.length > 0) {
    const softTagCoverage = inputs.softTags.filter(tag => 
      lines.some(line => line.text.toLowerCase().includes(tag.toLowerCase()))
    ).length;
    
    if (softTagCoverage < inputs.softTags.length) {
      warnings.push(`Soft tags: ${softTagCoverage}/${inputs.softTags.length} exact phrases found`);
    }
  }
  
  // Funny enhancement validation for comedy tones
  if (VIIBE_CONFIG.funnyEnhancements.enabledTones.includes(inputs.tone)) {
    const flatCheck = checkFlatDescriptions(lines, inputs.tone);
    if (flatCheck.hasFlatDescriptions) {
      warnings.push(...flatCheck.issues);
    }
    
    const structureCheck = checkComedyStructureVariety(lines, inputs.tone);
    if (!structureCheck.hasVariety) {
      warnings.push(...structureCheck.issues);
    }
    
    const popCultureCheck = checkPopCultureOrAbsurd(lines, inputs.tone);
    if (!popCultureCheck.hasRequiredContent) {
      warnings.push(...popCultureCheck.issues);
    }
    
    const storyCheck = checkStoryWithTwist(lines, inputs.tone);
    if (!storyCheck.hasStoryWithTwist) {
      warnings.push(...storyCheck.issues);
    }
  }
  
  // Pass if basic structure is good
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    lengths
  };
}

function normalizeText(lines: Array<{lane: string, text: string}>): Array<{lane: string, text: string}> {
  return lines.map(line => ({
    lane: line.lane,
    text: line.text.trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*$/, '$1') // Ensure single punctuation at end if any
  }));
}

function ensureTagCoverage(lines: Array<{lane: string, text: string}>, tags: string[]): Array<{lane: string, text: string}> {
  if (tags.length === 0) return lines;
  
  const { hardTags, softTags } = parseTags(tags);
  const modifiedLines = [...lines];
  
  // Simple tag injection for hard tags that are missing
  for (const hardTag of hardTags) {
    const hasTag = modifiedLines.some(line => 
      line.text.toLowerCase().includes(hardTag.toLowerCase())
    );
    
    if (!hasTag && modifiedLines.length > 0) {
      // Inject tag into first line that has space
      const targetLine = modifiedLines.find(line => line.text.length < 70);
      if (targetLine) {
        targetLine.text = `${targetLine.text} ${hardTag}`.trim();
      }
    }
  }
  
  return modifiedLines;
}

function getToneAwareFallback(inputs: any): Array<{lane: string, text: string}> {
  const { tone, subcategory, rating } = inputs;
  const toneOverride = getToneOverrides(tone);
  
  // Sport-aware fallbacks for clean tones
  if (toneOverride?.sport_context_words_required && subcategory) {
    const sportFallbacks: Record<string, Record<string, string[]>> = {
      "Basketball": {
        "Sentimental": [
          "Every rebound teaches patience and our hearts listen closely",
          "The court is loud but your calm finds the net perfectly",
          "We miss a shot and hope sets the next screen beautifully",
          "Your effort writes music and the buzzer hums along softly"
        ],
        "Romantic": [
          "Your cut to the hoop felt like a promise kept sweetly",
          "The net sighs softly when your shot finds home again",
          "Heart sets a screen and we glide to open space together",
          "We miss once then your smile beats the buzzer every time"
        ]
      },
      "Baseball": {
        "Sentimental": [
          "The diamond glows when effort turns into pure grace",
          "A quiet pitch and the crowd learns to breathe together",
          "We jog the bases and hope keeps the steady pace",
          "The glove closes and the moment stays warm forever"
        ],
        "Romantic": [
          "Your swing connects and my heart rounds all the bases",
          "The diamond sparkles but your eyes catch more light somehow",
          "Home run distance but you still steal my breath completely",
          "Stadium lights dim but we glow in the dugout together"
        ]
      }
    };
    
    const sportCategory = subcategory?.includes("Basketball") ? "Basketball" : "Baseball";
    const sportLines = sportFallbacks[sportCategory]?.[tone];
    if (sportLines) {
      return sportLines.map((text, index) => ({
        lane: `option${index + 1}`,
        text
      }));
    }
  }
  
  // Regular tone-based fallbacks
  const fallbacksByTone: Record<string, string[]> = {
    "Savage": [
      "Your life choices make reality TV look classy somehow",
      "Even GPS suggests alternate routes around your problems daily", 
      "You're proof participation trophies were a serious mistake entirely",
      "Your decisions have their own disaster relief fund already"
    ],
    "Humorous": [
      "Adulting is just Googling how to do things properly",
      "My life runs on caffeine and good intentions mostly",
      "Reality called but I sent it to voicemail again", 
      "I'm not lazy I'm on energy saving mode currently"
    ],
    "Playful": [
      "You collect hobbies like other people collect dust bunnies",
      "Your cooking skills are charmingly experimental and dangerous",
      "You're like a human golden retriever with anxiety issues",
      "Your life is basically a sitcom without the laugh track"
    ],
    "Sentimental": [
      "Still can't believe we've made it this far together",
      "Thanks for being weird with me all these wonderful years",
      "We've survived worse and lived to laugh about it",
      "Some friendships just make sense no matter what happens"
    ],
    "Romantic": [
      "You make ordinary moments feel like movie scenes",
      "My heart does backflips when you laugh like that",
      "You're the plot twist my story always needed desperately",
      "Every day with you writes itself into my favorite chapter"
    ],
    "Serious": [
      "Growth happens between plans and reality meeting each other",
      "Some chapters are harder to write than others completely", 
      "The best lessons come disguised as inconveniences usually",
      "Every experience teaches us something about ourselves ultimately"
    ],
    "Inspirational": [
      "You're writing a story no one else could tell",
      "Your weird is exactly what the world needs more of",
      "Every stumble forward still counts as progress definitely",
      "The journey shapes us more than the destination ever could"
    ]
  };
  
  const baseLines = fallbacksByTone[tone] || fallbacksByTone["Humorous"];
  
  return baseLines.map((text, index) => ({
    lane: `option${index + 1}`,
    text
  }));
}

function getEmergencyFallback(): Array<{lane: string, text: string}> {
  const emergency = [
    "Sometimes the universe has a sense of humor",
    "Life keeps happening whether we're ready or not",
    "We're all just figuring it out as we go", 
    "Every day is an adventure in unexpected possibilities"
  ];
  
  return emergency.map((text, index) => ({
    lane: `option${index + 1}`,
    text
  }));
}

async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  try {
    const userMessage = buildUserMessage(inputs, previousErrors);
    
    console.log(`LLM attempt ${attemptNumber}/2`);
    console.log("User message:", userMessage);
    
    // Use only gpt-5-mini for consistency
    const model = 'gpt-5-2025-08-07';
    
    console.log(`Using model: ${model}`);
    
    // Use the enhanced system prompt
    const systemPrompt = getSystemPrompt(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Humorous', inputs.tags || [], inputs.style || 'standard', inputs.rating || 'PG-13');
    
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${inputs.category}: ${inputs.subcategory}, ${inputs.tone} tone` }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500
    };
    
    // GPT-5 parameters - increased tokens for better completion
    requestBody.max_completion_tokens = 1500;
    
    console.log(`Request body keys: ${Object.keys(requestBody).join(', ')}`);
    console.log(`Using model: ${model}`);
    
    // Reduce timeout for faster failure detection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenAI API error ${response.status}:`, errorText);
      console.error(`Request model: ${model}, Body:`, JSON.stringify(requestBody, null, 2));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Enhanced logging to verify actual model used
    console.log(`✅ API Success - Model: ${data.model}, Finish: ${data.choices?.[0]?.finish_reason}, Content: ${data.choices?.[0]?.message?.content?.length || 0} chars`);
    console.log(`Raw response preview:`, data.choices?.[0]?.message?.content?.substring(0, 100));
    
    if (data.model !== model) {
      console.warn(`⚠️ Model mismatch! Requested: ${model}, Got: ${data.model}`);
    }
    
    // Check for missing content with detailed logging
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error(`❌ Empty API response:`, JSON.stringify(data, null, 2));
      throw new Error("Empty response from OpenAI API");
    }
    
    const rawContent = data.choices[0].message.content.trim();
    
    if (!rawContent) {
      throw new Error("Empty response from OpenAI API");
    }
    
    console.log(`Attempt ${attemptNumber} raw response (${rawContent.length} chars):`, 
      rawContent.substring(0, 200) + (rawContent.length > 200 ? "..." : ""));
    
    // Parse and validate
    let parsedLines = null;
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.lines && Array.isArray(parsed.lines) && parsed.lines.length === 4) {
        parsedLines = parsed.lines;
      } else {
        throw new Error("Invalid JSON structure - need 4 lines");
      }
    } catch (e) {
      console.log("Failed to parse JSON from model:", e.message);
      throw new Error(`JSON parse error: ${e.message}`);
    }
    
    // Parse tags for validation
    const { hardTags, softTags } = parseTags(inputs.tags || []);
    
    // Validate with our rules
    const validation = validateAndRepair(parsedLines, {
      category: inputs.category || '',
      subcategory: inputs.subcategory || '',
      tone: inputs.tone || 'Humorous',
      tags: inputs.tags || [],
      style: inputs.style,
      rating: inputs.rating,
      hardTags,
      softTags
    });
    
    if (validation.isValid) {
      console.log(`✅ Attempt ${attemptNumber} validation passed`);
      const normalizedLines = normalizeText(parsedLines);
      const finalLines = ensureTagCoverage(normalizedLines, inputs.tags || []);
      
      return {
        lines: finalLines,
        model: data.model,
        validated: true,
        success: true,
        generatedWith: 'Validated API',
        issues: validation.warnings
      };
    } else {
      console.log(`❌ Attempt ${attemptNumber} validation failed:`, validation.errors);
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }
    
  } catch (error) {
    console.error(`Attempt ${attemptNumber} failed:`, error.message);
    throw error;
  }
}

  serve(async (req) => {
    // Initialize new batch for pop-culture cooldown
    startNewBatch();
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInputs = await req.json();
    console.log("Generate Step 2 function called");
    console.log("Raw request data:", rawInputs);
    
    // Apply input precedence transformations BEFORE system prompt generation
    const inputs = applyInputPrecedenceLocal(rawInputs);
    console.log("Processed inputs:", inputs);
    
    // Validate precedence compliance
    const precedenceCheck = validatePrecedenceCompliance(inputs);
    if (!precedenceCheck.compliant) {
      console.warn('⚠️ Precedence issues:', precedenceCheck.issues);
    }

    if (!openAIApiKey) {
      console.log("API completely failed, using tone-aware fallback:", []);
      const fallbackLines = getToneAwareFallback(inputs);
      return new Response(JSON.stringify({
        lines: fallbackLines,
        model: "fallback",
        validated: false,
        success: true,
        generatedWith: 'Emergency Fallback',
        issues: ["OpenAI API key not configured"]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Attempt generation with retries (only GPT-5 models)
    let lastError = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await attemptGeneration(inputs, attempt);
        
        if (result && result.lines && Array.isArray(result.lines) && result.lines.length > 0) {
          const validatedLines = result.lines.filter(line => line.text && line.text.trim().length > 0);
          
          if (validatedLines.length >= 3) {
            return new Response(JSON.stringify({
              lines: validatedLines,
              model: result.model,
              validated: true,
              success: true,
              generatedWith: result.generatedWith,
              issues: result.issues || []
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
        
      } catch (error) {
        console.error(`Generation attempt ${attempt} failed:`, error.message);
        lastError = error;
      }
    }

    // If all attempts failed, use fallback
    console.log("All attempts failed validation. Using fallback instead of unvalidated content.");
    const fallbackLines = getToneAwareFallback(inputs);
    return new Response(JSON.stringify({
      lines: fallbackLines,
      model: "fallback",
      validated: false,
      success: true,
      generatedWith: 'Fallback',
      issues: ["API generation failed"]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Generate Step 2 function error:", error);
    console.log("API completely failed, using tone-aware fallback:", []);
    const fallbackLines = getToneAwareFallback({});
    return new Response(JSON.stringify({
      lines: fallbackLines,
      model: "fallback",
      validated: false,
      success: true,
      generatedWith: 'Emergency Fallback',
      issues: ["API completely failed"]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});