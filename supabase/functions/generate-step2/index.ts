import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const AVOID_WORDS = [
  // Generic phrases that kill comedy
  "timing is everything", "truth hurts", "laughter is the best medicine",
  "it is what it is", "at the end of the day", "everything happens for a reason",
  "when life gives you", "blessed", "grateful", "living my best life",
  "adulting", "squad goals", "relationship goals", "mood", "same energy",
  "no cap", "periodt", "slay", "stan", "tea", "lowkey", "highkey",
  "sending thoughts and prayers", "this too shall pass", "stay positive",
  
  // Overused meme formats - EXPANDED
  "nobody asked but", "tell me you're", "the audacity", "choose your fighter",
  "this you?", "I'm deceased", "not me", "the way I", "bestie",
  "plot twist", "mission failed successfully", "peak chaos", "vibes detected",
  "reality called", "based on a true story", "unfortunately", "energy detected",
  "achievement unlocked", "premium nonsense", "warranty voided", "tutorial level",
  
  // Cliché social media language  
  "living for", "obsessed with", "here for it", "not sorry", "unapologetic",
  "authentic self", "journey", "growth mindset", "manifesting"
];

function getTopicalAnchors(category: string, subcategory: string): string[] {
  const anchors: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      anchors.push("group chat", "budget", "age", "calendar", "surprise", "awkward", "planning", "photos", "memory", "reminder");
    } else if (subcategory === "Christmas Day") {
      anchors.push("travel delay", "family group chat", "budget panic", "awkward tradition", "thermostat war", "receipt", "shipping delay", "leftover", "matching pajama", "office party", "hr training", "dietary drama", "assembly", "missing screw", "instruction", "battery", "wifi", "credit card", "parking", "checkout line");
    } else if (subcategory === "New Year's Eve") {
      anchors.push("resolution", "gym membership", "diet", "app download", "uber surge", "parking", "group chat", "countdown app", "phone battery", "photo backup");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      anchors.push("budget", "planning", "guest list", "seating chart", "vendor", "timeline", "weather", "group chat", "photo", "coordination");
    } else if (subcategory === "Graduation") {
      anchors.push("job search", "student loan", "resume", "linkedin", "interview", "networking", "apartment hunt", "moving", "family photo");
    }
  } else if (category === "Sports") {
    if (subcategory === "Basketball") {
      anchors.push("pickup game", "rec league", "shooting percentage", "bench", "timeout", "draft", "trade deadline", "roster", "injury report", "practice");
    } else if (subcategory === "American Football") {
      anchors.push("fantasy league", "draft day", "waiver wire", "injury report", "playoff bracket", "superbowl party", "tailgate", "season ticket", "trade deadline");
    } else if (subcategory === "Baseball") {
      anchors.push("batting average", "spring training", "trade deadline", "farm system", "season ticket", "rain delay", "seventh inning", "playoff race");
    } else if (subcategory === "Soccer") {
      anchors.push("transfer window", "penalty kick", "injury time", "yellow card", "world cup", "championship", "league table", "group stage");
    }
  } else if (category === "Vibes & Punchlines") {
    if (subcategory === "Career Jokes") {
      anchors.push("open house", "showing", "staging", "listing photos", "lockbox", "escrow", "pre-approval", "lowball offer", "HOA", "appraisal", "commission", "closing", "expired listing", "client", "seller", "buyer", "listing", "offer", "inspection", "MLS");
    }
  }
  
  return anchors;
}

function getClicheBanList(category: string, subcategory: string): string[] {
  const bans: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      bans.push("cake", "candles", "balloons", "party hat", "gift", "present", "wish", "blow out");
    } else if (subcategory === "Christmas Day") {
      // RELAXED: Allow "tree", "ornaments" if used wittily. Hard ban only mega-clichés
      bans.push("santa", "ho ho ho", "sleigh", "reindeer", "chimney", "cookies", "milk", "stockings", "north pole", "elves", "workshop", "jingle bells", "deck the halls", "silent night");
    } else if (subcategory === "New Year's Eve") {
      bans.push("midnight", "countdown", "champagne", "resolution", "fireworks", "ball drop", "auld lang syne", "kiss at midnight");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      bans.push("altar", "vows", "rings", "bouquet", "dress", "tuxedo", "ceremony", "reception", "dancing", "cake cutting");
    } else if (subcategory === "Graduation") {
      bans.push("cap and gown", "diploma", "tassel", "ceremony", "valedictorian", "commencement");
    }
  } else if (category === "Sports") {
    if (subcategory === "Basketball") {
      bans.push("swish", "slam dunk", "three pointer", "buzzer beater", "full court press", "fast break", "alley oop");
    } else if (subcategory === "American Football") {
      bans.push("touchdown", "field goal", "quarterback", "end zone", "hail mary", "first down", "super bowl");
    } else if (subcategory === "Baseball") {
      bans.push("home run", "grand slam", "world series", "strike out", "double play", "bottom of the ninth");
    } else if (subcategory === "Soccer") {
      bans.push("goal", "penalty kick", "hat trick", "offside", "world cup", "free kick", "corner kick");
    }
  } else if (category === "Vibes & Punchlines") {
    if (subcategory === "Career Jokes") {
      bans.push("location, location, location", "dream home", "just listed", "best investment", "forever home", "starter home");
    }
  }
  
  return bans;
}

