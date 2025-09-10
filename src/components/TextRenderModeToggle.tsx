import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Info } from "lucide-react";

interface TextRenderModeToggleProps {
  textInsideImage: boolean;
  onToggleChange: (enabled: boolean) => void;
  className?: string;
}

export const TextRenderModeToggle = ({ textInsideImage, onToggleChange, className }: TextRenderModeToggleProps) => {
  return (
    <Card className={`border-2 border-dashed ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="text-inside-toggle" className="font-medium">
                Text inside image
              </Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-sm">
              {textInsideImage 
                ? "Text will be rendered directly into the image by AI (may not always work)" 
                : "Text will be added as an overlay on top of the image (always works)"
              }
            </CardDescription>
          </div>
          <Switch
            id="text-inside-toggle"
            checked={textInsideImage}
            onCheckedChange={onToggleChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};