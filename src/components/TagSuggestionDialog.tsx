import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { type TagSuggestion } from "@/lib/tagSanitizer";

interface TagSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: TagSuggestion[];
  onAcceptSuggestion: (originalTag: string, newTag: string) => void;
  onKeepOriginal: (tag: string) => void;
  onCancel: () => void;
}

export function TagSuggestionDialog({
  open,
  onOpenChange,
  suggestions,
  onAcceptSuggestion,
  onKeepOriginal,
  onCancel
}: TagSuggestionDialogProps) {
  if (suggestions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Content Safety Suggestions
          </DialogTitle>
          <DialogDescription>
            Some of your tags might trigger content safety filters. We've suggested alternatives that achieve the same comedic intent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {suggestions.map((suggestion, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Problematic tag: <Badge variant="destructive" className="ml-1">{suggestion.originalTag}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.reason}
                  </p>
                </div>
              </div>

              <div className="ml-8">
                <p className="text-sm font-medium mb-2">Suggested alternatives:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestion.suggestedAlternatives.map((alternative, altIndex) => (
                    <Button
                      key={altIndex}
                      variant="outline"
                      size="sm"
                      onClick={() => onAcceptSuggestion(suggestion.originalTag, alternative)}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {alternative}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onKeepOriginal(suggestion.originalTag)}
                  className="text-xs text-muted-foreground"
                >
                  Keep original (may cause generation to fail)
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel Generation
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Continue with Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}