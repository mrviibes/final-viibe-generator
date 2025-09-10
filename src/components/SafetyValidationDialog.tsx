import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface SafetyValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
  modifications: {
    prompt_modified: boolean;
    tags_modified: string[];
  };
  originalPrompt: string;
  sanitizedPrompt: string;
}

export function SafetyValidationDialog({
  open,
  onOpenChange,
  onProceed,
  modifications,
  originalPrompt,
  sanitizedPrompt
}: SafetyValidationDialogProps) {
  const hasModifications = modifications?.prompt_modified || (modifications?.tags_modified?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasModifications ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Content Safety Review
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Content Validated
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasModifications 
              ? "We've made some adjustments to ensure your content meets safety guidelines."
              : "Your content looks good and meets all safety guidelines."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasModifications && (
            <>
              {modifications?.prompt_modified && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Prompt adjusted:</strong> Some terms were replaced with safer alternatives to ensure generation success.
                  </AlertDescription>
                </Alert>
              )}
              
              {(modifications?.tags_modified?.length ?? 0) > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Visual tags updated:</strong> {modifications?.tags_modified?.length ?? 0} tag(s) were adjusted for safety compliance.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-medium mb-2">What changed:</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>• Explicit or inappropriate terms → Safe alternatives</p>
                  <p>• Adult content references → Artistic descriptions</p>
                  <p>• Potentially offensive language → Neutral terms</p>
                </div>
              </div>
            </>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These adjustments help ensure your image generates successfully while maintaining your creative intent.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onProceed}>
            {hasModifications ? 'Generate with Changes' : 'Generate Image'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}