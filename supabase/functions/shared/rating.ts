const explicitBlocked = new Set(["Pets","Animals","Dog park","Kids","School","Teachers","Daycare"]);

export function normalizeRating(category: string, tone: string, rating: "PG"|"PG-13"|"R"|"Explicit") {
  if (tone === "Sentimental" && rating === "Explicit") return "PG-13";
  if (explicitBlocked.has(category) && rating === "Explicit") return "R";
  return rating;
}

export function isExplicitBlocked(category: string): boolean {
  return explicitBlocked.has(category);
}