// Add vibe keywords that should appear in lines to ground them in the subcategory
function getVibeKeywords(category: string, subcategory: string): string[] {
  const vibes: string[] = [];
  
  if (category === "Celebrations") {
    if (subcategory === "Birthday") {
      vibes.push("birthday", "born", "age", "year older", "celebration");
    } else if (subcategory === "Christmas Day") {
      vibes.push("christmas", "holiday", "december", "festive", "family gathering", "winter break");
    } else if (subcategory === "New Year's Eve") {
      vibes.push("new year", "resolution", "january", "fresh start", "year end");
    }
  } else if (category === "Life Events") {
    if (subcategory === "Wedding") {
      vibes.push("wedding", "marriage", "married", "spouse", "honeymoon");
    } else if (subcategory === "Graduation") {
      vibes.push("graduation", "graduate", "degree", "school", "student");
    }
  } else if (category === "Sports") {
    if (subcategory === "Basketball") {
      vibes.push("basketball", "court", "season", "game", "team", "player", "coach", "league");
    } else if (subcategory === "American Football") {
      vibes.push("football", "field", "season", "game", "team", "player", "coach", "league");
    } else if (subcategory === "Baseball") {
      vibes.push("baseball", "diamond", "season", "game", "team", "player", "coach", "league");
    } else if (subcategory === "Soccer") {
      vibes.push("soccer", "football", "pitch", "season", "game", "team", "player", "coach", "league");
    }
  } else if (category === "Vibes & Punchlines") {
    if (subcategory === "Career Jokes") {
      vibes.push("career", "job", "work", "professional", "office", "client", "business");
    }
  }
  
  return vibes;
}

function getToneDefinition(tone: string): { definition: string; dos: string[]; donts: string[]; microExamples: string[] } {
  const definitions = {
    "Savage": {
      definition: "Brutally honest, cutting wit, zero mercy. Like roasting your best friend who can take it.",
      dos: [
        "Point out obvious flaws or failures",
        "Use cutting observations about reality",
        "Be blunt about uncomfortable truths",
        "Mock pretensions and delusions",
        "Call out hypocrisy directly"
      ],
      donts: [
        "Be genuinely mean or cruel",
        "Attack personal appearance maliciously", 
        "Add softening words like 'kinda' or 'maybe'",
        "Use hedging phrases that weaken the burn",
        "Be polite or diplomatic"
      ],
      microExamples: [
        "Another year closer to irrelevance",
        "Your planning skills peaked in kindergarten",
        "We're pretending this was intentional"
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
        "Make anyone feel bad",
        "Be too adult or sophisticated"
      ],
      microExamples: [
        "Look who's getting fancy with actual plans",
        "Someone's feeling ambitious today",
        "We're all just winging it and hoping for snacks"
      ]
    },
    "Sentimental": {
      definition: "Heartfelt and warm, expressing genuine emotion without being cheesy.",
      dos: [
        "Express genuine appreciation",
        "Reference shared memories",
        "Use warm, caring language",
        "Be authentic about feelings",
        "Focus on connection and gratitude"
      ],
      donts: [
        "Be overly dramatic or flowery",
        "Use greeting card language",
        "Be too formal or stilted",
        "Over-sentimentalize simple moments",
        "Use cliché emotional phrases"
      ],
      microExamples: [
        "Grateful for moments like these with you",
        "Another year of memories we'll laugh about later",
        "You make ordinary days feel special"
      ]
    },
    "Serious": {
      definition: "Thoughtful and straightforward, showing respect for the moment.",
      dos: [
        "Be direct and honest",
        "Show genuine respect",
        "Use measured, thoughtful language",
        "Focus on meaning and significance",
        "Be authentic without drama"
      ],
      donts: [
        "Be overly formal or stiff",
        "Use corporate speak",
        "Be preachy or lecture-like",
        "Over-philosophize simple things",
        "Sound robotic or template-like"
      ],
      microExamples: [
        "This matters more than you know",
        "Taking time to appreciate what we've built",
        "Some moments deserve proper recognition"
      ]
    },
    "Inspirational": {
      definition: "Uplifting and motivating without being preachy or cliché.",
      dos: [
        "Focus on growth and possibility",
        "Use empowering language",
        "Reference overcoming challenges",
        "Celebrate progress and potential",
        "Be genuinely encouraging"
      ],
      donts: [
        "Use generic motivational quotes",
        "Be preachy or lecture-like",
        "Sound like a corporate poster",
        "Use empty buzzwords",
        "Be unrealistic or naive"
      ],
      microExamples: [
        "Every challenge makes you stronger than before",
        "You're building something worth celebrating",
        "This is what progress actually looks like"
      ]
    }
  };
  
  return definitions[tone] || definitions["Humorous"];
}

function checkToneAlignment(lines: Array<{lane: string, text: string}>, tone: string): string | null {
  const toneInfo = getToneDefinition(tone);
  const issues: string[] = [];
  
  // Check for hedging words that weaken tone
  const hedgingWords = ["kinda", "maybe", "sort of", "kind of", "perhaps", "possibly", "somewhat"];
  const politeWords = ["please", "thank you", "excuse me", "pardon", "sorry"];
  
  if (tone === "Savage") {
    // Savage should be direct and cutting
    for (const line of lines) {
      const lowerText = line.text.toLowerCase();
      
      // Check for hedging that weakens savage tone
      for (const hedge of hedgingWords) {
        if (lowerText.includes(hedge)) {
          issues.push(`Savage tone weakened by hedging word "${hedge}" in: "${line.text}"`);
        }
      }
      
      // Check for politeness that contradicts savage tone
      for (const polite of politeWords) {
        if (lowerText.includes(polite)) {
          issues.push(`Savage tone contradicted by politeness "${polite}" in: "${line.text}"`);
        }
      }
      
      // Check for overly gentle phrasing
      if (lowerText.includes("i think") || lowerText.includes("i guess") || lowerText.includes("i suppose")) {
        issues.push(`Savage tone weakened by uncertain phrasing in: "${line.text}"`);
      }
    }
  } else if (tone === "Sentimental") {
    // Sentimental should be warm but not cheesy
    const cheesyPhrases = ["blessed", "grateful heart", "so blessed", "sending love", "love and light"];
    
    for (const line of lines) {
      const lowerText = line.text.toLowerCase();
      
      for (const cheesy of cheesyPhrases) {
        if (lowerText.includes(cheesy)) {
          issues.push(`Sentimental tone too cheesy with phrase "${cheesy}" in: "${line.text}"`);
        }
      }
    }
  }
  
  // General tone authenticity check
  let authenticLines = 0;
  for (const line of lines) {
    const lowerText = line.text.toLowerCase();
    
    // Check if line sounds human vs AI-generated
    const aiPatterns = [
      "achievement unlocked",
      "plot twist",
      "level up",
      "mission accomplished",
      "status update",
      "news flash"
    ];
    
    const hasAiPattern = aiPatterns.some(pattern => lowerText.includes(pattern));
    if (!hasAiPattern) {
      authenticLines++;
    }
  }
  
  if (authenticLines < 3) {
    issues.push(`Lines sound too AI-generated for ${tone} tone. Need more natural, human-like phrasing.`);
  }
  
  return issues.length > 0 ? issues.join("; ") : null;
}

