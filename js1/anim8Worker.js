// Global constants
const DEFAULT_DANCE_CYCLE = 1;
const DEFAULT_LIP_AMPLITUDE = 15;
const DEFAULT_ITERATIONS = 120;

// Physics parameters - optimized for performance
const LARGE_PARTICLE_GRAVITY = 0.25;
const SMALL_PARTICLE_GRAVITY = 0.25;
const LARGE_DRAG_COEFFICIENT = 0.25;
const SMALL_DRAG_COEFFICIENT = 0.22;
const TERMINAL_VELOCITY = 3;

// Animation state
let currentIteration = 0;
let particles = []; // Store particles globally in the worker
let particleBuffers = []; // Pre-rendered particle images for performance
let lastFrameTime = 0; // For delta time calculations
let simulationRate = 1; // Adjustable simulation rate

// Animation properties from the second file
let dragConfetti = 0.05;
let dragSequins = 0.02;
let gravityConfetti = 0.25;
let gravitySequins = 0.45;
let terminalVelocity = 3;

// Vibrant Holi festival colors - moved to global scope
const COLORS = [
    {r: 255, g: 23, b: 68, a: 255},   // Red #FF1744
    {r: 255, g: 234, b: 0, a: 255},   // Yellow #FFEA00
    {r: 0, g: 230, b: 118, a: 255},   // Green #00E676
    {r: 41, g: 121, b: 255, a: 255},  // Blue #2979FF
    {r: 213, g: 0, b: 249, a: 255},   // Purple #D500F9
    {r: 255, g: 145, b: 0, a: 255},   // Orange #FF9100
    {r: 240, g: 98, b: 146, a: 255},  // Pink #F06292
    {r: 24, g: 255, b: 255, a: 255}   // Cyan #18FFFF
];

// Optimized particle counts based on device performance
let LARGE_PARTICLE_COUNT = 150;
let SMALL_PARTICLE_COUNT = 80;
let isHighPerformanceDevice = true; // Will be determined dynamically

// Performance monitoring
let frameTimeHistory = [];
const PERFORMANCE_SAMPLE_SIZE = 10;
let lastPerformanceAdjustment = 0;

// Helper function to get random range (from second file)
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

// Create a particle buffer (pre-rendered particle)
function createParticleBuffer(size, color, isCircular) {
    const bufferSize = Math.ceil(size * 2) + 2;
    const buffer = createTransparentImageData(bufferSize, bufferSize);
    const centerX = bufferSize / 2;
    const centerY = bufferSize / 2;
    
    for (let y = 0; y < bufferSize; y++) {
        for (let x = 0; x < bufferSize; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            
            let opacity = 0;
            
            if (isCircular) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= size) {
                    opacity = Math.pow(1 - (distance / size), 1.5);
                }
            } else {
                // For rectangular particles
                if (Math.abs(dx) <= size * 0.8 && Math.abs(dy) <= size * 1.2) {
                    const distFromEdgeX = (size * 0.8) - Math.abs(dx);
                    const distFromEdgeY = (size * 1.2) - Math.abs(dy);
                    const minDist = Math.min(distFromEdgeX, distFromEdgeY);
                    opacity = Math.pow(Math.min(1, minDist / (size * 0.2)), 1.3);
                }
            }
            
            if (opacity > 0) {
                const index = (y * bufferSize + x) * 4;
                buffer.data[index] = color.r;
                buffer.data[index + 1] = color.g;
                buffer.data[index + 2] = color.b;
                buffer.data[index + 3] = Math.round(opacity * 255);
            }
        }
    }
    
    return {
        data: buffer,
        size: bufferSize,
        centerX,
        centerY
    };
}

// Initialize based on device performance
function detectDevicePerformance() {
    // We'll start with a higher particle count and adjust down if needed
    if (isHighPerformanceDevice) {
        LARGE_PARTICLE_COUNT = 180;
        SMALL_PARTICLE_COUNT = 100;
    } else {
        LARGE_PARTICLE_COUNT = 100;
        SMALL_PARTICLE_COUNT = 60;
    }
}

