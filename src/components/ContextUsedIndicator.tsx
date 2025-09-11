import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, Key } from "lucide-react";

interface ContextUsedIndicatorProps {
  category: string;
  subcategory: string;
  tone: string;
  tags: string[];
  model: string;
  className?: string;
  onAddApiKey?: () => void;
}

export const ContextUsedIndicator = ({ 
  category, 
  subcategory, 
  tone, 
  tags, 
  model,
  className,
  onAddApiKey
}: ContextUsedIndicatorProps) => {
  const isFallback = model === "fallback";
  
  return (
    <Card className={`bg-muted/30 border-dashed ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="text-xs font-medium text-muted-foreground">
              Context Used for Generation:
            </div>
            <div className="flex flex-wrap gap-1.5 items-center text-xs">
              <Badge variant="outline" className="text-xs">{category}</Badge>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs">{subcategory}</Badge>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs">{tone}</Badge>
              
              {tags.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Tags:</span>
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </>
              )}
              
              {tags.length === 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">(no tags)</span>
                </>
              )}
            </div>
            
            {isFallback && (
              <div className="flex items-center gap-2 pt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  Using generic fallback - server API key missing
                </span>
                {onAddApiKey && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onAddApiKey}
                    className="h-5 px-2 text-xs"
                  >
                    <Key className="h-2 w-2 mr-1" />
                    Add API Key
                  </Button>
                )}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Model: <Badge variant={isFallback ? "destructive" : "secondary"} className="text-xs ml-1">
                {model}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};