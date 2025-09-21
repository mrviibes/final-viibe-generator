const BLOCK = new Set(["Pets","Animals","Dog park","Kids","School","Teachers","Daycare"]);

export function normalizeRating(category: string, tone: string, rating: "PG"|"PG-13"|"R"|"Explicit") {
  if (tone === "Romantic" || tone === "Sentimental") return rating === "Explicit" ? "PG-13" : rating;
  if (BLOCK.has(category) && rating === "Explicit") return "R";
  return rating;
}

export function isExplicitBlocked(category: string): boolean {
  return BLOCK.has(category);
}