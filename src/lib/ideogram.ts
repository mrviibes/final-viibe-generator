export interface IdeogramHandoff {
  style: string;
  occasion: string;
  tone: string;
  key_line: string;
  design_notes: string;
  reference_tags: string;
}

export function buildIdeogramHandoff(params: {
  visual_style: string;
  subcategory: string;
  tone: string;
  final_line: string;
  tags_csv: string;
  chosen_visual?: string;
}): IdeogramHandoff {
  const { visual_style, subcategory, tone, final_line, tags_csv, chosen_visual } = params;
  
  const baseNotes = "high contrast, clean layout, social safe margins, no logos";
  const visualNotes = chosen_visual ? `, visual concept: ${chosen_visual}` : "";
  
  return {
    style: visual_style,
    occasion: subcategory,
    tone: tone,
    key_line: final_line,
    design_notes: baseNotes + visualNotes,
    reference_tags: tags_csv
  };
}