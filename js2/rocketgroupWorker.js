// Global constants
const PARTICLE_COUNT_MAX = 200;  // Reduced for better rocket performance
const ANIMATION_DURATION = 4500; // ms
const SPRING_FACTOR = 0.1;
const GRAVITY_FACTOR = 0.98;
const AIR_RESISTANCE = 0.97;

// Rocket color schemes
const ROCKET_COLORS = [
  { body: { r: 255, g: 0, b: 0, a: 1 }, fins: { r: 200, g: 200, b: 200, a: 1 } },     // Red/White
  { body: { r: 0, g: 100, b: 255, a: 1 }, fins: { r: 255, g: 255, b: 0, a: 1 } },     // Blue/Yellow
  { body: { r: 50, g: 205, b: 50, a: 1 }, fins: { r: 255, g: 165, b: 0, a: 1 } },     // Green/Orange
  { body: { r: 128, g: 0, b: 128, a: 1 }, fins: { r: 192, g: 192, b: 192, a: 1 } },   // Purple/Silver
  { body: { r: 0, g: 0, b: 0, a: 1 }, fins: { r: 255, g: 215, b: 0, a: 1 } }         // Black/Gold
];

// Animation state
let canvas = null;
let ctx = null;
let rockets = [];
let explosions = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let rocketCount = 0;
let performanceLevel = 1.0; // Scale from 0.4 (low) to 1.2 (high)

// Rocket types
const ROCKET_TYPES = {
  STANDARD: 'standard',
  MULTI_STAGE: 'multistage',
  SHUTTLE: 'shuttle'
};

