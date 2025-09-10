import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, RefreshCw, Layers } from "lucide-react";

interface TextRenderIndicatorProps {
  textInsideImage: boolean;
  hasTextInPrompt: boolean;
  imageUrl?: string;
  className?: string;
  onRetryAsOverlay?: () => void;
  onRetryTextRendering?: () => void;
  isRetrying?: boolean;
}

export const TextRenderIndicator = ({ 
  textInsideImage, 
  hasTextInPrompt, 
  imageUrl, 
  className,
  onRetryAsOverlay,
  onRetryTextRendering,
  isRetrying = false
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  (If text is missing or unclear)
                </span>
                {onRetryTextRendering && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetryTextRendering}
                    disabled={isRetrying}
                    className="h-6 px-2 text-xs"
                  >
                    {isRetrying ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </>
                    )}
                  </Button>
                )}
                {onRetryAsOverlay && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onRetryAsOverlay}
                    disabled={isRetrying}
                    className="h-6 px-2 text-xs"
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    Use Overlay
                  </Button>
                )}
              </div>
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