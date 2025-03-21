const ANIMATION_DURATION = 5000; // ms
const GRAVITY_FACTOR = 0.2;
const AIR_RESISTANCE = 0.98;

// Color palette - vibrant colors
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

// Animation stages
const STAGES = {
  PREPARE: 0,          // 0-1000ms: Rockets appear and prepare for launch
  LAUNCH: 1000,        // 1000-2000ms: Rockets launch
  EXPLOSION: 2000,     // 2000-3500ms: Rockets explode
  FADEOUT: 3500        // 3500-5000ms: Particles fade away
};

// Animation state
let canvas = null;
let ctx = null;
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let performanceLevel = 1.0; // Scale from 0.4 (low) to 1.2 (high)
let selectedRegionMask = null;
let regionBounds = {x: 0, y: 0, width: 0, height: 0};
let regionCenter = {x: 0, y: 0};
let originalRegionImage = null;

// Rocket and explosion states
let rockets = [];
let explosionParticles = [];
let ROCKET_COUNT = 8; // Number of rockets to create

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
          ROCKET_COUNT = 5; // Fewer rockets for low-power devices
        } else if (deviceInfo.isHighPerformance) {
          performanceLevel = 1.2;
          ROCKET_COUNT = 12; // More rockets for high-performance devices
        }
      }
    }
    
    // Process selected regions (mask) only on first frame or reset
    if (!selectedRegionMask || reset) {
      processSelectedRegions(selectedRegions, width, height);
      extractOriginalRegionImage(imageData, width, height);
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      rockets = [];
      explosionParticles = [];
      
      // Create multiple rockets
      createRockets(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Create rockets
      createRockets(width, height);
    }
    
    // Calculate time delta for physics (clamped for stability)
    const deltaTime = Math.min(33, currentTime - previousTime) / 16.67;
    previousTime = currentTime;
    
    // Calculate animation progress
    const elapsed = currentTime - startTime;
    const progress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    const stage = determineAnimationStage(elapsed);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw original image
    ctx.putImageData(imageData, 0, 0);
    
    // Update and draw based on animation stage
    updateAndDrawAnimation(ctx, deltaTime, stage, elapsed, width, height);
    
    // Copy canvas content back to imageData
    const resultImageData = ctx.getImageData(0, 0, width, height);
    
    // Increment frame counter
    frameCount++;
    
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      progress,
      performance: {
        stage,
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

function determineAnimationStage(elapsed) {
  if (elapsed < STAGES.LAUNCH) {
    return 'prepare';
  } else if (elapsed < STAGES.EXPLOSION) {
    return 'launch';
  } else if (elapsed < STAGES.FADEOUT) {
    return 'explosion';
  } else {
    return 'fadeout';
  }
}

function processSelectedRegions(selectedRegions, width, height) {
  // Create a mask for the selected region
  selectedRegionMask = new Uint8Array(width * height);
  
  // Get the region bounds
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  if (selectedRegions && selectedRegions.length > 0) {
    // Flatten all selected regions into our mask
    for (const region of selectedRegions) {
      if (region && region.data && region.data.length === width * height) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            // If pixel is in the region
            if (region.data[idx] > 0) {
              selectedRegionMask[idx] = 1;
              
              // Update bounds
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
      }
    }
  } else {
    // If no region specified, use the center of the image
    const centerSize = Math.min(width, height) / 4;
    minX = Math.floor((width - centerSize) / 2);
    minY = Math.floor((height - centerSize) / 2);
    maxX = Math.floor(minX + centerSize);
    maxY = Math.floor(minY + centerSize);
    
    // Fill the mask
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * width + x;
        selectedRegionMask[idx] = 1;
      }
    }
  }
  
  // Ensure we have valid bounds
  if (minX >= maxX || minY >= maxY || maxX <= 0 || maxY <= 0 || minX >= width || minY >= height) {
    // Use a default region in the center if invalid
    const centerSize = Math.min(width, height) / 4;
    minX = Math.floor((width - centerSize) / 2);
    minY = Math.floor((height - centerSize) / 2);
    maxX = Math.floor(minX + centerSize);
    maxY = Math.floor(minY + centerSize);
    
    // Reset mask
    selectedRegionMask = new Uint8Array(width * height);
    
    // Fill the mask with the default region
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * width + x;
        if (idx >= 0 && idx < selectedRegionMask.length) {
          selectedRegionMask[idx] = 1;
        }
      }
    }
  }
  
  // Store region bounds
  regionBounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
  
  // Calculate region center
  regionCenter = {
    x: minX + regionBounds.width / 2,
    y: minY + regionBounds.height / 2
  };
}

