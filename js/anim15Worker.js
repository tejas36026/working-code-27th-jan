// Global constants
const FIREWORK_COUNT_MAX = 1000;
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.12;
const GRAVITY_FACTOR = 0.96;
const AIR_RESISTANCE = 0.95;
const DEBUG_MODE = false;

// Firework types and shapes
const FIREWORK_TYPES = {
  TRADITIONAL: 'traditional',
  CHRYSANTHEMUM: 'chrysanthemum',
  WILLOW: 'willow',
  PEONY: 'peony',
  ROCKET: 'rocket',
  SPARKLER: 'sparkler'
};

const FIREWORK_SHAPES = {
  STAR: 'star',
  CIRCLE: 'circle',
  GLITTER: 'glitter',
  SPARKLE: 'sparkle',
  TRAIL: 'trail',
  STARBURST: 'starburst',
  EXPLOSION: 'explosion',
  CRACKLE: 'crackle',
  COMET: 'comet',
  RING: 'ring',
  SPIRAL: 'spiral'
};

// Enhanced firework color palette with bright, vibrant colors
const FIREWORK_COLORS = [
  { r: 255, g: 50, b: 50, a: 1 },      // Bright red
  { r: 50, g: 255, b: 50, a: 1 },      // Bright green
  { r: 50, g: 50, b: 255, a: 1 },      // Bright blue
  { r: 255, g: 255, b: 50, a: 1 },     // Yellow
  { r: 255, g: 50, b: 255, a: 1 },     // Magenta
  { r: 50, g: 255, b: 255, a: 1 },     // Cyan
  { r: 255, g: 150, b: 50, a: 1 },     // Orange
  { r: 160, g: 50, b: 255, a: 1 },     // Purple
  { r: 255, g: 200, b: 200, a: 1 },    // Pink
  { r: 200, g: 255, b: 200, a: 1 },    // Light green
  { r: 255, g: 255, b: 255, a: 1 },    // White
  { r: 180, g: 180, b: 255, a: 1 },    // Light blue
  { r: 255, g: 215, b: 0, a: 1 }       // Gold
];

// Texture patterns for enhanced realism
const TEXTURE_PATTERNS = {
  SOFT_GLOW: 'softGlow',
  SPARKLY: 'sparkly',
  STREAKY: 'streaky',
  RADIAL: 'radial',
  GLITTERY: 'glittery'
};

// Animation state
let canvas = null;
let ctx = null;
let fireworks = [];
let fireworkSplats = [];
let fireworkTrails = [];
let fireworkSparkles = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let fireworkCount = 0;
let performanceLevel = 1.0;
let fireworkPrototypes = {};
let explosionCenter = { x: 0, y: 0 };
let renderQuality = 'high';
let statisticsData = {
  fps: 0,
  activeParticles: 0,
  renderTime: 0
};
let textureCache = {};
let lastPerformanceCheck = 0;
let adaptiveRenderingEnabled = true;

// Add enhanced debounce function with immediate option
function debounce(callback, delay = 250, options = {}) {
  let timeout;
  
  return (...args) => {
    const immediate = options.immediate && !timeout;
    
    clearTimeout(timeout);
    
    if (immediate) {
      callback(...args);
    }
    
    timeout = setTimeout(() => {
      if (!options.immediate) {
        callback(...args);
      }
      timeout = null;
    }, delay);
  };
}

// Add throttle function for performance-sensitive operations
function throttle(callback, limit = 16) {
  let waiting = false;
  let lastArgs = null;
  
  return (...args) => {
    lastArgs = args;
    
    if (!waiting) {
      callback(...lastArgs);
      waiting = true;
      setTimeout(() => {
        waiting = false;
        if (lastArgs !== args) {
          callback(...lastArgs);
        }
      }, limit);
    }
  };
}

const requestAnimationFrame = function(callback) {
  return setTimeout(callback, 1000 / 60);
};

function ensurePositiveRadius(radius) {
  return Math.max(0.1, radius); // Ensure minimum positive value
}

// Add noise function for more organic texture generation
function improvedNoise(x, y, z) {
  const p = new Uint8Array(512);
  const permutation = [151,160,137,91,90,15,
  131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
  190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
  88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
  77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
  102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
  135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
  223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
  129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
  251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
  49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  
  for (let i=0; i < 256 ; i++) {
    p[i] = permutation[i];
    p[256+i] = permutation[i];
  }
  
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  
  const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z;
  const B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
  
  return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z),
                                 grad(p[BA], x-1, y, z)),
                         lerp(u, grad(p[AB], x, y-1, z),
                                 grad(p[BB], x-1, y-1, z))),
                 lerp(v, lerp(u, grad(p[AA+1], x, y, z-1),
                                 grad(p[BA+1], x-1, y, z-1)),
                         lerp(u, grad(p[AB+1], x, y-1, z-1),
                                 grad(p[BB+1], x-1, y-1, z-1))));
                                 
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h<8 ? x : y;
    const v = h<4 ? y : h==12||h==14 ? x : z;
    return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
  }
}

// Performance monitoring through stats
class PerformanceMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 60;
    this.totalTime = 0;
    this.lastTime = 0;
    this.frames = 0;
    this.fps = 0;
    this.averageRenderTime = 0;
  }
  
  start() {
    this.lastTime = performance.now();
  }
  
  end() {
    const now = performance.now();
    const renderTime = now - this.lastTime;
    
    this.frames++;
    this.totalTime += renderTime;
    
    // Add sample and maintain fixed size
    this.samples.push(renderTime);
    if (this.samples.length > this.maxSamples) {
      this.totalTime -= this.samples.shift();
    }
    
    this.averageRenderTime = this.totalTime / this.samples.length;
    
    // Update FPS every second
    const elapsed = now - this.lastTime;
    if (elapsed >= 1000) {
      this.fps = this.frames / (elapsed / 1000);
      this.frames = 0;
      this.lastTime = now;
    }
    
    return renderTime;
  }
  
  getFPS() {
    return this.fps;
  }
  
  getAverageRenderTime() {
    return this.averageRenderTime;
  }
}

const perfMonitor = new PerformanceMonitor();

// Add shader-like helper functions for advanced effects
const shaderFx = {
  // Approximation of Fresnel effect for bright surfaces
  fresnel: (viewAngle, bias, power) => {
    return bias + (1.0 - bias) * Math.pow(1.0 - Math.cos(viewAngle), power);
  },
  
  // Bezier curve interpolation for smoother animation
  bezier: (t, p0, p1, p2, p3) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    let result = uuu * p0;
    result += 3 * uu * t * p1;
    result += 3 * u * tt * p2;
    result += ttt * p3;
    
    return result;
  },
  
  // 2D perlin noise for more natural textures
  perlinNoise2D: (x, y, scale = 1) => {
    return improvedNoise(x * scale, y * scale, 0);
  },
  
  // HSL to RGB conversion for vibrant firework colors
  hslToRgb: (h, s, l) => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
};



function drawBrightFireworkExplosion(ctx, x, y, size, color = FIREWORK_COLORS[0], progress, seed) {
  ctx.save();
  
  // Seed for deterministic randomness
  const random = seedRandom(seed);
  
  // Create a bright center
  const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, size);
 
  innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  innerGlow.addColorStop(0.1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`);
  innerGlow.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
  innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw particle rays
  const particleCount = Math.floor(20 + size / 2);
  const fadeProgress = Math.min(1, progress * 2); // Faster fade for particles
  
  for (let i = 0; i < particleCount; i++) {
    // Determine ray length and angle
    const angle = random() * Math.PI * 2;
    const rayLength = size * (0.5 + random() * 1.5);
    const rayProgress = Math.min(1, progress * (1 + random() * 0.5));
    const currentLength = rayLength * rayProgress;
    
    // Calculate ray points
    const rayX = x + Math.cos(angle) * currentLength;
    const rayY = y + Math.sin(angle) * currentLength;
    
    // Draw ray with decreasing opacity
    const rayOpacity = Math.max(0, 0.7 - fadeProgress * 0.7);
    
    // Check for valid coordinates before creating the gradient
    if (isFinite(x) && isFinite(y) && isFinite(rayX) && isFinite(rayY)) {
      // Create ray gradient
      const rayGradient = ctx.createLinearGradient(x, y, rayX, rayY);
      rayGradient.addColorStop(0, `rgba(255, 255, 255, ${rayOpacity})`);
      rayGradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${rayOpacity * 0.7})`);
      rayGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      
      // Draw ray
      ctx.strokeStyle = rayGradient;
      ctx.lineWidth = 1 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      // Add some curvature for more realistic effect
      const curveFactor = (random() - 0.5) * 0.2;
      const controlX = x + Math.cos(angle + curveFactor) * currentLength * 0.5;
      const controlY = y + Math.sin(angle + curveFactor) * currentLength * 0.5;
      
      ctx.quadraticCurveTo(controlX, controlY, rayX, rayY);
      ctx.stroke();
      
      // Draw particle at the end of longer rays
      if (rayLength > size && random() > 0.3) {
        const particleSize = 1 + random() * 3;
        const particleOpacity = Math.max(0, 0.5 - fadeProgress * 0.5);
        
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particleOpacity})`;
        ctx.beginPath();
        ctx.arc(rayX, rayY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  // Add sparkling highlight effects
  if (progress < 0.7) {
    const sparkleCount = Math.floor(10 + size / 4);
    
    for (let i = 0; i < sparkleCount; i++) {
      const sparkleAngle = random() * Math.PI * 2;
      const sparkleDistance = random() * size * 0.8;
      const sparkleX = x + Math.cos(sparkleAngle) * sparkleDistance;
      const sparkleY = y + Math.sin(sparkleAngle) * sparkleDistance;
      const sparkleSize = 0.5 + random() * 2;
      
      // Pulsating opacity based on time
      const pulsePhase = (progress * 10 + i) % 1;
      const sparkleOpacity = 0.3 + Math.sin(pulsePhase * Math.PI) * 0.7;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkleOpacity})`;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function seedRandom(seed) {
  // Simple seeded random function
  let value = seed || Math.random() * 10000;
  
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}


function updateFireworkPhysics(firework, deltaTime, progress) {
  // Apply gravity
  firework.vy += firework.gravity * deltaTime;
  
  // Apply air resistance/drag
  firework.vx *= Math.pow(1 - firework.drag, deltaTime);
  firework.vy *= Math.pow(1 - firework.drag, deltaTime);
  
  // Apply wobble to velocity
  const wobbleAmount = firework.wobbleAmount * Math.sin(firework.wobble);
  firework.wobble += firework.wobbleSpeed * deltaTime;
  
  // Apply wobble to velocity direction
  const speed = Math.sqrt(firework.vx * firework.vx + firework.vy * firework.vy);
  const angle = Math.atan2(firework.vy, firework.vx) + wobbleAmount;
  
  firework.vx = Math.cos(angle) * speed;
  firework.vy = Math.sin(angle) * speed;
  
  // Update position
  firework.x += firework.vx * deltaTime;
  firework.y += firework.vy * deltaTime;
  
  // Handle bouncing off screen edges
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const padding = firework.size * 2;
  
  // Bounce handling with elasticity
  if (firework.bounceCount < firework.maxBounces) {
    // Bottom edge
    if (firework.y > height - padding && firework.vy > 0) {
      firework.y = height - padding;
      firework.vy = -firework.vy * firework.elasticity;
      firework.bounceCount++;
      
      // Add sparkles at bounce point
      if (renderQuality !== 'low') {
        const sparkleCount = Math.floor(5 + Math.random() * 5);
        for (let i = 0; i < sparkleCount; i++) {
          addSparkle(
            firework.x + (Math.random() - 0.5) * firework.size * 2,
            height - padding + (Math.random() - 0.5) * 5,
            1 + Math.random() * 2,
            0.2 + Math.random() * 0.3,
            firework.color
          );
        }
      }
    }
    
    // Top edge
    if (firework.y < padding && firework.vy < 0) {
      firework.y = padding;
      firework.vy = -firework.vy * firework.elasticity;
      firework.bounceCount++;
    }
    
    // Right edge
    if (firework.x > width - padding && firework.vx > 0) {
      firework.x = width - padding;
      firework.vx = -firework.vx * firework.elasticity;
      firework.bounceCount++;
    }
    
    // Left edge
    if (firework.x < padding && firework.vx < 0) {
      firework.x = padding;
      firework.vx = -firework.vx * firework.elasticity;
      firework.bounceCount++;
    }
  }
  
  // Update rotation
  firework.rotation += firework.rotationSpeed * deltaTime;
  
  // Apply rotational wobble
  firework.rotationSpeed += (Math.random() - 0.5) * firework.rotationWobble * deltaTime;
  // Dampen rotational speed to prevent excessive spinning
  firework.rotationSpeed *= 0.98;
  
  // Update pulsation for glow effect
  firework.pulsatePhase += firework.pulsateSpeed * deltaTime;
}

