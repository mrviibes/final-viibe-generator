import { supabase } from "@/integrations/supabase/client";

interface SingleGenerationInputs {
  category: string;
  subcategory: string;
  tone: string;
  style: string;
  rating: string;
  tags: string | string[] | { hard: string[], soft: string[] };
}

interface SingleGenerationResult {
  success: boolean;
  options: string[];
  model?: string;
  timing?: {
    total_ms: number;
  };
}

export async function generateSingleMode(inputs: SingleGenerationInputs): Promise<SingleGenerationResult> {
  console.log('🎯 Single mode generation with:', { style: inputs.style, rating: inputs.rating });
  
  // Normalize tags
  let hardTags: string[] = [];
  let softTags: string[] = [];
  
  if (typeof inputs.tags === 'string') {
    // Parse string format
    const items = inputs.tags.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach(tag => {
      const normalizedTag = tag.replace(/[""]/g, '"').replace(/['']/g, "'").trim();
      const isHard = /^".+"$/.test(normalizedTag) || /^@/.test(normalizedTag);
      const cleanTag = normalizedTag.replace(/^@/, "").replace(/^["']|["']$/g, "").trim();
      
      if (cleanTag) {
        if (isHard) {
          hardTags.push(cleanTag);
        } else {
          softTags.push(cleanTag);
        }
      }
    });
  } else if (Array.isArray(inputs.tags)) {
    // Array format
    inputs.tags.forEach(tag => {
      const normalizedTag = String(tag).replace(/[""]/g, '"').replace(/['']/g, "'").trim();
      const isHard = /^".+"$/.test(normalizedTag) || /^@/.test(normalizedTag);
      const cleanTag = normalizedTag.replace(/^@/, "").replace(/^["']|["']$/g, "").trim();
      
      if (cleanTag) {
        if (isHard) {
          hardTags.push(cleanTag);
        } else {
          softTags.push(cleanTag);
        }
      }
    });
  } else if (typeof inputs.tags === 'object' && inputs.tags !== null) {
    // Already structured
    const tagObj = inputs.tags as any;
    hardTags = tagObj.hard || [];
    softTags = tagObj.soft || [];
  }

  const payload = {
    category: inputs.category,
    subcategory: inputs.subcategory,
    tone: inputs.tone,
    style: inputs.style,
    rating: inputs.rating,
    tags: { hard: hardTags, soft: softTags },
    mode: 'single'
  };

  console.log('📤 Sending single-mode payload:', payload);

  try {
    const { data, error } = await supabase.functions.invoke('generate-step2-clean', {
      body: payload
    });

    if (error) {
      console.error('❌ Single generation error:', error);
      throw new Error(`Generation failed: ${error.message}`);
    }

    if (!data?.success) {
      console.error('❌ Single generation unsuccessful:', data);
      throw new Error('Generation was not successful');
    }

    console.log('✅ Single generation successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Single generation failed:', error);
    throw error;
  }
}