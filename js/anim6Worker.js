// Global constants
const PARTICLE_COUNT_MAX = 800;
const ANIMATION_DURATION = 4000; // ms
const SPRING_FACTOR = 0.1;
const GRAVITY_FACTOR = 0.98;
const AIR_RESISTANCE = 0.97;

// Color palette - vibrant Holi festival colors
const COLORS = [
  { r: 255, g: 23, b: 68, a: 1 },     // Red
  { r: 255, g: 234, b: 0, a: 1 },     // Yellow
  { r: 0, g: 230, b: 118, a: 1 },     // Green
  { r: 41, g: 121, b: 255, a: 1 },    // Blue
  { r: 213, g: 0, b: 249, a: 1 },     // Purple
  { r: 255, g: 145, b: 0, a: 1 },     // Orange
  { r: 240, g: 98, b: 146, a: 1 },    // Pink
  { r: 24, g: 255, b: 255, a: 1 }     // Cyan
];

// Animation state
let canvas = null;
let ctx = null;
let particles = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let particleCount = 0;
let performanceLevel = 1.0; // Scale from 0.4 (low) to 1.2 (high)
let selectedRegionData = null;

// Particle types
const PARTICLE_TYPES = {
  CONFETTI: 'confetti',
  DUST: 'dust',
  SPARKLE: 'sparkle'
};

// Particle shapes
const PARTICLE_SHAPES = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  TRIANGLE: 'triangle',
  STAR: 'star'
};

// Particle prototype images (for optimization)
let particlePrototypes = {};

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
      
      // Create particle prototypes
      createParticlePrototypes();
      
      // Store the selected region data
      if (selectedRegions && selectedRegions.length > 0) {
        selectedRegionData = {
          data: new ImageData(
            new Uint8ClampedArray(selectedRegions[0].data),
            selectedRegions[0].width,
            selectedRegions[0].height
          ),
          x: selectedRegions[0].x,
          y: selectedRegions[0].y,
          width: selectedRegions[0].width,
          height: selectedRegions[0].height
        };
      }
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      particles = [];
      
      // Determine particle count based on performance level
      particleCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel);
      
      // Create particles for entire image except selected region
      createParticlesExcludingSelectedRegion(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine particle count based on performance level
      particleCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel);
      
      // Create particles for entire image except selected region
      createParticlesExcludingSelectedRegion(width, height);
    }
    
    // Calculate time delta for physics (clamped for stability)
    const deltaTime = Math.min(33, currentTime - previousTime) / 16.67;
    previousTime = currentTime;
    
    // Calculate animation progress
    const elapsed = currentTime - startTime;
    const progress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update and draw particles (this will be the background)
    updateAndDrawParticles(ctx, deltaTime, progress);
    
    // Draw selected region on top (unmoved)
    if (selectedRegionData) {
      ctx.putImageData(
        selectedRegionData.data,
        selectedRegionData.x,
        selectedRegionData.y
      );
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
        particleCount: particles.length,
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

function createParticlePrototypes() {
  const prototypeCanvas = new OffscreenCanvas(32, 32);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  // Create different particle shapes and cache them
  for (const type of Object.values(PARTICLE_TYPES)) {
    particlePrototypes[type] = {};
    
    for (const shape of Object.values(PARTICLE_SHAPES)) {
      particlePrototypes[type][shape] = {};
      
      for (const color of COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes
        for (let size = 1; size <= 16; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 32, 32);
          prototypeCtx.fillStyle = colorKey;
          prototypeCtx.globalAlpha = 1;
          
          const halfSize = size / 2;
          
          switch (shape) {
            case PARTICLE_SHAPES.CIRCLE:
              prototypeCtx.beginPath();
              prototypeCtx.arc(16, 16, halfSize, 0, Math.PI * 2);
              prototypeCtx.fill();
              break;
              
            case PARTICLE_SHAPES.SQUARE:
              prototypeCtx.fillRect(16 - halfSize, 16 - halfSize, size, size);
              break;
              
            case PARTICLE_SHAPES.TRIANGLE:
              prototypeCtx.beginPath();
              prototypeCtx.moveTo(16, 16 - halfSize);
              prototypeCtx.lineTo(16 + halfSize, 16 + halfSize);
              prototypeCtx.lineTo(16 - halfSize, 16 + halfSize);
              prototypeCtx.closePath();
              prototypeCtx.fill();
              break;
              
            case PARTICLE_SHAPES.STAR:
              drawStar(prototypeCtx, 16, 16, halfSize, 5);
              break;
          }
          
          // Store the prototype
          particlePrototypes[type][shape][colorKey] = {
            [key]: prototypeCanvas.transferToImageBitmap()
          };
        }
      }
    }
  }
}

