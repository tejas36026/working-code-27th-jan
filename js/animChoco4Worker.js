// Global constants
const CHOCOLATE_COUNT_MAX = 1000;
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.12;
const GRAVITY_FACTOR = 0.96;
const AIR_RESISTANCE = 0.95;

// Chocolate types and shapes
const CHOCOLATE_TYPES = {
  DARK: 'dark',
  MILK: 'milk',
  WHITE: 'white',
  TRUFFLE: 'truffle',
  COCOA: 'cocoa'
};

const CHOCOLATE_SHAPES = {
  SQUARE: 'square',
  RECTANGLE: 'rectangle',
  TRAPEZOID: 'trapezoid',
  ROUND: 'round',
  OVAL: 'oval',
  HEART: 'heart',
  TRUFFLE: 'truffle',
  CHUNK: 'chunk',
  SPLAT: 'splat'
};

// Enhanced chocolate color palette with richer tones and better contrast
const CHOCOLATE_COLORS = [
  { r: 45, g: 25, b: 12, a: 1 },      // Extra dark chocolate (darker and richer)
  { r: 65, g: 35, b: 18, a: 1 },      // Rich dark chocolate
  { r: 85, g: 48, b: 25, a: 1 },      // Semi-dark chocolate
  { r: 115, g: 65, b: 35, a: 1 },     // Premium milk chocolate
  { r: 140, g: 80, b: 40, a: 1 },     // Creamy milk chocolate
  { r: 165, g: 100, b: 65, a: 1 },    // Caramel (warmer tone)
  { r: 150, g: 120, b: 100, a: 1 },   // Mocha 
  { r: 110, g: 68, b: 39, a: 1 },     // Hazelnut
  { r: 225, g: 200, b: 170, a: 1 },   // White chocolate (brighter)
  { r: 235, g: 210, b: 180, a: 1 }    // Premium white chocolate
];

// Animation state
let canvas = null;
let ctx = null;
let chocolates = [];
let chocolateSplats = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let chocolateCount = 0;
let performanceLevel = 1.0;
let chocolatePrototypes = {};
let splashCenter = { x: 0, y: 0 };
let renderQuality = 'high';

// Add debounce function from metallicss
function debounce(callback, delay = 250) {
  let timeout;
  
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };
}

self.onmessage = function(e) {
  const { 
    imageData, 
    selectedRegions, 
    value,
    reset,
    deviceInfo,
    quality 
  } = e.data;
  
  try {
    const currentTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    
    // Set render quality if provided
    if (quality) {
      renderQuality = quality;
    }
    
    // Initialize canvas if not already done
    if (!canvas) {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', { alpha: true });
      
      // Set dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Set splash center
      splashCenter = { x: width / 2, y: height / 2 };
      
      // Initialize performance level based on device info
      if (deviceInfo) {
        if (deviceInfo.isLowPower) {
          performanceLevel = 0.5;
        } else if (deviceInfo.isHighPerformance) {
          performanceLevel = 1.2;
        }
      }
      
      // Create chocolate prototypes with enhanced rendering
      createMetallicChocolatePrototypes();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      chocolates = [];
      chocolateSplats = [];
      
      // Determine chocolate count based on performance level
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel);
      
      // Create chocolates
      createMetallicChocolates(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine chocolate count based on performance level
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel);
      
      // Create chocolates
      createMetallicChocolates(width, height);
    }
    
    // Calculate time delta for physics (clamped for stability)
    const deltaTime = Math.min(33, currentTime - previousTime) / 16.67;
    previousTime = currentTime;
    
    // Calculate animation progress
    const elapsed = currentTime - startTime;
    const progress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw original image
    const imageDataTemp = new ImageData(
      new Uint8ClampedArray(imageData.data),
      width,
      height
    );
    ctx.putImageData(imageDataTemp, 0, 0);
    
    // Draw enhanced liquid chocolate splash with metallic effect
    drawMetallicChocolateSplash(ctx, width, height, progress);
    
    // Draw chocolate splats with enhanced metallic effects
    drawMetallicChocolateSplats(ctx, deltaTime);
    
    // Update and draw chocolates with enhanced metallic effects
    updateAndDrawMetallicChocolates(ctx, deltaTime, progress);
    
    // Add dripping effect with enhanced rendering
    if (progress > 0.2 && progress < 0.8) {
      drawMetallicChocolateDrips(ctx, width, height, progress);
    }
    
    // Check if we need to adjust performance
    if (frameCount % 30 === 0) {
      // Measure FPS
      const fps = 1000 / (deltaTime * 16.67);
      
      // Adjust performance if needed
      if (fps < 40 && performanceLevel > 0.4) {
        performanceLevel = Math.max(0.4, performanceLevel - 0.1);
      } else if (fps > 55 && performanceLevel < 1.2) {
        performanceLevel = Math.min(1.2, performanceLevel + 0.05);
      }
    }
    
    // Copy canvas content back to imageData
    const resultImageData = ctx.getImageData(0, 0, width, height);
    
    // Increment frame counter
    frameCount++;
    
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      progress,
      performance: {
        chocolateCount: chocolates.length,
        performanceLevel
      }
    }, [resultImageData.data.buffer]);
  } catch (error) {
    self.postMessage({
      error: error.message,
      isComplete: true
    });
  }
};

