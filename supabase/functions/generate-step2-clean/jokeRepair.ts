// V5: Comprehensive Joke Repair System - Fix all the specific issues

export interface RepairContext {
  category: string;
  subcategory: string;
  tone: string;
  rating: string;
  hardTag?: string;
}

// Detect and fix specific fragment patterns we're seeing
export function repairFragments(line: string): string {
  let repaired = line.trim();

  // Fix specific problematic patterns from user feedback
  const specificRepairs: [RegExp, string][] = [
    // Double phrases like "the cake and the cake"
    [/\b(\w+)\s+and\s+the\s+\1\b/gi, "$1"],
    
    // Incomplete comparisons like "but in Brazil."
    [/\bbut in \w+\.\s*$/i, " but in Brazil everyone just dances anyway."],
    [/\bin \w+ \w+ are \w+ and \w+ but in \w+\.\s*$/i, " in Germany birthdays are quiet but in Brazil the cake explodes with joy."],
    
    // Silas forced cues like "Silas man listen"
    [/^Silas man listen\b/i, "Man listen, Silas"],
    
    // Incomplete wildfire metaphors
    [/\blike I'm trying to blow out a tiny wildfire\.\s*$/i, " like I'm trying to blow out a tiny wildfire and losing badly."],
    
    // Generic incomplete endings
    [/\b(Why is|What happens when|How does)\s+.*…\s*$/i, "Silas blows out candles like he's performing CPR on birthday wishes."],
    
    // Common fragments we've seen
    [/\bcoming home after midnight\.\s*$/i, " coming home after midnight and waking up the neighbors."],
    [/\bmake me feel like\s*$/i, " make me feel like the cake has trust issues."],
    [/\band everyone\s*$/i, " and everyone pretended to enjoy it."]
  ];

  // Apply specific repairs
  for (const [pattern, replacement] of specificRepairs) {
    if (pattern.test(repaired)) {
      repaired = repaired.replace(pattern, replacement);
      break;
    }
  }

  return repaired;
}

// Ensure every line has a proper setup → punch structure
export function enforceSetupPunch(line: string): string {
  // Check if line already has a clear punchline structure
  const hasPunch = /\b(but|so|because|then|and|until|except|unfortunately|suddenly|turns out|apparently)\b.*\./i.test(line);
  
  if (hasPunch) return line;

  // If no clear punch, try to add one
  const setupMarkers = /^(.*?)\s+(is|are|was|were|has|have|does|do|gets|got|makes|made)\b/i;
  const match = line.match(setupMarkers);
  
  if (match) {
    const setup = match[0];
    // Add a twist after the setup
    return line.replace(setup, setup + " but somehow");
  }

  // Fallback: add punchline connector
  return line.replace(/\.$/, " and nobody asked for this.");
}

// Creative hard tag placement strategies 
export function spreadHardTagCreatively(lines: string[], hardTag: string): string[] {
  if (!hardTag || lines.length === 0) return lines;

  const tag = hardTag.trim();
  const tagLower = tag.toLowerCase();
  
  // Check which lines already have the tag
  const hasTag = lines.map(line => line.toLowerCase().includes(tagLower));
  const currentCount = hasTag.filter(Boolean).length;
  
  if (currentCount >= 3) return lines; // Already sufficient coverage

  // Strategy: Use different placement for each line
  return lines.map((line, index) => {
    if (hasTag[index]) return line; // Already has tag

    // Only add to lines that need it (to reach 3/4 minimum)
    const needsTag = currentCount + (index < 3 ? 1 : 0) < 3;
    if (!needsTag && index >= 3) return line;

    switch (index % 4) {
      case 0: // Line 1: Natural front placement
        return `${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
      
      case 1: // Line 2: After action word
        const actionWords = /(blew|made|had|got|came|went|said|tried)/i;
        const actionMatch = line.match(actionWords);
        if (actionMatch && actionMatch.index !== undefined) {
          const insertPos = actionMatch.index + actionMatch[0].length;
          return line.slice(0, insertPos) + ` ${tag}` + line.slice(insertPos);
        }
        return `At the party ${tag} ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
      
      case 2: // Line 3: In the punchline
        const punchMarkers = /(but|so|because|then|and|until|unfortunately|suddenly)/i;
        const punchMatch = line.match(punchMarkers);
        if (punchMatch && punchMatch.index !== undefined) {
          const insertPos = punchMatch.index + punchMatch[0].length;
          return line.slice(0, insertPos) + ` ${tag}` + line.slice(insertPos);
        }
        return line.replace(/\.$/, ` like ${tag} predicted.`);
      
      case 3: // Line 4: End attribution
        return line.replace(/\.$/, ` and ${tag} just nodded knowingly.`);
      
      default:
        return line;
    }
  });
}

// Enforce tone-specific language
export function enforcePlayfulTone(line: string): string {
  const playfulWords = ["silly", "ridiculous", "goofy", "funny", "hilarious", "absurd", "weird", "crazy"];
  const hasPlayful = playfulWords.some(word => 
    new RegExp(`\\b${word}\\b`, "i").test(line)
  );

  if (hasPlayful) return line;

  // Add playful language naturally
  const playfulConnectors = [
    " in the most ridiculous way",
    " like something silly happened", 
    " and it was hilariously awkward",
    " in a funny way nobody expected"
  ];

  const connector = playfulConnectors[Math.floor(Math.random() * playfulConnectors.length)];
  return line.replace(/\.$/, `${connector}.`);
}

// Safe punchline completions for when the model stalls
export function addSafePunchline(line: string, context: RepairContext): string {
  // Context-specific safe endings
  const contextEndings = {
    "Birthday": [
      " and the cake filed a complaint",
      " while the candles called their lawyer", 
      " and everyone pretended it was normal",
      " like birthdays were invented by chaos",
      " and the balloons just gave up"
    ],
    "Basketball": [
      " and the hoop requested overtime",
      " while the ball questioned its life choices",
      " and nobody kept score anymore"
    ]
  };

  const endings = contextEndings[context.category] || contextEndings["Birthday"];
  const randomEnding = endings[Math.floor(Math.random() * endings.length)];

  // Check if line needs completion
  const needsCompletion = /\b(and|but|so|because|when|while|until|after|before)\s*\.?\s*$/i.test(line) ||
                         line.length < 50;

  if (needsCompletion) {
    return line.replace(/\.?\s*$/, randomEnding + ".");
  }

  return line;
}

// Eliminate voice repetition across batch
export function diversifyVoiceMarkers(lines: string[]): string[] {
  const voiceMarkers = [
    { marker: /^man listen/i, alternatives: ["Listen up", "Check this", "So apparently", "Here's the thing"] },
    { marker: /^you ever notice/i, alternatives: ["Have you seen", "Anyone else think", "Why is it", "What's with"] },
    { marker: /^honestly/i, alternatives: ["Real talk", "No joke", "For real", "Seriously"] }
  ];

  return lines.map((line, index) => {
    // Skip first occurrence, diversify the rest
    if (index === 0) return line;

    for (const { marker, alternatives } of voiceMarkers) {
      if (marker.test(line)) {
        const alternative = alternatives[index % alternatives.length];
        return line.replace(marker, alternative);
      }
    }

    return line;
  });
}

// Main repair orchestrator
export function repairJokeBatch(rawLines: string[], context: RepairContext): string[] {
  if (!rawLines.length) return rawLines;

  let repaired = rawLines.slice(0, 4); // Ensure we have exactly 4 lines

  // 1. Fix specific fragment patterns we've identified
  repaired = repaired.map(line => repairFragments(line));

  // 2. Ensure setup → punch structure
  repaired = repaired.map(line => enforceSetupPunch(line));

  // 3. Add safe punchlines for incomplete lines
  repaired = repaired.map(line => addSafePunchline(line, context));

  // 4. Enforce tone-specific language
  if (context.tone === "Playful") {
    repaired = repaired.map(line => enforcePlayfulTone(line));
  }

  // 5. Diversify voice markers to avoid repetition
  repaired = diversifyVoiceMarkers(repaired);

  // 6. Creative hard tag placement
  if (context.hardTag) {
    repaired = spreadHardTagCreatively(repaired, context.hardTag);
  }

  // 7. Final cleanup - ensure proper format
  repaired = repaired.map(line => {
    let cleaned = line.trim();
    
    // Ensure exactly one period
    if ((cleaned.match(/\./g) || []).length !== 1) {
      cleaned = cleaned.replace(/\.+$/, "") + ".";
    }
    
    // Remove commas and em dashes
    cleaned = cleaned.replace(/[,—]/g, "");
    
    // Capitalize first letter
    cleaned = cleaned.replace(/^[a-z]/, m => m.toUpperCase());
    
    // Clean up double spaces
    cleaned = cleaned.replace(/\s+/g, " ");
    
    return cleaned;
  });

  return repaired;
}

// Quality validation for the repaired batch
export function validateRepairedBatch(lines: string[]): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 100;

  lines.forEach((line, i) => {
    // Check basic format
    if (!/^[A-Z]/.test(line)) {
      issues.push(`Line ${i+1}: Doesn't start with capital`);
      score -= 10;
    }
    
    if ((line.match(/\./g) || []).length !== 1) {
      issues.push(`Line ${i+1}: Multiple or no periods`);
      score -= 15;
    }
    
    if (/[,—]/.test(line)) {
      issues.push(`Line ${i+1}: Contains banned punctuation`);
      score -= 10;
    }
    
    if (line.length < 40 || line.length > 100) {
      issues.push(`Line ${i+1}: Wrong length (${line.length})`);
      score -= 15;
    }

    // Check for fragment patterns
    if (/\b(and|but|so|because|when|while|until|after|before)\s*\.?\s*$/i.test(line)) {
      issues.push(`Line ${i+1}: Ends with incomplete thought`);
      score -= 20;
    }

    // Check for punchline structure
    const hasPunch = /\b(but|so|because|then|and|until|except|unfortunately|suddenly|turns out|apparently)\b/i.test(line);
    if (!hasPunch) {
      issues.push(`Line ${i+1}: Missing punchline structure`);
      score -= 15;
    }
  });

  return {
    isValid: score >= 70,
    issues,
    score: Math.max(score, 0)
  };
}