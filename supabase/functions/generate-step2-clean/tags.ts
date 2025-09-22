export type ParsedTags = { hard: string[]; soft: string[] };

// Robust tag normalization to prevent crashes
export function normalizeTags(raw: string|string[]|{hard?:string[],soft?:string[]}): ParsedTags {
  if (!raw) return { hard: [], soft: [] };
  
  try {
    if (typeof raw === "string") {
      const items = raw.split(",").map(s => s.trim()).filter(Boolean);
      const hard = items.filter(tag => /^".+"$/.test(tag.replace(/[""]/g, '"')) || /^@/.test(tag))
                       .map(tag => tag.replace(/^@/, "").replace(/^["']|["']$/g, "").trim());
      const soft = items.filter(tag => !/^".+"$/.test(tag.replace(/[""]/g, '"')) && !/^@/.test(tag))
                       .map(tag => tag.trim());
      return { hard: [...new Set(hard)], soft: [...new Set(soft)] };
    }
    
    if (Array.isArray(raw)) {
      const hard = raw.filter(x => /^".+"$/.test(String(x)) || /^@/.test(String(x)))
                      .map(x => String(x).replace(/^@/, "").replace(/^["']|["']$/g, "").trim());
      const soft = raw.filter(x => !/^".+"$/.test(String(x)) && !/^@/.test(String(x)))
                      .map(x => String(x).trim());
      return { hard: [...new Set(hard)], soft: [...new Set(soft)] };
    }
    
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as any;
      return { 
        hard: [...new Set(obj.hard || [])], 
        soft: [...new Set(obj.soft || [])] 
      };
    }
  } catch (error) {
    console.error('Tag normalization error:', error);
  }
  
  return { hard: [], soft: [] };
}

export function parseTags(input: unknown): ParsedTags {
  return normalizeTags(input as any);
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