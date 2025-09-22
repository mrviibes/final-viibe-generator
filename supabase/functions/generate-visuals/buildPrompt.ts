import { buildTextSizeInstructions, buildTextSizeNegativePrompt } from "./layoutConstraints.ts";

// Optimized prompt builder with text size constraints
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
  
  // Get text size constraints for this layout
  const textSizeInstructions = buildTextSizeInstructions(i.layout);
  const textSizeNegative = buildTextSizeNegativePrompt();
  
  // Streamlined prompt for better model performance
  return [
    `Caption: "${i.caption}"`,
    `Scene: ${ctx} (${i.layout} layout)`,
    `Tags: ${tags}`,
    textSizeInstructions,
    "Generate 4 distinct visual scene descriptions:",
    "1. Literal scene matching the caption",
    "2. Setting that complements the action", 
    "3. Exaggerated version for humor",
    "4. Creative artistic interpretation",
    `Avoid: ${textSizeNegative}`
  ].join("\n");
}