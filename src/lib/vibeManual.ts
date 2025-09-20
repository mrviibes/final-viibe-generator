// Vibe Maker Model Operating Manual Implementation
import { analyzeContext } from '@/lib/contextDetector';
import { generateContextualFallback } from '@/lib/contextLexicon';

export const systemPrompt = `You are the Vibe Maker writer. Produce a single line under 100 characters based on user choices. Follow the tone guide. Use tags as hints, not as a list. Be witty or sincere as required, never cruel. No emojis. No hashtags. No quotation marks. No newlines. No profanity or slurs. No hate or harassment. No sexual content about minors. No doxxing or personal data. Output JSON only in this exact shape: {"line":"..."} Nothing else.`;

export interface VibeInputs {
  category: string;
  subcategory: string;
  tone: string;
  tags?: string[];
  recipient_name?: string;
  relationship?: string;
  language?: string;
}

export function buildDeveloperPrompt(inputs: VibeInputs): string {
  const {
    category,
    subcategory,
    tone,
    tags = [],
    recipient_name = "-",
    relationship = "-",
    language = "English"
  } = inputs;

  // Use imported context analysis
  
  // Analyze context for enhanced prompting
  const contextAnalysis = analyzeContext(
    `${category} ${subcategory} ${recipient_name} ${relationship}`,
    category,
    subcategory,
    tags,
    tone
  );

  const tagsCSV = tags.join(', ');
  
  // Enhanced instructions for movie/pop culture + quotes
  const isMovie = category === "pop culture" && subcategory?.toLowerCase().includes("movie");
  const hasQuotes = tags.some(tag => tag.toLowerCase().includes("quote"));
  const hasPersonalRoast = tags.some(tag => tag.toLowerCase().includes("making fun") || tag.toLowerCase().includes("bald") || tag.toLowerCase().includes("roast"));

  let specialInstructions = "";
  if (isMovie && hasQuotes) {
    specialInstructions = " When creating content about a specific movie with quote tags, reference the movie's iconic characters, themes, or memorable elements. Make it sound like it could be dialogue or a reference from that movie's universe.";
  }
  if (hasPersonalRoast && recipient_name !== "-") {
    specialInstructions += ` Incorporate ${recipient_name} naturally into the movie context while maintaining the roasting tone.`;
  }

  // Add contextual enhancements
  if (contextAnalysis.detectedContext) {
    const ctx = contextAnalysis.detectedContext;
    specialInstructions += ` CONTEXT: ${ctx.primary}${ctx.secondary ? ` (${ctx.secondary})` : ''}. `;
    
    if (ctx.lexiconWords.length > 0) {
      specialInstructions += `Use authentic vocabulary: ${ctx.lexiconWords.slice(0, 3).join(', ')}. `;
    }
    
    // Add contextual prompt additions
    if (contextAnalysis.contextualPromptAdditions.length > 0) {
      specialInstructions += contextAnalysis.contextualPromptAdditions.join('. ') + '. ';
    }
  }

  // Log generation recipe
  console.log('🧪 GENERATION RECIPE - Vibe Manual:', JSON.stringify(contextAnalysis.generationRecipe, null, 2));

  return `Context
Category: ${category} > ${subcategory}
Tone: ${tone}
Recipient: ${recipient_name}
Relationship: ${relationship}
Language: ${language}
Tags: ${tagsCSV}
HardLimit: 100 characters
${contextAnalysis.detectedContext ? `Lexicon: ${contextAnalysis.suggestedLexicon.join(', ')}` : ''}

Instructions
Write ONE original line for the subcategory above in the selected tone. Stay under 100 characters including spaces. Use plain text. No emojis, hashtags, quotes, or newlines. Use tags as content hints. Do not list the tags. If any tag is unsafe, ignore it and continue.${specialInstructions} Return JSON only.`;
}

export const fewShotAnchors = `

Examples:
Birthday, Savage: {"line":"30 already? Sprint to the cake for once, Alex."}
Birthday, Humorous: {"line":"Happy birthday, Alex. Your warranty expired years ago."}
Birthday, Playful: {"line":"Happy birthday, Alex. Cake speedrun starts now."}
Birthday, Sentimental: {"line":"Happy birthday, Alex. Grateful for every laugh this year."}
Sports, Humorous: {"line":"Congrats on the W. Your victory lap was longer than cardio day."}
Daily life, Serious: {"line":"Proud of your grind. Small steps, better habits, steady wins."}
Pop Culture Movies, Savage: {"line":"Jesse's head shinier than Zohan's silky smooth moves."}
Pop Culture Movies, Humorous: {"line":"Even Zohan couldn't save Jesse's hairline from retirement."}`;

export const fallbackByTone: Record<string, string> = {
  humorous: "Short and witty like you asked",
  savage: "Bold and direct as requested",
  sentimental: "Heartfelt message coming right up",
  nostalgic: "Memory lane vibes activated",
  romantic: "Sweet words in progress",
  inspirational: "Motivational mode engaged",
  playful: "Fun and light as ordered",
  serious: "Thoughtful message loading"
};

// CONTEXT-AWARE FALLBACK GENERATOR
export function getContextualFallback(
  tone: string,
  category: string,
  subcategory: string,
  tags: string[] = []
): string {
  // Use imported functions
  
  // Analyze context for contextual fallback
  const contextAnalysis = analyzeContext(
    `${category} ${subcategory}`,
    category,
    subcategory,
    tags,
    tone
  );
  
  if (contextAnalysis.detectedContext?.secondary) {
    const contextualFallbacks = generateContextualFallback(
      contextAnalysis.detectedContext.secondary,
      tone,
      'PG-13'
    );
    
    if (contextualFallbacks.length > 0) {
      console.log('🎯 Using contextual fallback for:', contextAnalysis.detectedContext.secondary);
      return contextualFallbacks[0];
    }
  }
  
  // Fallback to tone-based generic
  return fallbackByTone[tone.toLowerCase()] || fallbackByTone.playful;
}

// Banned patterns and words
export const bannedPatterns = [
  /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, // emojis
  /#\w+/g, // hashtags
  /["'""`]/g, // quotes
  /\n|\r/g // newlines
];

export const bannedWords = [
  'shit', 'fuck', 'damn', 'bitch', 'ass', 'hell',
  'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat'
];