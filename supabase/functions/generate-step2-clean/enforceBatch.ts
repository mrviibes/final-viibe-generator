// enforceBatch.ts
type Rating = "G"|"PG-13"|"R"|"Explicit";

const BUCKETS: [number,number][] = [[40,60],[61,80],[81,100],[61,80]];
const STALE = [
  "everyone nodded awkwardly",
  "man listen",                       // ban as a forced prefix
  "in america", "like it anyway"
];

const LEX: Record<string,string[]> = {
  "Birthday": ["cake","candles","party","balloons","wish","slice","confetti","frosting","celebration"],
  "American Football": ["field","yard","goal","huddle","snap","end zone","helmet"],
  "Work emails": ["inbox","subject","cc","bcc","reply all","signature","thread"]
};

const SOFT_TAG_LEX: Record<string, string[]> = {
  "so old": ["ancient", "fossil", "senior", "wrinkles", "fire hazard", "AARP", "hip replacement"],
  "young": ["millennial", "Gen Z", "TikTok", "fresh", "inexperienced"],
  "rich": ["mansion", "yacht", "caviar", "trust fund", "platinum"],
  "poor": ["ramen", "broke", "coupon", "discount", "clearance"]
};

const VOICE_SHAPES: Record<string, (s:{setup:string,punch:string})=>string> = {
  // minimalist stencils so outputs sound human
  gaffigan:   ({setup,punch}) => `You ever notice ${setup}? Yeah ${punch}.`,
  bargatze:   ({setup,punch}) => `So apparently ${setup}. Turns out ${punch}.`,
  mulaney:    ({setup,punch}) => `${setup}. ${punch}.`,
  hart:       ({setup,punch}) => `Look ${setup}. Next thing I know ${punch}.`,
  wong:       ({setup,punch}) => `${setup} which is basically ${punch}.`,
  burr:       ({setup,punch}) => `I swear to God ${setup}. Because ${punch}.`,
  rock:       ({setup,punch}) => `${setup}. But ${punch}.`,
  hedberg:    ({setup,punch}) => `${setup}. ${punch}.`
};

const VOICE_POOL: Record<Rating, string[]> = {
  "G":      ["gaffigan","bargatze","mulaney"],
  "PG-13":  ["hart","wong","mulaney","rock"],
  "R":      ["burr","rock","wong"],
  "Explicit":["wong","burr"] // keep short and flexible; raunch controlled upstream
};

// ---------- low level guards ----------
const onePeriod = (s:string)=> (s.match(/\./g)||[]).length===1;
const noBanned  = (s:string)=> !/[—,]/.test(s); // no em dashes, no commas
const capFirst  = (s:string)=> s.replace(/^\s*[a-z]/, m=>m.toUpperCase());
const endDot    = (s:string)=> s.endsWith(".") ? s : s + ".";
const byWord    = (s:string)=> s.replace(/\s+\./g,".").replace(/\s{2,}/g," ").trim();

// repair dangling endings and fragments
function repairTail(s:string){
  // Handle common fragment endings
  s = s.replace(/\b(and|the|to|for|with|of|on)\.\s*$/i, " anyway.");
  s = s.replace(/\b(my|his|her|their)\.\s*$/i, " life story.");
  s = s.replace(/\b(when|while|since|because)\.\s*$/i, " obviously.");
  s = s.replace(/\b(which is basically)\.\s*$/i, " which is basically my autobiography.");
  s = s.replace(/\b(the candles)\.\s*$/i, " the candles filed a complaint.");
  return s;
}

// fit length without cutting a word
function fitLen(s:string, lo:number, hi:number){
  if (s.length>hi){
    const cut = s.slice(0,hi);
    const safe = cut.lastIndexOf(" ")>0 ? cut.slice(0,cut.lastIndexOf(" ")) : cut;
    return endDot(safe.replace(/\.+$/,""));
  }
  if (s.length<lo) return s.replace(/\.$/, " tonight.");
  return s;
}

// ensure comedic structure with actual punchlines - strengthened humor validation
function ensureTwist(s:string){
  // Check for existing twist markers
  if (/\b(but|yet|still|instead|except|even|and then|turns out|apparently|which is)\b/i.test(s)) return s;
  
  // Add context-appropriate twist based on content
  if (/birthday|candle|cake/i.test(s)) return s.replace(/\.$/, " but the cake disagreed.");
  if (/old|age|senior/i.test(s)) return s.replace(/\.$/, " which explains the hip replacement.");
  if (/young|millennial|gen z/i.test(s)) return s.replace(/\.$/, " classic Gen Z move.");
  if (/work|email|job/i.test(s)) return s.replace(/\.$/, " but HR had other plans.");
  
  return s.replace(/\.$/, " but reality had other plans.");
}