function extractOriginalRegionImage(imageData, width, height) {
  // Don't try to extract if region is invalid
  if (regionBounds.width <= 0 || regionBounds.height <= 0) {
    // Create a dummy blank image
    const dummyCanvas = new OffscreenCanvas(1, 1);
    originalRegionImage = dummyCanvas.transferToImageBitmap();
    return;
  }
  
  // Create a small canvas to hold just the region
  const regionCanvas = new OffscreenCanvas(
    Math.max(1, regionBounds.width), 
    Math.max(1, regionBounds.height)
  );
  const regionCtx = regionCanvas.getContext('2d');
  
  // Ensure valid dimensions for ImageData
  const safeWidth = Math.max(1, regionBounds.width);
  const safeHeight = Math.max(1, regionBounds.height);
  
  // Create temporary image data for the region
  const regionImageData = new ImageData(safeWidth, safeHeight);
  
  // Copy pixels from the original image to the region image
  for (let y = 0; y < safeHeight; y++) {
    for (let x = 0; x < safeWidth; x++) {
      const srcX = x + regionBounds.x;
      const srcY = y + regionBounds.y;
      
      // Make sure we're within the source image bounds
      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * 4;
        const destIdx = (y * safeWidth + x) * 4;
        
        regionImageData.data[destIdx] = imageData.data[srcIdx];
        regionImageData.data[destIdx + 1] = imageData.data[srcIdx + 1];
        regionImageData.data[destIdx + 2] = imageData.data[srcIdx + 2];
        regionImageData.data[destIdx + 3] = imageData.data[srcIdx + 3];
      }
    }
  }
  
  regionCtx.putImageData(regionImageData, 0, 0);
  originalRegionImage = regionCanvas.transferToImageBitmap();
}

function createRockets(width, height) {
  // Calculate rocket dimensions based on region size
  const minDimension = Math.min(
    Math.max(10, regionBounds.width), 
    Math.max(10, regionBounds.height)
  );
  const rocketHeight = minDimension * 0.4;
  const rocketWidth = rocketHeight * 0.3;
  
  // Create multiple rockets in random positions within the region
  for (let i = 0; i < ROCKET_COUNT; i++) {
    // Random position within the region bounds
    const rx = regionBounds.x + Math.random() * regionBounds.width;
    const ry = regionBounds.y + Math.random() * regionBounds.height;
    
    // Calculate launch angle - pointing outward from center
    const dx = rx - regionCenter.x;
    const dy = ry - regionCenter.y;
    const angle = Math.atan2(dy, dx);
    
    // Choose random color for rocket
    const primaryColorIdx = Math.floor(Math.random() * COLORS.length);
    const primaryColor = COLORS[primaryColorIdx];
    
    // Secondary color (contrasting with primary)
    const secondaryColorIdx = (primaryColorIdx + 4) % COLORS.length;
    const secondaryColor = COLORS[secondaryColorIdx];
    
    // Window color
    const windowColor = { r: 255, g: 255, b: 255, a: 1 };
    
    // Initialize rocket object
    rockets.push({
      x: rx,
      y: ry,
      initialX: rx,  // Store initial position
      initialY: ry,  // Store initial position
      width: Math.max(3, rocketWidth),
      height: Math.max(6, rocketHeight),
      angle: angle, // Point outward from center
      targetAngle: angle,
      speed: 0,
      maxSpeed: 5 + Math.random() * 7, // Slightly reduced for better control
      acceleration: 0.15 + Math.random() * 0.15, // Increased for more immediate movement
      rotationSpeed: 0.05,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        window: windowColor
      },
      opacity: 0, // Start invisible
      exhaustRate: 0.2,
      // IMPORTANT FIX: Set lower explosion trigger values to ensure rockets explode
      explosionTrigger: 0.1 + Math.random() * 0.3, // Lower value to ensure explosion happens
      hasExploded: false,
      exhaust: [], // Each rocket has its own exhaust
      wobble: {
        amount: Math.random() * 0.1,  // Add wobble effect for realistic flight
        speed: 0.05 + Math.random() * 0.1,
        offset: Math.random() * Math.PI * 2
      }
    });
  }
}