// Confetto particle object (from second file)
function Confetto(position, velocity, rotation, scale, color, opacity) {
    this.position = position;
    this.velocity = velocity;
    this.rotation = rotation || 0;
    this.scale = scale || { x: 1, y: 1 };
    this.color = color;
    this.opacity = opacity || 1;
    this.matteFactor = randomRange(0.8, 1);
    this.randomModifier = Math.random() * 100;
}

// Sequin particle object (from second file)
function Sequin(position, velocity, color, opacity) {
    this.position = position;
    this.velocity = velocity;
    this.color = color;
    this.opacity = opacity || 1;
    this.grainFactor = randomRange(0.9, 1.1);
}

// Update method for Confetto - animate larger particles (from second file)
Confetto.prototype.update = function() {
    // Apply forces with randomness for natural dispersion
    this.velocity.x -= this.velocity.x * dragConfetti;
    this.velocity.y = Math.min(this.velocity.y + gravityConfetti, terminalVelocity);
    
    // Add unpredictable movement
    if (Math.random() > 0.9) {
        this.velocity.x += (Math.random() > 0.5 ? 0.3 : -0.3) * randomRange(0.5, 1.5);
    }
    
    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Adjust scale for 3D effect
    this.scale.y = Math.max(0.1, Math.cos((this.position.y + this.randomModifier) * 0.09) * this.matteFactor);
    
    // Decrease opacity for fade effect
    this.opacity = Math.max(0, this.opacity - 0.006 * randomRange(0.95, 1.05));
    
    // Air resistance
    if (Math.abs(this.velocity.x) > 0.1) {
        this.velocity.x *= 0.99;
    }
};

// Update method for Sequin - animate tiny particles (from second file)
Sequin.prototype.update = function() {
    // Apply forces with randomness
    this.velocity.x -= this.velocity.x * dragSequins;
    this.velocity.y = this.velocity.y + gravitySequins;
    
    // Random movement
    if (Math.random() > 0.9) {
        this.velocity.x += (Math.random() > 0.5 ? 0.2 : -0.2);
    }
    
    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Fade effect
    this.opacity = Math.max(0, this.opacity - 0.01 * this.grainFactor);
};

self.onmessage = function(e) {
    const { 
        imageData, 
        selectedRegions, 
        value,
        value5: iterations = DEFAULT_ITERATIONS,
        reset,
        deviceInfo
    } = e.data;

    try {
        // Get current time for delta calculations
        const currentTime = performance.now();
        const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 16.67 : 1; // Normalize to ~60fps
        lastFrameTime = currentTime;
        
        // Adjust performance if this is first run
        if (!lastPerformanceAdjustment) {
            if (deviceInfo?.isLowPower) {
                isHighPerformanceDevice = false;
            }
            detectDevicePerformance();
            lastPerformanceAdjustment = currentTime;
        }
        
        // Track frame times for dynamic performance adjustment
        frameTimeHistory.push(deltaTime);
        if (frameTimeHistory.length > PERFORMANCE_SAMPLE_SIZE) {
            frameTimeHistory.shift();
            
            // Check if we need to adjust performance (not too frequently)
            if (currentTime - lastPerformanceAdjustment > 2000) { // Every 2 seconds
                const avgFrameTime = frameTimeHistory.reduce((a, b) => a + b) / PERFORMANCE_SAMPLE_SIZE;
                
                // If running slow, reduce particles
                if (avgFrameTime > 1.5) {
                    LARGE_PARTICLE_COUNT = Math.max(80, LARGE_PARTICLE_COUNT * 0.8);
                    SMALL_PARTICLE_COUNT = Math.max(40, SMALL_PARTICLE_COUNT * 0.8);
                    simulationRate = Math.max(0.7, simulationRate * 0.9);
                } 
                // If running very fast, increase particles
                else if (avgFrameTime < 0.7 && isHighPerformanceDevice) {
                    LARGE_PARTICLE_COUNT = Math.min(250, LARGE_PARTICLE_COUNT * 1.1);
                    SMALL_PARTICLE_COUNT = Math.min(150, SMALL_PARTICLE_COUNT * 1.1);
                    simulationRate = Math.min(1.2, simulationRate * 1.05);
                }
                
                lastPerformanceAdjustment = currentTime;
            }
        }

        if (reset) {
            currentIteration = 0;
            particles = []; // Reset particles on reset
            particleBuffers = []; // Reset particle buffers
            frameTimeHistory = []; // Reset performance tracking
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyColorBurstEffect(imageData, selectedRegions, value, deltaTime * simulationRate);
            currentIteration = (currentIteration + 1) % iterations;
            progress = currentIteration / iterations;
        } else {
            resultImageData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
            progress = 1;
        }

        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress,
            performance: {
                particleCount: particles.length,
                simulationRate
            }
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
            error: error.message,
            isComplete: true
        });
    }
};

