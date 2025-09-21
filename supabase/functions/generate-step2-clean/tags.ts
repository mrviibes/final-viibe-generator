export type ParsedTags = { hard: string[]; soft: string[] };

export function parseTags(input: unknown): ParsedTags {
  if (input == null) return { hard: [], soft: [] };

  // Tolerant parser - handle string, array, or object input
  let raw = "";
  if (typeof input === "string") {
    raw = input;
  } else if (Array.isArray(input)) {
    raw = input.join(", ");
  } else if (input && typeof input === "object") {
    const o = input as any;
    if (Array.isArray(o.hard) || Array.isArray(o.soft)) {
      raw = [
        ...(o.hard ?? []).map((s: string) => `"${s}"`),
        ...(o.soft ?? [])
      ].join(", ");
    } else {
      raw = Object.values(o).join(", ");
    }
  }

  // Normalize quotes
  raw = raw.replace(/[""]/g, '"').replace(/['']/g, "'");
  
  const items = raw.split(",").map(s => s.trim()).filter(Boolean);
  const hard: string[] = [];
  const soft: string[] = [];
  
  for (let t of items) {
    const isHard = /^".+"$/.test(t) || /^@/.test(t);
    const clean = t.replace(/^@/, "").replace(/^["']|["']$/g, "");
    (isHard ? hard : soft).push(clean);
  }
  
  return { hard, soft };
}