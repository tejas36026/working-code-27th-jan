// Global constants
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
  PREPARE: 0,          // 0-1000ms: Rocket appears and prepares for launch
  LAUNCH: 1000,        // 1000-2500ms: Rocket launches
  FLIGHT: 2500,        // 2500-4000ms: Rocket flies around
  FADEOUT: 4000        // 4000-5000ms: Rocket flies away
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

// Rocket state
let rocket = null;
let exhaust = [];
let flyPath = [];

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
      rocket = null;
      exhaust = [];
      flyPath = [];
      
      // Create rocket and flight path
      createRocket(width, height);
      createFlightPath(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Create rocket and flight path
      createRocket(width, height);
      createFlightPath(width, height);
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
  } else if (elapsed < STAGES.FLIGHT) {
    return 'launch';
  } else if (elapsed < STAGES.FADEOUT) {
    return 'flight';
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

function createRocket(width, height) {
  // Calculate rocket dimensions based on region size
  const minDimension = Math.min(
    Math.max(10, regionBounds.width), 
    Math.max(10, regionBounds.height)
  );
  const rocketHeight = minDimension * 0.8;
  const rocketWidth = rocketHeight * 0.4;
  
  // Choose primary color for rocket
  const primaryColorIdx = Math.floor(Math.random() * COLORS.length);
  const primaryColor = COLORS[primaryColorIdx];
  
  // Secondary color (contrasting with primary)
  const secondaryColorIdx = (primaryColorIdx + 4) % COLORS.length;
  const secondaryColor = COLORS[secondaryColorIdx];
  
  // Window color
  const windowColor = { r: 255, g: 255, b: 255, a: 1 };
  
  // Initialize rocket object
  rocket = {
    x: regionCenter.x,
    y: regionCenter.y + Math.max(10, regionBounds.height * 0.2), // Start slightly below center
    width: Math.max(5, rocketWidth),
    height: Math.max(10, rocketHeight),
    angle: -Math.PI / 2, // Pointing up
    targetAngle: -Math.PI / 2,
    speed: 0,
    maxSpeed: 15,
    acceleration: 0.2,
    rotationSpeed: 0.05,
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
      window: windowColor
    },
    opacity: 0, // Start invisible
    exhaustRate: 0.2
  };
}

function createFlightPath(width, height) {
  // Create a path for the rocket to follow
  flyPath = [];
  
  // Starting point (launch position)
  const startX = regionCenter.x;
  const startY = regionCenter.y;
  
  flyPath.push({ x: startX, y: startY });
  
  // Create a looping path
  const pathPoints = 10;
  const radius = Math.min(width, height) * 0.3;
  
  for (let i = 0; i <= pathPoints; i++) {
    const t = i / pathPoints;
    
    // First do a vertical launch
    if (i === 1) {
      flyPath.push({ 
        x: startX, 
        y: Math.max(0, startY - radius * 0.5)
      });
    }
    // Then create a circular/looping path
    else if (i > 1) {
      const angle = (t - 0.1) * Math.PI * 2;
      const loopX = width / 2 + Math.cos(angle) * radius;
      const loopY = height / 3 + Math.sin(angle) * radius * 0.6;
      
      flyPath.push({ 
        x: Math.max(0, Math.min(width, loopX)), 
        y: Math.max(0, Math.min(height, loopY)) 
      });
    }
  }
  
  // Add exit point (off-screen)
  flyPath.push({ 
    x: width + 100, 
    y: Math.max(0, height / 2 - 200)
  });
}

function updateAndDrawAnimation(ctx, deltaTime, stage, elapsed, width, height) {
  if (!rocket) return;
  
  // Update based on animation stage
  switch (stage) {
    case 'prepare':
      updatePrepareStage(deltaTime, elapsed);
      break;
      
    case 'launch':
      updateLaunchStage(deltaTime, elapsed);
      break;
      
    case 'flight':
      updateFlightStage(deltaTime, elapsed, width, height);
      break;
      
    case 'fadeout':
      updateFadeoutStage(deltaTime, elapsed, width, height);
      break;
  }
  
  // Update exhaust particles
  updateExhaust(deltaTime, stage);
  
  // Draw the region (for prepare and early launch stages)
  if (stage === 'prepare' || (stage === 'launch' && elapsed < STAGES.LAUNCH + 500)) {
    drawRegionImage(elapsed);
  }
  
  // Draw exhaust first (behind rocket)
  drawExhaust(ctx);
  
  // Draw rocket
  drawRocket(ctx);
}

function updatePrepareStage(deltaTime, elapsed) {
  // Fade in the rocket
  const prepareProgress = elapsed / STAGES.LAUNCH;
  rocket.opacity = Math.min(1.0, prepareProgress * 2);
  
  // Add some slight hovering motion
  const hoverAmount = Math.sin(elapsed * 0.004) * 2;
  rocket.y += hoverAmount * 0.05;
  
  // Add exhaust particles occasionally for "warm-up"
  if (Math.random() < rocket.exhaustRate * 0.3) {
    addExhaustParticle(0.5);
  }
}

