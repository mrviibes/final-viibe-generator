import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface TextOverlayProps {
  backgroundImageUrl: string;
  text: string;
  layoutSpec: any;
  onImageReady?: (imageUrl: string) => void;
}

export function TextOverlay({ backgroundImageUrl, text, layoutSpec, onImageReady }: TextOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !backgroundImageUrl || !text) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw background image
      ctx.drawImage(img, 0, 0);
      
      // Apply text overlay based on layout zones
      if (layoutSpec?.zones) {
        layoutSpec.zones.forEach((zone: any) => {
          drawTextInZone(ctx, text, zone, canvas.width, canvas.height);
        });
      }
      
      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFinalImageUrl(url);
          onImageReady?.(url);
        }
      }, 'image/png');
    };
    
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl, text, layoutSpec, onImageReady]);

  const drawTextInZone = (ctx: CanvasRenderingContext2D, text: string, zone: any, canvasWidth: number, canvasHeight: number) => {
    // Parse zone coordinates (handle percentages)
    const x = typeof zone.x === 'string' && zone.x.includes('%') 
      ? (parseFloat(zone.x) / 100) * canvasWidth 
      : zone.x;
    const y = typeof zone.y === 'string' && zone.y.includes('%') 
      ? (parseFloat(zone.y) / 100) * canvasHeight 
      : zone.y;
    const w = typeof zone.w === 'string' && zone.w.includes('%') 
      ? (parseFloat(zone.w) / 100) * canvasWidth 
      : zone.w;
    const h = typeof zone.h === 'string' && zone.h.includes('%') 
      ? (parseFloat(zone.h) / 100) * canvasHeight 
      : zone.h;

    // Apply padding
    const padding = zone.padding ? parseFloat(zone.padding.replace('%', '')) / 100 : 0.05;
    const paddingX = w * padding;
    const paddingY = h * padding;
    
    const textX = x + paddingX;
    const textY = y + paddingY;
    const textWidth = w - (2 * paddingX);
    const textHeight = h - (2 * paddingY);

    // Calculate optimal font size
    const maxFontSize = Math.min(textHeight * 0.6, textWidth * 0.1);
    const fontSize = Math.max(16, Math.min(maxFontSize, 60));

    // Set text styles
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, fontSize / 20);
    ctx.textAlign = zone.align === 'center' ? 'center' : 'left';
    
    // Calculate text position based on alignment
    const finalX = zone.align === 'center' ? textX + (textWidth / 2) : textX;
    const finalY = zone.valign === 'middle' 
      ? textY + (textHeight / 2) + (fontSize / 3)
      : textY + fontSize;

    // Apply text transform if specified
    const displayText = zone.allCaps ? text.toUpperCase() : text;

    // Draw text with stroke for better visibility
    if (zone.stroke) {
      ctx.strokeText(displayText, finalX, finalY);
    }
    ctx.fillText(displayText, finalX, finalY);
  };

  const handleDownload = () => {
    if (!finalImageUrl) return;
    
    const a = document.createElement('a');
    a.href = finalImageUrl;
    a.download = 'image-with-text.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto border border-border rounded-lg shadow-lg"
        style={{ display: finalImageUrl ? 'block' : 'none' }}
      />
      
      {finalImageUrl && (
        <div className="flex gap-2">
          <Button 
            onClick={handleDownload} 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Final Image
          </Button>
        </div>
      )}
    </div>
  );
}