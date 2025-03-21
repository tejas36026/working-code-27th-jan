// Global constants
const DEFAULT_DANCE_CYCLE = 1;
const DEFAULT_LIP_AMPLITUDE = 15;
const DEFAULT_ITERATIONS = 120;

// Physics parameters
const LARGE_PARTICLE_GRAVITY = 0.25;
const SMALL_PARTICLE_GRAVITY = 0.45;
const LARGE_DRAG_COEFFICIENT = 0.05;
const SMALL_DRAG_COEFFICIENT = 0.02;
const TERMINAL_VELOCITY = 3;

// Animation state
let currentIteration = 0;
let particles = []; // Store particles globally in the worker
let animationPhase = 0; // 0 = initial 3 particles, 1 = explosion

// Vibrant Holi festival colors
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

// Particle counts
const LARGE_PARTICLE_COUNT = 300; // Increased for more dramatic explosion
const SMALL_PARTICLE_COUNT = 500; // Increased for more dramatic explosion
const FRAME_RATE = 30; // Frames per second
const PHASE_ONE_DURATION = 3 * FRAME_RATE; // 3 seconds with 3 particles

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

self.onmessage = function(e) {
    const { 
        imageData, 
        selectedRegions, 
        value,
        value5: iterations = DEFAULT_ITERATIONS,
        reset 
    } = e.data;

    try {
        if (reset) {
            currentIteration = 0;
            particles = []; // Reset particles on reset
            animationPhase = 0; // Reset to initial phase
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyColorBurstEffect(imageData, selectedRegions, value);
            currentIteration = (currentIteration + 1);

            if (currentIteration >= iterations) {
                currentIteration = 0;
                animationPhase = 0; // Reset to initial phase
                particles = []; // Reset particles
            }

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
            progress
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
            error: error.message,
            isComplete: true
        });
    }
};

function applyColorBurstEffect(imageData, selectedRegions, intensityValue) {
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
    
    // Check if we need to change animation phase
    if (currentIteration === PHASE_ONE_DURATION) {
        animationPhase = 1; // Switch to explosion phase
        particles = []; // Clear existing particles
    }
    
    // Create particles based on the animation phase
    if (particles.length === 0) {
        if (animationPhase === 0) {
            // Phase 1: Create only 3 revolving particles
            initializeThreeRevolvingParticles(centerX, centerY);
        } else {
            // Phase 2: Create explosion particles
            initializeExplosionParticles(width, height, centerX, centerY);
        }
    }
    
    // Update and draw all particles
    updateAndDrawAllParticles(resultImageData, width, height);
    
    return resultImageData;
}

function initializeThreeRevolvingParticles(centerX, centerY) {
    // Create 3 particles that revolve around each other
    const colors = [
        COLORS[0], // Red
        COLORS[2], // Green
        COLORS[3]  // Blue
    ];
    
    const radius = 30; // Distance from center
    const angularSpacing = Math.PI * 2 / 3; // 120 degrees apart
    
    for (let i = 0; i < 3; i++) {
        const angle = i * angularSpacing;
        const size = 15; // Larger size for visibility
        
        particles.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0, // Will be controlled by update function
            vy: 0,
            size,
            color: colors[i],
            opacity: 1.0,
            isCircular: true,
            rotation: 0,
            rotationSpeed: 0.1,
            gravity: 0, // No gravity for revolving particles
            drag: 0,    // No drag for revolving particles
            type: 'revolving',
            orbitRadius: radius,
            orbitAngle: angle,
            orbitSpeed: 0.05, // Speed of rotation
            index: i
        });
    }
}

function initializeExplosionParticles(width, height, centerX, centerY) {
    // Create large powder particles (confetti)
    for (let i = 0; i < LARGE_PARTICLE_COUNT; i++) {
        const isCircular = Math.random() < 0.7; // 70% chance of being circular
        const size = Math.random() * 7 + 5; // Size between 5-12 pixels (bigger for more impact)
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 15 + 10; // Higher speed for explosion
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const rotation = Math.random() * Math.PI * 2; // Initial rotation
        const rotationSpeed = (Math.random() - 0.5) * 0.2; // Faster rotation
        
        // All particles start from center for explosion effect
        const startX = centerX;
        const startY = centerY;
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.9 + Math.random() * 0.1, // Higher opacity for vibrancy
            isCircular,
            rotation,
            rotationSpeed,
            gravity: LARGE_PARTICLE_GRAVITY * (0.8 + Math.random() * 0.4), 
            drag: LARGE_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2),
            type: 'large',
            noiseLevel: Math.random(),
            matteFactor: 0.8 + Math.random() * 0.2,
            scaleY: 1,
            randomModifier: Math.random() * 100,
            // Travel much farther for whole screen coverage
            lifespan: 500 + Math.random() * 300
        });
    }
    
    // Create small dust particles (sequins)
    for (let i = 0; i < SMALL_PARTICLE_COUNT; i++) {
        const size = Math.random() * 3 + 1; // Slightly larger small particles
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 20 + 15; // Much faster for explosion
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.8 + Math.random() * 0.2,
            isCircular: true,
            gravity: SMALL_PARTICLE_GRAVITY * (0.9 + Math.random() * 0.2),
            drag: SMALL_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2),
            type: 'small',
            grainFactor: 0.85 + Math.random() * 0.15,
            // Travel farther for whole screen coverage
            lifespan: 400 + Math.random() * 200
        });
    }
}

