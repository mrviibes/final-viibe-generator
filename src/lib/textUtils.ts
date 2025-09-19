// Tag parsing utility for visual tags (simplified - no quotation logic)
export function parseVisualTags(tags: string[]): { hardTags: string[]; softTags: string[] } {
  const hardTags: string[] = [];
  const softTags: string[] = [];
  
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    
    // Remove quotes if present (but don't treat them specially)
    const cleanTag = trimmed.replace(/^["']|["']$/g, '');
    
    // Simple heuristic: nouns/objects go to hardTags, adjectives/moods go to softTags
    // For now, put everything in hardTags to be included literally when possible
    // The visual generation system will handle style vs literal interpretation
    hardTags.push(cleanTag);
  }
  
  return { hardTags, softTags };
}

// Extract action elements from text for better visual generation
export function extractActionElements(text: string): { keywords: string[], actions: string[], timing: string[] } {
  if (!text || typeof text !== 'string') return { keywords: [], actions: [], timing: [] };
  
  const lowerText = text.toLowerCase();
  
  // Extract timing/sequence words
  const timingWords = ['before', 'after', 'during', 'while', 'when', 'then', 'until', 'since', 'as'];
  const timing = timingWords.filter(word => lowerText.includes(word));
  
  // Extract action verbs and verb phrases
  const actionPatterns = [
    /\b(calls?|calling|called)\s+[a-z\s]{1,20}/g,
    /\b(gets?|getting|got)\s+[a-z\s]{1,20}/g,
    /\b(throws?|throwing|threw)\s+[a-z\s]{1,20}/g,
    /\b(jumps?|jumping|jumped)\s+[a-z\s]{1,20}/g,
    /\b(runs?|running|ran)\s+[a-z\s]{1,20}/g,
    /\b(plays?|playing|played)\s+[a-z\s]{1,20}/g,
    /\b(sits?|sitting|sat)\s+[a-z\s]{1,20}/g,
    /\b(stands?|standing|stood)\s+[a-z\s]{1,20}/g,
    /\b(walks?|walking|walked)\s+[a-z\s]{1,20}/g,
    /\b(says?|saying|said)\s+[a-z\s]{1,20}/g,
    /\b(does|doing|did)\s+[a-z\s]{1,20}/g,
    /\b(makes?|making|made)\s+[a-z\s]{1,20}/g
  ];
  
  const actions: string[] = [];
  for (const pattern of actionPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      actions.push(...matches.map(m => m.trim()));
    }
  }
  
  // Extract keywords (keep existing logic)
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'ought', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'them', 'their', 'what', 'where', 'when', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'like',
    'me', 'my', 'myself', 'this', 'that', 'these', 'those', 'am', 'an', 'for', 'in',
    'of', 'or', 'with', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'again', 'further', 'then', 'once'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.has(word) && 
      !word.match(/^\d+$/)
    );

  const uniqueWords = Array.from(new Set(words));
  const keywords = uniqueWords
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  return { keywords, actions, timing };
}

export function normalizeTypography(text: string): string {
  return text
    // Convert curly quotes to straight quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Convert em/en dashes to regular hyphens
    .replace(/[—–]/g, '-')
    // Remove any trailing/leading whitespace
    .trim();
}

export function suggestContractions(text: string): string {
  return text
    // Common missing apostrophes
    .replace(/\byoud\b/gi, "you'd")
    .replace(/\byoure\b/gi, "you're")
    .replace(/\byoull\b/gi, "you'll")
    .replace(/\byouve\b/gi, "you've")
    .replace(/\btheyre\b/gi, "they're")
    .replace(/\btheyll\b/gi, "they'll")
    .replace(/\btheyve\b/gi, "they've")
    .replace(/\bwere\b/gi, "we're")
    .replace(/\bwell\b/gi, "we'll")
    .replace(/\bweve\b/gi, "we've")
    .replace(/\bits\b/gi, "it's")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bill\b/gi, "I'll")
    .replace(/\bid\b/gi, "I'd")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bwasnt\b/gi, "wasn't")
    .replace(/\bwerent\b/gi, "weren't")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\barent\b/gi, "aren't")
    .replace(/\bhasnt\b/gi, "hasn't")
    .replace(/\bhavent\b/gi, "haven't")
    .replace(/\bhadnt\b/gi, "hadn't")
    .replace(/\bshouldnt\b/gi, "shouldn't")
    .replace(/\bwouldnt\b/gi, "wouldn't")
    .replace(/\bcouldnt\b/gi, "couldn't");
}

export function isTextMisspelled(originalText: string, renderedText: string): boolean {
  const normalized1 = normalizeTypography(originalText.toLowerCase().trim());
  const normalized2 = normalizeTypography(renderedText.toLowerCase().trim());
  
  // Simple similarity check - if they're very different, likely misspelled
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity < 0.8; // 80% similarity threshold
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator  // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}