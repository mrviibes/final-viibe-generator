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
  caption_compliance?: {
    expected_text: string;
    detected_issues: Array<{ lane: string; issue: string; confidence: number }>;
  };
  text_rendering_failed?: boolean;
  should_retry_with_stronger_layout?: boolean;
  suggested_retry_layout?: string;
};

const bannedPhrases = [
  'random object',
  'empty room',
  'abstract shapes',
  'abstract geometric shapes',
  'person looking disappointed',
  'generic photo',
  'random everyday object',
  'empty chair',
  'prop with twist',
  'group of people laughing',
  'group of people',
  'bland filler props'
];

// Caption validation patterns for detecting garbled text
const garblingPatterns = [
  /\b[A-Z]{3,}\s[A-Z]{3,}\b/, // "THE PHUE A DR"
  /\b[A-Z]\s[A-Z]\s[A-Z]\b/, // "T H E"
  /\b\w+\d+\w*\b/, // "word2text"
  /[^a-zA-Z0-9\s'.,!?-]/, // Non-standard characters
  /(.)\1{3,}/, // Repeated characters like "aaaa"
];

const modeKeywords: Record<string, string[]> = {
  balanced: ['realistic', 'cinematic', 'lighting', 'photo', 'portrait', 'crowd', 'scene', 'polished'],
  cinematic: ['spotlight', 'motion blur', 'confetti', 'debris', 'dramatic', 'epic', 'bokeh', 'movie-poster', 'stage', 'blockbuster', 'glitter', 'smoke', 'lasers'],
  dynamic: ['running', 'leaping', 'jump', 'mid-air', 'midair', 'tripping', 'stumbling', 'flying', 'crashing', 'blowing out', 'bursting', 'mid-action', 'chaos'],
  surreal: ['impossible', 'floating', 'melting', 'warped', 'giant', 'dream', 'ethereal', 'levitating', 'phantom', 'disco ball', 'neon', 'fog'],
  chaos: ['mashup', 'absurd', 'unexpected', 'wild', 'glitch', 'glitchy', 'chaos', 'surprise', 'concert stage', 'bright palettes'],
  exaggerated: ['giant head', 'big-headed', 'tiny body', 'oversized', 'caricature', 'exaggerated', 'cartoonish', 'meme-friendly']
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

    // 3) Joke-tie validation (check if concept references key words from final text)
    const finalTextWords = context.final_text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hasJokeTie = finalTextWords.some(word => lower.includes(word)) || 
                       finalTextWords.length === 0; // Allow if no substantial words to match
    if (!hasJokeTie) {
      reasons.push('no_joke_connection');
      pass = false;
    }

    // 4) Caption compliance validation (if text is expected)
    if (context.final_text && context.final_text.trim()) {
      // Check for garbling patterns
      const hasGarbling = garblingPatterns.some(pattern => pattern.test(text));
      if (hasGarbling) {
        reasons.push('caption_text_garbled');
        pass = false;
      }

      // Basic text similarity check
      const expectedWords = context.final_text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const textWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const commonWords = expectedWords.filter(word => textWords.some(tw => tw.includes(word) || word.includes(tw)));
      
      // Make validation more realistic - don't fail every first attempt
      const similarityThreshold = context.layout_token === "memeTopBottom" ? 0.2 : 0.3;
      if (expectedWords.length > 0 && commonWords.length / expectedWords.length < similarityThreshold) {
        reasons.push('caption_text_mismatch');
        pass = false;
      }
    }

    // 5) Forbidden content
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
  
  // Check if text rendering specifically failed
  const textRenderingFailed = per_concept.some(p => 
    p.reasons.includes('caption_text_garbled') || 
    p.reasons.includes('caption_text_mismatch')
  );
  
  return { 
    overall_pass, 
    per_concept, 
    regenerate_mask, 
    batch_reasons,
    text_rendering_failed: textRenderingFailed,
    should_retry_with_stronger_layout: textRenderingFailed,
    suggested_retry_layout: textRenderingFailed ? 'memeTopBottom' : undefined
  };
}

// Enhanced caption validation functions
export function shouldRetry(validation: VisualValidation): boolean {
  return validation.text_rendering_failed || !validation.overall_pass;
}

export function validateCaptionMatch(expectedText: string, actualText: string): { exactMatch: boolean; legible: boolean; confidence: number; isSplit: boolean } {
  if (!expectedText || !actualText) {
    return { exactMatch: false, legible: false, confidence: 0, isSplit: false };
  }

  // Normalize both texts for comparison
  const normalizeText = (text: string) => 
    text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();

  const normalizedExpected = normalizeText(expectedText);
  const normalizedActual = normalizeText(actualText);

  // Check for text splitting patterns (common in failed meme renders)
  const splitPatterns = [
    /(.+)\s+(.+)\s+(.+)/, // Text split into 3+ fragments
    /^[A-Z\s]{2,10}$/, // Short all-caps fragments like "BAC IN THE DAY"
    /\b\w+\s+\w+\s+\w+\b.*\n.*\b\w+\s+\w+/, // Multi-line splits
  ];
  
  const isSplit = splitPatterns.some(pattern => pattern.test(actualText)) && 
                  actualText.split(/\s+/).length < expectedText.split(/\s+/).length * 0.7;

  // Check for garbling patterns
  const hasGarbling = garblingPatterns.some(pattern => pattern.test(actualText));
  if (hasGarbling || isSplit) {
    return { exactMatch: false, legible: false, confidence: 0, isSplit };
  }

  // Calculate similarity
  const expectedWords = normalizedExpected.split(' ').filter(w => w.length > 0);
  const actualWords = normalizedActual.split(' ').filter(w => w.length > 0);
  
  if (expectedWords.length === 0) {
    return { exactMatch: true, legible: true, confidence: 1, isSplit: false };
  }

  // Count matching words
  let matchingWords = 0;
  expectedWords.forEach(expectedWord => {
    if (actualWords.some(actualWord => 
      actualWord.includes(expectedWord) || 
      expectedWord.includes(actualWord) ||
      levenshteinDistance(expectedWord, actualWord) <= 1
    )) {
      matchingWords++;
    }
  });

  const confidence = matchingWords / expectedWords.length;
  const exactMatch = confidence >= 0.8; // 80% word match threshold
  const legible = confidence >= 0.5 && !hasGarbling && !isSplit; // Enhanced legibility check

  return { exactMatch, legible, confidence, isSplit };
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}
