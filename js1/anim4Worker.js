// Global constants with enhanced configuration
const DEFAULT_DANCE_CYCLE = 1.2;
const DEFAULT_LIP_AMPLITUDE = 18;
const DEFAULT_ITERATIONS = 180;

// Enhanced physics parameters
const LARGE_PARTICLE_GRAVITY = 0.225;
const SMALL_PARTICLE_GRAVITY = 0.38;
const LARGE_DRAG_COEFFICIENT = 0.045;
const SMALL_DRAG_COEFFICIENT = 0.015;
const TERMINAL_VELOCITY = 4.5;
let  WIND_FACTOR = 0.08;
const TURBULENCE_FACTOR = 0.12;

// Animation state
let currentIteration = 0;
let particles = []; // Store particles globally in the worker
let windDirection = 0;
let turbulencePhase = 0;
let lastFrameTime = 0;
let deltaTime = 1;

// Enhanced vibrant Holi festival colors with better color theory
const COLORS = [
    {r: 255, g: 23, b: 68, a: 255, glow: 0.8},       // Red #FF1744
    {r: 255, g: 234, b: 0, a: 255, glow: 0.7},       // Yellow #FFEA00
    {r: 0, g: 230, b: 118, a: 255, glow: 0.6},       // Green #00E676
    {r: 41, g: 121, b: 255, a: 255, glow: 0.9},      // Blue #2979FF
    {r: 213, g: 0, b: 249, a: 255, glow: 0.85},      // Purple #D500F9
    {r: 255, g: 145, b: 0, a: 255, glow: 0.75},      // Orange #FF9100
    {r: 240, g: 98, b: 146, a: 255, glow: 0.65},     // Pink #F06292
    {r: 24, g: 255, b: 255, a: 255, glow: 0.95},     // Cyan #18FFFF
    {r: 255, g: 64, b: 129, a: 255, glow: 0.8},      // Magenta #FF4081
    {r: 192, g: 255, b: 62, a: 255, glow: 0.7},      // Lime #C0FF3E
];

// Enhanced particle configuration
const LARGE_PARTICLE_COUNT = 220;
const SMALL_PARTICLE_COUNT = 180;
const TINY_PARTICLE_COUNT = 300;
const GLOW_PARTICLE_COUNT = 50;

// Particle shape templates
const PARTICLE_SHAPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    TRIANGLE: 'triangle',
    STAR: 'star',
    HEART: 'heart',
    DIAMOND: 'diamond'
};

// Cache for particle rendering patterns (performance optimization)
const renderingCache = {};
let cacheHitCount = 0;
let cacheMissCount = 0;

// Performance optimization
const USE_CACHE = true;
const SPATIAL_PARTITIONING = true;
const spatialGrid = {};
const GRID_CELL_SIZE = 20;

// Enhanced perlin noise implementation for more natural movement
const PERLIN_GRID_SIZE = 256;
const perlinGrid = Array(PERLIN_GRID_SIZE * PERLIN_GRID_SIZE).fill(0).map(() => Math.random() * 2 * Math.PI);

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

// Enhanced worker message handling with better error management
self.onmessage = function(e) {
    const now = performance.now();
    if (lastFrameTime > 0) {
        deltaTime = Math.min(2, Math.max(0.1, (now - lastFrameTime) / 16.67)); // Cap delta time between 0.1 and 2
    }
    lastFrameTime = now;
    
    const { 
        imageData, 
        selectedRegions, 
        value: intensityValue = 1,
        value2: particleDensity = 1,
        value3: colorVariety = 1,
        value4: windStrength = 0.5,
        value5: iterations = DEFAULT_ITERATIONS,
        reset,
        timestamp
    } = e.data;

    try {
        if (reset) {
            currentIteration = 0;
            particles = [];
            windDirection = Math.random() * Math.PI * 2;
            turbulencePhase = 0;
            clearSpatialGrid();
        }

        // Update environmental factors
        updateEnvironmentalFactors(windStrength);

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            // Adjust particle counts based on density parameter
            const densityMultiplier = 0.5 + particleDensity;
            const effectiveColorVariety = Math.max(0.5, Math.min(1.5, colorVariety));
            
            resultImageData = applyColorBurstEffect(
                imageData, 
                selectedRegions, 
                intensityValue,
                densityMultiplier,
                effectiveColorVariety,
                windStrength
            );
            
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

        // Include performance metrics in debug mode
        const performanceStats = {
            particleCount: particles.length,
            cacheHitRatio: cacheHitCount / (cacheHitCount + cacheMissCount || 1),
            deltaTime
        };
console.log(resultImageData);
        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress,
            performanceStats
        }, [resultImageData.data.buffer]);
    } catch (error) {
        console.error("Error in worker:", error);
        self.postMessage({
            error: error.message,
            stack: error.stack,
            isComplete: true
        });
    }
};

function updateEnvironmentalFactors(windStrength) {
    // Gradually change wind direction for more natural effect
    windDirection += (Math.random() - 0.5) * 0.03 * deltaTime;
    
    // Update turbulence phase
    turbulencePhase += 0.01 * deltaTime;
    
    // Apply seasonal variations
    const seasonalEffect = Math.sin(currentIteration * 0.005);
    WIND_FACTOR = 0.08 * windStrength * (1 + 0.3 * seasonalEffect);
}

function clearSpatialGrid() {
    for (const key in spatialGrid) {
        delete spatialGrid[key];
    }
}

