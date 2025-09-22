// Text size constraints for different layout types
export interface TextSizeConstraint {
  layout: string;
  label: string;
  maxHeightPercent: number;
  maxWidthPercent: number;
  placement: string;
  fontSizeGuideline: string;
}

export const LAYOUT_CONSTRAINTS: TextSizeConstraint[] = [
  {
    layout: "negativeSpace",
    label: "Negative Space Layout", 
    maxHeightPercent: 25,
    maxWidthPercent: 90,
    placement: "single band at top or bottom",
    fontSizeGuideline: "medium sized, readable text that doesn't dominate"
  },
  {
    layout: "badge",
    label: "Badge Overlay",
    maxHeightPercent: 15,
    maxWidthPercent: 40,
    placement: "corner badge, compact design",
    fontSizeGuideline: "small, clean text in badge format"
  },
  {
    layout: "overlay",
    label: "Text Overlay",
    maxHeightPercent: 20,
    maxWidthPercent: 80,
    placement: "subtle overlay on image",
    fontSizeGuideline: "medium text with high contrast background"
  },
  {
    layout: "lowerThird",
    label: "Lower Third Band",
    maxHeightPercent: 25,
    maxWidthPercent: 90,
    placement: "bottom third of image",
    fontSizeGuideline: "clean readable text in lower section"
  },
  {
    layout: "minimal",
    label: "Minimal Caption",
    maxHeightPercent: 15,
    maxWidthPercent: 60,
    placement: "small unobtrusive placement",
    fontSizeGuideline: "small, elegant text that complements image"
  }
];

// Get constraints for a specific layout
export function getLayoutConstraints(layoutToken: string): TextSizeConstraint {
  const constraint = LAYOUT_CONSTRAINTS.find(c => 
    c.layout.toLowerCase() === layoutToken.toLowerCase() ||
    layoutToken.toLowerCase().includes(c.layout.toLowerCase())
  );
  
  // Default fallback with conservative 25% cap
  return constraint || {
    layout: "default",
    label: "Default Layout",
    maxHeightPercent: 25,
    maxWidthPercent: 80,
    placement: "balanced placement",
    fontSizeGuideline: "appropriately sized text that doesn't overwhelm"
  };
}

// Generate text size constraint instructions for prompts
export function buildTextSizeInstructions(layoutToken: string): string {
  const constraints = getLayoutConstraints(layoutToken);
  
  return [
    `TEXT SIZE CONSTRAINT: Caption must occupy no more than ${constraints.maxHeightPercent}% of image height.`,
    `Text placement: ${constraints.placement}.`,
    `Font sizing: ${constraints.fontSizeGuideline}.`,
    `CRITICAL: Text should complement the visual, not dominate it.`
  ].join(" ");
}

// Generate negative prompt additions to prevent oversized text
export function buildTextSizeNegativePrompt(): string {
  return [
    "no oversized text",
    "no full-screen captions", 
    "no text covering more than 25% of image",
    "no meme-style giant text",
    "no text that overwhelms the visual content"
  ].join(", ");
}