export function stripSoftEcho(lines: string[], soft: string[]) {
  if (!soft.length) return lines;
  const re = new RegExp(`\\b(${soft.map(escape).join("|")})\\b`, "ig");
  return lines.map(l => l.replace(re, m => synonyms[m.toLowerCase()] ?? "that"));
}

const synonyms: Record<string,string> = {
  angry: "heated", 
  traffic: "gridlock", 
  late: "behind schedule",
  gets: "becomes",
  so: "really",
  very: "super",
  really: "totally"
};

function escape(s: string){ 
  return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); 
}