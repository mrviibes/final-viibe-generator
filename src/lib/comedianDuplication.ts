// Anti-duplication system for comedian mode
const STORAGE_KEY = 'comedian_history';
const MAX_HISTORY = 200;

interface HistoryEntry {
  normalizedText: string;
  category: string;
  subcategory: string;
  timestamp: number;
}

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccard(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export function checkForDuplicates(
  newLines: Array<{ text: string }>,
  category: string,
  subcategory: string
): { 
  hasDuplicates: boolean;
  duplicateIndices: number[];
} {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as HistoryEntry[];
    const categoryHistory = history.filter(entry => 
      entry.category === category && entry.subcategory === subcategory
    );
    
    const duplicateIndices: number[] = [];
    
    newLines.forEach((line, index) => {
      const normalized = normalizeText(line.text);
      const hasDuplicate = categoryHistory.some(entry => 
        jaccard(normalized, entry.normalizedText) > 0.85
      );
      
      if (hasDuplicate) {
        duplicateIndices.push(index);
      }
    });
    
    return {
      hasDuplicates: duplicateIndices.length > 0,
      duplicateIndices
    };
  } catch (error) {
    console.warn('Error checking duplicates:', error);
    return { hasDuplicates: false, duplicateIndices: [] };
  }
}

export function addToHistory(
  lines: Array<{ text: string }>,
  category: string,
  subcategory: string
): void {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as HistoryEntry[];
    const now = Date.now();
    
    // Add new entries
    const newEntries: HistoryEntry[] = lines.map(line => ({
      normalizedText: normalizeText(line.text),
      category,
      subcategory,
      timestamp: now
    }));
    
    // Combine and trim to max size
    const combined = [...history, ...newEntries];
    const trimmed = combined
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Error saving to history:', error);
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Error clearing history:', error);
  }
}