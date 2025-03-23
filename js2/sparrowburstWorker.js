// Global constants
const PARTICLE_COUNT_MAX = 250;  // Adjusted for sparrows
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.1;
const GRAVITY_FACTOR = 0.98;
const AIR_RESISTANCE = 0.97;

// Sparrow colors (realistic bird colors)
const SPARROW_COLORS = [
  { body: { r: 160, g: 120, b: 80, a: 1 }, breast: { r: 200, g: 180, b: 150, a: 1 } },   // Brown/Beige
  { body: { r: 120, g: 100, b: 70, a: 1 }, breast: { r: 180, g: 160, b: 130, a: 1 } },   // Dark Brown/Tan
  { body: { r: 150, g: 130, b: 100, a: 1 }, breast: { r: 230, g: 220, b: 210, a: 1 } },  // Light Brown/White
  { body: { r: 100, g: 90, b: 80, a: 1 }, breast: { r: 160, g: 140, b: 120, a: 1 } }     // Grey Brown/Light Grey
];

// Animation state
let canvas = null;
let ctx = null;
let sparrows = [];
let feathers = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let sparrowCount = 0;
let performanceLevel = 1.0; // Scale from 0.4 (low) to 1.2 (high)

// Sparrow animation states
const SPARROW_STATES = {
  FLYING: 'flying',
  HOVERING: 'hovering',
  DIVING: 'diving'
};

// Sparrow sprites
let sparrowSprites = {};
let featherSprites = [];

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
      
      // Create sparrow sprites
      createSparrowSprites();
      createFeatherSprites();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      sparrows = [];
      feathers = [];
      
      // Determine sparrow count based on performance level
      sparrowCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel * 0.3); // Fewer sparrows, more feathers
      
      // Create sparrows
      createSparrows(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine sparrow count based on performance level
      sparrowCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel * 0.3);
      
      // Create sparrows
      createSparrows(width, height);
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
    
    // Update and draw sparrows and feathers
    updateAndDrawSparrows(ctx, deltaTime, progress, width, height);
    updateAndDrawFeathers(ctx, deltaTime);
    
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
        sparrowCount: sparrows.length,
        featherCount: feathers.length,
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