// Cached rocket sprites
let rocketSprites = {};
let explosionSprites = [];

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
      
      // Create rocket sprites
      createRocketSprites();
      createExplosionSprites();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      rockets = [];
      explosions = [];
      
      // Determine rocket count based on performance level
      rocketCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel);
      
      // Create rockets
      createRockets(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine rocket count based on performance level
      rocketCount = Math.floor(PARTICLE_COUNT_MAX * performanceLevel);
      
      // Create rockets
      createRockets(width, height);
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
    
    // Update and draw rockets and explosions
    updateAndDrawRockets(ctx, deltaTime, progress, width, height);
    updateAndDrawExplosions(ctx, deltaTime);
    
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
        rocketCount: rockets.length,
        explosionCount: explosions.length,
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

function createRocketSprites() {
  const spriteCanvas = new OffscreenCanvas(64, 64);
  const spriteCtx = spriteCanvas.getContext('2d');
  
  // Create different rocket types and cache them
  for (const colorScheme of ROCKET_COLORS) {
    const { body, fins } = colorScheme;
    const bodyColor = `rgb(${body.r},${body.g},${body.b})`;
    const finsColor = `rgb(${fins.r},${fins.g},${fins.b})`;
    const colorKey = `${bodyColor}_${finsColor}`;
    
    rocketSprites[colorKey] = {};
    
    for (const type of Object.values(ROCKET_TYPES)) {
      rocketSprites[colorKey][type] = {};
      
      // Create multiple sizes
      for (let size = 16; size <= 32; size += 8) {
        const key = `${size}`;
        
        spriteCtx.clearRect(0, 0, 64, 64);
        
        // Determine scale factor for drawing
        const scale = size / 32;
        
        switch (type) {
          case ROCKET_TYPES.STANDARD:
            // Draw rocket body
            spriteCtx.fillStyle = bodyColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(32, 16);
            spriteCtx.lineTo(36, 24);
            spriteCtx.lineTo(36, 40);
            spriteCtx.lineTo(28, 40);
            spriteCtx.lineTo(28, 24);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw fins
            spriteCtx.fillStyle = finsColor;
            
            // Left fin
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 36);
            spriteCtx.lineTo(20, 44);
            spriteCtx.lineTo(28, 40);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Right fin
            spriteCtx.beginPath();
            spriteCtx.moveTo(36, 36);
            spriteCtx.lineTo(44, 44);
            spriteCtx.lineTo(36, 40);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw nose cone
            spriteCtx.fillStyle = finsColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 24);
            spriteCtx.lineTo(32, 16);
            spriteCtx.lineTo(36, 24);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw window
            spriteCtx.fillStyle = 'rgba(200, 200, 255, 0.7)';
            spriteCtx.beginPath();
            spriteCtx.arc(32, 28, 2, 0, Math.PI * 2);
            spriteCtx.fill();
            
            // Draw exhaust flame
            spriteCtx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 40);
            spriteCtx.lineTo(32, 48);
            spriteCtx.lineTo(36, 40);
            spriteCtx.closePath();
            spriteCtx.fill();
            break;
            
          case ROCKET_TYPES.MULTI_STAGE:
            // Draw upper stage
            spriteCtx.fillStyle = bodyColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(32, 16);
            spriteCtx.lineTo(36, 22);
            spriteCtx.lineTo(36, 32);
            spriteCtx.lineTo(28, 32);
            spriteCtx.lineTo(28, 22);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw lower stage
            spriteCtx.fillStyle = finsColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(27, 32);
            spriteCtx.lineTo(37, 32);
            spriteCtx.lineTo(38, 42);
            spriteCtx.lineTo(26, 42);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw fins
            spriteCtx.fillStyle = bodyColor;
            
            // Left fin
            spriteCtx.beginPath();
            spriteCtx.moveTo(26, 38);
            spriteCtx.lineTo(20, 46);
            spriteCtx.lineTo(26, 42);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Right fin
            spriteCtx.beginPath();
            spriteCtx.moveTo(38, 38);
            spriteCtx.lineTo(44, 46);
            spriteCtx.lineTo(38, 42);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw nose cone
            spriteCtx.fillStyle = finsColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 22);
            spriteCtx.lineTo(32, 16);
            spriteCtx.lineTo(36, 22);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw exhaust flame
            spriteCtx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 42);
            spriteCtx.lineTo(32, 50);
            spriteCtx.lineTo(36, 42);
            spriteCtx.closePath();
            spriteCtx.fill();
            break;
            
          case ROCKET_TYPES.SHUTTLE:
            // Draw main body
            spriteCtx.fillStyle = finsColor;
            spriteCtx.beginPath();
            spriteCtx.moveTo(30, 18);
            spriteCtx.lineTo(38, 22);
            spriteCtx.lineTo(38, 42);
            spriteCtx.lineTo(30, 44);
            spriteCtx.lineTo(26, 42);
            spriteCtx.lineTo(26, 22);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw wings
            spriteCtx.fillStyle = bodyColor;
            
            // Left wing
            spriteCtx.beginPath();
            spriteCtx.moveTo(26, 30);
            spriteCtx.lineTo(18, 40);
            spriteCtx.lineTo(26, 40);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Right wing
            spriteCtx.beginPath();
            spriteCtx.moveTo(38, 30);
            spriteCtx.lineTo(46, 40);
            spriteCtx.lineTo(38, 40);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw cockpit
            spriteCtx.fillStyle = 'rgba(200, 200, 255, 0.8)';
            spriteCtx.beginPath();
            spriteCtx.moveTo(30, 18);
            spriteCtx.lineTo(36, 22);
            spriteCtx.lineTo(36, 28);
            spriteCtx.lineTo(30, 26);
            spriteCtx.lineTo(28, 24);
            spriteCtx.lineTo(28, 22);
            spriteCtx.closePath();
            spriteCtx.fill();
            
            // Draw engine effects
            spriteCtx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            spriteCtx.beginPath();
            spriteCtx.moveTo(28, 44);
            spriteCtx.lineTo(30, 50);
            spriteCtx.lineTo(36, 44);
            spriteCtx.closePath();
            spriteCtx.fill();
            break;
        }
        
        // Store the sprite
        rocketSprites[colorKey][type][key] = spriteCanvas.transferToImageBitmap();
      }
    }
  }
}

