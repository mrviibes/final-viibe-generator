export type ParsedTags = { hard: string[]; soft: string[] };

export function parseTags(raw: string): ParsedTags {
  if (!raw) return { hard: [], soft: [] };
  const items = raw.split(",").map(s => s.trim()).filter(Boolean);
  const hard: string[] = [];
  const soft: string[] = [];
  for (let t of items) {
    t = t.replace(/[""]/g, '"').replace(/['']/g, "'");
    const isHard = /^".+"$/.test(t) || /^@.+/.test(t);
    const clean = t.replace(/^@/, "").replace(/^["']|["']$/g, "");
    (isHard ? hard : soft).push(clean);
  }
  return { hard, soft };
}