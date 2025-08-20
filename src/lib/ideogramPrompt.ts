import { IdeogramHandoff } from './ideogram';

export function buildIdeogramPrompt(handoff: IdeogramHandoff): string {
  const parts: string[] = [];
  
  // Start with the chosen text/key line
  if (handoff.key_line) {
    parts.push(`"${handoff.key_line}"`);
  }
  
  // Add chosen visual concept if available
  if (handoff.chosen_visual && handoff.chosen_visual !== "put final visual image here") {
    parts.push(`Visual concept: ${handoff.chosen_visual}`);
  }
  
  // Add visual style
  if (handoff.visual_style) {
    parts.push(`Style: ${handoff.visual_style}`);
  }
  
  // Add visual tags
  if (handoff.visual_tags_csv) {
    parts.push(`Visual elements: ${handoff.visual_tags_csv}`);
  }
  
  // Add text tags if they provide context
  if (handoff.text_tags_csv && handoff.text_tags_csv !== "None") {
    parts.push(`Context: ${handoff.text_tags_csv}`);
  }
  
  // Add category/occasion context
  if (handoff.category && handoff.occasion) {
    parts.push(`Occasion: ${handoff.category} - ${handoff.occasion}`);
  }
  
  // Add tone
  if (handoff.tone) {
    parts.push(`Tone: ${handoff.tone}`);
  }
  
  // Add design notes (always includes no logos, clean layout, etc.)
  if (handoff.design_notes) {
    parts.push(handoff.design_notes);
  }
  
  return parts.join(', ');
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