function applyColorBurstEffect(imageData, selectedRegions, intensityValue, densityMultiplier, colorVariety, windStrength) {
    // Create a copy of the original image data to work with
    const resultImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    // Canvas dimensions
    const width = imageData.width;
    const height = imageData.height;
    
    // Calculate multiple burst centers for a more dynamic effect
    const centers = calculateBurstCenters(selectedRegions, width, height);
    
    // Animation parameters with enhanced modulation
    const danceCycle = DEFAULT_DANCE_CYCLE * (1 + 0.2 * Math.sin(currentIteration * 0.025));
    const intensity = (DEFAULT_LIP_AMPLITUDE * (intensityValue || 1)) * (1 + 0.15 * Math.sin(currentIteration * 0.02));
    
    // Calculate the current animation progress with improved easing
    const progress = easeInOutCubic((Math.sin(currentIteration * 0.1 * danceCycle) + 1) / 2);
    
    // Manage particle lifecycle
    manageParticleLifecycle(width, height, centers, densityMultiplier, colorVariety);
    
    // Update spatial partitioning grid for collision detection optimization
    if (SPATIAL_PARTITIONING) {
        updateSpatialGrid();
    }
    
    // Update and draw all particles with improved rendering
    updateAndDrawAllParticles(resultImageData, width, height, windStrength);
    
    // Apply final post-processing effects (bloom, color grading)
    applyPostProcessingEffects(resultImageData, progress, intensity);
    
    return resultImageData;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function calculateBurstCenters(selectedRegions, width, height) {
    const centers = [];
    
    // Calculate the primary center (main burst point)
    let centerX = width / 2;
    let centerY = height / 2;
    
    // If we have selection regions, calculate centers based on them
    if (selectedRegions && selectedRegions.length > 0) {
        let totalPoints = 0;
        let sumX = 0;
        let sumY = 0;
        
        // Calculate weighted center of all selected regions
        for (const region of selectedRegions) {
            for (const point of region) {
                sumX += point.x;
                sumY += point.y;
                totalPoints++;
            }
        }
        
        if (totalPoints > 0) {
            centerX = sumX / totalPoints;
            centerY = sumY / totalPoints;
            
            // Add the main center
            centers.push({x: centerX, y: centerY, weight: 1.0});
            
            // Add additional burst centers for larger selections
            if (totalPoints > 100) {
                const pointsByRegion = selectedRegions.map(region => region.length);
                const largestRegionIndex = pointsByRegion.indexOf(Math.max(...pointsByRegion));
                
                if (largestRegionIndex >= 0) {
                    const largestRegion = selectedRegions[largestRegionIndex];
                    
                    // Add up to 3 additional centers for larger regions
                    const additionalCenters = Math.min(3, Math.floor(largestRegion.length / 200));
                    
                    for (let i = 0; i < additionalCenters; i++) {
                        const samplePoint = largestRegion[Math.floor(Math.random() * largestRegion.length)];
                        centers.push({
                            x: samplePoint.x,
                            y: samplePoint.y,
                            weight: 0.6 - (i * 0.15) // Diminishing weight for additional centers
                        });
                    }
                }
            }
        } else {
            centers.push({x: centerX, y: centerY, weight: 1.0});
        }
    } else {
        centers.push({x: centerX, y: centerY, weight: 1.0});
    }
    
    return centers;
}

function manageParticleLifecycle(width, height, centers, densityMultiplier, colorVariety) {
    // Calculate how many of each particle type to spawn this frame
    const shouldCreateNewParticles = particles.length === 0 || 
                                     currentIteration === 0 || 
                                     currentIteration % 5 === 0;
    
    // Emit new particles in bursts for a more dramatic effect
    if (shouldCreateNewParticles) {
        // Scale particle counts based on density multiplier
        const scaledLargeCount = Math.round(LARGE_PARTICLE_COUNT * densityMultiplier);
        const scaledSmallCount = Math.round(SMALL_PARTICLE_COUNT * densityMultiplier);
        const scaledTinyCount = Math.round(TINY_PARTICLE_COUNT * densityMultiplier);
        const scaledGlowCount = Math.round(GLOW_PARTICLE_COUNT * densityMultiplier);
        
        // Calculate how many particles to replenish
        const missingLargeCount = Math.max(0, scaledLargeCount - countParticlesByType('large'));
        const missingSmallCount = Math.max(0, scaledSmallCount - countParticlesByType('small'));
        const missingTinyCount = Math.max(0, scaledTinyCount - countParticlesByType('tiny'));
        const missingGlowCount = Math.max(0, scaledGlowCount - countParticlesByType('glow'));
        
        // Replenish particles with a natural distribution across centers
        if (missingLargeCount > 0 || missingSmallCount > 0 || missingTinyCount > 0 || missingGlowCount > 0) {
            for (const center of centers) {
                const weight = center.weight;
                
                // Distribute particles according to center weight
                const centerLargeCount = Math.round(missingLargeCount * weight);
                const centerSmallCount = Math.round(missingSmallCount * weight);
                const centerTinyCount = Math.round(missingTinyCount * weight);
                const centerGlowCount = Math.round(missingGlowCount * weight);
                
                // Initialize particles for this center
                if (centerLargeCount > 0 || centerSmallCount > 0 || centerTinyCount > 0 || centerGlowCount > 0) {
                    initializeParticles(
                        width, 
                        height, 
                        center.x, 
                        center.y, 
                        centerLargeCount,
                        centerSmallCount,
                        centerTinyCount,
                        centerGlowCount,
                        colorVariety
                    );
                }
            }
        }
    }
}

function countParticlesByType(type) {
    return particles.filter(p => p.type === type).length;
}

function updateSpatialGrid() {
    // Clear the existing grid
    for (const key in spatialGrid) {
        delete spatialGrid[key];
    }
    
    // Populate the grid with particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const gridX = Math.floor(p.x / GRID_CELL_SIZE);
        const gridY = Math.floor(p.y / GRID_CELL_SIZE);
        const cellKey = `${gridX},${gridY}`;
        
        if (!spatialGrid[cellKey]) {
            spatialGrid[cellKey] = [];
        }
        
        spatialGrid[cellKey].push(i);
    }
}

