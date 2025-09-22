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
      const cw = img.width;
      const ch = img.height;
      
      // Set canvas size to match image
      canvas.width = cw;
      canvas.height = ch;

      // Draw base image
      ctx.drawImage(img, 0, 0, cw, ch);

      // CRITICAL: Enforce 25% height cap for all layouts
      const MAX_HEIGHT_PCT = 25;
      const maxBandHeight = (MAX_HEIGHT_PCT / 100) * ch;
      const vPadding = ch * 0.03; // 3% vertical padding
      const availableHeight = Math.max(maxBandHeight - vPadding * 2, 20);
      
      // Layout-specific positioning and background
      let bandY: number;
      let placement: 'top' | 'bottom' | 'center';
      let showBand = true;
      
      switch (layout) {
        case 'memeTopBottom':
          placement = 'top';
          bandY = vPadding;
          break;
        case 'lowerThird':
          placement = 'bottom';
          bandY = ch - maxBandHeight;
          break;
        case 'subtleCaption':
          placement = 'bottom';
          bandY = ch - maxBandHeight;
          showBand = false; // No background band for subtle
          break;
        case 'negativeSpace':
        default:
          placement = 'bottom';
          bandY = ch - maxBandHeight;
          break;
      }

      // Draw background band if needed
      if (showBand) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, bandY, cw, maxBandHeight);
      }

      // Binary search for optimal font size that fits within height and width constraints
      const maxWidth = cw * 0.92; // 92% width for margins
      let lo = 8;
      let hi = Math.floor(availableHeight);
      let bestSize = lo;

      const measureWrappedText = (fontSize: number) => {
        ctx.font = `bold ${fontSize}px Impact, "Arial Black", sans-serif`;
        const words = caption.trim().split(/\s+/);
        const lines: string[] = [];
        let line = '';
        
        for (const word of words) {
          const testLine = line ? line + ' ' + word : word;
          if (ctx.measureText(testLine).width <= maxWidth) {
            line = testLine;
          } else {
            if (line) lines.push(line);
            line = word;
          }
        }
        if (line) lines.push(line);

        // Calculate total height needed
        const lineHeight = fontSize * 1.1;
        const totalHeight = lines.length * lineHeight;
        
        return { lines, lineHeight, totalHeight };
      };

      // Binary search for font size
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const measurement = measureWrappedText(mid);
        
        if (measurement.totalHeight <= availableHeight && 
            measurement.lines.every(line => ctx.measureText(line).width <= maxWidth)) {
          bestSize = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Render the text with optimal size
      const { lines, lineHeight } = measureWrappedText(bestSize);
      
      ctx.font = `bold ${bestSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Position text within the band
      const textAreaCenterY = bandY + maxBandHeight / 2;
      const totalTextHeight = lines.length * lineHeight;
      let currentY = textAreaCenterY - totalTextHeight / 2 + lineHeight / 2;

      // Draw each line with outline for contrast
      for (const line of lines) {
        // Stroke for outline
        ctx.lineWidth = Math.max(2, Math.floor(bestSize * 0.1));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeText(line, cw / 2, currentY);
        
        // Fill for main text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(line, cw / 2, currentY);
        
        currentY += lineHeight;
      }

      // Handle memeTopBottom split text
      if (layout === 'memeTopBottom' && caption.length > 30) {
        const words = caption.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const topText = words.slice(0, midPoint).join(' ');
        const bottomText = words.slice(midPoint).join(' ');
        
        // Clear and redraw
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0);
        
        // Top band
        if (showBand) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(0, vPadding, cw, maxBandHeight);
        }
        
        // Bottom band
        if (showBand) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(0, ch - maxBandHeight - vPadding, cw, maxBandHeight);
        }
        
        // Render top text
        const topMeasurement = measureWrappedText(bestSize);
        ctx.font = `bold ${bestSize}px Impact, "Arial Black", sans-serif`;
        let topY = vPadding + maxBandHeight / 2;
        
        for (const line of topMeasurement.lines) {
          ctx.strokeText(line, cw / 2, topY);
          ctx.fillText(line, cw / 2, topY);
          topY += lineHeight;
        }
        
        // Render bottom text  
        const bottomMeasurement = measureWrappedText(bestSize);
        let bottomY = ch - maxBandHeight - vPadding + maxBandHeight / 2;
        
        for (const line of bottomMeasurement.lines) {
          ctx.strokeText(line, cw / 2, bottomY);
          ctx.fillText(line, cw / 2, bottomY);
          bottomY += lineHeight;
        }
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