function updateAndDrawAllParticles(imageData, width, height) {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Special update for revolving particles in phase 1
        if (animationPhase === 0 && p.type === 'revolving') {
            updateRevolvingParticle(p, width, height);
        } else {
            // Standard physics for explosion particles
            // Apply gravity
            p.vy += p.gravity;
            
            // Air resistance (drag)
            p.vx *= (1 - p.drag);
            p.vy *= (1 - p.drag);
            
            // Apply terminal velocity
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > TERMINAL_VELOCITY) {
                p.vx = (p.vx / speed) * TERMINAL_VELOCITY;
                p.vy = (p.vy / speed) * TERMINAL_VELOCITY;
            }
            
            // Add random movement for naturalistic powder effect
            if (Math.random() > 0.9) {
                p.vx += (Math.random() - 0.5) * 0.5;
                p.vy += (Math.random() - 0.5) * 0.5;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Update rotation for large particles (confetti effect)
            if (p.type === 'large') {
                p.rotation += p.rotationSpeed;
                
                // Update 3D scale effect (simulating tumbling in air)
                p.scaleY = Math.max(0.1, Math.cos((p.y + p.randomModifier) * 0.09) * p.matteFactor);
            }
            
            // Fade particles out over time, slower for explosion phase
            p.opacity -= animationPhase === 1 ? 
                (p.type === 'large' ? 0.003 : 0.005) : 
                (p.type === 'large' ? 0.006 : 0.01);
            
            // Decrease lifespan in explosion phase
            if (animationPhase === 1 && p.lifespan) {
                p.lifespan--;
            }
        }
        
        // Skip drawing if particle is invisible
        if (p.opacity <= 0.05) continue;
        
        // Draw the particle
        drawParticle(imageData, p);
        
        // Remove particles that are out of bounds, completely faded, or expired lifespan
        if (p.x < -50 || p.x > width + 50 || 
            p.y < -50 || p.y > height + 50 || 
            p.opacity <= 0.05 ||
            (animationPhase === 1 && p.lifespan <= 0)) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function updateRevolvingParticle(particle, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Update orbit angle
    particle.orbitAngle += particle.orbitSpeed;
    
    // Calculate new position based on orbit
    particle.x = centerX + Math.cos(particle.orbitAngle) * particle.orbitRadius;
    particle.y = centerY + Math.sin(particle.orbitAngle) * particle.orbitRadius;
    
    // Add subtle pulsing size effect
    const pulseFactor = Math.sin(currentIteration * 0.1) * 2;
    particle.size = 15 + pulseFactor;
    
    // Add orbit wobble effect
    particle.orbitRadius += Math.sin(currentIteration * 0.2) * 0.5;
    
    // Ensure radius stays within bounds
    particle.orbitRadius = Math.max(25, Math.min(35, particle.orbitRadius));
    
    // Rotate the particle
    particle.rotation += particle.rotationSpeed;
    
    // Make particles pulse in opacity slightly
    particle.opacity = 0.9 + Math.sin(currentIteration * 0.15 + particle.index) * 0.1;
}

function drawParticle(imageData, particle) {
    const { x, y, size, color, opacity, isCircular, rotation, type, scaleY } = particle;
    const width = imageData.width;
    const height = imageData.height;
    
    // Adjusted size for scale effect (for large particles)
    const adjustedSizeX = size;
    const adjustedSizeY = type === 'large' ? size * scaleY : size;
    
    // Calculate drawing bounds with scale consideration
    const left = Math.max(0, Math.floor(x - adjustedSizeX));
    const right = Math.min(width - 1, Math.floor(x + adjustedSizeX));
    const top = Math.max(0, Math.floor(y - adjustedSizeY));
    const bottom = Math.min(height - 1, Math.floor(y + adjustedSizeY));
    
    // Enhanced particle rendering for revolving particles
    if (type === 'revolving') {
        // Create a glow effect for revolving particles
        const glowRadius = size * 1.5;
        const glowLeft = Math.max(0, Math.floor(x - glowRadius));
        const glowRight = Math.min(width - 1, Math.floor(x + glowRadius));
        const glowTop = Math.max(0, Math.floor(y - glowRadius));
        const glowBottom = Math.min(height - 1, Math.floor(y + glowRadius));
        
        // Draw glow
        for (let py = glowTop; py <= glowBottom; py++) {
            for (let px = glowLeft; px <= glowRight; px++) {
                const dx = px - x;
                const dy = py - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= glowRadius) {
                    const glowIntensity = Math.pow(1 - distance / glowRadius, 2) * 0.5;
                    
                    const index = (py * width + px) * 4;
                    
                    // Apply glow with particle color
                    imageData.data[index] = Math.round(
                        (color.r * glowIntensity + imageData.data[index] * (1 - glowIntensity))
                    );
                    imageData.data[index + 1] = Math.round(
                        (color.g * glowIntensity + imageData.data[index + 1] * (1 - glowIntensity))
                    );
                    imageData.data[index + 2] = Math.round(
                        (color.b * glowIntensity + imageData.data[index + 2] * (1 - glowIntensity))
                    );
                }
            }
        }
    }
    
    // Draw the particle with enhanced rendering techniques
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center of particle
            const dx = px - x;
            const dy = py - y;
            
            let inside = false;
            let edgeFactor = 0;
            
            if (isCircular) {
                // For circular particles
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Scale the y-distance for 3D effect
                const scaledDistance = Math.sqrt(dx * dx + (dy / (type === 'large' ? scaleY : 1)) * (dy / (type === 'large' ? scaleY : 1)));
                
                inside = scaledDistance <= adjustedSizeX;
                
                // Soft edge calculation
                if (inside) {
                    edgeFactor = Math.min(1, (adjustedSizeX - scaledDistance) / adjustedSizeX);
                    edgeFactor = Math.pow(edgeFactor, 1.5); // More natural falloff
                }
            } else {
                // For irregular polygonal particles (simplified as rotated rectangles)
                // Rotate the point around particle center
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Check if point is inside rotated rectangle with scaling
                const halfWidth = adjustedSizeX * 0.8;
                const halfHeight = adjustedSizeY * 1.2;
                
                inside = Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
                
                // Soft edge calculation for polygons
                if (inside) {
                    const distFromEdgeX = halfWidth - Math.abs(rotatedX);
                    const distFromEdgeY = halfHeight - Math.abs(rotatedY);
                    const minDist = Math.min(distFromEdgeX, distFromEdgeY);
                    edgeFactor = Math.min(1, minDist / (halfWidth * 0.2));
                    edgeFactor = Math.pow(edgeFactor, 1.3); // More natural falloff
                }
            }
            
            // Apply soft edge and opacity
            if (inside && edgeFactor > 0) {
                // Enhanced opacity for revolving particles
                const particleOpacity = type === 'revolving' ? 
                    opacity * edgeFactor * 1.5 : // Brighter for revolving particles
                    opacity * edgeFactor;
                
                // Calculate pixel index
                const index = (py * width + px) * 4;
                
                // Get particle color
                const r = color.r;
                const g = color.g;
                const b = color.b;
                
                // Enhanced blending with existing image
                imageData.data[index] = Math.round(
                    (r * particleOpacity + imageData.data[index] * (1 - particleOpacity))
                );
                imageData.data[index + 1] = Math.round(
                    (g * particleOpacity + imageData.data[index + 1] * (1 - particleOpacity))
                );
                imageData.data[index + 2] = Math.round(
                    (b * particleOpacity + imageData.data[index + 2] * (1 - particleOpacity))
                );
                
                // Alpha channel handling for better compositing
                imageData.data[index + 3] = Math.min(255, 
                    imageData.data[index + 3] + (particleOpacity * 255 * (1 - imageData.data[index + 3]/255))
                );
                
                // Add texture detail to larger particles (powder grains effect)
                if (type === 'large' && particle.noiseLevel > 0.6 && Math.random() < 0.3) {
                    addTextureDetail(imageData, px, py, width, r, g, b, particleOpacity);
                }
                
                // Add sparkle effect for revolving particles
                if (type === 'revolving' && Math.random() < 0.05) {
                    addSparkleEffect(imageData, px, py, width, r, g, b);
                }
            }
        }
    }
}

