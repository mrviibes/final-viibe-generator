import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Loader2 } from "lucide-react";
import { setProxySettings } from "@/lib/ideogramApi";

interface CorsRetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function CorsRetryDialog({ open, onOpenChange, onRetry }: CorsRetryDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleEnableAndRetry = async () => {
    setIsRetrying(true);
    
    // Switch to cors-anywhere
    setProxySettings({ type: 'cors-anywhere' });
    
    // Open the activation page
    window.open('https://cors-anywhere.herokuapp.com/corsdemo', '_blank');
    
    // Wait a moment for user to activate, then retry
    setTimeout(() => {
      setIsRetrying(false);
      onOpenChange(false);
      onRetry();
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>CORS Proxy Activation Required</DialogTitle>
          <DialogDescription>
            The CORS Anywhere proxy needs to be manually activated before it can be used.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            We'll automatically open the activation page and switch to the CORS Anywhere proxy for you.
            Just click "Request temporary access to the demo server" on the page that opens.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>What happens next:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click "Enable & Retry" below</li>
              <li>A new tab will open to cors-anywhere.herokuapp.com</li>
              <li>Click "Request temporary access to the demo server"</li>
              <li>We'll automatically retry your image generation</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleEnableAndRetry} disabled={isRetrying}>
            {isRetrying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Enable & Retry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}