function stripStale(s:string){
  let t = s;
  for (const p of STALE) t = t.replace(new RegExp(`\\b${p}\\b`,"ig"), "");
  return t.replace(/\s{2,}/g," ").trim();
}

// ensure a lexicon word from the subcategory and soft tags
function ensureContext(s:string, sub:string, softTags: string[] = []){
  const words = LEX[sub] || [];
  let result = s;
  
  // Ensure subcategory context
  if (words.length && !words.some(w=> new RegExp(`\\b${w}\\b`,"i").test(result))) {
    result = result.replace(/\.$/, ` with ${words[0]}.`);
  }
  
  // Ensure soft tag context
  for (const tag of softTags) {
    const tagWords = SOFT_TAG_LEX[tag.toLowerCase()] || [];
    if (tagWords.length && !tagWords.some(w=> new RegExp(`\\b${w}\\b`,"i").test(result))) {
      result = result.replace(/\.$/, ` like a ${tagWords[0]}.`);
      break; // Only add one soft tag context
    }
  }
  
  return result;
}

// spread the hard tag naturally across lines
function spreadHardTag(lines:string[], tag?:string){
  if (!tag) return lines;
  const t = tag.toLowerCase();
  
  console.log(`🏷️ Spreading tag "${tag}" across lines. Current coverage:`, 
    lines.map((l, i) => `${i+1}: ${l.toLowerCase().includes(t) ? '✅' : '❌'}`));
  
  return lines.map((l,i)=>{
    if (l.toLowerCase().includes(t)) {
      console.log(`🏷️ Line ${i+1} already has tag: "${l}"`);
      return l;
    }
    
    let result = l;
    
    // Natural contextual placement
    if (i === 0) {
      // First line: integrate after opening phrase
      if (/^(You ever notice|So apparently|Look)/i.test(l)) {
        result = l.replace(/^(You ever notice|So apparently|Look)(\s+)/i, `$1 ${tag}$2`);
      } else {
        result = l.replace(/^(\w+)(\s+)/, `${tag} $1$2`);
      }
    } else if (i === 1) {
      // Middle lines: find natural break point
      if (/\bbut\b|\byet\b|\bstill\b/i.test(l)) {
        result = l.replace(/(\bbut\b|\byet\b|\bstill\b)/i, `$1 ${tag}`);
      } else {
        result = l.replace(/(\w+)(\s+)/, `${tag}'s $1$2`);
      }
    } else {
      // Last lines: integrate into punchline
      result = l.replace(/(\w+)\.?$/, `${tag}'s $1.`);
    }
    
    console.log(`🏷️ Line ${i+1} tag added: "${l}" → "${result}"`);
    return result;
  });
}

