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
  
  // Enhanced prompt structure with text size controls
  return [
    "Generate 4 visual concepts for image generation, 1 sentence each, max 15 words:",
    `Caption to include: "${i.caption}"`,
    `Context: ${ctx} with ${i.layout} layout`,
    `Tags: ${tags}`,
    textSizeInstructions,
    "Line1: literal scene with appropriately sized text.",
    "Line2: context setting with balanced text placement.", 
    "Line3: exaggerated scene with controlled text size.",
    "Line4: creative twist with complementary text sizing.",
    `AVOID: ${textSizeNegative}`
  ].join("\n");
}