function drawStar(ctx, cx, cy, radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? radius : radius / 2;
    const angle = (i * Math.PI) / points;
    const x = cx + r * Math.sin(angle);
    const y = cy + r * Math.cos(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function isPointInSelectedRegion(x, y) {
  if (!selectedRegionData) return false;
  
  return (
    x >= selectedRegionData.x && 
    x < selectedRegionData.x + selectedRegionData.width &&
    y >= selectedRegionData.y && 
    y < selectedRegionData.y + selectedRegionData.height
  );
}

function createParticlesExcludingSelectedRegion(width, height) {
  for (let i = 0; i < particleCount; i++) {
    // Generate random position
    const x = Math.random() * width;
    const y = Math.random() * height;
    
    // Skip if position is within selected region
    if (isPointInSelectedRegion(x, y)) {
      continue;
    }
    
    // Determine particle type
    let type, size, lifespan, shape;
    
    if (i < particleCount * 0.6) {
      // 60% confetti
      type = PARTICLE_TYPES.CONFETTI;
      size = 4 + Math.random() * 8;
      lifespan = 0.7 + Math.random() * 0.3;
      shape = Math.random() < 0.5 ? 
        PARTICLE_SHAPES.SQUARE : 
        (Math.random() < 0.5 ? PARTICLE_SHAPES.TRIANGLE : PARTICLE_SHAPES.STAR);
    } else if (i < particleCount * 0.9) {
      // 30% dust
      type = PARTICLE_TYPES.DUST;
      size = 1 + Math.random() * 3;
      lifespan = 0.5 + Math.random() * 0.4;
      shape = PARTICLE_SHAPES.CIRCLE;
    } else {
      // 10% sparkle
      type = PARTICLE_TYPES.SPARKLE;
      size = 2 + Math.random() * 4;
      lifespan = 0.3 + Math.random() * 0.3;
      shape = PARTICLE_SHAPES.STAR;
    }
    
    // Random color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Random velocity
    const speed = 1 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Physics variations
    const gravity = type === PARTICLE_TYPES.CONFETTI ? 
      0.2 + Math.random() * 0.1 : 
      0.1 + Math.random() * 0.1;
      
    const drag = type === PARTICLE_TYPES.DUST ? 
      0.02 + Math.random() * 0.02 : 
      0.01 + Math.random() * 0.01;
    
    particles.push({
      x,
      y,
      vx,
      vy,
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
      delay: Math.random() * 0.2
    });
  }
}

function updateAndDrawParticles(ctx, deltaTime, progress) {
  // Sort particles by size for better visual layering
  particles.sort((a, b) => a.size - b.size);
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    
    // Skip particles with delay not yet reached
    if (progress < p.delay) continue;
    
    // Adjust progress for delayed particles
    const adjustedProgress = (progress - p.delay) / (1.0 - p.delay);
    
    // Skip completely faded particles
    if (p.opacity <= 0.01) continue;
    
    // Apply physics
    p.vy += p.gravity * deltaTime;
    
    // Apply drag
    p.vx *= (1 - p.drag * deltaTime);
    p.vy *= (1 - p.drag * deltaTime);
    
    // Add random movement
    p.vx += (Math.random() - 0.5) * 0.5;
    p.vy += (Math.random() - 0.5) * 0.5;
    
    // Update position
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Boundary checks with wrapping
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
    
    // Check if new position is inside selected region, if so, bounce off
    if (isPointInSelectedRegion(p.x, p.y)) {
      // Find nearest edge and bounce
      const left = Math.abs(p.x - selectedRegionData.x);
      const right = Math.abs(p.x - (selectedRegionData.x + selectedRegionData.width));
      const top = Math.abs(p.y - selectedRegionData.y);
      const bottom = Math.abs(p.y - (selectedRegionData.y + selectedRegionData.height));
      
      const min = Math.min(left, right, top, bottom);
      
      if (min === left) {
        p.x = selectedRegionData.x - p.size;
        p.vx = -Math.abs(p.vx);
      } else if (min === right) {
        p.x = selectedRegionData.x + selectedRegionData.width + p.size;
        p.vx = Math.abs(p.vx);
      } else if (min === top) {
        p.y = selectedRegionData.y - p.size;
        p.vy = -Math.abs(p.vy);
      } else {
        p.y = selectedRegionData.y + selectedRegionData.height + p.size;
        p.vy = Math.abs(p.vy);
      }
    }
    
    // Update rotation for confetti
    p.rotation += p.rotationSpeed * deltaTime;
    
    // Draw particle
    ctx.save();
    ctx.globalAlpha = p.opacity;
    
    // Get color key
    const colorKey = `rgb(${p.color.r},${p.color.g},${p.color.b})`;
    
    // Find closest size
    let sizeKey = '1';
    if (p.size > 2) sizeKey = '2';
    if (p.size > 4) sizeKey = '4';
    if (p.size > 8) sizeKey = '8';
    if (p.size > 16) sizeKey = '16';
    
    // Get particle prototype
    const prototype = particlePrototypes[p.type][p.shape][colorKey][sizeKey];
    
    if (prototype) {
      // Draw using pre-rendered prototype
      ctx.translate(p.x, p.y);
      
      if (p.type === PARTICLE_TYPES.CONFETTI) {
        ctx.rotate(p.rotation);
      }
      
      const scale = p.size / parseInt(sizeKey);
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
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}