// Tag parsing utility (duplicated from client for edge function)
function parseTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    
    // Check if starts and ends with quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      // Soft tag - remove quotes and store lowercased
      const unquoted = trimmed.slice(1, -1).trim();
      if (unquoted) {
        softTags.push(unquoted.toLowerCase());
      }
    } else {
      // Hard tag - keep original case for printing
      hardTags.push(trimmed);
    }
  }
  
  return { hardTags, softTags };
}

function getSystemPrompt(category: string, subcategory: string, tone: string, tags: string[], style: string, rating: string): string {
  const banList = getClicheBanList(category, subcategory);
  const anchors = getTopicalAnchors(category, subcategory);
  const vibes = getVibeKeywords(category, subcategory);
  const toneInfo = getToneDefinition(tone);
  
  const banPhrase = banList.length > 0 ? `\n\nSTRICTLY AVOID these overused props: ${banList.join(", ")}. Find unexpected angles instead.` : "";
  const anchorPhrase = anchors.length > 0 ? `\n\nTOPICALITY REQUIREMENT: At least 2 of 4 lines must include one of these fresh angles: ${anchors.join(", ")}. Ground lines in the actual situation.` : "";
  const vibePhrase = vibes.length > 0 ? `\n\nVIBE GROUNDING: At least 2 of 4 lines should reference "${subcategory}" context naturally.` : "";
  
  const { hardTags, softTags } = parseTags(tags);
  
  const toneGuidance = `\n\n${tone.toUpperCase()} TONE DEFINITION:
${toneInfo.definition}

DO:
${toneInfo.dos.map(item => `- ${item}`).join('\n')}

DON'T:
${toneInfo.donts.map(item => `- ${item}`).join('\n')}

MICRO-EXAMPLES (${tone} style):
${toneInfo.microExamples.map(ex => `- "${ex}"`).join('\n')}`;

  const styleGuidance = `\n\nSTYLE: ${style.toUpperCase()}
${getStyleDefinition(style)}`;

  const ratingGuidance = `\n\nRATING: ${rating}
${getRatingDefinition(rating)}`;
  
  const tagGuidance = (hardTags.length > 0 || softTags.length > 0) ? `\n\nTAG HANDLING:
${hardTags.length > 0 ? `- Hard tags [${hardTags.join(", ")}] must appear literally in exactly 3 of 4 lines` : ''}
${softTags.length > 0 ? `- Soft tags [${softTags.join(", ")}] must NOT appear literally but should influence tone, pronouns, and framing` : ''}
- Natural integration: vary tag positions (beginning, middle, end)
- Make tags feel conversational, not forced` : "";

// Style and rating definitions (duplicated for edge function)
function getStyleDefinition(style: string): string {
  const definitions = {
    'standard': 'Balanced observational one-liners with varied structure and natural flow',
    'story': 'Slight setup with quick narrative payoff - brief mini-stories that land the joke',
    'punchline-first': 'Hit the joke early, then brief tag-back or twist for extra impact',
    'pop-culture': 'Include relevant celebrities, movies, trends, or memes (avoid dated references)',
    'wildcard': 'Randomized structure and experimental humor - be creative and unexpected'
  };
  
  return definitions[style] || definitions['standard'];
}

function getRatingDefinition(rating: string): string {
  const definitions = {
    'G': 'Family-friendly humor only. No swearing, innuendo, or targeting individuals.',
    'PG': 'Light sarcasm and playful roasting allowed. Keep it gentle and fun.',
    'PG-13': 'Sharper roasts, mild innuendo, and cultural references. Never hateful or explicit.',
    'R': 'Boundary-pushing roasts and edgy humor, but maintain safety filters (no hate/harassment/explicit content)'
  };
  
  return definitions[rating] || definitions['PG-13'];
}
  
  return `You are a professional text generator for memes and overlays. Create exactly 4 unique one-liners with different comedic voices and perfect length distribution.

Output ONLY valid JSON in this exact format:
{
  "lines": [
    {"lane":"option1","text":"..."},
    {"lane":"option2","text":"..."},
    {"lane":"option3","text":"..."},
    {"lane":"option4","text":"..."}
  ]
}

CRITICAL REQUIREMENTS:
1. LENGTH BUCKETS (MANDATORY): Exactly one line per bucket:
   - ONE line: 40-50 characters
   - ONE line: 50-60 characters 
   - ONE line: 60-70 characters
   - ONE line: 70-80 characters

2. HUMOR PRIORITY: 90%+ of outputs must be funny (unless tone=Serious allows non-humor)

3. COMEDIC VOICE VARIETY: Each line must use different comedy styles:
   - Energetic, deadpan, absurd, blunt, narrative, observational, etc.
   - NO comedian names in output - voices are hidden influence only

4. NATURAL FLOW:
   - Write like texting a friend, use contractions
   - Vary sentence structures
   - Clear punctuation allowed (.,;:!?)${toneGuidance}${styleGuidance}${ratingGuidance}

CATEGORY: ${category} > ${subcategory}${banPhrase}${anchorPhrase}${vibePhrase}${tagGuidance}

AVOID: Clichés, robotic patterns, "Achievement unlocked", "Plot twist", template language`;
}