function getNeighboringParticles(particle, radius) {
    if (!SPATIAL_PARTITIONING) {
        // Fallback method without spatial partitioning
        return particles.filter(p => {
            const dx = p.x - particle.x;
            const dy = p.y - particle.y;
            return dx * dx + dy * dy <= radius * radius;
        });
    }
    
    const neighbors = [];
    const gridRadius = Math.ceil(radius / GRID_CELL_SIZE);
    const centerGridX = Math.floor(particle.x / GRID_CELL_SIZE);
    const centerGridY = Math.floor(particle.y / GRID_CELL_SIZE);
    
    // Check surrounding grid cells
    for (let gx = centerGridX - gridRadius; gx <= centerGridX + gridRadius; gx++) {
        for (let gy = centerGridY - gridRadius; gy <= centerGridY + gridRadius; gy++) {
            const cellKey = `${gx},${gy}`;
            
            if (spatialGrid[cellKey]) {
                for (const idx of spatialGrid[cellKey]) {
                    const p = particles[idx];
                    const dx = p.x - particle.x;
                    const dy = p.y - particle.y;
                    
                    if (dx * dx + dy * dy <= radius * radius) {
                        neighbors.push(p);
                    }
                }
            }
        }
    }
    
    return neighbors;
}

function samplePerlinNoise(x, y) {
    // Get integer coordinates
    const x0 = Math.floor(x) % PERLIN_GRID_SIZE;
    const y0 = Math.floor(y) % PERLIN_GRID_SIZE;
    // Get fractional part
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    // Get gradient directions
    const topLeft = perlinGrid[y0 * PERLIN_GRID_SIZE + x0];
    const topRight = perlinGrid[y0 * PERLIN_GRID_SIZE + ((x0 + 1) % PERLIN_GRID_SIZE)];
    const bottomLeft = perlinGrid[((y0 + 1) % PERLIN_GRID_SIZE) * PERLIN_GRID_SIZE + x0];
    const bottomRight = perlinGrid[((y0 + 1) % PERLIN_GRID_SIZE) * PERLIN_GRID_SIZE + ((x0 + 1) % PERLIN_GRID_SIZE)];
    
    // Dot products
    const dotTopLeft = Math.cos(topLeft) * xf + Math.sin(topLeft) * yf;
    const dotTopRight = Math.cos(topRight) * (xf - 1) + Math.sin(topRight) * yf;
    const dotBottomLeft = Math.cos(bottomLeft) * xf + Math.sin(bottomLeft) * (yf - 1);
    const dotBottomRight = Math.cos(bottomRight) * (xf - 1) + Math.sin(bottomRight) * (yf - 1);
    
    // Smoothing function
    const sx = smoothStep(xf);
    const sy = smoothStep(yf);
    
    // Interpolate
    const top = lerp(dotTopLeft, dotTopRight, sx);
    const bottom = lerp(dotBottomLeft, dotBottomRight, sx);
    const value = lerp(top, bottom, sy);
    
    // Map to -1 to 1 range
    return value;
}

