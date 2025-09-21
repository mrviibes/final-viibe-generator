export type ParsedTags = { hard: string[]; soft: string[] };

export function parseTags(input: unknown): ParsedTags {
  if (input == null) return { hard: [], soft: [] };

  // flatten any supported type to a flat string
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (Array.isArray(input)) raw = input.join(", ");
  else if (typeof input === "object") {
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

  raw = raw.replace(/[""]/g, '"').replace(/['']/g, "'"); // ASCII quotes

  const items = raw.split(",").map(s => s.trim()).filter(Boolean);
  const hard: string[] = [];
  const soft: string[] = [];
  for (let t of items) {
    const isHard = /^".+"$/.test(t) || /^@.+/.test(t);
    const clean = t.replace(/^@/, "").replace(/^["']|["']$/g, "");
    (isHard ? hard : soft).push(clean);
  }
  return { hard, soft };
}