function createMetallicChocolatePrototypes() {
  const prototypeCanvas = new OffscreenCanvas(64, 64);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  chocolatePrototypes = {};
  
  // Create different chocolate shapes with metallic finish and cache them
  for (const type of Object.values(CHOCOLATE_TYPES)) {
    chocolatePrototypes[type] = {};
    
    for (const shape of Object.values(CHOCOLATE_SHAPES)) {
      chocolatePrototypes[type][shape] = {};
      
      for (const color of CHOCOLATE_COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes
        for (let size = 1; size <= 32; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 64, 64);
          
          const halfSize = size / 2;
          const center = 32;
          
          // Draw with enhanced metallic effect
          renderMetallicChocolate(prototypeCtx, center, center, size, shape, color, type);
          
          // Store the prototype
          if (!chocolatePrototypes[type][shape][colorKey]) {
            chocolatePrototypes[type][shape][colorKey] = {};
          }
          chocolatePrototypes[type][shape][colorKey][key] = prototypeCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

function renderMetallicChocolate(ctx, x, y, size, shape, color, type) {
  // Calculate derived colors for metallic effect
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  const lightColor = `rgb(${Math.min(255, color.r+40)},${Math.min(255, color.g+30)},${Math.min(255, color.b+20)})`;
  const midColor = `rgb(${color.r},${color.g},${color.b})`;
  const darkColor = `rgb(${Math.max(0, color.r-50)},${Math.max(0, color.g-50)},${Math.max(0, color.b-50)})`;
  const darkerColor = `rgb(${Math.max(0, color.r-70)},${Math.max(0, color.g-70)},${Math.max(0, color.b-70)})`;
  
  // Convexity parameter for 3D effect
  const convexity = size / 5;
  const halfSize = size / 2;
  
  ctx.save();
  
  switch (shape) {
    case CHOCOLATE_SHAPES.SQUARE:
      // Create enhanced square chocolate with metallic finish
      // Create base colors for 3D effect
      const squareGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      
      squareGradient.addColorStop(0, lightColor);
      squareGradient.addColorStop(0.4, midColor);
      squareGradient.addColorStop(0.8, darkColor);
      squareGradient.addColorStop(1, darkerColor);
      
      // Shadow effect
      ctx.fillStyle = darkerColor;
      ctx.beginPath();
      ctx.roundRect(x - halfSize - 1, y - halfSize - 1, size + 2, size + 2, size/6);
      ctx.fill();
      
      // Main shape with rounded corners
      ctx.fillStyle = squareGradient;
      ctx.beginPath();
      ctx.roundRect(x - halfSize, y - halfSize, size, size, size/8);
      ctx.fill();
      
      // Add metallic texture with diagonal lighting
      const metallicGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      metallicGradient.addColorStop(0, "rgba(255,255,255,0.4)");
      metallicGradient.addColorStop(0.2, "rgba(255,255,255,0.1)");
      metallicGradient.addColorStop(0.5, "rgba(255,255,255,0)");
      metallicGradient.addColorStop(0.8, "rgba(20,10,0,0.1)");
      metallicGradient.addColorStop(1, "rgba(20,10,0,0.2)");
      
      ctx.fillStyle = metallicGradient;
      ctx.beginPath();
      ctx.roundRect(x - halfSize, y - halfSize, size, size, size/8);
      ctx.fill();
      
      // Add chocolate segment pattern - deeper grooves
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1.5, size/10);
      
      // Horizontal and vertical segment lines
      ctx.beginPath();
      ctx.moveTo(x - halfSize + size/8, y);
      ctx.lineTo(x + halfSize - size/8, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y - halfSize + size/8);
      ctx.lineTo(x, y + halfSize - size/8);
      ctx.stroke();
      
      // Add sharp highlight
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.roundRect(x - halfSize + size/5, y - halfSize + size/5, size/4, size/4, size/20);
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.ROUND:
      // Create enhanced round chocolate with metallic finish
      // Main metallic gradient
      const roundGradient = ctx.createRadialGradient(
        x - halfSize/3, y - halfSize/3, 0,
        x, y, halfSize
      );
      
      roundGradient.addColorStop(0, lightColor);
      roundGradient.addColorStop(0.4, midColor);
      roundGradient.addColorStop(0.8, darkColor);
      roundGradient.addColorStop(1, darkerColor);
      
      // Draw the shape
      ctx.fillStyle = roundGradient;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add metallic sheen with gradient
      const shineGradient = ctx.createRadialGradient(
        x - halfSize/3, y - halfSize/3, 0,
        x - halfSize/3, y - halfSize/3, halfSize*1.2
      );
      
      shineGradient.addColorStop(0, "rgba(255,255,255,0.8)");
      shineGradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
      shineGradient.addColorStop(0.7, "rgba(255,255,255,0)");
      
      ctx.fillStyle = shineGradient;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add textured surface with noise pattern - similar to metallicss effect
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 10; i++) {
        const noiseSize = halfSize * 0.2;
        const nx = x + (Math.random() - 0.5) * halfSize * 1.6;
        const ny = y + (Math.random() - 0.5) * halfSize * 1.6;
        
        ctx.fillStyle = Math.random() > 0.5 ? 
          `rgba(255,255,255,0.3)` : darkerColor;
          
        ctx.beginPath();
        ctx.arc(nx, ny, noiseSize * Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Edge shadow
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1, size/12);
      ctx.beginPath();
      ctx.arc(x, y, halfSize - ctx.lineWidth/2, 0, Math.PI * 2);
      ctx.stroke();
      break;
      
    case CHOCOLATE_SHAPES.HEART:
      // Enhanced heart with metallic finish
      // Create heart shape
      ctx.fillStyle = midColor;
      drawMetallicHeart(ctx, x, y, halfSize);
      
      // Create 3D effect with shadow gradient
      const heartDarkShade = darkerColor;
      const heartHighlight = lightColor;
      
      // Add reflective gradient similar to metallicss
      const heartGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize/2, y + halfSize/2
      );
      heartGradient.addColorStop(0, "rgba(255,255,255,0.6)");
      heartGradient.addColorStop(0.2, "rgba(255,255,255,0.2)");
      heartGradient.addColorStop(0.5, "rgba(255,255,255,0)");
      heartGradient.addColorStop(0.8, "rgba(0,0,0,0.1)");
      heartGradient.addColorStop(1, "rgba(0,0,0,0.2)");
      
      ctx.fillStyle = heartGradient;
      drawMetallicHeart(ctx, x, y, halfSize * 0.98);
      
      // Add outline for definition
      ctx.strokeStyle = heartDarkShade;
      ctx.lineWidth = Math.max(1, size/10);
      drawMetallicHeartStroke(ctx, x, y, halfSize);
      
      // Add highlight spot
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x - halfSize*0.3, y - halfSize*0.3, halfSize*0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.TRUFFLE:
      // Create metallic truffle with rich texture
      const truffleGrad = ctx.createRadialGradient(
        x, y, 0,
        x, y, halfSize
      );
      
      // Richer color gradient for truffle
      truffleGrad.addColorStop(0, lightColor);
      truffleGrad.addColorStop(0.5, midColor);
      truffleGrad.addColorStop(0.8, darkColor);
      truffleGrad.addColorStop(1, darkerColor);
      
      ctx.fillStyle = truffleGrad;
      ctx.beginPath();
      
      // Create irregular truffle shape
      const trufflePoints = 16;
      ctx.moveTo(
        x + Math.cos(0) * halfSize * (0.9 + Math.sin(0*5)*0.1),
        y + Math.sin(0) * halfSize * (0.9 + Math.sin(0*5)*0.1)
      );
      
      for (let i = 1; i <= trufflePoints; i++) {
        const angle = (i / trufflePoints) * Math.PI * 2;
        const radiusVar = 0.85 + Math.sin(i * 5) * 0.15;
        const pointX = x + Math.cos(angle) * halfSize * radiusVar;
        const pointY = y + Math.sin(angle) * halfSize * radiusVar;
        
        // Use quadratic curves for smoother shape
        const prevAngle = ((i-1) / trufflePoints) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const ctrlX = x + Math.cos(midAngle) * halfSize * 1.2;
        const ctrlY = y + Math.sin(midAngle) * halfSize * 1.2;
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, pointX, pointY);
      }
      
      ctx.closePath();
      ctx.fill();
      
      // Add cocoa powder dusting effect
      ctx.fillStyle = darkerColor;
      for (let i = 0; i < 25; i++) {
        const dustX = x + (Math.random() - 0.5) * size * 1.4;
        const dustY = y + (Math.random() - 0.5) * size * 1.4;
        const dustSize = size / 8 * Math.random();
        
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Add metallic shine spot similar to metallicss effect
      const truffleShineGrad = ctx.createRadialGradient(
        x - halfSize/3, y - halfSize/3, 0,
        x - halfSize/3, y - halfSize/3, halfSize/1.5
      );
      truffleShineGrad.addColorStop(0, "rgba(255,255,255,0.7)");
      truffleShineGrad.addColorStop(0.3, "rgba(255,255,255,0.3)");
      truffleShineGrad.addColorStop(0.7, "rgba(255,255,255,0.0)");
      
      ctx.fillStyle = truffleShineGrad;
      ctx.beginPath();
      ctx.arc(x - halfSize/3, y - halfSize/3, halfSize/3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.CHUNK:
      // Create rich chocolate chunk with metallic texture
      const chunkDarkColor = darkerColor;
      const chunkMidColor = darkColor;
      
      // Create irregular chocolate chunk shape
      ctx.beginPath();
      
      // Generate irregular polygon for chunk
      const chunkPoints = 7;
      const radiusVariations = [];
      for (let i = 0; i < chunkPoints; i++) {
        radiusVariations.push(0.7 + Math.random() * 0.6);
      }
      
      // Start point
      const startAngle = Math.random() * Math.PI * 2;
      ctx.moveTo(
        x + Math.cos(startAngle) * halfSize * radiusVariations[0],
        y + Math.sin(startAngle) * halfSize * radiusVariations[0]
      );
      
      // Draw irregular edges with curves
      for (let i = 1; i <= chunkPoints; i++) {
        const angle = startAngle + (i / chunkPoints) * Math.PI * 2;
        const nextRadius = radiusVariations[i % chunkPoints];
        const pointX = x + Math.cos(angle) * halfSize * nextRadius;
        const pointY = y + Math.sin(angle) * halfSize * nextRadius;
        
        // Add curve between points
        const prevAngle = startAngle + ((i-1) / chunkPoints) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const controlRadius = (radiusVariations[(i-1) % chunkPoints] + nextRadius) / 2 * 1.1;
        const ctrlX = x + Math.cos(midAngle) * halfSize * controlRadius;
        const ctrlY = y + Math.sin(midAngle) * halfSize * controlRadius;
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, pointX, pointY);
      }
      
      ctx.closePath();
      
      // Create 3D effect with metallic gradient - similar to metallicss
      const chunkGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      chunkGradient.addColorStop(0, lightColor);
      chunkGradient.addColorStop(0.4, midColor);
      chunkGradient.addColorStop(0.8, darkColor);
      chunkGradient.addColorStop(1, darkerColor);
      
      ctx.fillStyle = chunkGradient;
      ctx.fill();
      
      // Add break lines/cracks
      ctx.strokeStyle = chunkDarkColor;
      ctx.lineWidth = Math.max(1, size/25);
      
      // Add random cracks
      for (let i = 0; i < 4; i++) {
        const startX = x + (Math.random() - 0.5) * size * 0.6;
        const startY = y + (Math.random() - 0.5) * size * 0.6;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Create jagged crack with multiple segments
        let currentX = startX;
        let currentY = startY;
        const segments = 2 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < segments; j++) {
          const length = size * (0.1 + Math.random() * 0.2);
          const angle = Math.random() * Math.PI * 2;
          
          currentX += Math.cos(angle) * length;
          currentY += Math.sin(angle) * length;
          
          ctx.lineTo(currentX, currentY);
        }
        
        ctx.stroke();
      }
      
      // Add metallic highlight similar to metallicss
      const chunkShineGrad = ctx.createRadialGradient(
        x - halfSize/3, y - halfSize/3, 0,
        x - halfSize/3, y - halfSize/3, halfSize
      );
      chunkShineGrad.addColorStop(0, "rgba(255,255,255,0.7)");
      chunkShineGrad.addColorStop(0.3, "rgba(255,255,255,0.2)");
      chunkShineGrad.addColorStop(0.7, "rgba(255,255,255,0)");
      
      ctx.fillStyle = chunkShineGrad;
      ctx.beginPath();
      ctx.arc(x - halfSize/3, y - halfSize/3, halfSize/2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.SPLAT:
      // Create enhanced splat with metallic sheen
      const splatDarkColor = darkerColor;
      const splatLightColor = lightColor;
      
      // Create splat gradient with metallic quality
      const splatGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, halfSize
      );
      splatGradient.addColorStop(0, splatLightColor);
      splatGradient.addColorStop(0.6, midColor);
      splatGradient.addColorStop(1, splatDarkColor);
      
      ctx.fillStyle = splatGradient;
      drawMetallicChocolateSplat(ctx, x, y, size);
      
      // Add dynamic shine effect similar to metallicss
      const splatShineGrad = ctx.createRadialGradient(
        x - halfSize/4, y - halfSize/4, 0,
        x - halfSize/4, y - halfSize/4, halfSize/1.2
      );
      splatShineGrad.addColorStop(0, "rgba(255,255,255,0.7)");
      splatShineGrad.addColorStop(0.3, "rgba(255,255,255,0.3)");
      splatShineGrad.addColorStop(0.7, "rgba(255,255,255,0)");
      
      ctx.fillStyle = splatShineGrad;
      ctx.beginPath();
      ctx.arc(x - halfSize/4, y - halfSize/4, halfSize/2.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Add secondary smaller highlights
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = halfSize * (0.3 + Math.random() * 0.4);
        const hx = x + Math.cos(angle) * dist;
        const hy = y + Math.sin(angle) * dist;
        const bubbleSize = halfSize * (0.05 + Math.random() * 0.1);
        
        ctx.beginPath();
        ctx.arc(hx, hy, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    default:
      // Default to round shape
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
  }
  
  ctx.restore();
}

function drawMetallicHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic chocolate look
  // Left curve - add a slight bulge for more natural shape
  ctx.bezierCurveTo(
    cx - size * 0.9, cy - size * 0.8, 
    cx - size * 1.1, cy + size/3, 
    cx, cy + size * 0.9
  );
  
  // Right curve - mirror the left for symmetry
  ctx.bezierCurveTo(
    cx + size * 1.1, cy + size/3, 
    cx + size * 0.9, cy - size * 0.8, 
    cx, cy - size/5
  );
  
  ctx.closePath();
  ctx.fill();
}

function drawMetallicHeartStroke(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic chocolate look
  // Left curve - add a slight bulge for more natural shape
  ctx.bezierCurveTo(
    cx - size * 0.9, cy - size * 0.8, 
    cx - size * 1.1, cy + size/3, 
    cx, cy + size * 0.9
  );
  
  // Right curve - mirror the left for symmetry
  ctx.bezierCurveTo(
    cx + size * 1.1, cy + size/3, 
    cx + size * 0.9, cy - size * 0.8, 
    cx, cy - size/5
  );
  
  ctx.closePath();
  ctx.stroke();
}

function drawMetallicChocolateSplat(ctx, cx, cy, size) {
  // Enhanced splat with more organic, realistic appearance
  const numPoints = 14 + Math.floor(size / 2);
  const baseRadius = size * 0.75;
  
  ctx.beginPath();
  
  // Create more complex, irregular splat shape
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More varied radius for realistic splat
    const variations = 0.65 + Math.sin(i * 4) * 0.15 + Math.cos(i * 7) * 0.15 + Math.random() * 0.25;
    const radius = baseRadius * variations;
    
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Create more organic curves between points
      const cpRadius = baseRadius * (0.7 + Math.sin(i * 3) * 0.1 + Math.random() * 0.4);
      const cpAngle1 = angle - (1.2 / numPoints) * Math.PI;
      const cpAngle2 = angle - (0.5 / numPoints) * Math.PI;
      
      const cp1x = cx + Math.cos(cpAngle1) * cpRadius * 1.1;
      const cp1y = cy + Math.sin(cpAngle1) * cpRadius * 1.1;
      const cp2x = cx + Math.cos(cpAngle2) * cpRadius * 1.2;
      const cp2y = cy + Math.sin(cpAngle2) * cpRadius * 1.2;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Add drip details for wet, glossy look
  ctx.save();
  const drips = 4 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < drips; i++) {
    const drip_angle = Math.random() * Math.PI * 2;
    const drip_dist = baseRadius * (0.8 + Math.random() * 0.3);
    const drip_x = cx + Math.cos(drip_angle) * drip_dist;
    const drip_y = cy + Math.sin(drip_angle) * drip_dist;
    
    const drip_length = size * (0.15 + Math.random() * 0.2);
    const drip_width = size * (0.05 + Math.random() * 0.07);
    
    // Draw drip using bezier curve
    ctx.beginPath();
    ctx.moveTo(drip_x - drip_width/2, drip_y);
    
    // End point of drip
    const end_x = drip_x + Math.cos(drip_angle + Math.PI/2) * drip_length;
    const end_y = drip_y + Math.sin(drip_angle + Math.PI/2) * drip_length;
    
    // Control points for natural drip shape
    const ctrl1_x = drip_x - drip_width/2 + Math.cos(drip_angle + Math.PI/4) * drip_length * 0.4;
    const ctrl1_y = drip_y + Math.sin(drip_angle + Math.PI/4) * drip_length * 0.4;
    
    const ctrl2_x = end_x - Math.cos(drip_angle) * drip_width/2;
    const ctrl2_y = end_y - Math.sin(drip_angle) * drip_width/4;
    
    ctx.bezierCurveTo(ctrl1_x, ctrl1_y, ctrl2_x, ctrl2_y, end_x, end_y);
    
    // Complete the drip shape
    const ctrl3_x = end_x + Math.cos(drip_angle) * drip_width/2;
    const ctrl3_y = end_y + Math.sin(drip_angle) * drip_width/4;
    
    const ctrl4_x = drip_x + drip_width/2 + Math.cos(drip_angle - Math.PI/4) * drip_length * 0.4;
    const ctrl4_y = drip_y + Math.sin(drip_angle - Math.PI/4) * drip_length * 0.4;
    
    ctx.bezierCurveTo(ctrl3_x, ctrl3_y, ctrl4_x, ctrl4_y, drip_x + drip_width/2, drip_y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function createMetallicChocolates(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Create chocolate pieces with metallic finish
  for (let i = 0; i < chocolateCount; i++) {
    // Determine chocolate type
    let type, size, lifespan, shape;
    
    if (i < chocolateCount * 0.45) {
      // 45% dark chocolate
      type = CHOCOLATE_TYPES.DARK;
      size = 5 + Math.random() * 12;
      lifespan = 0.7 + Math.random() * 0.3;
      shape = Math.random() < 0.5 ? 
        CHOCOLATE_SHAPES.SQUARE : 
        (Math.random() < 0.5 ? CHOCOLATE_SHAPES.CHUNK : CHOCOLATE_SHAPES.RECTANGLE);
    } else if (i < chocolateCount * 0.85) {
      // 40% milk chocolate
      type = CHOCOLATE_TYPES.MILK;
      size = 4 + Math.random() * 10;
      lifespan = 0.65 + Math.random() * 0.35;
      shape = Math.random() < 0.4 ? 
        CHOCOLATE_SHAPES.ROUND : 
        (Math.random() < 0.5 ? CHOCOLATE_SHAPES.SQUARE : CHOCOLATE_SHAPES.HEART);
    } else {
      // 15% white or truffle
      type = Math.random() < 0.7 ? CHOCOLATE_TYPES.WHITE : CHOCOLATE_TYPES.TRUFFLE;
      size = 3 + Math.random() * 8;
      lifespan = 0.6 + Math.random() * 0.4;
      shape = Math.random() < 0.5 ? 
        CHOCOLATE_SHAPES.HEART : 
        (Math.random() < 0.5 ? CHOCOLATE_SHAPES.ROUND : CHOCOLATE_SHAPES.TRUFFLE);
    }
    
    // Select appropriate color based on type
    let colorIndex;
    if (type === CHOCOLATE_TYPES.DARK) {
      colorIndex = Math.floor(Math.random() * 3); // Dark colors
    } else if (type === CHOCOLATE_TYPES.MILK) {
      colorIndex = 3 + Math.floor(Math.random() * 4); // Middle colors
    } else if (type === CHOCOLATE_TYPES.WHITE) {
      colorIndex = 8 + Math.floor(Math.random()); // Light colors
    } else {
      colorIndex = 2 + Math.floor(Math.random() * 6); // Mixed colors for truffle
    }
    const color = CHOCOLATE_COLORS[colorIndex];
    
    // Random angle and speed
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 20;
    
    // Initial position (slightly randomized around center)
    const x = centerX + (Math.random() - 0.5) * 30;
    const y = centerY + (Math.random() - 0.5) * 30;
    
    // Physics variations
    const gravity = 0.15 + Math.random() * 0.15;
    const drag = 0.01 + Math.random() * 0.03;
    
    chocolates.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      type,
      shape,
      opacity: 1.0,
      lifespan,
      gravity,
      drag,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      meltFactor: Math.random() * 0.3,
      delay: Math.random() * 0.2,
      bounceCount: 0,
      maxBounces: Math.floor(Math.random() * 3),
      elasticity: 0.3 + Math.random() * 0.4,
      // Additional metallic properties
      convexity: 2 + Math.random() * 5,
      metallicIntensity: 0.5 + Math.random() * 0.5,
      reflectionAngle: Math.random() * Math.PI * 2
    });
  }
  
  // Create chocolate splats with metallic finish
  for (let i = 0; i < 10; i++) {
    addMetallicChocolateSplat(
      centerX + (Math.random() - 0.5) * width * 0.7,
      centerY + (Math.random() - 0.5) * height * 0.7,
      10 + Math.random() * 40,
      0.2 + Math.random() * 0.3
    );
  }
}

function addMetallicChocolateSplat(x, y, size, delay) {
  // Select color
  const colorIndex = Math.floor(Math.random() * 5) + 1; // Mostly milk chocolate colors
  const color = CHOCOLATE_COLORS[colorIndex];
  
  chocolateSplats.push({
    x,
    y,
    size,
    targetSize: size,
    currentSize: 0,
    color,
    opacity: 0,
    targetOpacity: 0.8 + Math.random() * 0.2,
    created: performance.now(),
    delay,
    growthRate: 0.15 + Math.random() * 0.1,
    // Additional metallic properties
    convexity: 1 + Math.random() * 3,
    metallicIntensity: 0.4 + Math.random() * 0.6,
    reflectionAngle: Math.random() * Math.PI * 2,
    reflectionOffset: Math.random() * 0.4
  });
}

function drawMetallicChocolateSplats(ctx, deltaTime) {
  for (let i = 0; i < chocolateSplats.length; i++) {
    const splat = chocolateSplats[i];
    const elapsed = (performance.now() - splat.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < splat.delay) continue;
    
    // Grow the splat
    splat.currentSize = Math.min(splat.targetSize, splat.currentSize + splat.growthRate * deltaTime * splat.targetSize);
    splat.opacity = Math.min(splat.targetOpacity, splat.opacity + 0.03 * deltaTime);
    
    // Draw metallic splat
    ctx.save();
    ctx.globalAlpha = splat.opacity;
    
    // Draw with enhanced metallic effect using derived colors
    const r = splat.color.r, g = splat.color.g, b = splat.color.b;
    const baseColor = `rgb(${r},${g},${b})`;
    const lightColor = `rgb(${Math.min(255, r+20)},${Math.min(255, g+15)},${Math.min(255, b+10)})`;
    const darkColor = `rgb(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)})`;
    const darkerColor = `rgb(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-50)})`;
    
    // Create rich gradient for the splat with metallic effect
    const splatGradient = ctx.createRadialGradient(
      splat.x, splat.y, 0,
      splat.x, splat.y, splat.currentSize
    );
    
    splatGradient.addColorStop(0, lightColor);
    splatGradient.addColorStop(0.4, baseColor);
    splatGradient.addColorStop(0.8, darkColor);
    splatGradient.addColorStop(1, darkerColor);
    
    ctx.fillStyle = splatGradient;
    
    // Draw chocolate splat
    drawMetallicChocolateSplat(ctx, splat.x, splat.y, splat.currentSize);
    
    // Add glossy highlights with metallic effect
    const shineGradient = ctx.createRadialGradient(
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      0,
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      splat.currentSize*0.6
    );
    shineGradient.addColorStop(0, "rgba(255,255,255,0.7)");
    shineGradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
    shineGradient.addColorStop(0.7, "rgba(255,255,255,0)");
    
    ctx.fillStyle = shineGradient;
    ctx.beginPath();
    ctx.ellipse(
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      splat.currentSize*0.3, 
      splat.currentSize*0.2, 
      splat.reflectionAngle, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add secondary highlights (bubbles) for metallic effect
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let j = 0; j < 3; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = splat.currentSize * (0.3 + Math.random() * 0.3);
      const x = splat.x + Math.cos(angle) * dist;
      const y = splat.y + Math.sin(angle) * dist;
      const bubbleSize = splat.currentSize * (0.05 + Math.random() * 0.08);
      
      ctx.beginPath();
      ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add texture details simulating metallic chocolate
    ctx.strokeStyle = darkerColor;
    ctx.lineWidth = Math.max(1, splat.currentSize * 0.02);
    ctx.globalAlpha = 0.2;
    
    for (let j = 0; j < 5; j++) {
      const angle = Math.random() * Math.PI * 2;
      const startDist = splat.currentSize * (0.3 + Math.random() * 0.4);
      const endDist = splat.currentSize * (0.6 + Math.random() * 0.3);
      
      const startX = splat.x + Math.cos(angle) * startDist;
      const startY = splat.y + Math.sin(angle) * startDist;
      const endX = splat.x + Math.cos(angle) * endDist;
      const endY = splat.y + Math.sin(angle) * endDist;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

function drawMetallicChocolateSplash(ctx, width, height, progress) {
  if (progress < 0.05) return;
  
  // Enhanced metallic splash parameters
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.3;
  
  // Calculate splash size based on progress with improved animation curve
  let splashProgress = Math.min(1, (progress - 0.05) * 3);
  // Use smoother animation curve with slight overshoot
  const animCurve = splashProgress < 0.7 ? 
    (1.2 * Math.sin(splashProgress * Math.PI * 0.75)) : 
    (1 - 0.3 * Math.pow(1 - splashProgress, 2));
  
  const currentRadius = maxRadius * Math.min(1, animCurve);
  
  if (currentRadius <= 0) return;
  
  // Draw splash with metallic effect
  ctx.save();
  
  // Create enhanced metallic splash gradient with richer colors
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, currentRadius
  );
  
  // Richer chocolate gradient with metallic effect
  gradient.addColorStop(0, 'rgba(150, 90, 45, 0.95)');
  gradient.addColorStop(0.3, 'rgba(120, 70, 35, 0.9)');
  gradient.addColorStop(0.6, 'rgba(100, 60, 30, 0.85)');
  gradient.addColorStop(0.8, 'rgba(80, 45, 25, 0.7)');
  gradient.addColorStop(1, 'rgba(65, 35, 20, 0)');
  
  ctx.fillStyle = gradient;
  
  // Draw enhanced splash shape with more detail
  const numPoints = 24; // More points for smoother edge
  const baseRadius = currentRadius;
  
  ctx.beginPath();
  
  // Create more detailed, organic splash shape
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // More complex wave pattern
    const wavePhase1 = progress * 12 + i;
    const wavePhase2 = progress * 18 + i * 1.5;
    // Use multiple sine waves for more organic shape
    const waveAmplitude1 = Math.min(0.25, progress * 0.5);
    const waveAmplitude2 = Math.min(0.15, progress * 0.3);
    const waveFactor = 1 + Math.sin(wavePhase1) * waveAmplitude1 + Math.sin(wavePhase2) * waveAmplitude2;
    
    const radius = baseRadius * waveFactor;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Create more organic curves between points - similar to metallicss
      const cpRadius1 = baseRadius * (waveFactor * 0.95);
      const cpAngle1 = angle - (0.5 / numPoints) * Math.PI * 2;
      const cp1x = centerX + Math.cos(cpAngle1) * cpRadius1;
      const cp1y = centerY + Math.sin(cpAngle1) * cpRadius1;
      
      const cpRadius2 = baseRadius * (waveFactor * 1.05);
      const cpAngle2 = angle - (0.2 / numPoints) * Math.PI * 2;
      const cp2x = centerX + Math.cos(cpAngle2) * cpRadius2;
      const cp2y = centerY + Math.sin(cpAngle2) * cpRadius2;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Draw enhanced splash highlights with metallic effect
  // Main highlight with gradient
  const shineGradient = ctx.createRadialGradient(
    centerX - currentRadius * 0.2, 
    centerY - currentRadius * 0.2, 
    0,
    centerX - currentRadius * 0.2, 
    centerY - currentRadius * 0.2, 
    currentRadius * 0.7
  );
  
  const highlightOpacity = 0.3 - progress * 0.1;
  shineGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity * 0.9})`);
  shineGradient.addColorStop(0.3, `rgba(255, 255, 255, ${highlightOpacity * 0.6})`);
  shineGradient.addColorStop(0.7, `rgba(255, 255, 255, ${highlightOpacity * 0.2})`);
  shineGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
  
  ctx.fillStyle = shineGradient;
  ctx.beginPath();
  ctx.ellipse(
    centerX - currentRadius * 0.2,
    centerY - currentRadius * 0.2,
    currentRadius * 0.4,
    currentRadius * 0.3,
    Math.PI/4, 0, Math.PI * 2
  );
  ctx.fill();
  
  // Add metallic sheen with dynamic movement
  const sheenAngle = progress * Math.PI * 2;
  const sheenX = centerX + Math.cos(sheenAngle) * currentRadius * 0.3;
  const sheenY = centerY + Math.sin(sheenAngle) * currentRadius * 0.3;
  
  const metallicGradient = ctx.createLinearGradient(
    sheenX - currentRadius * 0.5, sheenY - currentRadius * 0.5,
    sheenX + currentRadius * 0.5, sheenY + currentRadius * 0.5
  );
  
  metallicGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity * 0.8})`);
  metallicGradient.addColorStop(0.5, `rgba(255, 255, 255, 0)`);
  metallicGradient.addColorStop(1, `rgba(0, 0, 0, ${highlightOpacity * 0.3})`);
  
  ctx.fillStyle = metallicGradient;
  ctx.beginPath();
  ctx.ellipse(sheenX, sheenY, currentRadius * 0.6, currentRadius * 0.4, sheenAngle, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw multiple smaller highlights
  ctx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity * 0.8})`;
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5 + progress * 3;
    const distance = currentRadius * (0.4 + Math.random() * 0.3);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const size = currentRadius * (0.04 + Math.random() * 0.08);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add chocolate droplets/particles around splash with metallic finish
  if (progress > 0.2 && progress < 0.9) {
    const dropletCount = Math.floor(16 * splashProgress);
    const dropletOpacity = 0.95 - progress * 0.4;
    
    for (let i = 0; i < dropletCount; i++) {
      const angle = (i / dropletCount) * Math.PI * 2 + progress * 5;
      const distance = currentRadius * (1.1 + progress * 0.5 + Math.random() * 0.2);
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 3 + Math.random() * 10;
      
      // Create circular droplet with rich gradient and metallic effect
      const dropGradient = ctx.createRadialGradient(
        x - size * 0.2, y - size * 0.2, 0,
        x, y, size
      );
      
      dropGradient.addColorStop(0, `rgba(140, 80, 35, ${dropletOpacity})`);
      dropGradient.addColorStop(0.5, `rgba(120, 70, 30, ${dropletOpacity})`);
      dropGradient.addColorStop(0.8, `rgba(90, 50, 25, ${dropletOpacity})`);
      dropGradient.addColorStop(1, `rgba(65, 35, 15, ${dropletOpacity * 0.8})`);
      
      ctx.fillStyle = dropGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Droplet highlight - metallic effect
      const highlightGradient = ctx.createRadialGradient(
        x - size * 0.3, y - size * 0.3, 0,
        x - size * 0.3, y - size * 0.3, size
      );
      
      highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${highlightOpacity * 0.9})`);
      highlightGradient.addColorStop(0.3, `rgba(255, 255, 255, ${highlightOpacity * 0.5})`);
      highlightGradient.addColorStop(0.7, `rgba(255, 255, 255, 0)`);
      
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // Add small satellite splashes with metallic effect
      if (Math.random() < 0.3 && size > 6) {
        const splashCount = 2 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < splashCount; j++) {
          const splashAngle = Math.random() * Math.PI * 2;
          const splashDist = size * (1.2 + Math.random() * 0.8);
          const splashX = x + Math.cos(splashAngle) * splashDist;
          const splashY = y + Math.sin(splashAngle) * splashDist;
          const splashSize = size * (0.2 + Math.random() * 0.3);
          
          // Create metallic gradient for small splash
          const smallSplashGradient = ctx.createRadialGradient(
            splashX, splashY, 0,
            splashX, splashY, splashSize
          );
          
          smallSplashGradient.addColorStop(0, `rgba(120, 70, 35, ${dropletOpacity * 0.9})`);
          smallSplashGradient.addColorStop(0.7, `rgba(90, 50, 25, ${dropletOpacity * 0.7})`);
          smallSplashGradient.addColorStop(1, `rgba(65, 35, 15, ${dropletOpacity * 0.5})`);
          
          ctx.fillStyle = smallSplashGradient;
          ctx.beginPath();
          drawMetallicChocolateSplat(ctx, splashX, splashY, splashSize * 2);
        }
      }
    }
  }
  
  ctx.restore();
}

