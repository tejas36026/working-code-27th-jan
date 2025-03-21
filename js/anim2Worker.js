// Global constants
const PARTICLE_COUNT_MAX = 1000;
const INITIAL_BURST_DURATION = 1800; // ms
const SHRINK_DURATION = 350; // ms
const EXPAND_DURATION = 400; // ms
const CONFETTI_BURST_DURATION = 3500; // ms
const SPRING_CONSTANT = 0.08; 
const GRAVITY = 0.2;
const DAMPING = 0.95;

// Animation phases
const PHASES = {
  POWDER_BURST: 'powder_burst',
  SHRINK: 'shrink',
  EXPAND: 'expand',
  CONFETTI: 'confetti',
  COMPLETE: 'complete'
};

// Color palette - vibrant colors with transparency
const COLORS = [
  { r: 255, g: 50, b: 80, a: 0.85 },    // Red
  { r: 255, g: 220, b: 0, a: 0.85 },    // Yellow
  { r: 20, g: 230, b: 130, a: 0.85 },   // Green
  { r: 60, g: 140, b: 255, a: 0.85 },   // Blue
  { r: 213, g: 30, b: 249, a: 0.85 },   // Purple
  { r: 255, g: 145, b: 0, a: 0.85 },    // Orange
  { r: 240, g: 120, b: 160, a: 0.85 },  // Pink
  { r: 24, g: 220, b: 255, a: 0.85 }    // Cyan
];

// Particle categories
const PARTICLE_CATEGORIES = {
  POWDER: 'powder',
  DUST: 'dust',
  CONFETTI: 'confetti',
  SPARKLE: 'sparkle'
};

// Particle shapes
const SHAPES = {
  CIRCLE: 'circle',
  SQUARE: 'square', 
  RECTANGLE: 'rectangle',
  TRIANGLE: 'triangle',
  STAR: 'star'
};

// Animation state
let canvas = null;
let ctx = null;
let particles = [];
let backgroundParticles = [];
let startTime = 0;
let lastFrameTime = 0;
let frameCount = 0;
let currentPhase = PHASES.POWDER_BURST;
let phaseStartTime = 0;
let backgroundScale = 1.0;
let originalImageData = null;
let performanceLevel = 1.0; // Adjusts based on device performance
let cachedParticleImages = {};

// Easing functions for smooth animations
const Easing = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

