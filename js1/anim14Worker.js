// Global constants
const ANIMATION_DURATION = 6000; // ms
const FLOW_FACTOR = 0.15;
const SURFACE_TENSION = 0.92;
const VISCOSITY_FACTOR = 1.2;
const DEBUG_MODE = false;

// Chocolate properties
const CHOCOLATE_TYPES = {
  DARK: 'dark',
  MILK: 'milk',
  WHITE: 'white',
  SEMI_SWEET: 'semi_sweet',
  RUBY: 'ruby'
};

// Enhanced chocolate color palette with metallic properties
const CHOCOLATE_COLORS = [
  { r: 35, g: 18, b: 8, a: 1, metallic: 0.4 },      // Extra dark chocolate
  { r: 65, g: 35, b: 18, a: 1, metallic: 0.5 },     // Rich dark chocolate
  { r: 115, g: 65, b: 35, a: 1, metallic: 0.6 },    // Premium milk chocolate
  { r: 140, g: 80, b: 40, a: 1, metallic: 0.55 },   // Creamy milk chocolate
  { r: 225, g: 200, b: 170, a: 1, metallic: 0.7 },  // White chocolate
  { r: 235, g: 210, b: 180, a: 1, metallic: 0.8 },  // Premium white chocolate
  { r: 190, g: 90, b: 95, a: 1, metallic: 0.65 },   // Ruby chocolate
  { r: 75, g: 42, b: 20, a: 1, metallic: 0.45 }     // Bittersweet chocolate
];

// Animation state
let canvas = null;
let ctx = null;
let chocolateFlows = [];
let chocolateDrips = [];
let chocolateRipples = [];
let chocolateMetallicHighlights = [];
let startTime = 0;
let previousTime = 0;
let frameCount = 0;
let performanceLevel = 1.0;
let splashCenter = { x: 0, y: 0 };
let renderQuality = 'high';
let textureCache = {};

// Main flow control points - these define the liquid chocolate behavior
let flowControlPoints = [];
let liquidSurface = [];
let chocolateDepth = [];

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 60;
    this.totalTime = 0;
    this.lastTime = 0;
    this.fps = 0;
    this.averageRenderTime = 0;
  }
  
  start() {
    this.lastTime = performance.now();
  }
  
  end() {
    const now = performance.now();
    const renderTime = now - this.lastTime;
    
    // Add sample and maintain fixed size
    this.samples.push(renderTime);
    if (this.samples.length > this.maxSamples) {
      this.totalTime -= this.samples.shift();
    }
    
    this.totalTime += renderTime;
    this.averageRenderTime = this.totalTime / this.samples.length;
    
    // Update FPS
    const elapsed = now - this.lastTime;
    if (elapsed >= 1000) {
      this.fps = this.frames / (elapsed / 1000);
      this.frames = 0;
      this.lastTime = now;
    }
    
    return renderTime;
  }
}

const perfMonitor = new PerformanceMonitor();

// Easing functions for smooth animation
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Worker event handler
self.onmessage = function(e) {
  try {
    const startProcessingTime = performance.now();
    perfMonitor.start();
    
    const { 
      imageData, 
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
      if (config.hasOwnProperty('debug')) {
        DEBUG_MODE = config.debug;
      }
    }
    
    // Set render quality
    if (quality && ['low', 'medium', 'high', 'ultra'].includes(quality)) {
      renderQuality = quality;
    }
    
    // Initialize canvas if not already done
    if (!canvas) {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d', { 
        alpha: true,
        desynchronized: true
      });
      
      if (!ctx) {
        throw new Error("Failed to create canvas context");
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Set splash center
      splashCenter = { 
        x: width * 0.5, 
        y: height * 0.4
      };
      
      // Initialize performance level based on device info
      if (deviceInfo) {
        if (deviceInfo.isLowPower || deviceInfo.isMobile) {
          performanceLevel = deviceInfo.isLowPower ? 0.4 : 0.6;
          renderQuality = 'low';
        } else if (deviceInfo.isHighPerformance) {
          performanceLevel = deviceInfo.gpuTier > 2 ? 1.5 : 1.2;
          renderQuality = deviceInfo.gpuTier > 2 ? 'ultra' : 'high';
        } else {
          performanceLevel = 0.8;
          renderQuality = 'medium';
        }
      }
      
      // Generate textures for better performance
      generateChocolateTextures();
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
      chocolateFlows = [];
      chocolateDrips = [];
      chocolateRipples = [];
      chocolateMetallicHighlights = [];
      
      // Initialize liquid chocolate simulation
      initializeLiquidChocolate(width, height);
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
      
      // Initialize liquid chocolate simulation
      initializeLiquidChocolate(width, height);
    }
    
    // Calculate time delta for physics
    const rawDeltaTime = currentTime - previousTime;
    const deltaTime = Math.min(50, Math.max(1, rawDeltaTime)) / 16.67;
    previousTime = currentTime;
    
    // Calculate animation progress with easing
    const elapsed = currentTime - startTime;
    const rawProgress = Math.min(1.0, elapsed / ANIMATION_DURATION);
    const progress = easeInOutCubic(rawProgress);
    
    // Clear canvas
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
    
    // Draw liquid chocolate with metallic finish
    drawLiquidChocolate(ctx, width, height, progress, deltaTime);
    
    // Draw drips with dynamic behavior
    updateAndDrawChocolateDrips(ctx, deltaTime, progress);
    
    // Draw ripples on the chocolate surface
    drawChocolateRipples(ctx, deltaTime, progress);
    
    // Draw metallic highlights with light physics
    drawMetallicHighlights(ctx, deltaTime, progress);
    
    // Add steam/heat effect for hot chocolate
    if (progress > 0.05 && progress < 0.7 && (renderQuality === 'high' || renderQuality === 'ultra')) {
      drawHeatEffect(ctx, width, height, progress);
    }
    
    // Debug overlay
    if (DEBUG_MODE) {
      drawDebugInfo(ctx, width, height, {
        fps: perfMonitor.fps,
        renderTime: perfMonitor.averageRenderTime,
        flowPoints: flowControlPoints.length,
        drips: chocolateDrips.length
      });
    }
    
    // Copy canvas content back to imageData
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
    
    // Build result
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      progress,
      performance: {
        flowPoints: flowControlPoints.length,
        dripCount: chocolateDrips.length,
        performanceLevel,
        renderQuality,
        renderTime: processingTime.toFixed(2)
      }
    }, [resultImageData.data.buffer]);
  } catch (error) {
    console.error("Animation worker error:", error);
    
    self.postMessage({
      error: `Animation worker error: ${error.message}`,
      stack: error.stack,
      isComplete: true
    });
  }
};

