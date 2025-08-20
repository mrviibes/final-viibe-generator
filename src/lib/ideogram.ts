export interface IdeogramHandoff {
  // Core fields
  style: string;            // visual_style
  occasion: string;         // subcategory_primary
  tone: string;             // tone
  key_line: string;         // final_line
  design_notes: string;     // Detailed notes with chosen visual and tags
  reference_tags: string;   // tags_csv

  // Extended fields
  category: string;            // category
  subcategory_primary: string; // subcategory_primary (same as occasion)
  subcategory_secondary?: string; // subcategory_secondary (only for pop-culture)
  visual_style: string;        // visual_style
  aspect_ratio: string;        // aspect_ratio
  text_tags_csv: string;       // text_tags_csv
  visual_tags_csv: string;     // visual_tags_csv
  ai_text_assist_used: boolean; // ai_text_assist_used
  ai_visual_assist_used: boolean; // ai_visual_assist_used
  chosen_visual?: string;      // chosen_visual
  
  // Visual AI Recommendations fields
  rec_subject?: string;        // AI recommended subject
  rec_background?: string;     // AI recommended background
}

export function buildIdeogramHandoff(params: {
  // Core parameters
  visual_style: string;
  subcategory: string;
  tone: string;
  final_line: string;
  tags_csv: string;
  chosen_visual?: string;
  
  // Extended parameters
  category: string;
  subcategory_secondary?: string;
  aspect_ratio: string;
  text_tags_csv: string;
  visual_tags_csv: string;
  ai_text_assist_used: boolean;
  ai_visual_assist_used: boolean;
  
  // Visual AI Recommendations
  rec_subject?: string;
  rec_background?: string;
}): IdeogramHandoff {
  const { 
    visual_style, 
    subcategory, 
    tone, 
    final_line, 
    tags_csv, 
    chosen_visual,
    category,
    subcategory_secondary,
    aspect_ratio,
    text_tags_csv,
    visual_tags_csv,
    ai_text_assist_used,
    ai_visual_assist_used,
    rec_subject,
    rec_background
  } = params;
  
  const baseNotes = "high contrast, clean layout, social safe margins, no logos";
  const visualConcept = chosen_visual ? ` | concept: ${chosen_visual}` : '';
  const tagReference = tags_csv ? ` | tags: ${tags_csv}` : '';
  
  return {
    // Core fields (maintaining backward compatibility)
    style: visual_style,
    occasion: subcategory,
    tone: tone,
    key_line: final_line,
    design_notes: `${baseNotes}${visualConcept}${tagReference}`,
    reference_tags: tags_csv,
    
    // Extended fields
    category: category,
    subcategory_primary: subcategory,
    subcategory_secondary: subcategory_secondary,
    visual_style: visual_style,
    aspect_ratio: aspect_ratio,
    text_tags_csv: text_tags_csv,
    visual_tags_csv: visual_tags_csv,
    ai_text_assist_used: ai_text_assist_used,
    ai_visual_assist_used: ai_visual_assist_used,
    chosen_visual: chosen_visual,
    
    // Visual AI Recommendations
    rec_subject: rec_subject,
    rec_background: rec_background
  };
}