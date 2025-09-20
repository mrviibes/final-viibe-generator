// Pop-culture entity cooldown and rotation system
import { VIIBE_CONFIG } from './config.ts';

// In-memory storage for entity tracking (resets on function restart)
const seenInBatch = new Set<string>();
const seenRecent = new Map<string, number>();
let currentBatchId = 0;

export function startNewBatch(): void {
  currentBatchId++;
  seenInBatch.clear();
  
  // Clean up old entries from recent tracking
  const cutoffBatch = currentBatchId - VIIBE_CONFIG.popCulture.cooldownBatches;
  for (const [entity, batchNum] of seenRecent.entries()) {
    if (batchNum < cutoffBatch) {
      seenRecent.delete(entity);
    }
  }
}

export function isEntityAvailable(entity: string): boolean {
  if (!VIIBE_CONFIG.popCulture.enableCooldown) {
    return true;
  }
  
  const normalizedEntity = entity.toLowerCase().trim();
  
  // Check if seen in current batch (one entity per batch rule)
  if (VIIBE_CONFIG.popCulture.oneEntityPerBatch && seenInBatch.has(normalizedEntity)) {
    return false;
  }
  
  // Check if seen recently (cooldown rule)
  return !seenRecent.has(normalizedEntity);
}

export function markEntityUsed(entity: string): void {
  if (!VIIBE_CONFIG.popCulture.enableCooldown) {
    return;
  }
  
  const normalizedEntity = entity.toLowerCase().trim();
  seenInBatch.add(normalizedEntity);
  seenRecent.set(normalizedEntity, currentBatchId);
  
  console.log(`📝 Marked entity used: ${entity} (batch ${currentBatchId})`);
}

export function getEntityCooldownStatus(): { 
  currentBatch: number; 
  entitiesInBatch: string[]; 
  recentEntities: string[] 
} {
  return {
    currentBatch: currentBatchId,
    entitiesInBatch: Array.from(seenInBatch),
    recentEntities: Array.from(seenRecent.keys())
  };
}