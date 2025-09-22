// V3 Comedy System Configuration - Modern, Natural, Fresh
export const VIIBE_CONFIG_V3 = {
  "system": {
    "version": "3.0.0",
    "optionsPerStep": {
      "text": 4,
      "visual": 4
    },
    "validation": {
      "enforceOptionCount": true,
      "hardTagsRequired": 3,
      "maxRetries": 2
    }
  },

  "lengthBuckets": {
    "ranges": [[40,60], [61,80], [81,100]],
    "randomizePerBatch": true,
    "enforceVariety": true
  },

  "structure": {
    "enforceOneSentence": true,
    "enforceOnePeriod": true,
    "banCommas": true,
    "banEmDash": true,
    "requiredMixPerBatch": ["roast", "absurd", "story_mini", "punchline_natural"]
  },

  "popCulture": {
    "enableCooldown": true,
    "maxEntitiesPerBatch": 1,
    "cooldownBatches": 3,
    "rollingBanLastN": 6,
    "entityBuckets": {
      "music": [
        "taylor_swift", "drake", "bad_bunny", "beyonce", "ice_spice", 
        "travis_scott", "doja_cat", "olivia_rodrigo", "lil_nas_x", "billie_eilish"
      ],
      "filmTv": [
        "marvel", "euphoria", "succession", "stranger_things", "barbie", 
        "oppenheimer", "house_dragon", "wednesday", "squid_game", "avatar"
      ],
      "internet": [
        "elon_musk", "mrbeast", "tiktok", "threads", "chatgpt", 
        "ai", "meta", "twitter", "instagram", "youtube"
      ],
      "sports": [
        "lebron", "messi", "serena_williams", "shaq", "simone_biles", 
        "curry", "mahomes", "ronaldo", "tiger_woods", "lewis_hamilton"
      ],
      "queerTrans": [
        "elliot_page", "laverne_cox", "hunter_schafer", "sam_smith", 
        "dylan_mulvaney", "janet_mock", "pose", "rupaul", "lil_nas_x", "pabllo_vittar"
      ]
    }
  },

  "comedianVoices": {
    "enabledForAllStyles": true,
    "alwaysRandomizePerLine": true,
    "enforceUniqueVoicesPerBatch": true,
    "ratingBanks": {
      "G": ["gaffigan", "bargatze", "ellen", "nate_bargatze"],
      "PG-13": ["kevin_hart", "trevor_noah_clean", "ali_wong", "taylor_tomlinson", "john_mulaney"],
      "R": ["bill_burr", "chris_rock", "wanda_sykes", "dave_chappelle", "sarah_silverman"],
      "Explicit": ["sarah_silverman", "joan_rivers", "amy_schumer", "anthony_jeselnik", "patrice_oneal"]
    },
    "voiceProfiles": {
      "gaffigan": { "style": "clean_observational", "signature": "self-deprecating food/family humor with internal voice asides" },
      "bargatze": { "style": "clean_deadpan", "signature": "innocent confused storytelling with folksy delivery" },
      "ellen": { "style": "warm_observational", "signature": "friendly relatable observations with dancing energy" },
      "kevin_hart": { "style": "high_energy_panic", "signature": "animated physical reactions with 'Man, listen!' openings" },
      "trevor_noah_clean": { "style": "global_cultural", "signature": "accent humor with thoughtful social commentary" },
      "ali_wong": { "style": "absurd_honest", "signature": "brutal family observations with vivid imagery" },
      "taylor_tomlinson": { "style": "millennial_anxiety", "signature": "dating disasters with quarter-life crisis timing" },
      "john_mulaney": { "style": "nostalgic_storytelling", "signature": "precise narrative structure with childlike wonder" },
      "bill_burr": { "style": "rant_roast", "signature": "working-class rage with confrontational truth-telling" },
      "chris_rock": { "style": "sharp_social", "signature": "relationship observations with loud social commentary" },
      "wanda_sykes": { "style": "dry_sassy", "signature": "maternal wisdom with everyday observations" },
      "dave_chappelle": { "style": "storytelling_cultural", "signature": "character voices with vivid scene-setting" },
      "sarah_silverman": { "style": "dark_innocent", "signature": "shocking content with sweet childlike delivery" },
      "joan_rivers": { "style": "glamorous_savage", "signature": "cutting Hollywood roasts with no sacred cows" },
      "amy_schumer": { "style": "unapologetic_dirty", "signature": "relationship disasters with body-positive raunch" },
      "anthony_jeselnik": { "style": "dark_deadpan", "signature": "shocking one-liners with clinical precision" },
      "patrice_oneal": { "style": "brutally_honest", "signature": "confrontational relationship truths with raw perspective" }
    }
  },

  "styleMapping": {
    "punchline-first": {
      "cues": [], // NO MORE FORCED CUES
      "shape": "natural_punch_first",
      "allowFreeOpen": true,
      "description": "Let comedian voice drive the punchline-first delivery naturally"
    },
    "story": {
      "cues": [],
      "shape": "short_scene_flip",
      "description": "Brief scenario with unexpected twist"
    },
    "pop-culture": {
      "cues": [],
      "shape": "reference_flip",
      "requirePopEntity": true,
      "description": "Fresh pop culture reference with comedic twist"
    },
    "wildcard": {
      "cues": [],
      "shape": "random_of_all",
      "description": "Mix of all styles based on comedian voice"
    }
  },

  "contextLexicons": {
    "Birthday": ["cake", "candles", "party", "balloons", "wish", "slice", "confetti", "frosting"],
    "Basketball": ["hoop", "rim", "court", "dribble", "rebound", "buzzer", "foul", "layup", "timeout"],
    "Work emails": ["inbox", "subject", "cc", "reply all", "signature", "thread", "spam"],
    "Christmas": ["tree", "lights", "stocking", "wrapping", "eggnog", "ornaments", "carols"],
    "Thanksgiving": ["turkey", "gravy", "pie", "table", "toast", "leftovers", "cranberry", "stuffing"]
  },

  "ratingGuidelines": {
    "G": { 
      "ban": ["profanity", "sexual", "crude"], 
      "allow": ["silly", "family_safe"],
      "require": "clean wholesome humor"
    },
    "PG-13": { 
      "allow": ["damn", "hell", "mild_innuendo"], 
      "ban": ["fuck", "shit", "explicit_sexual"],
      "require": "teenage appropriate with mild edge"
    },
    "R": { 
      "allow": ["fuck", "shit", "ass", "bitch", "strong_language"], 
      "ban": ["explicit_sexual", "graphic_violence"],
      "require": "adult language without raunch"
    },
    "Explicit": { 
      "require": ["sexual_innuendo", "raunch", "adult_themes"], 
      "tieToContext": true,
      "description": "raunchy adult humor tied to context"
    }
  },

  "categoryGates": {
    "explicitBlocked": ["Pets", "Animals", "Dog park", "Kids", "School", "Daycare"],
    "onBlockDowngradeTo": "R"
  },

  "ageRules": {
    "banNumbersForBirthday": true,
    "allowAgeOnlyIfTagged": false,
    "stripAgeWords": ["older", "younger", "age", "years old", "turning"]
  },

  "validation": {
    "format": {
      "oneSentence": true,
      "onePeriod": true,
      "noCommas": true,
      "noEmDash": true,
      "lengthRange": [40, 100]
    },
    "context": { 
      "requireAnyFromLexicon": true,
      "minLexiconWords": 1
    },
    "hardTags": { 
      "minLinesWithAll": 3,
      "frontPositionOnFirstN": 2
    },
    "duplicates": {
      "banExactDuplicates": true,
      "minLevenshteinDistance": 8
    }
  },

  "postProcess": {
    "forceContextWord": true,
    "repairTrailingFragments": [" and now it shows.", " at the party.", " on the court.", " tonight."],
    "fitLengthWordSafe": true,
    "capitalizeFirstChar": true,
    "endWithPeriod": true
  }
} as const;

