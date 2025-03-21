// Global constants
const SPARROW_COUNT_MAX = 1000;
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.12;
const GRAVITY_FACTOR = 0.96;
const AIR_RESISTANCE = 0.95;
const DEBUG_MODE = false;

// Sparrow types and variations
const SPARROW_TYPES = {
  CLASSIC: 'classic',
  BLUE: 'blue',
  GOLDEN: 'golden',
  SILVER: 'silver',
  OUTLINE: 'outline',
  GRADIENT: 'gradient'
};

const SPARROW_POSES = {
  FLYING: 'flying',
  GLIDING: 'gliding',
  PERCHED: 'perched',
  SWOOPING: 'swooping',
  FLUTTERING: 'fluttering',
  DIVING: 'diving',
  SOARING: 'soaring',
  LANDING: 'landing'
};

// Enhanced sparrow color palette
const SPARROW_COLORS = [
  { r: 29, g: 161, b: 242, a: 1 },    // Twitter Blue
  { r: 20, g: 120, b: 220, a: 1 },    // Dark Twitter Blue
  { r: 85, g: 172, b: 238, a: 1 },    // Light Twitter Blue
  { r: 0, g: 0, b: 0, a: 1 },         // Black
  { r: 50, g: 50, b: 50, a: 1 },      // Dark Gray
  { r: 80, g: 80, b: 80, a: 1 },      // Medium Gray
  { r: 140, g: 140, b: 140, a: 1 },   // Light Gray
  { r: 255, g: 255, b: 255, a: 1 },   // White
  { r: 225, g: 232, b: 237, a: 1 },   // Light Twitter Gray
  { r: 101, g: 119, b: 134, a: 1 },   // Medium Twitter Gray
  { r: 170, g: 184, b: 194, a: 1 },   // Ultra Light Gray
  { r: 245, g: 248, b: 250, a: 1 },   // Off-White Twitter BG
  { r: 216, g: 180, b: 75, a: 1 }     // Gold for premium sparrows
];

// Wing patterns for enhanced realism
const WING_PATTERNS = {
  SOLID: 'solid',
  GRADIENT: 'gradient',
  STRIPED: 'striped',
  SPOTTED: 'spotted',
  OUTLINED: 'outlined'
};