function smoothStep(t) {
    // Improved smoothstep with better curve
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

function initializeParticles(width, height, centerX, centerY, largeCount, smallCount, tinyCount, glowCount, colorVariety) {
    // Apply color variety adjustment
    const availableColors = COLORS.slice(0, Math.max(3, Math.min(COLORS.length, Math.round(COLORS.length * colorVariety))));
    
    // Create large powder particles (confetti)
    for (let i = 0; i < largeCount; i++) {
        const shape = chooseParticleShape();
        const size = Math.random() * 6 + 3; // Size between 3-9 pixels
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 7 + 3; // Speed between 3-10
        const color = availableColors[Math.floor(Math.random() * availableColors.length)];
        const rotation = Math.random() * Math.PI * 2; // Initial rotation
        const rotationSpeed = (Math.random() - 0.5) * 0.2; // Rotation speed
        
        // Random starting position around center with controlled variation
        const startDistanceMax = 30 + Math.random() * 20;
        const startAngle = Math.random() * Math.PI * 2;
        const startX = centerX + Math.cos(startAngle) * startDistanceMax * Math.random();
        const startY = centerY + Math.sin(startAngle) * startDistanceMax * Math.random();
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color: {
                r: color.r,
                g: color.g,
                b: color.b,
                a: color.a || 255,
                glow: color.glow || 0.6
            },
            opacity: 0.9 + Math.random() * 0.1, // Between 0.9-1.0
            shape,
            rotation,
            rotationSpeed,
            gravity: LARGE_PARTICLE_GRAVITY * (0.8 + Math.random() * 0.4), // Variation in gravity
            drag: LARGE_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2), // Variation in drag
            type: 'large',
            // Enhanced texture properties
            noiseLevel: Math.random(),
            matteFactor: 0.75 + Math.random() * 0.25,
            // 3D effect through scale
            scaleY: 1,
            // Simulation properties
            age: 0,
            lifespan: 60 + Math.random() * 40, // 60-100 frames
            randomModifier: Math.random() * 100,
            // Dynamic properties
            turbulenceInfluence: 0.5 + Math.random() * 0.5,
            // Unique ID for tracking
            id: Math.random().toString(36).substr(2, 9),
            // Store creation time for age-based effects
            creationTime: currentIteration
        });
    }
    
    // Create small dust particles (sequins)
    for (let i = 0; i < smallCount; i++) {
        const size = Math.random() * 2.5 + 1; // Size between 1-3.5 pixels
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 8 + 4; // Speed between 4-12 (faster than large)
        const color = availableColors[Math.floor(Math.random() * availableColors.length)];
        
        // Random starting position around center with controlled variation
        const startDistanceMax = 25 + Math.random() * 15;
        const startAngle = Math.random() * Math.PI * 2;
        const startX = centerX + Math.cos(startAngle) * startDistanceMax * Math.random();
        const startY = centerY + Math.sin(startAngle) * startDistanceMax * Math.random();
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color: {
                r: color.r,
                g: color.g,
                b: color.b,
                a: color.a || 255,
                glow: color.glow || 0.6
            },
            opacity: 0.85 + Math.random() * 0.15, // Between 0.85-1.0
            shape: PARTICLE_SHAPES.CIRCLE, // Small particles are always circular
            gravity: SMALL_PARTICLE_GRAVITY * (0.9 + Math.random() * 0.2), // Slight variation
            drag: SMALL_DRAG_COEFFICIENT * (0.9 + Math.random() * 0.2), // Slight variation
            type: 'small',
            // Enhanced texture properties
            grainFactor: 0.85 + Math.random() * 0.15,
            shimmerFactor: Math.random() * 0.3,
            // Simulation properties
            age: 0,
            lifespan: 40 + Math.random() * 30, // 40-70 frames
            // Dynamic properties
            turbulenceInfluence: 0.7 + Math.random() * 0.3,
            // Store creation time for age-based effects
            creationTime: currentIteration
        });
    }
    
    // Create tiny dust particles (for volumetric effect)
    for (let i = 0; i < tinyCount; i++) {
        const size = Math.random() * 1 + 0.3; // Size between 0.3-1.3 pixels
        const angle = Math.random() * Math.PI * 2; // Random direction
        const speed = Math.random() * 5 + 2; // Speed between 2-7
        
        // Color with more muted/pastel variants
        const baseColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        // Create a more pastel version of the color
        const pastelFactor = 0.3 + Math.random() * 0.3;
        const color = {
            r: Math.min(255, baseColor.r + (255 - baseColor.r) * pastelFactor),
            g: Math.min(255, baseColor.g + (255 - baseColor.g) * pastelFactor),
            b: Math.min(255, baseColor.b + (255 - baseColor.b) * pastelFactor),
            a: baseColor.a || 255,
            glow: (baseColor.glow || 0.6) * 0.5
        };
        
        // Random starting position in a wider area
        const startDistanceMax = 40 + Math.random() * 30;
        const startAngle = Math.random() * Math.PI * 2;
        const startX = centerX + Math.cos(startAngle) * startDistanceMax * Math.random();
        const startY = centerY + Math.sin(startAngle) * startDistanceMax * Math.random();
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.3 + Math.random() * 0.3, // Lower opacity for atmospheric effect
            shape: PARTICLE_SHAPES.CIRCLE,
            gravity: SMALL_PARTICLE_GRAVITY * (0.5 + Math.random() * 0.2), // Lower gravity
            drag: SMALL_DRAG_COEFFICIENT * (1.2 + Math.random() * 0.3), // Higher drag
            type: 'tiny',
            // Simulation properties
            age: 0,
            lifespan: 20 + Math.random() * 40, // 20-60 frames
            // Dynamic properties
            turbulenceInfluence: 0.9 + Math.random() * 0.4,
            // Store creation time for age-based effects
            creationTime: currentIteration
        });
    }
    
    // Create glow particles (for light bloom effects)
    for (let i = 0; i < glowCount; i++) {
        const size = Math.random() * 12 + 8; // Larger size for glow effect
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1; // Slower movement
        
        // Choose brighter colors for glow
        const baseColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        // Enhance brightness for glow effect
        const color = {
            r: baseColor.r,
            g: baseColor.g,
            b: baseColor.b,
            a: baseColor.a || 255,
            glow: Math.min(1.5, (baseColor.glow || 0.6) * 2)
        };
        
        // Position closer to center
        const startDistanceMax = 20 + Math.random() * 15;
        const startAngle = Math.random() * Math.PI * 2;
        const startX = centerX + Math.cos(startAngle) * startDistanceMax * Math.random();
        const startY = centerY + Math.sin(startAngle) * startDistanceMax * Math.random();
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.15 + Math.random() * 0.15, // Very low opacity for subtle glow
            shape: PARTICLE_SHAPES.CIRCLE,
            gravity: LARGE_PARTICLE_GRAVITY * 0.3, // Minimal gravity
            drag: LARGE_DRAG_COEFFICIENT * 1.5, // High drag
            type: 'glow',
            // Simulation properties
            age: 0,
            lifespan: 30 + Math.random() * 20, // 30-50 frames
            pulseFactor: 0.1 + Math.random() * 0.2,
            pulseSpeed: 0.05 + Math.random() * 0.05,
            // Store creation time for age-based effects
            creationTime: currentIteration
        });
    }
}

function chooseParticleShape() {
    const shapes = Object.values(PARTICLE_SHAPES);
    const weights = [0.4, 0.2, 0.15, 0.1, 0.1, 0.05]; // Weighted probabilities
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (let i = 0; i < shapes.length; i++) {
        cumulativeWeight += weights[i];
        if (random <= cumulativeWeight) {
            return shapes[i];
        }
    }
    
    return PARTICLE_SHAPES.CIRCLE; // Default
}

