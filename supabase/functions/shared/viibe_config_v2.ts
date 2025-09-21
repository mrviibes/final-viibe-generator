// Unified configuration for both Step 2 and Step 3
export const VIIBE_CONFIG_V2 = {
  "system": {
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
  "precedence": {
    "order": ["tone", "rating", "style"],
    "autoRemaps": [
      { "if": { "tone": "Sentimental", "rating": "R" }, "then": { "rating": "PG" } },
      { "if": { "tone": "Sentimental", "rating": "Explicit" }, "then": { "rating": "PG-13" } },
      { "if": { "tone": "Romantic", "rating": "R" }, "then": { "rating": "PG" } },
      { "if": { "tone": "Romantic", "rating": "Explicit" }, "then": { "rating": "PG-13" } },
      { "if": { "category": "animals", "rating": "Explicit" }, "then": { "rating": "R" } },
      { "if": { "subcategory": "Dog park", "rating": "Explicit" }, "then": { "rating": "R" } },
      { "if": { "subcategory": "Pets", "rating": "Explicit" }, "then": { "rating": "R" } },
      { "if": { "subcategory": "Animals", "rating": "Explicit" }, "then": { "rating": "R" } },
      { "if": { "subcategory": "Wildlife", "rating": "Explicit" }, "then": { "rating": "R" } }
    ]
  },
  "toneValidation": {
    "comedyDisabledTones": ["Romantic", "Sentimental"],
    "validators": {
      "forceFunny": {
        "enabledTones": ["Humorous", "Savage", "Playful", "Wildcard"],
        "disabledTones": ["Romantic", "Sentimental"]
      },
      "ratingQuotas": {
        "enabledTones": ["Humorous", "Savage", "Playful", "Wildcard"],
        "disabledTones": ["Romantic", "Sentimental"]
      }
    }
  },
  "comedianVoices": {
    "banks": {
      "punchline-first": ["kevin_hart", "chris_rock", "joan_rivers", "ali_wong"],
      "story": ["john_mulaney", "mike_birbiglia", "hasan_minhaj", "taylor_tomlinson"],
      "pop-culture": ["chris_rock", "ricky_gervais", "amy_schumer", "sarah_silverman"],
      "wildcard": ["mitch_hedberg", "anthony_jeselnik", "bill_burr", "demetri_martin"]
    },
    "alwaysRandomizePerLine": true,
    "enabledForAllStyles": true
  },
  "popCulture": {
    "enableCooldown": true,
    "oneEntityPerBatch": true,
    "cooldownBatches": 3
  },
  "visualLanes": {
    "structure": {
      "lane1": "keyword-serious",
      "lane2": "context-serious", 
      "lane3": "comedian-exaggeration",
      "lane4": "comedian-absurd"
    },
    "requirements": {
      "funnyConcepts": 2,
      "seriousConcepts": 2,
      "banFiller": ["party hat person", "random object", "empty room", "abstract shapes", "generic photo"]
    }
  },
  "tagEnforcement": {
    "hardTagsRequiredIn": 3,
    "enforceAfterFallbacks": true,
    "degradeNotBypass": true
  },
  "lengthBuckets": {
    "ranges": [[40,60], [61,80], [81,100]],
    "randomizePerBatch": true,
    "enforceVariety": true
  },
  "ratingGates": {
    "animals": { "blockExplicit": true, "allowROnly": true },
    "pets": { "blockExplicit": true, "allowROnly": true },
    "dogPark": { "blockExplicit": true, "allowROnly": true },
    "wildlife": { "blockExplicit": true, "allowROnly": true }
  },
  "animalSafety": {
    "banVerbs": ["attack", "maul", "kill", "bite", "rip", "hump", "rape", "violate", "abuse"],
    "softSubs": {
      "attack": "start beef with",
      "attacks": "starts beef with", 
      "bite": "snap at",
      "bites": "snaps at",
      "hump": "awkwardly hop on",
      "humps": "awkwardly hops on",
      "maul": "overwhelm",
      "mauls": "overwhelms",
      "kill": "defeat",
      "kills": "defeats",
      "rip": "grab"
    }
  },
  "explicitTermsAnimals": {
    "ban": ["sex", "sexy", "sexual", "oral", "porn", "boner", "nsfw", "kinky", "horny", "naked", "nude", "erotic", "masturbate", "orgasm", "penetrate", "thrust"]
  },
  "funnyEnhancements": {
    "requirePopCultureOrAbsurd": true,
    "requireOneStoryWithTwist": true,
    "banFlatDescriptions": true,
    "enabledTones": ["Humorous", "Savage", "Playful", "Wildcard"],
    "flatDescriptionPatterns": ["is tall at", "plays basketball", "simple description", "just", "only", "basic"]
  }
} as const;