function createExplosionSprites() {
  const spriteCanvas = new OffscreenCanvas(128, 128);
  const spriteCtx = spriteCanvas.getContext('2d');
  
  // Create several explosion frames
  for (let frame = 0; frame < 8; frame++) {
    spriteCtx.clearRect(0, 0, 128, 128);
    
    // Draw main explosion
    const radius = 10 + frame * 7;
    
    // Create radial gradient for explosion
    const gradient = spriteCtx.createRadialGradient(64, 64, 0, 64, 64, radius);
    
    if (frame < 2) {
      gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 200, 0, 0.9)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');
    } else if (frame < 5) {
      gradient.addColorStop(0, 'rgba(255, 200, 0, 0.9)');
      gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)');
      gradient.addColorStop(0.6, 'rgba(200, 0, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
      gradient.addColorStop(0.3, 'rgba(200, 0, 0, 0.6)');
      gradient.addColorStop(0.6, 'rgba(100, 0, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(50, 0, 0, 0)');
    }
    
    spriteCtx.fillStyle = gradient;
    spriteCtx.beginPath();
    spriteCtx.arc(64, 64, radius, 0, Math.PI * 2);
    spriteCtx.fill();
    
    // Add some particles for more effect
    const particleCount = 5 + frame * 3;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.8;
      const size = 1 + Math.random() * 3;
      const x = 64 + Math.cos(angle) * distance;
      const y = 64 + Math.sin(angle) * distance;
      
      spriteCtx.fillStyle = 'rgba(255, 255, 200, 0.8)';
      spriteCtx.beginPath();
      spriteCtx.arc(x, y, size, 0, Math.PI * 2);
      spriteCtx.fill();
    }
    
    // Store the sprite
    explosionSprites.push(spriteCanvas.transferToImageBitmap());
  }
}

function createRockets(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (let i = 0; i < rocketCount; i++) {
    // Determine rocket type
    let type;
    if (i < rocketCount * 0.6) {
      type = ROCKET_TYPES.STANDARD;
    } else if (i < rocketCount * 0.9) {
      type = ROCKET_TYPES.MULTI_STAGE;
    } else {
      type = ROCKET_TYPES.SHUTTLE;
    }
    
    // Random color scheme
    const colorScheme = ROCKET_COLORS[Math.floor(Math.random() * ROCKET_COLORS.length)];
    const bodyColor = `rgb(${colorScheme.body.r},${colorScheme.body.g},${colorScheme.body.b})`;
    const finsColor = `rgb(${colorScheme.fins.r},${colorScheme.fins.g},${colorScheme.fins.b})`;
    const colorKey = `${bodyColor}_${finsColor}`;
    
    // Random size
    const size = 16 + Math.random() * 16;
    
    // Random initial velocity (slight randomization)
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    
    // Initial position (around center)
    const x = centerX + (Math.random() - 0.5) * 20;
    const y = centerY + (Math.random() - 0.5) * 20;
    
    // Physics variations
    const gravity = -0.1; // Negative gravity to make rockets go up initially
    const drag = 0.005 + Math.random() * 0.01;
    
    // Explosion parameters
    const explosionTime = 0.2 + Math.random() * 0.6; // When should the rocket explode
    
    rockets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Initial upward boost
      size,
      type,
      colorKey,
      opacity: 1.0,
      gravity,
      drag,
      rotation: Math.atan2(-1, 0), // Point upward initially
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      delay: Math.random() * 0.4,
      explosionTime,
      hasThruster: true,
      thrusterSize: 2 + Math.random() * 4,
      thrusterIntensity: 0.7 + Math.random() * 0.3,
      trail: []
    });
  }
}

