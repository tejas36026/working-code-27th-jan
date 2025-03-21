// Global constants
const CHOCOLATE_COUNT_MAX = 800;
const ANIMATION_DURATION = 4000; // ms
const SPRING_FACTOR = 0.1;
const GRAVITY_FACTOR = 0.98;
const AIR_RESISTANCE = 0.97;

// Chocolate types and shapes
const CHOCOLATE_TYPES = {
  DARK: 'dark',
  MILK: 'milk',
  WHITE: 'white'
};

const CHOCOLATE_SHAPES = {
  SQUARE: 'square',
  ROUND: 'round',
  HEART: 'heart',
  TRUFFLE: 'truffle'
};

// Chocolate colors
const CHOCOLATE_COLORS = [
  { r: 77, g: 46, b: 24, a: 1 },      // Dark chocolate
  { r: 131, g: 78, b: 39, a: 1 },     // Milk chocolate
  { r: 203, g: 179, b: 148, a: 1 },   // White chocolate
  { r: 165, g: 113, b: 78, a: 1 },    // Caramel
  { r: 159, g: 129, b: 112, a: 1 },   // Mocha
  { r: 110, g: 68, b: 39, a: 1 },     // Hazelnut
  { r: 58, g: 31, b: 24, a: 1 },      // Extra dark
  { r: 187, g: 161, b: 141, a: 1 }    // Creamy
];

// Animation state
let canvas = null;
let ctx = null;
let chocolates = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let chocolateCount = 0;
let performanceLevel = 1.0; // Scale from 0.4 (low) to 1.2 (high)

// Chocolate prototype images (for optimization)
let chocolatePrototypes = {};

self.onmessage = function(e) {
  const { 
    imageData, 
    selectedRegions, 
    value,
    reset,
    deviceInfo 
  } = e.data;
  
  try {
    const currentTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    
    // Initialize canvas if not already done
    if (!canvas) {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', { alpha: true });
      
      // Set dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Initialize performance level based on device info
      if (deviceInfo) {
        if (deviceInfo.isLowPower) {
          performanceLevel = 0.5;
        } else if (deviceInfo.isHighPerformance) {
          performanceLevel = 1.2;
        }
      }
      
      // Create chocolate prototypes
      createChocolatePrototypes();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      chocolates = [];
      
      // Determine chocolate count based on performance level
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel);
      
      // Create chocolates
      createChocolates(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine chocolate count based on performance level
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel);
      
      // Create chocolates
      createChocolates(width, height);
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
    
    // Update and draw chocolates
    updateAndDrawChocolates(ctx, deltaTime, progress);
    
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

function createChocolatePrototypes() {
  const prototypeCanvas = new OffscreenCanvas(32, 32);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  // Create different chocolate shapes and cache them
  for (const type of Object.values(CHOCOLATE_TYPES)) {
    chocolatePrototypes[type] = {};
    
    for (const shape of Object.values(CHOCOLATE_SHAPES)) {
      chocolatePrototypes[type][shape] = {};
      
      for (const color of CHOCOLATE_COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes
        for (let size = 1; size <= 16; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 32, 32);
          prototypeCtx.fillStyle = colorKey;
          prototypeCtx.globalAlpha = 1;
          
          const halfSize = size / 2;
          
          switch (shape) {
            case CHOCOLATE_SHAPES.ROUND:
              prototypeCtx.beginPath();
              prototypeCtx.arc(16, 16, halfSize, 0, Math.PI * 2);
              prototypeCtx.fill();
              // Add shine effect
              prototypeCtx.fillStyle = "rgba(255,255,255,0.3)";
              prototypeCtx.beginPath();
              prototypeCtx.arc(14, 14, halfSize/3, 0, Math.PI * 2);
              prototypeCtx.fill();
              break;
              
            case CHOCOLATE_SHAPES.SQUARE:
              // Draw square with rounded corners
              prototypeCtx.beginPath();
              prototypeCtx.roundRect(16 - halfSize, 16 - halfSize, size, size, size/5);
              prototypeCtx.fill();
              
              // Add indentation pattern for chocolate
              prototypeCtx.strokeStyle = `rgba(${color.r-20},${color.g-20},${color.b-20},0.5)`;
              prototypeCtx.lineWidth = 1;
              prototypeCtx.beginPath();
              prototypeCtx.moveTo(16 - halfSize/2, 16 - halfSize);
              prototypeCtx.lineTo(16 - halfSize/2, 16 + halfSize);
              prototypeCtx.stroke();
              prototypeCtx.beginPath();
              prototypeCtx.moveTo(16 - halfSize, 16 - halfSize/2);
              prototypeCtx.lineTo(16 + halfSize, 16 - halfSize/2);
              prototypeCtx.stroke();
              break;
              
            case CHOCOLATE_SHAPES.HEART:
              drawHeart(prototypeCtx, 16, 16, halfSize);
              // Add shine
              prototypeCtx.fillStyle = "rgba(255,255,255,0.2)";
              prototypeCtx.beginPath();
              prototypeCtx.arc(14, 14, halfSize/4, 0, Math.PI * 2);
              prototypeCtx.fill();
              break;
              
            case CHOCOLATE_SHAPES.TRUFFLE:
              // Draw truffle (irregular round shape)
              prototypeCtx.beginPath();
              prototypeCtx.ellipse(16, 16, halfSize, halfSize * 0.9, Math.PI/6, 0, Math.PI * 2);
              prototypeCtx.fill();
              
              // Add dusting effect
              prototypeCtx.fillStyle = "rgba(139,69,19,0.3)";
              for (let i = 0; i < 8; i++) {
                const dustX = 16 + (Math.random() - 0.5) * size;
                const dustY = 16 + (Math.random() - 0.5) * size;
                const dustSize = size / 10 * Math.random();
                prototypeCtx.beginPath();
                prototypeCtx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
                prototypeCtx.fill();
              }
              break;
          }
          
          // Store the prototype
          chocolatePrototypes[type][shape][colorKey] = {
            [key]: prototypeCanvas.transferToImageBitmap()
          };
        }
      }
    }
  }
}

function drawHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/3);
  
  // Left curve
  ctx.bezierCurveTo(
    cx - size, cy - size, 
    cx - size, cy + size/3, 
    cx, cy + size
  );
  
  // Right curve
  ctx.bezierCurveTo(
    cx + size, cy + size/3, 
    cx + size, cy - size, 
    cx, cy - size/3
  );
  
  ctx.closePath();
  ctx.fill();
}

