// Format validation - no keyword policing, only shape checks
export function toLines(raw: string): string[] {
  return raw.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4);
}

export function validate(lines: string[]) {
  if (lines.length !== 4) return false;
  return lines.every(s => {
    const words = s.split(/\s+/).filter(Boolean).length;
    const sentences = (s.match(/\./g) || []).length;
    return words > 4 && words <= 18 && sentences === 1;
  });
}