// Modern Pop Culture Entity Management - V3
import { VIIBE_CONFIG_V3 } from './viibe_config_v3.ts';

// In-memory tracking for entity cooldowns
const seenInCurrentBatch = new Set<string>();
const recentlyUsedEntities = new Map<string, number>();
let batchCounter = 0;

export function startNewPopCultureBatch(): void {
  batchCounter++;
  seenInCurrentBatch.clear();
  
  // Clean up old entries based on cooldown period
  const cutoffBatch = batchCounter - VIIBE_CONFIG_V3.popCulture.cooldownBatches;
  for (const [entity, usedInBatch] of recentlyUsedEntities.entries()) {
    if (usedInBatch < cutoffBatch) {
      recentlyUsedEntities.delete(entity);
    }
  }
  
  console.log(`🎭 Started pop culture batch ${batchCounter}, cleaned entities older than batch ${cutoffBatch}`);
}

export function selectFreshPopCultureEntity(): string | null {
  // Check if we've already used an entity in this batch
  if (seenInCurrentBatch.size >= VIIBE_CONFIG_V3.popCulture.maxEntitiesPerBatch) {
    console.log(`🚫 Pop culture limit reached for batch ${batchCounter}`);
    return null;
  }
  
  const entityBuckets = VIIBE_CONFIG_V3.popCulture.entityBuckets;
  const allEntities = Object.values(entityBuckets).flat();
  
  // Filter out entities on cooldown
  const availableEntities = allEntities.filter(entity => {
    const isOnCooldown = recentlyUsedEntities.has(entity);
    const usedThisBatch = seenInCurrentBatch.has(entity);
    return !isOnCooldown && !usedThisBatch;
  });
  
  if (availableEntities.length === 0) {
    console.log(`⏰ No fresh pop culture entities available (all on cooldown)`);
    return null;
  }
  
  // Select random entity from available pool
  const selectedEntity = availableEntities[Math.floor(Math.random() * availableEntities.length)];
  
  // Mark as used
  seenInCurrentBatch.add(selectedEntity);
  recentlyUsedEntities.set(selectedEntity, batchCounter);
  
  console.log(`✨ Selected fresh pop culture entity: ${selectedEntity} (batch ${batchCounter})`);
  return selectedEntity;
}

export function formatEntityForJoke(entity: string): string {
  // Convert entity names to natural joke format
  const entityFormats: Record<string, string> = {
    // Music
    "taylor_swift": "Taylor Swift",
    "drake": "Drake",
    "bad_bunny": "Bad Bunny", 
    "beyonce": "Beyoncé",
    "ice_spice": "Ice Spice",
    "travis_scott": "Travis Scott",
    "doja_cat": "Doja Cat",
    "olivia_rodrigo": "Olivia Rodrigo",
    "lil_nas_x": "Lil Nas X",
    "billie_eilish": "Billie Eilish",
    
    // Film/TV
    "marvel": "Marvel",
    "euphoria": "Euphoria", 
    "succession": "Succession",
    "stranger_things": "Stranger Things",
    "barbie": "Barbie",
    "oppenheimer": "Oppenheimer",
    "house_dragon": "House of the Dragon",
    "wednesday": "Wednesday",
    "squid_game": "Squid Game",
    "avatar": "Avatar",
    
    // Internet/Tech
    "elon_musk": "Elon Musk",
    "mrbeast": "MrBeast",
    "tiktok": "TikTok",
    "threads": "Threads",
    "chatgpt": "ChatGPT",
    "ai": "AI",
    "meta": "Meta",
    "twitter": "Twitter",
    "instagram": "Instagram", 
    "youtube": "YouTube",
    
    // Sports
    "lebron": "LeBron",
    "messi": "Messi",
    "serena_williams": "Serena Williams",
    "shaq": "Shaq",
    "simone_biles": "Simone Biles",
    "curry": "Curry",
    "mahomes": "Mahomes",
    "ronaldo": "Ronaldo",
    "tiger_woods": "Tiger Woods",
    "lewis_hamilton": "Lewis Hamilton",
    
    // LGBTQ+/Trans
    "elliot_page": "Elliot Page",
    "laverne_cox": "Laverne Cox",
    "hunter_schafer": "Hunter Schafer",
    "sam_smith": "Sam Smith",
    "dylan_mulvaney": "Dylan Mulvaney",
    "janet_mock": "Janet Mock",
    "pose": "Pose",
    "rupaul": "RuPaul",
    "pabllo_vittar": "Pabllo Vittar"
  };
  
  return entityFormats[entity] || entity.replace(/_/g, ' ');
}

export function getPopCultureStatus(): {
  currentBatch: number;
  entitiesUsedThisBatch: string[];
  entitiesOnCooldown: string[];
  availableCount: number;
} {
  const allEntities = Object.values(VIIBE_CONFIG_V3.popCulture.entityBuckets).flat();
  const entitiesOnCooldown = Array.from(recentlyUsedEntities.keys());
  const availableCount = allEntities.length - entitiesOnCooldown.length - seenInCurrentBatch.size;
  
  return {
    currentBatch: batchCounter,
    entitiesUsedThisBatch: Array.from(seenInCurrentBatch),
    entitiesOnCooldown,
    availableCount
  };
}

export function isPopCultureRequiredForStyle(style: string): boolean {
  return style === "pop-culture" || style === "pop_culture";
}