import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Import size validation utilities (inline for edge function)
const LAYOUT_CONFIG = {
  memeTopBottom: { 
    description: "bold caption top/bottom band", 
    token: "top_bottom_band", 
    max_height_pct: 25,
    success_rate: 0.95
  },
  lowerThird: { 
    description: "banner caption bottom third", 
    token: "lower_third_band", 
    max_height_pct: 20,
    success_rate: 0.90
  },
  negativeSpace: { 
    description: "caption in natural margin", 
    token: "negative_space_margin", 
    max_height_pct: 20,
    success_rate: 0.75
  },
  sideBarLeft: { 
    description: "left 25% text panel", 
    token: "left_sidebar", 
    max_height_pct: 25,
    success_rate: 0.85
  },
  badgeSticker: { 
    description: "caption inside badge/sticker", 
    token: "badge_element", 
    max_height_pct: 15,
    success_rate: 0.90
  },
  subtleCaption: { 
    description: "small unobtrusive caption", 
    token: "subtle_overlay", 
    max_height_pct: 10,
    success_rate: 0.80
  }
};

// Size validation function (inline)
function validateCaptionSize(caption: string, layoutId: string) {
  const layoutConfig = LAYOUT_CONFIG[layoutId] || LAYOUT_CONFIG.memeTopBottom;
  const maxHeightPct = layoutConfig.max_height_pct;
  
  const wordCount = caption.trim().split(/\s+/).length;
  const charCount = caption.length;
  const sizeIssues = [];
  
  // Calculate text density metrics
  const textDensity = charCount / maxHeightPct;
  const wordDensity = wordCount / maxHeightPct;
  
  let violationProbability = 0;
  
  // Base probability from text density
  if (textDensity > 8) {
    violationProbability += 0.3;
    sizeIssues.push('high_character_density');
  }
  
  if (wordDensity > 2) {
    violationProbability += 0.3;
    sizeIssues.push('high_word_density');
  }
  
  // Penalties for very long captions
  if (wordCount > 15) {
    violationProbability += 0.2;
    sizeIssues.push('excessive_word_count');
  }
  
  // Layout-specific penalties
  switch (layoutId) {
    case 'subtleCaption':
      if (wordCount > 8) {
        violationProbability += 0.4;
        sizeIssues.push('too_long_for_subtle');
      }
      break;
    case 'badgeSticker':
      if (wordCount > 6) {
        violationProbability += 0.3;
        sizeIssues.push('too_long_for_badge');
      }
      break;
  }
  
  violationProbability = Math.min(1.0, violationProbability);
  
  return {
    isValid: violationProbability <= 0.3,
    violationProbability,
    sizeIssues,
    recommendedFontScale: violationProbability > 0.3 ? Math.max(0.6, 1.0 - (violationProbability * 0.4)) : 1.0
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Multi-model fallback strategy (matching Step 2 configuration)
const MODELS = [
  { name: 'gpt-5-2025-08-07', tokens: 800, useMaxCompletionTokens: true },
  { name: 'gpt-4.1-2025-04-14', tokens: 800, useMaxCompletionTokens: true },
  { name: 'gpt-5-mini-2025-08-07', tokens: 800, useMaxCompletionTokens: true }
];

interface VisualInput {
  final_text: string;
  category: string;
  subcategory: string;
  mode: string; // balanced | cinematic | dynamic | surreal | chaos | exaggerated
  layout_token: string;
  tags?: string[];
}

// Layout-specific text placement rules with size constraints
const LAYOUT_RULES = {
  "negativeSpace": {
    placement: "integrated into natural empty/negative space near largest margin - MAXIMUM 20% height",
    style: "clean modern sans-serif, elegant alignment, subtle glow for readability, SCALE DOWN to fit constraint"
  },
  "memeTopBottom": {
    placement: "bold caption at top and/or bottom in clear bands - CRITICAL: Maximum 25% of image height",
    style: "large modern sans-serif, centered, high contrast, clean stroke, REDUCE FONT SIZE to stay within 25% height limit"
  },
  "lowerThird": {
    placement: "clean banner across bottom third - MAXIMUM 20% height constraint",
    style: "modern sans-serif, centered, semi-transparent band ok, FONT SIZE must respect height limit"
  },
  "sideBarLeft": {
    placement: "vertical side caption panel on left side - MAXIMUM 25% height",
    style: "modern sans-serif, stacked/vertical layout, subtle strip, SCALE DOWN if needed"
  },
  "badgeSticker": {
    placement: "inside a minimal badge/sticker overlay - CRITICAL: Maximum 15% of canvas area",
    style: "modern sans-serif, simple shape (circle/ribbon/starburst), NEVER overflow badge bounds"
  },
  "subtleCaption": {
    placement: "small caption near bottom or corner - MAXIMUM 10% height",
    style: "elegant modern sans-serif, high contrast, subtle glow, MINIMIZE size while maintaining readability"
  }
};

// Comedian styles for funny visual scenarios
const COMEDIAN_STYLES = [
  {
    id: "bill_burr",
    name: "Bill Burr",
    visual_style: "exaggerated rage and physical comedy",
    scenario_approach: "over-the-top angry reactions, equipment failures, dramatic meltdowns"
  },
  {
    id: "mitch_hedberg", 
    name: "Mitch Hedberg",
    visual_style: "surreal object transformations",
    scenario_approach: "unexpected item mutations, absurd logic made visual, dreamy weirdness"
  },
  {
    id: "kevin_hart",
    name: "Kevin Hart", 
    visual_style: "extreme size/scale comedy",
    scenario_approach: "comically oversized props, height-based sight gags, physical exaggeration"
  },
  {
    id: "norm_macdonald",
    name: "Norm MacDonald",
    visual_style: "bizarrely unexpected anti-climactic scenes", 
    scenario_approach: "setup for epic moment that becomes mundane, weird left-turn visuals"
  },
  {
    id: "ali_wong",
    name: "Ali Wong",
    visual_style: "raw family chaos", 
    scenario_approach: "inappropriate family scenarios, brutally honest domestic scenes"
  },
  {
    id: "sebastian_maniscalco",
    name: "Sebastian Maniscalco",
    visual_style: "exasperated gestures and family dysfunction",
    scenario_approach: "animated frustrated reactions, over-dramatic family scenarios"
  },
  {
    id: "sarah_silverman", 
    name: "Sarah Silverman",
    visual_style: "innocently twisted scenarios",
    scenario_approach: "cute but dark situations, deceptively sweet chaos"
  },
  {
    id: "joan_rivers",
    name: "Joan Rivers", 
    visual_style: "glamorous cruelty and over-the-top fashion",
    scenario_approach: "savage elegance, fashion disasters, celebrity mockery scenarios"
  }
];

// Random comedian selection for funny options
function getRandomComedians(): { option3: typeof COMEDIAN_STYLES[0], option4: typeof COMEDIAN_STYLES[0] } {
  const shuffled = [...COMEDIAN_STYLES].sort(() => 0.5 - Math.random());
  return {
    option3: shuffled[0],
    option4: shuffled[1] || shuffled[0] // Fallback if somehow empty
  };
}

// Visual vocabulary for category-specific props
const VISUAL_VOCABULARY = {
  "Celebrations": {
    "Birthday": {
      props: "cake with frosting candles, balloons, party hats, wrapped gifts, confetti, streamers",
      atmosphere: "warm festive lighting, frosting textures, sparkler candles, neon birthday sign"
    },
    "Wedding": {
      props: "wedding cake, rings, bouquet, veil, champagne glasses",
      atmosphere: "romantic glow, fairy lights, aisle petals, archway"
    },
    "Christmas": {
      props: "Christmas tree, string lights, ornaments, stockings, wreaths, wrapped gifts",
      atmosphere: "warm fireplace glow, snowy window, twinkling fairy lights"
    },
    "Halloween": {
      props: "jack-o-lanterns, spooky masks, cobwebs, skeletons, candy buckets, bats",
      atmosphere: "eerie moonlight, fog, candlelit pumpkins, haunted house vibe"
    }
  },
  "Sports": {
    "American Football": {
      props: "football, helmet, shoulder pads, playbook, stadium scoreboard",
      atmosphere: "floodlights, grassy field, roaring crowd, sideline energy"
    },
    "Soccer": {
      props: "soccer ball, cleats, shin guards, nets, trophy cup",
      atmosphere: "grassy pitch, stadium floodlights, colorful fans, confetti rain"
    },
    "Basketball": {
      props: "basketball, hoop, sneakers, sweat towel, scoreboard",
      atmosphere: "hardwood court, buzzing arena, dramatic spotlights"
    }
  },
  "Daily Life": {
    "Work": {
      props: "laptops, coffee mugs, sticky notes, conference table, charts",
      atmosphere: "office lighting, messy desk, casual clutter"
    },
    "Parenting": {
      props: "toys, strollers, crayons, spilled snacks, baby bottles",
      atmosphere: "chaotic living room, colorful mess, joyful clutter"
    },
    "Dating": {
      props: "candlelit table, roses, champagne, heart-shaped balloons",
      atmosphere: "city lights at night, cozy restaurant, sunset skyline"
    }
  }
};

// Action binding system for visual-caption matching  
const ACTION_LEXICON = {
  clumsy: {
    required: ["fumble", "trip", "stumble", "miss", "bobble", "awkward", "loses grip", "drops", "clumsily"],
    forbidden: ["dunk", "posterize", "swish", "soar", "glide", "slam", "nothing but net", "perfect", "score", "successful"]
  },
  bad_performance: {
    required: ["airball", "brick", "whiff", "shank", "fails", "misses", "botches", "struggles with"],
    forbidden: ["success", "wins", "victory", "champion", "perfect", "nails it", "crushes it"]  
  },
  timing_issues: {
    required: ["too early", "too late", "before", "after", "wrong time", "premature", "patience"],
    forbidden: ["perfect timing", "right moment", "exactly when", "flawless timing"]
  }
};

// Enhanced action extraction with explicit binding
function extractActionElements(text: string): { keywords: string[], actions: string[], timing: string[], actionPhrases: string[], actionBinding: { required: string[], forbidden: string[] } } {
  if (!text || typeof text !== 'string') return { keywords: [], actions: [], timing: [], actionPhrases: [], actionBinding: { required: [], forbidden: [] } };
  
  const lowerText = text.toLowerCase();
  
  // Action binding analysis
  const required: string[] = [];
  const forbidden: string[] = [];
  
  // Detect clumsy/awkward performance
  if (/clumsy|fumble|awkward|needs patience|drops|loses|trips|stumble|clumsily/i.test(text)) {
    required.push(...ACTION_LEXICON.clumsy.required);
    forbidden.push(...ACTION_LEXICON.clumsy.forbidden);
  }
  
  // Detect bad performance indicators  
  if (/bad|terrible|awful|fails|misses|can't|unable|struggles/i.test(text)) {
    required.push(...ACTION_LEXICON.bad_performance.required);
    forbidden.push(...ACTION_LEXICON.bad_performance.forbidden);
  }
  
  // Detect timing-based actions
  if (/before|after|too early|too late|wrong time|premature|patience/i.test(text)) {
    required.push(...ACTION_LEXICON.timing_issues.required);  
    forbidden.push(...ACTION_LEXICON.timing_issues.forbidden);
  }
  
  const actionBinding = {
    required: [...new Set(required)],
    forbidden: [...new Set(forbidden)]
  };
  
  // Extract timing/sequence words with context
  const timingWords = ['before', 'after', 'during', 'while', 'when', 'then', 'until', 'since', 'as'];
  const timing = timingWords.filter(word => lowerText.includes(word));
  
  // Enhanced action phrase extraction - capture complete sequences
  const actionPhrasePatterns = [
    // Captures "calls a foul before the jump ball"
    /\b(calls?|calling|called)\s+[a-z\s]+?\b(before|after|during|while|when)\s+[a-z\s]+?\b(ball|game|play|match)/g,
    // Captures "throws something at someone"  
    /\b(throws?|throwing|threw)\s+[a-z\s]+?\b(at|to|toward)\s+[a-z\s]+/g,
    // Captures "gets ready for something"
    /\b(gets?|getting|got)\s+[a-z\s]+?\b(for|before|after)\s+[a-z\s]+/g,
    // Captures "jumps/runs/plays before/after something"
    /\b(jumps?|jumping|jumped|runs?|running|ran|plays?|playing|played)\s+[a-z\s]+?\b(before|after|during|while|when)\s+[a-z\s]+/g,
    // Captures "says/does something when something happens"
    /\b(says?|saying|said|does|doing|did)\s+[a-z\s]+?\b(when|while|before|after)\s+[a-z\s]+/g,
  ];
  
  const actionPhrases: string[] = [];
  for (const pattern of actionPhrasePatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      actionPhrases.push(...matches.map(m => m.trim()));
    }
  }
  
  // Extract individual action verbs (fallback for simpler actions)
  const actionPatterns = [
    /\b(calls?|calling|called)\s+[a-z\s]{1,15}/g,
    /\b(gets?|getting|got)\s+[a-z\s]{1,15}/g,
    /\b(throws?|throwing|threw)\s+[a-z\s]{1,15}/g,
    /\b(jumps?|jumping|jumped)\s+[a-z\s]{1,15}/g,
    /\b(runs?|running|ran)\s+[a-z\s]{1,15}/g,
    /\b(plays?|playing|played)\s+[a-z\s]{1,15}/g,
    /\b(sits?|sitting|sat)\s+[a-z\s]{1,15}/g,
    /\b(stands?|standing|stood)\s+[a-z\s]{1,15}/g,
    /\b(walks?|walking|walked)\s+[a-z\s]{1,15}/g,
    /\b(says?|saying|said)\s+[a-z\s]{1,15}/g,
    /\b(does|doing|did)\s+[a-z\s]{1,15}/g,
    /\b(makes?|making|made)\s+[a-z\s]{1,15}/g
  ];
  
  const actions: string[] = [];
  for (const pattern of actionPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      actions.push(...matches.map(m => m.trim()));
    }
  }
  
  // Common stop words to filter out from keywords
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were',
    'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'must', 'ought', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'them', 'their', 'what', 'where', 'when', 'why', 'how', 'all',
    'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but', 'like',
    'me', 'my', 'myself', 'this', 'that', 'these', 'those', 'am', 'an', 'for', 'in',
    'of', 'or', 'with', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'again', 'further', 'then', 'once'
  ]);

  // Extract keywords (nouns and meaningful words)
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !stopWords.has(word) && 
      !word.match(/^\d+$/)
    );

  const uniqueWords = Array.from(new Set(words));
  const keywords = uniqueWords
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  console.log('🎯 Action extraction results:', { 
    actionPhrases, 
    actions: actions.slice(0, 3), 
    timing, 
    keywords: keywords.slice(0, 3),
    actionBinding: { required: actionBinding.required.slice(0, 3), forbidden: actionBinding.forbidden.slice(0, 3) }
  });
  
  return { keywords, actions, timing, actionPhrases, actionBinding };
}