function updateAndDrawAnimation(ctx, deltaTime, stage, elapsed, width, height) {
  // Draw the region (for prepare and early launch stages)
  if (stage === 'prepare' || (stage === 'launch' && elapsed < STAGES.LAUNCH + 300)) {
    drawRegionImage(elapsed);
  }
  
  // Update and draw rockets and explosions based on animation stage
  switch (stage) {
    case 'prepare':
      updatePrepareStage(deltaTime, elapsed);
      break;
      
    case 'launch':
      updateLaunchStage(deltaTime, elapsed, width, height);
      break;
      
    case 'explosion':
      // IMPORTANT FIX: This is the key function for explosions
      updateExplosionStage(deltaTime, elapsed, width, height);
      break;
      
    case 'fadeout':
      updateFadeoutStage(deltaTime, elapsed, width, height);
      break;
  }
  
  // Draw all rockets and their exhaust
  for (const rocket of rockets) {
    if (!rocket.hasExploded || stage === 'prepare' || stage === 'launch') {
      // Draw exhaust first (behind rocket)
      drawRocketExhaust(ctx, rocket);
      
      // Draw rocket if not exploded yet
      if (!rocket.hasExploded) {
        drawRocket(ctx, rocket);
      }
    }
  }
  
  // Draw explosion particles
  drawExplosionParticles(ctx);
}

function updatePrepareStage(deltaTime, elapsed) {
  // Fade in the rockets
  const prepareProgress = elapsed / STAGES.LAUNCH;
  
  for (const rocket of rockets) {
    rocket.opacity = Math.min(1.0, prepareProgress * 2);
    
    // Add some slight hovering motion
    const hoverAmount = Math.sin(elapsed * 0.004 + rocket.x * 0.01) * 2;
    rocket.y = rocket.initialY + hoverAmount * 0.05; // Use initial position as base
    
    // Add exhaust particles occasionally for "warm-up"
    if (Math.random() < rocket.exhaustRate * 0.3) {
      addExhaustParticle(rocket, 0.5);
    }
  }
}

function updateLaunchStage(deltaTime, elapsed, width, height) {
  const launchProgress = (elapsed - STAGES.LAUNCH) / (STAGES.EXPLOSION - STAGES.LAUNCH);
  
  for (const rocket of rockets) {
    // Accelerate the rocket
    rocket.speed += rocket.acceleration * deltaTime;
    rocket.speed = Math.min(rocket.maxSpeed, rocket.speed);
    
    // Add wobble to angle for realistic movement
    const wobbleAngle = Math.sin(elapsed * rocket.wobble.speed + rocket.wobble.offset) * rocket.wobble.amount;
    const currentAngle = rocket.angle + wobbleAngle;
    
    // Move rocket in its facing direction
    const dx = Math.cos(currentAngle);
    const dy = Math.sin(currentAngle);
    
    // Update rocket position
    rocket.x += dx * rocket.speed * deltaTime;
    rocket.y += dy * rocket.speed * deltaTime;
    
    // Add exhaust particles
    if (Math.random() < rocket.exhaustRate * deltaTime * 60) {
      addExhaustParticle(rocket, 1.0);
    }
    
    // Update exhaust particles
    updateRocketExhaust(rocket, deltaTime);
  }
}