function updateAndDrawAllParticles(imageData, width, height, windStrength) {
    // Sort particles for correct depth rendering (glow behind, large in front)
    const drawOrder = ['glow', 'tiny', 'small', 'large'];
    
    // First update all particles
    for (let i = 0; i < particles.length; i++) {
        updateParticle(particles[i], width, height, windStrength);
    }
    
    // Then draw in the correct order
    for (const type of drawOrder) {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.type === type && p.opacity > 0.01) {
                drawParticle(imageData, p);
            }
        }
    }
    
    // Clean up disappeared particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.x < -100 || p.x > width + 100 || p.y < -100 || p.y > height + 100 || p.opacity <= 0.01 || p.age >= p.lifespan) {
            particles.splice(i, 1);
        }
    }
}

function updateParticle(p, width, height, windStrength) {
    // Increment age
    p.age++;
    
    // Age-based opacity
    const lifeProgress = p.age / p.lifespan;
    const fadeInDuration = 0.1; // First 10% of life
    const fadeOutStart = 0.7; // Start fading out at 70% of life
    
    // Calculate opacity based on life stage
    if (lifeProgress < fadeInDuration) {
        // Fade in
        p.opacity = Math.min(p.opacity, (lifeProgress / fadeInDuration) * p.opacity);
    } else if (lifeProgress > fadeOutStart) {
        // Fade out
        const fadeOutProgress = (lifeProgress - fadeOutStart) / (1 - fadeOutStart);
        p.opacity *= (1 - fadeOutProgress * 0.1);
    }
    
    // Apply physics with enhanced realism
    // Base gravity
    p.vy += p.gravity * deltaTime;
    
    // Apply wind force
    const windX = Math.cos(windDirection) * WIND_FACTOR * windStrength * deltaTime;
    const windY = Math.sin(windDirection) * WIND_FACTOR * windStrength * 0.5 * deltaTime; // Less vertical wind
    
    // Apply turbulence - more realistic chaotic movement
    const noiseScale = 0.01;
    const turbulenceX = samplePerlinNoise(p.x * noiseScale, (p.y + turbulencePhase) * noiseScale) * 
                        TURBULENCE_FACTOR * p.turbulenceInfluence * deltaTime;
    const turbulenceY = samplePerlinNoise((p.x + 100) * noiseScale, (p.y + 100 + turbulencePhase) * noiseScale) * 
                        TURBULENCE_FACTOR * p.turbulenceInfluence * deltaTime;
    
    p.vx += windX + turbulenceX;
    p.vy += windY + turbulenceY;
    
    // Air resistance (drag) based on cross-sectional area
    const crossSectionFactor = p.type === 'large' ? p.size * 0.2 : p.size * 0.1;
    const dragForce = p.drag * deltaTime * crossSectionFactor;
    
    p.vx *= (1 - dragForce);
    p.vy *= (1 - dragForce);
    
    // Apply terminal velocity with consideration of shape
    const shapeTerminalModifier = p.shape === PARTICLE_SHAPES.CIRCLE ? 1 : 
                                  p.shape === PARTICLE_SHAPES.SQUARE ? 0.8 : 0.9;
    const effectiveTerminalVelocity = TERMINAL_VELOCITY * shapeTerminalModifier;
    
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > effectiveTerminalVelocity) {
        p.vx = (p.vx / speed) * effectiveTerminalVelocity;
        p.vy = (p.vy / speed) * effectiveTerminalVelocity;
    }
    
    // Update position
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Type-specific updates
    if (p.type === 'large') {
        // Update rotation (with air resistance affecting rotation)
        p.rotation += p.rotationSpeed * deltaTime * (1 - dragForce * 0.5);
        
        // Update 3D scale effect (simulating tumbling in air)
        p.scaleY = Math.max(0.1, Math.cos((p.y * 0.05 + p.randomModifier + currentIteration * 0.03) * 0.09) * p.matteFactor);
    } else if (p.type === 'small') {
        // Add shimmer effect to small particles
        p.opacity += Math.sin(currentIteration * 0.2 + p.creationTime * 0.1) * p.shimmerFactor * deltaTime;
        p.opacity = Math.max(0.01, Math.min(1, p.opacity));
    } else if (p.type === 'glow') {
        // Pulsating glow effect
        p.size = p.size * (1 + Math.sin(currentIteration * p.pulseSpeed) * p.pulseFactor);
    }
    
    // Simulate collisions between particles (only for larger particles)
    if (p.type === 'large' && SPATIAL_PARTITIONING && Math.random() < 0.1) {
        const neighbors = getNeighboringParticles(p, p.size * 2);
        
        for (const neighbor of neighbors) {
            if (neighbor !== p && neighbor.type === 'large') {
                const dx = neighbor.x - p.x;
                const dy = neighbor.y - p.y;
                const distSq = dx * dx + dy * dy;
                const minDist = p.size + neighbor.size;
                
                if (distSq < minDist * minDist) {
                    // Simple collision response
                    const dist = Math.sqrt(distSq);
                    const nx = dx / dist;
                    const ny = dy / dist;
                    
                    const relativeVelocityX = neighbor.vx - p.vx;
                    const relativeVelocityY = neighbor.vy - p.vy;
                    const dotProduct = nx * relativeVelocityX + ny * relativeVelocityY;
                    
                    // Only apply collision if particles are moving toward each other
                    if (dotProduct > 0) {
                        const restitution = 0.3; // Coefficient of restitution (bounciness)
                        const impulse = (1 + restitution) * dotProduct;
                        
                        // Apply impulse
                        p.vx += nx * impulse * 0.5;
                        p.vy += ny * impulse * 0.5;
                        neighbor.vx -= nx * impulse * 0.5;
                        neighbor.vy -= ny * impulse * 0.5;
                    }
                }
            }
        }
    }
}