function drawMetallicChocolateDrips(ctx, width, height, progress) {
  // Enhanced drip parameters with metallic effect
  const dripCount = 8;
  const maxDripLength = height * 0.25;
  const baseDripWidth = 12;
  
  for (let i = 0; i < dripCount; i++) {
    const x = width * (0.15 + (i / (dripCount - 1)) * 0.7);
    
    // Stagger drip start times more naturally
    const dripStartDelay = i * 0.07 + Math.random() * 0.05;
    const dripProgress = Math.max(0, Math.min(1, (progress - 0.2 - dripStartDelay) * 2));
    if (dripProgress <= 0) continue;
    
    // Calculate drip length with slight randomness
    const length = dripProgress * maxDripLength * (0.7 + Math.random() * 0.6);
    
    // Draw drip with metallic effect
    ctx.save();
    
    // Create rich metallic gradient for drip
    const startY = height * (0.25 + Math.random() * 0.1);
    
    const dripGradient = ctx.createLinearGradient(
      x, startY,
      x, startY + length
    );
    
    // Use richer colors for metallic effect
    dripGradient.addColorStop(0, 'rgba(140, 80, 40, 0.95)');
    dripGradient.addColorStop(0.3, 'rgba(120, 70, 35, 0.9)');
    dripGradient.addColorStop(0.6, 'rgba(100, 60, 30, 0.85)');
    dripGradient.addColorStop(0.8, 'rgba(80, 45, 25, 0.8)');
    dripGradient.addColorStop(1, 'rgba(65, 35, 20, 0.7)');
    
    ctx.fillStyle = dripGradient;
    
    // Calculate drip width variation with wave animation
    const pulseEffect = Math.sin(progress * 12 + i * 2) * 0.2;
    const topWidth = baseDripWidth * (1 + pulseEffect + Math.random() * 0.3);
    // Bottom width gets thinner as drip lengthens
    const bottomWidth = Math.max(1, baseDripWidth * 0.7 - dripProgress * baseDripWidth * 0.6);
    
    // Draw drip shape
    ctx.beginPath();
    ctx.moveTo(x - topWidth/2, startY);
    ctx.lineTo(x + topWidth/2, startY);
    
    // Curve down to make it look like it's dripping with more natural shape
    const ctrlPointY1 = startY + length * 0.3;
    const ctrlPointY2 = startY + length * 0.7;
    
    // Add slight sideways movement to drip
    const sideOffset = Math.sin(progress * 6 + i * 3) * (topWidth * 0.3);
    
    ctx.bezierCurveTo(
      x + topWidth/2 + sideOffset, ctrlPointY1,
      x + bottomWidth + sideOffset, ctrlPointY2,
      x, startY + length
    );
    
    // Curve back up on the other side
    ctx.bezierCurveTo(
      x - bottomWidth - sideOffset, ctrlPointY2,
      x - topWidth/2 - sideOffset, ctrlPointY1,
      x - topWidth/2, startY
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Add metallic highlight - similar to metallicss effect
    const shineGradient = ctx.createLinearGradient(
      x - topWidth/2, startY,
      x + topWidth/2, startY + length/3
    );
    shineGradient.addColorStop(0, 'rgba(255,255,255,0.5)');
    shineGradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
    shineGradient.addColorStop(0.6, 'rgba(255,255,255,0.05)');
    shineGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = shineGradient;
    
    // Draw highlight shape
    ctx.beginPath();
    ctx.ellipse(
      x - topWidth * 0.1,
      startY + topWidth * 0.3,
      topWidth * 0.35,
      topWidth * 0.25,
      Math.PI/6, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add reflection line for metallic effect
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - topWidth * 0.3, startY + topWidth * 0.1);
    ctx.lineTo(x + topWidth * 0.1, startY + length * 0.5);
    ctx.stroke();
    
    // Add small chocolate bulge at top of drip with metallic finish
    const bulgeGradient = ctx.createRadialGradient(
      x, startY - 2, 0,
      x, startY - 2, topWidth * 0.8
    );
    bulgeGradient.addColorStop(0, 'rgba(140, 85, 45, 0.95)');
    bulgeGradient.addColorStop(0.5, 'rgba(120, 70, 40, 0.9)');
    bulgeGradient.addColorStop(0.8, 'rgba(100, 60, 35, 0.85)');
    bulgeGradient.addColorStop(1, 'rgba(80, 45, 30, 0)');
    
    ctx.fillStyle = bulgeGradient;
    ctx.beginPath();
    ctx.arc(x, startY - 2, topWidth * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Add metallic sheen to bulge
    const bulgeShineGradient = ctx.createRadialGradient(
      x - topWidth * 0.2, startY - topWidth * 0.2, 0,
      x - topWidth * 0.2, startY - topWidth * 0.2, topWidth
    );
    bulgeShineGradient.addColorStop(0, 'rgba(255,255,255,0.6)');
    bulgeShineGradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
    bulgeShineGradient.addColorStop(0.7, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = bulgeShineGradient;
    ctx.beginPath();
    ctx.arc(x - topWidth * 0.2, startY - topWidth * 0.2, topWidth * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Add small droplets along the drip for more realism with metallic finish
    if (dripProgress > 0.3 && length > 30) {
      const dropletCount = 1 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < dropletCount; j++) {
        const dropY = startY + length * (0.5 + Math.random() * 0.5);
        const dropX = x + (Math.random() - 0.5) * topWidth * 1.5;
        const dropSize = 2 + Math.random() * 4;
        
        // Create metallic droplet gradient
        const dropGradient = ctx.createRadialGradient(
          dropX - dropSize * 0.2, dropY - dropSize * 0.2, 0,
          dropX, dropY, dropSize
        );
        
        dropGradient.addColorStop(0, 'rgba(120, 70, 40, 0.9)');
        dropGradient.addColorStop(0.6, 'rgba(100, 60, 35, 0.85)');
        dropGradient.addColorStop(1, 'rgba(80, 45, 30, 0.8)');
        
        ctx.fillStyle = dropGradient;
        ctx.beginPath();
        ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add drop highlight for metallic effect
        const dropShineGradient = ctx.createRadialGradient(
          dropX - dropSize * 0.3, dropY - dropSize * 0.3, 0,
          dropX - dropSize * 0.3, dropY - dropSize * 0.3, dropSize
        );
        
        dropShineGradient.addColorStop(0, 'rgba(255,255,255,0.6)');
        dropShineGradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        dropShineGradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = dropShineGradient;
        ctx.beginPath();
        ctx.arc(dropX - dropSize*0.3, dropY - dropSize*0.3, dropSize*0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}

function updateAndDrawMetallicChocolates(ctx, deltaTime, progress) {
  // Sort chocolates by size for better visual layering
  chocolates.sort((a, b) => a.size - b.size);
  
  const deadChocolates = [];
  
  for (let i = 0; i < chocolates.length; i++) {
    const choc = chocolates[i];
    
    // Skip chocolates with delay not yet reached
    if (progress < choc.delay) continue;
    
    // Adjust progress for delayed chocolates
    const adjustedProgress = (progress - choc.delay) / (1.0 - choc.delay);
    
    // Skip completely faded chocolates
    if (choc.opacity <= 0.01) {
      deadChocolates.push(i);
      continue;
    }
    
    // Apply physics
    choc.vy += choc.gravity * deltaTime;
    
    // Apply drag
    choc.vx *= (1 - choc.drag * deltaTime);
    choc.vy *= (1 - choc.drag * deltaTime);
    
    // Simulate melting effect
    if (adjustedProgress > 0.6) {
      choc.size -= choc.meltFactor * deltaTime;
      if (choc.size < 1) {
        choc.opacity = 0;
        deadChocolates.push(i);
        continue;
      }
    }
    
    // Update position
    choc.x += choc.vx * deltaTime;
    choc.y += choc.vy * deltaTime;
    
    // Simple screen boundary check with bounce
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const radius = choc.size / 2;
    
    // Bounce off edges if not too many bounces yet
    if (choc.bounceCount < choc.maxBounces) {
      if (choc.x - radius < 0) {
        choc.x = radius;
        choc.vx = Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.5) {
          addMetallicChocolateSplat(
            5 + Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      } else if (choc.x + radius > canvasWidth) {
        choc.x = canvasWidth - radius;
        choc.vx = -Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.5) {
          addMetallicChocolateSplat(
            canvasWidth - 5 - Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      }
      
      if (choc.y - radius < 0) {
        choc.y = radius;
        choc.vy = Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
      } else if (choc.y + radius > canvasHeight) {
        choc.y = canvasHeight - radius;
        choc.vy = -Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a chocolate splat on bounce with floor
        if (Math.random() < 0.7) {
          addMetallicChocolateSplat(
            choc.x,
            canvasHeight - 2,
            choc.size * (0.8 + Math.random() * 0.7),
            0
          );
        }
      }
    }
    
    // Update rotation
    choc.rotation += choc.rotationSpeed * deltaTime;
    
    // Fade out based on lifespan
    if (adjustedProgress > 0.7) {
      const fadeRate = 1 / (choc.lifespan * 60);
      choc.opacity = Math.max(0, choc.opacity - fadeRate * deltaTime);
    }
    
    // Update reflection angle for metallic effect
    choc.reflectionAngle = (choc.reflectionAngle + deltaTime * 0.05) % (Math.PI * 2);
    
    // Get color key
    const colorKey = `rgb(${choc.color.r},${choc.color.g},${choc.color.b})`;
    
    // Find closest size
    let sizeKey = '1';
    if (choc.size > 2) sizeKey = '2';
    if (choc.size > 4) sizeKey = '4';
    if (choc.size > 8) sizeKey = '8';
    if (choc.size > 16) sizeKey = '16';
    if (choc.size > 32) sizeKey = '32';
    
    // Draw chocolate
    ctx.save();
    ctx.globalAlpha = choc.opacity;
    
    // Get chocolate prototype
    const prototype = chocolatePrototypes[choc.type][choc.shape][colorKey]?.[sizeKey];
    
    if (prototype) {
      // Draw using pre-rendered prototype
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      
      const scale = choc.size / parseInt(sizeKey);
      ctx.scale(scale, scale);
      
      ctx.drawImage(
        prototype, 
        -32, 
        -32, 
        64, 
        64
      );
      
      // Add extra metallic highlights
      if (renderQuality === 'high') {
        // Reset transform to add dynamic highlights
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Dynamic highlight based on animation
        const highlightX = choc.x + Math.cos(choc.reflectionAngle) * choc.size * 0.3;
        const highlightY = choc.y + Math.sin(choc.reflectionAngle) * choc.size * 0.3;
        
        const shineTilt = choc.reflectionAngle + Math.PI/4;
        const metallicGradient = ctx.createLinearGradient(
          highlightX - Math.cos(shineTilt) * choc.size * 0.5,
          highlightY - Math.sin(shineTilt) * choc.size * 0.5,
          highlightX + Math.cos(shineTilt) * choc.size * 0.5,
          highlightY + Math.sin(shineTilt) * choc.size * 0.5
        );
        
        metallicGradient.addColorStop(0, `rgba(255,255,255,${0.1 + choc.metallicIntensity * 0.4})`);
        metallicGradient.addColorStop(0.5, `rgba(255,255,255,0)`);
        metallicGradient.addColorStop(1, `rgba(0,0,0,${0.05 + choc.metallicIntensity * 0.1})`);
        
        ctx.fillStyle = metallicGradient;
        ctx.beginPath();
        ctx.ellipse(
          highlightX, highlightY, 
          choc.size * 0.4, choc.size * 0.2, 
          shineTilt, 0, Math.PI * 2
        );
        ctx.fill();
      }
    } else {
      // Fallback drawing method with metallic effects
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      
      // Create metallic colors
      const r = choc.color.r, g = choc.color.g, b = choc.color.b;
      const baseColor = `rgb(${r},${g},${b})`;
      const lightColor = `rgb(${Math.min(255, r+40)},${Math.min(255, g+30)},${Math.min(255, b+20)})`;
      const darkColor = `rgb(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-50)})`;
      
      // Create metallic gradient
      const gradient = ctx.createLinearGradient(
        -choc.size/2, -choc.size/2,
        choc.size/2, choc.size/2
      );
      
      gradient.addColorStop(0, lightColor);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, darkColor);
      
      ctx.fillStyle = gradient;
      
      if (choc.shape === CHOCOLATE_SHAPES.SQUARE) {
        // Draw metallic square
        ctx.beginPath();
        ctx.roundRect(-choc.size/2, -choc.size/2, choc.size, choc.size, choc.size/8);
        ctx.fill();
        
        // Add highlight
        const highlightGradient = ctx.createLinearGradient(
          -choc.size/2, -choc.size/2,
          choc.size/2, choc.size/2
        );
        
        highlightGradient.addColorStop(0, "rgba(255,255,255,0.4)");
        highlightGradient.addColorStop(0.3, "rgba(255,255,255,0.1)");
        highlightGradient.addColorStop(0.5, "rgba(255,255,255,0)");
        highlightGradient.addColorStop(0.7, "rgba(0,0,0,0.05)");
        highlightGradient.addColorStop(1, "rgba(0,0,0,0.1)");
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.roundRect(-choc.size/2, -choc.size/2, choc.size, choc.size, choc.size/8);
        ctx.fill();
        
        // Add segment lines
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = Math.max(1, choc.size/10);
        
        ctx.beginPath();
        ctx.moveTo(-choc.size/2 + choc.size/8, 0);
        ctx.lineTo(choc.size/2 - choc.size/8, 0);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -choc.size/2 + choc.size/8);
        ctx.lineTo(0, choc.size/2 - choc.size/8);
        ctx.stroke();
      } else {
        // Draw metallic round chocolate
        ctx.beginPath();
        ctx.arc(0, 0, choc.size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        const highlightGradient = ctx.createRadialGradient(
          -choc.size/4, -choc.size/4, 0,
          0, 0, choc.size/2
        );
        
        highlightGradient.addColorStop(0, "rgba(255,255,255,0.6)");
        highlightGradient.addColorStop(0.3, "rgba(255,255,255,0.2)");
        highlightGradient.addColorStop(0.7, "rgba(255,255,255,0)");
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(0, 0, choc.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  
  // Remove dead chocolates in reverse order to avoid index issues
  for (let i = deadChocolates.length - 1; i >= 0; i--) {
    chocolates.splice(deadChocolates[i], 1);
  }
}