import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LayoutOption {
  id: string;
  name: string;
  description: string;
  bestFor: string;
}

interface TextLayoutSelectorProps {
  selectedLayout?: string;
  onLayoutSelect: (layoutId: string) => void;
}

const layoutOptions: LayoutOption[] = [
  {
    id: "negativeSpace",
    name: "Negative Space",
    description: "Text carved out from the background",
    bestFor: "Bold statements, titles"
  },
  {
    id: "memeTopBottom",
    name: "Meme Top/Bottom",
    description: "Classic meme text at top and bottom",
    bestFor: "Humorous content"
  },
  {
    id: "lowerThird",
    name: "Lower Third Banner",
    description: "Professional text bar at bottom",
    bestFor: "Professional announcements"
  },
  {
    id: "subtleCaption",
    name: "Subtle Caption",
    description: "Minimal text overlay",
    bestFor: "Artistic, elegant content"
  }
];

export function TextLayoutSelector({ selectedLayout, onLayoutSelect }: TextLayoutSelectorProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-foreground mb-4">Now choose your text layout style</h3>
        <p className="text-lg text-muted-foreground">This determines how your text will be positioned and styled in the image</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {layoutOptions.map((layout) => (
          <Card 
            key={layout.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
              selectedLayout === layout.id 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onLayoutSelect(layout.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-card-foreground">
                {layout.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm text-muted-foreground">
                {layout.description}
              </CardDescription>
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-primary">
                  Best for: <span className="text-muted-foreground font-normal">{layout.bestFor}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}