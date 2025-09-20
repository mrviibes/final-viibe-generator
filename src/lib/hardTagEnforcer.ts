// Enhanced hard tag enforcement that survives generation failures and fallbacks
export interface TagEnforcementResult {
  enforcedLines: string[];
  wasModified: boolean;
  tagCoverage: number;
  enforcementLog: string[];
}

export function enforceHardTagsPostGeneration(
  lines: string[],
  hardTags: string[],
  minTaggedLines: number = 3
): TagEnforcementResult {
  if (hardTags.length === 0) {
    return {
      enforcedLines: lines,
      wasModified: false,
      tagCoverage: 100,
      enforcementLog: ['No hard tags to enforce']
    };
  }

  const enforcementLog: string[] = [];
  let modifiedLines = [...lines];
  
  // Count current tag coverage
  const initialCoverage = countTagCoverage(lines, hardTags);
  enforcementLog.push(`Initial tag coverage: ${initialCoverage}/${minTaggedLines} lines`);
  
  if (initialCoverage >= minTaggedLines) {
    return {
      enforcedLines: lines,
      wasModified: false,
      tagCoverage: (initialCoverage / lines.length) * 100,
      enforcementLog: [`Sufficient tag coverage: ${initialCoverage}/${minTaggedLines}`]
    };
  }
  
  // Need to inject tags - find lines that need tags
  const linesNeedingTags = findLinesNeedingTags(modifiedLines, hardTags, minTaggedLines);
  enforcementLog.push(`Found ${linesNeedingTags.length} lines needing tag injection`);
  
  for (let i = 0; i < linesNeedingTags.length && countTagCoverage(modifiedLines, hardTags) < minTaggedLines; i++) {
    const lineIndex = linesNeedingTags[i];
    const tagToInject = selectBestTagForLine(modifiedLines[lineIndex], hardTags);
    
    if (tagToInject) {
      const injectedLine = injectTagNaturally(modifiedLines[lineIndex], tagToInject);
      if (injectedLine !== modifiedLines[lineIndex]) {
        enforcementLog.push(`Injected "${tagToInject}" into line ${lineIndex + 1}`);
        modifiedLines[lineIndex] = injectedLine;
      }
    }
  }
  
  const finalCoverage = countTagCoverage(modifiedLines, hardTags);
  const wasModified = !arraysEqual(lines, modifiedLines);
  
  enforcementLog.push(`Final tag coverage: ${finalCoverage}/${minTaggedLines} lines`);
  
  return {
    enforcedLines: modifiedLines,
    wasModified,
    tagCoverage: (finalCoverage / lines.length) * 100,
    enforcementLog
  };
}

function countTagCoverage(lines: string[], hardTags: string[]): number {
  return lines.filter(line => 
    hardTags.some(tag => 
      line.toLowerCase().includes(tag.toLowerCase())
    )
  ).length;
}

function findLinesNeedingTags(lines: string[], hardTags: string[], minTaggedLines: number): number[] {
  const linesWithTags = lines.map((line, index) => ({
    index,
    hasTags: hardTags.some(tag => line.toLowerCase().includes(tag.toLowerCase()))
  }));
  
  const linesWithoutTags = linesWithTags
    .filter(item => !item.hasTags)
    .map(item => item.index);
  
  const currentTaggedCount = linesWithTags.filter(item => item.hasTags).length;
  const needToTag = Math.max(0, minTaggedLines - currentTaggedCount);
  
  return linesWithoutTags.slice(0, needToTag);
}

function selectBestTagForLine(line: string, hardTags: string[]): string | null {
  // Prefer shorter tags that fit naturally
  const sortedTags = [...hardTags].sort((a, b) => a.length - b.length);
  
  // Look for contextual matches first
  for (const tag of sortedTags) {
    if (lineContextSuitsTag(line, tag)) {
      return tag;
    }
  }
  
  // Return shortest tag as fallback
  return sortedTags[0] || null;
}

function lineContextSuitsTag(line: string, tag: string): boolean {
  const lowerLine = line.toLowerCase();
  const lowerTag = tag.toLowerCase();
  
  // If line mentions "you" or "your", personal names work well
  if (/\byou['re|\s]|\byour\b/.test(lowerLine)) {
    return true;
  }
  
  // If line is about actions, names work well as subjects
  if (/\b(did|does|went|came|said|ate|drank|bought)\b/.test(lowerLine)) {
    return true;
  }
  
  // If line has possessive structure, names work well
  if (/'s\b/.test(lowerLine)) {
    return true;
  }
  
  return false;
}

function injectTagNaturally(line: string, tag: string): string {
  // Strategy 1: Replace "you" with the tag name
  if (/\byou\b/i.test(line)) {
    return line.replace(/\byou\b/i, tag);
  }
  
  // Strategy 2: Replace "your" with "[tag]'s"
  if (/\byour\b/i.test(line)) {
    return line.replace(/\byour\b/i, `${tag}'s`);
  }
  
  // Strategy 3: Add possessive at beginning if line starts with action
  if (/^(went|came|said|ate|drank|bought|did|does)/i.test(line)) {
    return `${tag} ${line.toLowerCase()}`;
  }
  
  // Strategy 4: Insert at natural break (comma, "but", "and")
  const breakPoints = [', ', ' but ', ' and ', ' so ', ' then '];
  for (const breakPoint of breakPoints) {
    if (line.includes(breakPoint)) {
      const parts = line.split(breakPoint);
      if (parts.length >= 2 && parts[1].length > 10) {
        return `${parts[0]}${breakPoint}${tag} ${parts[1].toLowerCase()}`;
      }
    }
  }
  
  // Strategy 5: Prepend if line is short enough
  if (line.length < 90) {
    return `${tag} ${line.toLowerCase()}`;
  }
  
  // Fallback: append at end if there's room
  if (line.length < 100) {
    return `${line.replace(/\.$/, '')} with ${tag}.`;
  }
  
  return line; // No safe injection possible
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

// Export for use in fallback generation
export function ensureHardTagsInFallback(
  fallbackLines: string[],
  hardTags: string[]
): string[] {
  if (hardTags.length === 0) return fallbackLines;
  
  const result = enforceHardTagsPostGeneration(fallbackLines, hardTags, 3);
  return result.enforcedLines;
}