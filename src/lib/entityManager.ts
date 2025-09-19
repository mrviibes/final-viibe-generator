// Entity Management System for Pop Culture References
// Prevents repetition and enforces identity protection rules

export interface EntityPool {
  '1980s_2000s': string[];
  '2010s': string[];
  '2020s': string[];
}

export interface EntityManagerState {
  recentlyUsed: string[];
  currentBatchEntity: string | null;
}

// Curated entity buckets - events, brands, phenomena (NOT personal identity traits)
const ENTITY_BUCKETS: EntityPool = {
  '1980s_2000s': [
    'Blockbuster', 'MySpace', 'AOL', 'New Coke', 'Beanie Babies', 
    'Tamagotchi', 'Napster', 'Dial-up internet', 'Nokia brick phones',
    'VHS vs Betamax', 'Y2K panic', 'Pogs', 'Geocities'
  ],
  '2010s': [
    'Game of Thrones finale', 'Fyre Festival', 'Vine', 'Fortnite dances',
    'John Wick', 'Tiger King', 'Avengers Endgame', 'Ice Bucket Challenge',
    'Pokémon GO', 'Fidget spinners', 'Snapchat filters', 'Netflix binge-watching'
  ],
  '2020s': [
    'Barbie movie', 'Oppenheimer', 'GTA VI delays', 'MrBeast videos',
    'UFC hype', 'TikTok trends', 'Threads launch', 'NFT crashes',
    'Zoom fatigue', 'Among Us', 'Wordle obsession', 'ChatGPT panic'
  ]
};

// Protected identity categories - NEVER target these traits
const PROTECTED_IDENTITY_TRAITS = [
  'race', 'ethnicity', 'gender', 'sexual orientation', 'religion', 
  'disability', 'mental health', 'physical appearance', 'body type',
  'age discrimination', 'nationality', 'accent', 'family structure'
];

// In-memory state for entity management (resets per session)
let entityState: EntityManagerState = {
  recentlyUsed: [],
  currentBatchEntity: null
};

export function selectEntity(): string | null {
  // Don't allow more than 1 entity per batch
  if (entityState.currentBatchEntity) {
    return null;
  }

  // Get all available entities excluding recently used ones
  const allEntities = [
    ...ENTITY_BUCKETS['1980s_2000s'],
    ...ENTITY_BUCKETS['2010s'], 
    ...ENTITY_BUCKETS['2020s']
  ];

  const availableEntities = allEntities.filter(entity => 
    !entityState.recentlyUsed.includes(entity)
  );

  // If we've used too many, reset but keep the last 5
  if (availableEntities.length === 0) {
    entityState.recentlyUsed = entityState.recentlyUsed.slice(-5);
    const resetAvailable = allEntities.filter(entity => 
      !entityState.recentlyUsed.includes(entity)
    );
    if (resetAvailable.length === 0) {
      return null; // Shouldn't happen with our pool size
    }
  }

  // Randomly select from available entities
  const finalPool = availableEntities.length > 0 ? availableEntities : 
    allEntities.filter(entity => !entityState.recentlyUsed.includes(entity));
  
  const selectedEntity = finalPool[Math.floor(Math.random() * finalPool.length)];
  
  // Update state
  entityState.currentBatchEntity = selectedEntity;
  entityState.recentlyUsed.push(selectedEntity);
  
  // Keep only last 5 used entities
  if (entityState.recentlyUsed.length > 5) {
    entityState.recentlyUsed = entityState.recentlyUsed.slice(-5);
  }

  return selectedEntity;
}

export function resetBatch(): void {
  entityState.currentBatchEntity = null;
}

export function getCurrentBatchEntity(): string | null {
  return entityState.currentBatchEntity;
}

export function getIdentityProtectionRules(): string {
  return `CRITICAL IDENTITY PROTECTION RULES:
- NEVER target protected traits: ${PROTECTED_IDENTITY_TRAITS.join(', ')}
- Focus on ACTIONS, BEHAVIORS, EVENTS, BRANDS - not personal characteristics
- Target what people DO, not who they ARE
- Roast choices, moments, fails - never identity
- Use approved entities only: ${entityState.currentBatchEntity || 'none selected'}`;
}

export function validateContentForIdentityViolations(text: string): string[] {
  const violations: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for protected trait targeting
  const identityViolations = PROTECTED_IDENTITY_TRAITS.filter(trait => {
    // More nuanced checking for identity-based targeting
    switch (trait) {
      case 'physical appearance':
        return /\b(ugly|fat|thin|short|tall|bald|hairy)\b/.test(lowerText);
      case 'age discrimination':
        return /\b(too old|too young|ancient|geriatric|child)\b/.test(lowerText);
      case 'gender':
        return /\b(like a man|like a woman|masculine|feminine|act like)\b/.test(lowerText);
      case 'mental health':
        return /\b(crazy|insane|psycho|mental|nuts|psychotic)\b/.test(lowerText);
      default:
        return lowerText.includes(trait);
    }
  });

  if (identityViolations.length > 0) {
    violations.push(`Protected identity targeting: ${identityViolations.join(', ')}`);
  }

  // Check if using entity appropriately (behavior/event focus)
  if (entityState.currentBatchEntity) {
    const entity = entityState.currentBatchEntity.toLowerCase();
    if (lowerText.includes(entity)) {
      // Good - using the approved entity
      // Check if it's used appropriately (focusing on the event/brand, not personal traits)
      const inappropriatePatterns = [
        `like ${entity}`, `${entity}-looking`, `${entity} person`,
        `${entity} type`, `${entity} style person`
      ];
      
      if (inappropriatePatterns.some(pattern => lowerText.includes(pattern))) {
        violations.push(`Inappropriate entity usage: targeting personal traits instead of event/behavior`);
      }
    }
  }

  return violations;
}

export function getEntityManagerStats(): object {
  return {
    recentlyUsed: entityState.recentlyUsed,
    currentBatchEntity: entityState.currentBatchEntity,
    totalAvailableEntities: Object.values(ENTITY_BUCKETS).flat().length,
    protectedTraitsCount: PROTECTED_IDENTITY_TRAITS.length
  };
}