function updateExplosionStage(deltaTime, elapsed, width, height) {
  const explosionProgress = (elapsed - STAGES.EXPLOSION) / (STAGES.FADEOUT - STAGES.EXPLOSION);
  
  // DEBUG: Log explosion progress to check if we're reaching this stage
  if (frameCount % 30 === 0) {
    console.log("Explosion stage progress:", explosionProgress);
  }
  
  // Process each rocket
  for (const rocket of rockets) {
    // Continue moving if not exploded
    if (!rocket.hasExploded) {
      // Add wobble to angle for realistic movement
      const wobbleAngle = Math.sin(elapsed * rocket.wobble.speed + rocket.wobble.offset) * rocket.wobble.amount;
      const currentAngle = rocket.angle + wobbleAngle;
      
      // Move rocket
      const dx = Math.cos(currentAngle);
      const dy = Math.sin(currentAngle);
      rocket.x += dx * rocket.speed * deltaTime;
      rocket.y += dy * rocket.speed * deltaTime;
      
      // IMPORTANT FIX: Check if it's time to explode - compare directly with the stage
      // This ensures all rockets will eventually explode regardless of their trigger value
      if (explosionProgress >= rocket.explosionTrigger || explosionProgress > 0.8) {
        // Explode!
        console.log("Rocket exploding at position:", rocket.x, rocket.y);
        createExplosion(rocket, width, height);
        rocket.hasExploded = true;
      } else {
        // Still flying, add exhaust
        if (Math.random() < rocket.exhaustRate * deltaTime * 60) {
          addExhaustParticle(rocket, 1.0);
        }
      }
    }
    
    // Update exhaust particles for this rocket
    updateRocketExhaust(rocket, deltaTime);
  }
  
  // IMPORTANT FIX: Force explosion for any rockets that haven't exploded yet
  if (explosionProgress > 0.9) {
    for (const rocket of rockets) {
      if (!rocket.hasExploded) {
        console.log("Forcing explosion for rocket at:", rocket.x, rocket.y);
        createExplosion(rocket, width, height);
        rocket.hasExploded = true;
      }
    }
  }
  
  // Update all explosion particles
  updateExplosionParticles(deltaTime);
}

function updateFadeoutStage(deltaTime, elapsed, width, height) {
  const fadeoutProgress = (elapsed - STAGES.FADEOUT) / (ANIMATION_DURATION - STAGES.FADEOUT);
  
  // Fade out explosion particles
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const particle = explosionParticles[i];
    
    // Apply fade based on global fadeout progress
    particle.opacity = particle.initialOpacity * (1 - fadeoutProgress);
    
    // Continue updating particles
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    
    // Apply gravity
    particle.vy += GRAVITY_FACTOR * deltaTime;
    
    // Apply air resistance
    particle.vx *= Math.pow(AIR_RESISTANCE, deltaTime);
    particle.vy *= Math.pow(AIR_RESISTANCE, deltaTime);
    
    // Particle shrinks over time
    particle.size *= 0.99;
    
    // Remove if fully transparent or too small
    if (particle.opacity <= 0.05 || particle.size <= 0.5) {
      explosionParticles.splice(i, 1);
    }
  }
  
  // Update any remaining exhaust
  for (const rocket of rockets) {
    updateRocketExhaust(rocket, deltaTime);
  }
}