function createChocolates(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < chocolateCount; i++) {
    // Determine chocolate type
    let type, size, lifespan, shape;
    
    if (i < chocolateCount * 0.4) {
      // 40% dark chocolate
      type = CHOCOLATE_TYPES.DARK;
      size = 5 + Math.random() * 10;
      lifespan = 0.7 + Math.random() * 0.3;
      shape = Math.random() < 0.6 ? 
        CHOCOLATE_SHAPES.SQUARE : CHOCOLATE_SHAPES.TRUFFLE;
    } else if (i < chocolateCount * 0.8) {
      // 40% milk chocolate
      type = CHOCOLATE_TYPES.MILK;
      size = 4 + Math.random() * 8;
      lifespan = 0.6 + Math.random() * 0.4;
      shape = Math.random() < 0.4 ? 
        CHOCOLATE_SHAPES.ROUND : 
        (Math.random() < 0.5 ? CHOCOLATE_SHAPES.SQUARE : CHOCOLATE_SHAPES.HEART);
    } else {
      // 20% white chocolate
      type = CHOCOLATE_TYPES.WHITE;
      size = 3 + Math.random() * 7;
      lifespan = 0.5 + Math.random() * 0.5;
      shape = Math.random() < 0.5 ? 
        CHOCOLATE_SHAPES.HEART : CHOCOLATE_SHAPES.ROUND;
    }
    
    // Select appropriate color based on type
    let colorIndex;
    if (type === CHOCOLATE_TYPES.DARK) {
      colorIndex = Math.floor(Math.random() * 2); // Dark colors
    } else if (type === CHOCOLATE_TYPES.MILK) {
      colorIndex = 1 + Math.floor(Math.random() * 5); // Middle colors
    } else {
      colorIndex = 6 + Math.floor(Math.random() * 2); // Light colors
    }
    const color = CHOCOLATE_COLORS[colorIndex];
    
    // Random angle and speed
    const angle = Math.random() * Math.PI * 2;
    const speed = 5 + Math.random() * 15;
    
    // Initial position (slightly randomized around center)
    const x = centerX + (Math.random() - 0.5) * 20;
    const y = centerY + (Math.random() - 0.5) * 20;
    
    // Physics variations
    const gravity = 0.2 + Math.random() * 0.1;
    const drag = 0.01 + Math.random() * 0.02;
    
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
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      // Add melt property for chocolates
      meltFactor: Math.random() * 0.2,
      // Time offset for staggered animation
      delay: Math.random() * 0.2
    });
  }
}

function updateAndDrawChocolates(ctx, deltaTime, progress) {
  // Sort chocolates by size for better visual layering
  chocolates.sort((a, b) => a.size - b.size);
  
  for (let i = 0; i < chocolates.length; i++) {
    const choc = chocolates[i];
    
    // Skip chocolates with delay not yet reached
    if (progress < choc.delay) continue;
    
    // Adjust progress for delayed chocolates
    const adjustedProgress = (progress - choc.delay) / (1.0 - choc.delay);
    
    // Skip completely faded chocolates
    if (choc.opacity <= 0.01) continue;
    
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
        continue;
      }
    }
    
    // Update position
    choc.x += choc.vx * deltaTime;
    choc.y += choc.vy * deltaTime;
    
    // Update rotation
    choc.rotation += choc.rotationSpeed * deltaTime;
    
    // Fade out based on lifespan
    choc.opacity = Math.max(0, choc.opacity - (1 / (choc.lifespan * 60)) * deltaTime);
    
    // Draw chocolate
    ctx.save();
    ctx.globalAlpha = choc.opacity;
    
    // Get color key
    const colorKey = `rgb(${choc.color.r},${choc.color.g},${choc.color.b})`;
    
    // Find closest size
    let sizeKey = '1';
    if (choc.size > 2) sizeKey = '2';
    if (choc.size > 4) sizeKey = '4';
    if (choc.size > 8) sizeKey = '8';
    if (choc.size > 16) sizeKey = '16';
    
    // Get chocolate prototype
    const prototype = chocolatePrototypes[choc.type][choc.shape][colorKey][sizeKey];
    
    if (prototype) {
      // Draw using pre-rendered prototype
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      
      const scale = choc.size / parseInt(sizeKey);
      ctx.scale(scale, scale);
      
      ctx.drawImage(
        prototype, 
        -16, 
        -16, 
        32, 
        32
      );
    } else {
      // Fallback drawing method
      ctx.fillStyle = colorKey;
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      ctx.fillRect(-choc.size/2, -choc.size/2, choc.size, choc.size);
    }
    
    ctx.restore();
  }
  
  // Remove completely melted or invisible chocolates
  chocolates = chocolates.filter(c => c.opacity > 0.01 && c.size > 1);
}