import { ParsedTags } from "./tags.ts";

export function validate(lines: string[], tags: ParsedTags) {
  const basic = lines.length === 4 && lines.every(l =>
    l.length >= 40 && l.length <= 100 &&
    (l.match(/\./g) || []).length === 1 &&
    !/[—]/.test(l)
  );
  if (!basic) return false;

  if (tags.hard.length) {
    const hits = lines.map(l => tags.hard.every(h => l.toLowerCase().includes(h.toLowerCase())));
    if (hits.filter(Boolean).length < 3) return false;
  }
  return true;
}