// Case-insensitive lookup for visual vocabulary
function getVocabInsensitive(category: string, subcategory: string): { props: string; atmosphere: string } {
  const catKey = Object.keys(VISUAL_VOCABULARY).find(k => k.toLowerCase() === String(category).toLowerCase());
  if (!catKey) return { props: '', atmosphere: '' };
  const subMap = (VISUAL_VOCABULARY as any)[catKey] || {};
  const subKey = Object.keys(subMap).find(k => k.toLowerCase() === String(subcategory).toLowerCase());
  if (!subKey) return { props: '', atmosphere: '' };
  const match = subMap[subKey] || {};
  return { props: String(match.props || ''), atmosphere: String(match.atmosphere || '') };
}

// Enhanced visual scene generation with caption-first approach + action binding
const SYSTEM_PROMPT_UNIVERSAL = (
  { mode, category, subcategory, tags = [], keywords = [], actions = [], timing = [], actionPhrases = [], actionBinding = { required: [], forbidden: [] } }: { 
    mode: string; 
    category: string; 
    subcategory: string; 
    tags?: string[]; 
    keywords?: string[];
    actions?: string[];
    timing?: string[];
    actionPhrases?: string[];
    actionBinding?: { required: string[], forbidden: string[] };
  }
) => {
  // Get category-specific visual vocabulary
  const vocab = getVocabInsensitive(category, subcategory);
  
  // Process tags - all tags are used literally when possible, or as style influence
  const allTags = tags.map(tag => tag.replace(/^["']|["']$/g, ''));
  
  // Get random comedian styles for funny options
  const comedians = getRandomComedians();
  
  // Define mode weights for caption vs category emphasis
  const modeConfig = {
    caption_match: { captionWeight: 0.8, categoryWeight: 0.2, funnyExactly: 0 },
    balanced: { captionWeight: 0.5, categoryWeight: 0.5, funnyExactly: 1 },
    category_first: { captionWeight: 0.25, categoryWeight: 0.75, funnyExactly: 0 },
    gag_factory: { captionWeight: 0.6, categoryWeight: 0.4, funnyExactly: 2 },
    cinematic: { captionWeight: 0.6, categoryWeight: 0.4, funnyExactly: 0 },
    surreal: { captionWeight: 0.7, categoryWeight: 0.3, funnyExactly: 2 },
    full_random: { captionWeight: 0.1, categoryWeight: 0.2, funnyExactly: 0 }
  };
  
  const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.caption_match;
  
  const keywordSection = keywords.length > 0 ? `
Caption Keywords: ${keywords.join(', ')}` : '';
  const actionSection = actions.length > 0 ? `
Action Elements: ${actions.join(', ')}` : '';
  const timingSection = timing.length > 0 ? `
Timing Words: ${timing.join(', ')}` : '';
  const actionPhrasesSection = actionPhrases.length > 0 ? `
🎯 COMPLETE ACTION PHRASES: ${actionPhrases.join(' | ')}` : '';
  
  const captionPriority = config.captionWeight > 0.5 ? 'CAPTION-FIRST' : 'CATEGORY-FIRST';
  const funnyCount = config.funnyExactly;
  
  return `Generate 4 scene ideas as JSON (${captionPriority} approach):

Category: ${category}/${subcategory}
Mode: ${mode}
${vocab.props ? `Props: ${vocab.props}` : ''}
${vocab.atmosphere ? `Mood: ${vocab.atmosphere}` : ''}${keywordSection}${actionSection}${timingSection}${actionPhrasesSection}

ROLE REQUIREMENTS:
- Option 1: Serious scene SHOWING the specific action/timing from caption
- Option 2: Serious category context but MUST include the caption's action
- Option 3: FUNNY GAG exaggerating the caption's action (oversized props, slapstick timing)
- Option 4: FUNNY ABSURD/SURREAL version of the caption's action (impossible physics, dream logic)

${funnyCount >= 2 ? `
⚠️ OPTIONS 3 & 4 MUST BE OBVIOUSLY FUNNY ⚠️
- Option 3: ${comedians.option3.name} style gag with oversized props, visual punchlines, slapstick
- Option 4: ${comedians.option4.name} style absurd/surreal with impossible physics, dream logic
` : ''}

🚨 CAPTION ACTION REQUIREMENTS (CRITICAL) 🚨:
${actionPhrases.length > 0 ? `- EVERY option MUST visually show this COMPLETE action sequence: "${actionPhrases[0]}"` : '- EVERY option MUST show the specific action/sequence from the caption'}
- Option 1 MUST include the primary action phrase: ${actionPhrases[0] || actions.slice(0, 2).join(' OR ')}
- ALL options must preserve timing/sequence: ${timing.join(', ') || 'the order of events'}
- Show the ACTION HAPPENING, not just props/setting
- DO NOT default to generic ${category.toLowerCase()} scenes unless they serve the SPECIFIC joke action
- AVOID filler like "buzzing arena, dramatic spotlights" unless they amplify the caption action

${actionBinding.required.length > 0 ? `
🎯 REQUIRED ACTION ELEMENTS (MUST INCLUDE):
- Show these actions: ${actionBinding.required.slice(0, 4).join(', ')}
- EVERY visual must demonstrate failure/clumsiness, NOT success` : ''}

${actionBinding.forbidden.length > 0 ? `
❌ FORBIDDEN ACTION ELEMENTS (NEVER SHOW):
- NEVER show: ${actionBinding.forbidden.slice(0, 4).join(', ')}
- DO NOT show successful performance when caption implies failure` : ''}

ANTI-GENERIC RULES:
- Reject generic scenes that ignore the caption's specific action
- Every scene must visually represent what happens in the caption
- Timing words (before/after/during) must be shown visually
- For clumsy captions: Show FUMBLING/STRUGGLING, never dunking/succeeding

${allTags.length > 0 ? `- Include tags: ${allTags.join(', ')}` : ''}
- Complete sentences only, no ellipses or fragments  
- No visible text/words in scenes

Generate 4 scene concepts as JSON:
{
  "concepts": [
    {"lane": "option1", "text": "scene description"},
    {"lane": "option2", "text": "scene description"}, 
    {"lane": "option3", "text": "scene description"},
    {"lane": "option4", "text": "scene description"}
  ]
}`;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY missing');
      return new Response(JSON.stringify({ success: false, error: 'OPENAI_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const inputs = (await req.json()) as Partial<VisualInput>;

    // Basic input validation
    const final_text = String(inputs.final_text || '').trim();
    const category = String(inputs.category || '').trim();
    const subcategory = String(inputs.subcategory || '').trim();
    const mode = String(inputs.mode || 'balanced').trim();
    const layout_token = String(inputs.layout_token || 'negativeSpace').trim();
    const tags = Array.isArray(inputs.tags) ? inputs.tags.filter(t => typeof t === 'string' && t.trim().length > 0) : [];

    if (!final_text || !category || !subcategory) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields: final_text, category, subcategory' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract action elements and keywords from caption for better targeting
    const { keywords, actions, timing, actionPhrases, actionBinding } = extractActionElements(final_text);
    
    console.log('inputs', { final_text, category, subcategory, mode, layout_token, tags, keywords, actions, timing, actionPhrases, actionBinding });

    // SIZE VALIDATION: Check if caption is likely to violate size constraints
    const sizeValidation = validateCaptionSize(final_text, layout_token);
    console.log('📏 Size validation result:', sizeValidation);
    
    if (!sizeValidation.isValid && sizeValidation.violationProbability > 0.5) {
      console.warn('⚠️ High size violation probability detected:', {
        layout: layout_token,
        violationProbability: sizeValidation.violationProbability,
        issues: sizeValidation.sizeIssues,
        recommendedFontScale: sizeValidation.recommendedFontScale
      });
    }

    const system = SYSTEM_PROMPT_UNIVERSAL({ mode, category, subcategory, tags, keywords, actions, timing, actionPhrases, actionBinding });
    
    // Enhanced user prompt with explicit action requirements
    const primaryActionPhrase = actionPhrases[0] || actions[0] || '';
    const user = `Caption: "${final_text}"
${tags.length > 0 ? `Tags: ${tags.join(', ')}` : ''}

🎯 CRITICAL: Every visual option must show the action "${primaryActionPhrase}" happening.

Examples of what each option should show:
- Option 1: ${primaryActionPhrase ? `Someone literally doing: "${primaryActionPhrase}"` : 'The main action from the caption happening'}
- Option 2: ${primaryActionPhrase ? `The "${primaryActionPhrase}" action in a ${category.toLowerCase()} setting` : 'Caption action in category context'}
- Option 3: ${primaryActionPhrase ? `"${primaryActionPhrase}" but exaggerated/oversized props` : 'Caption action as a visual gag'}
- Option 4: ${primaryActionPhrase ? `"${primaryActionPhrase}" but surreal/impossible physics` : 'Caption action in absurd way'}

Generate 4 scene concepts that work with this caption.`;

    // Try models in sequence until one succeeds
    for (const modelConfig of MODELS) {
      console.log(`Trying model: ${modelConfig.name}`);
      
      const body: Record<string, unknown> = {
        model: modelConfig.name,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        [modelConfig.useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens']: modelConfig.tokens,
      };

      console.log('reqBody', JSON.stringify(body));

      try {
        const controller = new AbortController();
        // Increase timeout for GPT-5, shorter for GPT-4.1
        const timeoutMs = modelConfig.name.includes('gpt-5') ? 20000 : 15000;
        const timeout = setTimeout(() => {
          console.log(`${modelConfig.name} timed out after ${timeoutMs}ms`);
          controller.abort();
        }, timeoutMs);

        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        console.log(`${modelConfig.name} status:`, r.status);

        if (!r.ok) {
          console.log(`${modelConfig.name} failed with status ${r.status}, trying next model`);
          continue;
        }

        const data = await r.json();
        console.log(`${modelConfig.name} response:`, data);

        // Check for token limit issues
        const finishReason = data?.choices?.[0]?.finish_reason;
        if (finishReason === 'length') {
          console.log(`${modelConfig.name} hit token limit (finish_reason: length), trying next model`);
          continue;
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content || content.trim() === '') {
          console.log(`${modelConfig.name} returned empty content (finish_reason: ${finishReason}), trying next model`);
          continue;
        }

        // Parse JSON response
        let out: any;
        try {
          out = JSON.parse(content);
        } catch (e) {
          try {
            const cleaned = content.replace(/```json\s*|```/g, '').trim();
            out = JSON.parse(cleaned);
          } catch (_e) {
            console.log(`${modelConfig.name} returned invalid JSON, trying next model`);
            continue;
          }
        }

        // Validate structure
        if (!Array.isArray(out?.concepts) || out.concepts.length !== 4) {
          console.log(`${modelConfig.name} returned bad structure, trying next model`);
          continue;
        }

        // Enhanced validation: check for action elements and funny content
        const funnyKeywords = [
          'gigantic', 'enormous', 'oversized', 'massive', 'towering', 'giant',
          'ridiculous', 'absurd', 'bizarre', 'weird', 'strange', 'impossible',
          'exaggerated', 'comical', 'silly', 'goofy', 'outrageous', 'wild',
          'floating', 'flying', 'transformed', 'morphing', 'melting', 'warped',
          'upside-down', 'backwards', 'twisted', 'distorted', 'surreal', 'dreamy'
        ];
        
        const isFunny = (text: string) => {
          const lowerText = text.toLowerCase();
          return funnyKeywords.some(keyword => lowerText.includes(keyword)) ||
                 /\b(ten feet|20 feet|giant|huge|tiny|miniature)\b/i.test(text) ||
                 /\b(impossible|defying|floating|flying|morphing)\b/i.test(text);
        };
        
        // Enhanced validation: check for complete action phrases
        const hasCompleteActionPhrase = (text: string) => {
          if (actionPhrases.length === 0 && actions.length === 0) return true;
          const lowerText = text.toLowerCase();
          
          // First check for complete action phrases (preferred)
          if (actionPhrases.length > 0) {
            const primaryPhrase = actionPhrases[0];
            const phraseWords = primaryPhrase.split(/\s+/).filter(w => w.length > 2);
            // Require at least 60% of key words from the phrase to be present
            const requiredMatches = Math.max(2, Math.ceil(phraseWords.length * 0.6));
            const actualMatches = phraseWords.filter(word => 
              lowerText.includes(word) || 
              // Check for similar words (e.g., "calls" matches "calling")
              lowerText.includes(word.slice(0, -1)) ||
              lowerText.includes(word.slice(0, -2))
            ).length;
            console.log(`🔍 Action phrase check: "${primaryPhrase}" -> ${actualMatches}/${requiredMatches} matches in "${text.slice(0, 50)}..."`);
            return actualMatches >= requiredMatches;
          }
          
          // Fallback to individual action words
          return actions.some(action => {
            const actionWords = action.split(/\s+/).filter(w => w.length > 2);
            return actionWords.some(word => lowerText.includes(word));
          });
        };
        
        // Enhanced timing preservation check
        const hasTimingElements = (text: string) => {
          if (timing.length === 0) return true;
          const lowerText = text.toLowerCase();
          
          // Check for specific timing words from caption
          const hasSpecificTiming = timing.some(timeWord => lowerText.includes(timeWord));
          // Also accept general timing indicators
          const hasGeneralTiming = /\b(before|after|during|while|then|first|next|suddenly|when|as)\b/i.test(text);
          
          console.log(`⏰ Timing check: specific=${hasSpecificTiming}, general=${hasGeneralTiming} in "${text.slice(0, 50)}..."`);
          return hasSpecificTiming || hasGeneralTiming;
        };
        
        const option1HasAction = hasCompleteActionPhrase(out.concepts[0]?.text || '');
        const option1HasTiming = hasTimingElements(out.concepts[0]?.text || '');
        const option3Funny = out.concepts[2] && isFunny(out.concepts[2].text || '');
        const option4Funny = out.concepts[3] && isFunny(out.concepts[3].text || '');
        
        // Enhanced logging for debugging
        console.log(`🎯 Validation results for ${modelConfig.name}:`);
        console.log(`Option 1 - Action: ${option1HasAction}, Timing: ${option1HasTiming}`);
        console.log(`Option 3 - Funny: ${option3Funny}`);
        console.log(`Option 4 - Funny: ${option4Funny}`);
        console.log(`Expected action phrase: "${actionPhrases[0] || actions[0] || 'none'}"`);
        console.log(`Expected timing: ${timing.join(', ') || 'none'}`);
        
        if (!option1HasAction) {
          console.log(`❌ ${modelConfig.name} Option 1 missing complete action phrase, trying next model`);
          console.log('Option 1 text:', out.concepts[0]?.text);
          console.log('Expected action phrase:', actionPhrases[0] || 'none');
          console.log('Expected actions:', actions.slice(0, 2));
          continue;
        }
        
        if (!option1HasTiming && timing.length > 0) {
          console.log(`❌ ${modelConfig.name} Option 1 missing timing elements, trying next model`);
          console.log('Option 1 text:', out.concepts[0]?.text);
          console.log('Expected timing:', timing);
          continue;
        }
        
        if (!option3Funny || !option4Funny) {
          console.log(`${modelConfig.name} Options 3 & 4 not funny enough (3: ${option3Funny}, 4: ${option4Funny}), trying next model`);
          console.log('Option 3 text:', out.concepts[2]?.text);
          console.log('Option 4 text:', out.concepts[3]?.text);
          continue;
        }

        // Check for banned phrases (expanded list)
        const banned = [
          'random object', 'empty room', 'abstract shapes', 'generic photo',
          'prop with twist', 'group of people laughing', 'abstract geometric shapes',
          'group of people', 'person looking disappointed', 'random everyday object'
        ];
        const fails = out.concepts.some((c: any) =>
          typeof c?.text === 'string' && banned.some(b => c.text.toLowerCase().includes(b))
        );
        
        if (fails) {
          console.log(`${modelConfig.name} contained banned phrases, trying next model`);
          continue;
        }

        // Success! Sanitize concepts to remove caption quotes and cap word count
        console.log(`${modelConfig.name} succeeded with ${out.concepts.length} concepts`);
        
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const captionRe = new RegExp(escapeRegex(final_text), 'gi');
        const quotedCaptionRe = new RegExp(`["'""]?${escapeRegex(final_text)}["'""]?`, 'gi');
        const captionLabelRe = /caption[^:]{0,80}:\s*["'""][^"'""]+["'""]/gi;
        
        const sanitize = (t: string) => {
          let s = String(t || '');
          const before = s;
          
          // Remove explicit caption quotes and labeled fragments
          s = s.replace(captionLabelRe, 'caption');
          s = s.replace(quotedCaptionRe, '');
          s = s.replace(captionRe, '');
          
          // Remove context fragments like "- Context: Birthday"
          s = s.replace(/\s*-\s*Context:\s*[^.!?]*[.!?]?/gi, '');
          
          // Remove all ellipses and em dashes
          s = s.replace(/\.{2,}|…/g, '');
          s = s.replace(/—/g, '');
          
          // Clean up spaces and punctuation
          s = s.replace(/\s{2,}/g, ' ');
          s = s.replace(/\s*([,:;.!?])\s*/g, '$1 ');
          s = s.trim();
          
          // Simple 20 word limit
          const words = s.split(/\s+/);
          if (words.length > 20) {
            s = words.slice(0, 20).join(' ');
          }
          
          // Add period if needed
          if (s && !s.match(/[.!?]$/)) {
            s += '.';
          }
          
          console.log('🧼 Sanitized concept', { before, after: s, words: s ? s.split(/\s+/).length : 0 });
          return s;
        };
        
        const sanitizedConcepts = out.concepts.map((c: any, idx: number) => ({
          lane: c?.lane || `option${idx + 1}`,
          text: sanitize(String(c?.text || '')),
        })).filter((c: any) => c.text && c.text.trim().length > 0);
        
        console.log('Final sanitized concepts:', JSON.stringify(sanitizedConcepts, null, 2));
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            model: modelConfig.name, 
            concepts: sanitizedConcepts,
            generated_at: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`${modelConfig.name} timeout - model taking too long, trying next`);
        } else {
          console.error(`${modelConfig.name} error:`, error.message || error);
        }
        continue;
      }
    }

    // All models failed - provide emergency fallback
    console.error('All models failed, providing emergency fallback concepts');
    
    const fallbackConcepts = [
      {
        "lane": "option1",
        "text": "A baseball diamond at sunset with players in uniform gathered around home plate, bats and gloves scattered nearby."
      },
      {
        "lane": "option2", 
        "text": "A dugout scene showing baseball players making animated gestures with their hands while a woman watches skeptically."
      },
      {
        "lane": "option3",
        "text": "Close-up of baseball equipment (glove, bat, ball) arranged on a wooden bench with a scoreboard visible in background."
      },
      {
        "lane": "option4",
        "text": "A baseball field with players running bases while coaches gesture from the sidelines during golden hour lighting."
      }
    ];
    
    return new Response(JSON.stringify({ 
      success: true, 
      model: 'fallback',
      concepts: fallbackConcepts,
      fallback: true,
      attempted_models: MODELS.map(m => m.name)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-visuals error:', error);
    return new Response(JSON.stringify({ success: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});