// Entity tracking for cooldowns
const seenEntities = new Map<string, number>();
const seenInBatch = new Set<string>();
let currentBatchId = 0;

export function startNewBatch(): void {
  currentBatchId++;
  seenInBatch.clear();
  
  // Clean up old entries
  const cutoffBatch = currentBatchId - VIIBE_CONFIG_V3.popCulture.cooldownBatches;
  for (const [entity, batchNum] of seenEntities.entries()) {
    if (batchNum < cutoffBatch) {
      seenEntities.delete(entity);
    }
  }
}

export function getRandomPopCultureEntity(): string | null {
  const buckets = VIIBE_CONFIG_V3.popCulture.entityBuckets;
  const allEntities = Object.values(buckets).flat();
  
  // Filter out recently used entities
  const availableEntities = allEntities.filter(entity => 
    !seenEntities.has(entity) && !seenInBatch.has(entity)
  );
  
  if (availableEntities.length === 0) {
    return null; // All entities are on cooldown
  }
  
  const randomEntity = availableEntities[Math.floor(Math.random() * availableEntities.length)];
  
  // Mark as used
  seenInBatch.add(randomEntity);
  seenEntities.set(randomEntity, currentBatchId);
  
  return randomEntity;
}

export function selectComedianVoiceV3(rating: string): string {
  const voices = VIIBE_CONFIG_V3.comedianVoices.ratingBanks[rating as keyof typeof VIIBE_CONFIG_V3.comedianVoices.ratingBanks];
  if (!voices || voices.length === 0) {
    return "default";
  }
  
  return voices[Math.floor(Math.random() * voices.length)];
}

export function getVoiceInstructionsV3(voice: string): string {
  const profile = VIIBE_CONFIG_V3.comedianVoices.voiceProfiles[voice as keyof typeof VIIBE_CONFIG_V3.comedianVoices.voiceProfiles];
  if (!profile) {
    return "Write natural comedy with authentic comedian delivery.";
  }
  
  return `Write as ${voice.replace('_', ' ')} would: ${profile.signature}. Use ${profile.style} approach but keep it natural.`;
}