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
    <div className="mb-8 selected-card space-y-4">
      {selections.map((selection, index) => (
        <Card key={index} className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-[#0db0de]">
                  {selection.title}
                </span>
                <span className="text-sm text-[#0db0de]">✓</span>
              </div>
              <button 
                onClick={selection.onChangeSelection}
                className="text-sm text-primary hover:text-primary/80 underline transition-colors"
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
              <p className="text-sm text-muted-foreground">
                {truncateWords(selection.description, 15)}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}