function updateLaunchStage(deltaTime, elapsed) {
  const launchProgress = (elapsed - STAGES.LAUNCH) / (STAGES.FLIGHT - STAGES.LAUNCH);
  
  // Accelerate the rocket
  rocket.speed = Math.min(rocket.maxSpeed, rocket.speed + rocket.acceleration * deltaTime);
  
  // Move the rocket based on current path segment
  const pathIndex = Math.min(1, Math.floor(launchProgress * 2));
  const targetPoint = flyPath[pathIndex];
  
  // Calculate direction to target
  const dx = targetPoint.x - rocket.x;
  const dy = targetPoint.y - rocket.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Update rocket position
  if (distance > 0) {
    const moveStep = Math.min(distance, rocket.speed * deltaTime);
    rocket.x += (dx / distance) * moveStep;
    rocket.y += (dy / distance) * moveStep;
    
    // Update rocket angle
    rocket.targetAngle = Math.atan2(dy, dx);
  }
  
  // Smoothly rotate to target angle
  const angleDiff = normalizeAngle(rocket.targetAngle - rocket.angle);
  rocket.angle += angleDiff * rocket.rotationSpeed * deltaTime;
  
  // Add exhaust particles
  if (Math.random() < rocket.exhaustRate) {
    addExhaustParticle(1.0);
  }
}

function updateFlightStage(deltaTime, elapsed, width, height) {
  const flightProgress = (elapsed - STAGES.FLIGHT) / (STAGES.FADEOUT - STAGES.FLIGHT);
  
  // Follow the flight path
  const pathIndex = Math.min(flyPath.length - 2, 2 + Math.floor(flightProgress * (flyPath.length - 3)));
  const nextPathIndex = Math.min(flyPath.length - 1, pathIndex + 1);
  
  const targetPoint = flyPath[pathIndex];
  const nextPoint = flyPath[nextPathIndex];
  
  // Interpolate between current and next path point
  const t = (flightProgress * (flyPath.length - 3)) % 1;
  const currentTarget = {
    x: targetPoint.x + (nextPoint.x - targetPoint.x) * t,
    y: targetPoint.y + (nextPoint.y - targetPoint.y) * t
  };
  
  // Calculate direction to target
  const dx = currentTarget.x - rocket.x;
  const dy = currentTarget.y - rocket.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Update rocket position
  if (distance > 0) {
    // Maximum speed during flight
    rocket.speed = rocket.maxSpeed;
    const moveStep = Math.min(distance, rocket.speed * deltaTime);
    rocket.x += (dx / distance) * moveStep;
    rocket.y += (dy / distance) * moveStep;
    
    // Update rocket angle (look ahead on the path)
    rocket.targetAngle = Math.atan2(
      nextPoint.y - targetPoint.y,
      nextPoint.x - targetPoint.x
    );
  }
  
  // Smoothly rotate to target angle
  const angleDiff = normalizeAngle(rocket.targetAngle - rocket.angle);
  rocket.angle += angleDiff * rocket.rotationSpeed * deltaTime;
  
  // Add exhaust particles
  if (Math.random() < rocket.exhaustRate * 1.5) {
    addExhaustParticle(1.0);
  }
}

function updateFadeoutStage(deltaTime, elapsed, width, height) {
  const fadeoutProgress = (elapsed - STAGES.FADEOUT) / (ANIMATION_DURATION - STAGES.FADEOUT);
  
  // Continue along the final path
  const targetPoint = flyPath[flyPath.length - 1];
  
  // Calculate direction to target
  const dx = targetPoint.x - rocket.x;
  const dy = targetPoint.y - rocket.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Update rocket position
  if (distance > 0) {
    // Maximum speed during fadeout
    rocket.speed = rocket.maxSpeed * 1.2;
    const moveStep = Math.min(distance, rocket.speed * deltaTime);
    rocket.x += (dx / distance) * moveStep;
    rocket.y += (dy / distance) * moveStep;
    
    // Update rocket angle
    rocket.targetAngle = Math.atan2(dy, dx);
  }
  
  // Smoothly rotate to target angle
  const angleDiff = normalizeAngle(rocket.targetAngle - rocket.angle);
  rocket.angle += angleDiff * rocket.rotationSpeed * deltaTime;
  
  // Fade out
  rocket.opacity = 1.0 - fadeoutProgress;
  
  // Add exhaust particles
  if (Math.random() < rocket.exhaustRate * (1.0 - fadeoutProgress)) {
    addExhaustParticle(1.0 - fadeoutProgress);
  }
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function addExhaustParticle(intensityFactor) {
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
  const size = (3 + Math.random() * 5) * intensityFactor;
  
  // Velocity in opposite direction of rocket
  const speed = (2 + Math.random() * 4) * intensityFactor;
  const spreadAngle = rocket.angle + Math.PI + (Math.random() - 0.5) * 0.5;
  
  // Add to exhaust array
  exhaust.push({
    x: exhaustX,
    y: exhaustY,
    vx: Math.cos(spreadAngle) * speed,
    vy: Math.sin(spreadAngle) * speed,
    size: Math.max(0.1, size),
    color: color,
    opacity: 0.8 * intensityFactor,
    lifespan: 0.3 + Math.random() * 0.4
  });
  
  // Limit number of exhaust particles for performance
  if (exhaust.length > 100 * performanceLevel) {
    exhaust.shift();
  }
}

function updateExhaust(deltaTime, stage) {
  for (let i = exhaust.length - 1; i >= 0; i--) {
    const p = exhaust[i];
    
    // Apply physics
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Expand and fade
    p.size *= 1.03;
    p.opacity -= 0.03 * deltaTime;
    
    // Remove if fully transparent
    if (p.opacity <= 0) {
      exhaust.splice(i, 1);
    }
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

function drawExhaust(ctx) {
  for (let i = 0; i < exhaust.length; i++) {
    const p = exhaust[i];
    
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

function drawRocket(ctx) {
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
  
  ctx.restore();
}