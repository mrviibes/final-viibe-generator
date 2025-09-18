import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CaptionOverlayProps {
  imageUrl: string;
  caption: string;
  layout: string;
  onImageReady?: (dataUrl: string) => void;
  fallbackMode?: boolean; // For programmatic overlay fallback
}

export function CaptionOverlay({ imageUrl, caption, layout, onImageReady, fallbackMode = false }: CaptionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl || !caption) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw base image
      ctx.drawImage(img, 0, 0);

      // Enhanced text properties for fallback mode
      const fontSize = fallbackMode ? Math.max(24, Math.min(48, canvas.width / 20)) : Math.max(img.width * 0.05, 24);
      ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = fallbackMode ? Math.max(2, fontSize / 16) : fontSize * 0.1;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = fontSize * 0.1;

      // Position text based on layout
      let x = img.width / 2;
      let y: number;

      switch (layout) {
        case 'memeTopBottom':
          // Top placement
          y = fontSize * 1.5;
          break;
        case 'lowerThird':
          y = img.height - (img.height * 0.25);
          break;
        case 'subtleCaption':
        case 'negativeSpace':
        default:
          y = img.height - fontSize * 1.5;
          break;
      }

      // Draw text with stroke for better visibility
      ctx.strokeText(caption, x, y);
      ctx.fillText(caption, x, y);

      // If memeTopBottom and long text, also add bottom text
      if (layout === 'memeTopBottom' && caption.length > 30) {
        const words = caption.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const topText = words.slice(0, midPoint).join(' ');
        const bottomText = words.slice(midPoint).join(' ');
        
        // Clear and redraw with split text
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Top text
        ctx.strokeText(topText, x, fontSize * 1.5);
        ctx.fillText(topText, x, fontSize * 1.5);
        
        // Bottom text
        const bottomY = img.height - fontSize * 1.5;
        ctx.strokeText(bottomText, x, bottomY);
        ctx.fillText(bottomText, x, bottomY);
      }

      setIsReady(true);
      
      // Provide composed image to parent
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onImageReady?.(dataUrl);
    };

    img.onerror = () => {
      console.error('Failed to load image for caption overlay');
    };

    img.src = imageUrl;
  }, [imageUrl, caption, layout, onImageReady]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'image-with-caption.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  return (
    <div className="space-y-4">
      <canvas 
        ref={canvasRef}
        className="max-w-full h-auto border border-border rounded-lg"
        style={{ display: isReady ? 'block' : 'none' }}
      />
      
      {!isReady && (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Composing caption overlay...</p>
        </div>
      )}

      {isReady && (
        <div className="flex justify-end">
          <Button onClick={handleDownload} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download with Caption
          </Button>
        </div>
      )}
    </div>
  );
}