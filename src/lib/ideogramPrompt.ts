import { IdeogramHandoff } from './ideogram';

export function buildIdeogramPrompt(handoff: IdeogramHandoff): string {
  const parts: string[] = [];
  
  // Auto-style and display text prominently, matching tone, visual look, size, color, and placement on the image.
  parts.push("Auto-style and display text prominently, matching tone, visual look, size, color, and placement on the image.");
  
  // Use this exact text: [FINAL TEXT].
  if (handoff.key_line) {
    parts.push(`Use this exact text: ${handoff.key_line}.`);
  }
  
  // This content is for [CATEGORY], specifically [SUBCATEGORY][ (SECOND SUBCATEGORY if Pop Culture) ].
  let contentLine = `This content is for ${handoff.category}, specifically ${handoff.subcategory_primary}`;
  if (handoff.category === 'pop-culture' && handoff.subcategory_secondary) {
    contentLine += ` (${handoff.subcategory_secondary})`;
  }
  contentLine += '.';
  parts.push(contentLine);
  
  // The overall tone is [TONE].
  if (handoff.tone) {
    parts.push(`The overall tone is ${handoff.tone}.`);
  }
  
  // Apply these text tags as guides: [TEXT TAGS].
  const textTags = handoff.text_tags_csv && handoff.text_tags_csv !== "None" ? handoff.text_tags_csv : "none";
  parts.push(`Apply these text tags as guides: ${textTags}.`);
  
  // Render the scene in [VISUAL LOOK] style.
  if (handoff.visual_style) {
    parts.push(`Render the scene in ${handoff.visual_style} style.`);
  }
  
  // Include these visual tags: [VISUAL TAGS].
  if (handoff.visual_tags_csv) {
    parts.push(`Include these visual tags: ${handoff.visual_tags_csv}.`);
  }
  
  // Background should be [AI GENERATED BACKGROUND].
  let background = handoff.rec_background || handoff.chosen_visual || "a clean, contextually appropriate background";
  parts.push(`Background should be ${background}.`);
  
  // Output format should use aspect ratio [ASPECT RATIO].
  if (handoff.aspect_ratio) {
    parts.push(`Output format should use aspect ratio ${handoff.aspect_ratio}.`);
  }
  
  // Ensure the text is clearly visible, balanced with the artwork, and styled to fit the chosen tone and tags.
  parts.push("Ensure the text is clearly visible, balanced with the artwork, and styled to fit the chosen tone and tags.");
  
  return parts.join(' ');
}

export function getAspectRatioForIdeogram(aspectRatio: string): 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1' {
  const ratioMap: Record<string, 'ASPECT_10_16' | 'ASPECT_16_10' | 'ASPECT_9_16' | 'ASPECT_16_9' | 'ASPECT_3_2' | 'ASPECT_2_3' | 'ASPECT_4_3' | 'ASPECT_3_4' | 'ASPECT_1_1' | 'ASPECT_1_3' | 'ASPECT_3_1'> = {
    'Portrait': 'ASPECT_9_16',
    'Landscape': 'ASPECT_16_9',
    'Square': 'ASPECT_1_1',
    'Tall': 'ASPECT_10_16',
    'Wide': 'ASPECT_16_10'
  };
  
  return ratioMap[aspectRatio] || 'ASPECT_16_9';
}

export function getStyleTypeForIdeogram(visualStyle: string): 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME' {
  const styleMap: Record<string, 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'RENDER_3D' | 'ANIME'> = {
    'realistic': 'REALISTIC',
    'cartoon': 'ANIME',
    'design': 'DESIGN',
    '3d': 'RENDER_3D',
    'general': 'GENERAL'
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}