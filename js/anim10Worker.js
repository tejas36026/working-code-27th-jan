// Global constants
const CHOCOLATE_COUNT_MAX = 1000;
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.12;
const GRAVITY_FACTOR = 0.96;
const AIR_RESISTANCE = 0.95;
const DEBUG_MODE = false;

// Chocolate types and shapes
const CHOCOLATE_TYPES = {
  DARK: 'dark',
  MILK: 'milk',
  WHITE: 'white',
  TRUFFLE: 'truffle',
  COCOA: 'cocoa',
  RUBY: 'ruby'  // Added ruby chocolate
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
  SPLAT: 'splat',
  DIAMOND: 'diamond',  // Added diamond shape
  DRIZZLE: 'drizzle'   // Added drizzle shape
};

// Enhanced chocolate color palette with richer tones, better contrast, and expanded range
const CHOCOLATE_COLORS = [
  { r: 35, g: 18, b: 8, a: 1 },       // Extra dark chocolate (darker and richer)
  { r: 65, g: 35, b: 18, a: 1 },      // Rich dark chocolate
  { r: 85, g: 48, b: 25, a: 1 },      // Semi-dark chocolate
  { r: 115, g: 65, b: 35, a: 1 },     // Premium milk chocolate
  { r: 140, g: 80, b: 40, a: 1 },     // Creamy milk chocolate
  { r: 165, g: 100, b: 65, a: 1 },    // Caramel (warmer tone)
  { r: 150, g: 120, b: 100, a: 1 },   // Mocha 
  { r: 110, g: 68, b: 39, a: 1 },     // Hazelnut
  { r: 225, g: 200, b: 170, a: 1 },   // White chocolate (brighter)
  { r: 235, g: 210, b: 180, a: 1 },   // Premium white chocolate
  { r: 190, g: 90, b: 95, a: 1 },     // Ruby chocolate
  { r: 75, g: 42, b: 20, a: 1 },      // Bittersweet chocolate
  { r: 55, g: 30, b: 15, a: 1 }       // 90% Cocoa dark chocolate
];

// Texture patterns for enhanced realism
const TEXTURE_PATTERNS = {
  SMOOTH: 'smooth',
  GRAINY: 'grainy',
  FLAKED: 'flaked',
  BUBBLY: 'bubbly',
  MARBLED: 'marbled'
};