// Generate texture patterns for chocolate
function generateChocolateTextures() {
  const patternSize = 256;
  
  // Create smooth glossy texture
  const glossyCanvas = new OffscreenCanvas(patternSize, patternSize);
  const glossyCtx = glossyCanvas.getContext('2d');
  
  const glossyGradient = glossyCtx.createRadialGradient(
    patternSize/2, patternSize/2, 0,
    patternSize/2, patternSize/2, patternSize/2
  );
  
  glossyGradient.addColorStop(0, 'rgba(255,255,255,0.7)');
  glossyGradient.addColorStop(0.4, 'rgba(255,255,255,0.3)');
  glossyGradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  glossyGradient.addColorStop(1, 'rgba(255,255,255,0)');
  
  glossyCtx.fillStyle = glossyGradient;
  glossyCtx.fillRect(0, 0, patternSize, patternSize);
  
  textureCache['glossy'] = glossyCanvas.transferToImageBitmap();
  
  // Create flow texture
  const flowCanvas = new OffscreenCanvas(patternSize, patternSize);
  const flowCtx = flowCanvas.getContext('2d');
  
  // Create flow line patterns
  flowCtx.strokeStyle = 'rgba(255,255,255,0.1)';
  flowCtx.lineWidth = 2;
  
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * patternSize;
    flowCtx.beginPath();
    flowCtx.moveTo(0, y);
    
    // Create curved flow line
    let x = 0;
    while (x < patternSize) {
      const segLength = 20 + Math.random() * 40;
      const controlX = x + segLength/2;
      const controlY = y + (Math.random() - 0.5) * 30;
      const endX = Math.min(patternSize, x + segLength);
      const endY = y + (Math.random() - 0.5) * 20;
      
      flowCtx.quadraticCurveTo(controlX, controlY, endX, endY);
      x = endX;
    }
    
    flowCtx.stroke();
  }
  
  textureCache['flow'] = flowCanvas.transferToImageBitmap();
  
  // Create ripple texture
  const rippleCanvas = new OffscreenCanvas(patternSize, patternSize);
  const rippleCtx = rippleCanvas.getContext('2d');
  
  const rippleGradient = rippleCtx.createRadialGradient(
    patternSize/2, patternSize/2, 0,
    patternSize/2, patternSize/2, patternSize/2
  );
  
  rippleGradient.addColorStop(0, 'rgba(255,255,255,0.5)');
  rippleGradient.addColorStop(0.3, 'rgba(255,255,255,0.2)');
  rippleGradient.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  rippleGradient.addColorStop(1, 'rgba(0,0,0,0)');
  
  rippleCtx.fillStyle = rippleGradient;
  rippleCtx.beginPath();
  rippleCtx.arc(patternSize/2, patternSize/2, patternSize/2, 0, Math.PI * 2);
  rippleCtx.fill();
  
  textureCache['ripple'] = rippleCanvas.transferToImageBitmap();
}