function addTextureDetail(imageData, x, y, width, r, g, b, opacity) {
    // Add a small texture detail (grain) to the particle
    const dotSize = Math.random() * 0.8;
    const dotX = x + (Math.random() - 0.5);
    const dotY = y + (Math.random() - 0.5);
    
    // Ensure dot is within image bounds
    if (dotX >= 0 && dotX < width && dotY >= 0 && dotY < imageData.height) {
        const dotIndex = (Math.floor(dotY) * width + Math.floor(dotX)) * 4;
        
        // Make the dot slightly lighter or darker
        const adjustment = Math.random() < 0.5 ? 30 : -30;
        const adjustmentOpacity = opacity * 0.7;
        
        imageData.data[dotIndex] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex] + adjustment * adjustmentOpacity)));
        imageData.data[dotIndex + 1] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex + 1] + adjustment * adjustmentOpacity)));
        imageData.data[dotIndex + 2] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex + 2] + adjustment * adjustmentOpacity)));
    }
}

function addSparkleEffect(imageData, x, y, width, r, g, b) {
    // Add a sparkle effect (small bright point)
    const sparkleSize = 1;
    
    // Ensure pixel is within image bounds
    if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
        const index = (y * width + x) * 4;
        
        // Make the sparkle much brighter
        imageData.data[index] = Math.min(255, r + 150);
        imageData.data[index + 1] = Math.min(255, g + 150);
        imageData.data[index + 2] = Math.min(255, b + 150);
        imageData.data[index + 3] = 255;
    }
}