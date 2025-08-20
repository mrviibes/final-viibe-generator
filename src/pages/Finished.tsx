import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, RotateCcw, Home, Sparkles } from "lucide-react";

interface ViibeData {
  category: string;
  subcategory: string;
  textStyle: string;
  visualStyle: string;
  dimensions: string;
  customText: string;
  customTags: string;
  customVisualDescription: string;
}

const Finished = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const viibeData = location.state as ViibeData;

  // If no data is provided, redirect to home
  if (!viibeData) {
    navigate('/');
    return null;
  }

  const handleDownload = () => {
    // Placeholder for download functionality
    console.log("Download functionality would be implemented here");
  };

  const handleGenerateAgain = () => {
    // Navigate back to the builder with the current selections
    navigate('/', { state: { preserveSelections: viibeData } });
  };

  const handleStartOver = () => {
    // Navigate back to the builder with cleared state
    navigate('/');
  };

  // Generate a summary of the selections
  const generatePrompt = () => {
    const parts = [];
    
    if (viibeData.customText) {
      parts.push(`Text: "${viibeData.customText}"`);
    }
    
    if (viibeData.textStyle) {
      parts.push(`Text Style: ${viibeData.textStyle}`);
    }
    
    if (viibeData.visualStyle) {
      parts.push(`Visual Style: ${viibeData.visualStyle}`);
    }
    
    if (viibeData.customVisualDescription) {
      parts.push(`Visual Description: ${viibeData.customVisualDescription}`);
    }
    
    if (viibeData.category && viibeData.subcategory) {
      parts.push(`Category: ${viibeData.category} - ${viibeData.subcategory}`);
    }
    
    if (viibeData.dimensions) {
      parts.push(`Dimensions: ${viibeData.dimensions}`);
    }
    
    if (viibeData.customTags) {
      parts.push(`Tags: ${viibeData.customTags}`);
    }
    
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">YOUR VIIBE</h1>
          <p className="text-muted-foreground">Your custom VIIBE is ready!</p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#0db0de]" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gradient-to-br from-muted/50 to-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      VIIBE generation coming soon!
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your {viibeData.dimensions} VIIBE will appear here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <Button
                onClick={handleDownload}
                className="bg-[#0db0de] hover:bg-[#0db0de]/90 text-white"
                disabled
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleGenerateAgain}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Generate Again
              </Button>
              <Button
                onClick={handleStartOver}
                variant="outline"
              >
                <Home className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>

          {/* Design Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Design Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Category</span>
                    <span className="text-muted-foreground">
                      {viibeData.category} - {viibeData.subcategory}
                    </span>
                  </div>
                  
                  {viibeData.textStyle && (
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">Text Style</span>
                      <Badge variant="secondary">{viibeData.textStyle}</Badge>
                    </div>
                  )}
                  
                  {viibeData.visualStyle && (
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="font-medium">Visual Style</span>
                      <Badge variant="secondary">{viibeData.visualStyle}</Badge>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="font-medium">Dimensions</span>
                    <Badge variant="secondary">{viibeData.dimensions}</Badge>  
                  </div>
                  
                  {viibeData.customText && (
                    <div className="py-2 border-b border-border">
                      <span className="font-medium">Custom Text</span>
                      <p className="text-muted-foreground mt-1 text-sm">"{viibeData.customText}"</p>
                    </div>
                  )}
                  
                  {viibeData.customTags && (
                    <div className="py-2 border-b border-border">
                      <span className="font-medium">Tags</span>
                      <p className="text-muted-foreground mt-1 text-sm">{viibeData.customTags}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Generated Prompt */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                    {generatePrompt()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finished;