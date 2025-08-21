import { IdeogramHandoff } from './ideogram';

export function buildIdeogramPrompt(handoff: IdeogramHandoff): string {
  const parts: string[] = [];
  
  // Strict text control - only render specified text, nothing else
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push(`Display only this text: "${handoff.key_line}". Do not add any other text, labels, tags, or typography.`);
  } else {
    parts.push("Create a visual composition with no text, typography, or written elements whatsoever.");
  }
  
  // Content context for visual composition
  let contentLine = `Create content for ${handoff.category}, specifically ${handoff.subcategory_primary}`;
  if (handoff.category === 'pop-culture' && handoff.subcategory_secondary) {
    contentLine += ` (${handoff.subcategory_secondary})`;
  }
  contentLine += '.';
  parts.push(contentLine);
  
  // Tone as visual mood guidance
  if (handoff.tone) {
    parts.push(`Visual mood and atmosphere should convey ${handoff.tone}.`);
  }
  
  // Text tags as visual styling guidance only
  const textTags = handoff.text_tags_csv && handoff.text_tags_csv !== "None" ? handoff.text_tags_csv : "none";
  if (textTags !== "none") {
    parts.push(`Use these concepts for visual styling inspiration only (do not render as text): ${textTags}.`);
  }
  
  // Visual style directive
  if (handoff.visual_style) {
    parts.push(`Render in ${handoff.visual_style} visual style.`);
  }
  
  // Visual tags as composition guidance
  if (handoff.visual_tags_csv) {
    parts.push(`Incorporate these visual elements and themes: ${handoff.visual_tags_csv}.`);
  }
  
  // Background specification
  let background = handoff.rec_background || handoff.chosen_visual || "a clean, contextually appropriate background";
  parts.push(`Background: ${background}.`);
  
  // Aspect ratio requirement
  if (handoff.aspect_ratio) {
    parts.push(`Use ${handoff.aspect_ratio} aspect ratio.`);
  }
  
  // Final composition instructions
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push("Make the specified text prominent and readable while maintaining visual balance. Absolutely no additional text elements.");
  } else {
    parts.push("Focus purely on visual composition with no text elements. Create a clean, impactful design.");
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