function updateAndDrawRockets(ctx, deltaTime, progress, width, height) {
  for (let i = 0; i < rockets.length; i++) {
    const rocket = rockets[i];
    
    // Skip rockets with delay not yet reached
    if (progress < rocket.delay) continue;
    
    // Adjust progress for delayed rockets
    const adjustedProgress = (progress - rocket.delay) / (1.0 - rocket.delay);
    
    // Check if it's time for the rocket to explode
    if (adjustedProgress > rocket.explosionTime && rocket.opacity > 0.5) {
      // Create explosion
      createExplosion(rocket.x, rocket.y, rocket.size);
      
      // Make the rocket fade quickly
      rocket.opacity = 0.5;
      continue;
    }
    
    // Apply physics
    rocket.vy += rocket.gravity * deltaTime;
    
    // Apply drag
    rocket.vx *= (1 - rocket.drag * deltaTime);
    rocket.vy *= (1 - rocket.drag * deltaTime);
    
    // Update position
    rocket.x += rocket.vx * deltaTime;
    rocket.y += rocket.vy * deltaTime;
    
    // Update rotation to face movement direction
    const targetRotation = Math.atan2(rocket.vy, rocket.vx);
    
    // Smooth rotation
    let rotDiff = targetRotation - rocket.rotation;
    
    // Normalize to [-PI, PI]
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    
    rocket.rotation += rotDiff * 0.1 * deltaTime;
    
    // Add to trail
    if (frameCount % 2 === 0 && rocket.hasThruster) {
      rocket.trail.push({
        x: rocket.x - Math.cos(rocket.rotation) * rocket.size * 0.6,
        y: rocket.y - Math.sin(rocket.rotation) * rocket.size * 0.6,
        size: rocket.thrusterSize * (0.5 + Math.random() * 0.5),
        opacity: 0.8,
        life: 10
      });
    }
    
    // Update trail particles
    for (let j = rocket.trail.length - 1; j >= 0; j--) {
      const particle = rocket.trail[j];
      particle.life -= deltaTime;
      particle.opacity -= 0.08 * deltaTime;
      particle.size *= 0.95;
      
      if (particle.life <= 0 || particle.opacity <= 0) {
        rocket.trail.splice(j, 1);
      }
    }
    
    // Draw trail
    for (const particle of rocket.trail) {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Draw rocket
    ctx.save();
    ctx.globalAlpha = rocket.opacity;
    
    // Find closest size
    let sizeKey = '16';
    if (rocket.size > 24) sizeKey = '24';
    if (rocket.size > 32) sizeKey = '32';
    
    // Get rocket sprite
    const sprite = rocketSprites[rocket.colorKey][rocket.type][sizeKey];
    
    if (sprite) {
      // Apply transformations
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate(rocket.rotation + Math.PI / 2); // Adjust for sprite orientation
      
      const scale = rocket.size / parseInt(sizeKey);
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
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate(rocket.rotation);
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(0, -rocket.size / 2);
      ctx.lineTo(rocket.size / 4, rocket.size / 2);
      ctx.lineTo(-rocket.size / 4, rocket.size / 2);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
    
    // Fade out rockets that go off-screen
    if (rocket.x < -50 || rocket.x > width + 50 || 
        rocket.y < -50 || rocket.y > height + 50) {
      rocket.opacity -= 0.1 * deltaTime;
    }
  }
  
  // Remove rockets that have faded out
  rockets = rockets.filter(r => r.opacity > 0.01);
}

function createExplosion(x, y, size) {
  // Base explosion size on rocket size
  const explosionSize = size * (2 + Math.random());
  
  explosions.push({
    x,
    y,
    size: explosionSize,
    frame: 0,
    frameTime: 0,
    frameDuration: 3 + Math.random() * 2,
    opacity: 1.0
  });
  
  // Create smaller secondary explosions
  const secondaryCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < secondaryCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = size * (0.5 + Math.random() * 1.5);
    
    explosions.push({
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      size: explosionSize * (0.4 + Math.random() * 0.3),
      frame: Math.floor(Math.random() * 2),
      frameTime: Math.random() * 2,
      frameDuration: 4 + Math.random() * 2,
      opacity: 0.8 + Math.random() * 0.2
    });
  }
}

function updateAndDrawExplosions(ctx, deltaTime) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    
    // Update frame
    explosion.frameTime += deltaTime;
    if (explosion.frameTime >= explosion.frameDuration) {
      explosion.frame++;
      explosion.frameTime = 0;
      
      // Reduce opacity for later frames
      if (explosion.frame > 4) {
        explosion.opacity *= 0.8;
      }
    }
    
    // Remove completed explosions
    if (explosion.frame >= explosionSprites.length || explosion.opacity < 0.05) {
      explosions.splice(i, 1);
      continue;
    }
    
    // Draw explosion
    ctx.save();
    ctx.globalAlpha = explosion.opacity;
    
    const sprite = explosionSprites[explosion.frame];
    if (sprite) {
      const scale = explosion.size / 64;
      ctx.drawImage(
        sprite,
        explosion.x - explosion.size,
        explosion.y - explosion.size,
        explosion.size * 2,
        explosion.size * 2
      );
    } else {
      // Fallback
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}