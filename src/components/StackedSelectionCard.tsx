import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SelectionItem {
  title: string;
  subtitle?: string;
  description?: string;
  onChangeSelection: () => void;
}

interface StackedSelectionCardProps {
  selections: SelectionItem[];
}

const truncateWords = (text: string, maxWords: number): string => {
  if (!text || typeof text !== 'string') return '';
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

export function StackedSelectionCard({ selections }: StackedSelectionCardProps) {
  return (
    <div className="mb-8 selected-card">
      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-[#0db0de] text-center">
            Combined Selections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selections.map((selection, index) => (
            <div key={index} className="border-b border-border/20 last:border-b-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#0db0de]">
                    {selection.title}
                  </span>
                  <span className="text-xs text-[#0db0de]">✓</span>
                </div>
                <button 
                  onClick={selection.onChangeSelection}
                  className="text-xs text-primary hover:text-primary/80 underline transition-colors"
                >
                  Change selection
                </button>
              </div>
              {selection.subtitle && (
                <p className="text-sm text-muted-foreground mb-1">
                  {truncateWords(selection.subtitle, 10)}
                </p>
              )}
              {selection.description && (
                <p className="text-xs text-muted-foreground">
                  {truncateWords(selection.description, 15)}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}