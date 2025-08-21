import { IdeogramHandoff } from './ideogram';

export function buildIdeogramPrompt(handoff: IdeogramHandoff): string {
  const parts: string[] = [];
  
  // Put the exact text as the VERY FIRST sentence to ensure it renders
  if (handoff.key_line && handoff.key_line.trim()) {
    const sanitizedText = handoff.key_line.replace(/"/g, '\\"');
    parts.push(`EXACT_TEXT (VERBATIM): "${sanitizedText}"`);
    parts.push("Render this text EXACTLY as written, character-for-character, with no spelling changes, no extra words, no missing words.");
    parts.push("Use only standard ASCII punctuation (straight quotes, regular apostrophes, hyphens). Maintain exact case and spacing.");
    parts.push("Style and display this text prominently with clear, legible typography on a realistic background.");
  } else {
    // For images without text, focus on visual elements only
    parts.push("Create a visual composition without any text or typography overlays.");
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
  
  // Only add text visibility instructions if there's actual text content
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push("Ensure the text is clearly visible, balanced with the artwork, and styled to fit the chosen tone and tags.");
    parts.push("NEGATIVE PROMPTS: No typos, no misspellings, no ligatures, no altered punctuation, no text variations.");
  } else {
    parts.push("Focus on creating a balanced visual composition that fits the chosen tone and tags.");
  }
  
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