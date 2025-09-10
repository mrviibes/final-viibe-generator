import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface RetryWithLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryWithStricterLayout: () => void;
  onSwitchToOverlay: () => void;
  currentLayout: string;
}

const LAYOUT_RETRY_OPTIONS = {
  negativeSpace: "clear top band",
  memeTopBottom: "clear narrow bottom strip", 
  lowerThird: "clear narrow bottom strip",
  sideBarLeft: "clear top band",
  badgeSticker: "clear narrow bottom strip",
  subtleCaption: "clear top band"
};

export const RetryWithLayoutDialog = ({
  open,
  onOpenChange,
  onRetryWithStricterLayout,
  onSwitchToOverlay,
  currentLayout
}: RetryWithLayoutDialogProps) => {
  const suggestedLayout = LAYOUT_RETRY_OPTIONS[currentLayout as keyof typeof LAYOUT_RETRY_OPTIONS] || "clear top band";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Text not rendered in image</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              The AI didn't render your text inside the image. This sometimes happens with realistic photo styles.
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">You can:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Option 1</Badge>
                  <span>Try again with stricter layout: <code className="text-xs bg-muted px-1 rounded">{suggestedLayout}</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Option 2</Badge>
                  <span>Switch to overlay mode (text added on top)</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Current</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onSwitchToOverlay();
              onOpenChange(false);
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Use Overlay
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => {
              onRetryWithStricterLayout();
              onOpenChange(false);
            }}
          >
            Retry Stricter Layout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};