// Initialize liquid chocolate simulation
function initializeLiquidChocolate(width, height) {
  // Define main chocolate pool
  const centerX = width / 2;
  const centerY = height * 0.4;
  const poolRadius = Math.min(width, height) * 0.25;
  
  // Create flow control points for the liquid surface
  flowControlPoints = [];
  liquidSurface = [];
  chocolateDepth = [];
  
  // Create main pool with natural variations
  const segmentCount = renderQuality === 'ultra' ? 50 : 
                     renderQuality === 'high' ? 35 :
                     renderQuality === 'medium' ? 25 : 15;
  
  // Create central chocolate pool control points
  for (let i = 0; i <= segmentCount; i++) {
    const angle = (i / segmentCount) * Math.PI * 2;
    const radiusVariation = 0.8 + Math.sin(i * 5) * 0.1 + Math.cos(i * 7) * 0.1;
    
    // Define flow boundary
    const x = centerX + Math.cos(angle) * poolRadius * radiusVariation;
    const y = centerY + Math.sin(angle) * poolRadius * radiusVariation * 0.8; // Slightly oval
    
    flowControlPoints.push({
      x, y,
      baseX: x, baseY: y,
      vx: 0, vy: 0,
      tension: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      amplitude: 2 + Math.random() * 5,
      frequency: 0.05 + Math.random() * 0.1
    });
    
    // Initialize liquid surface (will be modified during animation)
    liquidSurface.push({ x, y });
    
    // Set initial depth values
    const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const normalizedDistance = distanceFromCenter / poolRadius;
    const depth = 1 - easeOutQuad(normalizedDistance);
    
    chocolateDepth.push(depth);
  }
  
  // Create chocolate flows
  const flowCount = renderQuality === 'low' ? 3 : 
                  renderQuality === 'medium' ? 5 :
                  renderQuality === 'high' ? 7 : 9;
  
  for (let i = 0; i < flowCount; i++) {
    // Random starting point within the pool
    const angle = Math.random() * Math.PI * 2;
    const distance = poolRadius * (0.1 + Math.random() * 0.6);
    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;
    
    // Random ending point outside the pool
    const endAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
    const endDistance = poolRadius * (1.2 + Math.random() * 0.5);
    const endX = centerX + Math.cos(endAngle) * endDistance;
    const endY = centerY + Math.sin(endAngle) * endDistance;
    
    // Create flow with control points
    const flow = {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness: 5 + Math.random() * 20,
      speed: 0.5 + Math.random() * 1.5,
      viscosity: 0.7 + Math.random() * 0.3,
      flowAmount: 0,
      active: true,
      color: CHOCOLATE_COLORS[Math.floor(Math.random() * 3) + 2], // Choose from milk chocolate colors
      controlPoints: []
    };
    
    // Create variable number of control points for natural curves
    const pointCount = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j <= pointCount; j++) {
      const t = j / pointCount;
      
      // Create curved path
      const midX = startX + (endX - startX) * t;
      const midY = startY + (endY - startY) * t;
      
      // Add some natural curve with perpendicular offset
      const perpX = (endY - startY);
      const perpY = -(endX - startX);
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
      
      // More curve in the middle, less at ends
      const curveAmount = Math.sin(t * Math.PI) * 30 * (Math.random() - 0.3);
      
      flow.controlPoints.push({
        x: midX + (perpX / perpLen) * curveAmount,
        y: midY + (perpY / perpLen) * curveAmount,
        amplitude: 2 + Math.random() * 3,
        frequency: 0.05 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    chocolateFlows.push(flow);
  }
  
  // Add initial chocolate ripples
  for (let i = 0; i < 5; i++) {
    addChocolateRipple(
      centerX + (Math.random() - 0.5) * poolRadius,
      centerY + (Math.random() - 0.5) * poolRadius * 0.8,
      5 + Math.random() * 10
    );
  }
  
  // Add initial drips
  for (let i = 0; i < 3; i++) {
    addChocolateDrip(width, height);
  }
}

// Draw liquid chocolate with metallic properties
function drawLiquidChocolate(ctx, width, height, progress, deltaTime) {
  const centerX = width / 2;
  const centerY = height * 0.4;
  
  // Update liquid chocolate physics
  updateLiquidChocolatePhysics(deltaTime, progress, width, height);
  
  // Choose rich chocolate gradient
  const mainColor = CHOCOLATE_COLORS[2]; // Premium milk chocolate
  const r = mainColor.r, g = mainColor.g, b = mainColor.b;
  
  // Create rich metallic gradient
  const chocolateGradient = ctx.createRadialGradient(
    centerX - width * 0.1, centerY - height * 0.1, 0,
    centerX, centerY, width * 0.3
  );
  
  chocolateGradient.addColorStop(0, `rgba(${Math.min(r+20, 255)},${Math.min(g+15, 255)},${Math.min(b+10, 255)},1)`);
  chocolateGradient.addColorStop(0.4, `rgba(${r},${g},${b},1)`);
  chocolateGradient.addColorStop(0.8, `rgba(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)},1)`);
  chocolateGradient.addColorStop(1, `rgba(${Math.max(0,r-50)},${Math.max(0,g-50)},${Math.max(0,b-50)},1)`);
  
  // Draw main chocolate pool
  ctx.save();
  
  // Draw subtle shadow for depth
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  
  // Use liquid surface points for pool shape
  ctx.moveTo(liquidSurface[0].x + 2, liquidSurface[0].y + 2);
  for (let i = 1; i < liquidSurface.length; i++) {
    const p0 = liquidSurface[i-1];
    const p1 = liquidSurface[i];
    
    // Use quadratic curves for smoother edges
    const cpX = (p0.x + p1.x) / 2;
    const cpY = (p0.y + p1.y) / 2;
    
    ctx.quadraticCurveTo(p0.x + 2, p0.y + 2, cpX + 2, cpY + 2);
  }
  
  // Connect back to first point
  const lastP = liquidSurface[liquidSurface.length-1];
  const firstP = liquidSurface[0];
  const cpX = (lastP.x + firstP.x) / 2;
  const cpY = (lastP.y + firstP.y) / 2;
  ctx.quadraticCurveTo(lastP.x + 2, lastP.y + 2, cpX + 2, cpY + 2);
  
  ctx.closePath();
  ctx.fill();
  
  // Draw main chocolate pool
  ctx.fillStyle = chocolateGradient;
  ctx.beginPath();
  
  ctx.moveTo(liquidSurface[0].x, liquidSurface[0].y);
  for (let i = 1; i < liquidSurface.length; i++) {
    const p0 = liquidSurface[i-1];
    const p1 = liquidSurface[i];
    
    // Use quadratic curves for smoother edges
    const cpX = (p0.x + p1.x) / 2;
    const cpY = (p0.y + p1.y) / 2;
    
    ctx.quadraticCurveTo(p0.x, p0.y, cpX, cpY);
  }
  
  // Connect back to first point
  const last = liquidSurface[liquidSurface.length-1];
  const first = liquidSurface[0];
  const controlX = (last.x + first.x) / 2;
  const controlY = (last.y + first.y) / 2;
  ctx.quadraticCurveTo(last.x, last.y, controlX, controlY);
  
  ctx.closePath();
  ctx.fill();
  
  // Add chocolate texture
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.15;
    
    if (textureCache['flow']) {
      ctx.drawImage(
        textureCache['flow'],
        centerX - width * 0.2,
        centerY - height * 0.2,
        width * 0.4,
        height * 0.4
      );
    }
    
    ctx.restore();
  }
  
  // Draw chocolate flows
  for (let flow of chocolateFlows) {
    if (!flow.active) continue;
    
    // Update flow amount based on progress
    flow.flowAmount = Math.min(1, flow.flowAmount + flow.speed * deltaTime * 0.02);
    
    // Skip if not visible yet
    if (flow.flowAmount <= 0) continue;
    
    // Draw the flow path
    const flowColor = flow.color;
    const flowR = flowColor.r, flowG = flowColor.g, flowB = flowColor.b;
    
    // Create flow gradient
    const flowGradient = ctx.createLinearGradient(
      flow.start.x, flow.start.y,
      flow.end.x, flow.end.y
    );
    
    flowGradient.addColorStop(0, `rgba(${Math.min(flowR+15, 255)},${Math.min(flowG+10, 255)},${Math.min(flowB+5, 255)},1)`);
    flowGradient.addColorStop(0.5, `rgba(${flowR},${flowG},${flowB},1)`);
    flowGradient.addColorStop(1, `rgba(${Math.max(0,flowR-20)},${Math.max(0,flowG-20)},${Math.max(0,flowB-20)},1)`);
    
    ctx.fillStyle = flowGradient;
    ctx.beginPath();
    
    // Create flow path with variable thickness
    const points = [flow.start, ...flow.controlPoints, flow.end];
    const fullLength = getFlowPathLength(points);
    const visibleLength = fullLength * flow.flowAmount;
    
    // Left side of flow
    let currentLength = 0;
    let lastPoint = null;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const segmentLength = distance(p1, p2);
      
      if (currentLength + segmentLength > visibleLength) {
        // We need to cut this segment
        const remainingLength = visibleLength - currentLength;
        const t = remainingLength / segmentLength;
        const endPoint = {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
        
        // Add this partial segment
        if (lastPoint === null) {
          lastPoint = p1;
        }
        
        // Calculate perpendicular vectors for thickness
        const dx = endPoint.x - lastPoint.x;
        const dy = endPoint.y - lastPoint.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          
          // Tapering thickness based on flow progress
          const startThickness = flow.thickness * (1 - 0.5 * (currentLength / visibleLength));
          const endThickness = flow.thickness * (1 - 0.5 * (visibleLength / fullLength));
          
          // Store left edge points
          const leftStart = {
            x: lastPoint.x + nx * startThickness / 2,
            y: lastPoint.y + ny * startThickness / 2
          };
          
          const leftEnd = {
            x: endPoint.x + nx * endThickness / 2,
            y: endPoint.y + ny * endThickness / 2
          };
          
          // Add left side points to path
          if (i === 0) {
            ctx.moveTo(leftStart.x, leftStart.y);
          }
          ctx.lineTo(leftEnd.x, leftEnd.y);
        }
        
        // Stop here as we've reached the visible portion
        lastPoint = endPoint;
        break;
      } else {
        // Add this full segment
        if (lastPoint === null) {
          lastPoint = p1;
        }
        
        // Calculate perpendicular vectors for thickness
        const dx = p2.x - lastPoint.x;
        const dy = p2.y - lastPoint.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          
          // Tapering thickness based on flow progress
          const startThickness = flow.thickness * (1 - 0.3 * (currentLength / fullLength));
          const endThickness = flow.thickness * (1 - 0.3 * ((currentLength + segmentLength) / fullLength));
          
          // Store left edge points
          const leftStart = {
            x: lastPoint.x + nx * startThickness / 2,
            y: lastPoint.y + ny * startThickness / 2
          };
          
          const leftEnd = {
            x: p2.x + nx * endThickness / 2,
            y: p2.y + ny * endThickness / 2
          };
          
          // Add left side points to path
          if (i === 0) {
            ctx.moveTo(leftStart.x, leftStart.y);
          }
          ctx.lineTo(leftEnd.x, leftEnd.y);
        }
        
        lastPoint = p2;
        currentLength += segmentLength;
      }
    }
    
    // If we've processed all points and still haven't reached the visible length
    if (currentLength < visibleLength && lastPoint !== null) {
      // Just use the last point
      const endPoint = points[points.length - 1];
      
      // Calculate perpendicular vectors for thickness
      const dx = endPoint.x - lastPoint.x;
      const dy = endPoint.y - lastPoint.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        
        // Tapering thickness
        const thickness = flow.thickness * 0.7;
        
        // Left edge point
        const leftEnd = {
          x: endPoint.x + nx * thickness / 2,
          y: endPoint.y + ny * thickness / 2
        };
        
        ctx.lineTo(leftEnd.x, leftEnd.y);
      }
    }
    
    // Now draw the right side in reverse
    currentLength = 0;
    lastPoint = null;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const segmentLength = distance(p1, p2);
      
      if (currentLength + segmentLength > visibleLength) {
        // We need to cut this segment
        const remainingLength = visibleLength - currentLength;
        const t = remainingLength / segmentLength;
        const endPoint = {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
        
        // End cap - create a rounded end
        const dx = endPoint.x - lastPoint.x;
        const dy = endPoint.y - lastPoint.y;
        const angle = Math.atan2(dy, dx);
        const endThickness = flow.thickness * (1 - 0.5 * (visibleLength / fullLength));
        
        ctx.arc(endPoint.x, endPoint.y, endThickness / 2, angle - Math.PI/2, angle + Math.PI/2);
        
        // Now continue back along the right side
        // Calculate perpendicular vectors for thickness
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
          const nx = dy / len;
          const ny = -dx / len;
          
          // Tapering thickness based on flow progress
          const startThickness = flow.thickness * (1 - 0.5 * (currentLength / visibleLength));
          
          // Store right edge points
          const rightEnd = {
            x: lastPoint.x + nx * startThickness / 2,
            y: lastPoint.y + ny * startThickness / 2
          };
          
          ctx.lineTo(rightEnd.x, rightEnd.y);
        }
        
        break;
      } else {
        // Add this full segment
        if (lastPoint === null) {
          lastPoint = p1;
        } else {
          // Calculate perpendicular vectors for thickness
          const dx = p2.x - lastPoint.x;
          const dy = p2.y - lastPoint.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          
          if (len > 0 && i === points.length - 2) {
            // For the last segment, add a rounded cap
            const angle = Math.atan2(dy, dx);
            const endThickness = flow.thickness * (1 - 0.3 * ((currentLength + segmentLength) / fullLength));
            
            ctx.arc(p2.x, p2.y, endThickness / 2, angle - Math.PI/2, angle + Math.PI/2);
          }
        }
        
        lastPoint = p2;
        currentLength += segmentLength;
      }
    }
    
    // Complete the right side in reverse
    currentLength = 0;
    lastPoint = null;
    const reversedPoints = [...points].reverse();
    
    for (let i = 0; i < reversedPoints.length - 1; i++) {
      const p1 = reversedPoints[i];
      const p2 = reversedPoints[i+1];
      const segmentLength = distance(p1, p2);
      
      if (currentLength + segmentLength > fullLength - visibleLength) {
        // We need to cut this segment
        const remainingLength = (fullLength - visibleLength) - currentLength;
        const t = remainingLength / segmentLength;
        const endPoint = {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
        
        // Add this partial segment
        if (lastPoint === null) {
          lastPoint = p1;
        }
        
        // Calculate perpendicular vectors for thickness
        const dx = endPoint.x - lastPoint.x;
        const dy = endPoint.y - lastPoint.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
          const nx = dy / len;
          const ny = -dx / len;
          
          // Tapering thickness based on flow progress
          const startThickness = flow.thickness * (1 - 0.3 * (1 - currentLength / fullLength));
          const endThickness = flow.thickness * (1 - 0.3 * (1 - (currentLength + remainingLength) / fullLength));
          
          // Store right edge points
          const rightStart = {
            x: lastPoint.x + nx * startThickness / 2,
            y: lastPoint.y + ny * startThickness / 2
          };
          
          const rightEnd = {
            x: endPoint.x + nx * endThickness / 2,
            y: endPoint.y + ny * endThickness / 2
          };
          
          // Add right side points to path
          if (i === 0) {
            ctx.lineTo(rightStart.x, rightStart.y);
          }
          ctx.lineTo(rightEnd.x, rightEnd.y);
        }
        
        break;
      } else {
        // Add this full segment
        if (lastPoint === null) {
          lastPoint = p1;
        }
        
        // Calculate perpendicular vectors for thickness
        const dx = p2.x - lastPoint.x;
        const dy = p2.y - lastPoint.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        
        if (len > 0) {
          const nx = dy / len;
          const ny = -dx / len;
          
          // Tapering thickness based on flow progress
          const startThickness = flow.thickness * (1 - 0.3 * (1 - currentLength / fullLength));
          const endThickness = flow.thickness * (1 - 0.3 * (1 - (currentLength + segmentLength) / fullLength));
          
          // Store right edge points
          const rightStart = {
            x: lastPoint.x + nx * startThickness / 2,
            y: lastPoint.y + ny * startThickness / 2
          };
          
          const rightEnd = {
            x: p2.x + nx * endThickness / 2,
            y: p2.y + ny * endThickness / 2
          };
          
          // Add right side points to path
          if (i === 0) {
            ctx.lineTo(rightStart.x, rightStart.y);
          }
          ctx.lineTo(rightEnd.x, rightEnd.y);
        }
        
        lastPoint = p2;
        currentLength += segmentLength;
      }
    }
    
    // Create a start cap if necessary
    if (flow.flowAmount < 1) {
      const startPoint = points[0];
      const nextPoint = points[1];
      
      // Calculate angle
      const dx = nextPoint.x - startPoint.x;
      const dy = nextPoint.y - startPoint.y;
      const angle = Math.atan2(dy, dx);
      
      // Add a rounded cap at the start
      const startThickness = flow.thickness;
      ctx.arc(startPoint.x, startPoint.y, startThickness / 2, angle + Math.PI/2, angle - Math.PI/2, true);
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add glossy highlight to flow
    if (renderQuality !== 'low') {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.3 * flow.color.metallic;
      
      // Use pre-rendered glossy texture if available
      if (textureCache['glossy']) {
        // Calculate the rectangle that bounds the flow
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of [flow.start, ...flow.controlPoints, flow.end]) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
        
        // Add padding for thickness
        const padding = flow.thickness;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Draw glossy texture
        ctx.drawImage(
          textureCache['glossy'],
          minX, minY,
          maxX - minX, maxY - minY
        );
      }
      
      ctx.restore();
    }
    
    // Add drip at the end of flow
    if (flow.flowAmount >= 0.98 && Math.random() < 0.02 * deltaTime) {
      // Create a new drip from the end of the flow
      const endPoint = points[points.length - 1];
      
      // Calculate flow direction at end
      const prevPoint = points[points.length - 2];
      const dx = endPoint.x - prevPoint.x;
      const dy = endPoint.y - prevPoint.y;
      const angle = Math.atan2(dy, dx);
      
      // Start drip at end of flow
      const drip = {
        x: endPoint.x,
        y: endPoint.y,
        width: flow.thickness * 0.5,
        maxLength: 30 + Math.random() * 50,
        currentLength: 0,
        color: flow.color,
        direction: angle, // Follow flow direction
        age: 0,
        growTime: 0.5 + Math.random() * 0.5,
        lifetime: 1 + Math.random() * 2,
        opacity: 1,
        speed: 0.5 + Math.random() * 0.5,
        viscosity: flow.viscosity,
        wobbleAmount: 0.05 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2
      };
      
      chocolateDrips.push(drip);
    }
  }
  
  // Draw metallic sheen on main chocolate pool
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  
  // Create gradient for metallic highlight
  const sheenGradient = ctx.createRadialGradient(
    centerX - width * 0.08, centerY - height * 0.08, 0,
    centerX, centerY, width * 0.25
  );
  
  sheenGradient.addColorStop(0, 'rgba(255,255,255,0.7)');
  sheenGradient.addColorStop(0.3, 'rgba(255,255,255,0.3)');
  sheenGradient.addColorStop(0.6, 'rgba(255,255,255,0.1)');
  sheenGradient.addColorStop(1, 'rgba(255,255,255,0)');
  
  ctx.fillStyle = sheenGradient;
  ctx.beginPath();
  
  // Use a slightly smaller area for the highlight
  const highlightScale = 0.9;
  
  ctx.moveTo(
    centerX + (liquidSurface[0].x - centerX) * highlightScale, 
    centerY + (liquidSurface[0].y - centerY) * highlightScale
  );
  
  for (let i = 1; i < liquidSurface.length; i++) {
    const p0 = liquidSurface[i-1];
    const p1 = liquidSurface[i];
    
    // Use quadratic curves for smoother edges
    const cpX = (p0.x + p1.x) / 2;
    const cpY = (p0.y + p1.y) / 2;
    
    ctx.quadraticCurveTo(
      centerX + (p0.x - centerX) * highlightScale, centerY + (p0.y - centerY) * highlightScale,
      centerX + (cpX - centerX) * highlightScale, centerY + (cpY - centerY) * highlightScale
    );
  }
  
  // Connect back to first point
  const lastPoint = liquidSurface[liquidSurface.length-1];
  const firstPoint = liquidSurface[0];
  const ctrlX = (lastPoint.x + firstPoint.x) / 2;
  const ctrlY = (lastPoint.y + firstPoint.y) / 2;
  
  ctx.quadraticCurveTo(
    centerX + (lastPoint.x - centerX) * highlightScale, centerY + (lastPoint.y - centerY) * highlightScale,
    centerX + (ctrlX - centerX) * highlightScale, centerY + (ctrlY - centerY) * highlightScale
  );
  
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
  
  // Add secondary metallic highlights
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    // Keep track of highlights that need to be rendered
    const highlights = [];
    
    // Make sure we have enough highlights
    while (chocolateMetallicHighlights.length < 5) {
      addMetallicHighlight(centerX, centerY);
    }
    
    // Update and collect active highlights
    for (let i = 0; i < chocolateMetallicHighlights.length; i++) {
      const highlight = chocolateMetallicHighlights[i];
      
      // Update position with movement
      highlight.phase += highlight.speed * deltaTime;
      highlight.x = highlight.baseX + Math.cos(highlight.phase) * highlight.amplitude;
      highlight.y = highlight.baseY + Math.sin(highlight.phase * 0.7) * highlight.amplitude;
      
      // Fade based on age
      highlight.age += deltaTime * 0.01;
      if (highlight.age > highlight.lifetime) {
        // Replace with new highlight
        chocolateMetallicHighlights[i] = createMetallicHighlight(centerX, centerY);
      } else {
        // Calculate opacity
        if (highlight.age < 0.3) {
          highlight.opacity = highlight.age / 0.3;
        } else if (highlight.age > highlight.lifetime - 0.3) {
          highlight.opacity = (highlight.lifetime - highlight.age) / 0.3;
        } else {
          highlight.opacity = 1;
        }
        
        highlights.push(highlight);
      }
    }
    
    // Render active highlights
    for (const highlight of highlights) {
      // Check if highlight is inside the chocolate pool
      let insidePool = false;
      
      const points = [...liquidSurface, liquidSurface[0]]; // Close the loop
      if (isPointInPolygon(highlight.x, highlight.y, points)) {
        insidePool = true;
      }
      
      if (insidePool) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = highlight.opacity * 0.5;
        
        // Create gradient for highlight
        const highlightGradient = ctx.createRadialGradient(
          highlight.x, highlight.y, 0,
          highlight.x, highlight.y, highlight.size
        );
        
        highlightGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
        highlightGradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
        highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.ellipse(
          highlight.x, highlight.y,
          highlight.size, highlight.size * 0.7,
          highlight.rotation, 0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.restore();
      }
    }
  }
  
  // Draw depth-enhancing edge shadow
  if (renderQuality !== 'low') {
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    ctx.moveTo(liquidSurface[0].x, liquidSurface[0].y);
    for (let i = 1; i < liquidSurface.length; i++) {
      const p0 = liquidSurface[i-1];
      const p1 = liquidSurface[i];
      
      const cpX = (p0.x + p1.x) / 2;
      const cpY = (p0.y + p1.y) / 2;
      
      ctx.quadraticCurveTo(p0.x, p0.y, cpX, cpY);
    }
    
    const last = liquidSurface[liquidSurface.length-1];
    const first = liquidSurface[0];
    const cX = (last.x + first.x) / 2;
    const cY = (last.y + first.y) / 2;
    ctx.quadraticCurveTo(last.x, last.y, cX, cY);
    
    ctx.closePath();
    ctx.stroke();
  }
  
  ctx.restore();
}

