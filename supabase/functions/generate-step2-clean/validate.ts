import { ParsedTags } from "./tags.ts";

export function validate(lines: string[], tags: ParsedTags) {
  // FIRST: Reject any lines that start with category metadata
  const hasLeakage = lines.some(l => 
    /^(Celebrations|Daily Life|Sports|Work|Entertainment)\s*>/i.test(l) ||
    /^.*>\s*\w+/i.test(l)
  );
  if (hasLeakage) {
    console.log('❌ Validation failed: Category metadata leaked into joke text');
    return false;
  }

  // Basic format: 40-100 chars, one sentence, no commas, no em dashes, starts with capital
  const basic = lines.length === 4 && lines.every(l =>
    /^[A-Z]/.test(l) &&
    l.length >= 40 && l.length <= 100 &&
    (l.match(/\./g) || []).length === 1 &&
    !/[,—]/.test(l)
  );
  if (!basic) return false;

  // Hard tag validation: must appear in at least 3 of 4 lines
  if (tags.hard.length > 0) {
    const hits = lines.filter(l => 
      tags.hard.every(h => l.toLowerCase().includes(h.toLowerCase()))
    ).length;
    if (hits < 3) return false;
  }
  
  return true;
}