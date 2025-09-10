import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false): string {
  const parts: string[] = [];
  
  // REMOVED: No longer inject text into image prompt to prevent baked-in text
  // Text will be overlaid separately to ensure clean backgrounds
  
  // Add basic visual elements if present
  if (handoff.visual_style) {
    parts.push(`Style: ${handoff.visual_style}`);
  }
  
  if (handoff.chosen_visual) {
    parts.push(`Visual: ${handoff.chosen_visual}`);
  }
  
  if (handoff.text_tags_csv && handoff.text_tags_csv !== "None") {
    parts.push(`Tags: ${handoff.text_tags_csv}`);
  }
  
  if (handoff.visual_tags_csv) {
    parts.push(`Visual tags: ${handoff.visual_tags_csv}`);
  }
  
  // Background-only instruction for clean overlay text
  const background = handoff.rec_background || handoff.chosen_visual || "appropriate background";
  parts.push(`Background: ${background}`);
  
  // Include the final text in the prompt if present
  if (handoff.key_line && handoff.key_line.trim()) {
    parts.push(`Include the phrase: "${handoff.key_line}"`);
  }
  
  return parts.join('. ');
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