function buildUserMessage(inputs: any): string {
  const { category, subcategory, tone, tags = [], mode = "regenerate" } = inputs;
  
  // Enhanced randomization for novelty
  const randomToken = `RND-${Math.floor(Math.random() * 10000)}`;
  const deviceRoulette = Math.floor(Math.random() * 8) + 1; // 1-8 for variety
  
  // Handle comedian-mix mode with different length targets
  if (mode === "comedian-mix") {
    // Enforce 40-80 character targets for comedian mode
    const lengthTargets = [
      40 + Math.floor(Math.random() * 11), // 40-50 chars
      45 + Math.floor(Math.random() * 16), // 45-60 chars  
      55 + Math.floor(Math.random() * 16), // 55-70 chars
      65 + Math.floor(Math.random() * 16)  // 65-80 chars
    ];
    
    // Generate comedian personas for this request
    const comedianPersonas = ["observational", "deadpan", "absurdist", "roast-but-safe", "self-deprecating", "one-liner", "sarcastic-witty", "wordplay"];
    const shuffledPersonas = comedianPersonas.sort(() => Math.random() - 0.5).slice(0, 4);
    
    let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: Humorous (COMEDIAN-MIX MODE)
Novelty Token: ${randomToken}
Device Setting: ${deviceRoulette}
LENGTH TARGETS (enforce variety): [${lengthTargets.join(', ')}]
TAGS: ${tags.join(', ') || 'none'}
COMEDIAN PERSONAS: [${shuffledPersonas.join(', ')}]

COMEDIAN-MIX MODE RULES:
- ALL lines must be 40-80 characters (strictly enforced)
- Each line uses a DIFFERENT comedian persona from the list above
- HILARIOUS content only - everything must be genuinely funny
- Natural tag integration - make tags feel conversational
- PG-13 safe roasting only - no slurs, hate, sexual content, or targeted harassment
- Avoid clichés and overused comedy formats
- Sound like real comedians texting, not AI generating content

TAG INTEGRATION: Make tags feel natural - use them like you would in actual conversation. Avoid robotic formats like "Tag: text" or "Tag, text description."

WRITE CONVERSATIONALLY: Sound like a real person texting, not an AI generating content. Use contractions, natural flow, and varied sentence lengths.

Respond with JSON only.`;
    
    return message;
  }
  
  // Regular mode handling
  // Enforce real length variety with guaranteed short and long
  const shortTarget = Math.floor(Math.random() * 21) + 15; // 15-35 (guaranteed short)
  const longTarget = Math.floor(Math.random() * 21) + 70;  // 70-90 (guaranteed long)
  const midTarget1 = Math.floor(Math.random() * 35) + 35;  // 35-69 (middle range)
  const midTarget2 = Math.floor(Math.random() * 35) + 35;  // 35-69 (middle range)
  
  const lengthTargets = [shortTarget, midTarget1, midTarget2, longTarget].sort((a, b) => a - b);
  
  let message = `Category: ${category}
Subcategory: ${subcategory}
Tone: ${tone}
Novelty Token: ${randomToken}
Device Setting: ${deviceRoulette}
LENGTH TARGETS (enforce variety): [${lengthTargets.join(', ')}]`;

  // Include tags with natural integration guidance
  if (tags.length > 0) {
    message += `\nTAGS: ${tags.join(", ")}`;
    message += `\n\nTAG INTEGRATION: Make tags feel natural - use them like you would in actual conversation. Avoid robotic formats like "Tag: text" or "Tag, text description."`;
  }
  
  // Add mode-specific instructions
  if (mode && mode !== "regenerate") {
    switch (mode) {
      case "story-mode":
        message += `\n\nMODE INSTRUCTION: Generate as short 2-3 sentence mini-stories with narrative flow. Keep under 90 chars total.`;
        break;
      case "punchline-first":
        message += `\n\nMODE INSTRUCTION: Structure as joke payoff first, then tie-back. Snappy, meme-ready format.`;
        break;
      case "pop-culture":
        message += `\n\nMODE INSTRUCTION: Include trending memes, shows, sports, or current slang references naturally.`;
        break;
      case "roast-level":
        message += `\n\nMODE INSTRUCTION: Increase savage/teasing tone while staying playful and fun. More edge but still friendly.`;
        break;
      case "wildcard":
        message += `\n\nMODE INSTRUCTION: Generate surreal, absurd, or experimental humor. Be creative and unexpected while staying coherent.`;
        break;
    }
  }
  
  // Add conversation-style reminder
  message += `\n\nWRITE CONVERSATIONALLY: Sound like a real person texting, not an AI generating content. Use contractions, natural flow, and varied sentence lengths.`;
  message += `\n\nRespond with JSON only.`;
  
  return message;
}

function checkComedyVariety(lines: Array<{lane: string, text: string}>): string | null {
  // Check for at least 2 different comedy patterns
  const patterns = {
    hasQuestion: lines.some(line => line.text.includes('?')),
    hasExclamation: lines.some(line => line.text.includes('!')),
    hasComparison: lines.some(line => /\b(like|than|vs|versus)\b/i.test(line.text)),
    hasContrast: lines.some(line => /\b(but|however|except|until|unless)\b/i.test(line.text)),
    hasReference: lines.some(line => /\b(when|if|that moment|every time)\b/i.test(line.text)),
    hasNarrative: lines.some(line => /\b(today|yesterday|tomorrow|now|then|first|next|finally)\b/i.test(line.text))
  };
  
  const patternCount = Object.values(patterns).filter(Boolean).length;
  if (patternCount < 2) {
    return "Missing comedy variety - need at least 2 different humor patterns (questions, exclamations, comparisons, contrasts, references, narrative)";
  }
  
  return null;
}

function checkTopicalAnchors(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): string | null {
  const anchors = getTopicalAnchors(category, subcategory);
  if (anchors.length === 0) return null;
  
  const anchoredLines = lines.filter(line => {
    const lowerText = line.text.toLowerCase();
    return anchors.some(anchor => lowerText.includes(anchor.toLowerCase()));
  });
  
  // Relaxed requirement: need at least 2 lines (was 3)
  if (anchoredLines.length < 2) {
    return `Topical grounding insufficient: ${anchoredLines.length}/4 lines include topical anchors. Need at least 2 from: ${anchors.join(", ")}`;
  }
  
  return null;
}

function checkVibeGrounding(lines: Array<{lane: string, text: string}>, category: string, subcategory: string): string | null {
  const vibes = getVibeKeywords(category, subcategory);
  if (vibes.length === 0) return null;
  
  const vibeGroundedLines = lines.filter(line => {
    const lowerText = line.text.toLowerCase();
    return vibes.some(vibe => lowerText.includes(vibe.toLowerCase()));
  });
  
  if (vibeGroundedLines.length < 2) {
    return `Vibe grounding insufficient: ${vibeGroundedLines.length}/4 lines reference ${subcategory}. Need at least 2 using: ${vibes.join(", ")}`;
  }
  
  return null;
}

function validateAndRepair(lines: Array<{lane: string, text: string}>, category: string, subcategory: string, tone: string, tags: string[]): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[];
  repairedLines?: Array<{lane: string, text: string}>;
  lengths?: number[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let repairedLines = [...lines];
  
  // Character limits and punctuation (critical)
  for (const line of lines) {
    // Length check
    if (line.text.length > 100) {
      errors.push(`Line too long: "${line.text}" (${line.text.length} chars, max 100)`);
    }
    if (line.text.length < 15) {
      errors.push(`Line too short: "${line.text}" (${line.text.length} chars, min 15)`);
    }
    
    // Punctuation check (max one of .,;:!?)
    const punctuationMarks = line.text.match(/[.,;:!?]/g) || [];
    if (punctuationMarks.length > 1) {
      errors.push(`Too much punctuation: "${line.text}" has ${punctuationMarks.length} marks, max 1`);
    }
  }
  
  // Length variety check (enforce real variety)
  const lengths = lines.map(line => line.text.length);
  const hasShort = lengths.some(len => len <= 35); // Stricter short requirement
  const hasLong = lengths.some(len => len >= 70);  // Stricter long requirement
  
  if (!hasShort || !hasLong) {
    errors.push("Missing required length variety - MUST have at least one line ≤35 and one ≥70 characters");
  }
  
  // Banned words check (critical)
  const banList = getClicheBanList(category, subcategory);
  const bannedFound: string[] = [];
  
  for (const line of lines) {
    const lowerText = line.text.toLowerCase();
    for (const ban of banList) {
      if (lowerText.includes(ban.toLowerCase())) {
        bannedFound.push(`"${ban}" in "${line.text}"`);
      }
    }
    
    // Check avoid words
    for (const avoid of AVOID_WORDS) {
      if (lowerText.includes(avoid.toLowerCase())) {
        bannedFound.push(`Cliché "${avoid}" in "${line.text}"`);
      }
    }
  }
  
  if (bannedFound.length > 0) {
    errors.push(`Banned phrases found: ${bannedFound.join("; ")}`);
  }
  
  // Tag coverage (critical if tags provided) - but allow more flexibility
  if (tags.length > 0) {
    const taggedLines = lines.filter(line => {
      const lowerText = line.text.toLowerCase();
      return tags.every(tag => lowerText.includes(tag.toLowerCase()));
    });
    
    if (taggedLines.length < 2) { // Relaxed from 3 to 2 for more natural results
      errors.push(`Tag coverage insufficient: ${taggedLines.length}/4 lines include all tags [${tags.join(", ")}]. Need at least 2.`);
    }
  }
  
  // Topical anchors check (critical)
  const anchorError = checkTopicalAnchors(lines, category, subcategory);
  if (anchorError) {
    errors.push(anchorError);
  }
  
  // Vibe grounding check (warning)
  const vibeError = checkVibeGrounding(lines, category, subcategory);
  if (vibeError) {
    warnings.push(vibeError);
  }
  
  // Comedy variety (warning)
  const varietyError = checkComedyVariety(lines);
  if (varietyError) {
    warnings.push(varietyError);
  }
  
  // Tone alignment check (critical)
  const toneError = checkToneAlignment(lines, tone);
  if (toneError) {
    errors.push(`Tone alignment issues: ${toneError}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    repairedLines: repairedLines,
    lengths
  };
}