function addExhaustParticle(rocket, intensityFactor) {
  // Calculate position at back of rocket
  const exhaustX = rocket.x - Math.cos(rocket.angle) * rocket.height * 0.5;
  const exhaustY = rocket.y - Math.sin(rocket.angle) * rocket.height * 0.5;
  
  // Random exhaust color (fire colors)
  const colors = [
    { r: 255, g: 255, b: 200, a: 0.7 },  // Light yellow
    { r: 255, g: 200, b: 50, a: 0.8 },   // Yellow
    { r: 255, g: 120, b: 20, a: 0.9 },   // Orange
    { r: 255, g: 50, b: 20, a: 0.7 }     // Red
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Random size based on intensity
  const size = (2 + Math.random() * 3) * intensityFactor;
  
  // Velocity in opposite direction of rocket
  const speed = (1 + Math.random() * 3) * intensityFactor;
  const spreadAngle = rocket.angle + Math.PI + (Math.random() - 0.5) * 0.5;
  
  // Add to this rocket's exhaust array
  rocket.exhaust.push({
    x: exhaustX,
    y: exhaustY,
    vx: Math.cos(spreadAngle) * speed,
    vy: Math.sin(spreadAngle) * speed,
    size: Math.max(0.1, size),
    color: color,
    opacity: 0.7 * intensityFactor,
    lifespan: 0.2 + Math.random() * 0.3
  });
  
  // Limit number of exhaust particles for performance
  if (rocket.exhaust.length > 30 * performanceLevel) {
    rocket.exhaust.shift();
  }
}

function updateRocketExhaust(rocket, deltaTime) {
  for (let i = rocket.exhaust.length - 1; i >= 0; i--) {
    const p = rocket.exhaust[i];
    
    // Apply physics
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Expand and fade
    p.size *= 1.03;
    p.opacity -= 0.05 * deltaTime;
    
    // Remove if fully transparent
    if (p.opacity <= 0) {
      rocket.exhaust.splice(i, 1);
    }
  }
}

function createExplosion(rocket, width, height) {
  // IMPORTANT FIX: Increased particle count for more visible explosions
  const particleCount = Math.floor(100 * performanceLevel); // Doubled particle count
  
  // Store the explosion angle (rocket's current angle)
  const explosionAngle = rocket.angle;
  const rocketSpeed = rocket.speed;
  
  // Create explosion particles
  for (let i = 0; i < particleCount; i++) {
    // Distribute particles with directional bias
    let angle;
    let speed;
    
    if (Math.random() < 0.6) {
      // 60% of particles burst in the rocket's movement direction (with spread)
      const spreadAngle = Math.PI * 0.8; // 144 degree cone
      angle = explosionAngle + (Math.random() - 0.5) * spreadAngle;
      
      // Forward particles get more of rocket's momentum
      speed = 2 + Math.random() * 6 + rocketSpeed * 0.5;
    } else {
      // 40% of particles go in random directions
      angle = Math.random() * Math.PI * 2;
      speed = 2 + Math.random() * 4;
    }
    
    // Random color - using rocket color and explosion colors
    let color;
    if (Math.random() < 0.7) {
      // Use rocket's colors
      color = Math.random() < 0.7 ? rocket.colors.primary : rocket.colors.secondary;
    } else {
      // Use explosion colors (fire colors)
      const explosionColors = [
        { r: 255, g: 255, b: 200, a: 0.9 },  // Light yellow
        { r: 255, g: 200, b: 50, a: 0.9 },   // Yellow
        { r: 255, g: 120, b: 20, a: 0.9 },   // Orange
        { r: 255, g: 50, b: 20, a: 0.9 }     // Red
      ];
      color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
    }
    
    // Random size with directional bias (forward particles are larger)
    const angleDiff = Math.abs(normalizeAngle(angle - explosionAngle));
    const sizeFactor = angleDiff < Math.PI/4 ? 1.5 : 1.0;
    // IMPORTANT FIX: Increased particle size for more visible explosions
    const size = (3 + Math.random() * 5) * sizeFactor; // Larger particles
    
    // Add particle
    explosionParticles.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: size,
      color: color,
      opacity: 0.8 + Math.random() * 0.2, // Higher opacity
      initialOpacity: 0.8 + Math.random() * 0.2,
      // Some particles twinkle
      twinkle: Math.random() < 0.3,
      twinkleSpeed: 0.05 + Math.random() * 0.1,
      // For directional particles, add motion blur
      isForward: angleDiff < Math.PI/3,
      stretchFactor: angleDiff < Math.PI/4 ? 1.5 + Math.random() : 1.0
    });
  }
  
  // IMPORTANT FIX: Add a bright flash at explosion center
  for (let i = 0; i < 5; i++) {
    explosionParticles.push({
      x: rocket.x,
      y: rocket.y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: 10 + Math.random() * 15, // Large flash
      color: { r: 255, g: 255, b: 230, a: 0.9 },
      opacity: 0.9,
      initialOpacity: 0.9,
      twinkle: false,
      isFlash: true, // Special flag for flash particles
      flashDecay: 0.1 + Math.random() * 0.1 // Fast decay for flash
    });
  }
  
  // Limit total particles across all explosions for performance
  const maxParticles = 300 * performanceLevel;
  if (explosionParticles.length > maxParticles) {
    explosionParticles.splice(0, explosionParticles.length - maxParticles);
  }
}