// Update liquid chocolate physics
function updateLiquidChocolatePhysics(deltaTime, progress, width, height) {
  const springFactor = FLOW_FACTOR;
  const surfaceTension = SURFACE_TENSION;
  
  // Update spring-based flow control points
  for (let i = 0; i < flowControlPoints.length; i++) {
    const point = flowControlPoints[i];
    
    // Update phase for natural wave motion
    point.phase += point.frequency * deltaTime;
    
    // Apply spring force to control points
    const dx = point.baseX - point.x;
    const dy = point.baseY - point.y;
    
    // Apply spring force using Hooke's law
    point.vx += dx * springFactor * point.tension * deltaTime;
    point.vy += dy * springFactor * point.tension * deltaTime;
    
    // Add natural wave motion
    point.vx += Math.sin(point.phase) * point.amplitude * 0.01 * deltaTime;
    point.vy += Math.cos(point.phase * 1.3) * point.amplitude * 0.01 * deltaTime;
    
    // Apply animation progress effects
    if (progress < 0.3) {
      // During pour, add more motion
      const pourFactor = easeOutQuad(progress / 0.3);
      point.vx += (Math.random() - 0.5) * 5 * (1 - pourFactor) * deltaTime;
      point.vy += (Math.random() - 0.5) * 5 * (1 - pourFactor) * deltaTime;
    }
    
    // Apply surface tension with adjacent points
    const prevIdx = (i - 1 + flowControlPoints.length) % flowControlPoints.length;
    const nextIdx = (i + 1) % flowControlPoints.length;
    
    const prevPoint = flowControlPoints[prevIdx];
    const nextPoint = flowControlPoints[nextIdx];
    
    // Calculate tension force
    const toPrevX = prevPoint.x - point.x;
    const toPrevY = prevPoint.y - point.y;
    const toNextX = nextPoint.x - point.x;
    const toNextY = nextPoint.y - point.y;
    
    point.vx += (toPrevX + toNextX) * surfaceTension * 0.01 * deltaTime;
    point.vy += (toPrevY + toNextY) * surfaceTension * 0.01 * deltaTime;
    
    // Apply damping to prevent oscillation
    point.vx *= 0.95;
    point.vy *= 0.95;
    
    // Update position
    point.x += point.vx * deltaTime;
    point.y += point.vy * deltaTime;
  }
  
  // Update flow control points for chocolate flows
  for (let flow of chocolateFlows) {
    for (let controlPoint of flow.controlPoints) {
      // Update phase for wave motion
      controlPoint.phase += controlPoint.frequency * deltaTime;
      
      // Apply wave motion to control points
      controlPoint.x += Math.sin(controlPoint.phase) * controlPoint.amplitude * 0.05 * deltaTime;
      controlPoint.y += Math.cos(controlPoint.phase * 1.3) * controlPoint.amplitude * 0.05 * deltaTime;
    }
  }
  
  // Update liquid surface from control points with smoothing
  for (let i = 0; i < liquidSurface.length; i++) {
    const controlPoint = flowControlPoints[i];
    const surfacePoint = liquidSurface[i];
    
    // Smoothly move surface towards control points
    surfacePoint.x += (controlPoint.x - surfacePoint.x) * 0.2 * deltaTime;
    surfacePoint.y += (controlPoint.y - surfacePoint.y) * 0.2 * deltaTime;
    
    // Update depth based on ripples
    // Depth is used for rendering but not directly affecting physics
    const targetDepth = 1 - distance(
      { x: surfacePoint.x, y: surfacePoint.y },
      { x: width/2, y: height*0.4 }
    ) / (Math.min(width, height) * 0.25);
    
    chocolateDepth[i] += (targetDepth - chocolateDepth[i]) * 0.05 * deltaTime;
  }
}