self.onmessage = function(e) {
  const { 
    imageData, 
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
      
      canvas.width = width;
      canvas.height = height;
      
      // Adjust performance based on device capabilities
      if (deviceInfo) {
        if (deviceInfo.isLowPower) {
          performanceLevel = 0.6;
        } else if (deviceInfo.isHighPerformance) {
          performanceLevel = 1.2;
        }
      }
      
      // Generate cached particle images
      generateParticleCache();
      
      // Store original image
      originalImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
      );
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      lastFrameTime = currentTime;
      phaseStartTime = currentTime;
      frameCount = 0;
      particles = [];
      backgroundParticles = [];
      currentPhase = PHASES.POWDER_BURST;
      backgroundScale = 1.0;
    }
    
    // Initialize animation if first frame
    if (startTime === 0) {
      startTime = currentTime;
      lastFrameTime = currentTime;
      phaseStartTime = currentTime;
    }
    
    // Calculate time delta for physics simulation
    const deltaTime = Math.min(33, currentTime - lastFrameTime) / 16.67;
    lastFrameTime = currentTime;
    
    // Phase-specific timing and state management
    const phaseElapsed = currentTime - phaseStartTime;
    let phaseProgress = 0;
    
    // Manage animation phases
    switch (currentPhase) {
      case PHASES.POWDER_BURST:
        phaseProgress = Math.min(1.0, phaseElapsed / INITIAL_BURST_DURATION);
        
        // Create initial powder burst particles
        if (frameCount === 0) {
          createPowderBurstParticles(width, height);
        }
        
        // Add more particles over time for continuous effect
        if (phaseProgress < 0.7 && frameCount % 3 === 0) {
          if (particles.length < PARTICLE_COUNT_MAX * performanceLevel * 0.4) {
            addPowderTrailParticles(width, height, 10);
          }
        }
        
        // Transition to shrink phase
        if (phaseProgress >= 1.0) {
          currentPhase = PHASES.SHRINK;
          phaseStartTime = currentTime;
        }
        break;
        
      case PHASES.SHRINK:
        phaseProgress = Math.min(1.0, phaseElapsed / SHRINK_DURATION);
        
        // Calculate background scale using easing
        backgroundScale = 1.0 - (0.07 * Easing.easeInOutQuad(phaseProgress));
        
        // Transition to expand phase
        if (phaseProgress >= 1.0) {
          currentPhase = PHASES.EXPAND;
          phaseStartTime = currentTime;
        }
        break;
        
      case PHASES.EXPAND:
        phaseProgress = Math.min(1.0, phaseElapsed / EXPAND_DURATION);
        
        // Calculate background scale using easing
        backgroundScale = 0.93 + (0.07 * Easing.easeOutBack(phaseProgress));
        
        // Transition to confetti phase
        if (phaseProgress >= 1.0) {
          currentPhase = PHASES.CONFETTI;
          phaseStartTime = currentTime;
          
          // Create confetti burst particles
          createConfettiBurst(width, height);
        }
        break;
        
      case PHASES.CONFETTI:
        phaseProgress = Math.min(1.0, phaseElapsed / CONFETTI_BURST_DURATION);
        
        // Add sparkle particles for extra effect
        if (phaseProgress < 0.6 && frameCount % 10 === 0) {
          addSparkleParticles(width, height, 10);
        }
        
        // Transition to complete phase
        if (phaseProgress >= 1.0) {
          currentPhase = PHASES.COMPLETE;
          phaseStartTime = currentTime;
        }
        break;
        
      case PHASES.COMPLETE:
        phaseProgress = 1.0;
        break;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw scaled background image
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(backgroundScale, backgroundScale);
    ctx.translate(-width / 2, -height / 2);
    ctx.putImageData(originalImageData, 0, 0);
    ctx.restore();
    
    // Update and draw all particles
    updateAndDrawParticles(ctx, deltaTime, phaseProgress, width, height);
    
    // Adaptive performance adjustment
    if (frameCount % 30 === 0) {
      const fps = 1000 / (deltaTime * 16.67);
      
      if (fps < 35 && performanceLevel > 0.5) {
        performanceLevel = Math.max(0.5, performanceLevel - 0.1);
        // Remove some particles if performance is struggling
        if (particles.length > 150) {
          particles = particles.slice(0, Math.ceil(particles.length * 0.8));
        }
      } else if (fps > 55 && performanceLevel < 1.2) {
        performanceLevel = Math.min(1.2, performanceLevel + 0.05);
      }
    }
    
    // Capture final image
    const resultImageData = ctx.getImageData(0, 0, width, height);
    
    // Increment frame counter
    frameCount++;
    
    // Calculate overall animation progress
    const totalDuration = INITIAL_BURST_DURATION + SHRINK_DURATION + 
                          EXPAND_DURATION + CONFETTI_BURST_DURATION;
    const totalProgress = Math.min(1.0, (currentTime - startTime) / totalDuration);
    
    // Send result back to main thread
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: currentPhase === PHASES.COMPLETE,
      progress: totalProgress,
      currentPhase,
      phaseProgress,
      stats: {
        particles: particles.length,
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

function generateParticleCache() {
  const maxSize = 20;
  const tempCanvas = new OffscreenCanvas(maxSize * 2, maxSize * 2);
  const tempCtx = tempCanvas.getContext('2d');
  
  // Generate cached particles for each category, shape and color
  for (const category of Object.values(PARTICLE_CATEGORIES)) {
    cachedParticleImages[category] = {};
    
    for (const shape of Object.values(SHAPES)) {
      cachedParticleImages[category][shape] = {};
      
      for (const color of COLORS) {
        const colorKey = `rgba(${color.r},${color.g},${color.b},${color.a})`;
        cachedParticleImages[category][shape][colorKey] = {};
        
        // Generate particles of different sizes
        for (let size = 2; size <= maxSize; size += 2) {
          tempCanvas.width = size * 2;
          tempCanvas.height = size * 2;
          
          tempCtx.clearRect(0, 0, size * 2, size * 2);
          tempCtx.fillStyle = colorKey;
          
          const halfSize = size / 2;
          const centerX = size;
          const centerY = size;
          
          switch (shape) {
            case SHAPES.CIRCLE:
              tempCtx.beginPath();
              tempCtx.arc(centerX, centerY, halfSize, 0, Math.PI * 2);
              tempCtx.fill();
              break;
              
            case SHAPES.SQUARE:
              tempCtx.fillRect(centerX - halfSize, centerY - halfSize, size, size);
              break;
              
            case SHAPES.RECTANGLE:
              const width = size;
              const height = size * (0.5 + Math.random() * 0.5);
              tempCtx.fillRect(
                centerX - width/2, 
                centerY - height/2, 
                width, 
                height
              );
              break;
              
            case SHAPES.TRIANGLE:
              tempCtx.beginPath();
              tempCtx.moveTo(centerX, centerY - halfSize);
              tempCtx.lineTo(centerX + halfSize, centerY + halfSize);
              tempCtx.lineTo(centerX - halfSize, centerY + halfSize);
              tempCtx.closePath();
              tempCtx.fill();
              break;
              
            case SHAPES.STAR:
              drawStar(tempCtx, centerX, centerY, halfSize, 5);
              break;
          }
          
          // Add glow effect for sparkles
          if (category === PARTICLE_CATEGORIES.SPARKLE) {
            tempCtx.save();
            tempCtx.globalCompositeOperation = 'source-over';
            tempCtx.shadowColor = colorKey;
            tempCtx.shadowBlur = size / 2;
            tempCtx.drawImage(tempCanvas, 0, 0);
            tempCtx.restore();
          }
          
          // Store the generated particle image
          cachedParticleImages[category][shape][colorKey][size] = 
            tempCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

function drawStar(ctx, cx, cy, radius, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = (i % 2 === 0) ? radius : radius * 0.4;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function createPowderBurstParticles(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const particleCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel * 0.4);
  
  for (let i = 0; i < particleCount; i++) {
    // Random particle properties
    const size = 2 + Math.random() * 8;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Position around center with small offset
    const angle = Math.random() * Math.PI * 2;
    const distanceFromCenter = Math.random() * 10;
    const x = centerX + Math.cos(angle) * distanceFromCenter;
    const y = centerY + Math.sin(angle) * distanceFromCenter;
    
    // Direction and speed (outward from center)
    const speed = 2 + Math.random() * 8;
    const directionAngle = angle + (Math.random() - 0.5) * 0.5; // slight variation
    
    // Random shape with bias toward circles for powder
    const shapeChance = Math.random();
    let shape = SHAPES.CIRCLE;
    if (shapeChance > 0.7) shape = SHAPES.SQUARE;
    else if (shapeChance > 0.9) shape = SHAPES.TRIANGLE;
    
    // Create particle
    particles.push({
      x,
      y,
      vx: Math.cos(directionAngle) * speed,
      vy: Math.sin(directionAngle) * speed,
      size,
      color,
      shape,
      category: PARTICLE_CATEGORIES.POWDER,
      opacity: 0.7 + Math.random() * 0.3,
      fadeRate: 0.003 + Math.random() * 0.007,
      gravity: 0.02 + Math.random() * 0.03,
      drag: 0.02 + Math.random() * 0.01,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      delay: Math.random() * 0.2,
      // Spring properties for powder effect
      springX: x,
      springY: y,
      targetX: centerX + Math.cos(angle) * (30 + Math.random() * 100),
      targetY: centerY + Math.sin(angle) * (30 + Math.random() * 100)
    });
  }
}

function addPowderTrailParticles(width, height, count) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < count; i++) {
    // Generate around existing particles for a trail effect
    let refParticle = null;
    if (particles.length > 0) {
      refParticle = particles[Math.floor(Math.random() * particles.length)];
    }
    
    const x = refParticle ? 
      refParticle.x + (Math.random() - 0.5) * 10 : 
      centerX + (Math.random() - 0.5) * 20;
      
    const y = refParticle ? 
      refParticle.y + (Math.random() - 0.5) * 10 : 
      centerY + (Math.random() - 0.5) * 20;
    
    // Direction away from center
    const angle = Math.atan2(y - centerY, x - centerX);
    const speed = 1 + Math.random() * 3;
    
    // Create small dust particles
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES.CIRCLE,
      category: PARTICLE_CATEGORIES.DUST,
      opacity: 0.5 + Math.random() * 0.3,
      fadeRate: 0.01 + Math.random() * 0.02,
      gravity: 0.01 + Math.random() * 0.02,
      drag: 0.03 + Math.random() * 0.02,
      rotation: 0,
      rotationSpeed: 0,
      delay: 0
    });
  }
}

function createConfettiBurst(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const particleCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel * 0.7);
  
  for (let i = 0; i < particleCount; i++) {
    // Determine particle type
    let category, size, shape, lifespan;
    
    if (i < particleCount * 0.6) {
      // 60% regular confetti
      category = PARTICLE_CATEGORIES.CONFETTI;
      size = 5 + Math.random() * 15;
      lifespan = 0.6 + Math.random() * 0.4;
      
      // Varied shapes for confetti
      const shapeRoll = Math.random();
      if (shapeRoll < 0.3) shape = SHAPES.SQUARE;
      else if (shapeRoll < 0.6) shape = SHAPES.RECTANGLE;
      else if (shapeRoll < 0.8) shape = SHAPES.TRIANGLE;
      else shape = SHAPES.STAR;
    } else {
      // 40% sparkles
      category = PARTICLE_CATEGORIES.SPARKLE;
      size = 2 + Math.random() * 5;
      lifespan = 0.3 + Math.random() * 0.4;
      shape = Math.random() < 0.7 ? SHAPES.STAR : SHAPES.CIRCLE;
    }
    
    // Random color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    // Random position near center
    const x = centerX + (Math.random() - 0.5) * 40;
    const y = centerY + (Math.random() - 0.5) * 40;
    
    // Explosion velocity (stronger at start, weaker at edges)
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 20;
    
    // Initial upward boost for more natural explosion
    const upwardBoost = category === PARTICLE_CATEGORIES.CONFETTI ? 8 : 4;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - upwardBoost,
      size,
      color,
      shape,
      category,
      opacity: 1.0,
      fadeRate: 1 / (lifespan * 60),
      gravity: category === PARTICLE_CATEGORIES.CONFETTI ? 
        0.25 + Math.random() * 0.15 : 
        0.05 + Math.random() * 0.05,
      drag: 0.01 + Math.random() * 0.01,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      delay: Math.random() * 0.15,
      // For sparkle effect
      sparkleSpeed: 0.1 + Math.random() * 0.2,
      sparklePhase: Math.random() * Math.PI * 2
    });
  }
}

