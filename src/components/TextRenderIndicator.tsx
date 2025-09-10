import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

interface TextRenderIndicatorProps {
  textInsideImage: boolean;
  hasTextInPrompt: boolean;
  imageUrl?: string;
  className?: string;
}

export const TextRenderIndicator = ({ 
  textInsideImage, 
  hasTextInPrompt, 
  imageUrl, 
  className 
}: TextRenderIndicatorProps) => {
  if (!imageUrl) return null;

  const isTextExpectedInside = textInsideImage && hasTextInPrompt;
  
  return (
    <Card className={`bg-muted/50 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm">
          {isTextExpectedInside ? (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">Text rendering:</span>
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                AI Attempted
              </Badge>
              <span className="text-xs text-muted-foreground">
                (If text is missing, try regenerating or use overlay mode)
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Text rendering:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Overlay Mode
              </Badge>
              <span className="text-xs text-muted-foreground">
                (Text will be added on top)
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};