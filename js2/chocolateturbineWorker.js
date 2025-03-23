// Global constants
const CHOCOLATE_COUNT_MAX = 1000;
const ANIMATION_DURATION = 5000; // ms
const SPRING_FACTOR = 0.12;
const GRAVITY_FACTOR = 0.96;
const AIR_RESISTANCE = 0.95;

// Chocolate types and shapes
const CHOCOLATE_TYPES = {
  DARK: 'dark',
  MILK: 'milk',
  WHITE: 'white',
  TRUFFLE: 'truffle',
  COCOA: 'cocoa'
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
  SPLAT: 'splat'
};

// Enhanced chocolate color palette with richer tones and better contrast
const CHOCOLATE_COLORS = [
  { r: 45, g: 25, b: 12, a: 1 },      // Extra dark chocolate (darker and richer)
  { r: 65, g: 35, b: 18, a: 1 },      // Rich dark chocolate
  { r: 85, g: 48, b: 25, a: 1 },      // Semi-dark chocolate
  { r: 115, g: 65, b: 35, a: 1 },     // Premium milk chocolate
  { r: 140, g: 80, b: 40, a: 1 },     // Creamy milk chocolate
  { r: 165, g: 100, b: 65, a: 1 },    // Caramel (warmer tone)
  { r: 150, g: 120, b: 100, a: 1 },   // Mocha 
  { r: 110, g: 68, b: 39, a: 1 },     // Hazelnut
  { r: 225, g: 200, b: 170, a: 1 },   // White chocolate (brighter)
  { r: 235, g: 210, b: 180, a: 1 }    // Premium white chocolate
];

// Additional luxurious chocolate colors
const LUXURY_CHOCOLATE_COLORS = [
  { r: 75, g: 40, b: 20, a: 1 },      // Premium single-origin dark
  { r: 100, g: 55, b: 30, a: 1 },     // Artisanal dark
  { r: 130, g: 85, b: 55, a: 1 },     // Creamy hazelnut milk
  { r: 190, g: 140, b: 95, a: 1 },    // Gold-infused caramel
  { r: 220, g: 190, b: 150, a: 1 }    // Ivory white chocolate
];

// Animation state
let canvas = null;
let ctx = null;
let chocolates = [];
let chocolateSplats = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let chocolateCount = 0;
let performanceLevel = 1.0;
let chocolatePrototypes = {};
let splashCenter = { x: 0, y: 0 };
let renderQuality = 'high';
let backgroundImageData = null;

// WebGL support for enhanced performance
let glCanvas = null;
let gl = null;
let hasWebGLSupport = false;
let particleSystem = null;

// Statistics tracking
let stats = {
  fps: 0,
  frameTime: 0,
  particleCount: 0,
  drawCalls: 0
};

self.onmessage = function(e) {
  const { 
    imageData, 
    selectedRegions, 
    value,
    reset,
    deviceInfo,
    quality,
    useWebGL
  } = e.data;
  
  try {
    const currentTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    
    // Store original image data for later composition
    if (!backgroundImageData || reset) {
      backgroundImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
      );
    }
    
    // Set render quality if provided
    if (quality) {
      renderQuality = quality;
    }
    
    // Initialize canvas if not already done
    if (!canvas) {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', { alpha: true });
      
      // Try to initialize WebGL if requested
      if (useWebGL) {
        try {
          glCanvas = new OffscreenCanvas(width, height);
          gl = glCanvas.getContext('webgl2');
          if (gl) {
            hasWebGLSupport = true;
            initializeWebGL(gl, width, height);
          }
        } catch (glError) {
          console.warn('WebGL initialization failed:', glError);
          hasWebGLSupport = false;
        }
      }
      
      // Set dimensions
      canvas.width = width;
      canvas.height = height;
      if (glCanvas) {
        glCanvas.width = width;
        glCanvas.height = height;
      }
      
      // Set splash center - support for selected regions
      if (selectedRegions && selectedRegions.length > 0) {
        // Use the center of the first selected region
        const region = selectedRegions[0];
        splashCenter = { 
          x: region.x + region.width / 2, 
          y: region.y + region.height / 2 
        };
      } else {
        splashCenter = { x: width / 2, y: height / 2 };
      }
      
      // Initialize performance level based on device info
      if (deviceInfo) {
        performanceLevel = deviceInfo.isLowPower ? 0.5 : 
                          (deviceInfo.isHighPerformance ? 1.2 : 1.0);
                          
        // Adjust based on resolution
        const pixelCount = width * height;
        if (pixelCount > 2000000) { // > 2MP
          performanceLevel *= 0.8;
        } else if (pixelCount < 500000) { // < 0.5MP
          performanceLevel *= 1.2;
        }
      }
      
      // Create chocolate prototypes - now optimized with caching
      createChocolatePrototypes();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      chocolates = [];
      chocolateSplats = [];
      
      // Determine chocolate count based on performance level and image size
      const sizeFactor = Math.min(1.2, Math.sqrt((width * height) / (1920 * 1080)));
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel * sizeFactor);
      
      // Create chocolates
      createChocolates(width, height, selectedRegions);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Determine chocolate count based on performance level
      chocolateCount = Math.floor(CHOCOLATE_COUNT_MAX * performanceLevel);
      
      // Create chocolates
      createChocolates(width, height, selectedRegions);
    }
    
    // Calculate time delta for physics (clamped for stability)
    const deltaTime = Math.min(33, currentTime - previousTime) / 16.67;
    const rawDeltaTime = currentTime - previousTime;
    previousTime = currentTime;
    
    // Update stats
    stats.frameTime = rawDeltaTime;
    stats.fps = 1000 / Math.max(1, rawDeltaTime);
    stats.particleCount = chocolates.length + chocolateSplats.length;
    
    // Calculate animation progress
    const elapsed = currentTime - startTime;
    const progress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw original image
    ctx.putImageData(backgroundImageData, 0, 0);
    
    // Choose rendering path based on capabilities and settings
    if (hasWebGLSupport && renderQuality === 'high') {
      // WebGL rendering path for high-performance mode
      renderWebGL(gl, deltaTime, progress);
      
      // Composite WebGL onto 2D canvas
      ctx.drawImage(glCanvas, 0, 0);
      
      // Some effects still rendered in 2D for quality
      drawChocolateSplash(ctx, width, height, progress);
      
      if (progress > 0.2 && progress < 0.8) {
        drawChocolateDrips(ctx, width, height, progress);
      }
    } else {
      // Standard 2D Canvas rendering path
      
      // Draw liquid chocolate splash first
      drawChocolateSplash(ctx, width, height, progress);
      
      // Draw chocolate splats
      drawChocolateSplats(ctx, deltaTime);
      
      // Update and draw chocolates with optimized batching
      updateAndDrawChocolates(ctx, deltaTime, progress);
      
      // Add dripping effect
      if (progress > 0.2 && progress < 0.8) {
        drawChocolateDrips(ctx, width, height, progress);
      }
    }
    
    // Add final post-processing effects for high quality mode
    if (renderQuality === 'high') {
      applyPostProcessing(ctx, width, height, progress);
    }
    
    // Auto-tuning: Check if we need to adjust performance
    if (frameCount % 30 === 0) {
      // Measure FPS
      const fps = stats.fps;
      
      // Adjust performance if needed
      if (fps < 40 && performanceLevel > 0.4) {
        performanceLevel = Math.max(0.4, performanceLevel - 0.1);
        // Reduce particles if performance is poor
        if (chocolates.length > 100) {
          chocolates = chocolates.slice(0, Math.floor(chocolates.length * 0.8));
        }
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
      isComplete: progress >= 1.0,
      progress,
      performance: {
        chocolateCount: chocolates.length,
        performanceLevel,
        fps: Math.round(stats.fps),
        stats: stats
      }
    }, [resultImageData.data.buffer]);
  } catch (error) {
    console.error('Error in chocolate animation:', error);
    self.postMessage({
      error: error.message,
      isComplete: true
    });
  }
};