function addSparkleParticles(width, height, count) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < count; i++) {
    // Find a reference particle to emit sparkle from
    let refParticle = null;
    if (particles.length > 10) {
      // Pick from larger confetti pieces
      const possibleEmitters = particles.filter(p => 
        p.category === PARTICLE_CATEGORIES.CONFETTI && p.size > 8);
      
      if (possibleEmitters.length > 0) {
        refParticle = possibleEmitters[Math.floor(Math.random() * possibleEmitters.length)];
      }
    }
    
    const x = refParticle ? 
      refParticle.x : 
      centerX + (Math.random() - 0.5) * width * 0.8;
      
    const y = refParticle ? 
      refParticle.y : 
      centerY + (Math.random() - 0.5) * height * 0.6;
    
    // Random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.7 ? SHAPES.STAR : SHAPES.CIRCLE,
      category: PARTICLE_CATEGORIES.SPARKLE,
      opacity: 0.8 + Math.random() * 0.2,
      fadeRate: 0.02 + Math.random() * 0.04,
      gravity: 0.03 + Math.random() * 0.03,
      drag: 0.01 + Math.random() * 0.02,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      delay: 0,
      sparkleSpeed: 0.15 + Math.random() * 0.3,
      sparklePhase: Math.random() * Math.PI * 2
    });
  }
}

