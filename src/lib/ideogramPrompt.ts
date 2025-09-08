import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

// Layout-aware prompt builders for overlay layouts
function buildLayoutAwarePrompt(layoutId: string, visualPrompt: string = ''): string {
  const layoutPrompts = {
    sideBarLeft: `${visualPrompt || 'family living room with cozy atmosphere'}, clear left panel (30-35% width), shift subject right`,
    lowerThird: `${visualPrompt || 'family living room with cozy atmosphere'}, leave bottom 25% completely clear and uncluttered for text banner`,
    memeTopBottom: `${visualPrompt || 'family living room with cozy atmosphere'}, clear top band and clear bottom band`,
    subtleCaption: `${visualPrompt || 'family living room with cozy atmosphere'}, clear narrow bottom strip`,
    badgeSticker: `${visualPrompt || 'family living room with cozy atmosphere'}, badge space top-right`,
    negativeSpace: `${visualPrompt || 'family living room with cozy atmosphere'}, clear empty area near largest margin`
  };
  
  return layoutPrompts[layoutId as keyof typeof layoutPrompts] || layoutPrompts.negativeSpace;
}

export function buildIdeogramPrompt(handoff: IdeogramHandoff, cleanBackground: boolean = false, noTextMode: boolean = false): string {
  const parts: string[] = [];
  
  if (cleanBackground || noTextMode) {
    // Clean background mode - NO TEXT in prompt, layout-aware background only
    const backgroundPrompt = handoff.chosen_visual || handoff.rec_background || 'family living room with cozy atmosphere';
    
    // Extract layout from design_notes if available
    const layoutMatch = handoff.design_notes?.match(/clear\s+(left\s+panel|lower\s+third|top\s+band|bottom\s+strip|badge\s+space)/i);
    let layoutId = 'negativeSpace';
    
    if (layoutMatch) {
      const layoutText = layoutMatch[1].toLowerCase();
      if (layoutText.includes('left panel')) layoutId = 'sideBarLeft';
      else if (layoutText.includes('lower third')) layoutId = 'lowerThird';
      else if (layoutText.includes('top band')) layoutId = 'memeTopBottom';
      else if (layoutText.includes('bottom strip')) layoutId = 'subtleCaption';
      else if (layoutText.includes('badge space')) layoutId = 'badgeSticker';
    }
    
    const layoutAwarePrompt = buildLayoutAwarePrompt(layoutId, backgroundPrompt);
    parts.push(layoutAwarePrompt);
    
  } else {
    // Normal mode - include text in prompt (legacy mode)
    if (handoff.key_line && handoff.key_line.trim()) {
      const normalizedText = normalizeTypography(handoff.key_line);
      parts.push(`Text: "${normalizedText}"`);
    }
    
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
    
    // Simple background instruction
    const background = handoff.rec_background || handoff.chosen_visual || "appropriate background";
    parts.push(`Background: ${background}`);
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
    'general': 'GENERAL',
    'pop-art': 'DESIGN'  // Fix: map pop-art to DESIGN
  };
  
  return styleMap[visualStyle?.toLowerCase()] || 'AUTO';
}