function applyColorBurstEffect(imageData, selectedRegions, intensityValue, deltaTime) {
    // Create a copy of the original image data to work with
    const resultImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    // Canvas dimensions
    const width = imageData.width;
    const height = imageData.height;
    
    // Center point (origin of the burst)
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Animation parameters
    const danceCycle = DEFAULT_DANCE_CYCLE || 1;
    const intensity = (DEFAULT_LIP_AMPLITUDE || 15) * (intensityValue || 1);
    
    // Calculate the current animation progress based on iteration
    const progress = (Math.sin(currentIteration * 0.1 * danceCycle) + 1) / 2;
    
    // Create particles if we're at the start of the animation or we need to replenish
    if (particles.length === 0 || currentIteration === 0 || particles.length < LARGE_PARTICLE_COUNT/2) {
        // Initialize or replenish particles
        initializeParticles(width, height, centerX, centerY);
    }
    
    // Update and draw all particles - pass deltaTime for frame-rate independent physics
    updateAndDrawAllParticles(resultImageData, width, height, deltaTime);
    
    return resultImageData;
}

function initializeParticles(width, height, centerX, centerY) {
    // Create large powder particles (confetti)
    for (let i = 0; i < LARGE_PARTICLE_COUNT; i++) {
        const isCircular = Math.random() < 0.7; // 70% chance of being circular
        const size = Math.random() * 5 + 3; // Size between 3-8 pixels
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 5 + 2; // Speed between 2-7
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        const color = COLORS[colorIndex];
        const rotation = Math.random() * Math.PI * 2; // Initial rotation
        const rotationSpeed = (Math.random() - 0.5) * 0.1; // Rotation speed
        
        // Random starting position around center with slight variation
        const startX = centerX + (Math.random() - 0.5) * 40;
        const startY = centerY + (Math.random() - 0.5) * 40;
        
        // Create a buffer for this particle (pre-rendered)
        const particleBuffer = createParticleBuffer(size, color, isCircular);
        const bufferIndex = particleBuffers.length;
        particleBuffers.push(particleBuffer);
        
        // Create particle using both approaches
        const position = { x: startX, y: startY };
        const velocity = { 
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        const scale = { x: 1, y: 1 };
        
        // Create confetto object (from second file)
        const confetto = new Confetto(
            position,
            velocity,
            rotation,
            scale,
            color,
            0.8 + Math.random() * 0.2
        );
        
        // Add buffer reference and other properties
        confetto.size = size;
        confetto.isCircular = isCircular;
        confetto.rotationSpeed = rotationSpeed;
        confetto.gravity = LARGE_PARTICLE_GRAVITY * (0.8 + Math.random() * 0.4);
        confetto.drag = LARGE_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2);
        confetto.type = 'large';
        confetto.bufferIndex = bufferIndex;
        particles.push(confetto);
    }
    
    // Create small dust particles (sequins)
    for (let i = 0; i < SMALL_PARTICLE_COUNT; i++) {
        const size = Math.random() * 2 + 0.5; // Size between 0.5-2.5 pixels
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 6 + 3; // Speed between 3-9 (faster than large)
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        const color = COLORS[colorIndex];
        
        // Random starting position around center with slight variation
        const startX = centerX + (Math.random() - 0.5) * 30;
        const startY = centerY + (Math.random() - 0.5) * 30;
        
        // Create a buffer for this particle (pre-rendered)
        const particleBuffer = createParticleBuffer(size, color, true); // Small particles are always circular
        const bufferIndex = particleBuffers.length;
        particleBuffers.push(particleBuffer);
        
        // Create sequin using the new approach
        const position = { x: startX, y: startY };
        const velocity = { 
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        
        const sequin = new Sequin(
            position,
            velocity,
            color,
            0.7 + Math.random() * 0.3
        );
        
        // Add additional properties needed by the renderer
        sequin.size = size;
        sequin.isCircular = true;
        sequin.gravity = SMALL_PARTICLE_GRAVITY * (0.9 + Math.random() * 0.2);
        sequin.drag = SMALL_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2);
        sequin.type = 'small';
        sequin.bufferIndex = bufferIndex;
        
        particles.push(sequin);
    }
}

