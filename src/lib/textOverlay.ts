// Text overlay system for adding text to background images
export interface TextOverlayOptions {
  text: string;
  layout: string;
  aspectRatio: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  padding?: number;
}

// Layout-specific text positioning and styling
const layoutConfigs = {
  negativeSpace: {
    position: 'center',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowBlur: 10,
    shadowColor: 'rgba(0,0,0,0.8)',
    padding: 20
  },
  memeTopBottom: {
    position: 'top-bottom',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowBlur: 5,
    shadowColor: 'rgba(0,0,0,0.8)',
    padding: 20
  },
  lowerThird: {
    position: 'bottom-banner',
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'left' as const,
    backgroundColor: 'rgba(0,0,0,0.7)',
    textColor: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    padding: 20
  },
  subtleCaption: {
    position: 'bottom-caption',
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.5)',
    textColor: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    padding: 10
  }
};

// Load image and return canvas context
function loadImageToCanvas(imageUrl: string): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw the background image
      ctx.drawImage(img, 0, 0);
      
      resolve({ canvas, ctx, img });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

// Wrap text to fit within specified width
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Apply text styles to canvas context
function applyTextStyles(ctx: CanvasRenderingContext2D, config: any, fontSize: number) {
  ctx.font = `${config.fontWeight || 'normal'} ${fontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = config.textColor;
  
  if (config.strokeWidth > 0) {
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;
  }
  
  if (config.shadowBlur) {
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = config.shadowBlur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }
}

// Draw background for text (if needed)
function drawTextBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, config: any) {
  if (config.backgroundColor && config.backgroundColor !== 'transparent') {
    ctx.save();
    ctx.fillStyle = config.backgroundColor;
    
    if (config.borderRadius) {
      // Draw rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x - width/2 - config.padding, y - height/2 - config.padding, 
                   width + config.padding * 2, height + config.padding * 2, config.borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x - width/2 - config.padding, y - height/2 - config.padding, 
                  width + config.padding * 2, height + config.padding * 2);
    }
    ctx.restore();
  }
}

// Position text based on layout
function getTextPosition(canvas: HTMLCanvasElement, layout: string, textHeight: number) {
  const { width, height } = canvas;
  const config = layoutConfigs[layout as keyof typeof layoutConfigs] || layoutConfigs.negativeSpace;
  
  switch (config.position) {
    case 'center':
      return { x: width / 2, y: height / 2 };
    
    case 'top-bottom':
      return [
        { x: width / 2, y: textHeight },
        { x: width / 2, y: height - textHeight }
      ];
    
    case 'bottom-banner':
      return { x: config.padding, y: height - (textHeight / 2 + config.padding) };
    
    case 'left-panel':
      return { x: config.padding, y: height / 2 };
    
    case 'top-right-badge':
      return { x: width - 100, y: 60 };
    
    case 'bottom-caption':
      return { x: width / 2, y: height - (textHeight / 2 + config.padding) };
    
    default:
      return { x: width / 2, y: height / 2 };
  }
}

// Main text overlay function
export async function addTextOverlay(imageUrl: string, options: TextOverlayOptions): Promise<string> {
  try {
    const { canvas, ctx, img } = await loadImageToCanvas(imageUrl);
    const config = layoutConfigs[options.layout as keyof typeof layoutConfigs] || layoutConfigs.negativeSpace;
    
    // Calculate responsive font size based on canvas dimensions
    const baseFontSize = config.fontSize;
    const scaleFactor = Math.min(canvas.width, canvas.height) / 1024;
    const fontSize = Math.max(16, baseFontSize * scaleFactor);
    
    // Apply text styles
    applyTextStyles(ctx, config, fontSize);
    
    // Handle different layout types
    if (config.position === 'top-bottom') {
      // Meme-style: split text into top and bottom
      const textParts = options.text.split(' ');
      const midPoint = Math.ceil(textParts.length / 2);
      const topText = textParts.slice(0, midPoint).join(' ');
      const bottomText = textParts.slice(midPoint).join(' ');
      
      if (topText) {
        const topLines = wrapText(ctx, topText, canvas.width * 0.9);
        const positions = getTextPosition(canvas, options.layout, fontSize * topLines.length) as any[];
        
        topLines.forEach((line, index) => {
          const y = positions[0].y + (index - topLines.length/2 + 0.5) * fontSize * 1.2;
          if (config.strokeWidth > 0) ctx.strokeText(line, positions[0].x, y);
          ctx.fillText(line, positions[0].x, y);
        });
      }
      
      if (bottomText) {
        const bottomLines = wrapText(ctx, bottomText, canvas.width * 0.9);
        const positions = getTextPosition(canvas, options.layout, fontSize * bottomLines.length) as any[];
        
        bottomLines.forEach((line, index) => {
          const y = positions[1].y + (index - bottomLines.length/2 + 0.5) * fontSize * 1.2;
          if (config.strokeWidth > 0) ctx.strokeText(line, positions[1].x, y);
          ctx.fillText(line, positions[1].x, y);
        });
      }
    } else {
      // Single position layouts
      const maxWidth = config.position === 'left-panel' ? canvas.width * 0.4 : canvas.width * 0.9;
      const lines = wrapText(ctx, options.text, maxWidth);
      const position = getTextPosition(canvas, options.layout, fontSize * lines.length) as { x: number; y: number };
      
      // Calculate total text dimensions for background
      const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const textHeight = lines.length * fontSize * 1.2;
      
      // Draw background if needed
      if (config.backgroundColor && config.backgroundColor !== 'transparent') {
        drawTextBackground(ctx, position.x, position.y, textWidth, textHeight, config);
      }
      
      // Draw text lines
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        if (config.strokeWidth > 0) ctx.strokeText(line, position.x, y);
        ctx.fillText(line, position.x, y);
      });
    }
    
    // Convert canvas to blob URL
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(imageUrl); // fallback to original
        }
      }, 'image/jpeg', 0.9);
    });
    
  } catch (error) {
    console.error('Error adding text overlay:', error);
    return imageUrl; // Return original image on error
  }
}

// Cleanup blob URLs to prevent memory leaks
export function cleanupBlobUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}