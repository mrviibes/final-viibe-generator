// Comedian voice selection system
import { VIIBE_CONFIG } from './config.ts';

export function selectComedianVoice(style: string, rating: string): string | null {
  if (!VIIBE_CONFIG.comedianVoices.enabledForAllStyles) {
    return null;
  }
  
  const voices = VIIBE_CONFIG.comedianVoices.banks[style];
  if (!voices || voices.length === 0) {
    // Fallback to punchline-first bank if style-specific bank not found
    const fallbackVoices = VIIBE_CONFIG.comedianVoices.banks['punchline-first'];
    if (!fallbackVoices || fallbackVoices.length === 0) {
      return null;
    }
    return fallbackVoices[Math.floor(Math.random() * fallbackVoices.length)];
  }
  
  // Select random voice from appropriate bank
  const randomIndex = Math.floor(Math.random() * voices.length);
  return voices[randomIndex];
}

export function selectVoicesForAllLines(style: string, rating: string, lineCount: number): string[] {
  if (!VIIBE_CONFIG.comedianVoices.alwaysRandomizePerLine) {
    const singleVoice = selectComedianVoice(style, rating);
    return Array(lineCount).fill(singleVoice || 'default');
  }
  
  // Select different voice for each line with structure variety enforcement
  const voices: string[] = [];
  const usedVoices = new Set<string>();
  
  for (let i = 0; i < lineCount; i++) {
    let selectedVoice = selectComedianVoice(style, rating) || 'default';
    
    // Ensure unique voices per batch if enforcement is enabled
    if (VIIBE_CONFIG.comedianVoices.enforceUniqueVoicesPerBatch) {
      let attempts = 0;
      while (usedVoices.has(selectedVoice) && attempts < 10) {
        selectedVoice = selectComedianVoice(style, rating) || 'default';
        attempts++;
      }
      usedVoices.add(selectedVoice);
    }
    
    voices.push(selectedVoice);
  }
  
  return voices;
}

export function selectVoicesForStructures(structures: string[]): string[] {
  const structureMapping = VIIBE_CONFIG.comedianVoices.structureMapping;
  const voices: string[] = [];
  const usedVoices = new Set<string>();
  
  for (const structure of structures) {
    const availableVoices = structureMapping[structure] || structureMapping['punchline_first'];
    let selectedVoice = availableVoices[Math.floor(Math.random() * availableVoices.length)];
    
    // Ensure unique voices
    let attempts = 0;
    while (usedVoices.has(selectedVoice) && attempts < 10) {
      selectedVoice = availableVoices[Math.floor(Math.random() * availableVoices.length)];
      attempts++;
    }
    
    usedVoices.add(selectedVoice);
    voices.push(selectedVoice);
  }
  
  return voices;
}

export function getVoiceInstructions(voice: string, style: string): string {
  if (voice === 'default' || !voice) {
    return `Write in ${style} style with strong comedic structure.`;
  }
  
  const voiceInstructions: Record<string, string> = {
    'kevin_hart': 'Channel Kevin Hart: high energy panic, animated physical reactions, self-roast first then roast others. "Man, listen!" openings.',
    'ali_wong': 'Channel Ali Wong: brutal honest observations, raw family/sex humor, unapologetic bold delivery with vivid imagery.',
    'bill_burr': 'Channel Bill Burr: working-class rant energy with "fuck off" attitude, confrontational truth-telling, gruff Boston edge.',
    'taylor_tomlinson': 'Channel Taylor Tomlinson: millennial anxiety storytelling with dating disaster punchlines and quarter-life crisis timing.',
    'chris_rock': 'Channel Chris Rock: sharp relationship observations with loud social commentary, clear setup-punchline structure.',
    'joan_rivers': 'Channel Joan Rivers: glamorous savage roasts with no sacred cows, cutting Hollywood insider wit with visual imagery.',
    'ricky_gervais': 'Channel Ricky Gervais: provocative boundary-pushing with deadpan British cruelty, irreverent mocking delivery.',
    'dave_chappelle': 'Channel Dave Chappelle: storytelling with social insights, character voices, vivid scene-setting with cultural perspective.',
    'wanda_sykes': 'Channel Wanda Sykes: dry sassy social commentary with everyday observations, sharp maternal wisdom delivery.',
    'anthony_jeselnik': 'Channel Anthony Jeselnik: dark deadpan one-liners with shocking twists, clinical precision in brutal punchlines.',
    'jim_gaffigan': 'Channel Jim Gaffigan: self-deprecating food and family humor with internal voice asides, relatable dad observations.',
    'hasan_minhaj': 'Channel Hasan Minhaj: cultural immigrant experience storytelling with political undertones, animated earnest delivery.',
    'nate_bargatze': 'Channel Nate Bargatze: clean folksy storytelling with innocent Southern observations, deadpan confused delivery.',
    'james_acaster': 'Channel James Acaster: absurd British tangents with quirky observations, theatrical confused storytelling energy.',
    'john_early': 'Channel John Early: theatrical dramatic over-reactions with camp delivery, exaggerated emotional breakdowns for comedy.',
    'john_mulaney': 'Channel John Mulaney: nostalgic precise storytelling with childlike wonder, clear narrative structure and timing.',
    'bo_burnham_clean': 'Channel Bo Burnham (clean): clever meta-humor wordplay with musical timing, self-aware performance anxiety.',
    'mike_birbiglia': 'Channel Mike Birbiglia: vulnerable awkward storytelling with conversational pacing, self-aware neurotic observations.',
    'demetri_martin': 'Channel Demetri Martin: dry one-liner wordplay with mathematical precision, observational wit with visual elements.',
    'patrice_oneal': 'Channel Patrice O\'Neal: brutally honest relationship observations with confrontational truth-telling, raw masculine perspective.',
    'sarah_silverman': 'Channel Sarah Silverman: dark humor with childlike innocent delivery, shocking content with sweet presentation.',
    'amy_schumer': 'Channel Amy Schumer: unapologetically dirty self-aware humor with relationship disasters and body-positive raunch.',
    'trevor_noah_clean': 'Channel Trevor Noah (clean): global cultural observations with accent humor, thoughtful social commentary delivery.',
    'norm_macdonald': 'Channel Norm MacDonald: bizarre deadpan with weird unexpected twists, anti-comedy timing with surreal logic.',
    'mitch_hedberg': 'Channel Mitch Hedberg: surreal one-liners with misdirection wordplay, stoned philosophical observations with rhythm.'
  };
  
  return voiceInstructions[voice] || `Write in ${style} style with ${voice} comedic approach.`;
}