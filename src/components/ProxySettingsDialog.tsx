import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ProxySettings, getProxySettings, setProxySettings, testProxyConnection } from "@/lib/ideogramApi";
import { useToast } from "@/hooks/use-toast";

interface ProxySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProxySettingsDialog({ open, onOpenChange }: ProxySettingsDialogProps) {
  const [settings, setSettingsLocal] = useState<ProxySettings>({ type: 'direct' });
  const [proxyApiKey, setProxyApiKey] = useState('');
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'failed' | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const currentSettings = getProxySettings();
      setSettingsLocal(currentSettings);
      setProxyApiKey(currentSettings.apiKey || '');
    }
  }, [open]);

  const testConnection = async (proxyType: ProxySettings['type']) => {
    setTestResults(prev => ({ ...prev, [proxyType]: 'testing' }));
    
    try {
      const success = await testProxyConnection(proxyType);
      setTestResults(prev => ({ ...prev, [proxyType]: success ? 'success' : 'failed' }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [proxyType]: 'failed' }));
    }
  };

  const testAllConnections = async () => {
    const types: ProxySettings['type'][] = ['direct', 'proxy-cors-sh', 'allorigins', 'thingproxy', 'cors-anywhere'];
    await Promise.all(types.map(type => testConnection(type)));
  };

  const handleSave = () => {
    const newSettings: ProxySettings = {
      type: settings.type,
      ...(settings.type === 'proxy-cors-sh' && proxyApiKey ? { apiKey: proxyApiKey } : {})
    };
    
    setProxySettings(newSettings);
    toast({
      title: "Settings saved",
      description: `Proxy method set to ${settings.type}`,
    });
    onOpenChange(false);
  };

  const getStatusIcon = (status: typeof testResults[string]) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Proxy Settings</DialogTitle>
          <DialogDescription>
            Configure how to connect to the Ideogram API. If direct connection fails due to CORS, try a proxy method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Label>Connection Test</Label>
            <Button variant="outline" size="sm" onClick={testAllConnections}>
              Test All Connections
            </Button>
          </div>

          <RadioGroup
            value={settings.type}
            onValueChange={(value) => setSettingsLocal({ ...settings, type: value as ProxySettings['type'] })}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="direct" id="direct" />
                  <div>
                    <Label htmlFor="direct" className="font-medium">Direct Connection</Label>
                    <p className="text-sm text-muted-foreground">Connect directly to Ideogram API</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(testResults.direct)}
                  {testResults.direct === 'success' && <Badge variant="secondary">Recommended</Badge>}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="proxy-cors-sh" id="proxy-cors-sh" />
                  <div>
                    <Label htmlFor="proxy-cors-sh" className="font-medium">Proxy.cors.sh</Label>
                    <p className="text-sm text-muted-foreground">Reliable CORS proxy service</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(testResults['proxy-cors-sh'])}
                  <Badge variant="outline">Stable</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="allorigins" id="allorigins" />
                  <div>
                    <Label htmlFor="allorigins" className="font-medium">AllOrigins</Label>
                    <p className="text-sm text-muted-foreground">Free, reliable CORS proxy</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(testResults.allorigins)}
                  <Badge variant="secondary">Free</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="thingproxy" id="thingproxy" />
                  <div>
                    <Label htmlFor="thingproxy" className="font-medium">ThingProxy</Label>
                    <p className="text-sm text-muted-foreground">Alternative free CORS proxy</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(testResults.thingproxy)}
                  <Badge variant="secondary">Free</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="cors-anywhere" id="cors-anywhere" />
                  <div>
                    <Label htmlFor="cors-anywhere" className="font-medium">CORS Anywhere</Label>
                    <p className="text-sm text-muted-foreground">Free proxy (requires manual activation)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(testResults['cors-anywhere'])}
                  <Badge variant="destructive">Requires Setup</Badge>
                </div>
              </div>
            </div>
          </RadioGroup>

          {settings.type === 'proxy-cors-sh' && (
            <div className="space-y-2">
              <Label htmlFor="proxy-api-key">Proxy.cors.sh API Key (Optional)</Label>
              <Input
                id="proxy-api-key"
                type="password"
                placeholder="Enter API key for higher rate limits"
                value={proxyApiKey}
                onChange={(e) => setProxyApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get an API key at{" "}
                <a 
                  href="https://proxy.cors.sh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  proxy.cors.sh
                </a>
                {" "}for higher rate limits
              </p>
            </div>
          )}

          {settings.type === 'cors-anywhere' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CORS Anywhere requires manual activation. Visit{" "}
                <a 
                  href="https://cors-anywhere.herokuapp.com/corsdemo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  cors-anywhere.herokuapp.com/corsdemo
                </a>
                {" "}and click "Request temporary access" before using.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}