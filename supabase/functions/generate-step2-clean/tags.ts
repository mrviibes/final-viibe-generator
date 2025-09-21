export type ParsedTags = { hard: string[]; soft: string[] };

export function parseTags(input: unknown): ParsedTags {
  if (input == null) return { hard: [], soft: [] };

  // Normalize input to string array
  let items: string[] = [];
  if (typeof input === "string") {
    items = input.split(",").map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(input)) {
    items = input.map(String).filter(Boolean);
  } else if (input && typeof input === "object") {
    const o = input as any;
    if (Array.isArray(o.hard) || Array.isArray(o.soft)) {
      items = [
        ...(o.hard ?? []).map((s: string) => `"${s}"`),
        ...(o.soft ?? [])
      ];
    } else {
      items = Object.values(o).map(String).filter(Boolean);
    }
  }

  const hard: string[] = [];
  const soft: string[] = [];
  
  for (let item of items) {
    // Normalize quotes and spaces
    const normalized = item.replace(/[""]/g, '"').replace(/['']/g, "'").trim();
    
    // Determine if hard tag (quoted or @-prefixed)
    const isHard = /^".+"$/.test(normalized) || /^@/.test(normalized);
    
    // Clean the tag
    let clean = normalized.replace(/^@/, "").replace(/^["']|["']$/g, "").trim();
    
    // Normalize case and punctuation but preserve proper nouns
    if (clean && !/^[A-Z]/.test(clean)) {
      clean = clean.toLowerCase();
    }
    
    if (clean) {
      (isHard ? hard : soft).push(clean);
    }
  }
  
  // Deduplicate
  return { 
    hard: [...new Set(hard)], 
    soft: [...new Set(soft)] 
  };
}

// Validate that generated text contains required tags
export function validateTagUsage(text: string, requiredTags: string[]): { valid: boolean; foundTags: string[]; missingTags: string[] } {
  if (requiredTags.length === 0) return { valid: true, foundTags: [], missingTags: [] };
  
  const lowerText = text.toLowerCase();
  const foundTags: string[] = [];
  const missingTags: string[] = [];
  
  for (const tag of requiredTags) {
    const lowerTag = tag.toLowerCase();
    if (lowerText.includes(lowerTag)) {
      foundTags.push(tag);
    } else {
      missingTags.push(tag);
    }
  }
  
  return {
    valid: foundTags.length > 0,
    foundTags,
    missingTags
  };
}