function updateFireworkTrail(firework) {
  // Add current position to trail
  if (firework.trail.length >= firework.maxTrailLength) {
    firework.trail.shift(); // Remove oldest point
  }
  
  // Add current position with slight offset for more organic look
  firework.trail.push({
    x: firework.x + (Math.random() - 0.5) * 2,
    y: firework.y + (Math.random() - 0.5) * 2,
    size: firework.size * (0.3 + Math.random() * 0.2),
    age: 0
  });
  
  // Age existing trail points
  for (let i = 0; i < firework.trail.length; i++) {
    firework.trail[i].age += 1 / firework.maxTrailLength;
  }
}

function drawBrightFirework(ctx, firework, progress) {
  ctx.save();
  
  // Apply global opacity
  ctx.globalAlpha = firework.opacity;
  
  // Set composition mode for bright glow effects
  ctx.globalCompositeOperation = 'screen';
  
  // First draw trail if quality allows
  if (firework.trail.length > 0 && renderQuality !== 'low') {
    drawFireworkTrail(ctx, firework);
  }
  
  // Calculate glow intensity with pulsation
  const pulsateFactor = Math.sin(firework.pulsatePhase) * 0.2;
  const adjustedGlowIntensity = Math.max(0.6, Math.min(1.2, firework.glowIntensity + pulsateFactor));
  
  // Find the appropriate prototype for this firework
  let fireworkImage = null;
  let size = Math.max(1, Math.round(firework.size));
  
  // For performance, use powers of 2 for size
  let sizeKey = '1';
  if (size <= 2) sizeKey = '1';
  else if (size <= 4) sizeKey = '2';
  else if (size <= 8) sizeKey = '4';
  else if (size <= 16) sizeKey = '8';
  else if (size <= 32) sizeKey = '16';
  else sizeKey = '32';
  
  // Get color key
  const colorKey = `rgb(${Math.round(firework.color.r)},${Math.round(firework.color.g)},${Math.round(firework.color.b)})`;
  
  // Try to find the cached prototype
  if (fireworkPrototypes[firework.type] && 
      fireworkPrototypes[firework.type][firework.shape] && 
      fireworkPrototypes[firework.type][firework.shape][colorKey] && 
      fireworkPrototypes[firework.type][firework.shape][colorKey][sizeKey]) {
    fireworkImage = fireworkPrototypes[firework.type][firework.shape][colorKey][sizeKey];
  }
  
  if (fireworkImage) {
    // Draw cached prototype with rotation
    ctx.translate(firework.x, firework.y);
    ctx.rotate(firework.rotation);
    
    // Apply additional glow effect for high quality
    if (renderQuality !== 'low') {
      // Draw glow using radial gradient
      const glowRadius = firework.size * firework.glowSize * adjustedGlowIntensity;
      const glowGradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, glowRadius
      );
      
      glowGradient.addColorStop(0, `rgba(${firework.color.r},${firework.color.g},${firework.color.b},${0.4 * adjustedGlowIntensity})`);
      glowGradient.addColorStop(0.5, `rgba(${firework.color.r},${firework.color.g},${firework.color.b},${0.2 * adjustedGlowIntensity})`);
      glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw the firework image
    const scale = firework.size / (parseInt(sizeKey) || 1);
    ctx.drawImage(
      fireworkImage, 
      -32 * scale, 
      -32 * scale, 
      64 * scale, 
      64 * scale
    );
    
    // Add lens flare highlight for ultra quality
    if (renderQuality === 'ultra') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, firework.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add flare lines
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        const length = firework.size * (0.8 + Math.sin(firework.pulsatePhase + i) * 0.2);
        
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * firework.size * 0.2, Math.sin(angle) * firework.size * 0.2);
        ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
        ctx.stroke();
      }
    }
  } else {
    // Fallback rendering if prototype isn't cached
    // Create bright core
    const coreGradient = ctx.createRadialGradient(
      firework.x, firework.y, 0,
      firework.x, firework.y, firework.size * firework.glowSize
    );
    
    const r = firework.color.r, g = firework.color.g, b = firework.color.b;
    
    coreGradient.addColorStop(0, `rgba(255,255,255,${0.9 * adjustedGlowIntensity})`);
    coreGradient.addColorStop(0.1, `rgba(${r},${g},${b},${0.8 * adjustedGlowIntensity})`);
    coreGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.5 * adjustedGlowIntensity})`);
    coreGradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(firework.x, firework.y, firework.size * firework.glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bright center
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(firework.x, firework.y, firework.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawFireworkTrail(ctx, firework) {
  // Skip if no trail points
  if (firework.trail.length < 2) return;
  
  ctx.save();
  
  // Draw each trail segment
  for (let i = 0; i < firework.trail.length - 1; i++) {
    const point = firework.trail[i];
    const nextPoint = firework.trail[i + 1];
    
    // Calculate opacity based on age
    const opacity = (1 - point.age) * firework.trailOpacity;
    
    // Skip if nearly invisible
    if (opacity < 0.02) continue;
    
    // Create gradient for trail segment
    if (isFinite(point.x) && isFinite(point.y) && isFinite(nextPoint.x) && isFinite(nextPoint.y)) {
      const gradient = ctx.createLinearGradient(
        point.x, point.y,
        nextPoint.x, nextPoint.y
      );
      
      const r = firework.color.r, g = firework.color.g, b = firework.color.b;
      
      gradient.addColorStop(0, `rgba(${r},${g},${b},${opacity * 0.1})`);
      gradient.addColorStop(0.5, `rgba(${r},${g},${b},${opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},${opacity})`);
      
      // Draw trail segment
      ctx.strokeStyle = gradient;
      ctx.lineWidth = point.size * (1 - point.age * 0.8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(nextPoint.x, nextPoint.y);
      ctx.stroke();
      
      // Add glow for high quality
      if ((renderQuality === 'high' || renderQuality === 'ultra') && opacity > 0.2) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * 0.3})`;
        ctx.lineWidth = point.size * 2 * (1 - point.age * 0.6);
        
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
      }
    }
  }
  
  ctx.restore();
}
// Helper function to create a seeded random number generator
function seedRandom(seed) {
  // Simple seeded random function
  let value = seed || Math.random() * 10000;
  
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}
function updateAndDrawBrightFireworks(ctx, deltaTime, progress) {
  const deadFireworks = [];
  
  // Process each firework
  for (let i = 0; i < fireworks.length; i++) {
    const firework = fireworks[i];
    
    // Skip if delayed
    if (progress < firework.delay) continue;
    
    // Update firework physics
    updateFireworkPhysics(firework, deltaTime, progress);
    
    // Calculate opacity based on lifespan
    const lifeProgress = Math.min(1, progress / firework.lifespan);
    
    // Fade out at the end of life
    if (lifeProgress > 0.7) {
      const fadeOutProgress = (lifeProgress - 0.7) / 0.3;
      // Apply custom fade out curve with firework-specific factor
      firework.opacity = Math.max(0, 1 - Math.pow(fadeOutProgress, 1 - firework.fadeOutFactor));
      
      if (firework.opacity <= 0.05) {
        deadFireworks.push(i);
        
        // Create a burst effect when firework dies
        if (Math.random() < 0.6) {
          addBrightFireworkBurst(
            firework.x, 
            firework.y, 
            firework.size * (1 + Math.random()),
            0
          );
        }
        
        // Create sparkles when firework fades
        if (Math.random() < 0.8) {
          const sparkleCount = Math.floor(firework.size * 0.8);
          for (let j = 0; j < sparkleCount; j++) {
            addSparkle(
              firework.x + (Math.random() - 0.5) * firework.size * 2,
              firework.y + (Math.random() - 0.5) * firework.size * 2,
              1 + Math.random() * 2,
              0.2 + Math.random() * 0.6,
              firework.color
            );
          }
        }
        
        continue;
      }
    }
    
    // Update color cycling if enabled
    if (firework.colorCycle) {
      firework.colorCyclePhase += deltaTime * firework.colorCycleSpeed;
      
      // Create cycling color
      const hue = (firework.colorCyclePhase) % 1;
      const cycledColor = shaderFx.hslToRgb(hue, 0.9, 0.6);
      
      // Smoothly blend between original and cycled color
      const blendFactor = 0.6; // How much of the cycled color to use
      firework.color = {
        r: Math.round(firework.color.r * (1 - blendFactor) + cycledColor.r * blendFactor),
        g: Math.round(firework.color.g * (1 - blendFactor) + cycledColor.g * blendFactor),
        b: Math.round(firework.color.b * (1 - blendFactor) + cycledColor.b * blendFactor),
        a: firework.color.a
      };
    }
    
    // Update trail
    updateFireworkTrail(firework);
    
    // Emit sparkles if enabled
    if (firework.emitSparkles && firework.sparklesEmitted < firework.maxSparklesEmitted) {
      firework.nextSparkleEmit -= deltaTime;
      
      if (firework.nextSparkleEmit <= 0) {
        // Emit 1-3 sparkles
        const sparklesThisTime = 1 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < sparklesThisTime; j++) {
          addSparkle(
            firework.x + (Math.random() - 0.5) * firework.size,
            firework.y + (Math.random() - 0.5) * firework.size,
            1 + Math.random() * 2,
            0.3 + Math.random() * 0.5,
            firework.color
          );
          
          firework.sparklesEmitted++;
          if (firework.sparklesEmitted >= firework.maxSparklesEmitted) break;
        }
        
        // Reset timer for next emission
        firework.nextSparkleEmit = firework.sparkleEmitInterval;
      }
    }
    
    // Draw the firework
    drawBrightFirework(ctx, firework, progress);
  }
  
  // Remove dead fireworks
  for (let i = deadFireworks.length - 1; i >= 0; i--) {
    fireworks.splice(deadFireworks[i], 1);
  }
  
  // Occasionally add new bursts
  if (Math.random() < 0.05 * deltaTime && progress < 0.8) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    addBrightFireworkBurst(
      width * (0.3 + Math.random() * 0.4),
      height * (0.3 + Math.random() * 0.4),
      10 + Math.random() * 30,
      0
    );
  }
}
// Web worker event handler with advanced error handling
self.onmessage = function(e) {
  try {
    const startProcessingTime = performance.now();
    perfMonitor.start();
    
    const { 
      imageData, 
      selectedRegions, 
      value,
      reset,
      deviceInfo,
      quality,
      config
    } = e.data;
    
    const currentTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    
    // Handle configuration if provided
    if (config) {
      if (config.hasOwnProperty('adaptiveRendering')) {
        adaptiveRenderingEnabled = config.adaptiveRendering;
      }
      
      if (config.hasOwnProperty('maxFireworkCount')) {
        fireworkCount = Math.min(config.maxFireworkCount, FIREWORK_COUNT_MAX);
      }
      
      if (config.hasOwnProperty('debug')) {
        DEBUG_MODE = config.debug;
      }
    }
    
    // Set render quality if provided with validation
    if (quality) {
      if (['low', 'medium', 'high', 'ultra'].includes(quality)) {
        renderQuality = quality;
      } else {
        console.warn(`Invalid render quality: ${quality}. Using default: high`);
        renderQuality = 'high';
      }
    }
    
    // Initialize canvas if not already done with proper error handling
    if (!canvas) {
      try {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d', { 
          alpha: true,
          desynchronized: true, // Potential performance boost
          // Only enable these on high-end devices
          willReadFrequently: false,
          colorSpace: 'srgb'
        });
        
        if (!ctx) {
          throw new Error("Failed to create canvas context");
        }
        
        // Set dimensions with boundary checking
        if (width <= 0 || height <= 0) {
          throw new Error(`Invalid canvas dimensions: ${width}x${height}`);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Set explosion center with natural offset
        const centerOffsetX = (Math.random() - 0.5) * 0.2;
        const centerOffsetY = (Math.random() - 0.5) * 0.2 - 0.05; // Slight upward bias
        explosionCenter = { 
          x: width * (0.5 + centerOffsetX), 
          y: height * (0.5 + centerOffsetY) 
        };
        
        // Initialize performance level based on device info with more granular detection
        if (deviceInfo) {
          if (deviceInfo.isLowPower || deviceInfo.isMobile) {
            performanceLevel = deviceInfo.isLowPower ? 0.3 : 0.5;
            renderQuality = 'low';
          } else if (deviceInfo.isHighPerformance) {
            performanceLevel = deviceInfo.gpuTier > 2 ? 1.5 : 1.2;
            renderQuality = deviceInfo.gpuTier > 2 ? 'ultra' : 'high';
          } else {
            // Medium-spec device
            performanceLevel = 0.8;
            renderQuality = 'medium';
          }
        }
        
        // Create optimized firework prototypes with enhanced rendering
        createBrightFireworkPrototypes();
        
        // Pre-generate textures for better performance
        generateTextureCache();
      } catch (canvasError) {
        self.postMessage({
          error: `Canvas initialization error: ${canvasError.message}`,
          isComplete: true
        });
        return;
      }
    }
    
    // Reset animation if requested with proper cleanup
    if (reset) {
      // Proper cleanup of existing objects
      fireworks.forEach(fw => {
        // Any cleanup needed for firework objects
        if (fw.bitmap && typeof fw.bitmap.close === 'function') {
          fw.bitmap.close();
        }
      });
      
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      fireworks = [];
      fireworkSplats = [];
      fireworkTrails = [];
      fireworkSparkles = [];
      
      // Determine firework count based on performance level with more realistic scaling
      fireworkCount = Math.min(
        FIREWORK_COUNT_MAX,
        Math.floor(FIREWORK_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create fireworks with advanced distribution and variety
      createBrightFireworks(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine firework count based on performance level with scaling
      fireworkCount = Math.min(
        FIREWORK_COUNT_MAX, 
        Math.floor(FIREWORK_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create fireworks with advanced distribution
      createBrightFireworks(width, height);
    }
    
    // Calculate time delta for physics with improved stability
    const rawDeltaTime = currentTime - previousTime;
    // Clamp delta time to prevent physics explosions during frame drops
    const deltaTime = Math.min(50, Math.max(1, rawDeltaTime)) / 16.67;
    previousTime = currentTime;
    
    // Calculate animation progress with easing
    const elapsed = currentTime - startTime;
    const rawProgress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    
    // Apply cubic easing function for smoother animation feel
    const progress = easeInOutCubic(rawProgress);
    
    // Clear canvas with alpha optimization
    ctx.clearRect(0, 0, width, height);
    
    // Draw original image
    try {
      const imageDataTemp = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
      );
      ctx.putImageData(imageDataTemp, 0, 0);
    } catch (imageError) {
      self.postMessage({
        error: `Image rendering error: ${imageError.message}`,
        isComplete: true
      });
      return;
    }
    
    // Draw enhanced firework explosion with bright glow effect
    drawBrightFireworkExplosion(ctx, width, height, progress);
    
    // Draw firework bursts with enhanced glowing effects
    drawBrightFireworkBursts(ctx, deltaTime);
    
    // Update and draw fireworks with enhanced glow effects and varied physics
    updateAndDrawBrightFireworks(ctx, deltaTime, progress);
    
    // Draw sparkles with light bloom effects
    drawSparkles(ctx, deltaTime, progress);
    
    // Add enhanced trailing effect with advanced particle simulation
    if (progress > 0.1 && progress < 0.9) {
      drawDynamicFireworkTrails(ctx, width, height, progress, deltaTime);
    }
    
    // Add smoke/glow effect for firework appearance
    if (progress > 0.05 && progress < 0.7 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      drawGlowEffect(ctx, width, height, progress);
    }
    
    // Check if we need to adjust performance
    if (adaptiveRenderingEnabled && (frameCount % 15 === 0 || currentTime - lastPerformanceCheck > 500)) {
      lastPerformanceCheck = currentTime;
      
      // Calculate FPS using exponential moving average for stability
      const renderTime = perfMonitor.end();
      const instantFPS = 1000 / (rawDeltaTime || 16.67);
      statisticsData.fps = statisticsData.fps * 0.7 + instantFPS * 0.3;
      statisticsData.renderTime = renderTime;
      statisticsData.activeParticles = fireworks.length + fireworkSplats.length + fireworkTrails.length;
      
      // More intelligent performance adjustment based on both FPS and render time
      if (statisticsData.fps < 30 && performanceLevel > 0.3) {
        // Significant performance issue - make larger adjustment
        performanceLevel = Math.max(0.3, performanceLevel - 0.15);
        
        // Reduce particle count immediately for faster recovery
        if (fireworks.length > 100) {
          // Remove 20% of particles
          const removeCount = Math.floor(fireworks.length * 0.2);
          fireworks.splice(0, removeCount);
        }
        
        // Downgrade render quality if needed
        if (renderQuality === 'ultra') renderQuality = 'high';
        else if (renderQuality === 'high') renderQuality = 'medium';
        else if (renderQuality === 'medium') renderQuality = 'low';
        
      } else if (statisticsData.fps < 45 && performanceLevel > 0.4) {
        // Minor performance issue - make smaller adjustment
        performanceLevel = Math.max(0.4, performanceLevel - 0.08);
      } else if (statisticsData.fps > 55 && performanceLevel < 1.5 && renderTime < 12) {
        // Good performance - gradually increase quality
        performanceLevel = Math.min(1.5, performanceLevel + 0.05);
        
        // Consider upgrading render quality
        if (renderQuality === 'low' && performanceLevel > 0.7) renderQuality = 'medium';
        else if (renderQuality === 'medium' && performanceLevel > 1.0) renderQuality = 'high';
        else if (renderQuality === 'high' && performanceLevel > 1.3) renderQuality = 'ultra';
      }
    }
    
    // Debug overlay
    if (DEBUG_MODE) {
      drawDebugInfo(ctx, width, height, statisticsData);
    }
    
    // Copy canvas content back to imageData with error handling
    let resultImageData;
    try {
      resultImageData = ctx.getImageData(0, 0, width, height);
    } catch (readError) {
      self.postMessage({
        error: `Canvas read error: ${readError.message}`,
        isComplete: true
      });
      return;
    }
    
    // Increment frame counter
    frameCount++;
    
    // Log performance metrics
    const processingTime = performance.now() - startProcessingTime;
    
    // Build comprehensive result with detailed stats
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      progress,
      performance: {
        fireworkCount: fireworks.length,
        burstCount: fireworkSplats.length,
        trailCount: fireworkTrails.length,
        sparkleCount: fireworkSparkles.length,
        performanceLevel,
        fps: Math.round(statisticsData.fps),
        renderQuality,
        renderTime: processingTime.toFixed(2),
        adaptiveRendering: adaptiveRenderingEnabled
      }
    }, [resultImageData.data.buffer]);
  } catch (error) {
    // Comprehensive error handling
    console.error("Animation worker error:", error);
    
    self.postMessage({
      error: `Animation worker error: ${error.message}`,
      stack: error.stack,
      isComplete: true
    });
  }
};

// Easing functions for smoother animations
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutBounce(x) {
  const n1 = 7.5625;
  const d1 = 2.75;
  
  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
}

// Pre-generate textures for better performance
function generateTextureCache() {
  // Create noise textures of different frequencies
  const textureSizes = [64, 128, 256];
  const noiseScales = [0.05, 0.1, 0.2];
  
  for (const size of textureSizes) {
    for (const scale of noiseScales) {
      const key = `noise_${size}_${scale}`;
      const noiseCanvas = new OffscreenCanvas(size, size);
      const noiseCtx = noiseCanvas.getContext('2d');
      const imageData = noiseCtx.createImageData(size, size);
      
      // Generate noise data
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const noiseValue = (shaderFx.perlinNoise2D(x, y, scale) + 1) * 0.5;
          const intensity = Math.floor(noiseValue * 255);
          
          imageData.data[i] = intensity;
          imageData.data[i+1] = intensity;
          imageData.data[i+2] = intensity;
          imageData.data[i+3] = 255;
        }
      }
      
      noiseCtx.putImageData(imageData, 0, 0);
      textureCache[key] = noiseCanvas.transferToImageBitmap();
    }
  }
  
  // Create firework texture patterns
  const patternSize = 128;
  for (const pattern of Object.values(TEXTURE_PATTERNS)) {
    const patternCanvas = new OffscreenCanvas(patternSize, patternSize);
    const patternCtx = patternCanvas.getContext('2d');
    
    switch (pattern) {
      case TEXTURE_PATTERNS.SPARKLY:
        // Create sparkly firework texture
        patternCtx.fillStyle = '#000000';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add sparkle points
        for (let i = 0; i < 5000; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 1 + Math.random();
          patternCtx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.9})`;
          patternCtx.fillRect(x, y, size, size);
        }
        break;
        
      case TEXTURE_PATTERNS.STREAKY:
        // Create streaky firework texture (like trailing embers)
        patternCtx.fillStyle = '#000000';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add streaks
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const length = 2 + Math.random() * 15;
          const width = 1 + Math.random() * 2;
          const angle = Math.random() * Math.PI * 2;
          
          patternCtx.save();
          patternCtx.translate(x, y);
          patternCtx.rotate(angle);
          patternCtx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.8})`;
          patternCtx.fillRect(-length/2, -width/2, length, width);
          patternCtx.restore();
        }
        break;
        
      case TEXTURE_PATTERNS.RADIAL:
        // Create radial firework texture
        patternCtx.fillStyle = '#000000';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add radial lines
        const center = patternSize / 2;
        for (let i = 0; i < 60; i++) {
          const angle = (i / 60) * Math.PI * 2;
          const length = patternSize * 0.45;
          
          patternCtx.strokeStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.8})`;
          patternCtx.lineWidth = 1 + Math.random();
          patternCtx.beginPath();
          patternCtx.moveTo(center, center);
          patternCtx.lineTo(
            center + Math.cos(angle) * length,
            center + Math.sin(angle) * length
          );
          patternCtx.stroke();
        }
        break;
        
      case TEXTURE_PATTERNS.GLITTERY:
        // Create glittery firework texture
        patternCtx.fillStyle = '#000000';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add glitter
        for (let i = 0; i < 300; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 1 + Math.random() * 3;
          
          // Add stars instead of dots
          patternCtx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.8})`;
          patternCtx.beginPath();
          const points = 4 + Math.floor(Math.random() * 3);
          const outerRadius = size;
          const innerRadius = size * 0.5;
          
          for (let j = 0; j < points * 2; j++) {
            const radius = j % 2 === 0 ? outerRadius : innerRadius;
            const angle = (j / (points * 2)) * Math.PI * 2;
            const pointX = x + Math.cos(angle) * radius;
            const pointY = y + Math.sin(angle) * radius;
            
            if (j === 0) {
              patternCtx.moveTo(pointX, pointY);
            } else {
              patternCtx.lineTo(pointX, pointY);
            }
          }
          
          patternCtx.closePath();
          patternCtx.fill();
        }
        break;
        
      default: // SOFT_GLOW
        // Create soft glowing firework texture
        const glowGradient = patternCtx.createRadialGradient(
          patternSize/2, patternSize/2, 0,
          patternSize/2, patternSize/2, patternSize/2
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glowGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
        glowGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        patternCtx.fillStyle = glowGradient;
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add subtle flares
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const length = patternSize * 0.7;
          
          const flareGradient = patternCtx.createLinearGradient(
            patternSize/2, patternSize/2,
            patternSize/2 + Math.cos(angle) * length,
            patternSize/2 + Math.sin(angle) * length
          );
          
          flareGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          flareGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          patternCtx.save();
          patternCtx.translate(patternSize/2, patternSize/2);
          patternCtx.rotate(angle);
          patternCtx.fillStyle = flareGradient;
          patternCtx.fillRect(-patternSize/2, -5, patternSize, 10);
          patternCtx.restore();
        }
    }
    
    textureCache[`pattern_${pattern}`] = patternCanvas.transferToImageBitmap();
  }
  
  // Generate star shapes for fireworks
  const starCanvas = new OffscreenCanvas(64, 64);
  const starCtx = starCanvas.getContext('2d');
  
  // Different star types
  const starTypes = ['4point', '5point', '6point', '8point'];
  
  for (const type of starTypes) {
    starCtx.clearRect(0, 0, 64, 64);
    
    const points = type === '4point' ? 4 : 
                  type === '5point' ? 5 : 
                  type === '6point' ? 6 : 8;
                  
    // Draw star
    starCtx.fillStyle = '#FFFFFF';
    starCtx.beginPath();
    
    const outerRadius = 30;
    const innerRadius = 12;
    
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2;
      const x = 32 + Math.cos(angle) * radius;
      const y = 32 + Math.sin(angle) * radius;
      
      if (i === 0) {
        starCtx.moveTo(x, y);
      } else {
        starCtx.lineTo(x, y);
      }
    }
    
    starCtx.closePath();
    starCtx.fill();
    
    // Add glow
    const glowGradient = starCtx.createRadialGradient(32, 32, innerRadius, 32, 32, outerRadius * 1.5);
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    starCtx.fillStyle = glowGradient;
    starCtx.beginPath();
    starCtx.arc(32, 32, outerRadius * 1.5, 0, Math.PI * 2);
    starCtx.fill();
    
    textureCache[`star_${type}`] = starCanvas.transferToImageBitmap();
  }
}

