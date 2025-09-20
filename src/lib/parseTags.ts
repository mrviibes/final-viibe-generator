// Enhanced tag parsing with exact hard/soft classification
export function parseTags(raw: string): Array<{ text: string; hard: boolean }> {
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(t => {
    const normalized = t.replace(/[""]/g, '"').replace(/['']/g, "'");
    const hard = /^".+"$|^@.+/.test(normalized);      // "Reid" or @Reid = hard
    const text = normalized.replace(/^@/, "").replace(/^["']|["']$/g, "");
    return { text, hard };
  });
}

// Convert parsed tags into explicit arrays
export function getTagArrays(raw: string): { hard: string[]; soft: string[] } {
  const parsed = parseTags(raw);
  return {
    hard: parsed.filter(t => t.hard).map(t => t.text),
    soft: parsed.filter(t => !t.hard).map(t => t.text)
  };
}

// Enforce hard tags after generation (survives fallbacks)
export function ensureHardTags(lines: string[], hard: string[], required = 3): string[] {
  const need = new Set(hard.slice(0, 3));         // cap to avoid token bloat
  const withTags = lines.map(l => ({
    l, 
    hits: [...need].filter(h => l.toLowerCase().includes(h.toLowerCase())).length
  }));
  
  if (withTags.filter(x => x.hits >= 2).length >= required) return lines;

  // rewrite weakest lines by injecting missing tags near verbs
  return lines.map(l => injectMissingTags(l, [...need]));
}

// Inject missing hard tags into lines naturally
function injectMissingTags(line: string, hardTags: string[]): string {
  const missingTags = hardTags.filter(tag => 
    !line.toLowerCase().includes(tag.toLowerCase())
  );
  
  if (missingTags.length === 0) return line;
  
  // Find insertion points near verbs or conjunctions
  const insertionPatterns = [
    /(\b(?:is|are|was|were|has|have|does|do|gets|got|makes|made)\b)/i,
    /(\b(?:and|but|while|when|if|because|since)\b)/i,
    /(\b(?:with|for|by|at|on|in)\b)/i
  ];
  
  let modifiedLine = line;
  
  for (const tag of missingTags.slice(0, 2)) { // Limit to 2 tags max
    for (const pattern of insertionPatterns) {
      const match = modifiedLine.match(pattern);
      if (match && match.index !== undefined) {
        const insertPos = match.index + match[0].length;
        modifiedLine = modifiedLine.slice(0, insertPos) + ` ${tag}` + modifiedLine.slice(insertPos);
        break;
      }
    }
  }
  
  return modifiedLine;
}

// ASCII quote sanitization
export function sanitizeInput(input: string): string {
  return input.replace(/[""]/g, '"').replace(/['']/g, "'");
}