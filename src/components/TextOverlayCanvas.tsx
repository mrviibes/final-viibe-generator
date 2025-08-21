import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download } from "lucide-react";

interface TextOverlayCanvasProps {
  backgroundImageUrl: string;
  text: string;
  onImageGenerated: (url: string) => void;
}

export function TextOverlayCanvas({ backgroundImageUrl, text, onImageGenerated }: TextOverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontSize, setFontSize] = useState([48]);
  const [fontFamily, setFontFamily] = useState("Arial Black");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState([2]);
  const [textAlign, setTextAlign] = useState("center");
  const [verticalAlign, setVerticalAlign] = useState("center");
  const [showBackdrop, setShowBackdrop] = useState(true);
  const [backdropColor, setBackdropColor] = useState("#000000");
  const [backdropOpacity, setBackdropOpacity] = useState([0.5]);
  const [backdropPadding, setBackdropPadding] = useState([20]);
  const [backdropRadius, setBackdropRadius] = useState([8]);

  const fonts = [
    "Arial Black",
    "Impact",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Comic Sans MS"
  ];

  const drawText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load background image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw background
      ctx.drawImage(img, 0, 0);

      // Configure text
      ctx.font = `bold ${fontSize[0]}px ${fontFamily}`;
      ctx.textAlign = textAlign as CanvasTextAlign;
      ctx.textBaseline = "middle";

      // Calculate position
      let x: number;
      switch (textAlign) {
        case "left": x = canvas.width * 0.1; break;
        case "right": x = canvas.width * 0.9; break;
        default: x = canvas.width / 2; break;
      }

      let y: number;
      switch (verticalAlign) {
        case "top": y = canvas.height * 0.2; break;
        case "bottom": y = canvas.height * 0.8; break;
        default: y = canvas.height / 2; break;
      }

      // Word wrap for long text
      const maxWidth = canvas.width * 0.8;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);

      // Draw backdrop if enabled
      if (showBackdrop) {
        const lineHeight = fontSize[0] * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        
        const backdropWidth = maxLineWidth + (backdropPadding[0] * 2);
        const backdropHeight = totalTextHeight + (backdropPadding[0] * 2);
        const backdropX = x - backdropWidth / 2;
        const backdropY = y - backdropHeight / 2;
        
        ctx.save();
        ctx.globalAlpha = backdropOpacity[0];
        ctx.fillStyle = backdropColor;
        
        if (backdropRadius[0] > 0) {
          ctx.beginPath();
          ctx.roundRect(backdropX, backdropY, backdropWidth, backdropHeight, backdropRadius[0]);
          ctx.fill();
        } else {
          ctx.fillRect(backdropX, backdropY, backdropWidth, backdropHeight);
        }
        ctx.restore();
      }

      // Draw text with stroke
      const lineHeight = fontSize[0] * 1.2;
      const startY = y - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        const lineY = startY + (index * lineHeight);
        
        // Draw stroke
        if (strokeWidth[0] > 0) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth[0];
          ctx.strokeText(line, x, lineY);
        }
        
        // Draw fill
        ctx.fillStyle = textColor;
        ctx.fillText(line, x, lineY);
      });

      // Convert to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onImageGenerated(url);
        }
      }, 'image/png');
    };

    img.src = backgroundImageUrl;
  };

  useEffect(() => {
    drawText();
  }, [backgroundImageUrl, text, fontSize, fontFamily, textColor, strokeColor, strokeWidth, textAlign, verticalAlign, showBackdrop, backdropColor, backdropOpacity, backdropPadding, backdropRadius]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'text-overlay-image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Font</label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fonts.map(font => (
                <SelectItem key={font} value={font}>{font}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Text Size: {fontSize[0]}px</label>
          <Slider
            value={fontSize}
            onValueChange={setFontSize}
            max={120}
            min={24}
            step={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Text Color</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-full h-10 rounded border"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Stroke Color</label>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-full h-10 rounded border"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Stroke Width: {strokeWidth[0]}px</label>
          <Slider
            value={strokeWidth}
            onValueChange={setStrokeWidth}
            max={10}
            min={0}
            step={1}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Text Alignment</label>
          <Select value={textAlign} onValueChange={setTextAlign}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Vertical Position</label>
          <Select value={verticalAlign} onValueChange={setVerticalAlign}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Backdrop Controls */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="showBackdrop"
            checked={showBackdrop}
            onChange={(e) => setShowBackdrop(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showBackdrop" className="text-sm font-medium">
            Text Backdrop Plate (improves readability)
          </label>
        </div>

        {showBackdrop && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Backdrop Color</label>
              <input
                type="color"
                value={backdropColor}
                onChange={(e) => setBackdropColor(e.target.value)}
                className="w-full h-10 rounded border"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Opacity: {Math.round(backdropOpacity[0] * 100)}%</label>
              <Slider
                value={backdropOpacity}
                onValueChange={setBackdropOpacity}
                max={1}
                min={0}
                step={0.1}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Padding: {backdropPadding[0]}px</label>
              <Slider
                value={backdropPadding}
                onValueChange={setBackdropPadding}
                max={50}
                min={0}
                step={5}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Border Radius: {backdropRadius[0]}px</label>
              <Slider
                value={backdropRadius}
                onValueChange={setBackdropRadius}
                max={20}
                min={0}
                step={2}
              />
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Button onClick={downloadImage} className="gap-2">
          <Download className="h-4 w-4" />
          Download Image
        </Button>
      </div>

      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto border rounded-lg shadow-lg mx-auto block"
        style={{ maxHeight: "400px" }}
      />
    </div>
  );
}