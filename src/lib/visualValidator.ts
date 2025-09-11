// Visual Validator - prevents filler outputs and enforces mode compliance
export type VisualContext = {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string; // balanced | cinematic | dynamic | surreal | chaos | exaggerated
  layout_token: string;
};

export type VisualConcept = { lane: string; text?: string; prompt?: string };

export type VisualValidation = {
  overall_pass: boolean;
  per_concept: Array<{ lane: string; pass: boolean; reasons: string[] }>;
  regenerate_mask: boolean[];
  batch_reasons: string[];
};

const bannedPhrases = [
  'random object',
  'empty room',
  'abstract shapes',
  'person looking disappointed',
  'generic photo',
  'random everyday object',
  'empty chair'
];

const modeKeywords: Record<string, string[]> = {
  balanced: ['realistic', 'cinematic', 'lighting', 'photo', 'portrait', 'crowd', 'scene'],
  cinematic: ['spotlight', 'motion blur', 'confetti', 'debris', 'dramatic', 'epic', 'bokeh'],
  dynamic: ['running', 'leaping', 'jump', 'mid-air', 'midair', 'tripping', 'stumbling', 'flying', 'crashing'],
  surreal: ['impossible', 'floating', 'melting', 'warped', 'giant', 'dream', 'ethereal', 'levitating', 'phantom'],
  chaos: ['mashup', 'absurd', 'unexpected', 'wild', 'glitch', 'glitchy', 'chaos', 'surprise'],
  exaggerated: ['giant head', 'big-headed', 'tiny body', 'oversized', 'caricature', 'exaggerated']
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?'"()\[\]-]/g, '').trim();
}

export function validateVisualBatch(context: VisualContext, concepts: VisualConcept[]): VisualValidation {
  const per_concept: Array<{ lane: string; pass: boolean; reasons: string[] }> = [];
  const regenerate_mask: boolean[] = [];

  // Per concept checks
  for (const c of concepts) {
    const text = (c.text || c.prompt || '').trim();
    const lower = text.toLowerCase();
    const reasons: string[] = [];
    let pass = true;

    // 1) Ban obvious filler phrases
    if (bannedPhrases.some(p => lower.includes(p))) {
      reasons.push('filler_phrase');
      pass = false;
    }

    // 2) Mode compliance (best-effort keywords)
    const mode = (context.mode || 'balanced').toLowerCase();
    const keywords = modeKeywords[mode] || [];
    if (keywords.length && !keywords.some(k => lower.includes(k))) {
      reasons.push('mode_noncompliant');
      pass = false;
    }

    // 3) Forbidden content
    if (/watermark|logo|on-image text/i.test(text)) {
      reasons.push('forbidden_content');
      pass = false;
    }

    per_concept.push({ lane: c.lane, pass, reasons });
    regenerate_mask.push(!pass);
  }

  // Batch-level variety check (no exact duplicates)
  const normalized = concepts.map(c => normalize((c.text || c.prompt || '')));
  const unique = new Set(normalized.filter(Boolean));
  const batch_reasons: string[] = [];
  if (unique.size < Math.min(3, normalized.length)) {
    batch_reasons.push('duplicate_premise');
  }

  // If duplicates found, mark the duplicates for regeneration (except the first occurrence)
  if (batch_reasons.includes('duplicate_premise')) {
    const seen = new Set<string>();
    normalized.forEach((n, idx) => {
      if (seen.has(n)) {
        regenerate_mask[idx] = true;
      } else {
        seen.add(n);
      }
    });
  }

  const overall_pass = per_concept.every(p => p.pass) && batch_reasons.length === 0;
  return { overall_pass, per_concept, regenerate_mask, batch_reasons };
}