// Normalize text to remove em dashes and other unwanted characters
function normalizeText(lines: Array<{lane: string, text: string}>): Array<{lane: string, text: string}> {
  return lines.map(line => {
    let text = line.text
      .replace(/[""'']/g, '')  // Remove curly quotes
      .replace(/—/g, ' ')      // Remove em dash
      .replace(/–/g, ' ')      // Remove en dash
      .replace(/\.\.\./g, ' ') // Remove ellipses
      .replace(/\s+/g, ' ')    // Clean up multiple spaces
      .trim();
    
    // Enforce max one punctuation mark from [.,;:!?]
    const punctuationMarks = text.match(/[.,;:!?]/g) || [];
    if (punctuationMarks.length > 1) {
      // Keep only the first occurrence
      let foundFirst = false;
      text = text.replace(/[.,;:!?]/g, (match) => {
        if (!foundFirst) {
          foundFirst = true;
          return match;
        }
        return '';
      });
    }
    
    // Ensure length constraint with simple trimming if needed
    if (text.length > 100) {
      const lastSpace = text.lastIndexOf(' ', 100);
      text = lastSpace > 80 ? text.substring(0, lastSpace) : text.substring(0, 100);
    }
    
    return { ...line, text };
  });
}

function ensureTagCoverage(lines: Array<{lane: string, text: string}>, tags: string[]): Array<{lane: string, text: string}> {
  if (tags.length === 0) return lines;
  
  const result = [...lines];
  let taggedCount = 0;
  
  // Count lines that already include all tags
  for (let i = 0; i < result.length; i++) {
    const lowerText = result[i].text.toLowerCase();
    const hasAllTags = tags.every(tag => lowerText.includes(tag.toLowerCase()));
    if (hasAllTags) taggedCount++;
  }
  
  console.log(`Tag coverage before adjustment: ${taggedCount}/4 lines include all tags [${tags.join(", ")}]`);
  
  // If we need more tagged lines, modify lines naturally
  if (taggedCount < 3) {
    let modifications = 0;
    
    for (let i = 0; i < result.length && taggedCount + modifications < 3; i++) {
      const lowerText = result[i].text.toLowerCase();
      const hasAllTags = tags.every(tag => lowerText.includes(tag.toLowerCase()));
      
      if (!hasAllTags) {
        const originalText = result[i].text;
        let newText = "";
        
        // Natural integration strategies - make it conversational
        const insertionStyles = [
          // Beginning conversational
          () => {
            if (tags.length === 1) {
              return `${tags[0]}, ${originalText.toLowerCase()}`;
            } else if (tags.length === 2) {
              return `${tags[0]} and ${tags[1]} ${originalText.toLowerCase()}`;
            }
            return `${tags.join(" and ")} ${originalText.toLowerCase()}`;
          },
          
          // Middle natural insertion
          () => {
            const words = originalText.split(' ');
            const midPoint = Math.floor(words.length / 2);
            if (tags.length === 1) {
              words.splice(midPoint, 0, tags[0]);
            } else if (tags.length === 2) {
              words.splice(midPoint, 0, `${tags[0]} and ${tags[1]}`);
            } else {
              words.splice(midPoint, 0, tags.join(" "));
            }
            return words.join(' ');
          },
          
          // End conversational
          () => {
            if (tags.length === 1) {
              return `${originalText.replace(/[.!]$/, '')} with ${tags[0]}`;
            } else if (tags.length === 2) {
              return `${originalText.replace(/[.!]$/, '')}, ${tags[0]} and ${tags[1]}`;
            }
            return `${originalText.replace(/[.!]$/, '')} (${tags.join(" ")})`;
          },
          
          // Possessive/relationship style
          () => {
            if (tags.length === 2) {
              return originalText.replace(/\b(the|our|my)\b/i, `${tags[0]} and ${tags[1]}'s`);
            } else if (tags.length === 1) {
              return originalText.replace(/\b(the|our|my)\b/i, `${tags[0]}'s`);
            }
            return originalText;
          }
        ];
        
        // Try insertion styles in random order
        const shuffledStyles = insertionStyles.sort(() => Math.random() - 0.5);
        
        for (const style of shuffledStyles) {
          try {
            newText = style();
            
            // Check length and quality
            if (newText.length <= 100 && newText.length >= 15 && 
                !newText.includes(": ") && // Avoid robotic colons
                !newText.startsWith("Achievement") &&
                !newText.startsWith("Plot twist")) {
              
              // Capitalize properly
              newText = newText.charAt(0).toUpperCase() + newText.slice(1);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // Fallback: simple natural addition
        if (!newText || newText.length > 100) {
          if (tags.length === 1) {
            newText = `${originalText.replace(/[.!]$/, '')}, thanks to ${tags[0]}`;
          } else {
            newText = `${originalText.replace(/[.!]$/, '')} ft. ${tags.join(" & ")}`;
          }
        }
        
        // Final safety check
        if (newText.length <= 100 && newText.length >= 15) {
          result[i].text = newText;
          modifications++;
          console.log(`Modified line ${i + 1}: "${originalText}" → "${newText}"`);
        }
      }
    }
    
    console.log(`Tag coverage after adjustment: ${taggedCount + modifications}/4 lines include all tags`);
  }
  
  return result;
}

function getToneAwareFallback(category: string, subcategory: string, tone: string, tags: string[]): Array<{lane: string, text: string}> {
  const tagIntegration = tags.length > 0 ? tags[0] : "";
  
  const fallbacks = {
    "Celebrations": {
      "Birthday": {
        "Savage": [
          `${tagIntegration ? tagIntegration + ', ' : ''}another year closer to irrelevance`,
          `Your planning skills${tagIntegration ? ' ' + tagIntegration : ''} peaked in kindergarten`, 
          `We're all pretending${tagIntegration ? ' ' + tagIntegration + ' has' : ' this has'} a plan`,
          `${tagIntegration ? tagIntegration + ' celebrating' : 'Celebrating'} aging out of relevance`
        ],
        "Humorous": [
          `${tagIntegration ? tagIntegration + ' and' : 'Another'} the annual aging process`,
          `Adulting is just Googling${tagIntegration ? ' with ' + tagIntegration : ''} how to do things`,
          `${tagIntegration ? tagIntegration + ' living on' : 'Life runs on'} caffeine and good intentions`,
          `Reality called${tagIntegration ? ' ' + tagIntegration : ''} but we sent it to voicemail`
        ],
        "Playful": [
          `Look who's${tagIntegration ? ' ' + tagIntegration + ' is' : ''} getting fancy with actual plans`,
          `Someone${tagIntegration ? ' ' + tagIntegration : ''} is feeling ambitious today`,
          `We're all${tagIntegration ? ' including ' + tagIntegration : ''} just winging it and hoping for snacks`,
          `${tagIntegration ? tagIntegration + ' making' : 'Making'} this look way too easy`
        ],
        "Sentimental": [
          `Grateful for${tagIntegration ? ' ' + tagIntegration + ' and' : ''} moments like these`,
          `Another year${tagIntegration ? ' with ' + tagIntegration : ''} of memories we'll treasure`,
          `You${tagIntegration ? ' and ' + tagIntegration : ''} make ordinary days feel special`,
          `Celebrating${tagIntegration ? ' ' + tagIntegration + ' and' : ''} the gift of connection`
        ],
        "Serious": [
          `This${tagIntegration ? ' moment with ' + tagIntegration : ''} matters more than you know`,
          `Taking time${tagIntegration ? ' with ' + tagIntegration : ''} to appreciate what we've built`,
          `Some moments${tagIntegration ? ' with ' + tagIntegration : ''} deserve proper recognition`,
          `The value${tagIntegration ? ' of ' + tagIntegration : ''} of genuine celebration`
        ],
        "Inspirational": [
          `Every challenge${tagIntegration ? ' ' + tagIntegration + ' faces' : ''} makes you stronger`,
          `You're${tagIntegration ? ' ' + tagIntegration + ' is' : ''} building something worth celebrating`,
          `This is${tagIntegration ? ' ' + tagIntegration + ' showing' : ''} what progress looks like`,
          `Your journey${tagIntegration ? ' with ' + tagIntegration : ''} inspires everyone around you`
        ]
      }
    },
    "Vibes & Punchlines": {
      "Career Jokes": {
        "Savage": [
          `${tagIntegration ? tagIntegration + ' helping' : 'Helping'} clients make terrible financial decisions`,
          `Your commission${tagIntegration ? ' from ' + tagIntegration : ''} won't cover therapy for this stress`,
          `${tagIntegration ? tagIntegration + ' pretending' : 'Pretending'} this house is worth the asking price`,
          `Another${tagIntegration ? ' ' + tagIntegration : ''} open house where nobody shows up`
        ],
        "Humorous": [
          `${tagIntegration ? tagIntegration + ' living on' : 'Living on'} coffee and showing optimism`,
          `Real estate wisdom${tagIntegration ? ' from ' + tagIntegration : ''}: just smile and point at features`,
          `${tagIntegration ? tagIntegration + ' pretending' : 'Pretending'} to know what "good bones" means`,
          `Market strategy${tagIntegration ? ' for ' + tagIntegration : ''}: hope and prayer with staging`
        ],
        "Playful": [
          `${tagIntegration ? tagIntegration + ' channeling' : 'Channeling'} that HGTV energy for every showing`,
          `Someone${tagIntegration ? ' ' + tagIntegration : ''} thinks this kitchen needs "just a little work"`,
          `Real estate IQ${tagIntegration ? ' of ' + tagIntegration : ''}: still calculating square footage`,
          `${tagIntegration ? tagIntegration + ' making' : 'Making'} every house sound like a steal`
        ],
        "Sentimental": [
          `Grateful for${tagIntegration ? ' ' + tagIntegration + ' and' : ''} helping families find home`,
          `Another family${tagIntegration ? ' with ' + tagIntegration : ''} gets their keys to happiness`,
          `You${tagIntegration ? ' and ' + tagIntegration : ''} make dreams of homeownership real`,
          `Celebrating${tagIntegration ? ' ' + tagIntegration + ' and' : ''} the joy of closing day`
        ],
        "Serious": [
          `This transaction${tagIntegration ? ' with ' + tagIntegration : ''} represents months of preparation`,
          `Taking time${tagIntegration ? ' with ' + tagIntegration : ''} to ensure every detail is covered`,
          `Professional service${tagIntegration ? ' from ' + tagIntegration : ''} makes all the difference`,
          `The responsibility${tagIntegration ? ' of ' + tagIntegration : ''} guiding major life decisions`
        ],
        "Inspirational": [
          `Every challenge${tagIntegration ? ' ' + tagIntegration + ' faces' : ''} builds stronger expertise`,
          `You're${tagIntegration ? ' ' + tagIntegration + ' is' : ''} building lasting relationships through service`,
          `This market${tagIntegration ? ' with ' + tagIntegration : ''} shows what persistence creates`,
          `Your dedication${tagIntegration ? ' ' + tagIntegration : ''} turns house hunting into homecoming`
        ]
      }
    },
    "Sports": {
      "Basketball": {
        "Savage": [
          `${tagIntegration ? tagIntegration + ' shooting' : 'Shooting'} bricks like it's a construction project`,
          `Your basketball skills${tagIntegration ? ' ' + tagIntegration : ''} peaked in middle school`,
          `${tagIntegration ? tagIntegration + ' benched' : 'Benched'} yourself before the coach could`,
          `This defense${tagIntegration ? ' from ' + tagIntegration : ''} wouldn't stop a wheelchair team`
        ],
        "Humorous": [
          `${tagIntegration ? tagIntegration + ' pretending' : 'Pretending'} that was totally intentional`,
          `Basketball strategy${tagIntegration ? ' with ' + tagIntegration : ''}: hope for the best`,
          `${tagIntegration ? tagIntegration + ' living' : 'Living'} that pickup game main character energy`,
          `Court vision${tagIntegration ? ' for ' + tagIntegration : ''}: exclusively tunnel vision`
        ],
        "Playful": [
          `${tagIntegration ? tagIntegration + ' channeling' : 'Channeling'} those legendary bench warming skills`,
          `Someone${tagIntegration ? ' ' + tagIntegration : ''} watched one NBA game and thinks they're ready`,
          `Basketball IQ${tagIntegration ? ' of ' + tagIntegration : ''}: still loading`,
          `${tagIntegration ? tagIntegration + ' making' : 'Making'} recreational league look competitive`
        ]
      },
      "American Football": {
        "Savage": [
          `${tagIntegration ? tagIntegration + ' throwing' : 'Throwing'} interceptions like it's the plan`,
          `Your fantasy team${tagIntegration ? ' ' + tagIntegration : ''} is more fantasy than reality`,
          `${tagIntegration ? tagIntegration + ' fumbled' : 'Fumbled'} before the play even started`,
          `This game plan${tagIntegration ? ' from ' + tagIntegration : ''} was written in crayon`
        ],
        "Humorous": [
          `${tagIntegration ? tagIntegration + ' treating' : 'Treating'} the playbook like a suggestion`,
          `Football wisdom${tagIntegration ? ' with ' + tagIntegration : ''}: just run faster`,
          `${tagIntegration ? tagIntegration + ' perfecting' : 'Perfecting'} the art of creative penalties`,
          `Game strategy${tagIntegration ? ' for ' + tagIntegration : ''}: chaos with a side of hope`
        ],
        "Playful": [
          `${tagIntegration ? tagIntegration + ' bringing' : 'Bringing'} that backyard football energy`,
          `Someone${tagIntegration ? ' ' + tagIntegration : ''} thinks they're the next franchise player`,
          `Football IQ${tagIntegration ? ' of ' + tagIntegration : ''}: still buffering`,
          `${tagIntegration ? tagIntegration + ' making' : 'Making'} tackle football look like a contact sport`
        ]
      }
    }
  };
  
  const categoryFallbacks = fallbacks[category];
  if (!categoryFallbacks) {
    return getEmergencyFallback(tone, tagIntegration);
  }
  
  const subcategoryFallbacks = categoryFallbacks[subcategory];
  if (!subcategoryFallbacks) {
    return getEmergencyFallback(tone, tagIntegration);
  }
  
  const toneFallbacks = subcategoryFallbacks[tone];
  if (!toneFallbacks) {
    return getEmergencyFallback(tone, tagIntegration);
  }
  
  return toneFallbacks.map((text, index) => ({
    lane: `option${index + 1}`,
    text
  }));
}

function getEmergencyFallback(tone: string, tagIntegration: string): Array<{lane: string, text: string}> {
  const toneDefaults = {
    "Savage": [
      `Well this${tagIntegration ? ' ' + tagIntegration + ' situation' : ''} is awkward`,
      `Expected more${tagIntegration ? ' from ' + tagIntegration : ''}, got this instead`,
      `Someone${tagIntegration ? ' ' + tagIntegration : ''} is really phoning it in`,
      `The bar was low${tagIntegration ? ' for ' + tagIntegration : ''} and we still missed it`
    ],
    "Humorous": [
      `Reality called${tagIntegration ? ' ' + tagIntegration : ''} but we sent it to voicemail`,
      `This is fine${tagIntegration ? ' with ' + tagIntegration : ''} - everything is fine`,
      `Working as intended${tagIntegration ? ' by ' + tagIntegration : ''} (definitely not)`,
      `Adulting${tagIntegration ? ' with ' + tagIntegration : ''} is just making it up as we go`
    ],
    "Playful": [
      `Oops${tagIntegration ? ' ' + tagIntegration : ''} - did we do that right?`,
      `Adventure mode${tagIntegration ? ' with ' + tagIntegration : ''}: activated`,
      `Well that was interesting${tagIntegration ? ' ' + tagIntegration : ''}`,
      `Someone${tagIntegration ? ' ' + tagIntegration : ''} is feeling ambitious today`
    ],
    "Sentimental": [
      `Grateful for${tagIntegration ? ' ' + tagIntegration + ' and' : ''} whatever comes our way`,
      `Every moment${tagIntegration ? ' with ' + tagIntegration : ''} has its own beauty`,
      `Finding joy${tagIntegration ? ' in ' + tagIntegration : ''} in the unexpected`,
      `These moments${tagIntegration ? ' with ' + tagIntegration : ''} matter more than we know`
    ],
    "Serious": [
      `Taking a moment${tagIntegration ? ' with ' + tagIntegration : ''} to regroup`,
      `Sometimes${tagIntegration ? ' ' + tagIntegration + ' shows us' : ''} the path isn't clear`,
      `Working through this${tagIntegration ? ' with ' + tagIntegration : ''} step by step`,
      `Focus${tagIntegration ? ' on ' + tagIntegration + ' and' : ''} on what matters most`
    ],
    "Inspirational": [
      `Every challenge${tagIntegration ? ' ' + tagIntegration + ' faces' : ''} makes you stronger`,
      `This is just${tagIntegration ? ' ' + tagIntegration + ' showing' : ''} part of the journey`,
      `Growing stronger${tagIntegration ? ' with ' + tagIntegration : ''} through every challenge`,
      `The best${tagIntegration ? ' of ' + tagIntegration : ''} is yet to come`
    ]
  };

  const defaults = toneDefaults[tone] || toneDefaults["Humorous"];
  return defaults.map((text, index) => ({
    lane: `option${index + 1}`,
    text
  }));
}

async function attemptGeneration(inputs: any, attemptNumber: number, previousErrors: string[] = []): Promise<any> {
  try {
    let userMessage = buildUserMessage(inputs);
    
    // Add feedback for retry attempts
    if (attemptNumber > 1 && previousErrors.length > 0) {
      userMessage += `\n\nPREVIOUS ATTEMPT ISSUES: ${previousErrors.join("; ")}
      
Please fix these issues while maintaining the ${inputs.tone} tone and natural flow. Remember: Max 100 chars per line, max one punctuation mark total per line.`;
    }
    
    console.log(`LLM attempt ${attemptNumber}/2`);
    console.log("User message:", userMessage);
    
    // Model cascade
    const models = ['gpt-4.1-2025-04-14', 'gpt-5-mini-2025-08-07'];
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
    
    // Validate with our rules
    const validation = validateAndRepair(parsedLines, inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || [], inputs.mode);
    
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
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try up to 2 attempts
    const maxAttempts = 2;
    let rawCandidate: Array<{lane: string, text: string}> | null = null;
    let finalResult: Array<{lane: string, text: string}> | null = null;
    let allErrors: string[] = [];
    let modelUsed = "unknown";
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`LLM attempt ${attempt}/${maxAttempts}`);
      
      try {
        const result = await attemptGeneration(inputs, attempt, allErrors);
        modelUsed = result.model || modelUsed;
        
        if (result.success && result.lines) {
          finalResult = result.lines;
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
        model: modelUsed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If we have raw candidate from earlier attempts that parsed but failed validation, use those
    if (rawCandidate) {
      console.log(`Using preserved raw candidate from earlier attempt instead of fallback`);
      const tagEnforcedCandidate = ensureTagCoverage(rawCandidate, inputs.tags || []);
      const normalizedCandidate = normalizeText(tagEnforcedCandidate);
      return new Response(JSON.stringify({
        lines: normalizedCandidate,
        model: `${modelUsed} (unvalidated)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Final fallback
    console.log(`API completely failed, using tone-aware fallback:`, allErrors);
    const fallbackLines = getToneAwareFallback(inputs.category || '', inputs.subcategory || '', inputs.tone || 'Balanced', inputs.tags || []);
    const normalizedFallback = normalizeText(fallbackLines);
    
    return new Response(JSON.stringify({
      lines: normalizedFallback,
      model: "fallback"
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
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});