function createSparrowSprites() {
  const spriteCanvas = new OffscreenCanvas(64, 64);
  const spriteCtx = spriteCanvas.getContext('2d');
  
  // Create different sparrow sprites for different states and colors
  for (const colorScheme of SPARROW_COLORS) {
    const { body, breast } = colorScheme;
    const bodyColor = `rgb(${body.r},${body.g},${body.b})`;
    const breastColor = `rgb(${breast.r},${breast.g},${breast.b})`;
    const colorKey = `${bodyColor}_${breastColor}`;
    
    sparrowSprites[colorKey] = {};
    
    for (const state of Object.values(SPARROW_STATES)) {
      sparrowSprites[colorKey][state] = {};
      
      // Create wing positions for animation
      for (let wingPos = 0; wingPos < 3; wingPos++) {
        sparrowSprites[colorKey][state][wingPos] = {};
        
        // Create multiple sizes
        for (let size = 16; size <= 32; size += 8) {
          const key = `${size}`;
          
          spriteCtx.clearRect(0, 0, 64, 64);
          
          // Draw sparrow based on state and wing position
          switch (state) {
            case SPARROW_STATES.FLYING:
              drawFlyingSparrow(spriteCtx, bodyColor, breastColor, wingPos, size);
              break;
            case SPARROW_STATES.HOVERING:
              drawHoveringSparrow(spriteCtx, bodyColor, breastColor, wingPos, size);
              break;
            case SPARROW_STATES.DIVING:
              drawDivingSparrow(spriteCtx, bodyColor, breastColor, wingPos, size);
              break;
          }
          
          // Store the sprite
          sparrowSprites[colorKey][state][wingPos][key] = spriteCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

function drawFlyingSparrow(ctx, bodyColor, breastColor, wingPos, size) {
  const scale = size / 32;
  
  // Main body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(32, 32, 12 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Breast
  ctx.fillStyle = breastColor;
  ctx.beginPath();
  ctx.ellipse(38, 32, 6 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(44, 28, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = 'rgb(80, 60, 40)';
  ctx.beginPath();
  ctx.moveTo(50 * scale, 28 * scale);
  ctx.lineTo(54 * scale, 28 * scale);
  ctx.lineTo(50 * scale, 30 * scale);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(46 * scale, 26 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(20 * scale, 32 * scale);
  ctx.lineTo(10 * scale, 28 * scale);
  ctx.lineTo(10 * scale, 36 * scale);
  ctx.lineTo(20 * scale, 32 * scale);
  ctx.fill();
  
  // Wings based on position
  ctx.fillStyle = bodyColor;
  switch (wingPos) {
    case 0: // Wings up
      // Left wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 24 * scale);
      ctx.quadraticCurveTo(25 * scale, 18 * scale, 20 * scale, 20 * scale);
      ctx.quadraticCurveTo(25 * scale, 26 * scale, 30 * scale, 24 * scale);
      ctx.fill();
      
      // Right wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 24 * scale);
      ctx.quadraticCurveTo(38 * scale, 18 * scale, 42 * scale, 20 * scale);
      ctx.quadraticCurveTo(38 * scale, 26 * scale, 34 * scale, 24 * scale);
      ctx.fill();
      break;
      
    case 1: // Wings middle
      // Left wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 28 * scale);
      ctx.quadraticCurveTo(25 * scale, 28 * scale, 20 * scale, 30 * scale);
      ctx.quadraticCurveTo(25 * scale, 32 * scale, 30 * scale, 28 * scale);
      ctx.fill();
      
      // Right wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 28 * scale);
      ctx.quadraticCurveTo(38 * scale, 28 * scale, 42 * scale, 30 * scale);
      ctx.quadraticCurveTo(38 * scale, 32 * scale, 34 * scale, 28 * scale);
      ctx.fill();
      break;
      
    case 2: // Wings down
      // Left wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 32 * scale);
      ctx.quadraticCurveTo(25 * scale, 38 * scale, 20 * scale, 40 * scale);
      ctx.quadraticCurveTo(25 * scale, 34 * scale, 30 * scale, 32 * scale);
      ctx.fill();
      
      // Right wing
      ctx.beginPath();
      ctx.moveTo(32 * scale, 32 * scale);
      ctx.quadraticCurveTo(38 * scale, 38 * scale, 42 * scale, 40 * scale);
      ctx.quadraticCurveTo(38 * scale, 34 * scale, 34 * scale, 32 * scale);
      ctx.fill();
      break;
  }
  
  // Feet
  ctx.fillStyle = 'rgb(100, 80, 60)';
  ctx.beginPath();
  ctx.moveTo(28 * scale, 38 * scale);
  ctx.lineTo(28 * scale, 42 * scale);
  ctx.moveTo(34 * scale, 38 * scale);
  ctx.lineTo(34 * scale, 42 * scale);
  ctx.stroke();
}

function drawHoveringSparrow(ctx, bodyColor, breastColor, wingPos, size) {
  const scale = size / 32;
  
  // Main body - more vertical for hovering
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(32, 32, 8 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Breast
  ctx.fillStyle = breastColor;
  ctx.beginPath();
  ctx.ellipse(32, 28, 7 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(32, 20, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = 'rgb(80, 60, 40)';
  ctx.beginPath();
  ctx.moveTo(32 * scale, 16 * scale);
  ctx.lineTo(32 * scale, 12 * scale);
  ctx.lineTo(34 * scale, 16 * scale);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(30 * scale, 18 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(34 * scale, 18 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(32 * scale, 44 * scale);
  ctx.lineTo(28 * scale, 50 * scale);
  ctx.lineTo(36 * scale, 50 * scale);
  ctx.lineTo(32 * scale, 44 * scale);
  ctx.fill();
  
  // Wings based on position - wider wingspan for hovering
  ctx.fillStyle = bodyColor;
  
  const wingSpread = wingPos === 0 ? 30 : 
                     wingPos === 1 ? 24 : 18;
  
  // Left wing
  ctx.beginPath();
  ctx.moveTo(32 * scale, 28 * scale);
  ctx.quadraticCurveTo(
    (32 - wingSpread/2) * scale, 
    28 * scale, 
    (32 - wingSpread) * scale, 
    (28 + (wingPos * 2)) * scale
  );
  ctx.quadraticCurveTo(
    (32 - wingSpread/2) * scale, 
    (32 + (wingPos * 2)) * scale, 
    32 * scale, 
    32 * scale
  );
  ctx.fill();
  
  // Right wing
  ctx.beginPath();
  ctx.moveTo(32 * scale, 28 * scale);
  ctx.quadraticCurveTo(
    (32 + wingSpread/2) * scale, 
    28 * scale, 
    (32 + wingSpread) * scale, 
    (28 + (wingPos * 2)) * scale
  );
  ctx.quadraticCurveTo(
    (32 + wingSpread/2) * scale, 
    (32 + (wingPos * 2)) * scale, 
    32 * scale, 
    32 * scale
  );
  ctx.fill();
  
  // Feet
  ctx.fillStyle = 'rgb(100, 80, 60)';
  ctx.beginPath();
  ctx.moveTo(30 * scale, 42 * scale);
  ctx.lineTo(28 * scale, 46 * scale);
  ctx.moveTo(34 * scale, 42 * scale);
  ctx.lineTo(36 * scale, 46 * scale);
  ctx.stroke();
}

function drawDivingSparrow(ctx, bodyColor, breastColor, wingPos, size) {
  const scale = size / 32;
  
  // Main body - streamlined for diving
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(32, 32, 6 * scale, 16 * scale, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Breast
  ctx.fillStyle = breastColor;
  ctx.beginPath();
  ctx.ellipse(36, 28, 5 * scale, 8 * scale, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(40, 24, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = 'rgb(80, 60, 40)';
  ctx.beginPath();
  ctx.moveTo(44 * scale, 20 * scale);
  ctx.lineTo(48 * scale, 16 * scale);
  ctx.lineTo(44 * scale, 18 * scale);
  ctx.fill();
  
  // Eye
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(42 * scale, 22 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Tail
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(24 * scale, 40 * scale);
  ctx.lineTo(16 * scale, 48 * scale);
  ctx.lineTo(20 * scale, 42 * scale);
  ctx.lineTo(24 * scale, 40 * scale);
  ctx.fill();
  
  // Wings tucked in for diving
  ctx.fillStyle = bodyColor;
  
  // Left wing - mostly tucked
  ctx.beginPath();
  ctx.moveTo(28 * scale, 32 * scale);
  ctx.lineTo(22 * scale, 38 * scale);
  ctx.lineTo(26 * scale, 38 * scale);
  ctx.lineTo(32 * scale, 32 * scale);
  ctx.fill();
  
  // Right wing - varies slightly with wing position
  const wingExtension = wingPos * 2;
  
  ctx.beginPath();
  ctx.moveTo(32 * scale, 28 * scale);
  ctx.lineTo((34 + wingExtension) * scale, (30 + wingExtension) * scale);
  ctx.lineTo((32 + wingExtension) * scale, (32 + wingExtension) * scale);
  ctx.lineTo(30 * scale, 30 * scale);
  ctx.fill();
  
  // Feet tucked in
  ctx.fillStyle = 'rgb(100, 80, 60)';
  ctx.beginPath();
  ctx.moveTo(28 * scale, 36 * scale);
  ctx.lineTo(30 * scale, 38 * scale);
  ctx.stroke();
}

function createFeatherSprites() {
  const spriteCanvas = new OffscreenCanvas(32, 32);
  const spriteCtx = spriteCanvas.getContext('2d');
  
  // Create feather sprites in different colors and sizes
  for (const colorScheme of SPARROW_COLORS) {
    const { body } = colorScheme;
    const featherColor = `rgb(${body.r},${body.g},${body.b})`;
    
    for (let size = 4; size <= 12; size += 4) {
      spriteCtx.clearRect(0, 0, 32, 32);
      
      // Draw feather
      spriteCtx.fillStyle = featherColor;
      spriteCtx.strokeStyle = `rgba(${body.r-20},${body.g-20},${body.b-20},0.7)`;
      spriteCtx.lineWidth = 0.5;
      
      // Main shaft
      spriteCtx.beginPath();
      spriteCtx.moveTo(16, 16 - size);
      spriteCtx.lineTo(16, 16 + size);
      spriteCtx.stroke();
      
      // Barbs
      const barbLength = size * 0.7;
      const barbCount = 6 + Math.floor(size / 2);
      
      for (let i = 0; i < barbCount; i++) {
        const y = 16 - size + (2 * size * i / (barbCount - 1));
        const barbSize = (y < 16) ? barbLength * ((y - (16 - size)) / (2 * size)) : 
                                    barbLength * (1 - ((y - 16) / (2 * size)));
        
        spriteCtx.beginPath();
        spriteCtx.moveTo(16, y);
        spriteCtx.bezierCurveTo(
          16 + barbSize * 0.5, y - barbSize * 0.1,
          16 + barbSize * 0.7, y - barbSize * 0.2,
          16 + barbSize, y - barbSize * 0.3
        );
        spriteCtx.stroke();
        
        spriteCtx.beginPath();
        spriteCtx.moveTo(16, y);
        spriteCtx.bezierCurveTo(
          16 - barbSize * 0.5, y - barbSize * 0.1,
          16 - barbSize * 0.7, y - barbSize * 0.2,
          16 - barbSize, y - barbSize * 0.3
        );
        spriteCtx.stroke();
      }
      
      // Store the sprite
      featherSprites.push({
        color: featherColor,
        size: size,
        sprite: spriteCanvas.transferToImageBitmap()
      });
    }
  }
}

function createSparrows(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < sparrowCount; i++) {
    // Determine initial state
    let state = SPARROW_STATES.FLYING;
    if (i < sparrowCount * 0.7) {
      state = SPARROW_STATES.FLYING;
    } else if (i < sparrowCount * 0.9) {
      state = SPARROW_STATES.HOVERING;
    } else {
      state = SPARROW_STATES.DIVING;
    }
    
    // Random color scheme
    const colorScheme = SPARROW_COLORS[Math.floor(Math.random() * SPARROW_COLORS.length)];
    const bodyColor = `rgb(${colorScheme.body.r},${colorScheme.body.g},${colorScheme.body.b})`;
    const breastColor = `rgb(${colorScheme.breast.r},${colorScheme.breast.g},${colorScheme.breast.b})`;
    const colorKey = `${bodyColor}_${breastColor}`;
    
    // Random size
    const size = 16 + Math.random() * 16;
    
    // Random initial velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    
    // Initial position (around center)
    const x = centerX + (Math.random() - 0.5) * 40;
    const y = centerY + (Math.random() - 0.5) * 40;
    
    // Physics variations
    const gravity = 0.04 + Math.random() * 0.06;
    const flap = -0.15 - Math.random() * 0.2; // Upward force when flapping
    
    // Wing animation
    const wingSpeed = 0.2 + Math.random() * 0.3;
    
    // Explosion parameters
    const explosionTime = 0.2 + Math.random() * 0.6; // When should the sparrow "explode" into feathers
    const featherCount = 10 + Math.floor(Math.random() * 20); // How many feathers to create
    
    sparrows.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      state,
      colorKey,
      opacity: 1.0,
      gravity,
      flap,
      isFlapping: false,
      flapTimer: 0,
      flapInterval: 20 + Math.random() * 30,
      wingPos: Math.floor(Math.random() * 3),
      wingTimer: 0,
      wingSpeed,
      rotation: Math.atan2(Math.sin(angle) * speed, Math.cos(angle) * speed),
      delay: Math.random() * 0.3,
      explosionTime,
      featherCount,
      hasExploded: false
    });
  }
}

function updateAndDrawSparrows(ctx, deltaTime, progress, width, height) {
  for (let i = sparrows.length - 1; i >= 0; i--) {
    const sparrow = sparrows[i];
    
    // Skip sparrows with delay not yet reached
    if (progress < sparrow.delay) continue;
    
    // Adjust progress for delayed sparrows
    const adjustedProgress = (progress - sparrow.delay) / (1.0 - sparrow.delay);
    
    // Check if it's time for the sparrow to "explode" into feathers
    if (adjustedProgress > sparrow.explosionTime && !sparrow.hasExploded) {
      // Create feathers
      createFeathersFromSparrow(sparrow);
      
      // Mark as exploded
      sparrow.hasExploded = true;
      sparrow.opacity = 0; // Make sparrow invisible
      
      // Remove this sparrow
      sparrows.splice(i, 1);
      continue;
    }
    
    // Update wing animation
    sparrow.wingTimer += deltaTime;
    if (sparrow.wingTimer > sparrow.wingSpeed) {
      sparrow.wingTimer = 0;
      sparrow.wingPos = (sparrow.wingPos + 1) % 3;
      
      // If wings are up, apply flap force
      if (sparrow.wingPos === 0) {
        sparrow.isFlapping = true;
      }
    }
    
    // Apply physics
    sparrow.vy += sparrow.gravity * deltaTime;
    
    // Apply flap force
    if (sparrow.isFlapping) {
      sparrow.vy += sparrow.flap * deltaTime * 3;
      sparrow.isFlapping = false;
    }
    
    // Periodically change direction
    sparrow.flapTimer += deltaTime;
    if (sparrow.flapTimer > sparrow.flapInterval) {
      sparrow.flapTimer = 0;
      
      // Random direction change
      const angleChange = (Math.random() - 0.5) * Math.PI / 4;
      const currentAngle = Math.atan2(sparrow.vy, sparrow.vx);
      const newAngle = currentAngle + angleChange;
      const speed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
      
      sparrow.vx = Math.cos(newAngle) * speed;
      sparrow.vy = Math.sin(newAngle) * speed;
      
      // Adjust state based on movement
      const verticalComponent = Math.abs(Math.sin(newAngle));
      if (verticalComponent > 0.8) {
        sparrow.state = Math.sin(newAngle) > 0 ? SPARROW_STATES.DIVING : SPARROW_STATES.HOVERING;
      } else {
        sparrow.state = SPARROW_STATES.FLYING;
      }
    }
    
    // Update position
    sparrow.x += sparrow.vx * deltaTime;
    sparrow.y += sparrow.vy * deltaTime;
    
    // Update rotation to face movement direction
    const targetRotation = Math.atan2(sparrow.vy, sparrow.vx);
    
    // Smooth rotation
    let rotDiff = targetRotation - sparrow.rotation;
    
    // Normalize to [-PI, PI]
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    
    sparrow.rotation += rotDiff * 0.1 * deltaTime;
    
    // Draw sparrow
    ctx.save();
    ctx.globalAlpha = sparrow.opacity;
    
    // Find closest size
    let sizeKey = '16';
    if (sparrow.size > 24) sizeKey = '24';
    if (sparrow.size > 32) sizeKey = '32';
    
    // Get sparrow sprite
    const sprite = sparrowSprites[sparrow.colorKey][sparrow.state][sparrow.wingPos][sizeKey];
    
    if (sprite) {
      // Apply transformations
      ctx.translate(sparrow.x, sparrow.y);
      ctx.rotate(sparrow.rotation);
      
      const scale = sparrow.size / parseInt(sizeKey);
      ctx.scale(scale, scale);
      
      // Draw sprite
      ctx.drawImage(
        sprite, 
        -32, 
        -32, 
        64, 
        64
      );
    } else {
      // Fallback drawing method
      ctx.translate(sparrow.x, sparrow.y);
      ctx.rotate(sparrow.rotation);
      ctx.fillStyle = 'brown';
      ctx.beginPath();
      ctx.ellipse(0, 0, sparrow.size / 2, sparrow.size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Fade out sparrows that go off-screen
    if (sparrow.x < -50 || sparrow.x > width + 50 || 
        sparrow.y < -50 || sparrow.y > height + 50) {
      sparrow.opacity -= 0.1 * deltaTime;
    }
  }
}

function createFeathersFromSparrow(sparrow) {
  for (let i = 0; i < sparrow.featherCount; i++) {
    // Determine feather properties
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    const size = 4 + Math.random() * 8;
    
    // Find matching body color for feather
    const bodyColor = sparrow.colorKey.split('_')[0];
    
    // Add feather
    feathers.push({
      x: sparrow.x,
      y: sparrow.y,
      vx: Math.cos(angle) * speed + sparrow.vx * 0.3,
      vy: Math.sin(angle) * speed + sparrow.vy * 0.3,
      size,
      color: bodyColor,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 0.9,
      lifespan: 0.7 + Math.random() * 0.3,
      gravity: 0.05 + Math.random() * 0.05,
      drag: 0.02 + Math.random() * 0.03,
      wobble: {
        speed: 0.1 + Math.random() * 0.2,
        amount: 0.1 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      }
    });
  }
}

function updateAndDrawFeathers(ctx, deltaTime) {
  for (let i = feathers.length - 1; i >= 0; i--) {
    const feather = feathers[i];
    
    // Apply physics
    feather.vy += feather.gravity * deltaTime;
    
    // Apply drag
    feather.vx *= (1 - feather.drag * deltaTime);
    feather.vy *= (1 - feather.drag * deltaTime);
    
    // Add wobble movement for floating feathers
    feather.wobble.phase += feather.wobble.speed * deltaTime;
    feather.vx += Math.sin(feather.wobble.phase) * feather.wobble.amount * 0.1;
    
    // Update position
    feather.x += feather.vx * deltaTime;
    feather.y += feather.vy * deltaTime;
    
    // Update rotation
    feather.rotation += feather.rotationSpeed * deltaTime;
    
    // Fade out over time
    feather.opacity -= (1 / (feather.lifespan * 60)) * deltaTime;
    
    // Remove faded feathers
    if (feather.opacity <= 0.01) {
      feathers.splice(i, 1);
      continue;
    }
    
    // Draw feather
    ctx.save();
    ctx.globalAlpha = feather.opacity;
    
    // Find matching feather sprite
    let bestSprite = null;
    let bestSizeDiff = Number.MAX_VALUE;
    
    for (const featherSprite of featherSprites) {
      if (featherSprite.color === feather.color) {
        const sizeDiff = Math.abs(featherSprite.size - feather.size);
        if (sizeDiff < bestSizeDiff) {
          bestSizeDiff = sizeDiff;
          bestSprite = featherSprite;
        }
      }
    }
    
    if (bestSprite) {
      // Apply transformations
      ctx.translate(feather.x, feather.y);
      ctx.rotate(feather.rotation);
      
      const scale = feather.size / bestSprite.size;
      ctx.scale(scale, scale);
      
      // Draw sprite
      ctx.drawImage(
        bestSprite.sprite, 
        -16, 
        -16, 
        32, 
        32
      );
    } else {
      // Fallback drawing method
      ctx.translate(feather.x, feather.y);
      ctx.rotate(feather.rotation);
      
      ctx.fillStyle = feather.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, feather.size/2, feather.size/6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}