function updateAndDrawAllParticles(imageData, width, height, deltaTime) {
    // Sort particles by y-coordinate for better depth effect
    particles.sort((a, b) => a.y - b.y);
    
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Update physics using the object's update method based on type
        if (p.type === 'large') {
            // Use Confetto update method
            p.update();
        } else {
            // Use Sequin update method
            p.update();
        }
        
        // Skip drawing if particle is invisible
        if (p.opacity <= 0.05) continue;
        
        // Draw the particle using pre-rendered buffer
        drawParticleFromBuffer(imageData, p);
        
        // Remove particles that are out of bounds or completely faded
        if (p.position.x < -50 || p.position.x > width + 50 || 
            p.position.y < -50 || p.position.y > height + 50 || 
            p.opacity <= 0.05) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function drawParticleFromBuffer(imageData, particle) {
    const { position, opacity, bufferIndex, rotation, type, scale } = particle;
    const width = imageData.width;
    const height = imageData.height;
    
    // Get the pre-rendered particle buffer
    const buffer = particleBuffers[bufferIndex];
    if (!buffer) return; // Safety check
    
    const bufferData = buffer.data;
    const bufferSize = buffer.size;
    const centerX = buffer.centerX;
    const centerY = buffer.centerY;
    
    // Calculate drawing bounds
    const scaleFactorY = type === 'large' ? scale.y : 1;
    const left = Math.max(0, Math.floor(position.x - centerX));
    const right = Math.min(width - 1, Math.floor(position.x + (bufferSize - centerX - 1)));
    const top = Math.max(0, Math.floor(position.y - centerY * scaleFactorY));
    const bottom = Math.min(height - 1, Math.floor(position.y + (bufferSize - centerY - 1) * scaleFactorY));
    
    // Fast drawing path for most particles (no rotation)
    if (rotation === 0 || type === 'small') {
        for (let py = top; py <= bottom; py++) {
            // Calculate y position in buffer
            const bufferY = Math.floor(((py - position.y) / scaleFactorY) + centerY);
            if (bufferY < 0 || bufferY >= bufferSize) continue;
            
            for (let px = left; px <= right; px++) {
                // Calculate x position in buffer
                const bufferX = px - Math.floor(position.x - centerX);
                if (bufferX < 0 || bufferX >= bufferSize) continue;
                
                // Get buffer pixel
                const bufferIndex = (bufferY * bufferSize + bufferX) * 4;
                const alpha = bufferData.data[bufferIndex + 3] / 255 * opacity;
                
                if (alpha < 0.01) continue; // Skip nearly transparent pixels
                
                // Calculate target pixel
                const targetIndex = (py * width + px) * 4;
                
                // Apply fast blending
                const src_r = bufferData.data[bufferIndex];
                const src_g = bufferData.data[bufferIndex + 1];
                const src_b = bufferData.data[bufferIndex + 2];
                
                const dst_r = imageData.data[targetIndex];
                const dst_g = imageData.data[targetIndex + 1];
                const dst_b = imageData.data[targetIndex + 2];
                const dst_a = imageData.data[targetIndex + 3];
                
                // Fast alpha blending
                imageData.data[targetIndex] = Math.round(src_r * alpha + dst_r * (1 - alpha));
                imageData.data[targetIndex + 1] = Math.round(src_g * alpha + dst_g * (1 - alpha));
                imageData.data[targetIndex + 2] = Math.round(src_b * alpha + dst_b * (1 - alpha));
                imageData.data[targetIndex + 3] = Math.min(255, dst_a + (255 - dst_a) * alpha);
            }
        }
    }
    // Slower path for rotated particles
    else {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        for (let py = top; py <= bottom; py++) {
            for (let px = left; px <= right; px++) {
                // Calculate rotated position in buffer
                const dx = px - position.x;
                const dy = (py - position.y) / scaleFactorY;
                
                const rotatedX = dx * cos - dy * sin + centerX;
                const rotatedY = dx * sin + dy * cos + centerY;
                
                // Check if the rotated point is within buffer bounds
                if (rotatedX < 0 || rotatedX >= bufferSize || rotatedY < 0 || rotatedY >= bufferSize) continue;
                
                // Get buffer pixel (using bilinear interpolation for smoother rotation)
                const rx0 = Math.floor(rotatedX);
                const ry0 = Math.floor(rotatedY);
                const rx1 = Math.min(rx0 + 1, bufferSize - 1);
                const ry1 = Math.min(ry0 + 1, bufferSize - 1);
                
                const wx = rotatedX - rx0;
                const wy = rotatedY - ry0;
                
                // Get the four neighboring pixels
                const idx00 = (ry0 * bufferSize + rx0) * 4;
                const idx01 = (ry0 * bufferSize + rx1) * 4;
                const idx10 = (ry1 * bufferSize + rx0) * 4;
                const idx11 = (ry1 * bufferSize + rx1) * 4;
                
                // Interpolate alpha
                const a00 = bufferData.data[idx00 + 3];
                const a01 = bufferData.data[idx01 + 3];
                const a10 = bufferData.data[idx10 + 3];
                const a11 = bufferData.data[idx11 + 3];
                
                const alpha = ((a00 * (1 - wx) + a01 * wx) * (1 - wy) + 
                              (a10 * (1 - wx) + a11 * wx) * wy) / 255 * opacity;
                
                if (alpha < 0.01) continue; // Skip nearly transparent pixels
                
                // Interpolate RGB
                const r = (bufferData.data[idx00] * (1 - wx) + bufferData.data[idx01] * wx) * (1 - wy) + 
                          (bufferData.data[idx10] * (1 - wx) + bufferData.data[idx11] * wx) * wy;
                
                const g = (bufferData.data[idx00 + 1] * (1 - wx) + bufferData.data[idx01 + 1] * wx) * (1 - wy) + 
                          (bufferData.data[idx10 + 1] * (1 - wx) + bufferData.data[idx11 + 1] * wx) * wy;
                
                const b = (bufferData.data[idx00 + 2] * (1 - wx) + bufferData.data[idx01 + 2] * wx) * (1 - wy) + 
                          (bufferData.data[idx10 + 2] * (1 - wx) + bufferData.data[idx11 + 2] * wx) * wy;
                
                // Calculate target pixel
                const targetIndex = (py * width + px) * 4;
                
                // Apply blending
                imageData.data[targetIndex] = Math.round(r * alpha + imageData.data[targetIndex] * (1 - alpha));
                imageData.data[targetIndex + 1] = Math.round(g * alpha + imageData.data[targetIndex + 1] * (1 - alpha));
                imageData.data[targetIndex + 2] = Math.round(b * alpha + imageData.data[targetIndex + 2] * (1 - alpha));
                imageData.data[targetIndex + 3] = Math.min(255, imageData.data[targetIndex + 3] + (255 - imageData.data[targetIndex + 3]) * alpha);
            }
        }
    }
}

// Add CSS animation keyframes
const cssAnimations = `
/* Powder loader animation */
@keyframes powder {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  50% { transform: translate(var(--x), var(--y)) scale(0.5); opacity: 0.7; }
  100% { transform: translate(0, 0) scale(1); opacity: 1; }
}
/* Loading animation */
@keyframes loading {
  0%   { cy: 10; }
  25%  { cy: 3; }
  50%  { cy: 10; }
}
/* Button gradient animation */
@keyframes buttonPulse {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;