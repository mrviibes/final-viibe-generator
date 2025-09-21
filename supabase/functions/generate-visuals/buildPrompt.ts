// Optimized prompt builder - shorter, faster, more reliable
export function buildPrompt(i: {
  caption: string; 
  category: string; 
  sub: string; 
  layout: string;
  hardTags: string[]; 
  softTags: string[];
}) {
  const tags = i.hardTags.slice(0, 3).join(", ") || "none";
  const ctx = `${i.category}/${i.sub}`;
  
  // Simplified prompt structure for faster processing
  return [
    "4 visual concepts, 1 sentence each, max 15 words:",
    `Caption: "${i.caption}"`,
    `Context: ${ctx} with ${i.layout} layout`,
    `Tags: ${tags}`,
    "Line1: literal scene. Line2: context setting. Line3: exaggerated. Line4: absurd twist."
  ].join("\n");
}