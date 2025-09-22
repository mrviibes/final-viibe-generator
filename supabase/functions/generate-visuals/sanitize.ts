// Prevent leaks of unquoted soft tags and clean line numbering
export function stripSoft(lines: string[], soft: string[]) {
  let cleaned = lines;
  
  // Remove "Line X:" prefixes
  cleaned = cleaned.map(line => line.replace(/^Line\s+\d+:\s*/i, ''));
  
  if (!soft.length) return cleaned;
  const re = new RegExp(`\\b(${soft.map(escape).join("|")})\\b`, "ig");
  return cleaned.map(x => x.replace(re, "that"));
}

function escape(s: string) { 
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); 
}