// Animation state
let canvas = null;
let ctx = null;
let sparrows = [];
let sparrowTrails = [];
let featherParticles = [];
let cloudPuffs = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let sparrowCount = 0;
let performanceLevel = 1.0;
let sparrowPrototypes = {};
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
      
      if (config.hasOwnProperty('maxSparrowCount')) {
        sparrowCount = Math.min(config.maxSparrowCount, SPARROW_COUNT_MAX);
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
        
        // Create optimized sparrow prototypes with enhanced rendering
        createTwitterSparrowPrototypes();
        
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
      sparrows.forEach(bird => {
        // Any cleanup needed for sparrow objects
        if (bird.bitmap && typeof bird.bitmap.close === 'function') {
          bird.bitmap.close();
        }
      });
      
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      sparrows = [];
      sparrowTrails = [];
      featherParticles = [];
      cloudPuffs = [];
      
      // Determine sparrow count based on performance level with more realistic scaling
      sparrowCount = Math.min(
        SPARROW_COUNT_MAX,
        Math.floor(SPARROW_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create sparrows with advanced distribution and variety
      createTwitterSparrows(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine sparrow count based on performance level with scaling
      sparrowCount = Math.min(
        SPARROW_COUNT_MAX, 
        Math.floor(SPARROW_COUNT_MAX * performanceLevel * (renderQuality === 'ultra' ? 1.2 : 
                                                          renderQuality === 'high' ? 1.0 : 
                                                          renderQuality === 'medium' ? 0.7 : 0.4))
      );
      
      // Create sparrows with advanced distribution
      createTwitterSparrows(width, height);
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
    
    // Draw enhanced Twitter burst effect
    drawTwitterSplash(ctx, width, height, progress);
    
    // Draw sparrow trails and feathers
    drawSparrowTrails(ctx, deltaTime);
    
    // Update and draw sparrows with enhanced effects and varied physics
    updateAndDrawSparrows(ctx, deltaTime, progress);
    
    // Draw cloud puffs
    drawCloudPuffs(ctx, deltaTime, progress);
    
    // Add special feather burst effect
    if (progress > 0.1 && progress < 0.9) {
      drawFeatherBurst(ctx, width, height, progress, deltaTime);
    }
    
    // Add background light beam effects
    if (progress > 0.05 && progress < 0.7 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      drawLightBeams(ctx, width, height, progress);
    }
    
    // Check if we need to adjust performance
    if (adaptiveRenderingEnabled && (frameCount % 15 === 0 || currentTime - lastPerformanceCheck > 500)) {
      lastPerformanceCheck = currentTime;
      
      // Calculate FPS using exponential moving average for stability
      const renderTime = perfMonitor.end();
      const instantFPS = 1000 / (rawDeltaTime || 16.67);
      statisticsData.fps = statisticsData.fps * 0.7 + instantFPS * 0.3;
      statisticsData.renderTime = renderTime;
      statisticsData.activeParticles = sparrows.length + sparrowTrails.length + featherParticles.length;
      
      // More intelligent performance adjustment based on both FPS and render time
      if (statisticsData.fps < 30 && performanceLevel > 0.3) {
        // Significant performance issue - make larger adjustment
        performanceLevel = Math.max(0.3, performanceLevel - 0.15);
        
        // Reduce particle count immediately for faster recovery
        if (sparrows.length > 100) {
          // Remove 20% of particles
          const removeCount = Math.floor(sparrows.length * 0.2);
          sparrows.splice(0, removeCount);
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
        sparrowCount: sparrows.length,
        trailCount: sparrowTrails.length,
        featherCount: featherParticles.length,
        cloudCount: cloudPuffs.length,
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
  
  // Create feather texture patterns
  const patternSize = 128;
  for (const pattern of Object.values(WING_PATTERNS)) {
    const patternCanvas = new OffscreenCanvas(patternSize, patternSize);
    const patternCtx = patternCanvas.getContext('2d');
    
    switch (pattern) {
      case WING_PATTERNS.GRADIENT:
        // Create gradient wing texture
        const wingGradient = patternCtx.createLinearGradient(0, 0, patternSize, patternSize);
        wingGradient.addColorStop(0, '#1DA1F2');
        wingGradient.addColorStop(0.5, '#55acee');
        wingGradient.addColorStop(1, '#0084b4');
        
        patternCtx.fillStyle = wingGradient;
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add subtle feather texture
        patternCtx.globalCompositeOperation = 'overlay';
        patternCtx.globalAlpha = 0.3;
        
        for (let i = 0; i < 300; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 1 + Math.random() * 2;
          
          patternCtx.beginPath();
          patternCtx.moveTo(x, y);
          patternCtx.lineTo(x + size*3, y);
          patternCtx.lineTo(x + size*4, y + size);
          patternCtx.lineTo(x, y + size);
          patternCtx.closePath();
          
          patternCtx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.1})`;
          patternCtx.fill();
        }
        break;
        
      case WING_PATTERNS.STRIPED:
        // Create striped wing texture (horizontal lines like feathers)
        patternCtx.fillStyle = '#1DA1F2';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add stripes
        patternCtx.fillStyle = '#55acee';
        for (let i = 0; i < patternSize; i += 5) {
          patternCtx.fillRect(0, i, patternSize, 2);
        }
        
        // Add highlights
        patternCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < patternSize; i += 15) {
          patternCtx.fillRect(0, i, patternSize, 1);
        }
        break;
        
      case WING_PATTERNS.SPOTTED:
        // Create spotted wing texture
        patternCtx.fillStyle = '#1DA1F2';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add spots
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const size = 2 + Math.random() * 6;
          
          patternCtx.fillStyle = Math.random() > 0.5 ? 
            'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)';
            
          patternCtx.beginPath();
          patternCtx.arc(x, y, size, 0, Math.PI * 2);
          patternCtx.fill();
        }
        break;
        
      case WING_PATTERNS.OUTLINED:
        // Create outlined feather texture
        patternCtx.fillStyle = '#1DA1F2';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add feather outlines
        patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        patternCtx.lineWidth = 1;
        
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * patternSize;
          const y = Math.random() * patternSize;
          const width = 10 + Math.random() * 20;
          const height = 5 + Math.random() * 10;
          
          patternCtx.beginPath();
          patternCtx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
          patternCtx.stroke();
          
          // Add feather shaft
          patternCtx.beginPath();
          patternCtx.moveTo(x - width, y);
          patternCtx.lineTo(x + width, y);
          patternCtx.stroke();
        }
        break;
        
      default: // SOLID
        // Create solid colored wing with subtle texture
        patternCtx.fillStyle = '#1DA1F2';
        patternCtx.fillRect(0, 0, patternSize, patternSize);
        
        // Add subtle noise texture
        const imageData = patternCtx.getImageData(0, 0, patternSize, patternSize);
        
        for (let y = 0; y < patternSize; y++) {
          for (let x = 0; x < patternSize; x++) {
            const i = (y * patternSize + x) * 4;
            const noise = (shaderFx.perlinNoise2D(x, y, 0.05) + 1) * 0.5 * 30;
            
            // Slightly modify blue channel for texture
            imageData.data[i+2] = Math.min(255, Math.max(0, imageData.data[i+2] + noise));
          }
        }
        
        patternCtx.putImageData(imageData, 0, 0);
    }
    
    textureCache[`pattern_${pattern}`] = patternCanvas.transferToImageBitmap();
  }
  
  // Create cloud puff texture
  const cloudCanvas = new OffscreenCanvas(128, 128);
  const cloudCtx = cloudCanvas.getContext('2d');
  
  // Create soft cloud gradient
  const cloudGradient = cloudCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  cloudGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
  cloudGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
  cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  cloudCtx.fillStyle = cloudGradient;
  cloudCtx.beginPath();
  cloudCtx.arc(64, 64, 64, 0, Math.PI * 2);
  cloudCtx.fill();
  
  textureCache['cloud_puff'] = cloudCanvas.transferToImageBitmap();
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

function createTwitterSparrowPrototypes() {
  const prototypeCanvas = new OffscreenCanvas(64, 64);
  const prototypeCtx = prototypeCanvas.getContext('2d');
  
  sparrowPrototypes = {};
  
  // Create different sparrow shapes with premium finish and cache them
  for (const type of Object.values(SPARROW_TYPES)) {
    sparrowPrototypes[type] = {};
    
    for (const pose of Object.values(SPARROW_POSES)) {
      sparrowPrototypes[type][pose] = {};
      
      for (const color of SPARROW_COLORS) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create multiple sizes for LOD (Level of Detail)
        for (let size = 1; size <= 32; size *= 2) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 64, 64);
          const halfSize = Math.max(0.5, size / 2); // Ensure minimum half size
          const center = 32;
          
          // Draw the Twitter bird with the pose, color and type
          renderTwitterSparrow(prototypeCtx, center, center, size, pose, color, type);
          
          // Store the prototype
          if (!sparrowPrototypes[type][pose][colorKey]) {
            sparrowPrototypes[type][pose][colorKey] = {};
          }
          sparrowPrototypes[type][pose][colorKey][key] = prototypeCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

function renderTwitterSparrow(ctx, x, y, size, pose, color, type) {
  // Get base color and generate color variants
  const r = color.r, g = color.g, b = color.b;
  const baseColor = `rgb(${r},${g},${b})`;
  
  // Determine secondary colors based on sparrow type
  let secondaryColor, outlineColor, highlightColor;
  
  if (type === SPARROW_TYPES.CLASSIC) {
    // Classic Twitter bird - blue with white outline
    secondaryColor = '#FFFFFF';
    outlineColor = 'rgba(0, 0, 0, 0.2)';
    highlightColor = 'rgba(255, 255, 255, 0.7)';
  } else if (type === SPARROW_TYPES.BLUE) {
    // Blue variations
    secondaryColor = `rgb(${Math.max(0, r-40)},${Math.max(0, g-40)},${Math.max(0, b-40)})`;
    outlineColor = `rgb(${Math.max(0, r-80)},${Math.max(0, g-80)},${Math.max(0, b-80)})`;
    highlightColor = `rgba(${Math.min(255, r+40)},${Math.min(255, g+40)},${Math.min(255, b+40)}, 0.7)`;
  } else if (type === SPARROW_TYPES.GOLDEN) {
    // Gold sparrow
    secondaryColor = '#FFFFFF';
    outlineColor = '#8E7130';
    highlightColor = 'rgba(255, 255, 220, 0.9)';
  } else if (type === SPARROW_TYPES.SILVER) {
    // Silver sparrow
    secondaryColor = '#FFFFFF';
    outlineColor = '#808080';
    highlightColor = 'rgba(255, 255, 255, 0.9)';
  } else if (type === SPARROW_TYPES.OUTLINE) {
    // Outline-only sparrow
    secondaryColor = 'rgba(255, 255, 255, 0.1)';
    outlineColor = baseColor;
    highlightColor = 'rgba(255, 255, 255, 0.5)';
  } else if (type === SPARROW_TYPES.GRADIENT) {
    // Gradient sparrow
    secondaryColor = `rgb(${Math.min(255, r+40)},${Math.min(255, g+40)},${Math.min(255, b+40)})`;
    outlineColor = `rgb(${Math.max(0, r-60)},${Math.max(0, g-60)},${Math.max(0, b-60)})`;
    highlightColor = 'rgba(255, 255, 255, 0.7)';
  } else {
    // Default fallback
    secondaryColor = '#FFFFFF';
    outlineColor = 'rgba(0, 0, 0, 0.2)';
    highlightColor = 'rgba(255, 255, 255, 0.7)';
  }
  
  // Scale for different poses
  let scaleX = 1;
  let scaleY = 1;
  let rotation = 0;
  let wingOffset = 0;
  
  // Define pose characteristics
  switch (pose) {
    case SPARROW_POSES.FLYING:
      // Wings extended
      wingOffset = 0.2;
      break;
    case SPARROW_POSES.GLIDING:
      // Wings fully extended, slightly tilted
      wingOffset = 0.3;
      rotation = -0.1;
      scaleX = 1.1;
      scaleY = 0.9;
      break;
    case SPARROW_POSES.PERCHED:
      // Wings tucked, more vertical
      wingOffset = -0.1;
      scaleX = 0.8;
      scaleY = 1.1;
      rotation = 0.05;
      break;
    case SPARROW_POSES.SWOOPING:
      // Diving position
      wingOffset = 0.15;
      rotation = 0.3;
      scaleX = 0.9;
      scaleY = 1.05;
      break;
    case SPARROW_POSES.FLUTTERING:
      // Wings in movement
      wingOffset = 0.25;
      scaleX = 1.05;
      scaleY = 0.95;
      break;
    case SPARROW_POSES.DIVING:
      // Straight dive
      wingOffset = 0.1;
      rotation = 0.5;
      scaleX = 0.8;
      scaleY = 1.2;
      break;
    case SPARROW_POSES.SOARING:
      // High soaring position
      wingOffset = 0.3;
      rotation = -0.2;
      scaleX = 1.2;
      scaleY = 0.8;
      break;
    case SPARROW_POSES.LANDING:
      // Landing position
      wingOffset = 0.15;
      rotation = -0.05;
      scaleX = 0.95;
      scaleY = 1.05;
      break;
    default:
      // Default to flying
      wingOffset = 0.2;
  }
  
  ctx.save();
  
  // Apply transformations based on pose
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scaleX, scaleY);
  
  // Adjust drawing size
  const halfSize = size / 2;
  
  // Draw bird shadow for depth
  if (renderQuality !== 'low') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    drawTwitterBirdShape(ctx, halfSize, wingOffset, 1.02, 1.02);
  }
  
  // Draw the base shape of the bird
  ctx.fillStyle = baseColor;
  drawTwitterBirdShape(ctx, halfSize, wingOffset);
  
  // Add gradient effects for premium look
  if (type === SPARROW_TYPES.GRADIENT || renderQuality === 'ultra') {
    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, secondaryColor);
    gradient.addColorStop(0.3, baseColor);
    gradient.addColorStop(0.7, baseColor);
    gradient.addColorStop(1, `rgb(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)})`);
    
    ctx.fillStyle = gradient;
    drawTwitterBirdShape(ctx, halfSize, wingOffset, 0.98, 0.98);
  }
  
  // Add outline
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = Math.max(1, size / 10);
  drawTwitterBirdOutline(ctx, halfSize, wingOffset);
  
  // Add wing details and texture
  if (size > 8 && (renderQuality === 'high' || renderQuality === 'ultra')) {
    drawWingDetails(ctx, halfSize, wingOffset, type, pose);
  }
  
  // Add eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-halfSize * 0.1, -halfSize * 0.1, halfSize * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(-halfSize * 0.05, -halfSize * 0.05, halfSize * 0.07, 0, Math.PI * 2);
  ctx.fill();
  
  // Add highlight reflection
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.ellipse(
    -halfSize * 0.3,
    -halfSize * 0.3,
    halfSize * 0.25,
    halfSize * 0.15,
    Math.PI / 4,
    0, Math.PI * 2
  );
  ctx.fill();
  
  // Add additional details based on bird type
  if (type === SPARROW_TYPES.GOLDEN) {
    // Add gold sparkles
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = halfSize * (0.3 + Math.random() * 0.5);
      const sparkSize = halfSize * (0.05 + Math.random() * 0.1);
      
      ctx.fillStyle = 'rgba(255, 255, 180, 0.9)';
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        sparkSize, 0, Math.PI * 2
      );
      ctx.fill();
    }
  } else if (type === SPARROW_TYPES.SILVER) {
    // Add silver shimmer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = halfSize * (0.3 + Math.random() * 0.5);
      const lineLength = halfSize * 0.2;
      
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance
      );
      ctx.lineTo(
        Math.cos(angle) * (distance + lineLength),
        Math.sin(angle) * (distance + lineLength)
      );
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

function drawTwitterBirdShape(ctx, size, wingOffset, scaleX = 1, scaleY = 1) {
  ctx.save();
  ctx.scale(scaleX, scaleY);
  
  // The main body
  ctx.beginPath();
  ctx.moveTo(0, 0);
  
  // Head
  ctx.bezierCurveTo(
    -size * 0.3, -size * 0.4,
    -size * 0.5, -size * 0.3,
    -size * 0.4, 0
  );
  
  // Body
  ctx.bezierCurveTo(
    -size * 0.3, size * 0.1,
    -size * 0.1, size * 0.15,
    size * 0.1, size * 0.1
  );
  
  // Tail
  ctx.bezierCurveTo(
    size * 0.3, size * 0.05,
    size * 0.5, -size * 0.1,
    size * 0.4, -size * 0.3
  );
  
  // Top wing
  const wingPositionY = -size * 0.1 - (wingOffset * size);
  ctx.bezierCurveTo(
    size * 0.2, -size * 0.2,
    size * 0.1, wingPositionY,
    -size * 0.2, wingPositionY
  );
  
  // Connect back to head
  ctx.bezierCurveTo(
    -size * 0.3, wingPositionY,
    -size * 0.3, -size * 0.2,
    0, 0
  );
  
  ctx.closePath();
  ctx.fill();
  
  // The beak
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, 0);
  ctx.bezierCurveTo(
    -size * 0.4, 0,
    -size * 0.5, size * 0.05,
    -size * 0.6, size * 0.1
  );
  ctx.bezierCurveTo(
    -size * 0.5, size * 0.05,
    -size * 0.4, size * 0.05,
    -size * 0.3, size * 0.05
  );
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawTwitterBirdOutline(ctx, size, wingOffset) {
  // The main body outline
  ctx.beginPath();
  ctx.moveTo(0, 0);
  
  // Head
  ctx.bezierCurveTo(
    -size * 0.3, -size * 0.4,
    -size * 0.5, -size * 0.3,
    -size * 0.4, 0
  );
  
  // Body
  ctx.bezierCurveTo(
    -size * 0.3, size * 0.1,
    -size * 0.1, size * 0.15,
    size * 0.1, size * 0.1
  );
  
  // Tail
  ctx.bezierCurveTo(
    size * 0.3, size * 0.05,
    size * 0.5, -size * 0.1,
    size * 0.4, -size * 0.3
  );
  
  // Top wing
  const wingPositionY = -size * 0.1 - (wingOffset * size);
  ctx.bezierCurveTo(
    size * 0.2, -size * 0.2,
    size * 0.1, wingPositionY,
    -size * 0.2, wingPositionY
  );
  
  // Connect back to head
  ctx.bezierCurveTo(
    -size * 0.3, wingPositionY,
    -size * 0.3, -size * 0.2,
    0, 0
  );
  
  ctx.stroke();
  
  // The beak outline
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, 0);
  ctx.bezierCurveTo(
    -size * 0.4, 0,
    -size * 0.5, size * 0.05,
    -size * 0.6, size * 0.1
  );
  ctx.bezierCurveTo(
    -size * 0.5, size * 0.05,
    -size * 0.4, size * 0.05,
    -size * 0.3, size * 0.05
  );
  ctx.closePath();
  ctx.stroke();
}

function drawWingDetails(ctx, size, wingOffset, type, pose) {
  // Wing feather details
  ctx.save();
  
  // Position for the wing details
  const wingPositionY = -size * 0.1 - (wingOffset * size);
  const centerX = size * 0.1;
  const centerY = -size * 0.1;
  
  // Create clip region to keep details within wing
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.bezierCurveTo(
    size * 0.2, -size * 0.2,
    size * 0.1, wingPositionY,
    -size * 0.2, wingPositionY
  );
  ctx.bezierCurveTo(
    -size * 0.1, -size * 0.1,
    0, -size * 0.1,
    centerX, centerY
  );
  ctx.closePath();
  ctx.clip();
  
  // Draw feather patterns based on bird type
  if (type === SPARROW_TYPES.CLASSIC || type === SPARROW_TYPES.BLUE) {
    // Draw simple feather lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, size / 20);
    
    const featherCount = 3 + Math.floor(size / 8);
    for (let i = 0; i < featherCount; i++) {
      const posX = centerX - (i * size * 0.15);
      
      ctx.beginPath();
      ctx.moveTo(posX, centerY);
      ctx.lineTo(posX - size * 0.1, wingPositionY);
      ctx.stroke();
    }
  } else if (type === SPARROW_TYPES.GRADIENT) {
    // Use pattern from texture cache
    if (textureCache['pattern_gradient']) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(
        textureCache['pattern_gradient'],
        -size, -size,
        size * 2, size * 2
      );
      ctx.globalAlpha = 1;
    }
  } else if (type === SPARROW_TYPES.GOLDEN) {
    // Use pattern from texture cache
    if (textureCache['pattern_striped']) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(
        textureCache['pattern_striped'],
        -size, -size,
        size * 2, size * 2
      );
      ctx.globalAlpha = 1;
    }
    
    // Add gold sparkle details
    ctx.fillStyle = 'rgba(255, 255, 180, 0.7)';
    for (let i = 0; i < 5; i++) {
      const x = -size * 0.2 + Math.random() * size * 0.4;
      const y = wingPositionY + Math.random() * size * 0.15;
      const sparkSize = size * 0.04;
      
      ctx.beginPath();
      ctx.arc(x, y, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Default pattern
    if (textureCache['pattern_solid']) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(
        textureCache['pattern_solid'],
        -size, -size,
        size * 2, size * 2
      );
      ctx.globalAlpha = 1;
    }
  }
  
  ctx.restore();
}

function createTwitterSparrows(width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Calculate optimal distribution based on canvas size
  const screenArea = width * height;
  const averageSize = Math.sqrt(screenArea / sparrowCount) * 0.15;
  
  // Distribution factors for more balanced appearance
  const sizeFactor = Math.min(width, height) / 400; // Scale based on screen size
  
  // Prepare arrays for sizing distribution
  const typeDistribution = [];
  let totalWeight = 0;
  
  // Build weighted distribution based on sparrow types
  typeDistribution.push({ type: SPARROW_TYPES.CLASSIC, weight: 50, cumulative: 0 });
  typeDistribution.push({ type: SPARROW_TYPES.BLUE, weight: 30, cumulative: 0 });
  typeDistribution.push({ type: SPARROW_TYPES.GRADIENT, weight: 10, cumulative: 0 });
  typeDistribution.push({ type: SPARROW_TYPES.SILVER, weight: 5, cumulative: 0 });
  typeDistribution.push({ type: SPARROW_TYPES.GOLDEN, weight: 3, cumulative: 0 });
  typeDistribution.push({ type: SPARROW_TYPES.OUTLINE, weight: 2, cumulative: 0 });
  
  // Calculate cumulative weights
  for (let i = 0; i < typeDistribution.length; i++) {
    totalWeight += typeDistribution[i].weight;
    typeDistribution[i].cumulative = totalWeight;
  }
  
  // Create Twitter sparrows with varied poses and appearances
  for (let i = 0; i < sparrowCount; i++) {
    // Determine sparrow type using weighted distribution
    const randomValue = Math.random() * totalWeight;
    let type;
    
    for (let j = 0; j < typeDistribution.length; j++) {
      if (randomValue <= typeDistribution[j].cumulative) {
        type = typeDistribution[j].type;
        break;
      }
    }
    
    // Determine size, lifespan, pose based on type
    let size, lifespan, pose;
    
    switch (type) {
      case SPARROW_TYPES.CLASSIC:
        // Classic Twitter bird - medium size, varied poses
        size = (8 + Math.random() * 14) * sizeFactor;
        lifespan = 0.75 + Math.random() * 0.25;
        
        if (Math.random() < 0.4) {
          pose = SPARROW_POSES.FLYING;
        } else if (Math.random() < 0.6) {
          pose = SPARROW_POSES.GLIDING;
        } else if (Math.random() < 0.8) {
          pose = SPARROW_POSES.SWOOPING;
        } else {
          pose = SPARROW_POSES.FLUTTERING;
        }
        break;
        
      case SPARROW_TYPES.BLUE:
        // Blue variants - medium-small, agile
        size = (6 + Math.random() * 10) * sizeFactor;
        lifespan = 0.8 + Math.random() * 0.2;
        
        if (Math.random() < 0.3) {
          pose = SPARROW_POSES.FLYING;
        } else if (Math.random() < 0.6) {
          pose = SPARROW_POSES.FLUTTERING;
        } else if (Math.random() < 0.8) {
          pose = SPARROW_POSES.SOARING;
        } else {
          pose = SPARROW_POSES.DIVING;
        }
        break;
        
      case SPARROW_TYPES.GRADIENT:
        // Gradient birds - medium size, graceful poses
        size = (7 + Math.random() * 12) * sizeFactor;
        lifespan = 0.7 + Math.random() * 0.3;
        
        if (Math.random() < 0.5) {
          pose = SPARROW_POSES.GLIDING;
        } else if (Math.random() < 0.8) {
          pose = SPARROW_POSES.SOARING;
        } else {
          pose = SPARROW_POSES.FLYING;
        }
        break;
        
      case SPARROW_TYPES.GOLDEN:
        // Gold premium birds - larger, majestic
        size = (10 + Math.random() * 16) * sizeFactor;
        lifespan = 0.85 + Math.random() * 0.15;
        
        if (Math.random() < 0.6) {
          pose = SPARROW_POSES.SOARING;
        } else if (Math.random() < 0.8) {
          pose = SPARROW_POSES.GLIDING;
        } else {
          pose = SPARROW_POSES.FLYING;
        }
        break;
        
      case SPARROW_TYPES.SILVER:
        // Silver birds - medium-large, elegant
        size = (9 + Math.random() * 14) * sizeFactor;
        lifespan = 0.8 + Math.random() * 0.2;
        
        if (Math.random() < 0.4) {
          pose = SPARROW_POSES.GLIDING;
        } else if (Math.random() < 0.7) {
          pose = SPARROW_POSES.FLYING;
        } else {
          pose = SPARROW_POSES.SOARING;
        }
        break;
        
      case SPARROW_TYPES.OUTLINE:
        // Outline birds - slim, fast moving
        size = (6 + Math.random() * 10) * sizeFactor;
        lifespan = 0.6 + Math.random() * 0.4;
        
        if (Math.random() < 0.4) {
          pose = SPARROW_POSES.DIVING;
        } else if (Math.random() < 0.7) {
          pose = SPARROW_POSES.SWOOPING;
        } else {
          pose = SPARROW_POSES.FLYING;
        }
        break;
        
      default:
        // Default fallback
        size = (7 + Math.random() * 12) * sizeFactor;
        lifespan = 0.7 + Math.random() * 0.3;
        pose = SPARROW_POSES.FLYING;
    }
    
    // Select appropriate color based on type
    let colorIndex;
    if (type === SPARROW_TYPES.CLASSIC) {
      // Twitter blue (0-2)
      colorIndex = Math.floor(Math.random() * 3); 
    } else if (type === SPARROW_TYPES.BLUE) {
      // Blue variants (0-2)
      colorIndex = Math.floor(Math.random() * 3); 
    } else if (type === SPARROW_TYPES.OUTLINE) {
      // Black or gray (3-6)
      colorIndex = 3 + Math.floor(Math.random() * 4); 
    } else if (type === SPARROW_TYPES.GOLDEN) {
      // Gold
      colorIndex = 12;
    } else if (type === SPARROW_TYPES.SILVER) {
      // Silver/light grays (7-10)
      colorIndex = 7 + Math.floor(Math.random() * 4);
    } else {
      // Mixed colors for gradient
      colorIndex = Math.floor(Math.random() * 3);
    }
    
    // Get color with bounds checking
    const color = SPARROW_COLORS[Math.min(colorIndex, SPARROW_COLORS.length - 1)];
    
    // Add slight color variation for realism
    const colorVariation = 10;
    const variedColor = {
      r: Math.max(0, Math.min(255, color.r + (Math.random() - 0.5) * colorVariation)),
      g: Math.max(0, Math.min(255, color.g + (Math.random() - 0.5) * colorVariation)),
      b: Math.max(0, Math.min(255, color.b + (Math.random() - 0.5) * colorVariation)),
      a: color.a
    };
    
    // Distribute sparrows with improved explosion pattern
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
    const normalizedIndex = i / sparrowCount;
    if (normalizedIndex < 0.2) {
      // First 20% - closer to center
      radius *= 0.5;
    } else if (normalizedIndex > 0.8) {
      // Last 20% - further from center
      radius *= 1.5;
    }
    
    // Calculate velocity based on distance from center and bird type
    let speed = 5 + radius/3 + Math.random() * 15;
    
    // Adjust speed based on bird type
    if (type === SPARROW_TYPES.OUTLINE || pose === SPARROW_POSES.DIVING) {
      speed *= 1.3; // Faster
    } else if (type === SPARROW_TYPES.GOLDEN) {
      speed *= 0.8; // Slower, more majestic
    }
    
    // Initial position (around center with small variation)
    const x = centerX + (Math.random() - 0.5) * 40;
    const y = centerY + (Math.random() - 0.5) * 40;
    
    // Physics variations for more natural movement
    const gravity = 0.05 + Math.random() * 0.08;
    const drag = 0.01 + Math.random() * 0.02;
    
    // Create the sparrow with enhanced properties
    sparrows.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: variedColor,
      type,
      pose,
      opacity: 1.0,
      lifespan,
      gravity,
      drag,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.1 + Math.random() * 0.2,
      delay: Math.random() * 0.2,
      targetDirection: 0,
      directionChangeProbability: 0.02,
      
      // Trail properties
      trail: [],
      maxTrailLength: renderQuality === 'ultra' ? 8 : (renderQuality === 'high' ? 6 : 4),
      trailOpacity: 0.2,
      
      // Behavioral properties
      acceleration: 0.02 + Math.random() * 0.04,
      maxSpeed: 8 + Math.random() * 10,
      turning: 0.05 + Math.random() * 0.1,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.1,
      wobbleAmount: 0.05 + Math.random() * 0.1,
      
      // Visual enhancements
      tailFlutter: 0.05 + Math.random() * 0.1,
      tailFlutterSpeed: 0.1 + Math.random() * 0.2,
      reflectionHighlight: Math.random(),
      featherDropProbability: 0.002,
      
      // Animation phases for wing flap
      flapPhase: Math.random() * Math.PI * 2,
      flapSpeed: 0.1 + Math.random() * 0.2,
      flapAmplitude: 0.2 + Math.random() * 0.3,
      
      // Special effects based on type
      hasGlowEffect: type === SPARROW_TYPES.GOLDEN || type === SPARROW_TYPES.SILVER,
      glowColor: type === SPARROW_TYPES.GOLDEN ? 'rgba(255, 215, 0, 0.3)' : 
                 type === SPARROW_TYPES.SILVER ? 'rgba(220, 220, 255, 0.3)' : 
                 'rgba(29, 161, 242, 0.2)'
    });
  }
  
  // Create initial cloud puffs
  for (let i = 0; i < (renderQuality === 'low' ? 5 : 10); i++) {
    addCloudPuff(
      centerX + (Math.random() - 0.5) * width * 0.7,
      centerY + (Math.random() - 0.5) * height * 0.7,
      10 + Math.random() * 30,
      0.2 + Math.random() * 0.3
    );
  }
}

function addCloudPuff(x, y, size, delay) {
  // Create a cloud puff
  cloudPuffs.push({
    x,
    y,
    size,
    targetSize: size,
    currentSize: 0,
    opacity: 0,
    targetOpacity: 0.3 + Math.random() * 0.3,
    created: performance.now(),
    delay,
    growthRate: 0.15 + Math.random() * 0.1,
    
    // Cloud animation properties
    drift: {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.3 - 0.2 // Slight upward bias
    },
    wobble: {
      phase: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
      amount: 0.1 + Math.random() * 0.2
    },
    lifespan: 1 + Math.random() * 2
  });
}

function drawSparrowTrails(ctx, deltaTime) {
  // Draw trails with fadeout
  for (let i = 0; i < sparrowTrails.length; i++) {
    const trail = sparrowTrails[i];
    
    // Update lifetime
    trail.age += deltaTime * 0.016;
    
    // Fade out over time
    const fadeProgress = Math.min(1, trail.age / trail.lifespan);
    trail.opacity = trail.initialOpacity * (1 - fadeProgress);
    
    // Remove if fully faded
    if (trail.opacity <= 0.01) {
      sparrowTrails.splice(i, 1);
      i--;
      continue;
    }
    
    // Update position with slight drift
    trail.x += trail.drift.x * deltaTime;
    trail.y += trail.drift.y * deltaTime;
    
    // Draw the trail
    ctx.save();
    ctx.globalAlpha = trail.opacity;
    
    // Draw based on trail type
    if (trail.type === 'feather') {
      // Draw a small feather
      ctx.translate(trail.x, trail.y);
      ctx.rotate(trail.rotation);
      
      // Feather base color
      ctx.fillStyle = trail.color;
      
      // Draw feather shape
      ctx.beginPath();
      ctx.moveTo(0, -trail.size/2);
      ctx.bezierCurveTo(
        trail.size/4, -trail.size/3,
        trail.size/2, 0,
        trail.size/3, trail.size/2
      );
      ctx.bezierCurveTo(
        0, trail.size/3,
        -trail.size/4, trail.size/4,
        0, -trail.size/2
      );
      ctx.fill();
      
      // Draw feather shaft
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -trail.size/2);
      ctx.lineTo(0, trail.size/2);
      ctx.stroke();
      
    } else if (trail.type === 'blur') {
      // Draw a motion blur trail
      ctx.fillStyle = trail.color;
      
      // Draw stretched ellipse for motion trail
      ctx.beginPath();
      ctx.ellipse(
        trail.x, trail.y,
        trail.size, trail.size/3,
        trail.rotation,
        0, Math.PI * 2
      );
      ctx.fill();
    } else {
      // Default simple circle trail
      ctx.fillStyle = trail.color;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, trail.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

function drawTwitterSplash(ctx, width, height, progress) {
  if (progress < 0.05) return;
  
  // Enhanced Twitter splash parameters
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.3;
  
  // Calculate splash size based on progress with professional animation curve
  let splashProgress = Math.min(1, (progress - 0.05) * 3);
  
  // Use more sophisticated animation curve with slight overshoot and settle
  const animCurve = splashProgress < 0.6 ? 
    (1.1 * Math.sin(splashProgress * Math.PI * 0.7)) : 
    (1 - 0.2 * Math.pow(1 - splashProgress, 2) + 0.05 * Math.sin(splashProgress * 20));
  
  const currentRadius = maxRadius * Math.min(1, animCurve);
  
  if (currentRadius <= 0) return;
  
  // Draw splash with Twitter brand colors
  ctx.save();
  
  // Create Twitter blue gradient
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, currentRadius
  );
  
  // Twitter branding colors
  gradient.addColorStop(0, 'rgba(85, 172, 238, 0.95)');
  gradient.addColorStop(0.3, 'rgba(29, 161, 242, 0.9)');
  gradient.addColorStop(0.6, 'rgba(20, 130, 210, 0.85)');
  gradient.addColorStop(0.8, 'rgba(10, 100, 190, 0.7)');
  gradient.addColorStop(1, 'rgba(0, 80, 170, 0)');
  
  ctx.fillStyle = gradient;
  
  // Draw enhanced splash shape with premium detail
  const numPoints = renderQuality === 'low' ? 16 : 
                   renderQuality === 'medium' ? 24 : 
                   renderQuality === 'high' ? 32 : 36;
                   
  const baseRadius = currentRadius;
  
  ctx.beginPath();
  
  // Create more detailed, organic splash shape
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More complex wave pattern
    const wavePhase1 = progress * 12 + i;
    const wavePhase2 = progress * 18 + i * 1.5;
    const wavePhase3 = progress * 7 + i * 0.8;
    
    // Use multiple sine waves for more organic shape
    const waveAmplitude1 = Math.min(0.25, progress * 0.5);
    const waveAmplitude2 = Math.min(0.15, progress * 0.3);
    const waveAmplitude3 = Math.min(0.1, progress * 0.2);
    
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
      // Create more organic curves between points
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
  
  // Add texture overlay in high quality modes
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.15;
    
    // Create clip region
    ctx.beginPath();
    ctx.arc(centerX, centerY, currentRadius * 0.95, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Apply noise texture from cache
    if (textureCache['noise_128_0.1']) {
      // Use tiled approach for better quality on large splashes
      const texSize = 128;
      const tilesX = Math.ceil(currentRadius * 2 / texSize);
      const tilesY = Math.ceil(currentRadius * 2 / texSize);
      
      for (let tx = -Math.floor(tilesX/2); tx <= Math.ceil(tilesX/2); tx++) {
        for (let ty = -Math.floor(tilesY/2); ty <= Math.ceil(tilesY/2); ty++) {
          ctx.drawImage(
            textureCache['noise_128_0.1'],
            centerX - currentRadius + tx * texSize,
            centerY - currentRadius + ty * texSize,
            texSize, texSize
          );
        }
      }
    }
    
    ctx.restore();
  }
  
  // Draw Twitter icon in the center with animation
  if (splashProgress > 0.3) {
    const iconProgress = Math.min(1, (splashProgress - 0.3) / 0.3);
    const iconSize = currentRadius * 0.3 * iconProgress;
    
    ctx.fillStyle = 'white';
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(iconSize/10, iconSize/10);
    
    // Draw Twitter bird silhouette
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-3, -4, -5, -3, -4, 0);
    ctx.bezierCurveTo(-3, 1, -1, 1.5, 1, 1);
    ctx.bezierCurveTo(3, 0.5, 5, -1, 4, -3);
    ctx.bezierCurveTo(2, -2, 1, -1, -2, -1);
    ctx.bezierCurveTo(-3, -2, -3, -2, 0, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
  
  // Draw highlights with dynamic movement
  const highlightAngle = progress * Math.PI * 2;
  const highlightX = centerX + Math.cos(highlightAngle) * currentRadius * 0.3;
  const highlightY = centerY + Math.sin(highlightAngle) * currentRadius * 0.3;
  
  const highlightGradient = ctx.createLinearGradient(
    highlightX - currentRadius * 0.5, highlightY - currentRadius * 0.5,
    highlightX + currentRadius * 0.5, highlightY + currentRadius * 0.5
  );
  
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
  highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  highlightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.ellipse(highlightX, highlightY, currentRadius * 0.6, currentRadius * 0.4, highlightAngle, 0, Math.PI * 2);
  ctx.fill();
  
  // Add flying sparrow silhouettes around the splash
  if (progress > 0.2 && progress < 0.9) {
    const silhouetteCount = Math.floor(12 * splashProgress);
    
    for (let i = 0; i < silhouetteCount; i++) {
      const angle = (i / silhouetteCount) * Math.PI * 2 + progress * 5;
      const distance = currentRadius * (1.1 + progress * 0.5 + Math.random() * 0.2);
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 3 + Math.random() * 10;
      
      // Draw small sparrow silhouette
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI/2);
      ctx.scale(size/20, size/20);
      
      // Simple bird shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-5, -2, -10, 0, -8, 5);
      ctx.bezierCurveTo(-3, 7, 3, 7, 8, 5);
      ctx.bezierCurveTo(10, 0, 5, -2, 0, 0);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  ctx.restore();
}

function drawFeatherBurst(ctx, width, height, progress, deltaTime) {
  // Process existing feathers
  const deadFeathers = [];
  
  for (let i = 0; i < featherParticles.length; i++) {
    const feather = featherParticles[i];
    
    // Update feather state
    feather.age += deltaTime * 0.016;
    
    // Update phase for wobble and animation
    feather.phase += feather.speed * deltaTime;
    
    // Apply physics
    feather.vy += feather.gravity * deltaTime;
    
    // Apply air resistance
    feather.vx *= (1 - feather.drag * deltaTime);
    feather.vy *= (1 - feather.drag * deltaTime);
    
    // Add wobble
    const wobble = Math.sin(feather.phase * 3) * feather.wobbleAmount;
    
    // Update position
    feather.x += (feather.vx + wobble) * deltaTime;
    feather.y += feather.vy * deltaTime;
    
    // Rotate based on movement and wobble
    feather.rotation += (feather.rotationSpeed + wobble * 0.1) * deltaTime;
    
    // Apply fading at end of lifetime
    if (feather.age > feather.lifetime * 0.7) {
      const fadeProgress = (feather.age - feather.lifetime * 0.7) / (feather.lifetime * 0.3);
      feather.opacity = Math.max(0, 1 - fadeProgress);
      
      if (feather.opacity <= 0.02) {
        deadFeathers.push(i);
        continue;
      }
    }
    
    // Draw feather
    drawSingleFeather(ctx, feather);
  }
  
  // Remove dead feathers
  for (let i = deadFeathers.length - 1; i >= 0; i--) {
    featherParticles.splice(deadFeathers[i], 1);
  }
  
  // Possibly add new feathers
  if (progress > 0.1 && progress < 0.8) {
    const featherProbability = 0.04 * deltaTime * (progress < 0.4 ? 2 : 1);
    
    // Limit total feather count based on quality
    const maxFeathers = renderQuality === 'ultra' ? 50 : 
                      renderQuality === 'high' ? 30 :
                      renderQuality === 'medium' ? 20 : 10;
    
    if (Math.random() < featherProbability && featherParticles.length < maxFeathers) {
      // Create new feather
      addNewFeather(ctx, width, height, progress);
    }
  }
  
  // Also add feathers from sparrows occasionally
  for (const sparrow of sparrows) {
    if (Math.random() < sparrow.featherDropProbability * deltaTime) {
      addFeatherFromSparrow(sparrow);
    }
  }
}

function addNewFeather(ctx, width, height, progress) {
  // Place feather at strategic locations
  let x, y;
  
  if (Math.random() < 0.7) {
    // Place around the center with some spread
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(width, height) * 0.2 * (0.5 + Math.random() * 0.5);
    x = width/2 + Math.cos(angle) * distance;
    y = height/2 + Math.sin(angle) * distance;
  } else {
    // Random position on screen
    x = Math.random() * width;
    y = Math.random() * height;
  }
  
  // Select Twitter blue color with slight variation
  const baseColor = SPARROW_COLORS[Math.floor(Math.random() * 3)]; // Twitter blues
  
  // Add variation for realism
  const colorVar = 20;
  const color = {
    r: Math.max(0, Math.min(255, baseColor.r + (Math.random() - 0.5) * colorVar)),
    g: Math.max(0, Math.min(255, baseColor.g + (Math.random() - 0.5) * colorVar)),
    b: Math.max(0, Math.min(255, baseColor.b + (Math.random() - 0.5) * colorVar)),
    a: baseColor.a
  };
  
  // Create feather style
  let style;
  const rand = Math.random();
  if (rand < 0.6) {
    style = 'normal';
  } else if (rand < 0.8) {
    style = 'fluffy';
  } else {
    style = 'long';
  }
  
  // Create the feather
  featherParticles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2 - 1, // Slight upward bias
    size: 5 + Math.random() * 15,
    color: `rgb(${color.r},${color.g},${color.b})`,
    style,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.2,
    opacity: 0.7 + Math.random() * 0.3,
    age: 0,
    lifetime: 3 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.05 + Math.random() * 0.1,
    
    // Physics properties
    gravity: 0.01 + Math.random() * 0.02,
    drag: 0.01 + Math.random() * 0.02,
    wobbleAmount: 0.2 + Math.random() * 0.4,
    
    // Visual details
    highlights: Math.random() < 0.5,
    barbs: Math.floor(3 + Math.random() * 5)
  });
}

function addFeatherFromSparrow(sparrow) {
  // Create a feather at the sparrow's position
  const featherColor = `rgb(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b})`;
  
  // Create feather style based on sparrow type
  let style;
  if (sparrow.type === SPARROW_TYPES.GOLDEN || sparrow.type === SPARROW_TYPES.SILVER) {
    style = 'fluffy';
  } else if (sparrow.type === SPARROW_TYPES.OUTLINE) {
    style = 'long';
  } else {
    style = 'normal';
  }
  
  // Add to trails for drawing
  sparrowTrails.push({
    x: sparrow.x,
    y: sparrow.y,
    size: sparrow.size * 0.2,
    color: featherColor,
    rotation: Math.random() * Math.PI * 2,
    opacity: 0.7 + Math.random() * 0.3,
    initialOpacity: 0.7 + Math.random() * 0.3,
    age: 0,
    lifespan: 2 + Math.random() * 1,
    type: 'feather',
    drift: {
      x: (Math.random() - 0.5) * 0.5,
      y: 0.5 + Math.random() * 0.5 // Downward drift
    }
  });
}

function drawSingleFeather(ctx, feather) {
  ctx.save();
  
  // Apply transformations
  ctx.translate(feather.x, feather.y);
  ctx.rotate(feather.rotation);
  ctx.globalAlpha = feather.opacity;
  
  // Base color
  ctx.fillStyle = feather.color;
  
  // Draw based on feather style
  if (feather.style === 'fluffy') {
    // Draw a fluffy, round feather
    
    // Draw feather body
    ctx.beginPath();
    ctx.ellipse(0, 0, feather.size/2, feather.size/3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw fluffy edge details
    ctx.globalAlpha = feather.opacity * 0.7;
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = feather.size/2 * 0.8;
      
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        feather.size/5, 
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
  } else if (feather.style === 'long') {
    // Draw a long, pointed feather
    
    // Draw main shaft
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -feather.size/2);
    ctx.lineTo(0, feather.size/2);
    ctx.stroke();
    
    // Draw feather shape
    ctx.beginPath();
    ctx.moveTo(0, -feather.size/2);
    
    // Left side
    ctx.bezierCurveTo(
      -feather.size/4, -feather.size/3,
      -feather.size/3, 0,
      -feather.size/4, feather.size/2
    );
    
    // Bottom curve
    ctx.quadraticCurveTo(0, feather.size/1.8, feather.size/4, feather.size/2);
    
    // Right side
    ctx.bezierCurveTo(
      feather.size/3, 0,
      feather.size/4, -feather.size/3,
      0, -feather.size/2
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Draw barbs
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.5;
    
    for (let i = 1; i <= feather.barbs; i++) {
      const y = -feather.size/2 + (feather.size * i) / (feather.barbs + 1);
      const width = Math.sin((i / feather.barbs) * Math.PI) * feather.size/3;
      
      ctx.beginPath();
      ctx.moveTo(-width, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
  } else {
    // Normal feather
    
    // Draw main shape
    ctx.beginPath();
    ctx.moveTo(0, -feather.size/2);
    
    // Left side with curve
    ctx.bezierCurveTo(
      -feather.size/3, -feather.size/4,
      -feather.size/2, 0,
      -feather.size/3, feather.size/2
    );
    
    // Bottom
    ctx.lineTo(feather.size/3, feather.size/2);
    
    // Right side
    ctx.bezierCurveTo(
      feather.size/2, 0,
      feather.size/3, -feather.size/4,
      0, -feather.size/2
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Draw shaft
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -feather.size/2);
    ctx.lineTo(0, feather.size/2);
    ctx.stroke();
    
    // Draw barbs
    if (feather.size > 8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      
      const barbCount = Math.floor(feather.size / 3);
      const spacing = feather.size / (barbCount + 1);
      
      for (let i = 1; i <= barbCount; i++) {
        const y = -feather.size/2 + spacing * i;
        const widthFactor = Math.sin((i / barbCount) * Math.PI);
        
        // Left barb
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-feather.size/2 * widthFactor, y);
        ctx.stroke();
        
        // Right barb
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(feather.size/2 * widthFactor, y);
        ctx.stroke();
      }
    }
  }
  
  // Add highlights
  if (feather.highlights) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-feather.size/6, -feather.size/6, feather.size/5, feather.size/7, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawCloudPuffs(ctx, deltaTime, progress) {
  // Process existing cloud puffs
  const deadPuffs = [];
  
  for (let i = 0; i < cloudPuffs.length; i++) {
    const puff = cloudPuffs[i];
    const elapsed = (performance.now() - puff.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < puff.delay) continue;
    
    // Update puff age
    const age = elapsed - puff.delay;
    
    // Check if puff has reached end of life
    if (age > puff.lifespan) {
      deadPuffs.push(i);
      continue;
    }
    
    // Grow the puff
    const growthProgress = Math.min(1, age * puff.growthRate * 2);
    // Use ease-out cubic for more natural growth
    const easedGrowth = 1 - Math.pow(1 - growthProgress, 3);
    
    puff.currentSize = puff.targetSize * easedGrowth;
    
    // Update opacity - grow and then fade
    const opacityProgress = age / puff.lifespan;
    if (opacityProgress < 0.3) {
      // Grow in
      puff.opacity = puff.targetOpacity * (opacityProgress / 0.3);
    } else if (opacityProgress > 0.7) {
      // Fade out
      puff.opacity = puff.targetOpacity * (1 - ((opacityProgress - 0.7) / 0.3));
    } else {
      // Hold steady
      puff.opacity = puff.targetOpacity;
    }
    
    // Update wobble and position
    puff.wobble.phase += puff.wobble.speed * deltaTime;
    const wobbleX = Math.cos(puff.wobble.phase) * puff.wobble.amount;
    const wobbleY = Math.sin(puff.wobble.phase * 1.3) * puff.wobble.amount;
    
    puff.x += (puff.drift.x + wobbleX) * deltaTime;
    puff.y += (puff.drift.y + wobbleY) * deltaTime;
    
    // Draw the cloud puff
    ctx.save();
    ctx.globalAlpha = puff.opacity;
    
    // Use cloud puff texture from cache if available
    if (textureCache['cloud_puff']) {
      ctx.drawImage(
        textureCache['cloud_puff'],
        puff.x - puff.currentSize,
        puff.y - puff.currentSize,
        puff.currentSize * 2,
        puff.currentSize * 2
      );
    } else {
      // Fallback if texture not available
      const cloudGradient = ctx.createRadialGradient(
        puff.x, puff.y, 0,
        puff.x, puff.y, puff.currentSize
      );
      
      cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      cloudGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
      cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = cloudGradient;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  // Remove dead puffs
  for (let i = deadPuffs.length - 1; i >= 0; i--) {
    cloudPuffs.splice(deadPuffs[i], 1);
  }
  
  // Add new cloud puffs occasionally
  if (Math.random() < 0.03 * deltaTime && cloudPuffs.length < 20) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    addCloudPuff(
      Math.random() * width,
      Math.random() * height,
      15 + Math.random() * 30,
      0
    );
  }
}

function drawLightBeams(ctx, width, height, progress) {
  // Draw radiating light beams from center
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Determine intensity based on progress
  const intensity = Math.sin(progress * Math.PI) * 0.3;
  
  // Calculate animation phase
  const beamPhase = progress * Math.PI * 5;
  
  ctx.save();
  
  // Use additive blending
  ctx.globalCompositeOperation = 'screen';
  
  // Draw beams
  const beamCount = renderQuality === 'ultra' ? 12 : 8;
  
  for (let i = 0; i < beamCount; i++) {
    const angle = (i / beamCount) * Math.PI * 2 + beamPhase;
    
    // Calculate beam length with animation
    const length = Math.min(width, height) * (0.5 + Math.sin(beamPhase + i) * 0.2);
    
    // Create beam gradient
    const beamGradient = ctx.createLinearGradient(
      centerX, centerY,
      centerX + Math.cos(angle) * length,
      centerY + Math.sin(angle) * length
    );
    
    beamGradient.addColorStop(0, `rgba(85, 172, 238, ${intensity * 0.8})`);
    beamGradient.addColorStop(0.5, `rgba(29, 161, 242, ${intensity * 0.4})`);
    beamGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = beamGradient;
    
    // Draw beam
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    
    // Calculate beam width
    const width = length * 0.1;
    
    // Calculate points for the beam shape
    const px1 = centerX + Math.cos(angle - 0.1) * width;
    const py1 = centerY + Math.sin(angle - 0.1) * width;
    
    const px2 = centerX + Math.cos(angle) * length;
    const py2 = centerY + Math.sin(angle) * length;
    
    const px3 = centerX + Math.cos(angle + 0.1) * width;
    const py3 = centerY + Math.sin(angle + 0.1) * width;
    
    ctx.lineTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.lineTo(px3, py3);
    ctx.closePath();
    
    ctx.fill();
  }
  
  // Add central glow
  const glowGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, width * 0.2
  );
  
  glowGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.7})`);
  glowGradient.addColorStop(0.3, `rgba(85, 172, 238, ${intensity * 0.5})`);
  glowGradient.addColorStop(0.6, `rgba(29, 161, 242, ${intensity * 0.3})`);
  glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, width * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function updateAndDrawSparrows(ctx, deltaTime, progress) {
  // Sort sparrows by size for better visual layering
  sparrows.sort((a, b) => a.size - b.size);
  
  const deadSparrows = [];
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  for (let i = 0; i < sparrows.length; i++) {
    const sparrow = sparrows[i];
    
    // Skip sparrows with delay not yet reached
    if (progress < sparrow.delay) continue;
    
    // Adjust progress for delayed sparrows
    const adjustedProgress = (progress - sparrow.delay) / (1.0 - sparrow.delay);
    
    // Skip completely faded sparrows
    if (sparrow.opacity <= 0.01) {
      deadSparrows.push(i);
      continue;
    }
    
    // Store previous position for trail
    if (sparrow.maxTrailLength > 0 && frameCount % 2 === 0) {
      // Add motion trail
      sparrow.trail.push({
        x: sparrow.x,
        y: sparrow.y,
        rotation: Math.atan2(sparrow.vy, sparrow.vx) + Math.PI/2,
        opacity: sparrow.opacity * sparrow.trailOpacity
      });
      
      // Limit trail length
      if (sparrow.trail.length > sparrow.maxTrailLength) {
        sparrow.trail.shift();
      }
      
      // Add motion blur trail to separate array occasionally
      if (Math.random() < 0.2) {
        const speed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
        if (speed > 5) {
          sparrowTrails.push({
            x: sparrow.x,
            y: sparrow.y,
            size: sparrow.size * 0.3,
            color: `rgba(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b},0.2)`,
            rotation: Math.atan2(sparrow.vy, sparrow.vx),
            opacity: 0.2,
            initialOpacity: 0.2,
            age: 0,
            lifespan: 0.5 + Math.random() * 0.5,
            type: 'blur',
            drift: {
              x: 0,
              y: 0
            }
          });
        }
      }
    }
    
    // Update wing flap animation
    sparrow.flapPhase += sparrow.flapSpeed * deltaTime;
    const flapValue = Math.sin(sparrow.flapPhase) * sparrow.flapAmplitude;
    
    // Update flapping speed based on velocity
    const speed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
    sparrow.flapSpeed = 0.1 + speed * 0.02 + Math.random() * 0.05;
    
    // Behavioral updates - change target direction occasionally
    if (Math.random() < sparrow.directionChangeProbability * deltaTime) {
      sparrow.targetDirection = Math.random() * Math.PI * 2;
    }
    
    // Current direction
    const currentDirection = Math.atan2(sparrow.vy, sparrow.vx);
    
    // Smoothly turn towards target direction
    let angleDiff = sparrow.targetDirection - currentDirection;
    
    // Normalize angle difference to be between -PI and PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Apply turning based on the angle difference
    const turnAmount = Math.min(Math.abs(angleDiff), sparrow.turning * deltaTime) * Math.sign(angleDiff);
    
    // Apply acceleration in the new direction
    const newDirection = currentDirection + turnAmount;
    const acceleration = sparrow.acceleration * deltaTime;
    
    sparrow.vx += Math.cos(newDirection) * acceleration;
    sparrow.vy += Math.sin(newDirection) * acceleration;
    
    // Apply slight gravity
    sparrow.vy += sparrow.gravity * deltaTime;
    
    // Limit to max speed
    const currentSpeed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
    if (currentSpeed > sparrow.maxSpeed) {
      const speedFactor = sparrow.maxSpeed / currentSpeed;
      sparrow.vx *= speedFactor;
      sparrow.vy *= speedFactor;
    }
    
    // Apply air resistance
    const dragFactor = 1 - (sparrow.drag * deltaTime);
    sparrow.vx *= dragFactor;
    sparrow.vy *= dragFactor;
    
    // Apply wobble for natural flying effect
    sparrow.wobble += sparrow.wobbleSpeed * deltaTime;
    const wobbleEffect = Math.sin(sparrow.wobble) * sparrow.wobbleAmount;
    
    // Update position with all factors
    sparrow.x += sparrow.vx * deltaTime;
    sparrow.y += sparrow.vy * deltaTime + wobbleEffect * deltaTime;
    
    // Screen boundary handling with smooth turning
    const margin = 50;
    if (sparrow.x < margin) {
      // Approaching left edge, turn right
      sparrow.targetDirection = 0;
    } else if (sparrow.x > width - margin) {
      // Approaching right edge, turn left
      sparrow.targetDirection = Math.PI;
    }
    
    if (sparrow.y < margin) {
      // Approaching top edge, turn down
      sparrow.targetDirection = Math.PI/2;
    } else if (sparrow.y > height - margin) {
      // Approaching bottom edge, turn up
      sparrow.targetDirection = -Math.PI/2;
    }
    
    // Hard boundaries to prevent escaping
    if (sparrow.x < 0) sparrow.x = 0;
    if (sparrow.x > width) sparrow.x = width;
    if (sparrow.y < 0) sparrow.y = 0;
    if (sparrow.y > height) sparrow.y = height;
    
    // Fade out based on lifespan with smooth curve
    if (adjustedProgress > 0.7) {
      const fadeProgress = (adjustedProgress - 0.7) / 0.3;
      const fadeRate = easeInOutCubic(fadeProgress) / (sparrow.lifespan * 60);
      sparrow.opacity = Math.max(0, sparrow.opacity - fadeRate * deltaTime);
    }
    
    // Draw motion trail for higher quality settings
    if (sparrow.trail.length > 0 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      for (let t = 0; t < sparrow.trail.length; t++) {
        const trail = sparrow.trail[t];
        const trailOpacity = trail.opacity * (t / sparrow.trail.length);
        
        if (trailOpacity > 0.01) {
          drawTrailSparrow(ctx, sparrow, trail.x, trail.y, trail.rotation, trailOpacity);
        }
      }
    }
    
    // Calculate rotation based on velocity and wobble
    const rotation = Math.atan2(sparrow.vy, sparrow.vx) + Math.PI/2 + wobbleEffect * 0.2;
    
    // Draw the sparrow with current pose and animation
    drawSparrow(ctx, sparrow, sparrow.x, sparrow.y, rotation, sparrow.opacity, flapValue);
  }
  
  // Remove dead sparrows in reverse order to avoid index issues
  for (let i = deadSparrows.length - 1; i >= 0; i--) {
    sparrows.splice(deadSparrows[i], 1);
  }
}

function drawTrailSparrow(ctx, sparrow, x, y, rotation, opacity) {
  // Simplified sparrow silhouette for trail
  ctx.save();
  
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  
  // Trail color
  ctx.fillStyle = `rgba(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b},${opacity})`;
  
  // Simplified sparrow shape
  const size = sparrow.size * 0.7;
  ctx.beginPath();
  ctx.ellipse(0, 0, size/2, size, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawSparrow(ctx, sparrow, x, y, rotation, opacity, flapValue) {
  // Get color key
  const colorKey = `rgb(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b})`;
  
  // Current pose based on animation state and original pose
  let currentPose = sparrow.pose;
  
  // Adjust pose based on velocity and state
  const speed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
  if (speed > 15) {
    // Fast movement - swooping or diving
    currentPose = sparrow.vy > 5 ? SPARROW_POSES.DIVING : SPARROW_POSES.SWOOPING;
  } else if (speed < 3) {
    // Slow movement - gliding or fluttering
    currentPose = Math.abs(flapValue) > 0.15 ? SPARROW_POSES.FLUTTERING : SPARROW_POSES.GLIDING;
  }
  
  // Find closest size key for LOD selection
  let sizeKey = '1';
  if (sparrow.size > 2) sizeKey = '2';
  if (sparrow.size > 4) sizeKey = '4';
  if (sparrow.size > 8) sizeKey = '8';
  if (sparrow.size > 16) sizeKey = '16';
  if (sparrow.size > 32) sizeKey = '32';
  
  // Draw sparrow
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Add glow effect for special sparrows
  if (sparrow.hasGlowEffect && (renderQuality === 'high' || renderQuality === 'ultra')) {
    const glowSize = sparrow.size * 1.5;
    const glowGradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, glowSize
    );
    
    glowGradient.addColorStop(0, sparrow.glowColor);
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Get sparrow prototype
  const prototype = sparrowPrototypes[sparrow.type][currentPose][colorKey]?.[sizeKey];
  
  if (prototype) {
    // Draw using pre-rendered prototype for better performance
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const scale = sparrow.size / parseInt(sizeKey);
    ctx.scale(scale, scale);
    
    // Apply wing flap animation
    const wingMatrix = new DOMMatrix()
      .translateSelf(0, 0)
      .rotateSelf(0, 0, flapValue * 20); // Rotate wings slightly
    
    ctx.transform(wingMatrix.a, wingMatrix.b, wingMatrix.c, wingMatrix.d, wingMatrix.e, wingMatrix.f);
    
    ctx.drawImage(
      prototype, 
      -32, 
      -32, 
      64, 
      64
    );
    
  } else {
    // Fallback drawing method
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Draw a basic sparrow silhouette
    ctx.fillStyle = `rgb(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b})`;
    
    // Draw body
    ctx.beginPath();
    ctx.ellipse(0, 0, sparrow.size/3, sparrow.size/2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw head
    ctx.beginPath();
    ctx.arc(0, -sparrow.size/2, sparrow.size/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wings with flap animation
    const wingSpread = sparrow.size * (0.5 + flapValue * 0.3);
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(0, -sparrow.size/4);
    ctx.lineTo(-wingSpread, -sparrow.size/8);
    ctx.lineTo(-wingSpread * 0.8, sparrow.size/4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    
    // Right wing
    ctx.beginPath();
    ctx.moveTo(0, -sparrow.size/4);
    ctx.lineTo(wingSpread, -sparrow.size/8);
    ctx.lineTo(wingSpread * 0.8, sparrow.size/4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    
    // Draw tail
    ctx.beginPath();
    ctx.moveTo(0, sparrow.size/2);
    ctx.lineTo(-sparrow.size/4, sparrow.size);
    ctx.lineTo(0, sparrow.size * 0.8);
    ctx.lineTo(sparrow.size/4, sparrow.size);
    ctx.closePath();
    ctx.fill();
  }
  
  // Add motion blur for fast-moving sparrows
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    const speed = Math.sqrt(sparrow.vx * sparrow.vx + sparrow.vy * sparrow.vy);
    if (speed > 10) {
      ctx.restore();
      ctx.save();
      
      // Draw motion blur in direction of movement
      const blurDirection = Math.atan2(sparrow.vy, sparrow.vx);
      const blurLength = Math.min(speed * 0.8, sparrow.size * 1.5);
      
      ctx.globalAlpha = opacity * 0.3;
      ctx.translate(x, y);
      
      const blurGradient = ctx.createLinearGradient(
        -Math.cos(blurDirection) * blurLength, -Math.sin(blurDirection) * blurLength,
        0, 0
      );
      
      blurGradient.addColorStop(0, 'rgba(255,255,255,0)');
      blurGradient.addColorStop(1, `rgba(${sparrow.color.r},${sparrow.color.g},${sparrow.color.b},0.5)`);
      
      ctx.fillStyle = blurGradient;
      ctx.beginPath();
      ctx.ellipse(
        -Math.cos(blurDirection) * blurLength/2,
        -Math.sin(blurDirection) * blurLength/2,
        blurLength,
        sparrow.size/2,
        blurDirection,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  
  ctx.restore();
}

