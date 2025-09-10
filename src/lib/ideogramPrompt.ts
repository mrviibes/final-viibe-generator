import { IdeogramHandoff } from './ideogram';
import { normalizeTypography } from './textUtils';

export function buildIdeogramPrompt(handoff: IdeogramHandoff, options: { 
  cleanBackground?: boolean; 
  injectText?: boolean; 
  useLayoutTokens?: boolean;
  gentleLayoutPhrasing?: boolean;
} = {}): string {
  const { 
    cleanBackground = false, 
    injectText = false, 
    useLayoutTokens = true,
    gentleLayoutPhrasing = false 
  } = options;
  
  const parts: string[] = [];
  
  // Add basic visual elements if present
  if (handoff.visual_style) {
    parts.push(`Style: ${handoff.visual_style}`);
  }
  
  if (handoff.chosen_visual) {
    let visual = handoff.chosen_visual;
    
    // Replace harsh layout tokens with gentler phrasing if requested
    if (gentleLayoutPhrasing && useLayoutTokens) {
      visual = visual.replace(/clear empty area near largest margin/gi, 'composition with ample negative space for text overlay');
      visual = visual.replace(/clear top band/gi, 'space at top for text');
      visual = visual.replace(/clear bottom band/gi, 'space at bottom for text');
      visual = visual.replace(/clear lower third/gi, 'open area in lower portion');
      visual = visual.replace(/clear left panel/gi, 'space on left side');
      visual = visual.replace(/badge space top-right/gi, 'corner area for badge');
      visual = visual.replace(/clear narrow bottom strip/gi, 'subtle space at bottom');
    } else if (!useLayoutTokens) {
      // Remove layout tokens entirely
      visual = visual.replace(/,?\s*(clear empty area near largest margin|clear top band|clear bottom band|clear lower third|clear left panel|badge space top-right|clear narrow bottom strip)/gi, '');
      visual = visual.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
    }
    
    parts.push(`Visual: ${visual}`);
  }
  
  if (handoff.text_tags_csv && handoff.text_tags_csv !== "None") {
    parts.push(`Tags: ${handoff.text_tags_csv}`);
  }
  
  if (handoff.visual_tags_csv) {
    parts.push(`Visual tags: ${handoff.visual_tags_csv}`);
  }
  
  // Background-only instruction for clean overlay text
  const background = handoff.rec_background || handoff.chosen_visual || "appropriate background";
  if (!handoff.chosen_visual) {
    parts.push(`Background: ${background}`);
  }
  
  // Only include the final text in the prompt if explicitly requested
  if (injectText && handoff.key_line && handoff.key_line.trim()) {
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