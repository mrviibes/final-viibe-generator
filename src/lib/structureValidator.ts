// Structure variety and fragment validation for comedy generation

interface StructureValidation {
  hasVariety: boolean;
  structures: string[];
  hasAbsurdImagery: boolean;
  fragmentIssues: string[];
  fixedFragments: string[];
}

interface BatchStructureValidation {
  isValid: boolean;
  structureCount: Record<string, number>;
  hasRequiredVariety: boolean;
  hasAbsurdImagery: boolean;
  fragmentsFixed: number;
  validation: StructureValidation;
}

export function validateStructureVariety(lines: Array<{ text: string }>): BatchStructureValidation {
  const structures: string[] = [];
  const fragmentIssues: string[] = [];
  const fixedFragments: string[] = [];
  let hasAbsurdImagery = false;

  // Analyze each line for structure and issues
  lines.forEach((line, index) => {
    const text = line.text.toLowerCase();
    
    // Detect structure patterns
    if (text.includes('treats') && text.includes('like')) {
      structures.push('absurd');
      hasAbsurdImagery = true;
    } else if (text.startsWith('you ever see') || text.includes('punchline')) {
      structures.push('punchline_first');
    } else if (text.includes('plot twist') || text.includes('based on')) {
      structures.push('story');
    } else if (text.includes('roast') || text.includes('said hold my') || text.includes('approached')) {
      structures.push('roast');
    } else {
      structures.push('general');
    }

    // Check for absurd imagery patterns
    const absurdPatterns = [
      /like a .+ (doing|trying|attempting)/,
      /treats .+ like .+/,
      /approaches .+ like .+/,
      /looks like .+ arguing with/,
      /(raccoon|blender|toaster|gravity|negotiation)/
    ];
    
    if (!hasAbsurdImagery && absurdPatterns.some(pattern => pattern.test(text))) {
      hasAbsurdImagery = true;
    }

    // Check for fragment endings
    const fragmentEndings = ['to', 'of', 'and', 'but', 'or', 'with', 'from', 'in', 'on', 'at'];
    const words = line.text.trim().split(' ');
    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?]$/, '');
    
    if (fragmentEndings.includes(lastWord)) {
      fragmentIssues.push(`Line ${index + 1} ends with fragment: "${lastWord}"`);
      
      // Auto-fix common fragments
      const completions: Record<string, string[]> = {
        'to': ['lose one', 'go wrong', 'fail spectacularly'],
        'of': ['chaos', 'disappointment', 'regret'],
        'and': ['nobody asked', 'it shows', 'here we are'],
        'but': ['nobody cares', 'it backfired', 'plot twist'],
        'with': ['zero success', 'maximum chaos', 'predictable results']
      };
      
      const fixes = completions[lastWord];
      if (fixes) {
        const randomFix = fixes[Math.floor(Math.random() * fixes.length)];
        const fixedText = line.text.replace(new RegExp(`\\s+${lastWord}\\s*$`, 'i'), ` ${randomFix}.`);
        fixedFragments.push(fixedText);
      }
    }
  });

  // Count structure variety
  const structureCount = structures.reduce((acc, structure) => {
    acc[structure] = (acc[structure] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueStructures = Object.keys(structureCount).length;
  const hasRequiredVariety = uniqueStructures >= 3; // At least 3 different structures
  const isValid = hasRequiredVariety && hasAbsurdImagery && fragmentIssues.length === 0;

  return {
    isValid,
    structureCount,
    hasRequiredVariety,
    hasAbsurdImagery,
    fragmentsFixed: fixedFragments.length,
    validation: {
      hasVariety: hasRequiredVariety,
      structures: Object.keys(structureCount),
      hasAbsurdImagery,
      fragmentIssues,
      fixedFragments
    }
  };
}

export function enforceStructureVariety(lines: Array<{ lane: string; text: string }>): Array<{ lane: string; text: string }> {
  const validation = validateStructureVariety(lines);
  
  if (validation.isValid) {
    return lines;
  }

  console.log('🔧 Enforcing structure variety and fixing fragments');
  
  // Apply fragment fixes
  const fixedLines = lines.map((line, index) => {
    if (validation.validation.fixedFragments[index]) {
      return {
        ...line,
        text: validation.validation.fixedFragments[index]
      };
    }
    return line;
  });

  // If missing absurd imagery, enhance one line
  if (!validation.hasAbsurdImagery && fixedLines.length > 0) {
    const randomIndex = Math.floor(Math.random() * fixedLines.length);
    const line = fixedLines[randomIndex];
    
    // Add absurd comparison to existing line
    const absurdTemplates = [
      'like a raccoon negotiating rent',
      'like gravity arguing with physics',
      'like a toaster having an existential crisis',
      'like a blender learning to dance'
    ];
    
    const randomTemplate = absurdTemplates[Math.floor(Math.random() * absurdTemplates.length)];
    
    // Insert absurd comparison naturally
    if (line.text.includes(' is ') || line.text.includes(' was ')) {
      fixedLines[randomIndex].text = line.text.replace(
        /(\s+is\s+|\s+was\s+)/i, 
        ` treats this ${randomTemplate}, `
      );
    } else {
      fixedLines[randomIndex].text = `${line.text.replace(/\.$/, '')}, ${randomTemplate}.`;
    }
  }

  return fixedLines;
}

export function generateStructuredPrompt(style: string, structures: string[]): string {
  const structureInstructions = {
    'roast': 'Create a roast-style one-liner with confrontational energy',
    'absurd': 'Create an absurd comparison using animals or impossible analogies',
    'punchline_first': 'Structure as punchline first, then explanation',
    'story': 'Create a mini narrative with setup and payoff'
  };

  const prompts = structures.map((structure, index) => 
    `Option ${index + 1}: ${structureInstructions[structure] || structureInstructions['punchline_first']}`
  );

  return `Generate 4 options with these structures:\n${prompts.join('\n')}`;
}