// choose 4 distinct voices for the batch
function rotateVoices(rating:Rating){
  const pool = [...VOICE_POOL[rating]];
  for (let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  while (pool.length<4) pool.push(pool[pool.length-1]);
  return pool.slice(0,4);
}

// build a human-sounding line from raw model text using a voice stencil
function voiceWrap(raw:string, voiceKey:string){
  const s = byWord(stripStale(raw)).replace(/[—,]/g,"");
  
  // Apply TRUE comedian-specific delivery patterns
  const applyVoicePattern = (text: string, voice: string): string => {
    const cleanText = text.replace(/\.$/, "").trim();
    
    switch (voice) {
      case "hart":
        // Hart's frantic energy: "Man listen..."
        return `Man listen, ${cleanText.toLowerCase()} Next thing I know the cake called security.`;
        
      case "mulaney":
        // Mulaney's polished anecdote style with clean twist
        return `You know what's weird? ${cleanText} That's a thing that happened.`;
        
      case "rock":
        // Rock's contrast structure: "Everybody loves X, but Y"
        const words = cleanText.split(" ");
        const firstPart = words.slice(0, Math.min(4, words.length)).join(" ");
        const restPart = words.slice(Math.min(4, words.length)).join(" ");
        return `Everybody loves ${firstPart.toLowerCase()}, but ${restPart || "the reality hits different"}.`;
        
      case "wong":
        // Wong's absurd simile style
        return `${cleanText} — like hiring chaos as a party planner.`;
        
      case "gaffigan":
        // Gaffigan's observational style
        return `You ever notice ${cleanText.toLowerCase()}? Yeah, that's normal.`;
        
      case "bargatze":
        // Bargatze's deadpan storytelling
        return `So apparently ${cleanText.toLowerCase()} Turns out that's a thing.`;
        
      case "burr":
        // Burr's aggressive delivery (adjust for rating)
        return `I swear to God ${cleanText.toLowerCase()} Because that's how it works.`;
        
      default:
        return cleanText;
    }
  };
  
  const voicedText = applyVoicePattern(s, voiceKey);
  
  // Validate that voice pattern was actually applied
  const hasVoiceMarkers = {
    'hart': /man listen.*next thing i know/i.test(voicedText),
    'mulaney': /you know what's weird.*that's a thing/i.test(voicedText),
    'rock': /everybody loves.*but/i.test(voicedText),
    'wong': /like hiring.*as/i.test(voicedText),
    'burr': /i swear to god.*because/i.test(voicedText),
    'gaffigan': /you ever notice.*yeah/i.test(voicedText),
    'bargatze': /so apparently.*turns out/i.test(voicedText)
  };
  
  const hasMarker = hasVoiceMarkers[voiceKey as keyof typeof hasVoiceMarkers];
  if (!hasMarker) {
    console.log(`⚠️ Voice ${voiceKey} pattern not applied correctly: "${voicedText}"`);
    
    // Fallback: ensure basic voice marker is present
    switch (voiceKey) {
      case "hart":
        return `Man listen, ${s} Next thing I know the situation got weird.`;
      case "mulaney":
        return `You know what's weird? ${s} That happened.`;
      case "rock":
        return `Everybody loves birthdays, but ${s}`;
      case "wong":
        return `${s} — like hiring a toddler to plan dinner.`;
      default:
        return s;
    }
  }
  
  return voicedText;
}

// Add deduplication logic
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function deduplicateLines(lines: string[]): string[] {
  const deduplicated = [...lines];
  
  for (let i = 0; i < deduplicated.length; i++) {
    for (let j = i + 1; j < deduplicated.length; j++) {
      const similarity = calculateSimilarity(deduplicated[i], deduplicated[j]);
      
      if (similarity > 0.8) {
        console.log(`🔄 High similarity (${Math.round(similarity * 100)}%) detected between lines ${i+1} and ${j+1}`);
        
        // Regenerate the duplicate with variation
        const original = deduplicated[j];
        const variations = [
          original.replace(/went sideways/, "got weird"),
          original.replace(/faster than/, "quicker than"),
          original.replace(/my last/, "every"),
          original.replace(/damn/, "honestly"),
          original.replace(/attempt/, "try"),
          original.replace(/diet/, "workout"),
          original.replace(/life/, "existence")
        ];
        
        // Pick a variation that's sufficiently different
        for (const variation of variations) {
          if (calculateSimilarity(deduplicated[i], variation) < 0.7) {
            deduplicated[j] = variation;
            console.log(`✅ Replaced duplicate with: "${variation}"`);
            break;
          }
        }
      }
    }
  }
  
  return deduplicated;
}

// ---------- main entry ----------
export function enforceBatch(rawLines:string[], opts:{
  rating: Rating,
  category: string,
  subcategory: string,
  hardTag?: string,
  softTags?: string[]
}): { lines: string[], voices: string[] } {
  console.log(`🎭 Processing batch with ${rawLines.length} raw lines:`, rawLines);
  
  // 0) Remove category leakage - clean any metadata that leaked into text
  let cleanedLines = rawLines.map(line => {
    return line
      .replace(/^.*>\s*/, '') // Remove "Category > Subcategory" prefixes
      .replace(/^Celebrations\s*>\s*Birthday/i, '')
      .replace(/^Birthday\s*>/i, '')
      .replace(/^Celebrations\s*>\s*/i, '')
      .trim();
  });
  
  console.log(`🧹 Cleaned category leakage:`, cleanedLines);
  
  // 1) rotate voices and wrap each raw line
  const voices = rotateVoices(opts.rating);
  console.log(`🎪 Using voices: ${voices.join(', ')}`);
  let out = cleanedLines.slice(0,4).map((r,i)=> {
    const wrapped = voiceWrap(r, voices[i]);
    console.log(`Voice ${voices[i]}: "${r}" → "${wrapped}"`);
    return wrapped;
  });

// 2) context + twist + cleanup per bucket - ENFORCE LEXICON AGGRESSIVELY
  out = out.map((l,i)=>{
    let s = l.trim();
    
    // CRITICAL: Enforce birthday lexicon more aggressively
    if (opts.subcategory.toLowerCase().includes('birthday')) {
      const birthdayWords = ['cake', 'candles', 'party', 'balloons', 'wish', 'slice', 'confetti', 'frosting', 'celebration'];
      const hasRequiredWord = birthdayWords.some(word => s.toLowerCase().includes(word));
      if (!hasRequiredWord) {
        // Force inject birthday context
        s = s.replace(/\.$/, ` over the cake.`);
        console.log(`🎂 Injected birthday context: "${s}"`);
      }
    }
    
    s = ensureContext(s, opts.subcategory, opts.softTags || []); // Context enforcement
    s = ensureTwist(s); // Humor validation
    s = endDot(s);
    s = repairTail(s);
    const [lo,hi] = BUCKETS[i];
    s = fitLen(s, lo, hi);
    s = capFirst(s);
    if (!onePeriod(s)) s = s.replace(/\./g,"") + ".";
    if (!noBanned(s))  s = s.replace(/[—,]/g,"");
    return s;
  });

  // 3) Deduplication check
  out = deduplicateLines(out);

  // 4) spread hard tag creatively
  out = spreadHardTag(out, opts.hardTag);

  // 5) final guard: comprehensive sentence structure validation
  out = out.map((s, i) => {
    let t = byWord(s);
    
    // Fix common fragment patterns identified by user - MORE COMPREHENSIVE
    t = t.replace(/\bbut still\s*\.?$/i, "but still holds up.");
    t = t.replace(/\bbut but\b/gi, "but");
    t = t.replace(/([a-z])([A-Z])/g, "$1 $2"); // Fix "expensivejust" issues
    t = t.replace(/\s+/g, " "); // Fix double spaces
    t = t.replace(/\blet alone his sad little\.?$/i, "let alone his pathetic birthday attempt.");
    t = t.replace(/\bNext thing I know but still\.?$/i, "Next thing I know the cake exploded.");
    t = t.replace(/\bhelium's too expensivejust\b/gi, "helium's too expensive so");
    
    // Fix incomplete conjunctions at the end
    t = t.replace(/\b(and|but|so|because|when|while|until|after|before)\s*\.?\s*$/i, (match) => {
      const conjunction = match.trim().replace(/\.$/, "");
      return ` ${conjunction} nobody asked for this.`;
    });
    
    // Ensure proper sentence ending with actual content
    if (!/[a-z)]\.$/.test(t) || t.endsWith("and.") || t.endsWith("but.")) {
      t = t.replace(/\.$/, " anyway.");
    }
    
    // MANDATORY birthday lexicon check
    if (opts.subcategory.toLowerCase().includes('birthday')) {
      const birthdayWords = ['cake', 'candles', 'party', 'balloons', 'wish', 'slice', 'confetti', 'frosting', 'celebration'];
      const hasRequiredWord = birthdayWords.some(word => t.toLowerCase().includes(word));
      if (!hasRequiredWord) {
        // FORCE inject birthday context - this is mandatory
        t = t.replace(/\.$/, ` over the cake.`);
        console.log(`🎂 MANDATORY birthday context injected: "${t}"`);
      }
    }
    
    // Ensure exactly one period
    if (!onePeriod(t)) {
      t = t.replace(/\./g, "") + ".";
    }
    
    // Final validation: must be 40-100 chars, start with capital, end with period
    if (t.length < 40) {
      t = t.replace(/\.$/, " and that's the absolute truth.");
    }
    if (t.length > 100) {
      t = t.substring(0, 97) + "...";
    }
    if (!/^[A-Z]/.test(t)) {
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    
    console.log(`🔍 Final validation line ${i+1}: "${t}" (${t.length} chars)`);
    return t;
  });

  // 6) ensure tag is in ≥3 lines if provided
  if (opts.hardTag){
    const t = opts.hardTag.toLowerCase();
    const hits = out.filter(x=> x.toLowerCase().includes(t)).length;
    for (let i=0; i<out.length && hits+i<3; i++){
      if (!out[i].toLowerCase().includes(t)) out[i] = out[i].replace(/\.$/, ` with ${opts.hardTag}.`);
    }
  }

  console.log(`✅ enforceBatch complete: ${out.length} lines shaped with voices ${voices.join(', ')}`);
  return { lines: out, voices };
}