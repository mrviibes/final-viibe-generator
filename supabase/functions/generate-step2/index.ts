import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Words to specifically avoid in generated content
const AVOID_WORDS = [
  'awesome', 'amazing', 'incredible', 'fantastic', 'unbelievable', 
  'literally', 'basically', 'actually', 'honestly', 'definitely',
  'totally', 'absolutely', 'completely', 'perfectly', 'exactly',
  'vibes', 'mood', 'energy', 'blessed', 'grateful', 'journey',
  'adventure', 'memories', 'moments', 'special', 'magical',
  'perfect', 'beautiful', 'wonderful', 'precious', 'treasure',
  'epic', 'legendary', 'iconic', 'classic', 'timeless',
  'goals', 'squad', 'fam', 'bestie', 'slay', 'queen', 'king'
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

function parseTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    if (tag.startsWith('"') && tag.endsWith('"')) {
      // Soft tag (exact phrase match)
      softTags.push(tag.slice(1, -1));
    } else {
      // Hard tag (keyword presence)
      hardTags.push(tag);
    }
  }
  
  return { hardTags, softTags };
}

function getSystemPrompt(category: string, subcategory: string, tone: string, tags: string[], style?: string, rating?: string): string {
  const styleDefinition = getStyleDefinition(style || 'standard');
  const ratingDefinition = getRatingDefinition(rating || 'PG-13');
  const toneDetails = getToneDefinition(tone);
  const anchors = getTopicalAnchors(category, subcategory);
  const clicheBans = getClicheBanList(category, subcategory);
  const vibeKeywords = getVibeKeywords(subcategory);
  
  // Voice variety assignment (4 specific voices per batch)
  const voiceMappings = {
    'option1': 'deadpan',
    'option2': 'blunt', 
    'option3': 'absurdist',
    'option4': 'narrative'
  };
  
  // Dynamic length requirements based on style
  let lengthRequirement = "40-80 characters";
  if (style === 'story') {
    lengthRequirement = "60-100 characters for narrative flow";
  }
  
  const { hardTags, softTags } = parseTags(tags);
  
  return `You are a professional comedy writer creating humorous text lines for memes and image overlays.

CRITICAL REQUIREMENTS:
1. Generate exactly 4 lines in valid JSON format: {"lines": [{"lane": "option1", "text": "..."}, ...]}
2. Length requirement: ${lengthRequirement} (STRICTLY ENFORCED)
3. Max one punctuation mark per line (period, comma, dash, etc.)
4. Write conversationally - sound like a real person texting, not AI-generated content
5. INTRA-BATCH VARIETY REQUIRED:
   - option1: deadpan delivery (flat, matter-of-fact tone)
   - option2: blunt approach (direct, no-nonsense)
   - option3: absurdist twist (weird, unexpected)
   - option4: narrative style (mini story arc)

STYLE ENFORCEMENT: ${styleDefinition}
${style === 'pop-culture' ? 'POP CULTURE MANDATORY: ALL 4 lines MUST reference specific celebrities, movies, TV shows, music artists, apps, or current trends. No generic references.' : ''}
${style === 'story' ? 'STORY MODE MANDATORY: ALL 4 lines MUST follow setup → payoff narrative structure with 60-100 characters.' : ''}
${style === 'punchline-first' ? 'PUNCHLINE FIRST MANDATORY: Lead with the gag, then add a brief tag or twist.' : ''}

RATING ENFORCEMENT: ${ratingDefinition}
${rating === 'R' ? 'R-RATING MANDATORY: Include explicit profanity (shit, fuck, ass, damn, hell) or savage roasts in AT LEAST 2/4 lines. Be brutal and edgy.' : ''}
${rating === 'PG-13' ? 'PG-13 MANDATORY: Include sharper edge, mild profanity (damn, hell), or cultural digs in AT LEAST 1/4 lines.' : ''}

TONE GUIDANCE: ${toneDetails.definition}
DO: ${toneDetails.dos.join(", ")}
DON'T: ${toneDetails.donts.join(", ")}

CONTENT REQUIREMENTS:
- TOPICAL ANCHORS (use at least 2): ${anchors.join(", ")}
- VIBE KEYWORDS: ${vibeKeywords.join(", ")}
- HARD TAGS TO INCLUDE: ${hardTags.join(", ") || "none"}
- EXACT PHRASES TO INCLUDE: ${softTags.join(", ") || "none"}

CLICHÉ BAN LIST (NEVER use these): ${clicheBans.join(", ")}
AVOID WORDS: ${AVOID_WORDS.slice(0, 10).join(", ")}

Remember: Each line must feel distinctly different in voice and approach while maintaining cohesive tone and style.

Respond with JSON only.`;
}