function drawParticle(imageData, particle) {
    const { x, y, size, color, opacity, shape, rotation, type, scaleY } = particle;
    const width = imageData.width;
    const height = imageData.height;
    
    // Skip drawing if fully transparent
    if (opacity <= 0.01) return;
    
    // Use cache for better performance with common particle types
    if (USE_CACHE && (type === 'small' || type === 'tiny') && shape === PARTICLE_SHAPES.CIRCLE) {
        const cacheKey = `${type}_${shape}_${Math.round(size * 10)}_${Math.round(opacity * 100)}`;
        
        let renderPattern = renderingCache[cacheKey];
        
        if (!renderPattern) {
            // Cache miss - create the rendering pattern
            cacheMissCount++;
            renderPattern = precalculateRenderPattern(size, shape, opacity, rotation, type, scaleY);
            renderingCache[cacheKey] = renderPattern;
        } else {
            cacheHitCount++;
        }
        
        // Draw using the cached pattern
        drawWithPattern(imageData, x, y, renderPattern, color);
        return;
    }
    
    // Specialized handling for glow particles
    if (type === 'glow') {
        drawGlowParticle(imageData, particle);
        return;
    }
    
    // Adjusted size for scale effect (for large particles)
    const adjustedSizeX = size;
    const adjustedSizeY = type === 'large' ? size * scaleY : size;
    
    // Calculate drawing bounds with scale consideration
    const left = Math.max(0, Math.floor(x - adjustedSizeX * 1.2));
    const right = Math.min(width - 1, Math.floor(x + adjustedSizeX * 1.2));
    const top = Math.max(0, Math.floor(y - adjustedSizeY * 1.2));
    const bottom = Math.min(height - 1, Math.floor(y + adjustedSizeY * 1.2));
    
    // Draw the particle with enhanced rendering techniques
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center of particle
            const dx = px - x;
            const dy = py - y;
            
            let inside = false;
            let edgeFactor = 0;
            
            if (shape === PARTICLE_SHAPES.CIRCLE) {
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
            } else if (shape === PARTICLE_SHAPES.SQUARE) {
                // For square particles
                // Rotate the point around particle center
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Check if point is inside rotated rectangle with scaling
                const halfWidth = adjustedSizeX * 0.8;
                const halfHeight = adjustedSizeY * 1.2;
                
                inside = Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
                
                // Soft edge calculation for squares
                if (inside) {
                    const distFromEdgeX = halfWidth - Math.abs(rotatedX);
                    const distFromEdgeY = halfHeight - Math.abs(rotatedY);
                    const minDist = Math.min(distFromEdgeX, distFromEdgeY);
                    edgeFactor = Math.min(1, minDist / (halfWidth * 0.2));
                    edgeFactor = Math.pow(edgeFactor, 1.3);
                }
            } else if (shape === PARTICLE_SHAPES.TRIANGLE) {
                // For triangle particles
                // Rotate the point around particle center
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Triangle properties
                const height = adjustedSizeY * 1.5;
                const base = adjustedSizeX * 1.8;
                
                // Check if point is inside triangle
                const halfBase = base / 2;
                if (rotatedY >= 0 && rotatedY <= height) {
                    const slopeWidth = halfBase * (1 - rotatedY / height);
                    inside = Math.abs(rotatedX) <= slopeWidth;
                    
                    if (inside) {
                        const distFromEdge = slopeWidth - Math.abs(rotatedX);
                        edgeFactor = Math.min(1, distFromEdge / (slopeWidth * 0.2));
                        edgeFactor = Math.pow(edgeFactor, 1.2);
                    }
                }
            } else if (shape === PARTICLE_SHAPES.STAR) {
                // For star particles
                // Rotate the point
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Convert to polar coordinates
                const radius = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
                let angle = Math.atan2(rotatedY, rotatedX);
                if (angle < 0) angle += 2 * Math.PI;
                
                // Star properties
                const points = 5;
                const innerRadius = adjustedSizeX * 0.4;
                const outerRadius = adjustedSizeX;
                
                // Calculate star radius at current angle
                const anglePerPoint = Math.PI / points;
                const normalizedAngle = angle % (2 * anglePerPoint);
                const starRadius = innerRadius + (outerRadius - innerRadius) * 
                                   Math.abs(Math.cos(normalizedAngle * points / 2));
                
                inside = radius <= starRadius;
                
                if (inside) {
                    edgeFactor = Math.min(1, (starRadius - radius) / (starRadius * 0.2));
                    edgeFactor = Math.pow(edgeFactor, 1.4);
                }
            } else if (shape === PARTICLE_SHAPES.HEART) {
                // For heart particles
                // Rotate the point
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Normalize coordinates
                const normalizedX = rotatedX / (adjustedSizeX * 1.2);
                const normalizedY = rotatedY / (adjustedSizeY * 1.2);
                
                // Heart equation: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
                const heartFunction = Math.pow(normalizedX * normalizedX + normalizedY * normalizedY - 1, 3) - 
                                      normalizedX * normalizedX * Math.pow(normalizedY, 3);
                
                inside = heartFunction <= 0;
                
                if (inside) {
                    // Calculate a distance-based edge factor (approximation)
                    const distFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
                    edgeFactor = Math.max(0, Math.min(1, 1 - distFromCenter));
                    edgeFactor = Math.pow(edgeFactor, 1.5);
                }
            } else if (shape === PARTICLE_SHAPES.DIAMOND) {
                // For diamond particles
                // Rotate the point
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Diamond is basically a rotated square
                const normalizedX = Math.abs(rotatedX) / adjustedSizeX;
                const normalizedY = Math.abs(rotatedY) / adjustedSizeY;
                
                inside = normalizedX + normalizedY <= 1.0;
                
                if (inside) {
                    const distFromEdge = 1.0 - (normalizedX + normalizedY);
                    edgeFactor = Math.min(1, distFromEdge * 5);
                    edgeFactor = Math.pow(edgeFactor, 1.2);
                }
            }
            
            // Apply soft edge and opacity
            if (inside && edgeFactor > 0) {
                const particleOpacity = opacity * edgeFactor;
                
                // Calculate pixel index
                const index = (py * width + px) * 4;
                
                // Get particle color
                const r = color.r;
                const g = color.g;
                const b = color.b;
                
                // Apply texture effects for realistic powder look
                let adjustedR = r;
                let adjustedG = g;
                let adjustedB = b;
                let adjustedOpacity = particleOpacity;
                
                if (type === 'large' && particle.noiseLevel > 0.6) {
                    // Texture variations for large particles
                    const noiseValue = (Math.sin(px * 0.8 + py * 0.8 + particle.randomModifier) + 1) / 2;
                    const textureIntensity = particle.noiseLevel * 0.2;
                    
                    adjustedR = Math.min(255, Math.max(0, r * (1 + (noiseValue - 0.5) * textureIntensity)));
                    adjustedG = Math.min(255, Math.max(0, g * (1 + (noiseValue - 0.5) * textureIntensity)));
                    adjustedB = Math.min(255, Math.max(0, b * (1 + (noiseValue - 0.5) * textureIntensity)));
                    
                    // Add subtle color shift at edges
                    if (edgeFactor < 0.3) {
                        const colorShift = (1 - edgeFactor * 3) * 0.1;
                        adjustedR = Math.min(255, adjustedR * (1 - colorShift) + (r > 128 ? 255 : 0) * colorShift);
                        adjustedG = Math.min(255, adjustedG * (1 - colorShift) + (g > 128 ? 255 : 0) * colorShift);
                        adjustedB = Math.min(255, adjustedB * (1 - colorShift) + (b > 128 ? 255 : 0) * colorShift);
                    }
                } else if (type === 'small') {
                    // Add shimmer to small particles
                    const shimmerFactor = particle.shimmerFactor || 0;
                    const shimmerValue = Math.sin(currentIteration * 0.1 + px * 0.1 + py * 0.1) * shimmerFactor;
                    
                    adjustedR = Math.min(255, r * (1 + shimmerValue));
                    adjustedG = Math.min(255, g * (1 + shimmerValue));
                    adjustedB = Math.min(255, b * (1 + shimmerValue));
                }
                
                // Enhanced blending with existing image
                imageData.data[index] = Math.round(
                    (adjustedR * adjustedOpacity + imageData.data[index] * (1 - adjustedOpacity))
                );
                imageData.data[index + 1] = Math.round(
                    (adjustedG * adjustedOpacity + imageData.data[index + 1] * (1 - adjustedOpacity))
                );
                imageData.data[index + 2] = Math.round(
                    (adjustedB * adjustedOpacity + imageData.data[index + 2] * (1 - adjustedOpacity))
                );
                
                // Alpha channel handling for better compositing
                imageData.data[index + 3] = Math.min(255, 
                    imageData.data[index + 3] + (adjustedOpacity * 255 * (1 - imageData.data[index + 3]/255))
                );
                
                // Add texture detail to larger particles (powder grains effect)
                if (type === 'large' && particle.noiseLevel > 0.6 && Math.random() < 0.2) {
                    addTextureDetail(imageData, px, py, width, r, g, b, adjustedOpacity);
                }
            }
        }
    }
}

