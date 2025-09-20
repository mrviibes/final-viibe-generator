// Comedian voice selection system
import { VIIBE_CONFIG } from './config.ts';

export function selectComedianVoice(tone: string, rating: string): string | null {
  if (!VIIBE_CONFIG.comedianVoices.enabledForAllTones) {
    return null;
  }
  
  const voices = VIIBE_CONFIG.comedianVoices.banks[tone];
  if (!voices || voices.length === 0) {
    // Fallback to Humorous bank if tone-specific bank not found
    const fallbackVoices = VIIBE_CONFIG.comedianVoices.banks.Humorous;
    if (!fallbackVoices || fallbackVoices.length === 0) {
      return null;
    }
    return fallbackVoices[Math.floor(Math.random() * fallbackVoices.length)];
  }
  
  // Select random voice from appropriate bank
  const randomIndex = Math.floor(Math.random() * voices.length);
  return voices[randomIndex];
}

export function selectVoicesForAllLines(tone: string, rating: string, lineCount: number): string[] {
  if (!VIIBE_CONFIG.comedianVoices.alwaysRandomizePerLine) {
    const singleVoice = selectComedianVoice(tone, rating);
    return Array(lineCount).fill(singleVoice || 'default');
  }
  
  // Select different voice for each line
  const voices: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    voices.push(selectComedianVoice(tone, rating) || 'default');
  }
  
  return voices;
}

export function getVoiceInstructions(voice: string, tone: string): string {
  if (voice === 'default' || !voice) {
    return `Write in a ${tone.toLowerCase()} tone.`;
  }
  
  const voiceInstructions: Record<string, string> = {
    'kevin_hart': 'Write like Kevin Hart - energetic, self-deprecating, animated storytelling style',
    'ali_wong': 'Write like Ali Wong - bold, unapologetic, brutally honest observations',
    'bill_burr': 'Write like Bill Burr - gruff, confrontational, working-class perspective',
    'taylor_tomlinson': 'Write like Taylor Tomlinson - millennial anxiety, dating disasters, quarter-life crisis',
    'chris_rock': 'Write like Chris Rock - sharp social commentary, relationship observations',
    'joan_rivers': 'Write like Joan Rivers - glamorous but cutting, no sacred cows',
    'ricky_gervais': 'Write like Ricky Gervais - irreverent, boundary-pushing, provocative',
    'dave_chappelle': 'Write like Dave Chappelle - storytelling with social insights',
    'wanda_sykes': 'Write like Wanda Sykes - dry wit, everyday observations',
    'anthony_jeselnik': 'Write like Anthony Jeselnik - dark, deadpan, shocking one-liners',
    'jim_gaffigan': 'Write like Jim Gaffigan - self-deprecating food and family humor',
    'hasan_minhaj': 'Write like Hasan Minhaj - cultural observations, immigrant experience',
    'nate_bargatze': 'Write like Nate Bargatze - clean, folksy storytelling',
    'james_acaster': 'Write like James Acaster - absurd tangents, British quirky observations',
    'john_early': 'Write like John Early - theatrical, dramatic, over-the-top reactions',
    'john_mulaney': 'Write like John Mulaney - nostalgic storytelling, precise observations',
    'bo_burnham_clean': 'Write like Bo Burnham but keep it clean - clever wordplay, meta-humor',
    'mike_birbiglia': 'Write like Mike Birbiglia - vulnerable storytelling, awkward situations',
    'demetri_martin': 'Write like Demetri Martin - one-liners, wordplay, observational wit',
    'ellen': 'Write like Ellen DeGeneres - upbeat, relatable, everyday situations',
    'trevor_noah_clean': 'Write like Trevor Noah but keep it clean - cultural observations, accent humor',
    'hannah_gadsby_clean': 'Write like Hannah Gadsby but keep it clean - thoughtful, self-aware observations'
  };
  
  return voiceInstructions[voice] || `Write in a ${tone.toLowerCase()} tone with ${voice} style.`;
}