// Add a ripple to the chocolate surface
function addChocolateRipple(x, y, size) {
  chocolateRipples.push({
    x, y,
    size,
    maxSize: size * 1.5,
    currentSize: 0,
    strength: 0.3 + Math.random() * 0.7,
    age: 0,
    lifetime: 1 + Math.random() * 2,
    frequency: 2 + Math.random() * 3
  });
}

// Draw ripples on chocolate surface
function drawChocolateRipples(ctx, deltaTime, progress) {
  const deadRipples = [];
  
  // Process existing ripples
  for (let i = 0; i < chocolateRipples.length; i++) {
    const ripple = chocolateRipples[i];
    
    // Update ripple state
    ripple.age += deltaTime * 0.05;
    
    // Expand ripple
    const growProgress = Math.min(1, ripple.age / (ripple.lifetime * 0.3));
    ripple.currentSize = ripple.maxSize * easeOutQuad(growProgress);
    
    // Calculate ripple strength
    let strength = ripple.strength;
    if (ripple.age > ripple.lifetime * 0.7) {
      strength *= (ripple.lifetime - ripple.age) / (ripple.lifetime * 0.3);
    }
    
    // Apply ripple effect to liquid surface
    for (let j = 0; j < liquidSurface.length; j++) {
      const point = liquidSurface[j];
      const dx = point.x - ripple.x;
      const dy = point.y - ripple.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0 && dist < ripple.currentSize) {
        // Calculate ripple effect with distance attenuation
        const distFactor = 1 - dist / ripple.currentSize;
        const angle = Math.atan2(dy, dx);
        
        // Ripple formula: sin(distance * frequency) * strength * distanceFactor
        const offset = Math.sin(dist * 0.1 * ripple.frequency - ripple.age * 10) * strength * distFactor;
        
        // Apply offset to control points for physics simulation
        const controlPoint = flowControlPoints[j];
        controlPoint.vx += Math.cos(angle) * offset * 0.5 * deltaTime;
        controlPoint.vy += Math.sin(angle) * offset * 0.5 * deltaTime;
      }
    }
    
    // Draw visual ripple effect
    if (renderQuality === 'high' || renderQuality === 'ultra') {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      
      // Calculate opacity based on age
      let opacity = 0.3;
      if (ripple.age < 0.2) {
        opacity *= ripple.age / 0.2;
      } else if (ripple.age > ripple.lifetime * 0.7) {
        opacity *= (ripple.lifetime - ripple.age) / (ripple.lifetime * 0.3);
      }
      
      ctx.globalAlpha = opacity;
      
      // Use ripple texture
      if (textureCache['ripple']) {
        const size = ripple.currentSize * 2;
        ctx.drawImage(
          textureCache['ripple'],
          ripple.x - size/2, ripple.y - size/2,
          size, size
        );
      } else {
        // Fallback to drawing circles
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.currentSize, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Check if ripple is done
    if (ripple.age >= ripple.lifetime) {
      deadRipples.push(i);
    }
  }
  
  // Remove dead ripples
  for (let i = deadRipples.length - 1; i >= 0; i--) {
    chocolateRipples.splice(deadRipples[i], 1);
  }
  
  // Possibly add new ripples
  if (progress > 0.1 && progress < 0.9) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.4;
    const radius = Math.min(canvas.width, canvas.height) * 0.2;
    
    if (Math.random() < 0.03 * deltaTime) {
      // Create ripple within chocolate pool
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.7;
      
      addChocolateRipple(
        centerX + Math.cos(angle) * dist,
        centerY + Math.sin(angle) * dist,
        5 + Math.random() * 15
      );
    }
  }
}

