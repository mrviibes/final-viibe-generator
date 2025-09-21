// Minimal prompt builder - short, lane-based, no bloat
export function buildPrompt(i: {
  caption: string; 
  category: string; 
  sub: string; 
  layout: string;
  hardTags: string[]; 
  softTags: string[];
}) {
  const tags = i.hardTags.slice(0, 5).join(", ") || "none";
  const themes = i.softTags.slice(0, 5).join(" | ") || "none";
  return [
    "Return 4 lines only. One sentence each. Max 18 words. No lists.",
    "Lane1 literal from caption keywords. Lane2 category context.",
    "Lane3 funny exaggeration. Lane4 funny absurd.",
    "Do not echo soft tags literally.",
    `Caption: "${i.caption}"`,
    `Category: ${i.category} / ${i.sub}`,
    `Layout: ${i.layout}`,
    `Hard tags: ${tags}`,
    `Themes: ${themes}`
  ].join("\n");
}