function updateExplosionParticles(deltaTime) {
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    
    // Special handling for flash particles
    if (p.isFlash) {
      p.opacity -= p.flashDecay * deltaTime;
      
      if (p.opacity <= 0.05) {
        explosionParticles.splice(i, 1);
      }
      continue;
    }
    
    // Apply physics
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Apply gravity
    p.vy += GRAVITY_FACTOR * deltaTime;
    
    // Apply air resistance
    p.vx *= Math.pow(AIR_RESISTANCE, deltaTime);
    p.vy *= Math.pow(AIR_RESISTANCE, deltaTime);
    
    // Particles slowly shrink
    p.size *= 0.995;
    
    // Fade out
    p.opacity -= 0.01 * deltaTime;
    
    // Twinkle effect for some particles
    if (p.twinkle) {
      p.opacity += Math.sin(performance.now() * p.twinkleSpeed) * 0.05;
      p.opacity = Math.max(0, Math.min(p.initialOpacity, p.opacity));
    }
    
    // Remove if fully transparent or too small
    if (p.opacity <= 0.05 || p.size <= 0.5) {
      explosionParticles.splice(i, 1);
    }
  }
}

function drawRocketExhaust(ctx, rocket) {
  for (let i = 0; i < rocket.exhaust.length; i++) {
    const p = rocket.exhaust[i];
    
    ctx.save();
    ctx.globalAlpha = p.opacity;
    
    // Draw a gradient circle for exhaust
    try {
      // Ensure radius is positive
      const radius = Math.max(0.1, p.size);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);
      grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {
      // Fallback if gradient creation fails
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * p.color.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

function drawExplosionParticles(ctx) {
  for (let i = 0; i < explosionParticles.length; i++) {
    const p = explosionParticles[i];
    
    ctx.save();
    ctx.globalAlpha = p.opacity;
    
    // Special handling for flash particles
    if (p.isFlash) {
      try {
        const radius = Math.max(0.1, p.size);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);
        grad.addColorStop(0.7, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a * 0.5})`);
        grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } catch (e) {
        // Fallback
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * p.color.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
      continue;
    }
    
    // For directed particles, add motion blur and stretching
    if (p.isForward && p.stretchFactor > 1.0) {
      // Direction of motion
      const angle = Math.atan2(p.vy, p.vx);
      
      // Translate to particle position
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      
      // Draw stretched particle
      const xRadius = p.size * p.stretchFactor;
      const yRadius = p.size;
      
      try {
        // Create radial gradient for stretched particle
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(xRadius, yRadius));
        grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);
        grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, xRadius, yRadius, 0, 0, Math.PI * 2);
        ctx.fill();
      } catch (e) {
        // Fallback
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * p.color.a})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, xRadius, yRadius, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Regular circular particles
      try {
        // Ensure radius is positive
        const radius = Math.max(0.1, p.size);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);
        grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } catch (e) {
        // Fallback if gradient creation fails
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * p.color.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}

function drawRegionImage(elapsed) {
  if (!originalRegionImage) return;
  
  // Simple fade-out effect
  let opacity = 1.0;
  if (elapsed > STAGES.LAUNCH) {
    opacity = Math.max(0, 1.0 - (elapsed - STAGES.LAUNCH) / 500);
  }
  
  ctx.globalAlpha = opacity;
  // Ensure we're drawing to valid coordinates
  if (regionBounds.width > 0 && regionBounds.height > 0) {
    ctx.drawImage(
      originalRegionImage,
      regionBounds.x,
      regionBounds.y,
      Math.max(1, regionBounds.width),
      Math.max(1, regionBounds.height)
    );
  }
  ctx.globalAlpha = 1.0;
}

function drawRocket(ctx, rocket) {
  if (!rocket) return;
  
  ctx.save();
  
  // Set opacity
  ctx.globalAlpha = rocket.opacity;
  
  // Move to rocket position
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate(rocket.angle);
  
  // Rocket dimensions
  const w = rocket.width;
  const h = rocket.height;
  const halfW = w / 2;
  const thirdH = h / 3;
  
  // Draw rocket body
  ctx.fillStyle = `rgb(${rocket.colors.primary.r}, ${rocket.colors.primary.g}, ${rocket.colors.primary.b})`;
  ctx.beginPath();
  ctx.moveTo(0, -h/2);              // Nose tip
  ctx.lineTo(halfW, -h/4);          // Right side of nose
  ctx.lineTo(halfW, thirdH);        // Right side of body
  ctx.lineTo(w, thirdH);            // Right fin extension
  ctx.lineTo(halfW, h/2);           // Bottom right of body
  ctx.lineTo(-halfW, h/2);          // Bottom left of body
  ctx.lineTo(-w, thirdH);           // Left fin extension
  ctx.lineTo(-halfW, thirdH);       // Left side of body
  ctx.lineTo(-halfW, -h/4);         // Left side of nose
  ctx.closePath();
  ctx.fill();
  
  // Draw rocket details
  // Windows
  ctx.fillStyle = `rgb(${rocket.colors.window.r}, ${rocket.colors.window.g}, ${rocket.colors.window.b})`;
  ctx.beginPath();
  ctx.arc(0, -thirdH * 0.5, Math.max(0.1, w * 0.3), 0, Math.PI * 2);
  ctx.fill();
  
  // Accent stripe
  ctx.fillStyle = `rgb(${rocket.colors.secondary.r}, ${rocket.colors.secondary.g}, ${rocket.colors.secondary.b})`;
  ctx.fillRect(-w * 0.3, -h * 0.1, Math.max(0.1, w * 0.6), Math.max(0.1, h * 0.1));
  
  // Engine nozzle
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(-w * 0.25, h/2);
  ctx.lineTo(w * 0.25, h/2);
  ctx.lineTo(w * 0.2, h/2 + w * 0.2);
  ctx.lineTo(-w * 0.2, h/2 + w * 0.2);
  ctx.closePath();
  ctx.fill();
  
  // Engine glow when rocket is moving
  if (rocket.speed > 0.5) {
    try {
      const glowRadius = w * 0.3 * (0.8 + Math.sin(performance.now() * 0.01) * 0.2);
      const glowGradient = ctx.createRadialGradient(
        0, h/2 + w * 0.1, 0,
        0, h/2 + w * 0.1, glowRadius
      );
      glowGradient.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
      glowGradient.addColorStop(0.5, 'rgba(255, 100, 20, 0.6)');
      glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, h/2 + w * 0.1, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {
      // Fallback simple glow
      ctx.fillStyle = 'rgba(255, 150, 50, 0.6)';
      ctx.beginPath();
      ctx.arc(0, h/2 + w * 0.1, w * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}