// Add a drip of chocolate
function addChocolateDrip(width, height) {
  // Place drip along top or sides of chocolate pool
  const centerX = width / 2;
  const centerY = height * 0.4;
  const poolRadius = Math.min(width, height) * 0.25;
  
  let x, y, direction;
  
  // Choose starting point and direction
  if (Math.random() < 0.7) {
    // Start from the edge of the pool
    const angle = Math.random() * Math.PI * 2;
    x = centerX + Math.cos(angle) * poolRadius * 0.95;
    y = centerY + Math.sin(angle) * poolRadius * 0.95;
    
    // Drip outward from center
    direction = angle;
  } else {
    // Start from top of screen
    x = width * (0.3 + Math.random() * 0.4);
    y = height * 0.1;
    direction = Math.PI/2; // Downward
  }
  
  // Select chocolate color
  const colorIndex = Math.floor(Math.random() * 3) + 2; // Primarily milk chocolate colors
  
  // Create the drip
  chocolateDrips.push({
    x, y,
    width: 5 + Math.random() * 10,
    maxLength: 40 + Math.random() * 60,
    currentLength: 0,
    color: CHOCOLATE_COLORS[colorIndex],
    direction,
    age: 0,
    growTime: 0.5 + Math.random() * 1.0,
    lifetime: 2 + Math.random() * 3,
    opacity: 1,
    viscosity: VISCOSITY_FACTOR * (0.7 + Math.random() * 0.3),
    phase: Math.random() * Math.PI * 2,
    speed: 0.05 + Math.random() * 0.1,
    wobbleAmount: 0.1 + Math.random() * 0.2,
    // Curved path parameters
    controlPoints: [
      { x: 0.3 + Math.random() * 0.2, y: 0 },
      { x: 0.6 + Math.random() * 0.2, y: 0 }
    ],
    bulges: []
  });
  
  // Add random bulges along drip
  const drip = chocolateDrips[chocolateDrips.length - 1];
  const bulgeCount = 1 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < bulgeCount; i++) {
    drip.bulges.push({
      position: 0.2 + Math.random() * 0.6, // Position along drip (0-1)
      size: 0.2 + Math.random() * 0.5,     // Size relative to drip width
      phase: Math.random() * Math.PI * 2,  // Animation phase
      speed: 0.02 + Math.random() * 0.05   // Animation speed
    });
  }
}

