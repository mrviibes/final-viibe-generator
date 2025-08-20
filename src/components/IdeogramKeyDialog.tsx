import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink } from "lucide-react";

interface IdeogramKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: (apiKey: string) => void;
}

export function IdeogramKeyDialog({ open, onOpenChange, onApiKeySet }: IdeogramKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }
    
    onApiKeySet(apiKey.trim());
    onOpenChange(false);
    setApiKey("");
    setError("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setApiKey("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ideogram API Key Required</DialogTitle>
          <DialogDescription>
            To generate images with Ideogram Turbo, you need to provide your API key.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Ideogram API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>
                Don't have an API key? Get one from Ideogram:
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('https://ideogram.ai/api', '_blank')}
                className="w-fit"
              >
                Get API Key
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save API Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}