import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  const { hardTags, softTags } = parseTags(tags);
  
  const styleDefinitions = {
    'standard': 'Balanced one-liners (40-80 chars)',
    'story': 'Mini-narratives with setup → payoff (60-100 chars)',
    'pop-culture': 'Include celebrities, movies, TV, music, apps (40-80 chars)',
    'punchline-first': 'Hit joke early, then tag-back (40-80 chars)',
    'wildcard': 'Experimental humor (40-80 chars)'
  };
  
  const ratingDefs = {
    'G': 'Family-friendly only',
    'PG': 'Light sarcasm allowed', 
    'PG-13': 'Sharper roasts, mild profanity (damn, hell)',
    'R': 'Explicit profanity (shit, fuck, ass), savage roasts'
  };
  
  const lengthReq = style === 'story' ? "60-100 characters" : "40-80 characters";
  const styleDesc = styleDefinitions[style || 'standard'] || styleDefinitions['standard'];
  const ratingDesc = ratingDefs[rating || 'PG-13'] || ratingDefs['PG-13'];
  
  return `Generate 4 ${tone.toLowerCase()} lines for ${subcategory}. 

JSON: {"lines": [{"lane": "option1", "text": "..."}, {"lane": "option2", "text": "..."}, {"lane": "option3", "text": "..."}, {"lane": "option4", "text": "..."}]}

${lengthReq}. ${ratingDesc}.`;
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

function checkRatingCompliance(lines: Array<{lane: string, text: string}>, rating: string): { compliant: boolean; issues: string[] } {
  const issues: string[] = [];
  
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
  
  // Structure validation (errors = must fix)
  if (!lines || !Array.isArray(lines)) {
    errors.push("Invalid structure - must be array of lines");
    return { isValid: false, errors, warnings, lengths: [] };
  }
  
  if (lines.length !== 4) {
    errors.push(`Must have exactly 4 lines, got ${lines.length}`);
    return { isValid: false, errors, warnings, lengths: [] };
  }
  
  // Length validation (relaxed - warnings only)
  const lengths = lines.map(line => line.text?.length || 0);
  const tooShort = lengths.filter(len => len < 20).length;
  const tooLong = lengths.filter(len => len > 120).length;
  
  if (tooShort > 0) {
    warnings.push(`${tooShort} lines too short (min 20 chars)`);
  }
  if (tooLong > 0) {
    warnings.push(`${tooLong} lines too long (max 120 chars)`);
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
    const ratingCheck = checkRatingCompliance(lines, inputs.rating);
    if (!ratingCheck.compliant) {
      warnings.push(...ratingCheck.issues);
    }
  }
  
  // Tag coverage (relaxed - only warn if major issues)
  if (inputs.hardTags.length > 0) {
    let hardTagCoverage = 0;
    for (const tag of inputs.hardTags) {
      const linesWithTag = lines.filter(line => 
        line.text.toLowerCase().includes(tag.toLowerCase())
      ).length;
      if (linesWithTag > 0) hardTagCoverage++;
    }
    
    if (hardTagCoverage < Math.max(1, Math.floor(inputs.hardTags.length * 0.5))) {
      warnings.push(`Hard tags: ${hardTagCoverage}/${inputs.hardTags.length} included`);
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
  
  const baseLines = fallbacksByTone[inputs.tone] || fallbacksByTone["Humorous"];
  
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
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const inputs = await req.json();
    console.log("Generate Step 2 function called");
    console.log("Request data:", inputs);

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