function buildUserMessage(inputs: any, previousErrors: string[] = []): string {
  const noveltyToken = `RND-${Math.floor(Math.random() * 10000)}`;
  const deviceSetting = Math.floor(Math.random() * 7) + 1;
  
  // Dynamic length targets based on style
  const lengthMin = (inputs.style === 'story') ? 60 : 40;
  const lengthMax = (inputs.style === 'story') ? 100 : 80;
  
  const lengthTargets = [
    Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin,
    Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin,
    Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin,
    Math.floor(Math.random() * (lengthMax - lengthMin + 1)) + lengthMin
  ].sort((a, b) => a - b);
  
  let message = `Category: ${inputs.category}
Subcategory: ${inputs.subcategory}
Tone: ${inputs.tone}
Novelty Token: ${noveltyToken}
Device Setting: ${deviceSetting}
LENGTH TARGETS (enforce variety): [${lengthTargets.join(", ")}]

WRITE CONVERSATIONALLY: Sound like a real person texting, not an AI generating content. Use contractions, natural flow, and varied sentence lengths.

Respond with JSON only.`;

  if (previousErrors.length > 0) {
    message += `

PREVIOUS ATTEMPT ISSUES: ${previousErrors.join("; ")}
      
Please fix these issues while maintaining the ${inputs.tone} tone and natural flow. Remember: Max 100 chars per line, max one punctuation mark total per line.`;
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
    issues.push(`Repeated keywords: ${repeatedWords.join(", ")}. Need more lexical variety.`);
  }
  
  return {
    hasVariety: issues.length === 0,
    issues
  };
}

function checkTopicalAnchors(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): { grounded: boolean; count: number; anchors: string[] } {
  const expectedAnchors = getTopicalAnchors(category, subcategory);
  let foundCount = 0;
  const foundAnchors: string[] = [];
  
  for (const line of lines) {
    const text = line.text.toLowerCase();
    for (const anchor of expectedAnchors) {
      if (text.includes(anchor.toLowerCase())) {
        foundCount++;
        foundAnchors.push(anchor);
        break; // Only count one anchor per line
      }
    }
  }
  
  return {
    grounded: foundCount >= 2,
    count: foundCount,
    anchors: [...new Set(foundAnchors)]
  };
}

function checkVibeGrounding(lines: Array<{lane: string, text: string}>, subcategory: string): { grounded: boolean; count: number } {
  const vibeKeywords = getVibeKeywords(subcategory);
  let foundCount = 0;
  
  for (const line of lines) {
    const text = line.text.toLowerCase();
    for (const keyword of vibeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        foundCount++;
        break; // Only count one keyword per line
      }
    }
  }
  
  return {
    grounded: foundCount >= 1,
    count: foundCount
  };
}