// WebGL initialization and rendering
function initializeWebGL(gl, width, height) {
  // Set up shaders, buffers, etc.
  const vertexShaderSource = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    attribute vec4 aColor;
    attribute float aSize;
    attribute float aRotation;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying vec2 vTextureCoord;
    varying vec4 vColor;
    
    void main(void) {
      float s = sin(aRotation);
      float c = cos(aRotation);
      mat2 rotationMatrix = mat2(c, -s, s, c);
      vec2 rotatedPosition = rotationMatrix * aVertexPosition * aSize;
      
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(rotatedPosition, 0.0, 1.0);
      vTextureCoord = aTextureCoord;
      vColor = aColor;
    }
  `;
  
  const fragmentShaderSource = `
    precision mediump float;
    
    varying vec2 vTextureCoord;
    varying vec4 vColor;
    
    uniform sampler2D uSampler;
    
    void main(void) {
      vec4 texColor = texture2D(uSampler, vTextureCoord);
      gl_FragColor = texColor * vColor;
    }
  `;
  
  // Create shader program
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error('Unable to initialize WebGL shader program: ' + 
                   gl.getProgramInfoLog(shaderProgram));
  }
  
  // Set up particle system
  particleSystem = {
    program: shaderProgram,
    attribs: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
      color: gl.getAttribLocation(shaderProgram, 'aColor'),
      size: gl.getAttribLocation(shaderProgram, 'aSize'),
      rotation: gl.getAttribLocation(shaderProgram, 'aRotation')
    },
    uniforms: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      sampler: gl.getUniformLocation(shaderProgram, 'uSampler')
    },
    buffers: {
      vertex: gl.createBuffer(),
      index: gl.createBuffer(),
      texture: gl.createBuffer(),
      color: gl.createBuffer(),
      size: gl.createBuffer(),
      rotation: gl.createBuffer()
    },
    textures: {},
    maxParticles: 5000
  };
  
  // Create and bind textures for chocolate types
  createChocolateTextures(gl);
  
  // Set up viewport and projection
  gl.viewport(0, 0, width, height);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Could not compile WebGL shader: ' + info);
  }
  
  return shader;
}

function createChocolateTextures(gl) {
  // Create textures for each chocolate type and shape
  const textureCanvas = new OffscreenCanvas(128, 128);
  const textureCtx = textureCanvas.getContext('2d');
  
  Object.values(CHOCOLATE_SHAPES).forEach(shape => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Draw chocolate shape to texture
    textureCtx.clearRect(0, 0, 128, 128);
    textureCtx.fillStyle = 'white';
    
    switch(shape) {
      case CHOCOLATE_SHAPES.ROUND:
        textureCtx.beginPath();
        textureCtx.arc(64, 64, 60, 0, Math.PI * 2);
        textureCtx.fill();
        break;
      
      case CHOCOLATE_SHAPES.SQUARE:
        textureCtx.fillRect(4, 4, 120, 120);
        break;
        
      case CHOCOLATE_SHAPES.HEART:
        drawHeart(textureCtx, 64, 64, 60);
        break;
        
      // Add other shapes as needed
      default:
        textureCtx.beginPath();
        textureCtx.arc(64, 64, 60, 0, Math.PI * 2);
        textureCtx.fill();
    }
    
    // Set texture parameters
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 
      gl.RGBA, gl.UNSIGNED_BYTE,
      textureCanvas
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    
    // Store texture
    particleSystem.textures[shape] = texture;
  });
  
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function renderWebGL(gl, deltaTime, progress) {
  // Update physics for all particles
  updateChocolatesPhysics(deltaTime, progress);
  
  // Clear the canvas
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Set up orthographic projection
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  const projectionMatrix = [
    2/width, 0, 0, 0,
    0, -2/height, 0, 0,
    0, 0, 1, 0,
    -1, 1, 0, 1
  ];
  
  // Identity modelview matrix
  const modelViewMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
  
  // Use shader program
  gl.useProgram(particleSystem.program);
  
  // Set projection and modelview matrices
  gl.uniformMatrix4fv(
    particleSystem.uniforms.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    particleSystem.uniforms.modelViewMatrix,
    false,
    modelViewMatrix
  );
  
  // Group particles by shape for efficient rendering
  const particlesByShape = {};
  Object.values(CHOCOLATE_SHAPES).forEach(shape => {
    particlesByShape[shape] = [];
  });
  
  // Add active chocolates to appropriate shape groups
  chocolates.forEach(choc => {
    if (choc.opacity > 0.01) {
      particlesByShape[choc.shape].push(choc);
    }
  });
  
  // Render each shape group separately to minimize texture bindings
  stats.drawCalls = 0;
  
  Object.entries(particlesByShape).forEach(([shape, particles]) => {
    if (particles.length === 0) return;
    
    // Bind appropriate texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, particleSystem.textures[shape]);
    gl.uniform1i(particleSystem.uniforms.sampler, 0);
    
    // Prepare vertex data
    const vertexData = [];
    const textureCoordData = [];
    const colorData = [];
    const sizeData = [];
    const rotationData = [];
    
    // Quad vertices (2 triangles)
    const quadVertices = [
      -0.5, -0.5,
       0.5, -0.5,
       0.5,  0.5,
      -0.5,  0.5
    ];
    
    // Texture coordinates
    const texCoords = [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0
    ];
    
    // Fill buffers with particle data
    particles.forEach(particle => {
      // Add vertices for this particle (4 vertices per quad)
      for (let i = 0; i < 4; i++) {
        // Position (will be transformed in shader)
        vertexData.push(quadVertices[i*2], quadVertices[i*2+1]);
        
        // Texture coordinates
        textureCoordData.push(texCoords[i*2], texCoords[i*2+1]);
        
        // Color with opacity
        colorData.push(
          particle.color.r / 255, 
          particle.color.g / 255, 
          particle.color.b / 255, 
          particle.opacity
        );
        
        // Size (per vertex but same for all 4 vertices of a particle)
        sizeData.push(particle.size);
        
        // Rotation (per vertex but same for all 4 vertices of a particle)
        rotationData.push(particle.rotation);
      }
    });
    
    // Indices for drawing quads as triangles
    const indices = [];
    for (let i = 0; i < particles.length; i++) {
      const baseIndex = i * 4;
      // First triangle
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
      // Second triangle
      indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
    }
    
    // Bind and fill vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSystem.buffers.vertex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(particleSystem.attribs.vertexPosition);
    gl.vertexAttribPointer(particleSystem.attribs.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    // Bind and fill texture coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSystem.buffers.texture);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(particleSystem.attribs.textureCoord);
    gl.vertexAttribPointer(particleSystem.attribs.textureCoord, 2, gl.FLOAT, false, 0, 0);
    
    // Bind and fill color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSystem.buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(particleSystem.attribs.color);
    gl.vertexAttribPointer(particleSystem.attribs.color, 4, gl.FLOAT, false, 0, 0);
    
    // Bind and fill size buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSystem.buffers.size);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizeData), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(particleSystem.attribs.size);
    gl.vertexAttribPointer(particleSystem.attribs.size, 1, gl.FLOAT, false, 0, 0);
    
    // Bind and fill rotation buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSystem.buffers.rotation);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rotationData), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(particleSystem.attribs.rotation);
    gl.vertexAttribPointer(particleSystem.attribs.rotation, 1, gl.FLOAT, false, 0, 0);
    
    // Bind and fill index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particleSystem.buffers.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.DYNAMIC_DRAW);
    
    // Draw the triangles
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    stats.drawCalls++;
  });
}

function updateChocolatesPhysics(deltaTime, progress) {
  const deadChocolates = [];
  const width = canvas.width;
  const height = canvas.height;
  
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
    
    // Apply physics with improved stability
    choc.vy += choc.gravity * deltaTime;
    
    // Apply drag with improved accuracy
    choc.vx *= Math.pow(1 - choc.drag, deltaTime);
    choc.vy *= Math.pow(1 - choc.drag, deltaTime);
    
    // Apply slight turbulence for more natural movement
    if (adjustedProgress < 0.5) {
      choc.vx += (Math.random() - 0.5) * 0.1 * deltaTime;
      choc.vy += (Math.random() - 0.5) * 0.1 * deltaTime;
    }
    
    // Simulate melting effect
    if (adjustedProgress > 0.6) {
      choc.size -= choc.meltFactor * deltaTime;
      if (choc.size < 1) {
        choc.opacity = 0;
        deadChocolates.push(i);
        continue;
      }
    }
    
    // Update position
    choc.x += choc.vx * deltaTime;
    choc.y += choc.vy * deltaTime;
    
    // Simple screen boundary check with bounce
    const radius = choc.size / 2;
    
    // Bounce off edges if not too many bounces yet
    if (choc.bounceCount < choc.maxBounces) {
      if (choc.x - radius < 0) {
        choc.x = radius;
        choc.vx = Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.5) {
          addChocolateSplat(
            5 + Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      } else if (choc.x + radius > width) {
        choc.x = width - radius;
        choc.vx = -Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.5) {
          addChocolateSplat(
            width - 5 - Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      }
      
      if (choc.y - radius < 0) {
        choc.y = radius;
        choc.vy = Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
      } else if (choc.y + radius > height) {
        choc.y = height - radius;
        choc.vy = -Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
        
        // Create a chocolate splat on bounce with floor
        if (Math.random() < 0.7) {
          addChocolateSplat(
            choc.x,
            height - 2,
            choc.size * (0.8 + Math.random() * 0.7),
            0
          );
        }
      }
    }
    
    // Update rotation with smoother physics
    choc.rotation += choc.rotationSpeed * deltaTime;
    
    // Fade out based on lifespan
    if (adjustedProgress > 0.7) {
      const fadeRate = 1 / (choc.lifespan * 60);
      choc.opacity = Math.max(0, choc.opacity - fadeRate * deltaTime);
    }
  }
  
  // Remove dead chocolates in reverse order to avoid index issues
  for (let i = deadChocolates.length - 1; i >= 0; i--) {
    chocolates.splice(deadChocolates[i], 1);
  }
  
  // Update chocolate splats
  for (let i = 0; i < chocolateSplats.length; i++) {
    const splat = chocolateSplats[i];
    const elapsed = (performance.now() - splat.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < splat.delay) continue;
    
    // Grow the splat
    splat.currentSize = Math.min(splat.targetSize, splat.currentSize + splat.growthRate * deltaTime * splat.targetSize);
    splat.opacity = Math.min(splat.targetOpacity, splat.opacity + 0.03 * deltaTime);
  }
}

function createChocolatePrototypes() {
  // Use a smaller prototype cache for memory efficiency
  const prototypeCanvas = new OffscreenCanvas(64, 64);
  const prototypeCtx = prototypeCanvas.getContext('2d', { 
    alpha: true,
    willReadFrequently: false 
  });
  
  // Create different chocolate shapes with improved caching strategy
  for (const type of Object.values(CHOCOLATE_TYPES)) {
    chocolatePrototypes[type] = {};
    
    for (const shape of Object.values(CHOCOLATE_SHAPES)) {
      chocolatePrototypes[type][shape] = {};
      
      // Only cache the most common colors to save memory
      const colorsToCache = type === CHOCOLATE_TYPES.DARK ? 
        CHOCOLATE_COLORS.slice(0, 3) : 
        (type === CHOCOLATE_TYPES.MILK ? 
          CHOCOLATE_COLORS.slice(3, 7) : 
          CHOCOLATE_COLORS.slice(7, 10));
      
      for (const color of colorsToCache) {
        const colorKey = `rgb(${color.r},${color.g},${color.b})`;
        
        // Create only needed sizes (optimization)
        const sizesToCache = [4, 8, 16, 32];
        chocolatePrototypes[type][shape][colorKey] = {};
        
        for (const size of sizesToCache) {
          const key = `${size}`;
          
          prototypeCtx.clearRect(0, 0, 64, 64);
          
          // Base color
          prototypeCtx.fillStyle = colorKey;
          prototypeCtx.globalAlpha = 1;
          
          const halfSize = size / 2;
          const center = 32;
          
          switch (shape) {
            case CHOCOLATE_SHAPES.ROUND:
              // Enhanced round chocolate with more realistic 3D effect
              drawRoundChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.SQUARE:
              // Enhanced square chocolate with details
              drawSquareChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.HEART:
              // Enhanced heart chocolate
              drawHeartChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.TRUFFLE:
              // Enhanced truffle with better textures
              drawTruffleChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.CHUNK:
              // Enhanced chocolate chunk with realistic break patterns
              drawChunkChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.RECTANGLE:
              // Enhanced rectangle chocolate bar segment
              drawRectangleChocolate(prototypeCtx, center, center, size, color);
              break;
              
            case CHOCOLATE_SHAPES.SPLAT:
              // Enhanced splat with more realistic liquid appearance
              drawSplatChocolate(prototypeCtx, center, center, size, color);
              break;
              
            default:
              // Fallback to round if shape not implemented
              drawRoundChocolate(prototypeCtx, center, center, size, color);
          }
          
          // Store the prototype
          chocolatePrototypes[type][shape][colorKey][key] = prototypeCanvas.transferToImageBitmap();
        }
      }
    }
  }
}

// Enhanced chocolate drawing functions
function drawRoundChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for 3D effect
  const darkShade = `rgba(${Math.max(0, color.r-70)},${Math.max(0, color.g-70)},${Math.max(0, color.b-70)},0.8)`;
  const midShade = `rgba(${Math.max(0, color.r-40)},${Math.max(0, color.g-40)},${Math.max(0, color.b-40)},0.7)`;
  const lightShade = `rgba(${Math.min(255, color.r+20)},${Math.min(255, color.g+20)},${Math.min(255, color.b+20)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  console.log('cx :>> ', cx);
  console.log('cy :>> ', cy);
  console.log('halfSize :>> ', halfSize);
  // Draw shadow gradient for 3D effect
  const shadowGrad = ctx.createRadialGradient(
    cx - halfSize/3, cy - halfSize/3, 0,
    cx, cy, halfSize
  );
  shadowGrad.addColorStop(0, lightShade);
  shadowGrad.addColorStop(0.3, baseColor);
  shadowGrad.addColorStop(0.7, midShade);
  shadowGrad.addColorStop(1, darkShade);
  
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, halfSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Add textured surface with improved pattern
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 12; i++) {
    const noiseSize = halfSize * 0.2;
    const nx = cx + (Math.random() - 0.5) * halfSize * 1.6;
    const ny = cy + (Math.random() - 0.5) * halfSize * 1.6;
    
    ctx.fillStyle = Math.random() > 0.6 ? 
      `rgba(255,255,255,0.3)` : darkShade;
      
    ctx.beginPath();
    ctx.arc(nx, ny, noiseSize * Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  // Bright shine highlight with improved gradient
  const gradient = ctx.createRadialGradient(
    cx - halfSize/3, cy - halfSize/3, 0,
    cx - halfSize/3, cy - halfSize/3, halfSize/1.5
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.0)");
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx - halfSize/3, cy - halfSize/3, halfSize/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Add subtle edge shadow for better 3D effect
  ctx.strokeStyle = darkShade;
  ctx.lineWidth = Math.max(1, size/12);
  ctx.beginPath();
  ctx.arc(cx, cy, halfSize - ctx.lineWidth/2, 0, Math.PI * 2);
  ctx.stroke();
  
  // Add secondary smaller highlight for realism
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(
    cx + halfSize/3,
    cy - halfSize/4,
    halfSize/5,
    0, Math.PI * 2
  );
  ctx.fill();
}

function drawSquareChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Create base colors for enhanced 3D effect
  const darkColor = `rgba(${Math.max(0, color.r-60)},${Math.max(0, color.g-60)},${Math.max(0, color.b-60)},0.9)`;
  const midColor = `rgba(${Math.max(0, color.r-30)},${Math.max(0, color.g-30)},${Math.max(0, color.b-30)},0.7)`;
  const lightColor = `rgba(${Math.min(255, color.r+40)},${Math.min(255, color.g+40)},${Math.min(255, color.b+40)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Enhanced 3D shadow effect
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(cx - halfSize - 1, cy - halfSize - 1, size + 2, size + 2, size/6);
  ctx.fill();
  
  // Main shape with beveled edges
  const mainGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize,
    cx + halfSize, cy + halfSize
  );
  mainGradient.addColorStop(0, lightColor);
  mainGradient.addColorStop(0.3, baseColor);
  mainGradient.addColorStop(0.7, baseColor);
  mainGradient.addColorStop(1, midColor);
  
  ctx.fillStyle = mainGradient;
  ctx.beginPath();
  ctx.roundRect(cx - halfSize, cy - halfSize, size, size, size/8);
  ctx.fill();
  
  // Add chocolate segment pattern with deeper, more realistic grooves
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = Math.max(1.5, size/10);
  
  // Horizontal and vertical segment lines
  ctx.beginPath();
  ctx.moveTo(cx - halfSize + size/8, cy);
  ctx.lineTo(cx + halfSize - size/8, cy);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfSize + size/8);
  ctx.lineTo(cx, cy + halfSize - size/8);
  ctx.stroke();
  
  // Add diagonal texture lines for greater detail
  ctx.strokeStyle = midColor;
  ctx.lineWidth = Math.max(0.5, size/25);
  
  // Add subtle engravings or text like real chocolate bars
  if (size >= 16) {
    // Top left segment
    const segment1Center = {
      x: cx - halfSize/2,
      y: cy - halfSize/2
    };
    
    // Add small logo or pattern
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.arc(
      segment1Center.x,
      segment1Center.y,
      size/10,
      0, Math.PI * 2
    );
    ctx.fill();
    
    // Top right segment - different pattern
    const segment2Center = {
      x: cx + halfSize/2,
      y: cy - halfSize/2
    };
    
    // Small square logo
    ctx.beginPath();
    ctx.roundRect(
      segment2Center.x - size/12,
      segment2Center.y - size/12,
      size/6,
      size/6,
      size/30
    );
    ctx.fill();
  }
  
  // Add glossy sheen with enhanced gradient
  const topGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize,
    cx + halfSize, cy + halfSize
  );
  topGradient.addColorStop(0, "rgba(255,255,255,0.4)");
  topGradient.addColorStop(0.2, "rgba(255,255,255,0.15)");
  topGradient.addColorStop(0.5, "rgba(255,255,255,0)");
  topGradient.addColorStop(0.8, "rgba(20,10,0,0.15)");
  topGradient.addColorStop(1, "rgba(20,10,0,0.3)");
  
  ctx.fillStyle = topGradient;
  ctx.beginPath();
  ctx.roundRect(cx - halfSize, cy - halfSize, size, size, size/8);
  ctx.fill();
  
  // Add small imperfections/bubble texture for greater realism
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < 5; i++) {
    const bx = cx + (Math.random() - 0.5) * size * 0.6;
    const by = cy + (Math.random() - 0.5) * size * 0.6;
    const br = size * (0.02 + Math.random() * 0.04);
    
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add sharp highlight for better specular reflection
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.roundRect(cx - halfSize + size/6, cy - halfSize + size/6, size/5, size/5, size/20);
  ctx.fill();
}

function drawHeartChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for enhanced 3D effect
  const darkShade = `rgba(${Math.max(0, color.r-70)},${Math.max(0, color.g-70)},${Math.max(0, color.b-70)},0.8)`;
  const midShade = `rgba(${Math.max(0, color.r-30)},${Math.max(0, color.g-30)},${Math.max(0, color.b-30)},0.7)`;
  const lightShade = `rgba(${Math.min(255, color.r+30)},${Math.min(255, color.g+10)},${Math.min(255, color.b+10)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Create base heart with gradient for 3D effect
  const heartGradient = ctx.createRadialGradient(
    cx, cy, 0,
    cx, cy, halfSize
  );
  heartGradient.addColorStop(0, lightShade);
  heartGradient.addColorStop(0.4, baseColor);
  heartGradient.addColorStop(0.8, midShade);
  heartGradient.addColorStop(1, darkShade);
  
  ctx.fillStyle = heartGradient;
  drawHeart(ctx, cx, cy, halfSize);
  
  // Add deeper color in center cavity for dimension
  ctx.fillStyle = darkShade; 
  const smallerHeart = halfSize * 0.75;
  drawHeart(ctx, cx, cy + halfSize/10, smallerHeart);
  
  // Add glossy highlight with improved positioning
  const heartShineGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize,
    cx + halfSize/2, cy + halfSize/2
  );
  heartShineGradient.addColorStop(0, "rgba(255,255,255,0.7)");
  heartShineGradient.addColorStop(0.2, "rgba(255,255,255,0.3)");
  heartShineGradient.addColorStop(0.5, "rgba(255,255,255,0)");
  heartShineGradient.addColorStop(1, "rgba(0,0,0,0)");
  
  ctx.fillStyle = heartShineGradient;
  drawHeart(ctx, cx - halfSize/5, cy - halfSize/5, halfSize * 0.6);
  
  // Add outline for better definition
  ctx.strokeStyle = darkShade;
  ctx.lineWidth = Math.max(1, size/10);
  drawHeartStroke(ctx, cx, cy, halfSize);
  
  // Add subtle pattern/texture if large enough
  if (size >= 16) {
    ctx.fillStyle = midShade;
    ctx.globalAlpha = 0.3;
    
    // Draw small hearts or swirls inside
    for (let i = 0; i < 3; i++) {
      const patternX = cx + (Math.random() - 0.5) * halfSize * 0.8;
      const patternY = cy + (Math.random() - 0.5) * halfSize * 0.8;
      const patternSize = halfSize * 0.2 * Math.random();
      
      // Alternate between dots and tiny hearts
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.arc(patternX, patternY, patternSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawHeart(ctx, patternX, patternY, patternSize);
      }
    }
    ctx.globalAlpha = 1;
  }
  
  // Add secondary highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(
    cx + halfSize/3,
    cy - halfSize/3,
    halfSize/8,
    0, Math.PI * 2
  );
  ctx.fill();
}

function drawTruffleChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for enhanced 3D effect
  const darkShade = `rgba(${Math.max(0, color.r-70)},${Math.max(0, color.g-70)},${Math.max(0, color.b-70)},0.9)`;
  const midShade = `rgba(${Math.max(0, color.r-40)},${Math.max(0, color.g-40)},${Math.max(0, color.b-40)},0.75)`;
  const lightShade = `rgba(${Math.min(255, color.r+20)},${Math.min(255, color.g+10)},${Math.min(255, color.b+5)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Draw truffle base with more irregular, organic shape
  const truffleGrad = ctx.createRadialGradient(
    cx - halfSize/5, cy - halfSize/5, 0,
    cx, cy, halfSize
  );
  
  // Richer color gradient for truffle
  truffleGrad.addColorStop(0, lightShade);
  truffleGrad.addColorStop(0.3, baseColor);
  truffleGrad.addColorStop(0.7, midShade);
  truffleGrad.addColorStop(1, darkShade);
  
  ctx.fillStyle = truffleGrad;
  ctx.beginPath();
  
  // Create more organic, hand-rolled truffle shape
  const trufflePoints = 18;
  ctx.moveTo(
    cx + Math.cos(0) * halfSize * (0.9 + Math.sin(0*5)*0.15),
    cy + Math.sin(0) * halfSize * (0.9 + Math.sin(0*5)*0.15)
  );
  
  for (let i = 1; i <= trufflePoints; i++) {
    const angle = (i / trufflePoints) * Math.PI * 2;
    const noise1 = Math.sin(i * 5) * 0.15;
    const noise2 = Math.cos(i * 7) * 0.1;
    const radiusVar = 0.85 + noise1 + noise2;
    const x = cx + Math.cos(angle) * halfSize * radiusVar;
    const y = cy + Math.sin(angle) * halfSize * radiusVar;
    
    // Use quadratic curves for smoother, more organic shape
    const prevAngle = ((i-1) / trufflePoints) * Math.PI * 2;
    const midAngle = (prevAngle + angle) / 2;
    const ctrlX = cx + Math.cos(midAngle) * halfSize * (1.1 + Math.random() * 0.2);
    const ctrlY = cy + Math.sin(midAngle) * halfSize * (1.1 + Math.random() * 0.2);
    
    ctx.quadraticCurveTo(ctrlX, ctrlY, x, y);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Add cocoa powder dusting effect with improved pattern
  ctx.fillStyle = darkShade;
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = halfSize * (0.3 + Math.random() * 1.1);
    const dustX = cx + Math.cos(angle) * dist;
    const dustY = cy + Math.sin(angle) * dist;
    const dustSize = size / (8 + Math.random() * 10);
    
    // Vary opacity for more natural dusting appearance
    ctx.globalAlpha = 0.1 + Math.random() * 0.5;
    ctx.beginPath();
    
    // Mix different dust particle shapes
    if (Math.random() > 0.7) {
      // Oval dust particles
      ctx.ellipse(
        dustX, dustY,
        dustSize,
        dustSize * (0.6 + Math.random() * 0.4),
        Math.random() * Math.PI,
        0, Math.PI * 2
      );
    } else {
      // Round dust particles
      ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  // Add shine spot with improved realism
  const truffleShineGrad = ctx.createRadialGradient(
    cx - halfSize/3, cy - halfSize/3, 0,
    cx - halfSize/3, cy - halfSize/3, halfSize/1.5
  );
  truffleShineGrad.addColorStop(0, "rgba(255,255,255,0.9)");
  truffleShineGrad.addColorStop(0.3, "rgba(255,255,255,0.3)");
  truffleShineGrad.addColorStop(0.6, "rgba(255,255,255,0.0)");
  
  ctx.fillStyle = truffleShineGrad;
  ctx.beginPath();
  ctx.arc(cx - halfSize/3, cy - halfSize/3, halfSize/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Add secondary highlights for better dimension
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.arc(
    cx + halfSize/4,
    cy - halfSize/4,
    halfSize/6,
    0, Math.PI * 2
  );
  ctx.fill();
}

function drawChunkChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for enhanced 3D effect
  const darkColor = `rgba(${Math.max(0, color.r-80)},${Math.max(0, color.g-80)},${Math.max(0, color.b-80)},0.9)`;
  const midColor = `rgba(${Math.max(0, color.r-40)},${Math.max(0, color.g-40)},${Math.max(0, color.b-40)},0.7)`;
  const lightColor = `rgba(${Math.min(255, color.r+15)},${Math.min(255, color.g+15)},${Math.min(255, color.b+10)},0.8)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Create more realistic broken chocolate chunk shape
  ctx.beginPath();
  
  // Generate irregular polygon with more natural break points
  const chunkPoints = 8;
  const radiusVariations = [];
  // Create variations with realistic chocolate break patterns
  for (let i = 0; i < chunkPoints; i++) {
    // More extreme variations for chunk edges
    if (i % 2 === 0) {
      radiusVariations.push(0.7 + Math.random() * 0.6);
    } else {
      radiusVariations.push(0.5 + Math.random() * 0.7);
    }
  }
  
  // Start point with slight rotation for variation
  const startAngle = Math.random() * Math.PI * 2;
  ctx.moveTo(
    cx + Math.cos(startAngle) * halfSize * radiusVariations[0],
    cy + Math.sin(startAngle) * halfSize * radiusVariations[0]
  );
  
  // Draw irregular edges with more natural chocolate break patterns
  for (let i = 1; i <= chunkPoints; i++) {
    const angle = startAngle + (i / chunkPoints) * Math.PI * 2;
    const nextRadius = radiusVariations[i % chunkPoints];
    const x = cx + Math.cos(angle) * halfSize * nextRadius;
    const y = cy + Math.sin(angle) * halfSize * nextRadius;
    
    // For more natural breaks, add some jagged edges
    if (Math.random() > 0.6) {
      // Create jagged edge with multiple segments
      const jaggedSegments = 2 + Math.floor(Math.random() * 2);
      let lastX = cx + Math.cos(startAngle + ((i-1) / chunkPoints) * Math.PI * 2) * 
                  halfSize * radiusVariations[(i-1) % chunkPoints];
      let lastY = cy + Math.sin(startAngle + ((i-1) / chunkPoints) * Math.PI * 2) * 
                  halfSize * radiusVariations[(i-1) % chunkPoints];
      
      for (let j = 1; j <= jaggedSegments; j++) {
        const subT = j / (jaggedSegments + 1);
        const subAngle = startAngle + ((i-1) / chunkPoints + subT / chunkPoints) * Math.PI * 2;
        
        // Add some random jitter to the jagged edge
        const jitterRadius = (radiusVariations[(i-1) % chunkPoints] * (1 - subT) + 
                             nextRadius * subT) * (0.9 + Math.random() * 0.2);
        
        const midX = cx + Math.cos(subAngle) * halfSize * jitterRadius;
        const midY = cy + Math.sin(subAngle) * halfSize * jitterRadius;
        
        ctx.lineTo(midX, midY);
        lastX = midX;
        lastY = midY;
      }
    }
    
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
  
  // Create rich 3D effect with enhanced shadow gradient
  const chunkGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize,
    cx + halfSize, cy + halfSize
  );
  chunkGradient.addColorStop(0, lightColor);
  chunkGradient.addColorStop(0.3, baseColor);
  chunkGradient.addColorStop(0.7, midColor);
  chunkGradient.addColorStop(1, darkColor);
  
  ctx.fillStyle = chunkGradient;
  ctx.fill();
  
  // Add break lines/cracks with improved realism
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = Math.max(1, size/25);
  
  // Add realistic internal fracture lines
  for (let i = 0; i < 4; i++) {
    const startX = cx + (Math.random() - 0.5) * size * 0.6;
    const startY = cy + (Math.random() - 0.5) * size * 0.6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Create jagged crack with multiple segments
    let currentX = startX;
    let currentY = startY;
    const segments = 2 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < segments; j++) {
      const length = size * (0.1 + Math.random() * 0.2);
      // More natural crack angles based on chocolate crystal structure
      const baseAngle = j * Math.PI / 3 + Math.random() * Math.PI / 3;
      const angle = baseAngle + (Math.random() - 0.5) * Math.PI / 4;
      
      currentX += Math.cos(angle) * length;
      currentY += Math.sin(angle) * length;
      
      ctx.lineTo(currentX, currentY);
    }
    
    ctx.stroke();
  }
  
  // Add highlights to give appearance of internal crystalline structure
  if (size >= 12) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    
    // Crystal structure patterns
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = halfSize * 0.5;
      const crystalX = cx + Math.cos(angle) * dist;
      const crystalY = cy + Math.sin(angle) * dist;
      
      // Draw crystalline structure with lines radiating from point
      for (let j = 0; j < 3; j++) {
        const lineAngle = j * Math.PI * 2 / 3 + Math.random() * Math.PI / 6;
        const lineLength = size * 0.15;
        
        ctx.moveTo(crystalX, crystalY);
        ctx.lineTo(
          crystalX + Math.cos(lineAngle) * lineLength,
          crystalY + Math.sin(lineAngle) * lineLength
        );
      }
    }
    ctx.stroke();
  }
  
  // Add glossy highlight for rich chocolate appearance
  const chunkShineGrad = ctx.createRadialGradient(
    cx - halfSize/3, cy - halfSize/3, 0,
    cx - halfSize/3, cy - halfSize/3, halfSize
  );
  chunkShineGrad.addColorStop(0, "rgba(255,255,255,0.7)");
  chunkShineGrad.addColorStop(0.3, "rgba(255,255,255,0.2)");
  chunkShineGrad.addColorStop(0.7, "rgba(255,255,255,0)");
  
  ctx.fillStyle = chunkShineGrad;
  ctx.beginPath();
  ctx.arc(cx - halfSize/3, cy - halfSize/3, halfSize/2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRectangleChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for enhanced 3D effect
  const darkColor = `rgba(${Math.max(0, color.r-60)},${Math.max(0, color.g-60)},${Math.max(0, color.b-60)},0.9)`;
  const midColor = `rgba(${Math.max(0, color.r-30)},${Math.max(0, color.g-30)},${Math.max(0, color.b-30)},0.7)`;
  const lightColor = `rgba(${Math.min(255, color.r+30)},${Math.min(255, color.g+20)},${Math.min(255, color.b+10)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Draw enhanced 3D shadow first with proper depth
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.roundRect(
    cx - halfSize - 1, 
    cy - halfSize*0.7 - 1, 
    size + 2, 
    size*0.7 + 2, 
    size/8
  );
  ctx.fill();
  
  // Create the chocolate bar segment with gradient for 3D effect
  const barGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize*0.7,
    cx + halfSize, cy + halfSize*0.7
  );
  barGradient.addColorStop(0, lightColor);
  barGradient.addColorStop(0.3, baseColor);
  barGradient.addColorStop(0.7, baseColor);
  barGradient.addColorStop(1, midColor);
  
  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(
    cx - halfSize, 
    cy - halfSize*0.7, 
    size, 
    size*0.7, 
    size/8
  );
  ctx.fill();
  
  // Add segment pattern with realistic grooves
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = Math.max(1, size/15);
  
  // Horizontal middle line
  ctx.beginPath();
  ctx.moveTo(cx - halfSize + size/10, cy);
  ctx.lineTo(cx + halfSize - size/10, cy);
  ctx.stroke();
  
  // Vertical dividers with proper spacing
  if (size >= 8) {
    const dividers = 3;
    for (let i = 1; i < dividers; i++) {
      const x = cx - halfSize + (size * i / dividers);
      
      ctx.beginPath();
      ctx.moveTo(x, cy - halfSize*0.7 + size/10);
      ctx.lineTo(x, cy + halfSize*0.7 - size/10);
      ctx.stroke();
    }
  }
  
  // Create glossy top surface with improved lighting
  const rectGradient = ctx.createLinearGradient(
    cx - halfSize, cy - halfSize*0.7,
    cx + halfSize, cy + halfSize*0.7
  );
  rectGradient.addColorStop(0, "rgba(255,255,255,0.3)");
  rectGradient.addColorStop(0.3, "rgba(255,255,255,0.15)");
  rectGradient.addColorStop(0.7, "rgba(0,0,0,0.05)");
  rectGradient.addColorStop(1, "rgba(0,0,0,0.2)");
  
  ctx.fillStyle = rectGradient;
  ctx.beginPath();
  ctx.roundRect(
    cx - halfSize, 
    cy - halfSize*0.7, 
    size, 
    size*0.7, 
    size/8
  );
  ctx.fill();
  
  // Add embossed logo/pattern in each segment if large enough
  if (size >= 12) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    const segments = 3;
    const segWidth = size / segments;
    
    for (let i = 0; i < segments; i++) {
      const segX = cx - halfSize + (i * segWidth) + segWidth/2;
      
      // Add segment-specific patterns
      if (i === 0) {
        // Logo or symbol in first segment
        ctx.beginPath();
        ctx.arc(
          segX, 
          cy - halfSize*0.3, 
          segWidth * 0.2, 
          0, Math.PI * 2
        );
        ctx.fill();
      } else if (i === 1) {
        // Letter or number in middle segment
        if (size >= 16) {
          // Draw a simple "C" for chocolate
          ctx.beginPath();
          ctx.arc(
            segX, cy,
            segWidth * 0.25,
            Math.PI * 0.25, Math.PI * 1.75,
            false
          );
          ctx.stroke();
        } else {
          // Simple shape for smaller sizes
          ctx.beginPath();
          ctx.arc(
            segX, cy,
            segWidth * 0.15,
            0, Math.PI * 2
          );
          ctx.fill();
        }
      } else {
        // Pattern in last segment
        ctx.beginPath();
        ctx.moveTo(segX - segWidth * 0.2, cy - segWidth * 0.2);
        ctx.lineTo(segX + segWidth * 0.2, cy + segWidth * 0.2);
        ctx.moveTo(segX + segWidth * 0.2, cy - segWidth * 0.2);
        ctx.lineTo(segX - segWidth * 0.2, cy + segWidth * 0.2);
        ctx.stroke();
      }
    }
    
    // Add highlight for glossy appearance
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.roundRect(
      cx - halfSize/2.5, 
      cy - halfSize*0.6, 
      size/5, 
      size/6, 
      size/16
    );
    ctx.fill();
  }
}

function drawSplatChocolate(ctx, cx, cy, size, color) {
  const halfSize = size / 2;
  
  // Calculate colors for enhanced liquid appearance
  const darkColor = `rgba(${Math.max(0, color.r-60)},${Math.max(0, color.g-60)},${Math.max(0, color.b-60)},0.9)`;
  const midColor = `rgba(${Math.max(0, color.r-30)},${Math.max(0, color.g-30)},${Math.max(0, color.b-30)},0.8)`;
  const lightColor = `rgba(${Math.min(255, color.r+20)},${Math.min(255, color.g+20)},${Math.min(255, color.b+20)},0.7)`;
  const baseColor = `rgb(${color.r},${color.g},${color.b})`;
  
  // Create enhanced splat gradient with liquid appearance
  const splatGradient = ctx.createRadialGradient(
    cx, cy, 0,
    cx, cy, halfSize
  );
  splatGradient.addColorStop(0, lightColor);
  splatGradient.addColorStop(0.4, baseColor);
  splatGradient.addColorStop(0.8, midColor);
  splatGradient.addColorStop(1, darkColor);
  
  ctx.fillStyle = splatGradient;
  drawEnhancedChocolateSplat(ctx, cx, cy, size);
  
  // Add drip/flow texture details with improved realism
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = Math.max(1, size/30);
  
  // Add random drip lines with more natural flow patterns
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const startDist = halfSize * (0.5 + Math.random() * 0.3);
    const startX = cx + Math.cos(angle) * startDist;
    const startY = cy + Math.sin(angle) * startDist;
    
    // Create drip path
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    let currentX = startX;
    let currentY = startY;
    const dripLength = halfSize * (0.2 + Math.random() * 0.3);
    const segments = 3 + Math.floor(Math.random() * 3);
    
    // Drip follows gravity with randomness
    for (let j = 0; j < segments; j++) {
      const segLength = dripLength / segments;
      // Drips tend to flow downward
      const gravityInfluence = Math.min(0.8, j * 0.2);
      const dirAngle = angle * (1-gravityInfluence) + Math.PI/2 * gravityInfluence + 
                       (Math.random() - 0.5) * 0.5;
      
      currentX += Math.cos(dirAngle) * segLength;
      currentY += Math.sin(dirAngle) * segLength;
      
      ctx.lineTo(currentX, currentY);
    }
    
    ctx.stroke();
  }
  
  // Add internal texture lines for liquid chocolate appearance
  ctx.strokeStyle = `rgba(${Math.max(0, color.r-40)},${Math.max(0, color.g-40)},${Math.max(0, color.b-40)},0.5)`;
  ctx.lineWidth = Math.max(0.5, size/50);
  
  for (let i = 0; i < 8; i++) {
    const startAngle = Math.random() * Math.PI * 2;
    const startDist = halfSize * Math.random() * 0.5;
    const startX = cx + Math.cos(startAngle) * startDist;
    const startY = cy + Math.sin(startAngle) * startDist;
    
    const endAngle = startAngle + (Math.random() - 0.5) * Math.PI;
    const endDist = halfSize * (0.5 + Math.random() * 0.4);
    const endX = cx + Math.cos(endAngle) * endDist;
    const endY = cy + Math.sin(endAngle) * endDist;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Add control points for natural flow curves
    const ctrlX = cx + Math.cos((startAngle + endAngle)/2) * halfSize * 0.7;
    const ctrlY = cy + Math.sin((startAngle + endAngle)/2) * halfSize * 0.7;
    
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();
  }
  
  // Add enhanced highlights for glossy liquid appearance
  // Main highlight
  const splatShineGrad = ctx.createRadialGradient(
    cx - halfSize/4, cy - halfSize/4, 0,
    cx - halfSize/4, cy - halfSize/4, halfSize/1.2
  );
  splatShineGrad.addColorStop(0, "rgba(255,255,255,0.8)");
  splatShineGrad.addColorStop(0.3, "rgba(255,255,255,0.3)");
  splatShineGrad.addColorStop(0.7, "rgba(255,255,255,0)");
  
  ctx.fillStyle = splatShineGrad;
  ctx.beginPath();
  ctx.arc(cx - halfSize/4, cy - halfSize/4, halfSize/2.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Secondary smaller highlights (bubbles in liquid chocolate)
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = halfSize * (0.3 + Math.random() * 0.4);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const bubbleSize = halfSize * (0.05 + Math.random() * 0.1);
    
    ctx.beginPath();
    ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add tiny air bubbles throughout
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = halfSize * Math.random() * 0.9;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const microBubbleSize = halfSize * 0.02 * (1 + Math.random());
    
    ctx.beginPath();
    ctx.arc(x, y, microBubbleSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnhancedChocolateSplat(ctx, cx, cy, size) {
  // Create more realistic liquid chocolate splat
  const numPoints = 16 + Math.floor(size / 2);
  const baseRadius = size * 0.75;
  
  ctx.beginPath();
  
  // Create more organic, liquid-like splat shape
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // More varied radius with multiple frequency components for realistic splat
    const variations = 0.65 + 
                      Math.sin(i * 4) * 0.15 + 
                      Math.cos(i * 7) * 0.15 + 
                      Math.sin(i * 11) * 0.1 +
                      Math.random() * 0.15;
                      
    const radius = baseRadius * variations;
    
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // Create more organic curves between points
      const cpRadius1 = baseRadius * (0.7 + Math.sin(i * 3) * 0.1 + Math.random() * 0.4);
      const cpAngle1 = angle - (1.2 / numPoints) * Math.PI;
      const cp1x = cx + Math.cos(cpAngle1) * cpRadius1 * 1.1;
      const cp1y = cy + Math.sin(cpAngle1) * cpRadius1 * 1.1;
      
      const cpRadius2 = baseRadius * (0.7 + Math.cos(i * 5) * 0.1 + Math.random() * 0.4);
      const cpAngle2 = angle - (0.5 / numPoints) * Math.PI;
      const cp2x = cx + Math.cos(cpAngle2) * cpRadius2 * 1.2;
      const cp2y = cy + Math.sin(cpAngle2) * cpRadius2 * 1.2;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Add enhanced drip details for realistic wet, glossy look
  ctx.save();
  const drips = 5 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < drips; i++) {
    const drip_angle = Math.random() * Math.PI * 2;
    const drip_dist = baseRadius * (0.8 + Math.random() * 0.3);
    const drip_x = cx + Math.cos(drip_angle) * drip_dist;
    const drip_y = cy + Math.sin(drip_angle) * drip_dist;
    
    const drip_length = size * (0.15 + Math.random() * 0.25);
    const drip_width = size * (0.05 + Math.random() * 0.07);
    
    // Determine direction - drips tend to flow down due to gravity
    const gravity_influence = 0.6;
    const effective_angle = drip_angle * (1-gravity_influence) + Math.PI/2 * gravity_influence;
    
    // Draw drip using bezier curve for more natural flow
    ctx.beginPath();
    ctx.moveTo(drip_x - drip_width/2, drip_y);
    
    // End point of drip
    const end_x = drip_x + Math.cos(effective_angle) * drip_length;
    const end_y = drip_y + Math.sin(effective_angle) * drip_length;
    
    // Control points for natural drip shape
    const ctrl1_x = drip_x - drip_width/2 + Math.cos(effective_angle + Math.PI/6) * drip_length * 0.4;
    const ctrl1_y = drip_y + Math.sin(effective_angle + Math.PI/6) * drip_length * 0.4;
    
    const ctrl2_x = end_x - Math.cos(effective_angle) * drip_width/2;
    const ctrl2_y = end_y - Math.sin(effective_angle) * drip_width/4;
    
    ctx.bezierCurveTo(ctrl1_x, ctrl1_y, ctrl2_x, ctrl2_y, end_x, end_y);
    
    // Complete the drip shape
    const ctrl3_x = end_x + Math.cos(effective_angle) * drip_width/2;
    const ctrl3_y = end_y + Math.sin(effective_angle) * drip_width/4;
    
    const ctrl4_x = drip_x + drip_width/2 + Math.cos(effective_angle - Math.PI/6) * drip_length * 0.4;
    const ctrl4_y = drip_y + Math.sin(effective_angle - Math.PI/6) * drip_length * 0.4;
    
    ctx.bezierCurveTo(ctrl3_x, ctrl3_y, ctrl4_x, ctrl4_y, drip_x + drip_width/2, drip_y);
    ctx.closePath();
    ctx.fill();
    
    // Add droplet at the end for some drips
    if (Math.random() < 0.6) {
      const droplet_size = drip_width * (0.8 + Math.random() * 0.6);
      ctx.beginPath();
      ctx.arc(end_x, end_y, droplet_size/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add highlight to droplet
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(
        end_x - droplet_size * 0.2,
        end_y - droplet_size * 0.2,
        droplet_size * 0.2,
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeart(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic chocolate look
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

function drawHeartStroke(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size/5);
  
  // Enhanced heart shape for more realistic chocolate look
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
function addChocolateSplat(x, y, size, delay) {
  console.log("addChocolateSplat called with:", { x, y, size, delay });

  // Validate x and y inputs
  if (isNaN(x) || isNaN(y)) {
      console.warn("Invalid x or y values:", x, y);
      // Provide default values (e.g., center of the canvas)
      x = canvas.width / 2;
      y = canvas.height / 2;
  }

  // Validate size and delay inputs
  size = size || 10; // Default size if not provided
  delay = delay || 0; // Default delay if not provided

  const colorIndex = Math.floor(Math.random() * 6) + 1;
  const color = CHOCOLATE_COLORS[colorIndex];

  chocolateSplats.push({
      x, // Now guaranteed to be a valid number
      y, // Now guaranteed to be a valid number
      size,
      targetSize: size,
      currentSize: 0,
      color,
      opacity: 0,
      targetOpacity: 0.8 + Math.random() * 0.2,
      created: performance.now(),
      delay,
      growthRate: 0.15 + Math.random() * 0.1,
  });
}

function drawChocolateSplats(ctx, deltaTime) {
  for (let i = 0; i < chocolateSplats.length; i++) {
    console.log('chocolateSplats :>> ', chocolateSplats);
    const splat = chocolateSplats[i];
    const elapsed = (performance.now() - splat.created) / 1000;
    
    // Skip if still in delay
    if (elapsed < splat.delay) continue;
    
    // Grow the splat with improved animation
    splat.currentSize = Math.min(
      splat.targetSize, 
      splat.currentSize + splat.growthRate * deltaTime * splat.targetSize
    );
    
    // Ease in opacity for smoother appearance
    splat.opacity = Math.min(
      splat.targetOpacity, 
      splat.opacity + 0.03 * deltaTime
    );
    
    // Draw splat with enhanced rendering
    ctx.save();
    ctx.globalAlpha = splat.opacity;
    
    // Create rich gradient for the splat
    const splatGradient = ctx.createRadialGradient(
      splat.x, splat.y, 0,
      splat.x, splat.y, splat.currentSize
    );
    
    const r = splat.color.r, g = splat.color.g, b = splat.color.b;
    splatGradient.addColorStop(0, `rgba(${Math.min(255, r+20)},${Math.min(255, g+15)},${Math.min(255, b+10)},1)`);
    splatGradient.addColorStop(0.4, `rgba(${r},${g},${b},1)`);
    splatGradient.addColorStop(0.8, `rgba(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)},0.9)`);
    splatGradient.addColorStop(1, `rgba(${Math.max(0, r-50)},${Math.max(0, g-50)},${Math.max(0, b-50)},0.7)`);
    
    ctx.fillStyle = splatGradient;
    
    // Draw improved splat shape
    drawEnhancedChocolateSplat(ctx, splat.x, splat.y, splat.currentSize);
    
    // Add dripping effect that follows physics
    if (splat.currentSize > 10 && elapsed > splat.delay + 0.2) {
      const dripCount = Math.min(3, Math.floor(splat.currentSize / 15));
      
      for (let j = 0; j < dripCount; j++) {
        // Drips mostly flow downward due to gravity
        const angle = splat.flowDirection + (Math.random() - 0.5) * Math.PI/4;
        const dripX = splat.x + Math.cos(angle - Math.PI/2) * splat.currentSize * (0.3 + Math.random() * 0.4);
        const dripY = splat.y + Math.sin(angle - Math.PI/2) * splat.currentSize * (0.3 + Math.random() * 0.4);
        
        const dripLength = splat.currentSize * (0.3 + Math.random() * 0.3) * 
                          Math.min(1, (elapsed - splat.delay) * splat.flowRate);
        const dripWidth = splat.currentSize * (0.1 + Math.random() * 0.1);
        
        // Draw drip
        ctx.beginPath();
        ctx.moveTo(dripX - dripWidth/2, dripY);
        
        // End point of drip
        const endX = dripX + Math.cos(angle) * dripLength;
        const endY = dripY + Math.sin(angle) * dripLength;
        
        // Control points for natural drip shape
        const ctrl1X = dripX + Math.cos(angle + Math.PI/8) * dripLength * 0.3;
        const ctrl1Y = dripY + Math.sin(angle + Math.PI/8) * dripLength * 0.3;
        
        const ctrl2X = endX - Math.cos(angle) * dripLength * 0.2;
        const ctrl2Y = endY - Math.sin(angle) * dripLength * 0.2;
        
        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
        
        // Complete the drip shape
        const ctrl3X = endX + Math.cos(angle - Math.PI/8) * dripLength * 0.2;
        const ctrl3Y = endY + Math.sin(angle - Math.PI/8) * dripLength * 0.2;
        
        const ctrl4X = dripX + Math.cos(angle - Math.PI/8) * dripLength * 0.3;
        const ctrl4Y = dripY + Math.sin(angle - Math.PI/8) * dripLength * 0.3;
        
        ctx.bezierCurveTo(ctrl3X, ctrl3Y, ctrl4X, ctrl4Y, dripX + dripWidth/2, dripY);
        ctx.closePath();
        ctx.fill();
        
        // Add droplet at the end for some drips
        if (splat.hasDroplet && j === 0) {
          const dropletSize = dripWidth * 1.2;
          ctx.beginPath();
          ctx.arc(endX, endY, dropletSize/2, 0, Math.PI * 2);
          ctx.fill();
          
          // Add highlight to droplet
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath();
          ctx.arc(
            endX - dropletSize * 0.2,
            endY - dropletSize * 0.2,
            dropletSize * 0.2,
            0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }
    
    // Add enhanced glossy highlights
    const shineGradient = ctx.createRadialGradient(
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      0,
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      splat.currentSize*0.6
    );
    shineGradient.addColorStop(0, "rgba(255,255,255,0.8)");
    shineGradient.addColorStop(0.3, "rgba(255,255,255,0.3)");
    shineGradient.addColorStop(0.7, "rgba(255,255,255,0)");
    
    ctx.fillStyle = shineGradient;
    ctx.beginPath();
    ctx.ellipse(
      splat.x - splat.currentSize*0.25, 
      splat.y - splat.currentSize*0.25, 
      splat.currentSize*0.3, 
      splat.currentSize*0.2, 
      Math.PI/4, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add secondary highlights (bubbles in liquid chocolate)
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let j = 0; j < 3; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = splat.currentSize * (0.3 + Math.random() * 0.3);
      const x = splat.x + Math.cos(angle) * dist;
      const y = splat.y + Math.sin(angle) * dist;
      const bubbleSize = splat.currentSize * (0.05 + Math.random() * 0.08);
      
      ctx.beginPath();
      ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add tiny air bubbles throughout
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    for (let j = 0; j < 6; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = splat.currentSize * Math.random() * 0.7;
      const x = splat.x + Math.cos(angle) * dist;
      const y = splat.y + Math.sin(angle) * dist;
      const microBubbleSize = splat.currentSize * 0.015 * (1 + Math.random());
      
      ctx.beginPath();
      ctx.arc(x, y, microBubbleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

function drawChocolateSplash(ctx, width, height, progress) {
  if (progress < 0.05) return;
  console.log('splashCenter :>> ', splashCenter);
  // Enhanced splash parameters
  const centerX = splashCenter.x || canvas.width / 2;
  const centerY = splashCenter.y || canvas.height / 2;
  const maxRadius = Math.min(width, height) * 0.35; // Larger splash
  
  // Calculate splash size based on progress with improved animation curve
  let splashProgress = Math.min(1, (progress - 0.05) * 3);
  // Use physics-based spring animation for more natural motion
  const springFactor = 0.2;
  const dampingFactor = 0.6;
  const oscillationFreq = 2.5;
  
  // Natural splash animation with slight overshoot and oscillation
  const animCurve = splashProgress < 0.8 ? 
    (1 + springFactor * Math.exp(-dampingFactor * splashProgress) * 
      Math.sin(oscillationFreq * splashProgress * Math.PI)) : 
    (1 - 0.2 * Math.pow(1 - splashProgress, 2));
  
  const currentRadius = maxRadius * Math.min(1, animCurve);
  
  if (currentRadius <= 0) return;
  
  // Draw splash
  ctx.save();
  console.log('centerX :>> ', centerX);
  console.log('centerY :>> ', centerY);
  console.log('currentRadius :>> ', currentRadius);
  
  // Create enhanced splash gradient with richer colors
  const gradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, currentRadius
  );
  
  // Richer chocolate gradient with more depth
  gradient.addColorStop(0, 'rgba(160, 95, 50, 0.95)');
  gradient.addColorStop(0.3, 'rgba(130, 75, 40, 0.9)');
  gradient.addColorStop(0.6, 'rgba(110, 65, 35, 0.85)');
  gradient.addColorStop(0.8, 'rgba(90, 50, 30, 0.7)');
  gradient.addColorStop(1, 'rgba(70, 40, 25, 0)');
  
  ctx.fillStyle = gradient;
  
  // Draw enhanced splash shape with more detail and animation
  const numPoints = 28; // More points for smoother edge
  const baseRadius = currentRadius;
  
  ctx.beginPath();
  
  // Create more detailed, organic splash shape with animation
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // More complex wave pattern with time-based animation
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
                      Math.cos(wavePhase3) * waveAmplitude3;
    
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
  
  // Draw enhanced splash highlights with more realistic look
  // Main highlight with improved gradient
  const shineGradient = ctx.createRadialGradient(
    centerX - currentRadius * 0.2, 
    centerY - currentRadius * 0.2, 
    0,
    centerX - currentRadius * 0.2, 
    centerY - currentRadius * 0.2, 
    currentRadius * 0.7
  );
  
  const highlightOpacity = 0.4 - progress * 0.15;
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
  
  // Draw multiple smaller highlights with improved distribution
  ctx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity * 0.8})`;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI * 2 / 6 + progress * 3;
    const distance = currentRadius * (0.4 + Math.random() * 0.3);
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const size = currentRadius * (0.04 + Math.random() * 0.08);
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add chocolate droplets/particles around splash with improved physics
  if (progress > 0.15 && progress < 0.9) {
    const dropletCount = Math.floor(18 * splashProgress);
    const dropletOpacity = 0.95 - progress * 0.4;
    
    for (let i = 0; i < dropletCount; i++) {
      // Calculate position with time-based animation
      const angle = (i / dropletCount) * Math.PI * 2 + progress * 5;
      
      // Physics-based distance calculation
      const maxDistance = currentRadius * 1.8;
      const timeOffset = (i % 3) * 0.1;
      const normalizedTime = Math.min(1, (progress - 0.15 - timeOffset) * 5);
      
      // Droplets fly outward with deceleration
      const distance = currentRadius * 1.1 + 
                      normalizedTime * maxDistance * (0.4 + Math.random() * 0.6);
                      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      // Size varies with distance
      const baseSize = 3 + Math.random() * 12;
      const distanceFactor = Math.min(1, distance / (maxDistance * 0.7));
      const size = baseSize * (1 - distanceFactor * 0.5);
      
      // Create circular droplet with rich gradient
      const dropGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      dropGradient.addColorStop(0, `rgba(140, 80, 40, ${dropletOpacity})`);
      dropGradient.addColorStop(0.7, `rgba(110, 60, 35, ${dropletOpacity})`);
      dropGradient.addColorStop(1, `rgba(85, 45, 25, ${dropletOpacity * 0.8})`);
      
      ctx.fillStyle = dropGradient;
      ctx.beginPath();
      
      // Droplet shape varies with velocity
      if (normalizedTime < 0.4) {
        // Fast moving droplets are more stretched
        const stretchFactor = 1 + (0.4 - normalizedTime) * 3;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Draw elongated droplet in direction of motion
        ctx.ellipse(
          x, y,
          size * stretchFactor,
          size / stretchFactor,
          Math.atan2(dirY, dirX),
          0, Math.PI * 2
        );
      } else {
        // Slower droplets are more circular
        ctx.arc(x, y, size, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Droplet highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity * 0.9})`;
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      // Add small satellite splashes for larger droplets
      if (Math.random() < 0.3 && size > 6 && normalizedTime > 0.5) {
        const splashCount = 2 + Math.floor(Math.random() * 3);
        ctx.fillStyle = `rgba(100, 55, 30, ${dropletOpacity * 0.7})`;
        
        for (let j = 0; j < splashCount; j++) {
          const splashAngle = Math.random() * Math.PI * 2;
          const splashDist = size * (1.2 + Math.random() * 0.8);
          const splashX = x + Math.cos(splashAngle) * splashDist;
          const splashY = y + Math.sin(splashAngle) * splashDist;
          const splashSize = size * (0.2 + Math.random() * 0.3);
          
          ctx.beginPath();
          ctx.arc(splashX, splashY, splashSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Add turbulence/flow patterns in the liquid chocolate
  if (progress > 0.1 && progress < 0.7) {
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.3)';
    ctx.lineWidth = 1 + currentRadius * 0.01;
    
    for (let i = 0; i < 12; i++) {
      const startAngle = i * Math.PI / 6 + progress * Math.PI;
      const startDist = currentRadius * 0.2;
      const endDist = currentRadius * (0.5 + Math.random() * 0.3);
      
      const startX = centerX + Math.cos(startAngle) * startDist;
      const startY = centerY + Math.sin(startAngle) * startDist;
      
      const endX = centerX + Math.cos(startAngle) * endDist;
      const endY = centerY + Math.sin(startAngle) * endDist;
      
      // Turbulent swirl pattern
      const ctrl1Dist = startDist + (endDist - startDist) * 0.3;
      const ctrl1Angle = startAngle + Math.PI * 0.2;
      const ctrl1X = centerX + Math.cos(ctrl1Angle) * ctrl1Dist;
      const ctrl1Y = centerY + Math.sin(ctrl1Angle) * ctrl1Dist;
      
      const ctrl2Dist = startDist + (endDist - startDist) * 0.7;
      const ctrl2Angle = startAngle - Math.PI * 0.2;
      const ctrl2X = centerX + Math.cos(ctrl2Angle) * ctrl2Dist;
      const ctrl2Y = centerY + Math.sin(ctrl2Angle) * ctrl2Dist;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

function drawChocolateDrips(ctx, width, height, progress) {
  // Enhanced drip parameters
  const dripCount = 10; // More drips
  const maxDripLength = height * 0.3;
  const baseDripWidth = 14;
  
  for (let i = 0; i < dripCount; i++) {
    // More natural drip positioning
    const x = width * (0.1 + (i / (dripCount - 1)) * 0.8);
    
    // Stagger drip start times more naturally with randomness
    const dripStartDelay = i * 0.06 + Math.random() * 0.08;
    const dripProgress = Math.max(0, Math.min(1, (progress - 0.2 - dripStartDelay) * 2));
    if (dripProgress <= 0) continue;
    
    // Calculate drip length with physics-based animation
    // Accelerating flow with viscosity influence
    const viscosity = 0.7 + Math.random() * 0.3; // Higher = slower flow
    const gravity = 1 - viscosity * 0.5; // Gravity factor modified by viscosity
    const flowCurve = Math.pow(dripProgress, 1/viscosity) * gravity;
    const length = flowCurve * maxDripLength * (0.7 + Math.random() * 0.6);
    
    // Draw drip
    ctx.save();
    
    // Create rich gradient for drip with improved color and opacity
    const gradient = ctx.createLinearGradient(x, 0, x, length);
    gradient.addColorStop(0, 'rgba(130, 75, 40, 0.95)');
    gradient.addColorStop(0.4, 'rgba(110, 65, 35, 0.9)');
    gradient.addColorStop(0.7, 'rgba(90, 55, 30, 0.85)');
    gradient.addColorStop(1, 'rgba(75, 45, 25, 0.7)');
    
    ctx.fillStyle = gradient;
    
    // Calculate drip width variation with improved animation
    // Add pulsing/throbbing effect for more realistic liquid flow
    const pulsePeriod = 12 + i * 0.5;
    const pulsePhase = progress * pulsePeriod + i * Math.PI/3;
    const pulseEffect = Math.sin(pulsePhase) * 0.15;
    
    // Width narrows along length for realistic drip shape
    const topWidth = baseDripWidth * (1 + pulseEffect + Math.random() * 0.2);
    const bottomWidth = Math.max(2, 
                               baseDripWidth * 0.4 * (1 - Math.pow(dripProgress, 0.5)));
    
    // Draw drip shape with improved positioning
    const startY = height * (0.2 + Math.random() * 0.15);
    
    ctx.beginPath();
    ctx.moveTo(x - topWidth/2, startY);
    ctx.lineTo(x + topWidth/2, startY);
    
    // Curve down to make it look like it's dripping with improved physics
    // Control points follow natural chocolate flow
    const ctrlPointY1 = startY + length * 0.3;
    const ctrlPointY2 = startY + length * 0.7;
    
    // Add slight sideways movement to drip with time-based animation
    const wobblePeriod = 6 + i;
    const wobblePhase = progress * wobblePeriod;
    const sideOffset = Math.sin(wobblePhase) * (topWidth * 0.3);
    
    ctx.bezierCurveTo(
      x + topWidth/2 + sideOffset, ctrlPointY1,
      x + bottomWidth + sideOffset * 0.5, ctrlPointY2,
      x, startY + length
    );
    
    // Curve back up on the other side with asymmetry for realism
    const asymmetry = (Math.random() - 0.5) * 0.1;
    ctx.bezierCurveTo(
      x - bottomWidth - sideOffset * 0.5, ctrlPointY2 + asymmetry * length,
      x - topWidth/2 - sideOffset, ctrlPointY1 - asymmetry * length,
      x - topWidth/2, startY
    );
    
    ctx.closePath();
    ctx.fill();
    
    // Add depth and dimension with shadow
    const shadowGradient = ctx.createLinearGradient(
      x - topWidth/2, startY,
      x + topWidth/2, startY
    );
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0.2)');
    shadowGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.roundRect(
      x - topWidth/2, 
      startY, 
      topWidth, 
      length * 0.1, 
      [0, 0, topWidth/4, topWidth/4]
    );
    ctx.fill();
    
    // Add glossy highlight with improved placement and gradient
    const shineGradient = ctx.createLinearGradient(
      x - topWidth/2, startY,
      x + topWidth/2, startY + length/3
    );
    shineGradient.addColorStop(0, 'rgba(255,255,255,0.5)');
    shineGradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
    shineGradient.addColorStop(0.6, 'rgba(255,255,255,0.05)');
    shineGradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = shineGradient;
    
    // Draw highlight shape with elliptical shape for better realism
    ctx.beginPath();
    ctx.ellipse(
      x - topWidth * 0.1,
      startY + topWidth * 0.3,
      topWidth * 0.35,
      topWidth * 0.25,
      Math.PI/6, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add small chocolate bulge at top of drip with improved shaping
    const bulgeGradient = ctx.createRadialGradient(
      x, startY - 2, 0,
      x, startY - 2, topWidth * 0.8
    );
    bulgeGradient.addColorStop(0, 'rgba(140, 80, 45, 0.95)');
    bulgeGradient.addColorStop(0.7, 'rgba(120, 70, 40, 0.9)');
    bulgeGradient.addColorStop(1, 'rgba(100, 60, 35, 0)');
    
    ctx.fillStyle = bulgeGradient;
    ctx.beginPath();
    ctx.arc(x, startY - 2, topWidth * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // Add surface texture to the drip for more realism
    if (dripProgress > 0.2 && topWidth > 8) {
      ctx.fillStyle = 'rgba(60, 35, 20, 0.2)';
      
      // Add subtle texture lines/striations
      for (let j = 0; j < 3; j++) {
        const lineY = startY + length * (j + 1) / 4;
        const lineWidth = topWidth * (1 - j/4);
        
        ctx.beginPath();
        ctx.ellipse(
          x, lineY,
          lineWidth * 0.3,
          lineWidth * 0.05,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    // Add small droplets along the drip for more realism
    if (dripProgress > 0.3 && length > 30) {
      const dropletCount = 1 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < dropletCount; j++) {
        const dropY = startY + length * (0.5 + Math.random() * 0.5);
        const dropX = x + (Math.random() - 0.5) * topWidth * 1.5;
        const dropSize = 2 + Math.random() * 4;
        
        // Create droplet with gradient for depth
        const dropGradient = ctx.createRadialGradient(
          dropX, dropY, 0,
          dropX, dropY, dropSize
        );
        dropGradient.addColorStop(0, 'rgba(110, 65, 35, 0.9)');
        dropGradient.addColorStop(1, 'rgba(80, 45, 25, 0.8)');
        
        ctx.fillStyle = dropGradient;
        ctx.beginPath();
        ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add drop highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(dropX - dropSize*0.3, dropY - dropSize*0.3, dropSize*0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Add droplet at bottom of drip with physics-based animation
    if (dripProgress > 0.7 && length > 40 && i % 3 === 0) {
      // Droplet gradually forms and eventually falls
      const dropletFormation = Math.max(0, (dripProgress - 0.7) * 3.3);
      const dropletY = startY + length;
      
      if (dropletFormation < 1) {
        // Growing droplet at tip
        const dropletSize = bottomWidth/2 + dropletFormation * bottomWidth;
        const dropGradient = ctx.createRadialGradient(
          x, dropletY, 0,
          x, dropletY, dropletSize
        );
        dropGradient.addColorStop(0, 'rgba(120, 70, 40, 0.95)');
        dropGradient.addColorStop(1, 'rgba(90, 55, 30, 0.9)');
        
        ctx.fillStyle = dropGradient;
        ctx.beginPath();
        ctx.arc(x, dropletY, dropletSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight to droplet
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(
          x - dropletSize * 0.3,
          dropletY - dropletSize * 0.3,
          dropletSize * 0.4,
          0, Math.PI * 2
        );
        ctx.fill();
      } else {
        // Droplet is falling
        const fallDistance = (dropletFormation - 1) * length * 0.5;
        const fallY = dropletY + fallDistance;
        const fallX = x + sideOffset * fallDistance/20;
        const fallingSize = bottomWidth * (1.2 - fallDistance/(length*0.5) * 0.2);
        
        // Elongate droplet as it falls due to air resistance
        const stretchFactor = 1 + fallDistance / (length * 0.3);
        
        const dropGradient = ctx.createRadialGradient(
          fallX, fallY, 0,
          fallX, fallY, fallingSize
        );
        dropGradient.addColorStop(0, 'rgba(120, 70, 40, 0.95)');
        dropGradient.addColorStop(1, 'rgba(90, 55, 30, 0.9)');
        
        ctx.fillStyle = dropGradient;
        ctx.beginPath();
        ctx.ellipse(
          fallX, fallY,
          fallingSize * 0.8,
          fallingSize * stretchFactor,
          Math.PI/2, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Add highlight to falling droplet
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(
          fallX - fallingSize * 0.2,
          fallY - fallingSize * 0.4,
          fallingSize * 0.3,
          fallingSize * 0.2,
          Math.PI/4, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}

function updateAndDrawChocolates(ctx, deltaTime, progress) {
  // Sort chocolates by size and opacity for better visual layering
  if (frameCount % 10 === 0) { // Only sort occasionally for performance
    chocolates.sort((a, b) => {
      // Sort primarily by opacity (invisible first)
      if (a.opacity < 0.05 && b.opacity >= 0.05) return -1;
      if (a.opacity >= 0.05 && b.opacity < 0.05) return 1;
      // Then by size (small to large)
      return a.size - b.size;
    });
  }
  
  const deadChocolates = [];
  
  // Batch rendering by type and shape for performance
  let renderBatches = {};
  
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
    
    // Apply physics with improved stability
    choc.vy += choc.gravity * deltaTime;
    
    // Apply drag with air resistance
    choc.vx *= Math.pow(AIR_RESISTANCE, deltaTime);
    choc.vy *= Math.pow(AIR_RESISTANCE, deltaTime);
    
    // Additional drag proportional to size
    const sizeDrag = 1 - (choc.size / 100) * 0.1 * deltaTime;
    choc.vx *= sizeDrag;
    choc.vy *= sizeDrag;
    
    // Simulate melting effect with improved physics
    if (adjustedProgress > 0.6) {
      // Melting accelerates over time
      const meltAcceleration = Math.pow(adjustedProgress - 0.6, 1.5) * 5 + 1;
      choc.size -= choc.meltFactor * meltAcceleration * deltaTime;
      
      if (choc.size < 1) {
        choc.opacity = 0;
        deadChocolates.push(i);
        continue;
      }
    }
    
    // Update position
    choc.x += choc.vx * deltaTime;
    choc.y += choc.vy * deltaTime;
    
    // Simple screen boundary check with bounce and improved physics
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const radius = choc.size / 2;
    
    // Bounce off edges if not too many bounces yet
    if (choc.bounceCount < choc.maxBounces) {
      let didBounce = false;
      
      if (choc.x - radius < 0) {
        choc.x = radius;
        choc.vx = Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        didBounce = true;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.7) {
          addChocolateSplat(
            5 + Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      } else if (choc.x + radius > canvasWidth) {
        choc.x = canvasWidth - radius;
        choc.vx = -Math.abs(choc.vx) * choc.elasticity;
        choc.bounceCount++;
        didBounce = true;
        
        // Create a small chocolate splat on bounce
        if (Math.random() < 0.7) {
          addChocolateSplat(
            canvasWidth - 5 - Math.random() * 10,
            choc.y,
            choc.size * (0.5 + Math.random() * 0.5),
            0
          );
        }
      }
      
      if (choc.y - radius < 0) {
        choc.y = radius;
        choc.vy = Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
        didBounce = true;
      } else if (choc.y + radius > canvasHeight) {
        choc.y = canvasHeight - radius;
        choc.vy = -Math.abs(choc.vy) * choc.elasticity;
        choc.bounceCount++;
        didBounce = true;
        
        // Create a chocolate splat on bounce with floor
        if (Math.random() < 0.8) {
          addChocolateSplat(
            choc.x,
            canvasHeight - 2,
            choc.size * (0.8 + Math.random() * 0.7),
            0
          );
        }
      }
      
      // Add angular velocity on bounce for more realistic physics
      if (didBounce) {
        choc.rotationSpeed += (Math.random() - 0.5) * 0.2;
        // Limit max rotation speed
        choc.rotationSpeed = Math.max(-0.4, Math.min(0.4, choc.rotationSpeed));
      }
    }
    
    // Update rotation with slight damping
    choc.rotation += choc.rotationSpeed * deltaTime;
    choc.rotationSpeed *= (1 - 0.01 * deltaTime); // Gradual slowdown
    
    // Fade out based on lifespan with smoother curve
    if (adjustedProgress > 0.7) {
      const fadeProgress = (adjustedProgress - 0.7) / 0.3; // 0 to 1
      const fadeRate = Math.pow(fadeProgress, 1.5) * 0.05 * deltaTime;
      choc.opacity = Math.max(0, choc.opacity - fadeRate);
    }
    
    // Get color key
    const colorKey = `rgb(${choc.color.r},${choc.color.g},${choc.color.b})`;
    
    // Find closest size
  // Find closest size
  let sizeKey = '1';
  if (choc.size > 2) sizeKey = '2';
  if (choc.size > 4) sizeKey = '4';
  if (choc.size > 8) sizeKey = '8';
  if (choc.size > 16) sizeKey = '16';
  if (choc.size > 32) sizeKey = '32';
  
  // Add to appropriate render batch for better performance
  const batchKey = `${choc.type}_${choc.shape}_${colorKey}_${sizeKey}`;
  if (!renderBatches[batchKey]) {
    renderBatches[batchKey] = {
      type: choc.type,
      shape: choc.shape,
      color: choc.color,
      colorKey: colorKey,
      sizeKey: sizeKey,
      chocolates: []
    };
  }
  renderBatches[batchKey].chocolates.push(choc);
}

// Remove dead chocolates in reverse order to avoid index issues
for (let i = deadChocolates.length - 1; i >= 0; i--) {
  chocolates.splice(deadChocolates[i], 1);
}

// Optimize rendering by batching similar chocolates
Object.values(renderBatches).forEach(batch => {
  // Get chocolate prototype
  const prototype = chocolatePrototypes[batch.type][batch.shape][batch.colorKey]?.[batch.sizeKey];
  
  if (prototype) {
    // Draw all chocolates of this type in one batch for better performance
    batch.chocolates.forEach(choc => {
      ctx.save();
      ctx.globalAlpha = choc.opacity;
      
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      
      const scale = choc.size / parseInt(batch.sizeKey);
      ctx.scale(scale, scale);
      
      ctx.drawImage(
        prototype, 
        -32, 
        -32, 
        64, 
        64
      );
      
      ctx.restore();
    });
  } else {
    // Fallback drawing method for missing prototypes
    batch.chocolates.forEach(choc => {
      ctx.save();
      ctx.globalAlpha = choc.opacity;
      ctx.fillStyle = batch.colorKey;
      ctx.translate(choc.x, choc.y);
      ctx.rotate(choc.rotation);
      
      if (batch.shape === CHOCOLATE_SHAPES.SQUARE) {
        ctx.fillRect(-choc.size/2, -choc.size/2, choc.size, choc.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, choc.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }
});
}

function createChocolates(width, height, selectedRegions) {
const centerX = width / 2;
const centerY = height / 2;

// Use selected regions for more targeted chocolate generation
let spawnAreas = [];
if (selectedRegions && selectedRegions.length > 0) {
  // Create spawn areas from selected regions
  selectedRegions.forEach(region => {
    spawnAreas.push({
      x: region.x + region.width / 2,
      y: region.y + region.height / 2,
      radius: Math.min(region.width, region.height) * 0.4,
      weight: region.width * region.height
    });
  });
} else {
  // Default to center of canvas
  spawnAreas.push({
    x: centerX,
    y: centerY,
    radius: Math.min(width, height) * 0.15,
    weight: 1
  });
}

// Normalize spawn weights
const totalWeight = spawnAreas.reduce((sum, area) => sum + area.weight, 0);
spawnAreas.forEach(area => area.normalizedWeight = area.weight / totalWeight);

// Create chocolate pieces
for (let i = 0; i < chocolateCount; i++) {
  // Determine chocolate type with improved distribution
  let type, size, lifespan, shape;
  
  if (i < chocolateCount * 0.4) {
    // 40% dark chocolate
    type = CHOCOLATE_TYPES.DARK;
    size = 5 + Math.random() * 12;
    lifespan = 0.7 + Math.random() * 0.3;
    
    // Different shapes for variety
    const shapeRand = Math.random();
    if (shapeRand < 0.5) {
      shape = CHOCOLATE_SHAPES.SQUARE;
    } else if (shapeRand < 0.8) {
      shape = CHOCOLATE_SHAPES.CHUNK;
    } else {
      shape = CHOCOLATE_SHAPES.RECTANGLE;
    }
  } else if (i < chocolateCount * 0.8) {
    // 40% milk chocolate
    type = CHOCOLATE_TYPES.MILK;
    size = 4 + Math.random() * 10;
    lifespan = 0.65 + Math.random() * 0.35;
    
    // Different shapes
    const shapeRand = Math.random();
    if (shapeRand < 0.4) {
      shape = CHOCOLATE_SHAPES.ROUND;
    } else if (shapeRand < 0.7) {
      shape = CHOCOLATE_SHAPES.SQUARE;
    } else if (shapeRand < 0.9) {
      shape = CHOCOLATE_SHAPES.HEART;
    } else {
      shape = CHOCOLATE_SHAPES.RECTANGLE;
    }
  } else {
    // 20% white, truffle or special
    const typeRand = Math.random();
    if (typeRand < 0.6) {
      type = CHOCOLATE_TYPES.WHITE;
    } else if (typeRand < 0.9) {
      type = CHOCOLATE_TYPES.TRUFFLE;
    } else {
      type = CHOCOLATE_TYPES.COCOA;
    }
    
    size = 3 + Math.random() * 8;
    lifespan = 0.6 + Math.random() * 0.4;
    
    // Shape distribution
    const shapeRand = Math.random();
    if (shapeRand < 0.4) {
      shape = CHOCOLATE_SHAPES.HEART;
    } else if (shapeRand < 0.7) {
      shape = CHOCOLATE_SHAPES.ROUND;
    } else if (shapeRand < 0.9) {
      shape = CHOCOLATE_SHAPES.TRUFFLE;
    } else {
      shape = CHOCOLATE_SHAPES.SPLAT;
    }
  }
  
  // Select appropriate color based on type with additional variety
  let colorIndex;
  if (type === CHOCOLATE_TYPES.DARK) {
    // Dark colors
    colorIndex = Math.floor(Math.random() * 3); 
    
    // Occasional luxury dark chocolate
    if (Math.random() < 0.15) {
      const color = LUXURY_CHOCOLATE_COLORS[0];
      chocolates.push(createChocolate(color, type, shape, size, lifespan, spawnAreas));
      continue;
    }
  } else if (type === CHOCOLATE_TYPES.MILK) {
    // Middle colors
    colorIndex = 3 + Math.floor(Math.random() * 4); 
    
    // Occasional luxury milk chocolate
    if (Math.random() < 0.15) {
      const color = LUXURY_CHOCOLATE_COLORS[Math.floor(Math.random() * 2) + 1];
      chocolates.push(createChocolate(color, type, shape, size, lifespan, spawnAreas));
      continue;
    }
  } else if (type === CHOCOLATE_TYPES.WHITE) {
    // Light colors
    colorIndex = 8 + Math.floor(Math.random()); 
    
    // Occasional luxury white chocolate
    if (Math.random() < 0.2) {
      const color = LUXURY_CHOCOLATE_COLORS[4];
      chocolates.push(createChocolate(color, type, shape, size, lifespan, spawnAreas));
      continue;
    }
  } else {
    // Mixed colors for truffle
    colorIndex = 2 + Math.floor(Math.random() * 6); 
    
    // Occasional specialty truffle
    if (Math.random() < 0.25) {
      const color = LUXURY_CHOCOLATE_COLORS[Math.floor(Math.random() * 3) + 1];
      chocolates.push(createChocolate(color, type, shape, size, lifespan, spawnAreas));
      continue;
    }
  }
  
  const color = CHOCOLATE_COLORS[colorIndex];
  chocolates.push(createChocolate(color, type, shape, size, lifespan, spawnAreas));
}

// Create chocolate splats
for (let i = 0; i < 12; i++) {
  // Choose spawn area
  const spawnRand = Math.random();
  let cumulativeWeight = 0;
  let selectedArea = spawnAreas[0];
  
  for (const area of spawnAreas) {
    cumulativeWeight += area.normalizedWeight;
    if (spawnRand <= cumulativeWeight) {
      selectedArea = area;
      break;
    }
  }
  
  // Randomize position within area
  const angle = Math.random() * Math.PI * 2;
  const distance = selectedArea.radius * Math.random();
  const x = selectedArea.x + Math.cos(angle) * distance;
  const y = selectedArea.y + Math.sin(angle) * distance;
  
  // Create splat with staggered delays
  addChocolateSplat(
    x,
    y,
    10 + Math.random() * 40,
    0.2 + Math.random() * 0.3
  );
}
}

// Helper function to create a chocolate particle
function createChocolate(color, type, shape, size, lifespan, spawnAreas) {
// Choose spawn area
const spawnRand = Math.random();
let cumulativeWeight = 0;
let selectedArea = spawnAreas[0];

for (const area of spawnAreas) {
  cumulativeWeight += area.normalizedWeight;
  if (spawnRand <= cumulativeWeight) {
    selectedArea = area;
    break;
  }
}

// Random angle and speed
const angle = Math.random() * Math.PI * 2;
const speed = 5 + Math.random() * 20;

// Initial position (randomized within selected area)
const positionAngle = Math.random() * Math.PI * 2;
const positionDistance = Math.random() * selectedArea.radius * 0.8;
const x = selectedArea.x + Math.cos(positionAngle) * positionDistance;
const y = selectedArea.y + Math.sin(positionAngle) * positionDistance;

// Physics variations
const gravity = 0.15 + Math.random() * 0.15;
const drag = 0.01 + Math.random() * 0.03;

return {
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
  rotationSpeed: (Math.random() - 0.5) * 0.3,
  meltFactor: Math.random() * 0.3,
  delay: Math.random() * 0.2,
  bounceCount: 0,
  maxBounces: Math.floor(Math.random() * 3),
  elasticity: 0.3 + Math.random() * 0.4,
  // Add new properties for enhanced physics
  mass: size * size * 0.01,
  angularDamping: 0.95 + Math.random() * 0.03,
  deformationFactor: Math.random() * 0.2,
  turbulence: {
    phase: Math.random() * Math.PI * 2,
    amplitude: Math.random() * 0.5,
    frequency: 0.5 + Math.random()
  }
};
}

// Add post-processing effects for high quality mode
function applyPostProcessing(ctx, width, height, progress) {
// Skip if not in high quality mode
if (renderQuality !== 'high') return;

// Add subtle ambient occlusion shadows
if (progress > 0.2 && progress < 0.9) {
  // Create shadow effect for depth
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  
  // Gradient shadow
  const gradient = ctx.createRadialGradient(
    width/2, height/2, Math.min(width, height) * 0.1,
    width/2, height/2, Math.min(width, height) * 0.6
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.05)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Add subtle bloom/glow effect to highlights
if (progress > 0.1) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  // Get current canvas content
  const imageData = ctx.getImageData(0, 0, width, height);
  
  // Create glow by adding light to already light pixels
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    
    // Only affect bright pixels (highlights)
    if (r > 200 && g > 180 && b > 150 && a > 100) {
      const brightness = (r + g + b) / 3;
      const factor = (brightness - 180) / 75; // 0 to 1 scale
      
      // Create a soft glow
      ctx.fillStyle = `rgba(255, 240, 220, ${0.1 * factor})`;
      
      // Get pixel position
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      
      // Draw glow
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

// Add vignette effect for better focus
ctx.save();
const vignetteGradient = ctx.createRadialGradient(
  width/2, height/2, Math.min(width, height) * 0.3,
  width/2, height/2, Math.min(width, height) * 0.7
);
vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.2)');

ctx.globalCompositeOperation = 'multiply';
ctx.fillStyle = vignetteGradient;
ctx.fillRect(0, 0, width, height);
ctx.restore();
}

// Helper function to calculate bezier curve point
function calculateBezierPoint(t, p0, p1, p2, p3) {
const u = 1 - t;
const tt = t * t;
const uu = u * u;
const uuu = uu * u;
const ttt = tt * t;

let point = {
  x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
  y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
};

return point;
}

// Enhanced math utilities
const MathUtils = {
// Linear interpolation
lerp: (a, b, t) => a + (b - a) * t,

// Clamp value between min and max
clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

// Smooth step function
smoothStep: (edge0, edge1, x) => {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
},

// Easing function - cubic in-out
easeInOut: (t) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
},

// Perlin noise approximation (simplified)
noise: (x, y = 0) => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  
  // Simplified hash function
  const hash = (X + Y * 137) % 289;
  
  return (Math.sin(hash) + 1) * 0.5;
}
};