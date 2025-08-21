import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle, ArrowLeft, ArrowRight, X, Download } from "lucide-react";
import { openAIService, OpenAISearchResult } from "@/lib/openai";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { IdeogramKeyDialog } from "@/components/IdeogramKeyDialog";
import { ProxySettingsDialog } from "@/components/ProxySettingsDialog";
import { CorsRetryDialog } from "@/components/CorsRetryDialog";
import { StepProgress } from "@/components/StepProgress";
import { StackedSelectionCard } from "@/components/StackedSelectionCard";
import { useNavigate } from "react-router-dom";
import { generateCandidates, VibeResult } from "@/lib/vibeModel";
import { buildIdeogramHandoff } from "@/lib/ideogram";
import { generateVisualRecommendations, VisualOption } from "@/lib/visualModel";
import { generateIdeogramImage, setIdeogramApiKey, getIdeogramApiKey, IdeogramAPIError, getProxySettings, setProxySettings, testProxyConnection, ProxySettings } from "@/lib/ideogramApi";
import { buildIdeogramPrompt, getAspectRatioForIdeogram, getStyleTypeForIdeogram } from "@/lib/ideogramPrompt";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

const Index = () => {
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-background py-12 px-4 pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Main Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">YOUR VIIBE</h1>
        </div>

        {/* Demo tags section with integrated generate button */}
        <div className="max-w-md mx-auto space-y-4 mb-16">
          <div className="text-center mb-6">
            <p className="text-xl text-muted-foreground">Add relevant tags for content generation</p>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Enter tags (press Enter or comma to add)"
                className="text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-4 text-base font-medium rounded-lg pr-24"
              />
              <Button 
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0db0de] hover:bg-[#0db0de]/90 text-white transition-all duration-200"
              >
                Generate
              </Button>
            </div>
            
            {/* Sample tags */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline" className="px-3 py-1 text-sm border-border/50 bg-card hover:bg-accent/70 transition-colors cursor-pointer">
                sample tag ×
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm border-border/50 bg-card hover:bg-accent/70 transition-colors cursor-pointer">
                another tag ×
              </Badge>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <ProxySettingsDialog 
          open={false}
          onOpenChange={() => {}}
        />

        <CorsRetryDialog 
          open={false}
          onOpenChange={() => {}}
          onRetry={() => {}}
        />
      </div>
    </div>
  );
};

export default Index;