function checkStyleCompliance(lines: Array<{lane: string, text: string}>, style: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  switch (style) {
    case 'pop-culture':
      // Check for celebrity, movie, TV, music, app, or trend references
      const popCulturePatterns = [
        /\b(netflix|spotify|instagram|tiktok|youtube|twitter|facebook|snapchat|discord|zoom|apple|google|amazon|uber|tesla)\b/i,
        /\b(taylor swift|beyonce|drake|kanye|kim kardashian|elon musk|jeff bezos|mark zuckerberg|trump|biden)\b/i,
        /\b(marvel|disney|netflix|hbo|game of thrones|stranger things|wednesday|squid game|euphoria|succession)\b/i,
        /\b(iphone|android|alexa|siri|chatgpt|ai|crypto|bitcoin|metaverse|nft|tinder|bumble|venmo|cashapp)\b/i
      ];
      
      let popCultureCount = 0;
      lines.forEach(line => {
        const text = line.text.toLowerCase();
        const hasReference = popCulturePatterns.some(pattern => pattern.test(text));
        if (hasReference) popCultureCount++;
      });
      
      if (popCultureCount < 4) {
        issues.push(`CRITICAL STYLE FAILURE: Only ${popCultureCount}/4 lines contain pop culture references. ALL lines must include celebrities, movies, shows, apps, or trends.`);
      }
      break;
      
    case 'story':
      // Check for narrative structure signals
      const narrativePatterns = /\b(then|when|after|before|until|so|suddenly|finally|meanwhile|next|first|last)\b/i;
      const setupPayoffPatterns = /\b(but|except|turns out|actually|however|unfortunately|surprisingly|plot twist)\b/i;
      
      let narrativeCount = 0;
      lines.forEach(line => {
        const text = line.text;
        const hasNarrative = narrativePatterns.test(text) || setupPayoffPatterns.test(text);
        if (hasNarrative) narrativeCount++;
      });
      
      if (narrativeCount < 3) {
        issues.push(`CRITICAL STYLE FAILURE: Only ${narrativeCount}/4 lines have story structure. ALL lines must have setup → payoff narrative flow.`);
      }
      break;
      
    case 'punchline-first':
      // Check that jokes lead with the gag
      let punchlineFirstCount = 0;
      lines.forEach(line => {
        const text = line.text;
        const words = text.split(' ');
        const firstHalf = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        
        // Look for humor indicators in first half
        const humorPatterns = /\b(worst|best|only|never|always|can't|won't|shouldn't|definitely|basically|literally|apparently)\b/i;
        if (humorPatterns.test(firstHalf)) {
          punchlineFirstCount++;
        }
      });
      
      if (punchlineFirstCount < 3) {
        issues.push(`CRITICAL STYLE FAILURE: Only ${punchlineFirstCount}/4 lines lead with punchlines. Front-load the humor.`);
      }
      break;
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

function checkRatingCompliance(lines: Array<{lane: string, text: string}>, rating: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
  switch (rating) {
    case 'R':
      // Check for explicit content
      const explicitPatterns = [
        /\b(fuck|shit|ass|damn|hell|bitch|bastard|crap)\b/i,
        /\b(suck|blow|screw|piss|tits|dick|cock)\b/i
      ];
      
      let explicitCount = 0;
      lines.forEach(line => {
        const text = line.text.toLowerCase();
        const hasExplicit = explicitPatterns.some(pattern => pattern.test(text));
        if (hasExplicit) explicitCount++;
      });
      
      if (explicitCount < 2) {
        issues.push(`CRITICAL RATING FAILURE: Only ${explicitCount}/4 lines are R-rated. MUST include explicit profanity, savage roasts, or boundary-pushing content in at least 2 lines.`);
      }
      break;
      
    case 'PG-13':
      // Check for edge/sass
      const edgePatterns = [
        /\b(damn|hell|crap|suck|stupid|idiot|moron|dumb|pathetic|loser)\b/i,
        /\b(savage|brutal|harsh|roast|burn|destroyed|wrecked|owned)\b/i,
        /\b(awkward|cringe|embarrassing|tragic|disaster|mess|fail)\b/i
      ];
      
      let edgeCount = 0;
      lines.forEach(line => {
        const text = line.text.toLowerCase();
        const hasEdge = edgePatterns.some(pattern => pattern.test(text));
        if (hasEdge) edgeCount++;
      });
      
      if (edgeCount < 1) {
        issues.push(`CRITICAL RATING FAILURE: Only ${edgeCount}/4 lines are PG-13. MUST include some edge, sass, or mild profanity in at least 1 line.`);
      }
      break;
  }
  
  return {
    compliant: issues.length === 0,
    issues
  };
}

function validateAndRepair(lines: Array<{lane: string, text: string}>, inputs: any): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[]; 
  lengths: number[] 
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lengths = lines.map(line => line.text.length);
  
  // Check that we have exactly 4 lines
  if (lines.length !== 4) {
    errors.push(`Expected 4 lines, got ${lines.length}`);
    return { isValid: false, errors, warnings, lengths };
  }
  
  // Dynamic length requirements based on style
  const lengthMin = (inputs.style === 'story') ? 60 : 40;
  const lengthMax = (inputs.style === 'story') ? 100 : 80;
  
  // Check length requirements
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].text;
    const length = text.length;
    
    if (length < lengthMin || length > lengthMax) {
      errors.push(`Line ${i + 1} length ${length} chars, must be ${lengthMin}-${lengthMax}`);
      continue;
    }
    
    // Check punctuation limits (max 1 per line)
    const punctuationMarks = (text.match(/[.!?,:;—\-"']/g) || []).length;
    if (punctuationMarks > 1) {
      errors.push(`Too much punctuation: "${text}" has ${punctuationMarks} marks, max 1`);
    }
    
    // Check for banned clichés
    const bannedPhrases = getClicheBanList(inputs.category || '', inputs.subcategory || '');
    const lowerText = text.toLowerCase();
    for (const banned of bannedPhrases) {
      if (lowerText.includes(banned.toLowerCase())) {
        errors.push(`Banned phrases found: Cliché "${banned}" in "${text}"`);
      }
    }
    
    // Check for generic avoid words
    for (const avoided of AVOID_WORDS) {
      if (lowerText.includes(avoided.toLowerCase())) {
        errors.push(`Banned phrases found: Cliché "${avoided}" in "${text}"`);
      }
    }
  }
  
  // Check topical grounding
  const topicalCheck = checkTopicalAnchors(lines, inputs.category || '', inputs.subcategory || '');
  if (!topicalCheck.grounded) {
    errors.push(`Topical grounding insufficient: ${topicalCheck.count}/4 lines include topical anchors. Need at least 2 from: ${getTopicalAnchors(inputs.category || '', inputs.subcategory || '').join(", ")}`);
  }
  
  // Check comedy variety
  const varietyCheck = checkComedyVariety(lines);
  if (!varietyCheck.hasVariety) {
    warnings.push(...varietyCheck.issues);
  }
  
  // Tone alignment check
  const toneCheck = checkToneAlignment(lines, inputs.tone || 'Balanced');
  if (!toneCheck.aligned) {
    warnings.push(...toneCheck.issues);
  }
  
  // Style compliance check
  if (inputs.style) {
    const styleCheck = checkStyleCompliance(lines, inputs.style);
    if (!styleCheck.compliant) {
      errors.push(...styleCheck.issues);
    }
  }
  
  // Rating compliance check
  if (inputs.rating) {
    const ratingCheck = checkRatingCompliance(lines, inputs.rating);
    if (!ratingCheck.compliant) {
      errors.push(...ratingCheck.issues);
    }
  }
  
  // Tag coverage check  
  if (inputs.hardTags && inputs.hardTags.length > 0) {
    const tagCoverage = inputs.hardTags.filter((tag: string) => {
      return lines.some(line => line.text.toLowerCase().includes(tag.toLowerCase()));
    }).length;
    
    if (tagCoverage < inputs.hardTags.length) {
      errors.push(`Tag coverage insufficient: ${tagCoverage}/${inputs.hardTags.length} tags covered`);
    }
  }
  
  if (inputs.softTags && inputs.softTags.length > 0) {
    const softTagCoverage = inputs.softTags.filter((tag: string) => {
      return lines.some(line => line.text.includes(tag));
    }).length;
    
    if (softTagCoverage < inputs.softTags.length) {
      errors.push(`Soft tag coverage insufficient: ${softTagCoverage}/${inputs.softTags.length} exact phrases found`);
    }
  }
  
  
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

function getToneAwareFallback(category: string, subcategory: string, tone: string, tags: string[]): Array<{lane: string, text: string}> {
  const fallbacksByTone: Record<string, string[]> = {
    "Savage": [
      "Your life choices make reality TV look classy",
      "Even GPS suggests alternate routes around your problems", 
      "You're proof participation trophies were a mistake",
      "Your decisions have their own disaster relief fund"
    ],
    "Humorous": [
      "Adulting is just Googling how to do things",
      "My life runs on caffeine and good intentions",
      "Reality called but I sent it to voicemail", 
      "I'm not lazy I'm on energy saving mode"
    ],
    "Playful": [
      "You collect hobbies like other people collect dust",
      "Your cooking skills are charmingly experimental",
      "You're like a human golden retriever with anxiety",
      "Your life is basically a sitcom without the laugh track"
    ],
    "Sentimental": [
      "Still can't believe we've made it this far",
      "Thanks for being weird with me all these years",
      "We've survived worse and lived to laugh about it",
      "Some friendships just make sense no matter what"
    ],
    "Serious": [
      "Growth happens between plans and reality",
      "Some chapters are harder to write than others", 
      "The best lessons come disguised as inconveniences",
      "Every experience teaches us something about ourselves"
    ],
    "Inspirational": [
      "You're writing a story no one else could tell",
      "Your weird is exactly what the world needs more of",
      "Every stumble forward still counts as progress",
      "The journey shapes us more than the destination"
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
    
    console.log(`LLM attempt ${attemptNumber}/3`);
    console.log("User message:", userMessage);
    
    // Model cascade with stronger models for later attempts
    const models = ['gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07', 'gpt-5-2025-08-07'];
    const model = models[Math.min(attemptNumber - 1, models.length - 1)];
    
    console.log(`Using model: ${model}`);
    
    // Use the enhanced system prompt
    const systemPrompt = getSystemPrompt(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || [], inputs.style || 'standard', inputs.rating || 'PG-13');
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }
    };
    
    // Model-specific parameters
    if (model.startsWith('gpt-5') || model.startsWith('gpt-4.1')) {
      requestBody.max_completion_tokens = 300;
    } else {
      requestBody.max_tokens = 300;
      requestBody.temperature = 0.7;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Enhanced logging
    console.log(`Attempt ${attemptNumber} API response:`, {
      model: data.model,
      finish_reason: data.choices?.[0]?.finish_reason,
      content_length: data.choices?.[0]?.message?.content?.length || 0,
      usage: data.usage
    });
    
    // Check for missing content
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error("Empty or missing content from OpenAI:", data);
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
      tone: inputs.tone || 'Balanced',
      tags: inputs.tags || [],
      style: inputs.style,
      rating: inputs.rating,
      hardTags: hardTags,
      softTags: softTags
    });
    
    if (validation.isValid) {
      console.log(`Attempt ${attemptNumber} succeeded`);
      return {
        success: true,
        lines: parsedLines,
        model: data.model,
        warnings: validation.warnings,
        lengths: validation.lengths
      };
    } else {
      console.log(`Attempt ${attemptNumber} failed validation:`, validation.errors.join(", "));
      return { 
        success: false,
        errors: validation.errors,
        rawLines: parsedLines,
        model: data.model
      };
    }
    
  } catch (error) {
    console.error(`Attempt ${attemptNumber} error:`, error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Generate Step 2 function called");
  
  try {
    const inputs = await req.json();
    console.log("Request data:", inputs);
    
    // Extract mode for custom instructions
    const mode = inputs.mode || "regenerate";
    
    // If no API key, return fallback immediately
    if (!openAIApiKey) {
      console.log("No OpenAI API key, using tone-aware fallback");
      const fallbackLines = getToneAwareFallback(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
      return new Response(JSON.stringify({
        lines: fallbackLines,
        model: "fallback",
        validated: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try up to 3 attempts with escalating models
    const maxAttempts = 3;
    let rawCandidate: Array<{lane: string, text: string}> | null = null;
    let finalResult: Array<{lane: string, text: string}> | null = null;
    let allErrors: string[] = [];
    let modelUsed = "unknown";
    let validated = false;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`LLM attempt ${attempt}/${maxAttempts}`);
      
      try {
        const result = await attemptGeneration(inputs, attempt, allErrors);
        modelUsed = result.model || modelUsed;
        
        if (result.success && result.lines) {
          finalResult = result.lines;
          validated = true;
          console.log(`Success after ${attempt} attempt(s), lengths:`, result.lengths);
          break;
        } else {
          // Preserve the first valid parsed response as a candidate
          if (result.rawLines && !rawCandidate) {
            rawCandidate = result.rawLines;
            console.log(`Preserved raw candidate from attempt ${attempt}:`, rawCandidate.map(l => `"${l.text}" (${l.text.length})`));
          }
          if (result.errors) {
            allErrors.push(...result.errors.map(e => `Attempt ${attempt}: ${e}`));
          }
        }
      } catch (error) {
        console.log(`Attempt ${attempt} error:`, error);
        allErrors.push(`Attempt ${attempt}: ${error.message}`);
      }
    }
    
    // If we have a valid result, return it
    if (finalResult) {
      console.log(`Success: Returning valid result from LLM attempts`);
      const tagEnforcedResult = ensureTagCoverage(finalResult, inputs.tags || []);
      const normalizedResult = normalizeText(tagEnforcedResult);
      return new Response(JSON.stringify({
        lines: normalizedResult,
        model: modelUsed,
        validated: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // NO LONGER USE UNVALIDATED CANDIDATES - strict enforcement
    console.log(`All attempts failed validation. Using fallback instead of unvalidated content.`);
    console.log(`Validation errors:`, allErrors);
    
    // Final fallback
    console.log(`API completely failed, using tone-aware fallback:`, allErrors);
    const fallbackLines = getToneAwareFallback(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
    const normalizedFallback = normalizeText(fallbackLines);
    
    return new Response(JSON.stringify({
      lines: normalizedFallback,
      model: "fallback",
      validated: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in generate-step2 function:', error);
    
    // Emergency fallback
    const fallbackLines = getToneAwareFallback("", "", "Balanced", []);
    const normalizedEmergency = normalizeText(fallbackLines);
    
    return new Response(JSON.stringify({
      lines: normalizedEmergency,
      model: "emergency-fallback",
      error: error.message,
      validated: false
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});