// enforceBatch.ts
type Rating = "G"|"PG-13"|"R"|"Explicit";

const BUCKETS: [number,number][] = [[40,60],[61,80],[81,100],[61,80]];
const STALE = [
  "everyone nodded awkwardly",
  "man listen",                       // ban as a forced prefix
  "in america", "like it anyway"
];

const LEX: Record<string,string[]> = {
  "Birthday": ["cake","candles","party","balloons","wish","slice","confetti"],
  "American Football": ["field","yard","goal","huddle","snap","end zone","helmet"],
  "Work emails": ["inbox","subject","cc","bcc","reply all","signature","thread"]
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

// repair dangling endings
function repairTail(s:string){
  return s.replace(/\b(and|the|to|for|with|of|on)\.\s*$/i," now.");
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

// simple setup→punch detector; fallback if missing
function ensureTwist(s:string){
  if (/\bbut\b|\byet\b|\bstill\b|\binstead\b|\bexcept\b/i.test(s)) return s;
  return s.replace(/\.$/," but the punchline won anyway.");
}

function stripStale(s:string){
  let t = s;
  for (const p of STALE) t = t.replace(new RegExp(`\\b${p}\\b`,"ig"), "");
  return t.replace(/\s{2,}/g," ").trim();
}

// ensure a lexicon word from the subcategory
function ensureContext(s:string, sub:string){
  const words = LEX[sub] || [];
  if (!words.length) return s;
  return words.some(w=> new RegExp(`\\b${w}\\b`,"i").test(s))
    ? s
    : s.replace(/\.$/, ` ${words[0]}.`);
}

// spread the hard tag across start, middle, end
function spreadHardTag(lines:string[], tag?:string){
  if (!tag) return lines;
  const t = tag.toLowerCase();
  return lines.map((l,i)=>{
    if (l.toLowerCase().includes(t)) return l;
    // more natural placement
    if (i === 0) return l.replace(/^(\w+)/, `$1 ${tag}`);                    // after first word
    if (i === 1) return l.replace(/(\w+)\.?$/, `${tag} $1.`);                // before last word
    if (i === 2) return l.replace(/\s(\w+)\.$/, ` ${tag} $1.`);              // before last word
    else         return l.replace(/\.?$/, ` with ${tag}.`);                   // tail for last
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
  
  // find natural break points for setup/punch
  const conjunctions = /\b(but|however|yet|still|instead|except|though|although)\b/i;
  const match = s.match(conjunctions);
  
  if (match && match.index && match.index > 15 && match.index < s.length - 15) {
    // use natural conjunction as split point
    const setup = s.slice(0, match.index).trim().replace(/\.+$/,"");
    const punch = s.slice(match.index).replace(/^\W+/,"").replace(/\.+$/,"");
    const shape = VOICE_SHAPES[voiceKey] || VOICE_SHAPES.mulaney;
    const out = shape({setup, punch});
    return byWord(out);
  } else {
    // if no natural break, use the raw text with minimal voice wrapper
    const shape = VOICE_SHAPES[voiceKey] || VOICE_SHAPES.mulaney;
    const out = shape({setup: s.replace(/\.+$/,""), punch: ""});
    return byWord(out).replace(/\.\s*\.$/, ".");
  }
}

// ---------- main entry ----------
export function enforceBatch(rawLines:string[], opts:{
  rating: Rating,
  category: string,
  subcategory: string,
  hardTag?: string
}): string[] {
  console.log(`🎭 Processing batch with ${rawLines.length} raw lines:`, rawLines);
  
  // 1) rotate voices and wrap each raw line
  const voices = rotateVoices(opts.rating);
  console.log(`🎪 Using voices: ${voices.join(', ')}`);
  let out = rawLines.slice(0,4).map((r,i)=> {
    const wrapped = voiceWrap(r, voices[i]);
    console.log(`Voice ${voices[i]}: "${r}" → "${wrapped}"`);
    return wrapped;
  });

  // 2) context + twist + cleanup per bucket
  out = out.map((l,i)=>{
    let s = l.trim();
    s = ensureContext(s, opts.subcategory);
    s = ensureTwist(s);
    s = endDot(s);
    s = repairTail(s);
    const [lo,hi] = BUCKETS[i];
    s = fitLen(s, lo, hi);
    s = capFirst(s);
    if (!onePeriod(s)) s = s.replace(/\./g,"") + ".";
    if (!noBanned(s))  s = s.replace(/[—,]/g,"");
    return s;
  });

  // 3) spread hard tag creatively
  out = spreadHardTag(out, opts.hardTag);

  // 4) final guard: one sentence, readable end
  out = out.map(s=>{
    let t = byWord(s);
    if (!/[a-z)]\.$/i.test(t)) t = t.replace(/\.$/, " for real.");
    if (!onePeriod(t)) t = t.replace(/\./g,"") + ".";
    return t;
  });

  // 5) ensure tag is in ≥3 lines if provided
  if (opts.hardTag){
    const t = opts.hardTag.toLowerCase();
    const hits = out.filter(x=> x.toLowerCase().includes(t)).length;
    for (let i=0; i<out.length && hits+i<3; i++){
      if (!out[i].toLowerCase().includes(t)) out[i] = out[i].replace(/\.$/, ` with ${opts.hardTag}.`);
    }
  }

  return out;
}