function drawGlowParticle(imageData, particle) {
    const { x, y, size, color, opacity } = particle;
    const width = imageData.width;
    const height = imageData.height;
    
    // Calculate drawing bounds for the glow
    const glowRadius = size * 1.5; // Glow extends beyond particle size
    const left = Math.max(0, Math.floor(x - glowRadius));
    const right = Math.min(width - 1, Math.floor(x + glowRadius));
    const top = Math.max(0, Math.floor(y - glowRadius));
    const bottom = Math.min(height - 1, Math.floor(y + glowRadius));
    
    const glowStrength = color.glow || 0.6;
    
    // Draw the glow
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center
            const dx = px - x;
            const dy = py - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= glowRadius) {
                // Calculate glow falloff (quadratic falloff for better glow effect)
                const falloff = 1 - Math.pow(distance / glowRadius, 2);
                const glowOpacity = opacity * falloff * glowStrength * 0.4; // Reduced strength for subtle effect
                
                if (glowOpacity > 0.01) {
                    // Calculate pixel index
                    const index = (py * width + px) * 4;
                    
                    // Add glow using screen blend mode for better light effect
                    const screenBlend = (background, foreground) => {
                        return 255 - ((255 - background) * (255 - foreground) / 255);
                    };
                    
                    // Apply screen blend with reduced intensity for natural glow
                    imageData.data[index] = screenBlend(
                        imageData.data[index], 
                        color.r * glowOpacity
                    );
                    imageData.data[index + 1] = screenBlend(
                        imageData.data[index + 1], 
                        color.g * glowOpacity
                    );
                    imageData.data[index + 2] = screenBlend(
                        imageData.data[index + 2], 
                        color.b * glowOpacity
                    );
                }
            }
        }
    }
}

