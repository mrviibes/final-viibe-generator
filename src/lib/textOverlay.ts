// Enhanced text overlay system with precise layout rendering
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

// Enhanced layout configurations with precise positioning and styling
const layoutConfigs = {
  negativeSpace: {
    position: 'dynamic-negative',
    fontSize: 52,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowBlur: 12,
    shadowColor: 'rgba(0,0,0,0.9)',
    padding: 30,
    maxWidthRatio: 0.6,
    safeAreaInset: 0.15
  },
  memeTopBottom: {
    position: 'top-bottom',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    backgroundColor: 'transparent',
    textColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowBlur: 8,
    shadowColor: 'rgba(0,0,0,0.9)',
    padding: 25,
    maxWidthRatio: 0.95,
    safeAreaInset: 0.05
  },
  lowerThird: {
    position: 'bottom-banner',
    fontSize: 36,
    fontWeight: '600',
    textAlign: 'left' as const,
    backgroundColor: 'rgba(0,0,0,0.8)',
    textColor: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    padding: 25,
    bannerHeight: 0.25,
    borderRadius: 0
  },
  sideBarLeft: {
    position: 'left-panel',
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'left' as const,
    backgroundColor: 'rgba(255,255,255,0.95)',
    textColor: '#000000',
    strokeColor: 'transparent',
    strokeWidth: 0,
    padding: 25,
    panelWidth: 0.35,
    borderRadius: 0
  },
  badgeSticker: {
    position: 'top-right-sticker',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center' as const,
    backgroundColor: '#ff4757',
    textColor: '#ffffff',
    strokeColor: '#ffffff',
    strokeWidth: 1,
    borderRadius: 'circle',
    padding: 20,
    stickerSize: 120,
    shadowBlur: 8,
    shadowColor: 'rgba(0,0,0,0.3)'
  },
  subtleCaption: {
    position: 'bottom-caption',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.6)',
    textColor: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    padding: 15,
    captionHeight: 60,
    maxWidthRatio: 0.8
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

// Enhanced text wrapping with better word breaking
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

// Dynamic font fitting to optimize text size within constraints
function calculateOptimalFontSize(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  maxWidth: number, 
  maxHeight: number, 
  baseFontSize: number,
  config: any
): number {
  let fontSize = baseFontSize;
  let testFontSize = fontSize;
  
  // Test decreasing font sizes until text fits
  while (testFontSize > 12) {
    ctx.font = `${config.fontWeight || 'normal'} ${testFontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
    const lines = wrapText(ctx, text, maxWidth);
    const totalHeight = lines.length * testFontSize * 1.2;
    
    if (totalHeight <= maxHeight) {
      fontSize = testFontSize;
      break;
    }
    testFontSize -= 2;
  }
  
  return fontSize;
}

// Apply enhanced text styles with proper scaling
function applyTextStyles(ctx: CanvasRenderingContext2D, config: any, fontSize: number) {
  ctx.font = `${config.fontWeight || 'normal'} ${fontSize}px 'Inter', 'Helvetica Neue', Arial, sans-serif`;
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = config.textColor;
  
  if (config.strokeWidth > 0) {
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = Math.max(1, config.strokeWidth * (fontSize / 32)); // Scale stroke with font size
  }
  
  if (config.shadowBlur) {
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = config.shadowBlur * (fontSize / 32);
    ctx.shadowOffsetX = Math.max(1, 2 * (fontSize / 32));
    ctx.shadowOffsetY = Math.max(1, 2 * (fontSize / 32));
  }
}

// Enhanced background drawing with proper shapes
function drawTextBackground(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  config: any
) {
  if (config.backgroundColor && config.backgroundColor !== 'transparent') {
    ctx.save();
    ctx.fillStyle = config.backgroundColor;
    ctx.shadowColor = 'transparent'; // Remove shadow for background
    
    if (config.borderRadius === 'circle') {
      // Draw circle for sticker
      const radius = Math.max(width, height) / 2 + config.padding;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add subtle border if stroke is defined
      if (config.strokeColor && config.strokeColor !== 'transparent') {
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = config.strokeWidth || 1;
        ctx.stroke();
      }
    } else if (config.borderRadius && config.borderRadius > 0) {
      // Draw rounded rectangle
      const padding = config.padding || 0;
      ctx.beginPath();
      ctx.roundRect(
        x - width/2 - padding, 
        y - height/2 - padding, 
        width + padding * 2, 
        height + padding * 2, 
        config.borderRadius
      );
      ctx.fill();
    } else {
      // Draw regular rectangle
      const padding = config.padding || 0;
      ctx.fillRect(
        x - width/2 - padding, 
        y - height/2 - padding, 
        width + padding * 2, 
        height + padding * 2
      );
    }
    ctx.restore();
  }
}

// Enhanced positioning with safe areas and dynamic placement
function getTextPosition(
  canvas: HTMLCanvasElement, 
  layout: string, 
  textWidth: number,
  textHeight: number,
  config: any
) {
  const { width, height } = canvas;
  const safeInset = (config.safeAreaInset || 0.1) * Math.min(width, height);
  
  switch (config.position) {
    case 'dynamic-negative':
      // Find the best position in negative space (simplified heuristic)
      // For demo, we'll use center-left or center-right
      const useLeft = Math.random() > 0.5; // In real implementation, analyze image
      return { 
        x: useLeft ? width * 0.25 : width * 0.75, 
        y: height / 2,
        maxWidth: width * (config.maxWidthRatio || 0.6)
      };
    
    case 'top-bottom':
      return [
        { 
          x: width / 2, 
          y: safeInset + textHeight / 2,
          maxWidth: width * (config.maxWidthRatio || 0.9)
        },
        { 
          x: width / 2, 
          y: height - safeInset - textHeight / 2,
          maxWidth: width * (config.maxWidthRatio || 0.9)
        }
      ];
    
    case 'bottom-banner':
      const bannerHeight = height * (config.bannerHeight || 0.25);
      return { 
        x: config.padding, 
        y: height - bannerHeight / 2,
        maxWidth: width - config.padding * 2,
        bannerHeight: bannerHeight,
        bannerY: height - bannerHeight
      };
    
    case 'left-panel':
      const panelWidth = width * (config.panelWidth || 0.35);
      return { 
        x: config.padding, 
        y: height / 2,
        maxWidth: panelWidth - config.padding * 2,
        panelWidth: panelWidth
      };
    
    case 'top-right-sticker':
      const stickerSize = config.stickerSize || 120;
      return { 
        x: width - stickerSize/2 - 20, 
        y: stickerSize/2 + 20,
        maxWidth: stickerSize * 0.8,
        stickerSize: stickerSize
      };
    
    case 'bottom-caption':
      const captionHeight = config.captionHeight || 60;
      return { 
        x: width / 2, 
        y: height - captionHeight / 2,
        maxWidth: width * (config.maxWidthRatio || 0.8),
        captionHeight: captionHeight,
        captionY: height - captionHeight
      };
    
    default:
      return { 
        x: width / 2, 
        y: height / 2,
        maxWidth: width * 0.8
      };
  }
}

// Main enhanced text overlay function
export async function addTextOverlay(imageUrl: string, options: TextOverlayOptions): Promise<string> {
  try {
    const { canvas, ctx, img } = await loadImageToCanvas(imageUrl);
    const config = layoutConfigs[options.layout as keyof typeof layoutConfigs] || layoutConfigs.negativeSpace;
    
    // Calculate responsive font size
    const scaleFactor = Math.min(canvas.width, canvas.height) / 1024;
    const baseFontSize = Math.max(16, config.fontSize * scaleFactor);
    
    // Handle layout-specific rendering
    if (config.position === 'top-bottom') {
      // Enhanced meme-style rendering
      const textParts = options.text.split(' ');
      const midPoint = Math.ceil(textParts.length / 2);
      const topText = textParts.slice(0, midPoint).join(' ');
      const bottomText = textParts.slice(midPoint).join(' ');
      
      const positions = getTextPosition(canvas, options.layout, 0, 0, config) as any[];
      
      if (topText) {
        const fontSize = calculateOptimalFontSize(ctx, topText, positions[0].maxWidth, canvas.height * 0.3, baseFontSize, config);
        applyTextStyles(ctx, config, fontSize);
        const topLines = wrapText(ctx, topText, positions[0].maxWidth);
        
        topLines.forEach((line, index) => {
          const y = positions[0].y + (index - topLines.length/2 + 0.5) * fontSize * 1.2;
          if (config.strokeWidth > 0) ctx.strokeText(line, positions[0].x, y);
          ctx.fillText(line, positions[0].x, y);
        });
      }
      
      if (bottomText) {
        const fontSize = calculateOptimalFontSize(ctx, bottomText, positions[1].maxWidth, canvas.height * 0.3, baseFontSize, config);
        applyTextStyles(ctx, config, fontSize);
        const bottomLines = wrapText(ctx, bottomText, positions[1].maxWidth);
        
        bottomLines.forEach((line, index) => {
          const y = positions[1].y + (index - bottomLines.length/2 + 0.5) * fontSize * 1.2;
          if (config.strokeWidth > 0) ctx.strokeText(line, positions[1].x, y);
          ctx.fillText(line, positions[1].x, y);
        });
      }
      
    } else if (config.position === 'bottom-banner') {
      // Enhanced lower third banner
      const position = getTextPosition(canvas, options.layout, 0, 0, config) as any;
      
      // Draw full-width banner background
      if (config.backgroundColor && config.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, position.bannerY, canvas.width, position.bannerHeight);
        ctx.restore();
      }
      
      const fontSize = calculateOptimalFontSize(ctx, options.text, position.maxWidth, position.bannerHeight * 0.8, baseFontSize, config);
      applyTextStyles(ctx, config, fontSize);
      const lines = wrapText(ctx, options.text, position.maxWidth);
      
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        ctx.fillText(line, position.x, y);
      });
      
    } else if (config.position === 'left-panel') {
      // Enhanced left sidebar
      const position = getTextPosition(canvas, options.layout, 0, 0, config) as any;
      
      // Draw panel background
      if (config.backgroundColor && config.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, position.panelWidth, canvas.height);
        ctx.restore();
      }
      
      const fontSize = calculateOptimalFontSize(ctx, options.text, position.maxWidth, canvas.height * 0.8, baseFontSize, config);
      applyTextStyles(ctx, config, fontSize);
      const lines = wrapText(ctx, options.text, position.maxWidth);
      
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        ctx.fillText(line, position.x, y);
      });
      
    } else if (config.position === 'top-right-sticker') {
      // Enhanced circular sticker
      const position = getTextPosition(canvas, options.layout, 0, 0, config) as any;
      const fontSize = calculateOptimalFontSize(ctx, options.text, position.maxWidth, position.stickerSize * 0.6, baseFontSize, config);
      
      // Draw circular sticker background with shadow
      if ('shadowBlur' in config && config.shadowBlur) {
        ctx.save();
        ctx.shadowColor = config.shadowColor || 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = config.shadowBlur;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        drawTextBackground(ctx, position.x, position.y, position.maxWidth, fontSize, config);
        ctx.restore();
      } else {
        drawTextBackground(ctx, position.x, position.y, position.maxWidth, fontSize, config);
      }
      
      applyTextStyles(ctx, config, fontSize);
      const lines = wrapText(ctx, options.text, position.maxWidth);
      
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        ctx.fillText(line, position.x, y);
      });
      
    } else if (config.position === 'bottom-caption') {
      // Enhanced caption strip
      const position = getTextPosition(canvas, options.layout, 0, 0, config) as any;
      
      // Draw caption background
      if (config.backgroundColor && config.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, position.captionY, canvas.width, position.captionHeight);
        ctx.restore();
      }
      
      const fontSize = calculateOptimalFontSize(ctx, options.text, position.maxWidth, position.captionHeight * 0.8, baseFontSize, config);
      applyTextStyles(ctx, config, fontSize);
      const lines = wrapText(ctx, options.text, position.maxWidth);
      
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        ctx.fillText(line, position.x, y);
      });
      
    } else {
      // Enhanced negative space positioning
      const position = getTextPosition(canvas, options.layout, 0, 0, config) as any;
      const fontSize = calculateOptimalFontSize(ctx, options.text, position.maxWidth, canvas.height * 0.6, baseFontSize, config);
      applyTextStyles(ctx, config, fontSize);
      const lines = wrapText(ctx, options.text, position.maxWidth);
      
      // Calculate text dimensions for potential background
      const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
      const textHeight = lines.length * fontSize * 1.2;
      
      // Draw background if needed
      if (config.backgroundColor && config.backgroundColor !== 'transparent') {
        drawTextBackground(ctx, position.x, position.y, textWidth, textHeight, config);
      }
      
      lines.forEach((line, index) => {
        const y = position.y + (index - lines.length/2 + 0.5) * fontSize * 1.2;
        if (config.strokeWidth > 0) ctx.strokeText(line, position.x, y);
        ctx.fillText(line, position.x, y);
      });
    }
    
    // Convert canvas to blob URL with high quality
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(imageUrl); // fallback to original
        }
      }, 'image/jpeg', 0.95);
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