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
  }, [backgroundImageUrl, text, fontSize, fontFamily, textColor, strokeColor, strokeWidth, textAlign, verticalAlign]);

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