function precalculateRenderPattern(size, shape, opacity, rotation, type, scaleY) {
    // Create a pattern of pixels to render for this particle
    const pattern = [];
    const padding = 2; // Extra padding for antialiasing
    const patternSize = Math.ceil(size * 2) + padding * 2;
    
    const centerX = patternSize / 2;
    const centerY = patternSize / 2;
    
    for (let py = 0; py < patternSize; py++) {
        for (let px = 0; px < patternSize; px++) {
            // Calculate distance from center of pattern
            const dx = px - centerX;
            const dy = py - centerY;
            
            if (shape === PARTICLE_SHAPES.CIRCLE) {
                // For circular particles
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Scale the y-distance for 3D effect
                const scaledDistance = Math.sqrt(dx * dx + (dy / (type === 'large' ? scaleY : 1)) * (dy / (type === 'large' ? scaleY : 1)));
                
                if (scaledDistance <= size) {
                    const edgeFactor = Math.min(1, (size - scaledDistance) / size);
                    const finalEdgeFactor = Math.pow(edgeFactor, 1.5); // More natural falloff
                    
                    if (finalEdgeFactor > 0) {
                        pattern.push({
                            offsetX: px - centerX,
                            offsetY: py - centerY,
                            alpha: opacity * finalEdgeFactor
                        });
                    }
                }
            }
        }
    }
    
    return pattern;
}

function drawWithPattern(imageData, x, y, pattern, color) {
    const width = imageData.width;
    const height = imageData.height;
    
    for (const pixel of pattern) {
        const px = Math.floor(x + pixel.offsetX);
        const py = Math.floor(y + pixel.offsetY);
        
        // Check if the pixel is within bounds
        if (px >= 0 && px < width && py >= 0 && py < height) {
            const index = (py * width + px) * 4;
            const alpha = pixel.alpha;
            
            // Enhanced blending
            imageData.data[index] = Math.round(
                (color.r * alpha + imageData.data[index] * (1 - alpha))
            );
            imageData.data[index + 1] = Math.round(
                (color.g * alpha + imageData.data[index + 1] * (1 - alpha))
            );
            imageData.data[index + 2] = Math.round(
                (color.b * alpha + imageData.data[index + 2] * (1 - alpha))
            );
            
            // Alpha channel handling
            imageData.data[index + 3] = Math.min(255, 
                imageData.data[index + 3] + (alpha * 255 * (1 - imageData.data[index + 3]/255))
            );
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
        
        // Make the dot slightly lighter or darker with improved variation
        const adjustment = Math.random() < 0.5 ? 40 : -25;
        const adjustmentOpacity = opacity * 0.8;
        
        // Apply adjustment with color balance preservation
        const rAdjustment = adjustment * (r / 255);
        const gAdjustment = adjustment * (g / 255);
        const bAdjustment = adjustment * (b / 255);
        
        imageData.data[dotIndex] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex] + rAdjustment * adjustmentOpacity)));
        imageData.data[dotIndex + 1] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex + 1] + gAdjustment * adjustmentOpacity)));
        imageData.data[dotIndex + 2] = Math.min(255, Math.max(0, 
            (imageData.data[dotIndex + 2] + bAdjustment * adjustmentOpacity)));
    }
}

function applyPostProcessingEffects(imageData, progress, intensity) {
    // Skip post-processing for performance reasons most of the time
    if (Math.random() > 0.1) return;
    
    // Subtle bloom effect focused on bright areas
    applyBloomEffect(imageData, 0.15, 3);
}

function applyBloomEffect(imageData, strength, radius) {
    // Simplified bloom effect that targets only the brightest pixels
    const width = imageData.width;
    const height = imageData.height;
    const threshold = 220; // Only bloom pixels brighter than this
    
    // Process every 4th pixel for better performance
    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
            const centerIndex = (y * width + x) * 4;
            
            // Check if this pixel is bright enough for bloom
            const brightness = (imageData.data[centerIndex] + imageData.data[centerIndex + 1] + imageData.data[centerIndex + 2]) / 3;
            
            if (brightness > threshold) {
                // This pixel is bright, add bloom around it
                const bloomRadius = radius;
                const bloomStrength = strength * ((brightness - threshold) / (255 - threshold));
                
                // Apply bloom to surrounding pixels
                for (let by = Math.max(0, y - bloomRadius); by <= Math.min(height - 1, y + bloomRadius); by++) {
                    for (let bx = Math.max(0, x - bloomRadius); bx <= Math.min(width - 1, x + bloomRadius); bx++) {
                        // Skip the center pixel
                        if (bx === x && by === y) continue;
                        
                        const distance = Math.sqrt((bx - x) * (bx - x) + (by - y) * (by - y));
                        if (distance <= bloomRadius) {
                            // Calculate falloff based on distance
                            const falloff = (bloomRadius - distance) / bloomRadius;
                            const bloomAmount = bloomStrength * falloff * falloff;
                            
                            const bloomIndex = (by * width + bx) * 4;
                            
                            // Add bloom using screen blend
                            imageData.data[bloomIndex] = Math.min(255, imageData.data[bloomIndex] + 
                                imageData.data[centerIndex] * bloomAmount);
                            imageData.data[bloomIndex + 1] = Math.min(255, imageData.data[bloomIndex + 1] + 
                                imageData.data[centerIndex + 1] * bloomAmount);
                            imageData.data[bloomIndex + 2] = Math.min(255, imageData.data[bloomIndex + 2] + 
                                imageData.data[centerIndex + 2] * bloomAmount);
                        }
                    }
                }
            }
        }
    }
}