// Animation state
let canvas = null;
let ctx = null;
let chocolates = [];
let chocolateSplats = [];
let chocolateDrips = [];
let chocolateBubbles = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let chocolateCount = 0;
let performanceLevel = 1.0;
let chocolatePrototypes = {};
let splashCenter = { x: 0, y: 0 };
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
  // Approximation of Fresnel effect for metallic surfaces
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
  }
};

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
      
      if (config.hasOwnProperty('maxChocolateCount')) {
        chocolateCount = Math.min(config.maxChocolateCount, CHOCOLATE_COUNT_MAX);
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
        
        // Set splash center with more natural offset
        const centerOffsetX = (Math.random() - 0.5) * 0.2;
        const centerOffsetY = (Math.random() - 0.5) * 0.2 - 0.05; // Slight upward bias
        splashCenter = { 
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
        
        // Create optimized chocolate prototypes with enhanced rendering
        createMetallicChocolatePrototypes();
        
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
      chocolates.forEach(choc => {
        // Any cleanup needed for chocolate objects
        if (choc.bitmap && typeof choc.bitmap.close === 'function') {
          choc.bitmap.close();
        }
      });
      
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      chocolates = [];
      chocolateSplats = [];
      chocolateDrips = [];
      chocolateBubbles = [];
      
      // Determine chocolate count based on performance level with more realistic scaling
      chocolateCount = Math.min(
        CHOCOLATE_COUNT_MAX,
        Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create chocolates with advanced distribution and variety
      createMetallicChocolates(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine chocolate count based on performance level with scaling
      chocolateCount = Math.min(
        CHOCOLATE_COUNT_MAX, 
        Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create chocolates with advanced distribution
      createMetallicChocolates(width, height);
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
    
    // Draw enhanced liquid chocolate splash with premium metallic effect
    drawPremiumChocolateSplash(ctx, width, height, progress);
    
    // Draw chocolate splats with enhanced metallic effects
    drawMetallicChocolateSplats(ctx, deltaTime);
    
    // Update and draw chocolates with enhanced metallic effects and varied physics
    updateAndDrawMetallicChocolates(ctx, deltaTime, progress);
    
    // Draw bubbles with refraction and light effects
    drawBubbles(ctx, deltaTime, progress);
    
    // Add enhanced dripping effect with advanced fluid simulation
    if (progress > 0.1 && progress < 0.9) {
      drawDynamicChocolateDrips(ctx, width, height, progress, deltaTime);
    }
    
    // Add steam/heat effect for hot chocolate appearance
    if (progress > 0.05 && progress < 0.7 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      drawHeatEffect(ctx, width, height, progress);
    }
    
    // Check if we need to adjust performance
    if (adaptiveRenderingEnabled && (frameCount % 15 === 0 || currentTime - lastPerformanceCheck > 500)) {
      lastPerformanceCheck = currentTime;
      
      // Calculate FPS using exponential moving average for stability
      const renderTime = perfMonitor.end();
      const instantFPS = 1000 / (rawDeltaTime || 16.67);
      statisticsData.fps = statisticsData.fps * 0.7 + instantFPS * 0.3;
      statisticsData.renderTime = renderTime;
      statisticsData.activeParticles = chocolates.length + chocolateSplats.length + chocolateDrips.length;
      
      // More intelligent performance adjustment based on both FPS and render time
      if (statisticsData.fps < 30 && performanceLevel > 0.3) {
        // Significant performance issue - make larger adjustment
        performanceLevel = Math.max(0.3, performanceLevel - 0.15);
        
        // Reduce particle count immediately for faster recovery
        if (chocolates.length > 100) {
          // Remove 20% of particles
          const removeCount = Math.floor(chocolates.length * 0.2);
          chocolates.splice(0, removeCount);
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
        chocolateCount: chocolates.length,
        splatCount: chocolateSplats.length,
        dripCount: chocolateDrips.length,
        bubbleCount: chocolateBubbles.length,
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
  
  // Create chocolate texture patterns
  const patternSize = 128;
  for (const pattern of Object.values(TEXTURE_PATTERNS)) {
    const patternCanvas = new OffscreenCanvas(patternSize, patternSize);
    const patternCtx = patternCanvas.getContext('2d');
    
    switch (pattern) {
      case TEXTURE_PATTERNS.GRAINY:
        // Create grainy chocolate texture
        patternCtx.fillStyle = '#553322';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add noise
        for (let i = 0; i < 5000; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 1 + Math.random();
          patternCtx.fillStyle = `rgba(${20 + Math.random() * 40}, ${10 + Math.random() * 20}, 0, ${0.1 + Math.random() * 0.2})`;
          patternCtx.fillRect(x, y, size, size);
        }
        break;
        
      case TEXTURE_PATTERNS.FLAKED:
        // Create flaked chocolate texture (like high-quality dark chocolate)
        patternCtx.fillStyle = '#3C2218';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add flakes
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 2 + Math.random() * 6;
          const angle = Math.random() * Math.PI * 2;
          
          patternCtx.save();
          patternCtx.translate(x, y);
          patternCtx.rotate(angle);
          patternCtx.fillStyle = `rgba(${120 + Math.random() * 40}, ${70 + Math.random() * 30}, ${40 + Math.random() * 20}, ${0.2 + Math.random() * 0.4})`;
          patternCtx.fillRect(-size/2, -size/4, size, size/2);
          patternCtx.restore();
        }
        break;
        
      case TEXTURE_PATTERNS.BUBBLY:
        // Create bubbly chocolate texture (like aerated chocolate)
        patternCtx.fillStyle = '#634832';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add bubbles
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 1 + Math.random() * 8;
          
          // Bubble with highlight
          const gradient = patternCtx.createRadialGradient(
            x, y, 0,
            x, y, size
          );
          
          gradient.addColorStop(0, 'rgba(110, 70, 40, 0.9)');
          gradient.addColorStop(0.7, 'rgba(90, 55, 30, 0.8)');
          gradient.addColorStop(1, 'rgba(60, 35, 20, 0.7)');
          
          patternCtx.fillStyle = gradient;
          patternCtx.beginPath();
          patternCtx.arc(x, y, size, 0, Math.PI * 2);
          patternCtx.fill();
          
          // Add highlight
          patternCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          patternCtx.beginPath();
          patternCtx.arc(x - size/3, y - size/3, size/3, 0, Math.PI * 2);
          patternCtx.fill();
        }
        break;
        
      case TEXTURE_PATTERNS.MARBLED:
        // Create marbled chocolate texture (like mixed chocolate types)
        patternCtx.fillStyle = '#70442A';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add marble effect using Perlin noise
        const imageData = patternCtx.getImageData(0, 0, patternSize, patternSize);
        
        for (let y = 0; y < patternSize; y++) {
          for (let x = 0; x < patternSize; x++) {
            const i = (y * patternSize + x) * 4;
            
            // Use multiple noise frequencies for more natural marbling
            const noise1 = shaderFx.perlinNoise2D(x, y, 0.01);
            const noise2 = shaderFx.perlinNoise2D(x, y, 0.05) * 0.5;
            const noise = (noise1 + noise2) * 0.7;
            
            // Use noise to mix between two chocolate colors
            if (noise > 0.1) {
              // Lighter chocolate color
              imageData.data[i] = 180 + noise * 40;
              imageData.data[i+1] = 120 + noise * 30;
              imageData.data[i+2] = 90 + noise * 20;
            } else {
              // Darker chocolate color
              imageData.data[i] = 70 - noise * 40;
              imageData.data[i+1] = 40 - noise * 30;
              imageData.data[i+2] = 20 - noise * 15;
            }
          }
        }
        
        patternCtx.putImageData(imageData, 0, 0);
        break;
        
      default: // SMOOTH
        // Create smooth chocolate texture
        const smoothGradient = patternCtx.createLinearGradient(0, 0, patternSize, patternSize);
        smoothGradient.addColorStop(0, '#64392A');
        smoothGradient.addColorStop(0.5, '#7A4935');
        smoothGradient.addColorStop(1, '#5A3520');
        
        patternCtx.fillStyle = smoothGradient;
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add subtle shine
        patternCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        patternCtx.fillRect(patternSize/4, patternSize/4, patternSize/2, patternSize/2);
    }
    
    textureCache[`pattern_${pattern}`] = patternCanvas.transferToImageBitmap();
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

function createMetallicChocolatePrototypes() {
  const prototypeCanvas = new OffscreenCanvas(64, 64);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  chocolatePrototypes = {};
  
  // Create different chocolate shapes with premium metallic finish and cache them
  for (const type of Object.values(CHOCOLATE_TYPES)) {
    chocolatePrototypes[type] = {};
    
    for (const shape of Object.values(CHOCOLATE_SHAPES)) {
      chocolatePrototypes[type][shape] = {};
      
      for (const color of CHOCOLATE_COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes for LOD (Level of Detail)
        for (let size = 1; size <= 32; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 64, 64);
          halfSize = Math.max(0.5, size / 2); // Ensure minimum half size
          const center = 32;
          
          // Draw with enhanced premium metallic effect
          renderPremiumChocolate(prototypeCtx, center, center, size, shape, color, type);
          
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

function renderPremiumChocolate(ctx, x, y, size, shape, color, type) {
  // Calculate derived colors for premium metallic effect with improved color theory
  const r = color.r, g = color.g, b = color.b;
  const baseColor = `rgb(${r},${g},${b})`;
  
  // Create more sophisticated highlight color (warmer) for realistic chocolate
  const lightColor = `rgb(${Math.min(255, r+40)},${Math.min(255, g+30)},${Math.min(255, b+20)})`;
  
  // Middle tone with slight saturation boost for richness
  const satBoost = 10;
  const midColor = `rgb(${Math.min(255, r+satBoost)},${Math.min(255, g)},${Math.max(0, b-satBoost)})`;
  
  // Create deeper shadows with color temperature shift
  const darkColor = `rgb(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-40)})`;
  
  // Even darker shadow for depth with blue shift for cool shadows
  const darkerColor = `rgb(${Math.max(0, r-70)},${Math.max(0, g-75)},${Math.max(0, b-65)})`;
  
  // Convexity parameter for enhanced 3D effect
  const convexity = size / 4;
  halfSize = Math.max(0.5, size / 2); // Ensure minimum half size

  
  ctx.save();
  
  switch (shape) {
    case CHOCOLATE_SHAPES.SQUARE:
      // Create premium square chocolate with metallic finish
      // Create base colors for enhanced 3D effect
      const squareGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      
      squareGradient.addColorStop(0, lightColor);
      squareGradient.addColorStop(0.4, midColor);
      squareGradient.addColorStop(0.8, darkColor);
      squareGradient.addColorStop(1, darkerColor);
      
      // Enhanced shadow effect with blur approximation
      for (let i = 0; i < 3; i++) {
        const offset = i * 0.5 + 0.5;
        const alpha = 0.1 - i * 0.03;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(
          x - halfSize - offset, 
          y - halfSize - offset, 
          size + offset * 2, 
          size + offset * 2, 
          size/6
        );
        ctx.fill();
      }
      
      // Main shape with smooth rounded corners
      ctx.fillStyle = squareGradient;
      ctx.beginPath();

      const cornerRadius = ensurePositiveRadius(size/8);
      console.log('cornerRadius :>> ', cornerRadius);
      ctx.roundRect(x - halfSize, y - halfSize, size, size, cornerRadius);

      ctx.fill();
      
      // Add enhanced metallic texture with directional lighting
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
      console.log('size :>> ', size);
      ctx.roundRect(x - halfSize, y - halfSize, size, size, size/8);
      ctx.fill();
      
      // Add premium chocolate segment pattern with deeper grooves and subtle bevel
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1.5, size/10);
      ctx.lineCap = 'round';
      
      // Draw segment lines with subtle shadow first
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = Math.max(1.5, size/10) + 0.5;
      // Horizontal and vertical segment lines
      ctx.beginPath();
      ctx.moveTo(x - halfSize + size/8, y);
      ctx.lineTo(x + halfSize - size/8, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, y - halfSize + size/8);
      ctx.lineTo(x, y + halfSize - size/8);
      ctx.stroke();
      
      // Draw main segment lines
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
      
      // Add premium edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(
        x - halfSize + 1, 
        y - halfSize + 1, 
        size - 2, 
        size - 2, 
        size/8 
      );
      ctx.stroke();
      
      // Add dynamic sharp highlight based on the chocolate type
      if (type === CHOCOLATE_TYPES.DARK || type === CHOCOLATE_TYPES.MILK) {
        // Less intense highlight for dark and milk chocolate
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.roundRect(
          x - halfSize + size/5, 
          y - halfSize + size/5, 
          size/4, 
          size/4, 
          size/20
        );
        ctx.fill();
      } else if (type === CHOCOLATE_TYPES.WHITE) {
        // Multiple softer highlights for white chocolate
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.roundRect(
          x - halfSize + size/6, 
          y - halfSize + size/6, 
          size/3, 
          size/3, 
          size/15
        );
        ctx.fill();
        
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.roundRect(
          x - size/6, 
          y - size/6, 
          size/3, 
          size/3, 
          size/15
        );
        ctx.fill();
      } else if (type === CHOCOLATE_TYPES.RUBY) {
        // Pinkish highlight for ruby chocolate
        ctx.fillStyle = "rgba(255,220,220,0.5)";
        ctx.beginPath();
        ctx.roundRect(
          x - halfSize + size/5, 
          y - halfSize + size/5, 
          size/3, 
          size/3, 
          size/15
        );
        ctx.fill();
      }
      break;
      
    case CHOCOLATE_SHAPES.DIAMOND:
      // Create premium diamond-shaped chocolate with luxury finish
      ctx.translate(x, y);
      
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(0, -halfSize - 1);
      ctx.lineTo(halfSize + 1, 0);
      ctx.lineTo(0, halfSize + 1);
      ctx.lineTo(-halfSize - 1, 0);
      ctx.closePath();
      ctx.fill();
      
      // Draw base diamond
      ctx.rotate(Math.PI / 8); // Slight rotation for interest
      
      // Create metallic gradient based on type
      let diamondGradient;
      if (type === CHOCOLATE_TYPES.DARK) {
        diamondGradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
        diamondGradient.addColorStop(0, lightColor);
        diamondGradient.addColorStop(0.4, midColor);
        diamondGradient.addColorStop(0.7, darkColor);
        diamondGradient.addColorStop(1, darkerColor);
      } else if (type === CHOCOLATE_TYPES.WHITE) {
        diamondGradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
        diamondGradient.addColorStop(0, 'rgb(245,240,230)');
        diamondGradient.addColorStop(0.5, lightColor);
        diamondGradient.addColorStop(0.8, midColor);
        diamondGradient.addColorStop(1, darkColor);
      } else if (type === CHOCOLATE_TYPES.RUBY) {
        diamondGradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
        diamondGradient.addColorStop(0, 'rgb(240,180,190)');
        diamondGradient.addColorStop(0.5, lightColor);
        diamondGradient.addColorStop(0.8, midColor);
        diamondGradient.addColorStop(1, darkColor);
      } else {
        diamondGradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
        diamondGradient.addColorStop(0, lightColor);
        diamondGradient.addColorStop(0.6, midColor);
        diamondGradient.addColorStop(1, darkColor);
      }
      
      ctx.fillStyle = diamondGradient;
      ctx.beginPath();
      ctx.moveTo(0, -halfSize);
      ctx.lineTo(halfSize, 0);
      ctx.lineTo(0, halfSize);
      ctx.lineTo(-halfSize, 0);
      ctx.closePath();
      ctx.fill();
      
      // Add facet lines
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1, size/20);
      
      // Central cross
      ctx.beginPath();
      ctx.moveTo(-halfSize * 0.6, 0);
      ctx.lineTo(halfSize * 0.6, 0);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, -halfSize * 0.6);
      ctx.lineTo(0, halfSize * 0.6);
      ctx.stroke();
      
      // Add facet highlight reflections
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(-halfSize * 0.3, -halfSize * 0.3);
      ctx.lineTo(0, -halfSize * 0.6);
      ctx.lineTo(halfSize * 0.3, -halfSize * 0.3);
      ctx.closePath();
      ctx.fill();
      
      // Second highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(-halfSize * 0.5, 0);
      ctx.lineTo(-halfSize * 0.25, halfSize * 0.25);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.ROUND:
      // Create premium round chocolate with enhanced metallic finish
      // Main metallic gradient with improved aesthetics
      const roundGradient = ctx.createRadialGradient(
        x - halfSize/3, y - halfSize/3, 0,
        x, y, halfSize
      );
      
      roundGradient.addColorStop(0, lightColor);
      roundGradient.addColorStop(0.4, midColor);
      roundGradient.addColorStop(0.8, darkColor);
      roundGradient.addColorStop(1, darkerColor);
      
      // Add subtle shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(x + 1, y + 1, halfSize + 1, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw the main shape
      ctx.fillStyle = roundGradient;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add premium metallic sheen with gradient
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
      
      // Add texture pattern based on chocolate type
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.globalAlpha = 0.15;
        
        if (type === CHOCOLATE_TYPES.DARK) {
          // Add dark chocolate texture (slightly grainy)
          ctx.globalCompositeOperation = 'multiply';
          if (textureCache['pattern_grainy']) {
            ctx.drawImage(
              textureCache['pattern_grainy'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else if (type === CHOCOLATE_TYPES.MILK) {
          // Smooth milk chocolate texture
          ctx.globalCompositeOperation = 'overlay';
          if (textureCache['pattern_smooth']) {
            ctx.drawImage(
              textureCache['pattern_smooth'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else if (type === CHOCOLATE_TYPES.WHITE) {
          // White chocolate texture with tiny flecks
          ctx.globalCompositeOperation = 'overlay';
          
          if (textureCache['pattern_flaked']) {
            ctx.drawImage(
              textureCache['pattern_flaked'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else if (type === CHOCOLATE_TYPES.RUBY) {
          // Ruby chocolate with distinctive marbling
          ctx.globalCompositeOperation = 'overlay';
          
          if (textureCache['pattern_marbled']) {
            ctx.drawImage(
              textureCache['pattern_marbled'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      
      // Add textured surface with noise pattern for enhanced metallic effect
      ctx.globalAlpha = 0.1;
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        for (let i = 0; i < (renderQuality === 'ultra' ? 15 : 10); i++) {
          const noiseSize = halfSize * 0.2;
          const nx = x + (Math.random() - 0.5) * halfSize * 1.6;
          const ny = y + (Math.random() - 0.5) * halfSize * 1.6;
          
          ctx.fillStyle = Math.random() > 0.5 ? 
            `rgba(255,255,255,0.3)` : darkerColor;
            
          ctx.beginPath();
          ctx.arc(nx, ny, noiseSize * Math.random(), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      
      // Enhanced edge shadow for depth
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1, size/12);
      ctx.beginPath();
      ctx.arc(x, y, halfSize - ctx.lineWidth/2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add logo or brand mark for premium chocolates
      if (size > 8 && (renderQuality === 'high' || renderQuality === 'ultra')) {
        ctx.fillStyle = darkerColor;
        ctx.beginPath();
        
        // Simple elegent "C" mark
        ctx.arc(x, y, halfSize * 0.4, Math.PI * 0.3, Math.PI * 1.7, false);
        ctx.lineWidth = Math.max(1, size/15);
        ctx.stroke();
      }
      break;
      
    case CHOCOLATE_SHAPES.HEART:
      // Enhanced premium heart with metallic finish
      // Create heart shape
      ctx.fillStyle = midColor;
      drawPremiumHeart(ctx, x, y, halfSize);
      
      // Create 3D effect with enhanced shadow gradient
      const heartDarkShade = darkerColor;
      const heartHighlight = lightColor;
      
      // Add reflective gradient with improved aesthetics
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
      drawPremiumHeart(ctx, x, y, halfSize * 0.98);
      
      // Add outline for better definition
      ctx.strokeStyle = heartDarkShade;
      ctx.lineWidth = Math.max(1, size/10);
      drawPremiumHeartStroke(ctx, x, y, halfSize);
      
      // Add subtle surface grain for chocolate texture
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.globalCompositeOperation = 'multiply';
        
        // Create clip region
        ctx.beginPath();
        drawPremiumHeart(ctx, x, y, halfSize * 0.9);
        ctx.clip();
        
        // Add noise texture
        if (textureCache['noise_64_0.1']) {
          ctx.drawImage(
            textureCache['noise_64_0.1'], 
            x - halfSize, 
            y - halfSize, 
            size, 
            size
          );
        }
        
        ctx.restore();
      }
      
      // Add highlight spots with variation based on chocolate type
      if (type === CHOCOLATE_TYPES.DARK) {
        // Deep rich highlight
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(x - halfSize*0.3, y - halfSize*0.3, halfSize*0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === CHOCOLATE_TYPES.MILK) {
        // Warmer highlight
        ctx.fillStyle = "rgba(255,245,225,0.5)";
        ctx.beginPath();
        ctx.arc(x - halfSize*0.25, y - halfSize*0.3, halfSize*0.15, 0, Math.PI * 2);
        ctx.fill();
        
        // Second smaller highlight
        ctx.fillStyle = "rgba(255,245,225,0.3)";
        ctx.beginPath();
        ctx.arc(x + halfSize*0.2, y - halfSize*0.1, halfSize*0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === CHOCOLATE_TYPES.WHITE) {
        // Subtle pearly highlights
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.ellipse(
          x - halfSize*0.25, 
          y - halfSize*0.3, 
          halfSize*0.2, 
          halfSize*0.15, 
          Math.PI/4, 0, Math.PI * 2
        );
        ctx.fill();
      } else if (type === CHOCOLATE_TYPES.RUBY) {
        // Pink-tinted highlight
        ctx.fillStyle = "rgba(255,220,230,0.5)";
        ctx.beginPath();
        ctx.arc(x - halfSize*0.3, y - halfSize*0.25, halfSize*0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case CHOCOLATE_SHAPES.TRUFFLE:
      // Create premium metallic truffle with rich texture
      const truffleGrad = ctx.createRadialGradient(
        x, y, 0,
        x, y, halfSize
      );
      
      // Richer color gradient for premium truffle
      truffleGrad.addColorStop(0, lightColor);
      truffleGrad.addColorStop(0.5, midColor);
      truffleGrad.addColorStop(0.8, darkColor);
      truffleGrad.addColorStop(1, darkerColor);
      
      // Add subtle shadow first
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      
      // Shadow with slight offset
      const trufflePoints = 16;
      const shadowOffset = 1;
      
      ctx.moveTo(
        x + shadowOffset + Math.cos(0) * halfSize * (0.9 + Math.sin(0*5)*0.1),
        y + shadowOffset + Math.sin(0) * halfSize * (0.9 + Math.sin(0*5)*0.1)
      );
      
      for (let i = 1; i <= trufflePoints; i++) {
        const angle = (i / trufflePoints) * Math.PI * 2;
        const radiusVar = 0.85 + Math.sin(i * 5) * 0.15;
        const pointX = x + shadowOffset + Math.cos(angle) * halfSize * radiusVar;
        const pointY = y + shadowOffset + Math.sin(angle) * halfSize * radiusVar;
        
        // Use quadratic curves for smoother shape
        const prevAngle = ((i-1) / trufflePoints) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const ctrlX = x + shadowOffset + Math.cos(midAngle) * halfSize * 1.2;
        const ctrlY = y + shadowOffset + Math.sin(midAngle) * halfSize * 1.2;
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, pointX, pointY);
      }
      
      ctx.closePath();
      ctx.fill();
      
      // Draw main truffle
      ctx.fillStyle = truffleGrad;
      ctx.beginPath();
      
      // Create irregular premium truffle shape
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
      
      // Add premium cocoa powder dusting effect
      // Use texture cache for better performance if available
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.globalCompositeOperation = 'multiply';
        
        // Create clip region
        ctx.beginPath();
        ctx.arc(x, y, halfSize * 0.95, 0, Math.PI * 2);
        ctx.clip();
        
        if (textureCache['pattern_grainy']) {
          // Use pre-generated grainy texture
          ctx.drawImage(
            textureCache['pattern_grainy'], 
            x - halfSize, 
            y - halfSize, 
            size, 
            size
          );
        } else {
          // Fallback to procedural dust
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
        }
        
        ctx.restore();
      } else {
        // Simpler dusting for lower quality settings
        ctx.fillStyle = darkerColor;
        ctx.globalAlpha = 0.2;
        
        for (let i = 0; i < 15; i++) {
          const dustX = x + (Math.random() - 0.5) * size * 1.4;
          const dustY = y + (Math.random() - 0.5) * size * 1.4;
          const dustSize = size / 10 * Math.random();
          
          ctx.beginPath();
          ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.globalAlpha = 1;
      }
      
      // Add premium metallic shine spot
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
      
      // Add luxury branding mark for premium truffles
      if (size > 12 && (renderQuality === 'high' || renderQuality === 'ultra')) {
        ctx.fillStyle = type === CHOCOLATE_TYPES.WHITE ? darkColor : 'rgba(255,255,255,0.3)';
        ctx.font = `${Math.max(8, size/3)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("C", x, y + halfSize * 0.1);
      }
      break;
      
    case CHOCOLATE_SHAPES.CHUNK:
      // Create rich premium chocolate chunk with metallic texture
      const chunkDarkColor = darkerColor;
      const chunkMidColor = darkColor;
      
      // Create irregular chocolate chunk shape
      ctx.beginPath();
      
      // Generate irregular polygon for premium chunk
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
      
      // Draw irregular edges with curves for more natural shape
      for (let i = 1; i <= chunkPoints; i++) {
        const angle = startAngle + (i / chunkPoints) * Math.PI * 2;
        const nextRadius = radiusVariations[i % chunkPoints];
        const pointX = x + Math.cos(angle) * halfSize * nextRadius;
        const pointY = y + Math.sin(angle) * halfSize * nextRadius;
        
        // Add curve between points with improved natural feel
        const prevAngle = startAngle + ((i-1) / chunkPoints) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const controlRadius = (radiusVariations[(i-1) % chunkPoints] + nextRadius) / 2 * 1.1;
        const ctrlX = x + Math.cos(midAngle) * halfSize * controlRadius;
        const ctrlY = y + Math.sin(midAngle) * halfSize * controlRadius;
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, pointX, pointY);
      }
      
      ctx.closePath();
      
      // Create 3D effect with enhanced metallic gradient
      const chunkGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      
      // Adjust gradient based on chocolate type
      if (type === CHOCOLATE_TYPES.DARK) {
        chunkGradient.addColorStop(0, lightColor);
        chunkGradient.addColorStop(0.4, midColor);
        chunkGradient.addColorStop(0.8, darkColor);
        chunkGradient.addColorStop(1, darkerColor);
      } else if (type === CHOCOLATE_TYPES.WHITE) {
        chunkGradient.addColorStop(0, 'rgb(245,240,230)');
        chunkGradient.addColorStop(0.5, lightColor);
        chunkGradient.addColorStop(0.8, midColor);
        chunkGradient.addColorStop(1, darkColor);
      } else if (type === CHOCOLATE_TYPES.RUBY) {
        chunkGradient.addColorStop(0, 'rgb(230,180,190)');
        chunkGradient.addColorStop(0.5, lightColor);
        chunkGradient.addColorStop(0.8, midColor);
        chunkGradient.addColorStop(1, darkColor);
      } else {
        chunkGradient.addColorStop(0, lightColor);
        chunkGradient.addColorStop(0.5, midColor);
        chunkGradient.addColorStop(0.8, darkColor);
        chunkGradient.addColorStop(1, darkerColor);
      }
      
      ctx.fillStyle = chunkGradient;
      ctx.fill();
      
      // Add texture based on chocolate type
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.globalCompositeOperation = 'multiply';
        
        if (type === CHOCOLATE_TYPES.DARK) {
          // Flaked texture for dark chocolate
          if (textureCache['pattern_flaked']) {
            ctx.drawImage(
              textureCache['pattern_flaked'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else if (type === CHOCOLATE_TYPES.WHITE) {
          // Smooth texture for white chocolate
          if (textureCache['pattern_smooth']) {
            ctx.drawImage(
              textureCache['pattern_smooth'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else {
          // Default texture
          if (textureCache['pattern_grainy']) {
            ctx.drawImage(
              textureCache['pattern_grainy'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        }
        
        ctx.restore();
      }
      
      // Add enhanced break lines/cracks with depth effect
      ctx.strokeStyle = chunkDarkColor;
      ctx.lineWidth = Math.max(1, size/25);
      
      // Add random cracks with improved realism
      const crackCount = renderQuality === 'ultra' ? 5 : (renderQuality === 'high' ? 4 : 2);
      for (let i = 0; i < crackCount; i++) {
        const startX = x + (Math.random() - 0.5) * size * 0.6;
        const startY = y + (Math.random() - 0.5) * size * 0.6;
        
        // Draw shadow for depth
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = Math.max(1, size/25) + 0.5;
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
        
        // Draw main crack
        ctx.strokeStyle = chunkDarkColor;
        ctx.lineWidth = Math.max(1, size/25);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Reset for main crack
        currentX = startX;
        currentY = startY;
        
        for (let j = 0; j < segments; j++) {
          const length = size * (0.1 + Math.random() * 0.2);
          const angle = Math.random() * Math.PI * 2;
          
          currentX += Math.cos(angle) * length;
          currentY += Math.sin(angle) * length;
          
          ctx.lineTo(currentX, currentY);
        }
        
        ctx.stroke();
      }
      
      // Add premium metallic highlight with dynamic lighting
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
      
      // Add secondary edge highlights
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Follow original shape but slightly inset
      const insetFactor = 0.9;
      ctx.moveTo(
        x + Math.cos(startAngle) * halfSize * radiusVariations[0] * insetFactor,
        y + Math.sin(startAngle) * halfSize * radiusVariations[0] * insetFactor
      );
      
      for (let i = 1; i <= chunkPoints; i++) {
        const angle = startAngle + (i / chunkPoints) * Math.PI * 2;
        const nextRadius = radiusVariations[i % chunkPoints] * insetFactor;
        const pointX = x + Math.cos(angle) * halfSize * nextRadius;
        const pointY = y + Math.sin(angle) * halfSize * nextRadius;
        
        const prevAngle = startAngle + ((i-1) / chunkPoints) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const controlRadius = (radiusVariations[(i-1) % chunkPoints] + radiusVariations[i % chunkPoints]) / 2 * insetFactor * 1.1;
        const ctrlX = x + Math.cos(midAngle) * halfSize * controlRadius;
        const ctrlY = y + Math.sin(midAngle) * halfSize * controlRadius;
        
        ctx.quadraticCurveTo(ctrlX, ctrlY, pointX, pointY);
      }
      
      ctx.stroke();
      break;
      
    case CHOCOLATE_SHAPES.DRIZZLE:
      // Create premium chocolate drizzle with fluid appearance
      // Use bezier curves for more natural flow
      const drizzlePoints = [
        { x: -halfSize * 0.8, y: -halfSize * 0.5, cp1x: -halfSize * 0.6, cp1y: -halfSize * 0.8 },
        { x: halfSize * 0.2, y: -halfSize * 0.2, cp1x: 0, cp1y: -halfSize * 0.6 },
        { x: 0, y: halfSize * 0.3, cp1x: halfSize * 0.6, cp1y: 0 },
        { x: -halfSize * 0.5, y: halfSize * 0.6, cp1x: -halfSize * 0.3, cp1y: halfSize * 0.4 }
      ];
      
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(x + drizzlePoints[0].x + 1, y + drizzlePoints[0].y + 1);
      
      for (let i = 1; i < drizzlePoints.length; i++) {
        const prev = drizzlePoints[i-1];
        const curr = drizzlePoints[i];
        
        ctx.bezierCurveTo(
          x + prev.cp1x + 1, 
          y + prev.cp1y + 1, 
          x + curr.x - curr.cp1x + 1, 
          y + curr.y - curr.cp1y + 1, 
          x + curr.x + 1, 
          y + curr.y + 1
        );
      }
      
      // Add end point thickening
      const endRadiusX = halfSize * 0.25;
      const endRadiusY = halfSize * 0.15;
      const lastPoint = drizzlePoints[drizzlePoints.length - 1];
      ctx.ellipse(
        x + lastPoint.x + 1, 
        y + lastPoint.y + 1, 
        endRadiusX, 
        endRadiusY, 
        Math.PI/4, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Draw main drizzle with gradient
      const drizzleGradient = ctx.createLinearGradient(
        x - halfSize, y - halfSize,
        x + halfSize, y + halfSize
      );
      
      drizzleGradient.addColorStop(0, lightColor);
      drizzleGradient.addColorStop(0.5, midColor);
      drizzleGradient.addColorStop(1, darkColor);
      
      ctx.fillStyle = drizzleGradient;
      ctx.beginPath();
      ctx.moveTo(x + drizzlePoints[0].x, y + drizzlePoints[0].y);
      
      // Draw the curved drizzle path
      for (let i = 1; i < drizzlePoints.length; i++) {
        const prev = drizzlePoints[i-1];
        const curr = drizzlePoints[i];
        
        ctx.bezierCurveTo(
          x + prev.cp1x, 
          y + prev.cp1y, 
          x + curr.x - curr.cp1x, 
          y + curr.y - curr.cp1y, 
          x + curr.x, 
          y + curr.y
        );
      }
      
      // Add end point thickening for liquid appearance
      const lastPt = drizzlePoints[drizzlePoints.length - 1];
      ctx.ellipse(
        x + lastPt.x, 
        y + lastPt.y, 
        endRadiusX, 
        endRadiusY, 
        Math.PI/4, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Add highlight along the drizzle
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = Math.max(1, size/10);
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      const hlStart = drizzlePoints[0];
      const hlEnd = drizzlePoints[Math.min(2, drizzlePoints.length - 1)];
      ctx.moveTo(x + hlStart.x, y + hlStart.y);
      
      for (let i = 1; i <= Math.min(2, drizzlePoints.length - 1); i++) {
        const prev = drizzlePoints[i-1];
        const curr = drizzlePoints[i];
        
        ctx.bezierCurveTo(
          x + prev.cp1x, 
          y + prev.cp1y, 
          x + curr.x - curr.cp1x, 
          y + curr.y - curr.cp1y, 
          x + curr.x, 
          y + curr.y
        );
      }
      
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Add droplet at the end with highlight
      const dropletGradient = ctx.createRadialGradient(
        x + lastPt.x, y + lastPt.y, 0, 
        x + lastPt.x, y + lastPt.y, endRadiusX
      );
      
      dropletGradient.addColorStop(0, lightColor);
      dropletGradient.addColorStop(0.7, midColor);
      dropletGradient.addColorStop(1, darkColor);
      
      ctx.fillStyle = dropletGradient;
      ctx.beginPath();
      ctx.ellipse(
        x + lastPt.x, 
        y + lastPt.y, 
        endRadiusX, 
        endRadiusY, 
        Math.PI/4, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Add highlight to droplet
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(
        x + lastPt.x - endRadiusX * 0.3, 
        y + lastPt.y - endRadiusY * 0.3, 
        endRadiusX * 0.3, 
        endRadiusY * 0.3, 
        Math.PI/4, 0, Math.PI * 2
      );
      ctx.fill();
      break;
      
    case CHOCOLATE_SHAPES.SPLAT:
      // Create enhanced splat with premium metallic sheen
      const splatDarkColor = darkerColor;
      const splatLightColor = lightColor;
      
      // Create splat gradient with premium metallic quality
      const splatGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, halfSize
      );
      splatGradient.addColorStop(0, splatLightColor);
      splatGradient.addColorStop(0.6, midColor);
      splatGradient.addColorStop(1, splatDarkColor);
      
      // Draw subtle shadow first for depth
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      drawPremiumChocolateSplat(ctx, x + 1, y + 1, size * 1.02);
      
      // Draw main splat
      ctx.fillStyle = splatGradient;
      drawPremiumChocolateSplat(ctx, x, y, size);
      
      // Add dynamic shine effect with improved aesthetics
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
      
      // Add chocolate texture based on type
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.globalCompositeOperation = 'multiply';
        
        // Create clip region
        ctx.beginPath();
        drawPremiumChocolateSplat(ctx, x, y, size * 0.98);
        ctx.clip();
        
        // Different texture based on chocolate type
        if (type === CHOCOLATE_TYPES.DARK) {
          if (textureCache['pattern_flaked']) {
            ctx.drawImage(
              textureCache['pattern_flaked'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else if (type === CHOCOLATE_TYPES.WHITE) {
          if (textureCache['pattern_smooth']) {
            ctx.drawImage(
              textureCache['pattern_smooth'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        } else {
          if (textureCache['pattern_grainy']) {
            ctx.drawImage(
              textureCache['pattern_grainy'], 
              x - halfSize, 
              y - halfSize, 
              size, 
              size
            );
          }
        }
        
        ctx.restore();
      }
      
      // Add secondary smaller highlights with improved animation
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      
      // Add 3-5 highlights depending on quality setting
      const highlightCount = renderQuality === 'low' ? 2 : 
                           renderQuality === 'medium' ? 3 :
                           renderQuality === 'high' ? 4 : 5;
                           
      for (let i = 0; i < highlightCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = halfSize * (0.3 + Math.random() * 0.4);
        const hx = x + Math.cos(angle) * dist;
        const hy = y + Math.sin(angle) * dist;
        const bubbleSize = halfSize * (0.05 + Math.random() * 0.1);
        
        ctx.beginPath();
        ctx.arc(hx, hy, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add wet edges effect for fresh chocolate
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1, size/30);
      ctx.globalAlpha = 0.2;
      
      // Create clip region to keep effect within splat
      if (renderQuality !== 'low') {
        ctx.beginPath();
        drawPremiumChocolateSplat(ctx, x, y, size * 0.98);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      break;
      
    default:
      // Default to round shape with basic effects
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(x, y, halfSize, 0, Math.PI * 2);
      ctx.fill();
  }
  
  ctx.restore();
}

function drawPremiumHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic premium chocolate look
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

function drawPremiumHeartStroke(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic premium chocolate look
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

function drawPremiumChocolateSplat(ctx, cx, cy, size) {
  // Enhanced splat with more organic, premium realistic appearance
  const numPoints = Math.max(12, Math.floor(size / 2)); // More points for larger splats
  const baseRadius = size * 0.75;
  
  ctx.beginPath();
  
  // Create more complex, irregular splat shape with premium look
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More varied radius for realistic premium splat
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
      // Create more organic curves between points for premium look
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
  
  // Add premium drip details for wet, glossy look if in high quality mode
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    ctx.save();
    
    // Create clip region to keep drips within original shape area
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.clip();
    
    const drips = 4 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < drips; i++) {
      const drip_angle = Math.random() * Math.PI * 2;
      const drip_dist = baseRadius * (0.8 + Math.random() * 0.3);
      const drip_x = cx + Math.cos(drip_angle) * drip_dist;
      const drip_y = cy + Math.sin(drip_angle) * drip_dist;
      
      const drip_length = size * (0.15 + Math.random() * 0.2);
      const drip_width = size * (0.05 + Math.random() * 0.07);
      
      // Draw more realistic drip using bezier curve
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
      
      // Add droplet at the end of the drip
      ctx.beginPath();
      ctx.arc(end_x, end_y, drip_width * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function createMetallicChocolates(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate optimal distribution based on canvas size
  const screenArea = width * height;
  const averageSize = Math.sqrt(screenArea / chocolateCount) * 0.15;
  
  // Distribution factors for more balanced appearance
  const sizeFactor = Math.min(width, height) / 400; // Scale based on screen size
  
  // Prepare arrays for sizing distribution
  const typeDistribution = [];
  let totalWeight = 0;
  
  // Build weighted distribution based on chocolate types
  typeDistribution.push({ type: CHOCOLATE_TYPES.DARK, weight: 45, cumulative: 0 });
  typeDistribution.push({ type: CHOCOLATE_TYPES.MILK, weight: 35, cumulative: 0 });
  typeDistribution.push({ type: CHOCOLATE_TYPES.WHITE, weight: 10, cumulative: 0 });
  typeDistribution.push({ type: CHOCOLATE_TYPES.TRUFFLE, weight: 7, cumulative: 0 });
  typeDistribution.push({ type: CHOCOLATE_TYPES.RUBY, weight: 3, cumulative: 0 });
  
  // Calculate cumulative weights
  for (let i = 0; i < typeDistribution.length; i++) {
    totalWeight += typeDistribution[i].weight;
    typeDistribution[i].cumulative = totalWeight;
  }
  
  // Create premium chocolate pieces with metallic finish
  for (let i = 0; i < chocolateCount; i++) {
    // Determine chocolate type using weighted distribution
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
      case CHOCOLATE_TYPES.DARK:
        // Dark chocolate - bigger, longer lasting, angular shapes
        size = (5 + Math.random() * 12) * sizeFactor;
        lifespan = 0.75 + Math.random() * 0.25;
        
        if (Math.random() < 0.4) {
          shape = CHOCOLATE_SHAPES.SQUARE;
        } else if (Math.random() < 0.6) {
          shape = CHOCOLATE_SHAPES.CHUNK;
        } else if (Math.random() < 0.8) {
          shape = CHOCOLATE_SHAPES.RECTANGLE;
        } else {
          shape = CHOCOLATE_SHAPES.DIAMOND;
        }
        break;
        
      case CHOCOLATE_TYPES.MILK:
        // Milk chocolate - medium size, varied shapes
        size = (4 + Math.random() * 10) * sizeFactor;
        lifespan = 0.7 + Math.random() * 0.3;
        
        if (Math.random() < 0.3) {
          shape = CHOCOLATE_SHAPES.ROUND;
        } else if (Math.random() < 0.5) {
          shape = CHOCOLATE_SHAPES.SQUARE;
        } else if (Math.random() < 0.7) {
          shape = CHOCOLATE_SHAPES.HEART;
        } else if (Math.random() < 0.85) {
          shape = CHOCOLATE_SHAPES.DIAMOND;
        } else {
          shape = CHOCOLATE_SHAPES.DRIZZLE;
        }
        break;
        
      case CHOCOLATE_TYPES.WHITE:
        // White chocolate - smaller, more delicate shapes
        size = (3 + Math.random() * 8) * sizeFactor;
        lifespan = 0.65 + Math.random() * 0.35;
        
        if (Math.random() < 0.4) {
          shape = CHOCOLATE_SHAPES.HEART;
        } else if (Math.random() < 0.7) {
          shape = CHOCOLATE_SHAPES.ROUND;
        } else if (Math.random() < 0.9) {
          shape = CHOCOLATE_SHAPES.SQUARE;
        } else {
          shape = CHOCOLATE_SHAPES.DRIZZLE;
        }
        break;
        
      case CHOCOLATE_TYPES.TRUFFLE:
        // Truffles - round, mid-sized
        size = (4 + Math.random() * 7) * sizeFactor;
        lifespan = 0.6 + Math.random() * 0.3;
        
        if (Math.random() < 0.7) {
          shape = CHOCOLATE_SHAPES.TRUFFLE;
        } else if (Math.random() < 0.85) {
          shape = CHOCOLATE_SHAPES.ROUND;
        } else {
          shape = CHOCOLATE_SHAPES.SPLAT;
        }
        break;
        
      case CHOCOLATE_TYPES.RUBY:
        // Ruby chocolate - exotic, distinctive
        size = (3.5 + Math.random() * 7) * sizeFactor;
        lifespan = 0.7 + Math.random() * 0.3;
        
        if (Math.random() < 0.4) {
          shape = CHOCOLATE_SHAPES.DIAMOND;
        } else if (Math.random() < 0.7) {
          shape = CHOCOLATE_SHAPES.HEART;
        } else {
          shape = CHOCOLATE_SHAPES.SQUARE;
        }
        break;
        
      default:
        // Generic fallback
        size = (4 + Math.random() * 8) * sizeFactor;
        lifespan = 0.65 + Math.random() * 0.35;
        shape = Math.random() < 0.5 ? CHOCOLATE_SHAPES.ROUND : CHOCOLATE_SHAPES.SQUARE;
    }
    
    // Select appropriate color based on type with natural variation
    let colorIndex;
    if (type === CHOCOLATE_TYPES.DARK) {
      // Dark chocolates (0-2)
      colorIndex = Math.floor(Math.random() * 3); 
    } else if (type === CHOCOLATE_TYPES.MILK) {
      // Milk chocolates (3-7)
      colorIndex = 3 + Math.floor(Math.random() * 5); 
    } else if (type === CHOCOLATE_TYPES.WHITE) {
      // White chocolates (8-9)
      colorIndex = 8 + Math.floor(Math.random()); 
    } else if (type === CHOCOLATE_TYPES.RUBY) {
      // Ruby chocolate
      colorIndex = 10;
    } else {
      // Truffles and others - mixed colors
      colorIndex = 2 + Math.floor(Math.random() * 6); 
    }
    
    // Get color with bounds checking
    const color = CHOCOLATE_COLORS[Math.min(colorIndex, CHOCOLATE_COLORS.length - 1)];
    
    // Add slight color variation for realism
    const colorVariation = 15; // Reduced from 20 to maintain brand consistency
    const variedColor = {
      r: Math.max(0, Math.min(255, color.r + (Math.random() - 0.5) * colorVariation)),
      g: Math.max(0, Math.min(255, color.g + (Math.random() - 0.5) * colorVariation)),
      b: Math.max(0, Math.min(255, color.b + (Math.random() - 0.5) * colorVariation)),
      a: color.a
    };
    
    // Distribute chocolate pieces with improved explosion pattern
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
    const normalizedIndex = i / chocolateCount;
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
    
    // Create the chocolate piece with enhanced properties
    chocolates.push({
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
      meltFactor: Math.random() * 0.3,
      delay: Math.random() * 0.2,
      bounceCount: 0,
      maxBounces: Math.floor(Math.random() * 3),
      elasticity: 0.3 + Math.random() * 0.4,
      
      // Enhanced metallic properties
      convexity: 2 + Math.random() * 5,
      metallicIntensity: 0.5 + Math.random() * 0.5,
      reflectionAngle: Math.random() * Math.PI * 2,
      textureVariation: Math.random(),
      
      // Dynamic animation properties
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.1,
      wobbleAmount: 0.05 + Math.random() * 0.1,
      rotationWobble: 0.05 + Math.random() * 0.1,
      
      // Trails for smoother animation
      trail: [],
      maxTrailLength: renderQuality === 'ultra' ? 6 : (renderQuality === 'high' ? 4 : 0),
      trailOpacity: 0.3,
      
      // Add spin effects
      spinAxis: {
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
        z: Math.random() - 0.5
      },
      spinVelocity: Math.random() * 0.1
    });
  }
  
  // Create initial chocolate splats with metallic finish
  for (let i = 0; i < (renderQuality === 'low' ? 5 : 10); i++) {
    addPremiumChocolateSplat(
      centerX + (Math.random() - 0.5) * width * 0.7,
      centerY + (Math.random() - 0.5) * height * 0.7,
      10 + Math.random() * 40,
      0.2 + Math.random() * 0.3
    );
  }
  
  // Add bubbles for premium visual effect
  if (renderQuality !== 'low') {
    createBubbles(centerX, centerY, Math.min(width, height) * 0.3);
  }
}

function addPremiumChocolateSplat(x, y, size, delay) {
  // Select color with premium variation
  const colorIndex = Math.floor(Math.random() * 5) + 1; // Mostly milk chocolate colors
  const color = CHOCOLATE_COLORS[colorIndex];
  
  // Add color variation for realism
  const colorVariation = 10;
  const variedColor = {
    r: Math.max(0, Math.min(255, color.r + (Math.random() - 0.5) * colorVariation)),
    g: Math.max(0, Math.min(255, color.g + (Math.random() - 0.5) * colorVariation)),
    b: Math.max(0, Math.min(255, color.b + (Math.random() - 0.5) * colorVariation)),
    a: color.a
  };
  
  // Choose texture pattern for this splat
  const texturePatterns = Object.values(TEXTURE_PATTERNS);
  const texture = texturePatterns[Math.floor(Math.random() * texturePatterns.length)];
  
  chocolateSplats.push({
    x,
    y,
    size,
    targetSize: size,
    currentSize: 0,
    color: variedColor,
    opacity: 0,
    targetOpacity: 0.8 + Math.random() * 0.2,
    created: performance.now(),
    delay,
    growthRate: 0.15 + Math.random() * 0.1,
    
    // Enhanced metallic properties
    convexity: 1 + Math.random() * 3,
    metallicIntensity: 0.4 + Math.random() * 0.6,
    reflectionAngle: Math.random() * Math.PI * 2,
    reflectionOffset: Math.random() * 0.4,
    wobbleFrequency: 2 + Math.random() * 3,
    
    // Added texture pattern
    texture,
    textureScale: 0.5 + Math.random() * 0.5,
    
    // Add droplets around splat
    hasDroplets: Math.random() < 0.7,
    dropletCount: Math.floor(Math.random() * 5) + 2,
    
    // Add wave effect
    wavePhase: Math.random() * Math.PI * 2,
    waveFrequency: 1 + Math.random() * 2,
    waveAmplitude: 0.05 + Math.random() * 0.1
  });
}

function drawMetallicChocolateSplats(ctx, deltaTime) {
  for (let i = 0; i < chocolateSplats.length; i++) {
    const splat = chocolateSplats[i];
    const elapsed = (performance.now() - splat.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < splat.delay) continue;
    
    // Grow the splat with improved animation curve
    const growthProgress = Math.min(1, elapsed * splat.growthRate * 2);
    // Use ease-out cubic for more natural growth
    const easedGrowth = 1 - Math.pow(1 - growthProgress, 3);
    
    splat.currentSize = splat.targetSize * easedGrowth;
    
    // Fade in with smoother curve
    splat.opacity = Math.min(splat.targetOpacity, easedGrowth * splat.targetOpacity);
    
    // Optional wave effect
    splat.wavePhase += deltaTime * 0.02 * splat.waveFrequency;
    
    // Draw metallic splat with enhanced effects
    ctx.save();
    ctx.globalAlpha = splat.opacity;
    
    // Create rich gradient for the splat with enhanced metallic effect
    const r = splat.color.r, g = splat.color.g, b = splat.color.b;
    const baseColor = `rgb(${r},${g},${b})`;
    const lightColor = `rgb(${Math.min(255, r+20)},${Math.min(255, g+15)},${Math.min(255, b+10)})`;
    const darkColor = `rgb(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)})`;
    const darkerColor = `rgb(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-50)})`;
    
    // Add subtle shadow first for depth
    if (renderQuality !== 'low') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      drawPremiumChocolateSplat(ctx, splat.x + 1, splat.y + 1, splat.currentSize * 1.02);
    }
    
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
    
    // Draw chocolate splat with wave effect
    const waveEffect = splat.waveAmplitude * Math.sin(splat.wavePhase);
    drawPremiumChocolateSplat(ctx, splat.x, splat.y, splat.currentSize * (1 + waveEffect));
    
    // Add texture to the splat based on the assigned pattern
    if ((renderQuality === 'high' || renderQuality === 'ultra') && splat.currentSize > 10) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.15;
      
      // Create clip region
      ctx.beginPath();
      drawPremiumChocolateSplat(ctx, splat.x, splat.y, splat.currentSize * 0.98);
      ctx.clip();
      
      // Apply texture from cache if available
      const textureKey = `pattern_${splat.texture}`;
      if (textureCache[textureKey]) {
        ctx.drawImage(
          textureCache[textureKey],
          splat.x - splat.currentSize,
          splat.y - splat.currentSize,
          splat.currentSize * 2,
          splat.currentSize * 2
        );
      }
      
      ctx.restore();
    }
    
    // Add glossy highlights with enhanced metallic effect
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
    
    // More dynamic highlight with rotation based on time
    const rotatedAngle = splat.reflectionAngle + elapsed * 0.2;
    ctx.ellipse(
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      splat.currentSize*0.3, 
      splat.currentSize*0.2, 
      rotatedAngle, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add secondary highlights (bubbles) for enhanced metallic effect
    if (renderQuality !== 'low') {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      
      // Add more highlights for higher quality
      const highlightCount = renderQuality === 'ultra' ? 5 : 3;
      
      for (let j = 0; j < highlightCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = splat.currentSize * (0.3 + Math.random() * 0.3);
        const x = splat.x + Math.cos(angle) * dist;
        const y = splat.y + Math.sin(angle) * dist;
        const bubbleSize = splat.currentSize * (0.05 + Math.random() * 0.08);
        
        ctx.beginPath();
        ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Add texture details simulating premium chocolate surface
    if (renderQuality === 'high' || renderQuality === 'ultra') {
      ctx.strokeStyle = darkerColor;
      ctx.lineWidth = Math.max(1, splat.currentSize * 0.02);
      ctx.globalAlpha = 0.2;
      
      // Add chocolate texture details - more for higher quality
      const detailCount = renderQuality === 'ultra' ? 7 : 5;
      
      for (let j = 0; j < detailCount; j++) {
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
    }
    
    // Add tiny droplets around the splat for extra realism
    if (splat.hasDroplets && (renderQuality === 'high' || renderQuality === 'ultra')) {
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = splat.opacity * 0.8;
      
      for (let j = 0; j < splat.dropletCount; j++) {
        const dropAngle = Math.random() * Math.PI * 2;
        const dropDist = splat.currentSize * (1.05 + Math.random() * 0.3);
        const dropX = splat.x + Math.cos(dropAngle) * dropDist;
        const dropY = splat.y + Math.sin(dropAngle) * dropDist;
        const dropSize = splat.currentSize * (0.03 + Math.random() * 0.05);
        
        // Draw droplet
        ctx.beginPath();
        ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add tiny highlight to droplet
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(
          dropX - dropSize * 0.3, 
          dropY - dropSize * 0.3, 
          dropSize * 0.4, 
          0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = baseColor;
      }
    }
    
    ctx.restore();
  }
}

function createBubbles(centerX, centerY, radius) {
  // Create bubbles for premium visual effect
  const bubbleCount = renderQuality === 'ultra' ? 25 : 
                     renderQuality === 'high' ? 15 :
                     renderQuality === 'medium' ? 8 : 5;
                     
  for (let i = 0; i < bubbleCount; i++) {
    // Distribute bubbles in a circular pattern with some randomization
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.8;
    
    // Select color from chocolate palette
    const colorIndex = Math.floor(Math.random() * CHOCOLATE_COLORS.length);
    const color = CHOCOLATE_COLORS[colorIndex];
    
    // Add bubble with size variation
    chocolateBubbles.push({
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      size: 3 + Math.random() * 10,
      maxSize: 5 + Math.random() * 15,
      growRate: 0.1 + Math.random() * 0.2,
      color,
      opacity: 0.1 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
      direction: {
        x: (Math.random() - 0.5) * 0.5,
        y: -0.2 - Math.random() * 0.3 // Upward bias
      },
      wobble: {
        amount: Math.random() * 0.5,
        speed: 0.03 + Math.random() * 0.05,
        phase: Math.random() * Math.PI * 2
      },
      lifetime: 0.7 + Math.random() * 0.3,
      age: 0,
      popSize: 0,
      popping: false,
      highlights: [
        {
          size: Math.random() * 0.3 + 0.15,
          offset: { x: -0.3, y: -0.3 },
          opacity: 0.6 + Math.random() * 0.3
        },
        {
          size: Math.random() * 0.2 + 0.1,
          offset: { x: 0.2, y: -0.1 },
          opacity: 0.4 + Math.random() * 0.3
        }
      ]
    });
  }
}

function drawBubbles(ctx, deltaTime, progress) {
  const deadBubbles = [];
  
  for (let i = 0; i < chocolateBubbles.length; i++) {
    const bubble = chocolateBubbles[i];
    
    // Update age
    bubble.age += deltaTime * 0.016;
    
    // Update bubble size - grow then stabilize
    if (!bubble.popping) {
      const growProgress = Math.min(1, bubble.age * bubble.growRate);
      bubble.size = bubble.maxSize * growProgress;
    }
    
    // Check if bubble should pop based on lifetime
    if (bubble.age > bubble.lifetime && !bubble.popping) {
      bubble.popping = true;
      bubble.popSize = bubble.size;
    }
    
    // Handle popping animation
    if (bubble.popping) {
      // Shrink and fade out
      bubble.size *= 1.2; // Expand slightly
      bubble.opacity *= 0.7; // Fade quickly
      
      if (bubble.opacity < 0.02) {
        deadBubbles.push(i);
        continue;
      }
    }
    
    // Update position with wobble
    bubble.phase += bubble.speed * deltaTime;
    bubble.wobble.phase += bubble.wobble.speed * deltaTime;
    
    const wobbleX = Math.cos(bubble.wobble.phase) * bubble.wobble.amount;
    const wobbleY = Math.sin(bubble.wobble.phase * 1.3) * bubble.wobble.amount;
    
    bubble.x += (bubble.direction.x + wobbleX) * deltaTime;
    bubble.y += (bubble.direction.y + wobbleY) * deltaTime;
    
    // Draw bubble
    ctx.save();
    
    // Draw bubble shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(bubble.x + 1, bubble.y + 1, bubble.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Create rich bubble gradient with chocolate color
    const r = bubble.color.r;
    const g = bubble.color.g;
    const b = bubble.color.b;
    
    const bubbleGradient = ctx.createRadialGradient(
      bubble.x, bubble.y, 0,
      bubble.x, bubble.y, bubble.size
    );
    
    // Create richer, more translucent gradient
    bubbleGradient.addColorStop(0, `rgba(${r+30},${g+20},${b+10},${bubble.opacity})`);
    bubbleGradient.addColorStop(0.7, `rgba(${r},${g},${b},${bubble.opacity * 0.9})`);
    bubbleGradient.addColorStop(1, `rgba(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)},${bubble.opacity * 0.7})`);
    
    ctx.fillStyle = bubbleGradient;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlights
    for (const highlight of bubble.highlights) {
      ctx.fillStyle = `rgba(255,255,255,${highlight.opacity * bubble.opacity})`;
      ctx.beginPath();
      ctx.arc(
        bubble.x + highlight.offset.x * bubble.size,
        bubble.y + highlight.offset.y * bubble.size,
        bubble.size * highlight.size,
        0, Math.PI * 2
      );
      ctx.fill();
    }
    // Add ring for popping effect
    if (bubble.popping) {
      ctx.strokeStyle = `rgba(${r},${g},${b},${bubble.opacity * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.size * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add tiny droplets when popping
      if (renderQuality === 'high' || renderQuality === 'ultra') {
        ctx.fillStyle = `rgba(${r},${g},${b},${bubble.opacity})`;
        
        const droplets = renderQuality === 'ultra' ? 5 : 3;
        for (let d = 0; d < droplets; d++) {
          const dropAngle = Math.random() * Math.PI * 2;
          const dropDist = bubble.size * (1.1 + Math.random() * 0.3);
          const dropSize = bubble.size * (0.1 + Math.random() * 0.15);
          
          ctx.beginPath();
          ctx.arc(
            bubble.x + Math.cos(dropAngle) * dropDist,
            bubble.y + Math.sin(dropAngle) * dropDist,
            dropSize,
            0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    
    // Subtle edge ring for realism
    ctx.strokeStyle = `rgba(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)},${bubble.opacity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Remove dead bubbles
  for (let i = deadBubbles.length - 1; i >= 0; i--) {
    chocolateBubbles.splice(deadBubbles[i], 1);
  }
  
  // Add new bubbles occasionally
  if (Math.random() < 0.05 * deltaTime && progress < 0.7 && 
      chocolateBubbles.length < (renderQuality === 'ultra' ? 30 : 15)) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    createBubbles(width/2, height/2, Math.min(width, height) * 0.2);
  }
}

function drawPremiumChocolateSplash(ctx, width, height, progress) {
  if (progress < 0.05) return;
  
  // Enhanced premium chocolate splash parameters
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.3;
  
  // Calculate splash size based on progress with professional animation curve
  let splashProgress = Math.min(1, (progress - 0.05) * 3);
  
  // Use more sophisticated animation curve with slight overshoot and settle
  // Creating a premium feel with subtle dynamics
  const animCurve = splashProgress < 0.6 ? 
    (1.1 * Math.sin(splashProgress * Math.PI * 0.7)) : 
    (1 - 0.2 * Math.pow(1 - splashProgress, 2) + 0.05 * Math.sin(splashProgress * 20));
  
  const currentRadius = maxRadius * Math.min(1, animCurve);
  
  if (currentRadius <= 0) return;
  
  // Draw premium splash with enhanced metallic effect
  ctx.save();
  
  // Create premium metallic splash gradient with richer colors
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, currentRadius
  );
  
  // Premium chocolate gradient with richer colors and metallic effect
  gradient.addColorStop(0, 'rgba(160, 100, 50, 0.95)');
  gradient.addColorStop(0.3, 'rgba(130, 75, 40, 0.9)');
  gradient.addColorStop(0.6, 'rgba(110, 65, 35, 0.85)');
  gradient.addColorStop(0.8, 'rgba(90, 50, 30, 0.7)');
  gradient.addColorStop(1, 'rgba(70, 40, 25, 0)');
  
  ctx.fillStyle = gradient;
  
  // Draw enhanced splash shape with premium detail
  const numPoints = renderQuality === 'low' ? 16 : 
                   renderQuality === 'medium' ? 24 : 
                   renderQuality === 'high' ? 32 : 36;
                   
  const baseRadius = currentRadius;
  
  ctx.beginPath();
  
  // Create more detailed, organic splash shape with premium appearance
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More complex wave pattern for premium organic feel
    const wavePhase1 = progress * 12 + i;
    const wavePhase2 = progress * 18 + i * 1.5;
    const wavePhase3 = progress * 7 + i * 0.8; // Added third frequency
    
    // Use multiple sine waves for more organic luxury shape
    const waveAmplitude1 = Math.min(0.25, progress * 0.5);
    const waveAmplitude2 = Math.min(0.15, progress * 0.3);
    const waveAmplitude3 = Math.min(0.1, progress * 0.2); // Added third amplitude
    
    const waveFactor = 1 + 
                     Math.sin(wavePhase1) * waveAmplitude1 + 
                     Math.sin(wavePhase2) * waveAmplitude2 + 
                     Math.sin(wavePhase3) * waveAmplitude3;
    
    const radius = baseRadius * waveFactor;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Create more organic curves between points - using bezier for premium smoothness
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
  
  // Draw texture overlay for premium chocolate appearance
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.15;
    
    // Create clip region
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius * 0.95, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Apply texture from cache for better performance
    if (textureCache['pattern_flaked']) {
      // Use tiled approach for better quality on large splashes
      const texSize = 256;
      const tilesX = Math.ceil(currentRadius * 2 / texSize);
      const tilesY = Math.ceil(currentRadius * 2 / texSize);
      
      for (let tx = -Math.floor(tilesX/2); tx <= Math.ceil(tilesX/2); tx++) {
        for (let ty = -Math.floor(tilesY/2); ty <= Math.ceil(tilesY/2); ty++) {
          ctx.drawImage(
            textureCache['pattern_flaked'],
            centerX - currentRadius + tx * texSize,
            centerY - currentRadius + ty * texSize,
            texSize, texSize
          );
        }
      }
    }
    
    ctx.restore();
  }
  
  // Draw enhanced premium splash highlights with dynamic lighting
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
  
  // More highlights for higher quality
  const highlightCount = renderQuality === 'low' ? 3 : 
                       renderQuality === 'medium' ? 5 : 
                       renderQuality === 'high' ? 7 : 10;
                       
  for (let i = 0; i < highlightCount; i++) {
    const angle = i * Math.PI * 2 / highlightCount + progress * 3;
    const distance = currentRadius * (0.4 + Math.random() * 0.3);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const size = currentRadius * (0.04 + Math.random() * 0.08);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add premium chocolate droplets/particles around splash
  if (progress > 0.2 && progress < 0.9) {
    const dropletCount = Math.floor(12 * splashProgress * (renderQuality === 'ultra' ? 1.5 : 1.0));
    const dropletOpacity = 0.95 - progress * 0.4;
    
    for (let i = 0; i < dropletCount; i++) {
      const angle = (i / dropletCount) * Math.PI * 2 + progress * 5;
      const distance = currentRadius * (1.1 + progress * 0.5 + Math.random() * 0.2);
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 3 + Math.random() * 10;
      
      // Create circular droplet with premium gradient
      const dropGradient = ctx.createRadialGradient(
        x - size * 0.2, y - size * 0.2, 0,
        x, y, size
      );
      
      dropGradient.addColorStop(0, `rgba(150, 90, 45, ${dropletOpacity})`);
      dropGradient.addColorStop(0.5, `rgba(130, 80, 40, ${dropletOpacity})`);
      dropGradient.addColorStop(0.8, `rgba(100, 60, 35, ${dropletOpacity})`);
      dropGradient.addColorStop(1, `rgba(75, 45, 25, ${dropletOpacity * 0.8})`);
      
      ctx.fillStyle = dropGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Droplet highlight - premium metallic effect
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
      
      // Add small satellite splashes with premium metallic effect
      if (Math.random() < 0.3 && size > 6 && (renderQuality === 'high' || renderQuality === 'ultra')) {
        const splashCount = 2 + Math.floor(Math.random() * 3);
        
        for (let j = 0; j < splashCount; j++) {
          const splashAngle = Math.random() * Math.PI * 2;
          const splashDist = size * (1.2 + Math.random() * 0.8);
          const splashX = x + Math.cos(splashAngle) * splashDist;
          const splashY = y + Math.sin(splashAngle) * splashDist;
          const splashSize = size * (0.2 + Math.random() * 0.3);
          
          // Create premium metallic gradient for small splash
          const smallSplashGradient = ctx.createRadialGradient(
            splashX, splashY, 0,
            splashX, splashY, splashSize
          );
          
          smallSplashGradient.addColorStop(0, `rgba(140, 85, 45, ${dropletOpacity * 0.9})`);
          smallSplashGradient.addColorStop(0.7, `rgba(110, 65, 35, ${dropletOpacity * 0.7})`);
          smallSplashGradient.addColorStop(1, `rgba(80, 45, 25, ${dropletOpacity * 0.5})`);
          
          ctx.fillStyle = smallSplashGradient;
          ctx.beginPath();
          drawPremiumChocolateSplat(ctx, splashX, splashY, splashSize * 2);
        }
      }
    }
  }
  
  // Add subtle edge ring for premium definition and depth
  if (renderQuality !== 'low') {
    ctx.strokeStyle = 'rgba(60, 35, 20, 0.2)';
    ctx.lineWidth = Math.max(1, currentRadius * 0.01);
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius * 0.97, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawDynamicChocolateDrips(ctx, width, height, progress, deltaTime) {
  // Process existing drips
  const deadDrips = [];
  
  for (let i = 0; i < chocolateDrips.length; i++) {
    const drip = chocolateDrips[i];
    
    // Update drip state
    drip.age += deltaTime * 0.06;
    
    // Update phase for wobble and animation
    drip.phase += drip.speed * deltaTime;
    
    // Update drip length based on age
    const lengthProgress = Math.min(1, drip.age / drip.growTime);
    drip.currentLength = drip.maxLength * easeOutCubic(lengthProgress);
    
    // Apply gravity and stretching to the drip
    if (drip.age > drip.growTime) {
      // Drip stretching and possible breaking
      drip.stretch += drip.gravity * deltaTime;
      drip.currentLength *= (1 + drip.stretch * 0.1);
      
      // Check if drip should break into a droplet
      if (drip.stretch > drip.breakThreshold) {
        // Create a droplet where the drip breaks
        addDroplet(drip);
        deadDrips.push(i);
        continue;
      }
    }
    
    // Apply fading at end of lifetime
    if (drip.age > drip.lifetime * 0.7) {
      const fadeProgress = (drip.age - drip.lifetime * 0.7) / (drip.lifetime * 0.3);
      drip.opacity = Math.max(0, 1 - fadeProgress);
      
      if (drip.opacity <= 0.02) {
        deadDrips.push(i);
        continue;
      }
    }
    
    // Draw drip
    drawSingleDrip(ctx, drip);
  }
  
  // Remove dead drips
  for (let i = deadDrips.length - 1; i >= 0; i--) {
    chocolateDrips.splice(deadDrips[i], 1);
  }
  
  // Possibly add new drips
  if (progress > 0.1 && progress < 0.8) {
    const dripProbability = 0.03 * deltaTime * (progress < 0.4 ? 2 : 1);
    
    // Limit total drip count based on quality
    const maxDrips = renderQuality === 'ultra' ? 20 : 
                    renderQuality === 'high' ? 15 :
                    renderQuality === 'medium' ? 10 : 6;
    
    if (Math.random() < dripProbability && chocolateDrips.length < maxDrips) {
      // Create new drip
      addNewDrip(ctx, width, height, progress);
    }
  }
}

function addNewDrip(ctx, width, height, progress) {
  // Place drip at strategic locations
  let x, y;
  
  if (Math.random() < 0.6) {
    // Place along top edge with concentration in middle
    x = width * (0.2 + Math.random() * 0.6);
    y = height * (0.1 + Math.random() * 0.2);
  } else {
    // Place around the splash center
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(width, height) * 0.2 * (0.8 + Math.random() * 0.4);
    x = width/2 + Math.cos(angle) * distance;
    y = height/2 + Math.sin(angle) * distance;
  }
  
  // Select chocolate color with slight variation
  const colorIndex = Math.floor(Math.random() * 5) + 3; // Primarily milk chocolate colors
  const baseColor = CHOCOLATE_COLORS[Math.min(colorIndex, CHOCOLATE_COLORS.length - 1)];
  
  // Add variation for realism
  const colorVar = 15;
  const color = {
    r: Math.max(0, Math.min(255, baseColor.r + (Math.random() - 0.5) * colorVar)),
    g: Math.max(0, Math.min(255, baseColor.g + (Math.random() - 0.5) * colorVar)),
    b: Math.max(0, Math.min(255, baseColor.b + (Math.random() - 0.5) * colorVar)),
    a: baseColor.a
  };
  
  // Create the drip with physics properties
  chocolateDrips.push({
    x,
    y,
    width: 7 + Math.random() * 8,
    maxLength: 50 + Math.random() * 150,
    currentLength: 0,
    color,
    direction: Math.PI/2 + (Math.random() - 0.5) * 0.4, // Mostly downward
    age: 0,
    growTime: 0.5 + Math.random() * 1.0,
    lifetime: 2 + Math.random() * 3,
    opacity: 1.0,
    phase: Math.random() * Math.PI * 2,
    speed: 0.05 + Math.random() * 0.1,
    wobbleAmount: 0.1 + Math.random() * 0.2,
    wobbleFrequency: 3 + Math.random() * 5,
    gravity: 0.05 + Math.random() * 0.1,
    stretch: 0,
    breakThreshold: 0.8 + Math.random() * 0.6,
    // Bezier control points for curved path
    controlPoints: [
      { x: 0, y: 0.3 + Math.random() * 0.2 }, // First control point relative distance
      { x: 0, y: 0.6 + Math.random() * 0.3 }  // Second control point relative distance
    ],
    // Texture and detail
    texture: Object.values(TEXTURE_PATTERNS)[Math.floor(Math.random() * 3)],
    highlights: [{
      offsetX: -0.3 + Math.random() * 0.1,
      offsetY: 0.1 + Math.random() * 0.3,
      width: 0.3 + Math.random() * 0.2,
      opacity: 0.3 + Math.random() * 0.3
    }],
    bulgeVariation: 0.1 + Math.random() * 0.2,
    bulgeFrequency: 10 + Math.random() * 20
  });
}

function addDroplet(drip) {
  // Create a droplet where the drip breaks off
  const dropletX = drip.x + Math.cos(drip.direction) * drip.currentLength;
  const dropletY = drip.y + Math.sin(drip.direction) * drip.currentLength;
  
  // Determine fall distance
  const canvasHeight = ctx.canvas.height;
  const fallDistance = canvasHeight - dropletY;
  
  // Add a splat where the droplet would land
  if (fallDistance > 20 && fallDistance < canvasHeight && Math.random() < 0.7) {
    const splatSize = drip.width * (2 + Math.random() * 2);
    
    // Calculate fall time based on physics (simplified)
    const fallTime = Math.sqrt(fallDistance / 300) * 0.3; // seconds
    
    addPremiumChocolateSplat(
      dropletX + (Math.random() - 0.5) * 20, // Some horizontal drift
      canvasHeight - 5 - Math.random() * 10,
      splatSize,
      fallTime
    );
  }
}

function drawSingleDrip(ctx, drip) {
  ctx.save();
  
  // Set transparency
  ctx.globalAlpha = drip.opacity;
  
  // Create base color and derived colors
  const r = drip.color.r, g = drip.color.g, b = drip.color.b;
  const baseColor = `rgb(${r},${g},${b})`;
  const lightColor = `rgb(${Math.min(255, r+20)},${Math.min(255, g+15)},${Math.min(255, b+10)})`;
  const darkColor = `rgb(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)})`;
  
  // Calculate drip path with wobble
  const wobble = Math.sin(drip.phase * drip.wobbleFrequency) * drip.wobbleAmount;
  
  // Calculate the end point
  const endX = drip.x + Math.cos(drip.direction + wobble) * drip.currentLength;
  const endY = drip.y + Math.sin(drip.direction + wobble) * drip.currentLength;
  
  // Calculate control points for bezier curve
  const cp1x = drip.x + Math.cos(drip.direction + wobble*0.5) * drip.currentLength * drip.controlPoints[0].y;
  const cp1y = drip.y + Math.sin(drip.direction + wobble*0.5) * drip.currentLength * drip.controlPoints[0].y;
  
  const cp2x = drip.x + Math.cos(drip.direction + wobble*0.2) * drip.currentLength * drip.controlPoints[1].y;
  const cp2y = drip.y + Math.sin(drip.direction + wobble*0.2) * drip.currentLength * drip.controlPoints[1].y;
  
  // Create subtle shadow first for depth
  if (renderQuality !== 'low') {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    
    // Draw shadow shape
    ctx.beginPath();
    
    // Top width with slight expansion for bulging effect
    const topBulge = 1 + Math.sin(drip.phase * 5) * drip.bulgeVariation;
    const topWidth = drip.width * topBulge;
    
    // Draw the top of the drip (connecting to the surface)
    ctx.moveTo(drip.x - topWidth/2 + 1, drip.y + 1);
    ctx.lineTo(drip.x + topWidth/2 + 1, drip.y + 1);
    
    // Draw the right side of the drip
    const bottomWidth = Math.max(1, drip.width * (0.3 + drip.stretch * 0.1));
    
    // Use bezier curve for right side
    ctx.bezierCurveTo(
      drip.x + topWidth/2 + 1, cp1y + 1,
      endX + bottomWidth/2 + 1, cp2y + 1,
      endX + bottomWidth/2 + 1, endY + 1
    );
    
    // Draw bulbous bottom
    ctx.arc(endX + 1, endY + 1, bottomWidth/2, 0, Math.PI, true);
    
    // Draw the left side of the drip
    ctx.bezierCurveTo(
      endX - bottomWidth/2 + 1, cp2y + 1,
      drip.x - topWidth/2 + 1, cp1y + 1,
      drip.x - topWidth/2 + 1, drip.y + 1
    );
    
    ctx.closePath();
    ctx.fill();
  }
  
  // Create gradient for main drip
  const dripGradient = ctx.createLinearGradient(
    drip.x, drip.y,
    endX, endY
  );
  
  // Create rich chocolate color gradient
  dripGradient.addColorStop(0, lightColor);
  dripGradient.addColorStop(0.3, baseColor);
  dripGradient.addColorStop(0.7, baseColor);
  dripGradient.addColorStop(1, darkColor);
  
  ctx.fillStyle = dripGradient;
  
  // Draw drip shape
  ctx.beginPath();
  
  // Top width with bulging effect
  const topBulge = 1 + Math.sin(drip.phase * 5) * drip.bulgeVariation;
  const topWidth = drip.width * topBulge;
  
  // Draw the top of the drip (connecting to the surface)
  ctx.moveTo(drip.x - topWidth/2, drip.y);
  ctx.lineTo(drip.x + topWidth/2, drip.y);
  
  // Draw the right side of the drip
  const bottomWidth = Math.max(1, drip.width * (0.3 + drip.stretch * 0.1));
  
  // Use bezier curve for right side
  ctx.bezierCurveTo(
    drip.x + topWidth/2, cp1y,
    endX + bottomWidth/2, cp2y,
    endX + bottomWidth/2, endY
  );
  
  // Draw bulbous bottom
  ctx.arc(endX, endY, bottomWidth/2, 0, Math.PI, true);
  
  // Draw the left side of the drip
  ctx.bezierCurveTo(
    endX - bottomWidth/2, cp2y,
    drip.x - topWidth/2, cp1y,
    drip.x - topWidth/2, drip.y
  );
  
  ctx.closePath();
  ctx.fill();
  
  // Add texture if high quality
  if ((renderQuality === 'high' || renderQuality === 'ultra') && drip.currentLength > 20) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.15;
    
    // Create clip region
    ctx.beginPath();
    
    // Redraw the drip shape for clipping
    ctx.moveTo(drip.x - topWidth/2, drip.y);
    ctx.lineTo(drip.x + topWidth/2, drip.y);
    
    ctx.bezierCurveTo(
      drip.x + topWidth/2, cp1y,
      endX + bottomWidth/2, cp2y,
      endX + bottomWidth/2, endY
    );
    
    ctx.arc(endX, endY, bottomWidth/2, 0, Math.PI, true);
    
    ctx.bezierCurveTo(
      endX - bottomWidth/2, cp2y,
      drip.x - topWidth/2, cp1y,
      drip.x - topWidth/2, drip.y
    );
    
    ctx.closePath();
    ctx.clip();
    
    // Apply texture from cache if available
    const textureKey = `pattern_${drip.texture}`;
    if (textureCache[textureKey]) {
      // Calculate texture positioning
      const texPosX = drip.x - drip.width;
      const texPosY = drip.y;
      const texWidth = drip.width * 2;
      const texHeight = drip.currentLength;
      
      ctx.drawImage(
        textureCache[textureKey],
        texPosX, texPosY,
        texWidth, texHeight
      );
    }
    
    ctx.restore();
  }
  
  // Add highlight for glossiness
  if (renderQuality !== 'low') {
    for (const highlight of drip.highlights) {
      // Create highlight gradient
      const hlGradient = ctx.createLinearGradient(
        drip.x + highlight.offsetX * drip.width, drip.y,
        drip.x + highlight.offsetX * drip.width, drip.y + drip.currentLength * 0.7
      );
      
      hlGradient.addColorStop(0, `rgba(255,255,255,${highlight.opacity})`);
      hlGradient.addColorStop(0.7, `rgba(255,255,255,${highlight.opacity * 0.3})`);
      hlGradient.addColorStop(1, `rgba(255,255,255,0)`);
      
      ctx.fillStyle = hlGradient;
      
      // Draw highlight
      ctx.beginPath();
      ctx.ellipse(
        drip.x + highlight.offsetX * drip.width,
        drip.y + highlight.offsetY * drip.currentLength,
        drip.width * highlight.width * 0.5,
        drip.currentLength * 0.4,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Add droplet highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(
      endX - bottomWidth * 0.15,
      endY - bottomWidth * 0.15,
      bottomWidth * 0.25,
      0, Math.PI * 2
    );
    ctx.fill();
  }
  
  // Add small perturbing ripples along the drip for ultra quality
  if (renderQuality === 'ultra' && drip.currentLength > 30) {
    const rippleCount = 3 + Math.floor(drip.currentLength / 30);
    
    for (let i = 1; i < rippleCount; i++) {
      const pos = i / rippleCount;
      const rippleX = drip.x + (endX - drip.x) * pos;
      const rippleY = drip.y + (endY - drip.y) * pos;
      
      // Width at this position (tapering)
      const widthAtPos = drip.width * (1 - pos * 0.7);
      
      // Add small bulge
      const bulgePhase = drip.phase * drip.bulgeFrequency + i * Math.PI;
      const bulgeAmount = Math.sin(bulgePhase) * drip.bulgeVariation;
      
      if (bulgeAmount > 0) {
        const bulgeSize = widthAtPos * (0.2 + bulgeAmount * 0.5);
        
        // Draw bulge
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        
        // Position bulge with slight randomization
        const bulgeAngle = Math.PI/2 + (Math.random() - 0.5) * 0.5; // Mostly to the side
        const bulgeOffsetX = Math.cos(bulgeAngle) * widthAtPos * 0.6;
        const bulgeOffsetY = Math.sin(bulgeAngle) * widthAtPos * 0.1;
        
        ctx.arc(
          rippleX + bulgeOffsetX,
          rippleY + bulgeOffsetY,
          bulgeSize,
          0, Math.PI * 2
        );
        ctx.fill();
        
        // Add highlight to bulge
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(
          rippleX + bulgeOffsetX - bulgeSize * 0.3,
          rippleY + bulgeOffsetY - bulgeSize * 0.3,
          bulgeSize * 0.3,
          0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }
  
  ctx.restore();
}

function drawHeatEffect(ctx, width, height, progress) {
  ctx.save();
  
  // Steam/heat rises from center of splash
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Determine intensity based on progress
  const intensity = Math.sin(progress * Math.PI) * 0.5;
  
  // Create a gradient for the heat haze
  const hazeGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, height * 0.4
  );
  
  hazeGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.2})`);
  hazeGradient.addColorStop(0.3, `rgba(255, 240, 220, ${intensity * 0.1})`);
  hazeGradient.addColorStop(0.7, `rgba(220, 200, 180, ${intensity * 0.05})`);
  hazeGradient.addColorStop(1, `rgba(200, 180, 160, 0)`);
  
  // Draw base haze
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = hazeGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, height * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw rising steam particles for higher quality settings
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    const particleCount = renderQuality === 'ultra' ? 20 : 12;
    
    ctx.globalCompositeOperation = 'screen';
    
    for (let i = 0; i < particleCount; i++) {
      // Calculate particle position
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * height * 0.3;
      
      // Add vertical rise bias
      const verticalBias = Math.random() * height * 0.2 * progress;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance - verticalBias;
      
      // Particle size and opacity
      const size = 5 + Math.random() * 15;
      const particleOpacity = (0.1 + Math.random() * 0.1) * intensity;
      
      // Create particle gradient
      const particleGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, size
      );
      
      particleGradient.addColorStop(0, `rgba(255, 250, 240, ${particleOpacity})`);
      particleGradient.addColorStop(0.5, `rgba(240, 230, 220, ${particleOpacity * 0.7})`);
      particleGradient.addColorStop(1, `rgba(220, 210, 200, 0)`);
      
      ctx.fillStyle = particleGradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add subtle heat distortion
    if (renderQuality === 'ultra') {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.05;
      
      // Use perlin noise texture for heat distortion
      if (textureCache['noise_128_0.1']) {
        // Position with animation
        const offsetX = Math.sin(progress * 5) * 10;
        const offsetY = -progress * 30; // Rising effect
        
        ctx.drawImage(
          textureCache['noise_128_0.1'],
          centerX - 150 + offsetX,
          centerY - 150 + offsetY,
          300, 300
        );
      }
    }
  }
  
  ctx.restore();
}

function updateAndDrawMetallicChocolates(ctx, deltaTime, progress) {
  // Sort chocolates by size for better visual layering
  chocolates.sort((a, b) => a.size - b.size);
  
  const deadChocolates = [];
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
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
    
    // Store previous position for trail
    if (choc.maxTrailLength > 0 && frameCount % 2 === 0) {
      choc.trail.push({
        x: choc.x,
        y: choc.y,
        rotation: choc.rotation,
        opacity: choc.opacity * choc.trailOpacity
      });
      
      // Limit trail length
      if (choc.trail.length > choc.maxTrailLength) {
        choc.trail.shift();
      }
    }
    
    // Apply enhanced physics
    // Apply non-linear gravity increase for better arc
    choc.vy += choc.gravity * deltaTime * (1 + choc.vy * 0.01);
    
    // Air resistance increases with velocity for more realism
    const speed = Math.sqrt(choc.vx * choc.vx + choc.vy * choc.vy);
    const dragFactor = 1 - (choc.drag * deltaTime * (1 + speed * 0.01));
    
    choc.vx *= dragFactor;
    choc.vy *= dragFactor;
    
    // Apply wobble for floating effect
    choc.wobble += choc.wobbleSpeed * deltaTime;
    const wobbleEffect = Math.sin(choc.wobble) * choc.wobbleAmount;
    
    // Update position with wobble
    choc.x += (choc.vx + wobbleEffect) * deltaTime;
    choc.y += choc.vy * deltaTime;
    
    // Simulate melting effect with improved animation
    if (adjustedProgress > 0.6) {
      const meltRate = choc.meltFactor * deltaTime * (1 + (adjustedProgress - 0.6) * 2);
      choc.size -= meltRate;
      
      if (choc.size < 1) {
        choc.opacity = 0;
        deadChocolates.push(i);
        continue;
      }
    }
    
    // Enhanced screen boundary check with bounce and damping
    const radius = choc.size / 2;
    
    // Bounce off edges if not too many bounces yet
    if (choc.bounceCount < choc.maxBounces) {
      if (choc.x - radius < 0) {
        choc.x = radius;
        
        // Apply elasticity with slight energy loss
        choc.vx = Math.abs(choc.vx) * choc.elasticity;
        choc.vx *= 0.9; // Additional damping
        
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce with probability
        if (Math.random() < 0.5) {
          addPremiumChocolateSplat(
            5 + Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      } else if (choc.x + radius > width) {
        choc.x = width - radius;
        
        // Apply elasticity with slight energy loss
        choc.vx = -Math.abs(choc.vx) * choc.elasticity;
        choc.vx *= 0.9; // Additional damping
        
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce with probability
        if (Math.random() < 0.5) {
          addPremiumChocolateSplat(
            width - 5 - Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      }
      
      if (choc.y - radius < 0) {
        choc.y = radius;
        
        // Apply elasticity with slight energy loss
        choc.vy = Math.abs(choc.vy) * choc.elasticity;
        choc.vy *= 0.9; // Additional damping
        
        choc.bounceCount++;
      } else if (choc.y + radius > height) {
        choc.y = height - radius;
        
        // Apply elasticity with slight energy loss
        choc.vy = -Math.abs(choc.vy) * choc.elasticity;
        choc.vy *= 0.8; // More damping on floor
        
        choc.bounceCount++;
        
        // Create a chocolate splat on bounce with floor
        if (Math.random() < 0.7) {
          addPremiumChocolateSplat(
            choc.x,
            height - 2,
            choc.size * (0.8 + Math.random() * 0.7),
            0
          );
        }
      }
    }
    
    // Update rotation with wobble effect
    choc.rotation += (choc.rotationSpeed + Math.sin(choc.wobble) * choc.rotationWobble) * deltaTime;
    
    // Fade out based on lifespan with smooth curve
    if (adjustedProgress > 0.7) {
      const fadeProgress = (adjustedProgress - 0.7) / 0.3;
      const fadeRate = easeInOutCubic(fadeProgress) / (choc.lifespan * 60);
      choc.opacity = Math.max(0, choc.opacity - fadeRate * deltaTime);
    }
    
    // Update reflection angle for dynamic metallic effect
    choc.reflectionAngle = (choc.reflectionAngle + deltaTime * 0.05) % (Math.PI * 2);
    
    // Draw motion trail for higher quality settings
    if (choc.trail.length > 0 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      for (let t = 0; t < choc.trail.length; t++) {
        const trail = choc.trail[t];
        const trailOpacity = trail.opacity * (t / choc.trail.length);
        
        if (trailOpacity > 0.01) {
          drawChocolate(ctx, choc, trail.x, trail.y, trail.rotation, trailOpacity);
        }
      }
    }
    
    // Draw the chocolate
    drawChocolate(ctx, choc, choc.x, choc.y, choc.rotation, choc.opacity);
  }
  
  // Remove dead chocolates in reverse order to avoid index issues
  for (let i = deadChocolates.length - 1; i >= 0; i--) {
    chocolates.splice(deadChocolates[i], 1);
  }
}

function drawChocolate(ctx, choc, x, y, rotation, opacity) {
  // Get color key
  const colorKey = `rgb(${choc.color.r},${choc.color.g},${choc.color.b})`;
  
  // Find closest size key for LOD selection
  let sizeKey = '1';
  if (choc.size > 2) sizeKey = '2';
  if (choc.size > 4) sizeKey = '4';
  if (choc.size > 8) sizeKey = '8';
  if (choc.size > 16) sizeKey = '16';
  if (choc.size > 32) sizeKey = '32';
  
  // Draw chocolate
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Get chocolate prototype
  const prototype = chocolatePrototypes[choc.type][choc.shape][colorKey]?.[sizeKey];
  
  if (prototype) {
    // Draw using pre-rendered prototype for better performance
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const scale = choc.size / parseInt(sizeKey);
    ctx.scale(scale, scale);
    
    ctx.drawImage(
      prototype, 
      -32, 
      -32, 
      64, 
      64
    );
    
    // Add extra dynamic metallic highlights for higher quality modes
    if (renderQuality === 'high' || renderQuality === 'ultra') {
      // Reset transform to add dynamic highlights
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Dynamic highlight based on animation
      const highlightX = x + Math.cos(choc.reflectionAngle) * choc.size * 0.3;
      const highlightY = y + Math.sin(choc.reflectionAngle) * choc.size * 0.3;
      
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
    // Fallback drawing method with dynamic metallic effects
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Create premium metallic colors
    const r = choc.color.r, g = choc.color.g, b = choc.color.b;
    const baseColor = `rgb(${r},${g},${b})`;
    const lightColor = `rgb(${Math.min(255, r+40)},${Math.min(255, g+30)},${Math.min(255, b+20)})`;
    const darkColor = `rgb(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-50)})`;
    
    // Create premium metallic gradient
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
    } else if (choc.shape === CHOCOLATE_SHAPES.HEART) {
      // Draw heart shape
      drawPremiumHeart(ctx, 0, 0, choc.size/2);
      
      // Add highlight
      const highlightGradient = ctx.createRadialGradient(
        -choc.size/4, -choc.size/4, 0,
        0, 0, choc.size/2
      );
      
      highlightGradient.addColorStop(0, "rgba(255,255,255,0.6)");
      highlightGradient.addColorStop(0.3, "rgba(255,255,255,0.2)");
      highlightGradient.addColorStop(0.7, "rgba(255,255,255,0)");
      
      ctx.fillStyle = highlightGradient;
      drawPremiumHeart(ctx, 0, 0, choc.size/2 * 0.95);
    } else {
      // Default to round
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