function drawDebugInfo(ctx, width, height, stats) {
  const padding = 10;
  const lineHeight = 18;
  
  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padding, padding, 200, 7 * lineHeight + padding);
  
  ctx.font = '14px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  
  // Draw performance stats
  let y = padding * 2;
  ctx.fillText(`FPS: ${Math.round(stats.fps)}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Render Time: ${stats.renderTime.toFixed(1)}ms`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Particles: ${stats.activeParticles}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Perf Level: ${performanceLevel.toFixed(2)}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Quality: ${renderQuality}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Frame: ${frameCount}`, padding * 2, y);
  y += lineHeight;
  
  // Color-coded performance indicator
  let perfColor;
  if (stats.fps > 50) perfColor = '#00FF00';
  else if (stats.fps > 30) perfColor = '#FFFF00';
  else perfColor = '#FF0000';
  
  ctx.fillStyle = perfColor;
  ctx.fillRect(padding, padding, Math.min(stats.fps / 60, 1) * 200, 4);
}

function createBrightFireworkPrototypes() {
  const prototypeCanvas = new OffscreenCanvas(64, 64);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  fireworkPrototypes = {};
  
  // Create different firework shapes with bright glow and cache them
  for (const type of Object.values(FIREWORK_TYPES)) {
    fireworkPrototypes[type] = {};
    
    for (const shape of Object.values(FIREWORK_SHAPES)) {
      fireworkPrototypes[type][shape] = {};
      
      for (const color of FIREWORK_COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes for LOD (Level of Detail)
        for (let size = 1; size <= 32; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 64, 64);
          const halfSize = Math.max(0.5, size / 2); // Ensure minimum half size
          const center = 32;
          
          // Draw with enhanced bright glow effect
          renderBrightFirework(prototypeCtx, center, center, size, shape, color, type);
          
          // Store the prototype
          if (!fireworkPrototypes[type][shape][colorKey]) {
            fireworkPrototypes[type][shape][colorKey] = {};
          }
          fireworkPrototypes[type][shape][colorKey][key] = prototypeCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

function renderBrightFirework(ctx, x, y, size, shape, color, type) {
  // Calculate derived colors for bright glowing effect
  const r = color.r, g = color.g, b = color.b;
  const baseColor = `rgb(${r},${g},${b})`;
  
  // Create brighter center color
  const brightColor = `rgb(${Math.min(255, r+80)},${Math.min(255, g+80)},${Math.min(255, b+80)})`;
  
  // Create core color with slight saturation boost for richness
  const coreColor = `rgb(${Math.min(255, r+40)},${Math.min(255, g+40)},${Math.min(255, b+40)})`;
  
  // Create outer glow color
  const glowColor = `rgba(${r},${g},${b},0.5)`;
  
  // Create distant glow color (more transparent)
  const distantGlowColor = `rgba(${r},${g},${b},0.2)`;
  
  // Convexity parameter for enhanced glow effect
  const glowSize = size * 1.5;
  const halfSize = Math.max(0.5, size / 2); // Ensure minimum half size
  
  ctx.save();
  
  switch (shape) {
    case FIREWORK_SHAPES.STAR:
      // Create bright star-shaped firework
      // Create bright glow for star
      const starGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      starGradient.addColorStop(0, brightColor);
      starGradient.addColorStop(0.2, coreColor);
      starGradient.addColorStop(0.5, baseColor);
      starGradient.addColorStop(0.8, glowColor);
      starGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw outer glow
      ctx.fillStyle = starGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw star shape points
      const points = type === FIREWORK_TYPES.TRADITIONAL ? 5 : 
                    type === FIREWORK_TYPES.CHRYSANTHEMUM ? 8 : 
                    type === FIREWORK_TYPES.WILLOW ? 6 : 4;
      
      const outerRadius = halfSize;
      const innerRadius = halfSize * 0.4;
                    
      ctx.fillStyle = brightColor;
      ctx.beginPath();
      
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i / (points * 2)) * Math.PI * 2;
        const starX = x + Math.cos(angle) * radius;
        const starY = y + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(starX, starY);
        } else {
          ctx.lineTo(starX, starY);
        }
      }
      
      ctx.closePath();
      ctx.fill();
      
      // Add center bright dot
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.CIRCLE:
      // Create circular firework with bright glow
      const circleGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      circleGradient.addColorStop(0, brightColor);
      circleGradient.addColorStop(0.3, coreColor);
      circleGradient.addColorStop(0.6, baseColor);
      circleGradient.addColorStop(0.8, glowColor);
      circleGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw glowing circle
      ctx.fillStyle = circleGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add bright core
      ctx.fillStyle = brightColor;
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Add center bright dot
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.GLITTER:
      // Create glittery firework with many bright points
      // Base glow
      const glitterGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      glitterGradient.addColorStop(0, coreColor);
      glitterGradient.addColorStop(0.5, baseColor);
      glitterGradient.addColorStop(0.8, glowColor);
      glitterGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = glitterGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glitter points
      const glitterCount = Math.max(10, size * 2);
      
      for (let i = 0; i < glitterCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * halfSize;
        const glitterX = x + Math.cos(angle) * distance;
        const glitterY = y + Math.sin(angle) * distance;
        const glitterSize = size * (0.05 + Math.random() * 0.1);
        
        // Draw glowing point
        const pointGlow = ctx.createRadialGradient(
          glitterX, glitterY, 0,
          glitterX, glitterY, glitterSize * 2
        );
        
        pointGlow.addColorStop(0, 'rgba(255,255,255,0.9)');
        pointGlow.addColorStop(0.5, `rgba(${r},${g},${b},0.5)`);
        pointGlow.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = pointGlow;
        ctx.beginPath();
        ctx.arc(glitterX, glitterY, glitterSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright center
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(glitterX, glitterY, glitterSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case FIREWORK_SHAPES.SPARKLE:
      // Create sparkle firework with bright rays
      const sparkleGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      sparkleGradient.addColorStop(0, brightColor);
      sparkleGradient.addColorStop(0.3, coreColor);
      sparkleGradient.addColorStop(0.7, glowColor);
      sparkleGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw base glow
      ctx.fillStyle = sparkleGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw sparkle rays
      const rayCount = 12;
      ctx.strokeStyle = brightColor;
      
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const innerLength = halfSize * 0.3;
        const outerLength = halfSize * (0.7 + Math.sin(i * 0.7) * 0.3);
        
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(
          x + Math.cos(angle) * innerLength,
          y + Math.sin(angle) * innerLength
        );
        ctx.lineTo(
          x + Math.cos(angle) * outerLength,
          y + Math.sin(angle) * outerLength
        );
        ctx.stroke();
      }
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.RING:
      // Create ring-shaped firework
      const ringGradient = ctx.createRadialGradient(
        x, y, halfSize * 0.7,
        x, y, glowSize
      );
      
      ringGradient.addColorStop(0, baseColor);
      ringGradient.addColorStop(0.3, glowColor);
      ringGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw outer glow
      ctx.fillStyle = ringGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw bright ring
      ctx.strokeStyle = brightColor;
      ctx.lineWidth = halfSize * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add bright dots around the ring
      const dotCount = 8;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        const dotX = x + Math.cos(angle) * halfSize * 0.7;
        const dotY = y + Math.sin(angle) * halfSize * 0.7;
        
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, halfSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case FIREWORK_SHAPES.STARBURST:
      // Create starburst firework with bright center explosion
      const burstGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      burstGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      burstGradient.addColorStop(0.1, brightColor);
      burstGradient.addColorStop(0.4, coreColor);
      burstGradient.addColorStop(0.7, glowColor);
      burstGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw glow
      ctx.fillStyle = burstGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw spiky starburst
      const spikeCount = 16;
      ctx.fillStyle = brightColor;
      ctx.beginPath();
      
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2;
        const spikeOuterRadius = halfSize * (0.8 + Math.random() * 0.4);
        const spikeInnerRadius = halfSize * 0.2;
        
        // Create spike
        const spikeAngle1 = angle - 0.2;
        const spikeAngle2 = angle + 0.2;
        
        const outerX1 = x + Math.cos(spikeAngle1) * spikeInnerRadius;
        const outerY1 = y + Math.sin(spikeAngle1) * spikeInnerRadius;
        
        const tipX = x + Math.cos(angle) * spikeOuterRadius;
        const tipY = y + Math.sin(angle) * spikeOuterRadius;
        
        const outerX2 = x + Math.cos(spikeAngle2) * spikeInnerRadius;
        const outerY2 = y + Math.sin(spikeAngle2) * spikeInnerRadius;
        
        if (i === 0) {
          ctx.moveTo(outerX1, outerY1);
        } else {
          ctx.lineTo(outerX1, outerY1);
        }
        
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(outerX2, outerY2);
      }
      
      ctx.closePath();
      ctx.fill();
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.SPIRAL:
      // Create spiral firework with bright spinning trails
      const spiralGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      spiralGradient.addColorStop(0, brightColor);
      spiralGradient.addColorStop(0.4, coreColor);
      spiralGradient.addColorStop(0.7, glowColor);
      spiralGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw glow
      ctx.fillStyle = spiralGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw spiral arms
      const armCount = 3;
      const rotations = 2;
      
      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = (arm / armCount) * Math.PI * 2;
        
        ctx.strokeStyle = brightColor;
        ctx.lineWidth = halfSize * 0.2;
        ctx.beginPath();
        
        for (let i = 0; i <= 100; i++) {
          const t = i / 100;
          const radius = t * halfSize;
          const angle = armOffset + t * Math.PI * 2 * rotations;
          
          const pointX = x + Math.cos(angle) * radius;
          const pointY = y + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(pointX, pointY);
          } else {
            ctx.lineTo(pointX, pointY);
          }
        }
        
        ctx.stroke();
      }
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.COMET:
      // Create comet-shaped firework with bright trail
      // Main body gradient
      const cometGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, halfSize
      );
      
      cometGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      cometGradient.addColorStop(0.3, brightColor);
      cometGradient.addColorStop(0.7, coreColor);
      cometGradient.addColorStop(1, baseColor);
      
      // Draw the head
      ctx.fillStyle = cometGradient;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw the tail
      const tailLength = size * 2;
      const tailAngle = Math.PI * 1.5; // Pointing downward
      
      const tailGradient = ctx.createLinearGradient(
        x, y,
        x + Math.cos(tailAngle) * tailLength,
        y + Math.sin(tailAngle) * tailLength
      );
      
      tailGradient.addColorStop(0, baseColor);
      tailGradient.addColorStop(0.3, glowColor);
      tailGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = tailGradient;
      ctx.beginPath();
      ctx.moveTo(
        x + Math.cos(tailAngle - Math.PI/2) * halfSize/2,
        y + Math.sin(tailAngle - Math.PI/2) * halfSize/2
      );
      ctx.lineTo(
        x + Math.cos(tailAngle) * tailLength,
        y + Math.sin(tailAngle) * tailLength
      );
      ctx.lineTo(
        x + Math.cos(tailAngle + Math.PI/2) * halfSize/2,
        y + Math.sin(tailAngle + Math.PI/2) * halfSize/2
      );
      
      ctx.closePath();
      ctx.fill();
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.CRACKLE:
      // Create crackle effect with small bright explosions
      // Base glow
      const crackleGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      crackleGradient.addColorStop(0, brightColor);
      crackleGradient.addColorStop(0.4, baseColor);
      crackleGradient.addColorStop(0.7, glowColor);
      crackleGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = crackleGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add random bright crackles
      const crackleCount = Math.max(15, size * 3);
      
      for (let i = 0; i < crackleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * halfSize * 0.9;
        const crackleX = x + Math.cos(angle) * distance;
        const crackleY = y + Math.sin(angle) * distance;
        
        // Size varies
        const crackleSize = size * (0.05 + Math.random() * 0.15);
        
        // Draw small bright explosion
        const smallGradient = ctx.createRadialGradient(
          crackleX, crackleY, 0,
          crackleX, crackleY, crackleSize * 2
        );
        
        smallGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        smallGradient.addColorStop(0.5, brightColor);
        smallGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = smallGradient;
        ctx.beginPath();
        ctx.arc(crackleX, crackleY, crackleSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add small lines radiating out for each crackle
        const lineCount = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        
        for (let j = 0; j < lineCount; j++) {
          const lineAngle = (j / lineCount) * Math.PI * 2;
          const lineLength = crackleSize * (1 + Math.random());
          
          ctx.beginPath();
          ctx.moveTo(crackleX, crackleY);
          ctx.lineTo(
            crackleX + Math.cos(lineAngle) * lineLength,
            crackleY + Math.sin(lineAngle) * lineLength
          );
          ctx.stroke();
        }
      }
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case FIREWORK_SHAPES.EXPLOSION:
      // Create explosion effect with bright center and flying particles
      // Create bright explosion gradient
      const explosionGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      explosionGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      explosionGradient.addColorStop(0.1, brightColor);
      explosionGradient.addColorStop(0.5, baseColor);
      explosionGradient.addColorStop(0.8, glowColor);
      explosionGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Draw main explosion glow
      ctx.fillStyle = explosionGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Add explosion particles flying outward
      const particleCount = Math.max(10, size * 2);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = halfSize * (0.6 + Math.random() * 0.6);
        const particleX = x + Math.cos(angle) * distance;
        const particleY = y + Math.sin(angle) * distance;
        
        // Draw particle with trail
        const trailLength = halfSize * (0.2 + Math.random() * 0.4);
        const trailWidth = halfSize * 0.1;
        
        // Draw trail
        const trailGradient = ctx.createLinearGradient(
          particleX, particleY,
          particleX - Math.cos(angle) * trailLength,
          particleY - Math.sin(angle) * trailLength
        );
        
        trailGradient.addColorStop(0, brightColor);
        trailGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = trailGradient;
        
        // Draw tapered trail
        ctx.beginPath();
        ctx.moveTo(particleX, particleY);
        ctx.lineTo(
          particleX - Math.cos(angle - Math.PI/4) * trailWidth,
          particleY - Math.sin(angle - Math.PI/4) * trailWidth
        );
        ctx.lineTo(
          particleX - Math.cos(angle) * trailLength,
          particleY - Math.sin(angle) * trailLength
        );
        ctx.lineTo(
          particleX - Math.cos(angle + Math.PI/4) * trailWidth,
          particleY - Math.sin(angle + Math.PI/4) * trailWidth
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw bright particle head
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(particleX, particleY, halfSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case FIREWORK_SHAPES.TRAIL:
      // Create trail firework with bright streaks
      // Base glow
      const trailGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      trailGradient.addColorStop(0, brightColor);
      trailGradient.addColorStop(0.4, baseColor);
      trailGradient.addColorStop(0.7, glowColor);
      trailGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = trailGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      
      // Add trailing streaks
      const streakCount = Math.max(12, size);
      
      for (let i = 0; i < streakCount; i++) {
        const angle = (i / streakCount) * Math.PI * 2;
        const length = halfSize * (0.7 + Math.random() * 0.6);
        
        // Create tapered trail gradient
        const streakGradient = ctx.createLinearGradient(
          x, y,
          x + Math.cos(angle) * length,
          y + Math.sin(angle) * length
        );
        
        streakGradient.addColorStop(0, brightColor);
        streakGradient.addColorStop(0.3, baseColor);
        streakGradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = streakGradient;
        
        // Draw streak
        const width = halfSize * (0.1 + Math.random() * 0.1);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, -width/2);
        ctx.lineTo(length, -width/6);
        ctx.lineTo(length, width/6);
        ctx.lineTo(0, width/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    default:
      // Default to simple circle with glow
      const defaultGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, glowSize
      );
      
      defaultGradient.addColorStop(0, brightColor);
      defaultGradient.addColorStop(0.4, baseColor);
      defaultGradient.addColorStop(0.7, glowColor);
      defaultGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = defaultGradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add bright center
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(x, y, halfSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
  }
  
  ctx.restore();
}

function drawStar(ctx, x, y, outerRadius, innerRadius, points) {
  ctx.beginPath();
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  }
  
  ctx.closePath();
}

function drawBrightFireworkBurst(ctx, cx, cy, size) {
  // Enhanced burst with bright and dynamic appearance
  const numPoints = Math.max(12, Math.floor(size / 2)); // More points for larger bursts
  const baseRadius = size * 0.75;
  
  ctx.beginPath();
  
  // Create more complex, irregular burst shape
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More varied radius for realistic burst
    // Use multiple sinusoids for complex natural shapes
    const variations = 0.65 + 
                      Math.sin(i * 4) * 0.15 + 
                      Math.cos(i * 7) * 0.15 + 
                      Math.sin(i * 11) * 0.07 +
                      Math.random() * 0.2;
                      
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
}

function createBrightFireworks(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate optimal distribution based on canvas size
  const screenArea = width * height;
  const averageSize = Math.sqrt(screenArea / fireworkCount) * 0.15;
  
  // Distribution factors for more balanced appearance
  const sizeFactor = Math.min(width, height) / 400; // Scale based on screen size
  
  // Prepare arrays for sizing distribution
  const typeDistribution = [];
  let totalWeight = 0;
  
  // Build weighted distribution based on firework types
  typeDistribution.push({ type: FIREWORK_TYPES.TRADITIONAL, weight: 40, cumulative: 0 });
  typeDistribution.push({ type: FIREWORK_TYPES.CHRYSANTHEMUM, weight: 25, cumulative: 0 });
  typeDistribution.push({ type: FIREWORK_TYPES.WILLOW, weight: 15, cumulative: 0 });
  typeDistribution.push({ type: FIREWORK_TYPES.PEONY, weight: 10, cumulative: 0 });
  typeDistribution.push({ type: FIREWORK_TYPES.ROCKET, weight: 7, cumulative: 0 });
  typeDistribution.push({ type: FIREWORK_TYPES.SPARKLER, weight: 3, cumulative: 0 });
  
  // Calculate cumulative weights
  for (let i = 0; i < typeDistribution.length; i++) {
    totalWeight += typeDistribution[i].weight;
    typeDistribution[i].cumulative = totalWeight;
  }
  
  // Create bright firework pieces with glowing effects
  for (let i = 0; i < fireworkCount; i++) {
    // Determine firework type using weighted distribution
    const randomValue = Math.random() * totalWeight;
    let type;
    
    for (let j = 0; j < typeDistribution.length; j++) {
      if (randomValue <= typeDistribution[j].cumulative) {
        type = typeDistribution[j].type;
        break;
      }
    }
    
    // Determine size, lifespan, shape based on type
    let size, lifespan, shape;
    
    switch (type) {
      case FIREWORK_TYPES.TRADITIONAL:
        // Traditional firework - large starbursts
        size = (5 + Math.random() * 12) * sizeFactor;
        lifespan = 0.75 + Math.random() * 0.25;
        
        if (Math.random() < 0.4) {
          shape = FIREWORK_SHAPES.STAR;
        } else if (Math.random() < 0.6) {
          shape = FIREWORK_SHAPES.EXPLOSION;
        } else if (Math.random() < 0.8) {
          shape = FIREWORK_SHAPES.STARBURST;
        } else {
          shape = FIREWORK_SHAPES.CIRCLE;
        }
        break;
        
      case FIREWORK_TYPES.CHRYSANTHEMUM:
        // Chrysanthemum firework - dense patterns
        size = (4 + Math.random() * 10) * sizeFactor;
        lifespan = 0.7 + Math.random() * 0.3;
        
        if (Math.random() < 0.3) {
          shape = FIREWORK_SHAPES.GLITTER;
        } else if (Math.random() < 0.6) {
          shape = FIREWORK_SHAPES.TRAIL;
        } else if (Math.random() < 0.8) {
          shape = FIREWORK_SHAPES.RING;
        } else {
          shape = FIREWORK_SHAPES.SPIRAL;
        }
        break;
        
      case FIREWORK_TYPES.WILLOW:
        // Willow firework - trailing effects
        size = (5 + Math.random() * 8) * sizeFactor;
        lifespan = 0.65 + Math.random() * 0.35;
        
        if (Math.random() < 0.5) {
          shape = FIREWORK_SHAPES.TRAIL;
        } else if (Math.random() < 0.8) {
          shape = FIREWORK_SHAPES.SPARKLE;
        } else {
          shape = FIREWORK_SHAPES.COMET;
        }
        break;
        
      case FIREWORK_TYPES.PEONY:
        // Peony firework - large spherical bursts
        size = (6 + Math.random() * 14) * sizeFactor;
        lifespan = 0.8 + Math.random() * 0.2;
        
        if (Math.random() < 0.6) {
          shape = FIREWORK_SHAPES.CIRCLE;
        } else if (Math.random() < 0.9) {
          shape = FIREWORK_SHAPES.GLITTER;
        } else {
          shape = FIREWORK_SHAPES.STARBURST;
        }
        break;
        
      case FIREWORK_TYPES.ROCKET:
        // Rocket - fast, with trailing comets
        size = (3 + Math.random() * 8) * sizeFactor;
        lifespan = 0.5 + Math.random() * 0.3;
        
        if (Math.random() < 0.7) {
          shape = FIREWORK_SHAPES.COMET;
        } else {
          shape = FIREWORK_SHAPES.TRAIL;
        }
        break;
        
      case FIREWORK_TYPES.SPARKLER:
        // Sparkler - small, bright sparks
        size = (2 + Math.random() * 6) * sizeFactor;
        lifespan = 0.4 + Math.random() * 0.4;
        
        if (Math.random() < 0.5) {
          shape = FIREWORK_SHAPES.SPARKLE;
        } else if (Math.random() < 0.8) {
          shape = FIREWORK_SHAPES.GLITTER;
        } else {
          shape = FIREWORK_SHAPES.CRACKLE;
        }
        break;
        
      default:
        // Generic fallback
        size = (4 + Math.random() * 8) * sizeFactor;
        lifespan = 0.65 + Math.random() * 0.35;
        shape = Math.random() < 0.5 ? FIREWORK_SHAPES.CIRCLE : FIREWORK_SHAPES.STAR;
    }
    
    // Select vibrant color
    let colorIndex = Math.floor(Math.random() * FIREWORK_COLORS.length);
    let color = FIREWORK_COLORS[colorIndex];
    
    // Add slight color variation for realism
    const colorVariation = 30;
    const variedColor = {
      r: Math.max(0, Math.min(255, color.r + (Math.random() - 0.5) * colorVariation)),
      g: Math.max(0, Math.min(255, color.g + (Math.random() - 0.5) * colorVariation)),
      b: Math.max(0, Math.min(255, color.b + (Math.random() - 0.5) * colorVariation)),
      a: color.a
    };
    
    // Distribute fireworks with improved explosion pattern
    // Use golden ratio for more natural distribution
    const goldenRatio = 1.618033988749895;
    const angle = i * goldenRatio * Math.PI * 2;
    
    // Randomize distance from center with normal-like distribution
    // Using Box-Muller transform for normal distribution
    let radius = 10;
    if (i > 0) {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      
      // Scale to desired radius with emphasis on outward explosion
      radius = Math.abs(z) * 25 + 15;
    }
    
    // Add variation based on position in sequence
    const normalizedIndex = i / fireworkCount;
    if (normalizedIndex < 0.2) {
      // First 20% - closer to center
      radius *= 0.5;
    } else if (normalizedIndex > 0.8) {
      // Last 20% - further from center
      radius *= 1.5;
    }
    
    // Calculate velocity based on distance from center
    const speed = 5 + radius/3 + Math.random() * 15;
    
    // Initial position (around center with small variation)
    const x = centerX + (Math.random() - 0.5) * 40;
    const y = centerY + (Math.random() - 0.5) * 40;
    
    // Physics variations for more natural movement
    const gravity = 0.15 + Math.random() * 0.15;
    const drag = 0.01 + Math.random() * 0.03;
    
    // Create the firework piece with enhanced properties
    fireworks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: variedColor,
      type,
      shape,
      opacity: 1.0,
      lifespan,
      gravity,
      drag,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      fadeOutFactor: Math.random() * 0.3,
      delay: Math.random() * 0.2,
      bounceCount: 0,
      maxBounces: Math.floor(Math.random() * 3),
      elasticity: 0.3 + Math.random() * 0.4,
      
      // Enhanced glow properties
      glowIntensity: 0.7 + Math.random() * 0.3,
      glowSize: 1.5 + Math.random() * 2,
      pulsateSpeed: 0.1 + Math.random() * 0.2,
      pulsatePhase: Math.random() * Math.PI * 2,
      
      // Dynamic animation properties
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.1,
      wobbleAmount: 0.05 + Math.random() * 0.1,
      rotationWobble: 0.05 + Math.random() * 0.1,
      
      // Trails for smoother animation
      trail: [],
      maxTrailLength: renderQuality === 'ultra' ? 15 : (renderQuality === 'high' ? 10 : (renderQuality === 'medium' ? 5 : 2)),
      trailOpacity: 0.5,
      
      // Add spin effects
      spinAxis: {
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        z: Math.random() - 0.5
      },
      spinVelocity: Math.random() * 0.2,
      
      // Add color change properties
      colorCycle: Math.random() < 0.3, // 30% chance to have color cycling
      colorCycleSpeed: 0.02 + Math.random() * 0.05,
      colorCyclePhase: Math.random() * Math.PI * 2,
      
      // Sparkles that emit from the firework
      emitSparkles: Math.random() < 0.4, // 40% chance to emit sparkles
      nextSparkleEmit: 0,
      sparkleEmitInterval: 5 + Math.floor(Math.random() * 10),
      sparklesEmitted: 0,
      maxSparklesEmitted: 10 + Math.floor(Math.random() * 30)
    });
  }
  
  // Create initial firework bursts
  for (let i = 0; i < (renderQuality === 'low' ? 5 : 10); i++) {
    addBrightFireworkBurst(
      centerX + (Math.random() - 0.5) * width * 0.7,
      centerY + (Math.random() - 0.5) * height * 0.7,
      10 + Math.random() * 40,
      0.2 + Math.random() * 0.3
    );
  }
  
  // Add sparkles for visual effect
  if (renderQuality !== 'low') {
    createSparkles(centerX, centerY, Math.min(width, height) * 0.3);
  }
}

function addBrightFireworkBurst(x, y, size, delay) {
  // Select color with vibrant variation
  const colorIndex = Math.floor(Math.random() * FIREWORK_COLORS.length);
  const color = FIREWORK_COLORS[colorIndex];
  
  // Add color variation for realism
  const colorVariation = 20;
  const variedColor = {
    r: Math.max(0, Math.min(255, color.r + (Math.random() - 0.5) * colorVariation)),
    g: Math.max(0, Math.min(255, color.g + (Math.random() - 0.5) * colorVariation)),
    b: Math.max(0, Math.min(255, color.b + (Math.random() - 0.5) * colorVariation)),
    a: color.a
  };
  
  // Choose texture pattern for this burst
  const texturePatterns = Object.values(TEXTURE_PATTERNS);
  const texture = texturePatterns[Math.floor(Math.random() * texturePatterns.length)];
  
  // Sound effect type
  const soundType = Math.random() < 0.5 ? 'boom' : (Math.random() < 0.5 ? 'crackle' : 'whistle');
  
  fireworkSplats.push({
    x,
    y,
    size,
    targetSize: size,
    currentSize: 0,
    color: variedColor,
    opacity: 0,
    targetOpacity: 0.9 + Math.random() * 0.1,
    created: performance.now(),
    delay,
    growthRate: 0.15 + Math.random() * 0.1,
    
    // Enhanced glow properties
    glowIntensity: 0.7 + Math.random() * 0.3,
    pulsateSpeed: 0.05 + Math.random() * 0.1,
    pulsatePhase: Math.random() * Math.PI * 2,
    wobbleFrequency: 2 + Math.random() * 3,
    
    // Added texture pattern
    texture,
    textureScale: 0.5 + Math.random() * 0.5,
    
    // Add particles around burst
    hasParticles: Math.random() < 0.8,
    particleCount: Math.floor(Math.random() * 15) + 5,
    
    // Add expansion effect
    expansionPhase: Math.random() * Math.PI * 2,
    expansionFrequency: 1 + Math.random() * 2,
    expansionAmplitude: 0.05 + Math.random() * 0.15,
    
    // Sound effect type (for future audio integration)
    soundType,
    
    // Color cycling
    colorCycle: Math.random() < 0.2, // 20% chance to have color cycling
    colorCycleSpeed: 0.02 + Math.random() * 0.05,
    colorCyclePhase: Math.random() * Math.PI * 2,
    
    // Emit additional sparkles
    emitSparkles: Math.random() < 0.5,
    nextSparkleTime: 0,
    sparkleInterval: 100 + Math.random() * 200
  });
}

function drawBrightFireworkBursts(ctx, deltaTime) {
  for (let i = 0; i < fireworkSplats.length; i++) {
    const burst = fireworkSplats[i];
    const elapsed = (performance.now() - burst.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < burst.delay) continue;
    
    // Grow the burst with improved animation curve
    const growthProgress = Math.min(1, elapsed * burst.growthRate * 2);
    // Use ease-out cubic for more natural growth
    const easedGrowth = 1 - Math.pow(1 - growthProgress, 3);
    
    burst.currentSize = burst.targetSize * easedGrowth;
    
    // Fade in with smoother curve
    burst.opacity = Math.min(burst.targetOpacity, easedGrowth * burst.targetOpacity);
    
    // Optional expansion effect
    burst.expansionPhase += deltaTime * 0.02 * burst.expansionFrequency;
    
    // Update color cycle if enabled
    if (burst.colorCycle) {
      burst.colorCyclePhase += deltaTime * burst.colorCycleSpeed;
      
      // Create cycling color
      const hue = (burst.colorCyclePhase) % 1;
      const cycledColor = shaderFx.hslToRgb(hue, 0.9, 0.6);
      
      // Smoothly blend between original and cycled color
      const blendFactor = 0.7; // How much of the cycled color to use
      burst.color = {
        r: Math.round(burst.color.r * (1 - blendFactor) + cycledColor.r * blendFactor),
        g: Math.round(burst.color.g * (1 - blendFactor) + cycledColor.g * blendFactor),
        b: Math.round(burst.color.b * (1 - blendFactor) + cycledColor.b * blendFactor),
        a: burst.color.a
      };
    }
    
    // Add sparkles occasionally
    if (burst.emitSparkles && elapsed > 0.1 && performance.now() > burst.nextSparkleTime) {
      // Add 1-3 sparkles
      const sparkleCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < sparkleCount; j++) {
        // Random position around the burst edge
        const angle = Math.random() * Math.PI * 2;
        const distance = burst.currentSize * (0.8 + Math.random() * 0.3);
        const sparkleX = burst.x + Math.cos(angle) * distance;
        const sparkleY = burst.y + Math.sin(angle) * distance;
        
        // Create a sparkle with random size
        addSparkle(
          sparkleX, 
          sparkleY,
          1 + Math.random() * 3,
          0.5 + Math.random() * 0.5,
          burst.color
        );
      }
      
      // Schedule next sparkle
      burst.nextSparkleTime = performance.now() + burst.sparkleInterval;
    }
    
    // Draw glowing burst with enhanced effects
    ctx.save();
    ctx.globalAlpha = burst.opacity;
    
    // Create rich gradient for the burst with enhanced glow effect
    const r = burst.color.r, g = burst.color.g, b = burst.color.b;
    const baseColor = `rgb(${r},${g},${b})`;
    const brightColor = `rgb(${Math.min(255, r+80)},${Math.min(255, g+80)},${Math.min(255, b+80)})`;
    const glowColor = `rgba(${r},${g},${b},0.7)`;
    const outerGlowColor = `rgba(${r},${g},${b},0)`;
    
    // Add subtle shadow first for depth
    if (renderQuality !== 'low') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      drawBrightFireworkBurst(ctx, burst.x + 1, burst.y + 1, burst.currentSize * 1.02);
    }
    
    // Create rich gradient for the burst with glow effect
    const burstGradient = ctx.createRadialGradient(
      burst.x, burst.y, 0,
      burst.x, burst.y, burst.currentSize
    );
    
    // Pulsate intensity based on phase
    const pulsate = 0.2 * Math.sin(burst.pulsatePhase);
    burst.pulsatePhase += burst.pulsateSpeed * deltaTime;
    
    // Adjust glow intensity with pulsation
    const adjustedIntensity = Math.max(0.5, Math.min(1, burst.glowIntensity + pulsate));
    
    burstGradient.addColorStop(0, brightColor);
    burstGradient.addColorStop(0.4, baseColor);
    burstGradient.addColorStop(0.7, glowColor);
    burstGradient.addColorStop(1, outerGlowColor);
    
    ctx.fillStyle = burstGradient;
    
    // Draw firework burst with expansion effect
    const expansionEffect = burst.expansionAmplitude * Math.sin(burst.expansionPhase);
    drawBrightFireworkBurst(ctx, burst.x, burst.y, burst.currentSize * (1 + expansionEffect));
    
    // Add texture to the burst based on the assigned pattern
    if ((renderQuality === 'high' || renderQuality === 'ultra') && burst.currentSize > 10) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3 * adjustedIntensity;
      
      // Create clip region
      ctx.beginPath();
      drawBrightFireworkBurst(ctx, burst.x, burst.y, burst.currentSize * 0.98);
      ctx.clip();
      
      // Apply texture from cache if available
      const textureKey = `pattern_${burst.texture}`;
      if (textureCache[textureKey]) {
        ctx.drawImage(
          textureCache[textureKey],
          burst.x - burst.currentSize,
          burst.y - burst.currentSize,
          burst.currentSize * 2,
          burst.currentSize * 2
        );
      }
      
      ctx.restore();
    }
    
    // Add bright highlights with glow effect
    const shineGradient = ctx.createRadialGradient(
      burst.x, burst.y, 0, 
      burst.x, burst.y, burst.currentSize*0.6
    );
    shineGradient.addColorStop(0, `rgba(255,255,255,${0.9 * adjustedIntensity})`);
    shineGradient.addColorStop(0.3, `rgba(255,255,255,${0.5 * adjustedIntensity})`);
    shineGradient.addColorStop(0.7, `rgba(255,255,255,0)`);
    
    ctx.fillStyle = shineGradient;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.currentSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Add secondary highlights (sparkles) for enhanced glow effect
    if (renderQuality !== 'low') {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      
      // Add more highlights for higher quality
      const highlightCount = renderQuality === 'ultra' ? 8 : 5;
      
      for (let j = 0; j < highlightCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = burst.currentSize * (0.3 + Math.random() * 0.4);
        const x = burst.x + Math.cos(angle) * dist;
        const y = burst.y + Math.sin(angle) * dist;
        const bubbleSize = burst.currentSize * (0.05 + Math.random() * 0.1);
        
        ctx.beginPath();
        ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Add radiating lines for starburst effect
    if (renderQuality === 'high' || renderQuality === 'ultra') {
      ctx.strokeStyle = brightColor;
      ctx.lineWidth = Math.max(1, burst.currentSize * 0.02);
      ctx.globalAlpha = 0.7 * burst.opacity * adjustedIntensity;
      
      // Add rays - more for higher quality
      const rayCount = renderQuality === 'ultra' ? 24 : 16;
      
      for (let j = 0; j < rayCount; j++) {
        const angle = (j / rayCount) * Math.PI * 2;
        const innerRadius = burst.currentSize * 0.2;
        const outerRadius = burst.currentSize * (0.9 + Math.random() * 0.2);
        
        const startX = burst.x + Math.cos(angle) * innerRadius;
        const startY = burst.y + Math.sin(angle) * innerRadius;
        const endX = burst.x + Math.cos(angle) * outerRadius;
        const endY = burst.y + Math.sin(angle) * outerRadius;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    
    // Add tiny particles/embers around the burst for extra realism
    if (burst.hasParticles && (renderQuality === 'high' || renderQuality === 'ultra')) {
      ctx.fillStyle = brightColor;
      ctx.globalAlpha = burst.opacity * 0.9;
      
      for (let j = 0; j < burst.particleCount; j++) {
        const partAngle = Math.random() * Math.PI * 2;
        const partDist = burst.currentSize * (1.0 + Math.random() * 0.3);
        const partX = burst.x + Math.cos(partAngle) * partDist;
        const partY = burst.y + Math.sin(partAngle) * partDist;
        const partSize = burst.currentSize * (0.02 + Math.random() * 0.04);
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(partX, partY, partSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add tiny glow to particle
        const particleGlow = ctx.createRadialGradient(
          partX, partY, 0,
          partX, partY, partSize * 3
        );
        particleGlow.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        particleGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        
        ctx.fillStyle = particleGlow;
        ctx.beginPath();
        ctx.arc(partX, partY, partSize * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset fill style
        ctx.fillStyle = brightColor;
      }
    }
    
    // Add lens flare effect for ultra quality
    if (renderQuality === 'ultra') {
      // Create a few lens flare artifacts
      ctx.globalCompositeOperation = 'screen';
      
      // Main flare
      const flareGradient = ctx.createRadialGradient(
        burst.x, burst.y, 0,
        burst.x, burst.y, burst.currentSize * 0.5
      );
      
      flareGradient.addColorStop(0, `rgba(255,255,255,${0.4 * adjustedIntensity})`);
      flareGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.2 * adjustedIntensity})`);
      flareGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = flareGradient;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, burst.currentSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Horizontal flare streak
      const streakGradient = ctx.createLinearGradient(
        burst.x - burst.currentSize * 2, burst.y,
        burst.x + burst.currentSize * 2, burst.y
      );
      
      streakGradient.addColorStop(0, 'rgba(0,0,0,0)');
      streakGradient.addColorStop(0.4, `rgba(${r},${g},${b},${0.05 * adjustedIntensity})`);
      streakGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.2 * adjustedIntensity})`);
      streakGradient.addColorStop(0.6, `rgba(${r},${g},${b},${0.05 * adjustedIntensity})`);
      streakGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = streakGradient;
      ctx.fillRect(
        burst.x - burst.currentSize * 2,
        burst.y - burst.currentSize * 0.1,
        burst.currentSize * 4,
        burst.currentSize * 0.2
      );
    }
    
    ctx.restore();
  }
}

function createSparkles(centerX, centerY, radius) {
  // Create sparkles for visual effect
  const sparkleCount = renderQuality === 'ultra' ? 60 : 
                     renderQuality === 'high' ? 40 :
                     renderQuality === 'medium' ? 20 : 10;
                     
  for (let i = 0; i < sparkleCount; i++) {
    // Distribute sparkles in a circular pattern with some randomization
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.8;
    
    // Select color from firework palette
    const colorIndex = Math.floor(Math.random() * FIREWORK_COLORS.length);
    const color = FIREWORK_COLORS[colorIndex];
    
    // Add sparkle with size variation
    addSparkle(
      centerX + Math.cos(angle) * distance,
      centerY + Math.sin(angle) * distance,
      1 + Math.random() * 4,
      0.3 + Math.random() * 0.7,
      color
    );
  }
}

function addSparkle(x, y, size, lifetime, color) {
  fireworkSparkles.push({
    x,
    y,
    size,
    maxSize: size,
    color,
    opacity: 0.1 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    speed: 0.05 + Math.random() * 0.1,
    direction: {
      x: (Math.random() - 0.5) * 0.7,
      y: -0.2 - Math.random() * 0.5 // Upward bias
    },
    wobble: {
      amount: Math.random() * 0.5,
      speed: 0.05 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2
    },
    lifetime: lifetime, // Seconds
    age: 0,
    pulsate: Math.random() < 0.7, // 70% chance to pulsate
    twinkle: {
      enabled: Math.random() < 0.5, // 50% chance to twinkle
      speed: 0.1 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      intensity: 0.3 + Math.random() * 0.7
    }
  });
}

function drawSparkles(ctx, deltaTime, progress) {
  const deadSparkles = [];
  
  for (let i = 0; i < fireworkSparkles.length; i++) {
    const sparkle = fireworkSparkles[i];
    
    // Update age
    sparkle.age += deltaTime * 0.016;
    
    // Check if sparkle should die based on lifetime
    if (sparkle.age > sparkle.lifetime) {
      deadSparkles.push(i);
      continue;
    }
    
    // Update phases
    sparkle.phase += sparkle.speed * deltaTime;
    sparkle.wobble.phase += sparkle.wobble.speed * deltaTime;
    if (sparkle.twinkle.enabled) {
      sparkle.twinkle.phase += sparkle.twinkle.speed * deltaTime;
    }
    
    const wobbleX = Math.cos(sparkle.wobble.phase) * sparkle.wobble.amount;
    const wobbleY = Math.sin(sparkle.wobble.phase * 1.3) * sparkle.wobble.amount;
    
    sparkle.x += (sparkle.direction.x + wobbleX) * deltaTime;
    sparkle.y += (sparkle.direction.y + wobbleY) * deltaTime;
    
    // Calculate opacity based on age (fade in/out)
    const lifeProgress = sparkle.age / sparkle.lifetime;
    let currentOpacity = sparkle.opacity;
    
    // Fade in quickly, then fade out more slowly
    if (lifeProgress < 0.1) {
      // Quick fade in
      currentOpacity = sparkle.opacity * (lifeProgress / 0.1);
    } else if (lifeProgress > 0.7) {
      // Slow fade out
      currentOpacity = sparkle.opacity * (1 - (lifeProgress - 0.7) / 0.3);
    }
    
    // Apply twinkle effect if enabled
    if (sparkle.twinkle.enabled) {
      const twinkleFactor = Math.pow(Math.sin(sparkle.twinkle.phase) * 0.5 + 0.5, 2) * sparkle.twinkle.intensity;
      currentOpacity *= 0.3 + twinkleFactor * 0.7;
    }
    
    // Calculate current size - pulsate if enabled
    let currentSize = sparkle.size;
    if (sparkle.pulsate) {
      const pulseFactor = 0.2 * Math.sin(sparkle.phase * 3);
      currentSize = sparkle.size * (1 + pulseFactor);
    }
    
    // Draw sparkle
    ctx.save();
    
    // Create rich sparkle gradient with glow
    const r = sparkle.color.r;
    const g = sparkle.color.g;
    const b = sparkle.color.b;
    
    const sparkleGradient = ctx.createRadialGradient(
      sparkle.x, sparkle.y, 0,
      sparkle.x, sparkle.y, currentSize * 3
    );
    
    // Create glow effect
    sparkleGradient.addColorStop(0, `rgba(255,255,255,${currentOpacity})`);
    sparkleGradient.addColorStop(0.3, `rgba(${r},${g},${b},${currentOpacity * 0.7})`);
    sparkleGradient.addColorStop(0.7, `rgba(${r},${g},${b},${currentOpacity * 0.3})`);
    sparkleGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    
    ctx.fillStyle = sparkleGradient;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, currentSize * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bright center
    ctx.fillStyle = `rgba(255,255,255,${currentOpacity * 0.9})`;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, currentSize * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // For higher quality, add star shape for some sparkles
    if ((renderQuality === 'high' || renderQuality === 'ultra') && currentSize > 2) {
      const starPoints = 4 + Math.floor(Math.random() * 3);
      
      ctx.fillStyle = `rgba(255,255,255,${currentOpacity * 0.8})`;
      ctx.beginPath();
      
      for (let j = 0; j < starPoints * 2; j++) {
        const radius = j % 2 === 0 ? currentSize * 1.5 : currentSize * 0.7;
        const angle = (j / (starPoints * 2)) * Math.PI * 2 + sparkle.phase;
        
        const pointX = sparkle.x + Math.cos(angle) * radius;
        const pointY = sparkle.y + Math.sin(angle) * radius;
        
        if (j === 0) {
          ctx.moveTo(pointX, pointY);
        } else {
          ctx.lineTo(pointX, pointY);
        }
      }
      
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  // Remove dead sparkles
  for (let i = deadSparkles.length - 1; i >= 0; i--) {
    fireworkSparkles.splice(deadSparkles[i], 1);
  }
  
  // Add new sparkles occasionally
  if (Math.random() < 0.08 * deltaTime && progress < 0.7 && 
      fireworkSparkles.length < (renderQuality === 'ultra' ? 100 : 60)) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    createSparkles(width/2, height/2, Math.min(width, height) * 0.3);
  }
}

function drawDynamicFireworkTrails(ctx, width, height, progress, deltaTime) {
  // Process existing trails
  const deadTrails = [];
  
  for (let i = 0; i < fireworkTrails.length; i++) {
    const trail = fireworkTrails[i];
    
    // Update trail state
    trail.age += deltaTime * 0.06;
    
    // Update phase for wobble and animation
    trail.phase += trail.speed * deltaTime;
    
    // Update trail length based on age
    const lengthProgress = Math.min(1, trail.age / trail.growTime);
    trail.currentLength = trail.maxLength * easeOutCubic(lengthProgress);
    
    // Apply gravity to the trail
    if (trail.age > trail.growTime) {
      // Trail stretching and possible breaking
      trail.stretch += trail.gravity * deltaTime;
      trail.currentLength *= (1 + trail.stretch * 0.1);
      
      // Check if trail should fade out
      if (trail.stretch > trail.breakThreshold) {
        // Create a sparkle where the trail breaks
        addSparkleCluster(trail);
        deadTrails.push(i);
        continue;
      }
    }
    
    // Apply fading at end of lifetime
    if (trail.age > trail.lifetime * 0.7) {
      const fadeProgress = (trail.age - trail.lifetime * 0.7) / (trail.lifetime * 0.3);
      trail.opacity = Math.max(0, 1 - fadeProgress);
      
      if (trail.opacity <= 0.02) {
        deadTrails.push(i);
        continue;
      }
    }
    
    // Draw trail
    drawSingleTrail(ctx, trail);
  }
  
  // Remove dead trails
  for (let i = deadTrails.length - 1; i >= 0; i--) {
    fireworkTrails.splice(deadTrails[i], 1);
  }
  
  // Possibly add new trails
  if (progress > 0.1 && progress < 0.8) {
    const trailProbability = 0.05 * deltaTime * (progress < 0.4 ? 2 : 1);
    
    // Limit total trail count based on quality
    const maxTrails = renderQuality === 'ultra' ? 30 : 
                    renderQuality === 'high' ? 20 :
                    renderQuality === 'medium' ? 15 : 8;
    
    if (Math.random() < trailProbability && fireworkTrails.length < maxTrails) {
      // Create new trail
      addNewTrail(ctx, width, height, progress);
    }
  }
}

function addNewTrail(ctx, width, height, progress) {
  // Place trail at strategic locations
  let x, y;
  
  if (Math.random() < 0.4) {
    // Place along bottom edge rising up
    x = width * (0.2 + Math.random() * 0.6);
    y = height * (0.7 + Math.random() * 0.25);
  } else {
    // Place around the explosion center
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(width, height) * 0.2 * (0.6 + Math.random() * 0.3);
    x = width/2 + Math.cos(angle) * distance;
    y = height/2 + Math.sin(angle) * distance;
  }
  
  // Select firework color with slight variation
  const colorIndex = Math.floor(Math.random() * FIREWORK_COLORS.length);
  const baseColor = FIREWORK_COLORS[colorIndex];
  
  // Add variation for realism
  const colorVar = 20;
  const color = {
    r: Math.max(0, Math.min(255, baseColor.r + (Math.random() - 0.5) * colorVar)),
    g: Math.max(0, Math.min(255, baseColor.g + (Math.random() - 0.5) * colorVar)),
    b: Math.max(0, Math.min(255, baseColor.b + (Math.random() - 0.5) * colorVar)),
    a: baseColor.a
  };
  
  // Create the trail with physics properties
  fireworkTrails.push({
    x,
    y,
    width: 3 + Math.random() * 6,
    maxLength: 50 + Math.random() * 150,
    currentLength: 0,
    color,
    direction: -Math.PI/2 + (Math.random() - 0.5) * 0.8, // Mostly upward
    age: 0,
    growTime: 0.5 + Math.random() * 1.0,
    lifetime: 1 + Math.random() * 2,
    opacity: 1.0,
    phase: Math.random() * Math.PI * 2,
    speed: 0.05 + Math.random() * 0.1,
    wobbleAmount: 0.1 + Math.random() * 0.2,
    wobbleFrequency: 3 + Math.random() * 5,
    gravity: 0.05 + Math.random() * 0.1,
    stretch: 0,
    breakThreshold: 0.5 + Math.random() * 0.5,
    // Bezier control points for curved path
    controlPoints: [
      { x: 0, y: 0.3 + Math.random() * 0.2 }, // First control point relative distance
      { x: 0, y: 0.6 + Math.random() * 0.3 }  // Second control point relative distance
    ],
    // Sparkle effects
    sparkleFrequency: 0.1 + Math.random() * 0.2,
    sparkleSize: 1 + Math.random() * 2,
    lastSparkleTime: 0,
    // Glow effect
    glowIntensity: 0.7 + Math.random() * 0.3,
    glowSize: 3 + Math.random() * 4,
    // Highlight properties
    highlights: [{
      offsetX: -0.3 + Math.random() * 0.1,
      offsetY: 0.1 + Math.random() * 0.3,
      width: 0.3 + Math.random() * 0.2,
      opacity: 0.4 + Math.random() * 0.6
    }],
    // Particle emission
    emitParticles: Math.random() < 0.7,
    particleFrequency: 0.1 + Math.random() * 0.2,
    lastParticleTime: 0
  });
}

function addSparkleCluster(trail) {
  // Create a cluster of sparkles where the trail breaks
  const sparkleX = trail.x + Math.cos(trail.direction) * trail.currentLength;
  const sparkleY = trail.y + Math.sin(trail.direction) * trail.currentLength;
  
  // Add multiple sparkles in a cluster
  const sparkleCount = 5 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < sparkleCount; i++) {
    // Create sparkle with trail color
    const sparkleSize = 1 + Math.random() * 2;
    const sparkleLifetime = 0.3 + Math.random() * 0.7;
    
    // Create at slightly offset positions
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    
    addSparkle(
      sparkleX + offsetX,
      sparkleY + offsetY,
      sparkleSize,
      sparkleLifetime,
      trail.color
    );
  }
}

function drawSingleTrail(ctx, trail) {
  ctx.save();
  
  // Set transparency
  ctx.globalAlpha = trail.opacity;
  
  // Create base color and derived colors
  const r = trail.color.r, g = trail.color.g, b = trail.color.b;
  const baseColor = `rgb(${r},${g},${b})`;
  const brightColor = `rgb(${Math.min(255, r+80)},${Math.min(255, g+80)},${Math.min(255, b+80)})`;
  const glowColor = `rgba(${r},${g},${b},0.8)`;
  
  // Calculate trail path with wobble
  const wobble = Math.sin(trail.phase * trail.wobbleFrequency) * trail.wobbleAmount;
  
  // Calculate the end point
  const endX = trail.x + Math.cos(trail.direction + wobble) * trail.currentLength;
  const endY = trail.y + Math.sin(trail.direction + wobble) * trail.currentLength;
  
  // Calculate control points for bezier curve
  const cp1x = trail.x + Math.cos(trail.direction + wobble*0.5) * trail.currentLength * trail.controlPoints[0].y;
  const cp1y = trail.y + Math.sin(trail.direction + wobble*0.5) * trail.currentLength * trail.controlPoints[0].y;
  
  const cp2x = trail.x + Math.cos(trail.direction + wobble*0.2) * trail.currentLength * trail.controlPoints[1].y;
  const cp2y = trail.y + Math.sin(trail.direction + wobble*0.2) * trail.currentLength * trail.controlPoints[1].y;
  
  // Draw glow effect first
  if (renderQuality !== 'low') {
    const glowGradient = ctx.createRadialGradient(
      trail.x, trail.y, 0,
      trail.x, trail.y, trail.width * trail.glowSize
    );
    
    glowGradient.addColorStop(0, `rgba(${r},${g},${b},${0.3 * trail.opacity})`);
    glowGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.1 * trail.opacity})`);
    glowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.width * trail.glowSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow at the end too
    const endGlowGradient = ctx.createRadialGradient(
      endX, endY, 0,
      endX, endY, trail.width * trail.glowSize * 0.7
    );
    
    endGlowGradient.addColorStop(0, `rgba(${r},${g},${b},${0.4 * trail.opacity})`);
    endGlowGradient.addColorStop(0.5, `rgba(${r},${g},${b},${0.2 * trail.opacity})`);
    endGlowGradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    
    ctx.fillStyle = endGlowGradient;
    ctx.beginPath();
    ctx.arc(endX, endY, trail.width * trail.glowSize * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Create gradient for main trail
  const trailGradient = ctx.createLinearGradient(
    trail.x, trail.y,
    endX, endY
  );
  
  // Create rich color gradient
  trailGradient.addColorStop(0, brightColor);
  trailGradient.addColorStop(0.3, baseColor);
  trailGradient.addColorStop(0.7, baseColor);
  trailGradient.addColorStop(1, glowColor);
  
  ctx.strokeStyle = trailGradient;
  ctx.lineWidth = trail.width;
  ctx.lineCap = 'round';
  
  // Draw main trail with bezier curve for smoother appearance
  ctx.beginPath();
  ctx.moveTo(trail.x, trail.y);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
  ctx.stroke();
  
  // Add sparkles along the trail
  if (performance.now() > trail.lastSparkleTime + 50) {
    if (Math.random() < trail.sparkleFrequency) {
      // Position sparkle along the trail
      const t = Math.random();
      const sparkleX = (1-t)*(1-t)*(1-t)*trail.x + 3*(1-t)*(1-t)*t*cp1x + 3*(1-t)*t*t*cp2x + t*t*t*endX;
      const sparkleY = (1-t)*(1-t)*(1-t)*trail.y + 3*(1-t)*(1-t)*t*cp1y + 3*(1-t)*t*t*cp2y + t*t*t*endY;
      
      // Add sparkle
      addSparkle(
        sparkleX, 
        sparkleY, 
        trail.sparkleSize, 
        0.3 + Math.random() * 0.4,
        trail.color
      );
      
      trail.lastSparkleTime = performance.now();
    }
  }
  
  // Add particles for high quality
  if (trail.emitParticles && (renderQuality === 'high' || renderQuality === 'ultra')) {
    if (performance.now() > trail.lastParticleTime + 30) {
      if (Math.random() < trail.particleFrequency) {
        // Position particle at the end of trail
        const particleCount = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < particleCount; i++) {
          // Particle with trail color but slight variation
          const particleColor = {
            r: Math.min(255, r + Math.floor((Math.random() - 0.5) * 30)),
            g: Math.min(255, g + Math.floor((Math.random() - 0.5) * 30)),
            b: Math.min(255, b + Math.floor((Math.random() - 0.5) * 30)),
            a: 1
          };
          
          // Add sparkle with slight offset
          addSparkle(
            endX + (Math.random() - 0.5) * 5, 
            endY + (Math.random() - 0.5) * 5, 
            0.5 + Math.random() * 1.5, 
            0.2 + Math.random() * 0.3,
            particleColor
          );
        }
        
        trail.lastParticleTime = performance.now();
      }
    }
  }
  
  // Add bright core using inner line
  ctx.strokeStyle = brightColor;
  ctx.lineWidth = trail.width * 0.5;
  ctx.beginPath();
  ctx.moveTo(trail.x, trail.y);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
  ctx.stroke();
}