function updateAndDrawParticles(ctx, deltaTime, progress, width, height) {
  // Sort occasionally for better visual layering
  if (frameCount % 5 === 0) {
    particles.sort((a, b) => a.size - b.size);
  }
  
  // Process each particle
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    
    // Skip particles with delay not yet reached
    if (progress < p.delay) continue;
    
    // Apply physics based on particle category
    switch (p.category) {
      case PARTICLE_CATEGORIES.POWDER:
        // Spring physics for powder particles
        if (currentPhase === PHASES.POWDER_BURST) {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          
          p.vx += dx * SPRING_CONSTANT * deltaTime;
          p.vy += dy * SPRING_CONSTANT * deltaTime;
          
          // Apply damping
          p.vx *= Math.pow(DAMPING, deltaTime);
          p.vy *= Math.pow(DAMPING, deltaTime);
        }
        
        // Add some randomness to powder movement
        if (Math.random() > 0.7) {
          p.vx += (Math.random() - 0.5) * 0.5;
          p.vy += (Math.random() - 0.5) * 0.5;
        }
        break;
        
      case PARTICLE_CATEGORIES.CONFETTI:
        // Apply gravity
        p.vy += p.gravity * deltaTime;
        
        // Apply air resistance (more for horizontal than vertical)
        p.vx *= Math.pow(0.97, deltaTime);
        p.vy *= Math.pow(0.99, deltaTime);
        
        // Update rotation for tumbling effect
        p.rotation += p.rotationSpeed * deltaTime;
        break;
        
      case PARTICLE_CATEGORIES.SPARKLE:
        // Update sparkle effect
        p.sparklePhase += p.sparkleSpeed * deltaTime;
        const sparkleValue = Math.abs(Math.sin(p.sparklePhase));
        
        // Adjust opacity based on sparkle phase
        p.opacity = Math.min(p.opacity, 0.3 + sparkleValue * 0.7);
        
        // Light gravity and air resistance
        p.vy += p.gravity * deltaTime;
        p.vx *= Math.pow(0.98, deltaTime);
        p.vy *= Math.pow(0.98, deltaTime);
        break;
        
      case PARTICLE_CATEGORIES.DUST:
        // Very light physics for dust
        p.vy += p.gravity * 0.5 * deltaTime;
        
        // Apply air resistance
        p.vx *= Math.pow(0.95, deltaTime);
        p.vy *= Math.pow(0.95, deltaTime);
        
        // Random movement
        p.vx += (Math.random() - 0.5) * 0.3;
        p.vy += (Math.random() - 0.5) * 0.3;
        break;
    }
    
    // Update position
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Apply fade out
    p.opacity = Math.max(0, p.opacity - p.fadeRate * deltaTime);
    
    // Draw particle if visible
    if (p.opacity > 0.01) {
      drawParticleFromCache(ctx, p);
    } else {
      // Remove particle
      particles.splice(i, 1);
    }
  }
}

function drawParticleFromCache(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  
  // Get color key
  const colorKey = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.color.a})`;
  
  // Find closest cached size
  let sizeKey = 2;
  if (p.size > 2) sizeKey = 4;
  if (p.size > 4) sizeKey = 6;
  if (p.size > 6) sizeKey = 8;
  if (p.size > 8) sizeKey = 10;
  if (p.size > 10) sizeKey = 12;
  if (p.size > 12) sizeKey = 14;
  if (p.size > 14) sizeKey = 16;
  if (p.size > 16) sizeKey = 18;
  if (p.size > 18) sizeKey = 20;
  
  // Get cached particle image
  const cachedImage = cachedParticleImages[p.category][p.shape][colorKey][sizeKey];
  
  if (cachedImage) {
    // Draw using cached image
    ctx.translate(p.x, p.y);
    
    if (p.rotation !== 0) {
      ctx.rotate(p.rotation);
    }
    
    const scale = p.size / sizeKey;
    if (scale !== 1) {
      ctx.scale(scale, scale);
    }
    
    ctx.drawImage(
      cachedImage, 
      -sizeKey, 
      -sizeKey
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