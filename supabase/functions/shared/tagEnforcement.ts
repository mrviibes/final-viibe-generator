// Tag enforcement system with degrade-not-bypass logic
import { VIIBE_CONFIG } from './config.ts';

export interface TagValidationResult {
  isValid: boolean;
  hardTagHits: number;
  requiredHits: number;
  missingTags: string[];
  shouldRetry: boolean;
}

export function parseTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    
    // Check if starts and ends with quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      // Hard tag - remove quotes and store for literal inclusion
      const unquoted = trimmed.slice(1, -1).trim();
      if (unquoted) {
        hardTags.push(unquoted);
      }
    } else {
      // Soft tag - store lowercased for style influence only
      softTags.push(trimmed.toLowerCase());
    }
  }
  
  return { hardTags, softTags };
}

export function validateTagCoverage(
  lines: Array<{ lane: string; text: string }>, 
  tags: string[]
): TagValidationResult {
  const { hardTags } = parseTags(tags);
  
  if (hardTags.length === 0) {
    return {
      isValid: true,
      hardTagHits: 0,
      requiredHits: 0,
      missingTags: [],
      shouldRetry: false
    };
  }
  
  // Count how many lines contain each hard tag
  let totalHits = 0;
  const missingTags: string[] = [];
  
  for (const tag of hardTags) {
    const tagHits = lines.filter(line => 
      line.text.toLowerCase().includes(tag.toLowerCase())
    ).length;
    
    totalHits += tagHits;
    
    if (tagHits === 0) {
      missingTags.push(tag);
    }
  }
  
  const requiredHits = VIIBE_CONFIG.tagEnforcement.hardTagsRequiredIn;
  const isValid = totalHits >= requiredHits;
  
  return {
    isValid,
    hardTagHits: totalHits,
    requiredHits,
    missingTags,
    shouldRetry: !isValid && VIIBE_CONFIG.tagEnforcement.degradeNotBypass
  };
}

export function injectMissingTags(
  lines: Array<{ lane: string; text: string }>, 
  missingTags: string[],
  maxInjectionsPerLine: number = 1
): Array<{ lane: string; text: string }> {
  if (missingTags.length === 0) {
    return lines;
  }
  
  const result = [...lines];
  const tagsToInject = [...missingTags];
  
  // Try to inject missing tags into lines that don't already have them
  for (let i = 0; i < result.length && tagsToInject.length > 0; i++) {
    const line = result[i];
    let injectionsInThisLine = 0;
    
    // Inject tags that aren't already present in this line
    for (let j = tagsToInject.length - 1; j >= 0 && injectionsInThisLine < maxInjectionsPerLine; j--) {
      const tag = tagsToInject[j];
      
      if (!line.text.toLowerCase().includes(tag.toLowerCase())) {
        // Find a good place to inject the tag
        const words = line.text.split(' ');
        
        // Try to inject naturally into the sentence
        if (words.length > 3) {
          // Insert near the middle or end
          const insertPos = Math.floor(words.length * 0.7);
          words.splice(insertPos, 0, tag);
          line.text = words.join(' ');
        } else {
          // Short line, just append
          line.text = `${line.text} ${tag}`;
        }
        
        // Ensure we don't exceed character limit
        if (line.text.length > 100) {
          line.text = line.text.slice(0, 97) + '...';
        }
        
        tagsToInject.splice(j, 1);
        injectionsInThisLine++;
        
        console.log(`💉 Injected tag "${tag}" into lane ${line.lane}: ${line.text}`);
      }
    }
  }
  
  if (tagsToInject.length > 0) {
    console.log(`⚠️ Failed to inject tags: ${tagsToInject.join(', ')}`);
  }
  
  return result;
}

export function enforceTagCoverage(
  lines: Array<{ lane: string; text: string }>, 
  tags: string[]
): { 
  lines: Array<{ lane: string; text: string }>; 
  validation: TagValidationResult; 
  wasModified: boolean 
} {
  const validation = validateTagCoverage(lines, tags);
  
  if (validation.isValid || !VIIBE_CONFIG.tagEnforcement.enforceAfterFallbacks) {
    return { lines, validation, wasModified: false };
  }
  
  // Inject missing tags if enforcement is enabled
  const modifiedLines = injectMissingTags(lines, validation.missingTags);
  const newValidation = validateTagCoverage(modifiedLines, tags);
  
  return { 
    lines: modifiedLines, 
    validation: newValidation, 
    wasModified: true 
  };
}