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
      { "if": { "tone": "Romantic", "rating": "Explicit" }, "then": { "rating": "PG-13" } }
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
      "Humorous": ["kevin_hart", "ali_wong", "bill_burr", "taylor_tomlinson", "chris_rock"],
      "Savage": ["joan_rivers", "ricky_gervais", "dave_chappelle", "wanda_sykes", "anthony_jeselnik"], 
      "Playful": ["jim_gaffigan", "hasan_minhaj", "nate_bargatze", "james_acaster", "john_early"],
      "Romantic": ["john_mulaney", "hasan_minhaj", "nate_bargatze", "taylor_tomlinson", "bo_burnham_clean"],
      "Sentimental": ["mike_birbiglia", "demetri_martin", "ellen", "trevor_noah_clean", "hannah_gadsby_clean"]
    },
    "alwaysRandomizePerLine": true,
    "enabledForAllTones": true
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
  }
} as const;