// Create metallic highlight for chocolate surface
function createMetallicHighlight(centerX, centerY) {
  const poolRadius = Math.min(canvas.width, canvas.height) * 0.25;
  
  // Random position within pool
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * poolRadius * 0.8;
  
  return {
    baseX: centerX + Math.cos(angle) * dist,
    baseY: centerY + Math.sin(angle) * dist,
    x: centerX + Math.cos(angle) * dist,
    y: centerY + Math.sin(angle) * dist,
    size: 5 + Math.random() * 15,
    amplitude: 5 + Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    speed: 0.02 + Math.random() * 0.05,
    rotation: Math.random() * Math.PI,
    age: 0,
    lifetime: 2 + Math.random() * 4,
    opacity: 0
  };
}

// Add metallic highlight to collection
function addMetallicHighlight(centerX, centerY) {
  chocolateMetallicHighlights.push(createMetallicHighlight(centerX, centerY));
}

// Draw metallic highlights with light physics
function drawMetallicHighlights(ctx, deltaTime, progress) {
  // This function is primarily implemented inline in the drawLiquidChocolate function
  // because highlights need to be drawn with proper layering relative to the liquid surface
}

// Update and draw chocolate drips
function updateAndDrawChocolateDrips(ctx, deltaTime, progress) {
  const deadDrips = [];
  
  for (let i = 0; i < chocolateDrips.length; i++) {
    const drip = chocolateDrips[i];
    
    // Update drip state
    drip.age += deltaTime * 0.06;
    
    // Update phase for wobble and animation
    drip.phase += drip.speed * deltaTime;
    
    // Update bulge phases
    for (let bulge of drip.bulges) {
      bulge.phase += bulge.speed * deltaTime;
    }
    
    // Update drip length based on age
    const lengthProgress = Math.min(1, drip.age / drip.growTime);
    drip.currentLength = drip.maxLength * easeOutQuad(lengthProgress);
    
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
    ctx.save();
    
    // Set transparency
    ctx.globalAlpha = drip.opacity;
    
    // Create base color and derived colors
    const r = drip.color.r, g = drip.color.g, b = drip.color.b;
    const baseColor = `rgb(${r},${g},${b})`;
    const lightColor = `rgb(${Math.min(255, r+20)},${Math.min(255, g+15)},${Math.min(255, b+10)})`;
    const darkColor = `rgb(${Math.max(0, r-30)},${Math.max(0, g-30)},${Math.max(0, b-30)})`;
    
    // Calculate drip end point with wobble
    const wobble = Math.sin(drip.phase * 5) * drip.wobbleAmount;
    const endX = drip.x + Math.cos(drip.direction + wobble) * drip.currentLength;
    const endY = drip.y + Math.sin(drip.direction + wobble) * drip.currentLength;
    
    // Calculate control points for curved drip
    const cp1x = drip.x + Math.cos(drip.direction) * drip.currentLength * drip.controlPoints[0].x;
    const cp1y = drip.y + Math.sin(drip.direction) * drip.currentLength * drip.controlPoints[0].x;
    
    const cp2x = drip.x + Math.cos(drip.direction) * drip.currentLength * drip.controlPoints[1].x;
    const cp2y = drip.y + Math.sin(drip.direction) * drip.currentLength * drip.controlPoints[1].x;
    
    // Draw subtle shadow first for depth
    if (renderQuality !== 'low') {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      
      // Draw shadow shape
      ctx.beginPath();
      
      // Start point with full width
      const topWidth = drip.width;
      ctx.moveTo(drip.x - topWidth/2 + 1, drip.y + 1);
      ctx.lineTo(drip.x + topWidth/2 + 1, drip.y + 1);
      
      // Calculate viscosity factor based on drip length
      const viscosityFactor = Math.pow(drip.viscosity, drip.currentLength / 100);
      
      // Tapering factor based on viscosity
      const taper = (0.3 + viscosityFactor * 0.7);
      
      // Draw right side with thinning based on viscosity
      ctx.bezierCurveTo(
        cp1x + topWidth/2 * taper + 1, cp1y + 1,
        cp2x + topWidth/2 * taper * 0.7 + 1, cp2y + 1,
        endX + topWidth/4 * taper + 1, endY + 1
      );
      
      // Draw bulbous bottom with size based on viscosity
      const bulbSize = topWidth * 0.4 * (2 - viscosityFactor);
      ctx.arc(endX + 1, endY + 1, bulbSize, 0, Math.PI, true);
      
      // Draw left side
      ctx.bezierCurveTo(
        cp2x - topWidth/2 * taper * 0.7 + 1, cp2y + 1,
        cp1x - topWidth/2 * taper + 1, cp1y + 1,
        drip.x - topWidth/2 + 1, drip.y + 1
      );
      
      ctx.closePath();
      ctx.fill();
    }
    
    // Create main drip gradient
    const dripGradient = ctx.createLinearGradient(
      drip.x, drip.y,
      endX, endY
    );
    
    dripGradient.addColorStop(0, lightColor);
    dripGradient.addColorStop(0.3, baseColor);
    dripGradient.addColorStop(0.7, baseColor);
    dripGradient.addColorStop(1, darkColor);
    
    ctx.fillStyle = dripGradient;
    
    // Draw main drip
    ctx.beginPath();
    
    // Start point with full width
    const topWidth = drip.width;
    ctx.moveTo(drip.x - topWidth/2, drip.y);
    ctx.lineTo(drip.x + topWidth/2, drip.y);
    
    // Calculate viscosity factor
    const viscosityFactor = Math.pow(drip.viscosity, drip.currentLength / 100);
    
    // Tapering factor based on viscosity
    const taper = (0.3 + viscosityFactor * 0.7);
    
    // Create path for right side with bulges
    let lastT = 0;
    let lastX = drip.x + topWidth/2;
    let lastY = drip.y;
    
    // Sample points along the bezier curve
    const steps = renderQuality === 'low' ? 10 : 20;
    
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      
      // Calculate point on bezier curve
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      
      let x = mt3 * drip.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX;
      let y = mt3 * drip.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY;
      
      // Calculate normal vector for width
      let tx, ty;
      if (j < steps) {
        // Get next point for tangent
        const nextT = (j + 1) / steps;
        const nmt = 1 - nextT;
        const nmt2 = nmt * nmt;
        const nmt3 = nmt2 * nmt;
        const nt2 = nextT * nextT;
        const nt3 = nt2 * nextT;
        
        const nextX = nmt3 * drip.x + 3 * nmt2 * nextT * cp1x + 3 * nmt * nt2 * cp2x + nt3 * endX;
        const nextY = nmt3 * drip.y + 3 * nmt2 * nextT * cp1y + 3 * nmt * nt2 * cp2y + nt3 * endY;
        
        // Calculate tangent
        tx = nextX - x;
        ty = nextY - y;
      } else {
        // Use previous tangent for last point
        tx = x - lastX;
        ty = y - lastY;
      }
      
      // Normalize tangent
      const tlen = Math.sqrt(tx*tx + ty*ty);
      if (tlen > 0) {
        tx /= tlen;
        ty /= tlen;
      }
      
      // Calculate normal
      const nx = -ty;
      const ny = tx;
      
      // Calculate width at this position (tapered)
      let width = topWidth * (1 - t * (1 - taper));
      
      // Apply bulges
      for (const bulge of drip.bulges) {
        // Check if bulge is near this position
        const bulgeT = bulge.position;
        const bulgeWidth = topWidth * bulge.size;
        const distFromBulge = Math.abs(t - bulgeT);
        
        if (distFromBulge < 0.1) {
          // Apply bulge with falloff
          const bulgeEffect = (0.1 - distFromBulge) * 10;
          const bulgePulse = 0.7 + Math.sin(bulge.phase * 3) * 0.3;
          width += bulgeWidth * bulgeEffect * bulgePulse;
        }
      }
      
      // Calculate point offset by half-width
      const px = x + nx * width/2;
      const py = y + ny * width/2;
      
      // Add point to path
      if (j === 1) {
        ctx.lineTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
      
      lastX = x;
      lastY = y;
    }
    
    // Draw bulbous bottom
    const bulbSize = topWidth * 0.4 * (2 - viscosityFactor);
    ctx.arc(endX, endY, bulbSize, 0, Math.PI, true);
    
    // Create path for left side (reverse order)
    for (let j = steps; j >= 1; j--) {
      const t = j / steps;
      
      // Calculate point on bezier curve
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      
      let x = mt3 * drip.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX;
      let y = mt3 * drip.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY;
      
      // Calculate normal vector for width
      let tx, ty;
      if (j > 1) {
        // Get previous point for tangent
        const prevT = (j - 1) / steps;
        const pmt = 1 - prevT;
        const pmt2 = pmt * pmt;
        const pmt3 = pmt2 * pmt;
        const pt2 = prevT * prevT;
        const pt3 = pt2 * prevT;
        
        const prevX = pmt3 * drip.x + 3 * pmt2 * prevT * cp1x + 3 * pmt * pt2 * cp2x + pt3 * endX;
        const prevY = pmt3 * drip.y + 3 * pmt2 * prevT * cp1y + 3 * pmt * pt2 * cp2y + pt3 * endY;
        
        // Calculate tangent
        tx = x - prevX;
        ty = y - prevY;
      } else {
        // Use next tangent for first point
        tx = lastX - x;
        ty = lastY - y;
      }
      
      // Normalize tangent
      const tlen = Math.sqrt(tx*tx + ty*ty);
      if (tlen > 0) {
        tx /= tlen;
        ty /= tlen;
      }
      
      // Calculate normal
      const nx = -ty;
      const ny = tx;
      
      // Calculate width at this position (tapered)
      let width = topWidth * (1 - t * (1 - taper));
      
      // Apply bulges
      for (const bulge of drip.bulges) {
        // Check if bulge is near this position
        const bulgeT = bulge.position;
        const bulgeWidth = topWidth * bulge.size;
        const distFromBulge = Math.abs(t - bulgeT);
        
        if (distFromBulge < 0.1) {
          // Apply bulge with falloff
          const bulgeEffect = (0.1 - distFromBulge) * 10;
          const bulgePulse = 0.7 + Math.sin(bulge.phase * 3) * 0.3;
          width += bulgeWidth * bulgeEffect * bulgePulse;
        }
      }
      
      // Calculate point offset by half-width (opposite side)
      const px = x - nx * width/2;
      const py = y - ny * width/2;
      
      // Add point to path
      ctx.lineTo(px, py);
      
      lastX = x;
      lastY = y;
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add glossy highlight to drip
    if (renderQuality !== 'low') {
      // Create highlight gradient
      const hlGradient = ctx.createLinearGradient(
        drip.x, drip.y,
        endX, endY
      );
      
      hlGradient.addColorStop(0, `rgba(255,255,255,${0.4 * drip.color.metallic})`);
      hlGradient.addColorStop(0.4, `rgba(255,255,255,${0.2 * drip.color.metallic})`);
      hlGradient.addColorStop(0.7, `rgba(255,255,255,${0.1 * drip.color.metallic})`);
      hlGradient.addColorStop(1, `rgba(255,255,255,0)`);
      
      // Draw highlight path
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = hlGradient;
      
      // Draw simplified highlight path
      ctx.beginPath();
      
      // Start at top left
      ctx.moveTo(drip.x - topWidth/3, drip.y);
      
      // Add curved highlight along drip
      ctx.bezierCurveTo(
        cp1x - topWidth/4, cp1y,
        cp2x - topWidth/6, cp2y,
        endX, endY - bulbSize/2
      );
      
      // Add small highlight to droplet at end
      ctx.arc(endX, endY, bulbSize/2, 0, Math.PI, true);
      
      // Complete the path back to start
      ctx.bezierCurveTo(
        cp2x + topWidth/6, cp2y,
        cp1x + topWidth/4, cp1y,
        drip.x + topWidth/3, drip.y
      );
      
      ctx.closePath();
      ctx.fill();
      
      // Add small highlight to droplet
      ctx.fillStyle = `rgba(255,255,255,${0.3 * drip.color.metallic})`;
      ctx.beginPath();
      ctx.arc(
        endX - bulbSize * 0.2,
        endY - bulbSize * 0.2,
        bulbSize * 0.3,
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
    ctx.restore();
    
    // Add ripple when drip reaches max length
    if (drip.age > drip.growTime && drip.currentLength >= drip.maxLength * 0.98 && Math.random() < 0.02 * deltaTime) {
      // Create a ripple at the end point
      addChocolateRipple(endX, endY, drip.width + Math.random() * 10);
    }
  }
  
  // Remove dead drips
  for (let i = deadDrips.length - 1; i >= 0; i--) {
    chocolateDrips.splice(deadDrips[i], 1);
  }
  
  // Possibly add new drips
  if (progress > 0.2 && progress < 0.8 && Math.random() < 0.03 * deltaTime && chocolateDrips.length < 15) {
    addChocolateDrip(canvas.width, canvas.height);
  }
}

// Draw heat/steam effect
function drawHeatEffect(ctx, width, height, progress) {
  ctx.save();
  
  // Steam/heat rises from center of chocolate
  const centerX = width / 2;
  const centerY = height * 0.4;
  
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
  
  // Draw rising steam particles
  if (renderQuality === 'high' || renderQuality === 'ultra') {
    const particleCount = renderQuality === 'ultra' ? 15 : 8;
    
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
  }
  
  ctx.restore();
}

// Debug information display
function drawDebugInfo(ctx, width, height, stats) {
  const padding = 10;
  const lineHeight = 18;
  
  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(padding, padding, 200, 6 * lineHeight + padding);
  
  ctx.font = '14px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  
  // Draw performance stats
  let y = padding * 2;
  ctx.fillText(`FPS: ${Math.round(stats.fps)}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Render Time: ${stats.renderTime.toFixed(1)}ms`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Flow Points: ${stats.flowPoints}`, padding * 2, y);
  y += lineHeight;
  
  ctx.fillText(`Drips: ${stats.drips}`, padding * 2, y);
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

// Helper functions
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getFlowPathLength(points) {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    length += distance(points[i], points[i+1]);
  }
  return length;
}

function isPointInPolygon(x, y, polygon) {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}