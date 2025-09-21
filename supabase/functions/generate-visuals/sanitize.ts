// Prevent leaks of unquoted soft tags
export function stripSoft(lines: string[], soft: string[]) {
  if (!soft.length) return lines;
  const re = new RegExp(`\\b(${soft.map(escape).join("|")})\\b`, "ig");
  return lines.map(x => x.replace(re, "that"));
}

function escape(s: string) { 
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); 
}