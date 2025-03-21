// Global configuration
const CONFIG = {
    // Explosion settings
    EXPLOSION: {
        DELAY: 90,                   // Frames to wait before explosion
        PARTICLE_COUNT: 400,         // Number of particles in explosion
        FORCE: 14,                   // Force of the explosion
        CHAIN_REACTION: true,        // Whether smaller explosions trigger after the main one
        SECONDARY_EXPLOSIONS: 3,     // Number of secondary explosions
        SECONDARY_DELAY: 30,         // Frames between secondary explosions
        SHOCKWAVE_ENABLED: true,     // Visual shockwave effect
        SOUND_ENABLED: true          // Simulate sound effect (visual only)
    },
    
    // Confetti settings
    CONFETTI: {
        ENABLED: true,
        COUNT: 250,                  // Total confetti particles
        SHAPES: ['circle', 'square', 'triangle', 'strip'], // Available shapes
        GRAVITY: 0.18,               // How fast confetti falls
        DRIFT: 2,                    // Horizontal drift
        FLUTTER_SPEED: 0.12          // How much confetti flutters
    },
    
    // Fireworks settings
    FIREWORKS: {
        ENABLED: true,
        COUNT: 5,                    // Number of fireworks
        TRAIL_LENGTH: 8,             // Length of the rising trail
        PARTICLE_COUNT: 120,         // Particles per explosion
        TYPES: ['standard', 'sparkle', 'willow', 'chrysanthemum', 'ring'],
        COLORS: ['random', 'rainbow', 'gold', 'blue', 'red']
    },
    
    // Particle physics
    PHYSICS: {
        LARGE_GRAVITY: 0.2,
        SMALL_GRAVITY: 0.4,
        LARGE_DRAG: 0.04,
        SMALL_DRAG: 0.015,
        TERMINAL_VELOCITY: 4,
        BOUNCE_FACTOR: 0.4,          // How much particles bounce
        WIND_STRENGTH: 0.08,         // Random wind effect
        TURBULENCE: 0.02             // Random movement factor
    },
    
    // Visual effects
    EFFECTS: {
        GLOW: true,                  // Add glow effect to particles
        GLOW_STRENGTH: 0.6,          // Intensity of glow
        BLUR: true,                  // Motion blur for fast particles
        BLUR_STRENGTH: 0.4,          // Intensity of motion blur
        SPARKLE: true,               // Random sparkle effect
        SPARKLE_CHANCE: 0.15,        // Chance of sparkle per particle per frame
        SMOKE_TRAIL: true,           // Smoke trails for some particles
        SMOKE_DENSITY: 0.6           // Density of smoke trails
    },
    
    // Animation
    ANIMATION: {
        CYCLE: 1.2,                  // Base animation cycle speed
        LIP_AMPLITUDE: 18,           // Amplitude of animations
        ITERATIONS: 160              // Total animation iterations
    }
};

// Vibrant color palette with enhanced diversity
const COLORS = [
    // Primary vibrant colors
    {r: 255, g: 23, b: 68, a: 255},   // Red #FF1744
    {r: 255, g: 234, b: 0, a: 255},   // Yellow #FFEA00
    {r: 0, g: 230, b: 118, a: 255},   // Green #00E676
    {r: 41, g: 121, b: 255, a: 255},  // Blue #2979FF
    {r: 213, g: 0, b: 249, a: 255},   // Purple #D500F9
    {r: 255, g: 145, b: 0, a: 255},   // Orange #FF9100
    
    // Pastels
    {r: 240, g: 98, b: 146, a: 255},  // Pink #F06292
    {r: 24, g: 255, b: 255, a: 255},  // Cyan #18FFFF
    {r: 171, g: 71, b: 188, a: 255},  // Light Purple #AB47BC
    {r: 129, g: 212, b: 250, a: 255}, // Light Blue #81D4FA
    {r: 174, g: 213, b: 129, a: 255}, // Light Green #AED581
    
    // Metallic colors
    {r: 255, g: 215, b: 0, a: 255},   // Gold #FFD700
    {r: 192, g: 192, b: 192, a: 255}, // Silver #C0C0C0
    {r: 255, g: 185, b: 15, a: 255},  // Amber #FFB90F
    
    // Neon colors
    {r: 255, g: 43, b: 158, a: 255},  // Neon Pink #FF2B9E
    {r: 0, g: 255, b: 140, a: 255},   // Neon Green #00FF8C
    {r: 60, g: 236, b: 255, a: 255},  // Neon Blue #3CECFF
];

// Animation state variables
let currentIteration = 0;
let explosionTriggered = false;
let explosionTimer = 0;
let secondaryExplosionTimer = 0;
let secondaryExplosionsLeft = 0;
let particles = []; // Store all particles
let fireworks = []; // Store firework launchers
let shockwaves = []; // Store shockwave effects
let smokeTrails = []; // Store smoke trail particles
let windDirection = 0; // Current wind direction
let windStrength = 0; // Current wind strength
let windChangeCounter = 0; // Counter for wind changes

// Initialize the worker
self.onmessage = function(e) {
    const { 
        imageData, 
        selectedRegions, 
        value,
        value5: iterations = CONFIG.ANIMATION.ITERATIONS,
        reset 
    } = e.data;

    try {
        if (reset) {
            // Reset animation state
            currentIteration = 0;
            particles = [];
            fireworks = [];
            shockwaves = [];
            smokeTrails = [];
            explosionTriggered = false;
            explosionTimer = 0;
            secondaryExplosionTimer = 0;
            secondaryExplosionsLeft = 0;
            
            // Initialize random wind
            resetWind();
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyColorBurstEffect(imageData, selectedRegions, value);
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
            progress
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
            error: error.message,
            isComplete: true
        });
    }
};

// Reset wind parameters
function resetWind() {
    windDirection = Math.random() * Math.PI * 2;
    windStrength = Math.random() * CONFIG.PHYSICS.WIND_STRENGTH;
    windChangeCounter = Math.floor(Math.random() * 60) + 30; // Change wind every 30-90 frames
}

// Create a transparent image data object
function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

// Main effect function
function applyColorBurstEffect(imageData, selectedRegions, intensityValue) {
    // Create a copy of the original image data
    const resultImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );
    
    // Canvas dimensions
    const width = imageData.width;
    const height = imageData.height;
    
    // Center point (origin of effects)
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Animation parameters
    const danceCycle = CONFIG.ANIMATION.CYCLE;
    const intensity = CONFIG.ANIMATION.LIP_AMPLITUDE * (intensityValue || 1);
    
    // Calculate the current animation progress
    const progress = (Math.sin(currentIteration * 0.1 * danceCycle) + 1) / 2;
    
    // Update wind
    updateWind();
    
    // Initialize particles if needed
    if (particles.length === 0 || currentIteration === 0) {
        // Initial batch of confetti if enabled
        if (CONFIG.CONFETTI.ENABLED) {
            initializeConfetti(width, height, centerX, centerY);
        }
        
        // Initialize fireworks if enabled
        if (CONFIG.FIREWORKS.ENABLED) {
            initializeFireworks(width, height, centerX, centerY);
        }
        
        // Reset explosion state
        explosionTriggered = false;
        explosionTimer = 0;
        secondaryExplosionTimer = 0;
        secondaryExplosionsLeft = CONFIG.EXPLOSION.SECONDARY_EXPLOSIONS;
    }
    
    // Update and launch fireworks
    updateFireworks(width, height, centerX, centerY);
    
    // Check if it's time for the main explosion
    if (!explosionTriggered && explosionTimer >= CONFIG.EXPLOSION.DELAY) {
        triggerMainExplosion(width, height, centerX, centerY);
        explosionTriggered = true;
    }
    
    // Check if it's time for secondary explosions
    if (explosionTriggered && 
        CONFIG.EXPLOSION.CHAIN_REACTION && 
        secondaryExplosionsLeft > 0 && 
        secondaryExplosionTimer >= CONFIG.EXPLOSION.SECONDARY_DELAY) {
        
        // Trigger a smaller secondary explosion at a random position
        const offsetX = (Math.random() - 0.5) * width * 0.6;
        const offsetY = (Math.random() - 0.5) * height * 0.6;
        triggerSecondaryExplosion(width, height, centerX + offsetX, centerY + offsetY);
        
        secondaryExplosionsLeft--;
        secondaryExplosionTimer = 0;
    }
    
    // Increment timers
    if (!explosionTriggered) {
        explosionTimer++;
    } else if (secondaryExplosionsLeft > 0) {
        secondaryExplosionTimer++;
    }
    
    // Update and draw all particles
    updateAndDrawAllParticles(resultImageData, width, height);
    
    // Update and draw shockwaves
    if (CONFIG.EXPLOSION.SHOCKWAVE_ENABLED) {
        updateAndDrawShockwaves(resultImageData, width, height);
    }
    
    // Update and draw smoke trails
    if (CONFIG.EFFECTS.SMOKE_TRAIL) {
        updateAndDrawSmokeTrails(resultImageData, width, height);
    }
    
    return resultImageData;
}

// Update wind parameters
function updateWind() {
    windChangeCounter--;
    
    if (windChangeCounter <= 0) {
        // Smoothly change wind direction
        windDirection += (Math.random() - 0.5) * 0.2;
        
        // Adjust wind strength
        windStrength = Math.max(0, Math.min(
            CONFIG.PHYSICS.WIND_STRENGTH,
            windStrength + (Math.random() - 0.5) * 0.02
        ));
        
        // Set next change interval
        windChangeCounter = Math.floor(Math.random() * 60) + 30;
    }
}

// Initialize confetti particles
function initializeConfetti(width, height, centerX, centerY) {
    const confettiCount = CONFIG.CONFETTI.COUNT;
    const shapes = CONFIG.CONFETTI.SHAPES;
    
    for (let i = 0; i < confettiCount; i++) {
        // Randomly select shape
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        // Size based on shape
        let size;
        if (shape === 'strip') {
            size = Math.random() * 6 + 4; // Longer strips
        } else if (shape === 'circle') {
            size = Math.random() * 4 + 2;
        } else {
            size = Math.random() * 5 + 3;
        }
        
        // Direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 3;
        
        // Random vibrant color
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        
        // Initial rotation and flutter properties
        const rotation = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 0.12;
        const flutterPhase = Math.random() * Math.PI * 2;
        const flutterFrequency = 0.05 + Math.random() * 0.1;
        const flutterAmplitude = 0.3 + Math.random() * 0.7;
        
        // Random starting position with vertical offset (falling from top)
        const startOffset = Math.random() * 200;
        const startX = centerX + (Math.random() - 0.5) * width * 0.8;
        const startY = centerY - height * 0.5 - startOffset;
        
        particles.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed * 0.5,
            vy: Math.sin(angle) * speed * 0.5 + 2, // Initial downward velocity
            size,
            color,
            opacity: 0.9 + Math.random() * 0.1,
            shape,
            aspect: shape === 'strip' ? 0.15 + Math.random() * 0.15 : 0.8 + Math.random() * 0.4,
            rotation,
            rotationSpeed,
            gravity: CONFIG.PHYSICS.LARGE_GRAVITY * (0.8 + Math.random() * 0.4),
            drag: CONFIG.PHYSICS.LARGE_DRAG * (0.9 + Math.random() * 0.2),
            type: 'confetti',
            // Flutter properties
            flutterPhase,
            flutterFrequency,
            flutterAmplitude,
            // Visual properties
            noiseLevel: Math.random(),
            matteFactor: 0.7 + Math.random() * 0.3,
            scaleY: 1,
            randomModifier: Math.random() * 100,
            // Glow effect
            glow: CONFIG.EFFECTS.GLOW && Math.random() < 0.3,
            glowColor: { ...color },
            glowSize: size * (1.2 + Math.random() * 0.8),
            glowOpacity: 0.4 + Math.random() * 0.2,
            // Visual decay
            fadeRate: 0.003 + Math.random() * 0.002
        });
    }
}

// Initialize firework launchers
function initializeFireworks(width, height, centerX, centerY) {
    const fireworkCount = CONFIG.FIREWORKS.COUNT;
    
    for (let i = 0; i < fireworkCount; i++) {
        // Random launch position at bottom of screen
        const launchX = Math.random() * width;
        const launchY = height;
        
        // Target position (where firework will explode)
        const targetX = Math.random() * width;
        const targetY = Math.random() * height * 0.6; // Upper part of canvas
        
        // Launch delay
        const delay = Math.floor(Math.random() * 100) + i * 20;
        
        // Firework type and color
        const types = CONFIG.FIREWORKS.TYPES;
        const colors = CONFIG.FIREWORKS.COLORS;
        const type = types[Math.floor(Math.random() * types.length)];
        const colorScheme = colors[Math.floor(Math.random() * colors.length)];
        
        fireworks.push({
            x: launchX,
            y: launchY,
            targetX,
            targetY,
            velocity: 4 + Math.random() * 4,
            size: 2 + Math.random() * 2,
            color: getFireworkColor(colorScheme),
            trailLength: CONFIG.FIREWORKS.TRAIL_LENGTH,
            trail: [],
            active: false,
            delay,
            launched: false,
            exploded: false,
            type,
            colorScheme,
            particleCount: CONFIG.FIREWORKS.PARTICLE_COUNT + Math.floor(Math.random() * 40)
        });
    }
}

// Get firework color based on scheme
function getFireworkColor(scheme) {
    if (scheme === 'random') {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    } else if (scheme === 'rainbow') {
        // Will be handled differently during explosion
        return COLORS[0]; // Just a placeholder
    } else if (scheme === 'gold') {
        return {r: 255, g: 215, b: 0, a: 255}; // Gold
    } else if (scheme === 'blue') {
        return {r: 41, g: 121, b: 255, a: 255}; // Blue
    } else if (scheme === 'red') {
        return {r: 255, g: 23, b: 68, a: 255}; // Red
    }
    
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Update fireworks and launch new ones
function updateFireworks(width, height, centerX, centerY) {
    for (let i = 0; i < fireworks.length; i++) {
        const fw = fireworks[i];
        
        // Handle delay before launch
        if (!fw.launched) {
            fw.delay--;
            if (fw.delay <= 0) {
                fw.launched = true;
                fw.active = true;
            }
            continue;
        }
        
        if (!fw.active) continue;
        
        // Calculate direction to target
        const dx = fw.targetX - fw.x;
        const dy = fw.targetY - fw.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if firework reached explosion point
        if (distance < 10 || fw.y < fw.targetY) {
            // Explode the firework
            createFireworkExplosion(fw, width, height);
            fw.active = false;
            fw.exploded = true;
            continue;
        }
        
        // Move firework toward target
        const speed = fw.velocity;
        fw.x += (dx / distance) * speed;
        fw.y += (dy / distance) * speed;
        
        // Add current position to trail
        fw.trail.push({x: fw.x, y: fw.y});
        
        // Keep trail at specified length
        if (fw.trail.length > fw.trailLength) {
            fw.trail.shift();
        }
        
        // Add the firework itself as a particle to be drawn
        particles.push({
            x: fw.x,
            y: fw.y,
            vx: 0,
            vy: 0,
            size: fw.size,
            color: fw.color,
            opacity: 1,
            isCircular: true,
            type: 'firework',
            // Glow effect for firework
            glow: true,
            glowColor: { ...fw.color },
            glowSize: fw.size * 2,
            glowOpacity: 0.6,
            // Temporary particle (will be removed after drawing)
            temporary: true
        });
        
        // Add trail particles
        for (let j = 0; j < fw.trail.length; j++) {
            const trailPos = fw.trail[j];
            const opacity = j / fw.trail.length; // Fade out with age
            
            particles.push({
                x: trailPos.x,
                y: trailPos.y,
                vx: 0,
                vy: 0,
                size: fw.size * (0.5 + j/fw.trail.length * 0.5),
                color: fw.color,
                opacity: opacity * 0.7,
                isCircular: true,
                type: 'firework_trail',
                // No glow for trail
                temporary: true
            });
        }
    }
    
    // Filter out expired fireworks
    fireworks = fireworks.filter(fw => !fw.exploded || (fw.exploded && currentIteration % 200 === 0));
    
    // Add new fireworks occasionally
    if (currentIteration % 100 === 0 && fireworks.length < CONFIG.FIREWORKS.COUNT) {
        const launchX = Math.random() * width;
        const launchY = height;
        const targetX = Math.random() * width;
        const targetY = Math.random() * height * 0.6;
        
        const types = CONFIG.FIREWORKS.TYPES;
        const colors = CONFIG.FIREWORKS.COLORS;
        const type = types[Math.floor(Math.random() * types.length)];
        const colorScheme = colors[Math.floor(Math.random() * colors.length)];
        
        fireworks.push({
            x: launchX,
            y: launchY,
            targetX,
            targetY,
            velocity: 4 + Math.random() * 4,
            size: 2 + Math.random() * 2,
            color: getFireworkColor(colorScheme),
            trailLength: CONFIG.FIREWORKS.TRAIL_LENGTH,
            trail: [],
            active: false,
            delay: Math.floor(Math.random() * 50) + 10,
            launched: false,
            exploded: false,
            type,
            colorScheme,
            particleCount: CONFIG.FIREWORKS.PARTICLE_COUNT + Math.floor(Math.random() * 40)
        });
    }
}

// Create explosion effect for a firework
function createFireworkExplosion(firework, width, height) {
    const { x, y, type, colorScheme, particleCount } = firework;
    
    // Create explosion particles based on firework type
    if (type === 'standard') {
        createStandardFireworkExplosion(x, y, colorScheme, particleCount);
    } else if (type === 'sparkle') {
        createSparkleFireworkExplosion(x, y, colorScheme, particleCount);
    } else if (type === 'willow') {
        createWillowFireworkExplosion(x, y, colorScheme, particleCount);
    } else if (type === 'chrysanthemum') {
        createChrysanthemumFireworkExplosion(x, y, colorScheme, particleCount);
    } else if (type === 'ring') {
        createRingFireworkExplosion(x, y, colorScheme, particleCount);
    }
    
    // Add shockwave effect
    if (CONFIG.EXPLOSION.SHOCKWAVE_ENABLED) {
        shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius: 80 + Math.random() * 40,
            opacity: 0.8,
            expansionRate: 3 + Math.random(),
            color: firework.color
        });
    }
}

// Standard starburst firework explosion
function createStandardFireworkExplosion(x, y, colorScheme, particleCount) {
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        
        // Determine color based on scheme
        let color;
        if (colorScheme === 'rainbow') {
            // Assign colors based on angle for rainbow effect
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 1, 1);
        } else {
            color = getFireworkColor(colorScheme);
        }
        
        const particle = {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1 + Math.random() * 2,
            color,
            opacity: 0.9,
            isCircular: true,
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * 0.5,
            drag: CONFIG.PHYSICS.SMALL_DRAG,
            type: 'firework_particle',
            // Special properties
            decay: 0.01 + Math.random() * 0.02,
            // Glow effect
            glow: CONFIG.EFFECTS.GLOW,
            glowColor: { ...color },
            glowSize: (1 + Math.random() * 2) * 3,
            glowOpacity: 0.5,
            // Sparkle effect
            sparkle: CONFIG.EFFECTS.SPARKLE && Math.random() < 0.3,
            sparkleChance: CONFIG.EFFECTS.SPARKLE_CHANCE
        };
        
        particles.push(particle);
    }
}

// Sparkle firework with twinkling particles
function createSparkleFireworkExplosion(x, y, colorScheme, particleCount) {
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4; // Slower than standard
        
        // Determine color based on scheme
        let color;
        if (colorScheme === 'rainbow') {
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.7, 1); // Less saturated for sparkle
        } else {
            color = getFireworkColor(colorScheme);
            // Add white highlights for sparkly effect
            if (Math.random() < 0.3) {
                color = {r: 255, g: 255, b: 255, a: 255};
            }
        }
        
        const particle = {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 0.8 + Math.random() * 1.5, // Smaller particles
            color,
            opacity: 0.9,
            isCircular: true,
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * 0.3, // Lower gravity
            drag: CONFIG.PHYSICS.SMALL_DRAG,
            type: 'firework_sparkle',
            // Special properties
            decay: 0.005 + Math.random() * 0.01, // Slower decay
            lifetime: 30 + Math.random() * 50, // Longer lifetime
            // Twinkle effect
            twinkle: true,
            twinkleSpeed: 0.05 + Math.random() * 0.1,
            twinklePhase: Math.random() * Math.PI * 2,
            // Glow effect
            glow: true,
            glowColor: { ...color },
            glowSize: (0.8 + Math.random() * 1.5) * 4,
            glowOpacity: 0.7,
            // Always sparkle
            sparkle: true,
            sparkleChance: 0.4
        };
        
        particles.push(particle);
    }
}

// Willow firework with trailing particles
function createWillowFireworkExplosion(x, y, colorScheme, particleCount) {
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        
        // Determine color based on scheme
        let color;
        if (colorScheme === 'rainbow') {
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.8, 0.9);
        } else if (colorScheme === 'gold') {
            // Gold with slight variations
            const brightness = 0.85 + Math.random() * 0.15;
            color = {
                r: Math.floor(255 * brightness),
                g: Math.floor(215 * brightness),
                b: Math.floor((100 + Math.random() * 50) * brightness),
                a: 255
            };
        } else {
            color = getFireworkColor(colorScheme);
        }
        
        const particle = {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1, // Initial upward component
            size: 1.5 + Math.random() * 2,
            color,
            opacity: 0.9,
            isCircular: true,
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * 0.7,
            drag: CONFIG.PHYSICS.SMALL_DRAG * 0.8, // Less drag
            type: 'firework_willow',
            // Special properties
            decay: 0.008 + Math.random() * 0.004,
            trail: true, // Will leave a trail
            trailRate: 0.2 + Math.random() * 0.1, // How often to drop trail particles
            trailCounter: 0,
            // Glow effect
            glow: CONFIG.EFFECTS.GLOW,
            glowColor: { ...color },
            glowSize: (1.5 + Math.random() * 2) * 3,
            glowOpacity: 0.4,
            // Smoke trail
            smokeTrail: CONFIG.EFFECTS.SMOKE_TRAIL && Math.random() < 0.3
        };
        
        particles.push(particle);
    }
}

// Chrysanthemum firework with multiple rings
function createChrysanthemumFireworkExplosion(x, y, colorScheme, particleCount) {
    // Create multiple rings of particles
    const rings = 3 + Math.floor(Math.random() * 3);
    const particlesPerRing = Math.floor(particleCount / rings);
    
    for (let ring = 0; ring < rings; ring++) {
        const ringSpeed = 2 + ring * 1.5 + Math.random() * 2; // Outer rings faster
        
        for (let i = 0; i < particlesPerRing; i++) {
            const angle = (i / particlesPerRing) * Math.PI * 2;
            const speed = ringSpeed * (0.9 + Math.random() * 0.2); // Slight speed variation
            
            // Determine color based on scheme and ring
            let color;
            if (colorScheme === 'rainbow') {
                // Different color for each ring
                const hue = ((ring / rings) * 360 + (angle / (Math.PI * 2)) * 60) % 360;
                color = hsvToRgb(hue, 0.9, 1);
            } else {
                color = getFireworkColor(colorScheme);
            }
            
            const particle = {
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1.2 + Math.random() * 1.8,
                color,
                opacity: 0.9,
                isCircular: true,
                gravity: CONFIG.PHYSICS.SMALL_GRAVITY * (0.4 + ring * 0.1), // Outer rings fall faster
                drag: CONFIG.PHYSICS.SMALL_DRAG,
                type: 'firework_chrysanthemum',
                // Special properties
                decay: 0.007 + Math.random() * 0.006,
                ring, // Track which ring this particle belongs to
                // Trail properties
                trail: ring === rings - 1, // Only outer ring has trail
                trailRate: 0.3,
                trailCounter: 0,
                // Glow effect
                glow: CONFIG.EFFECTS.GLOW,
                glowColor: { ...color },
                glowSize: (1.2 + Math.random() * 1.8) * 3.5,
                glowOpacity: 0.5,
                // Sparkle occasionally
                sparkle: CONFIG.EFFECTS.SPARKLE && Math.random() < 0.2,
                sparkleChance: CONFIG.EFFECTS.SPARKLE_CHANCE * 0.7
            };
            
            particles.push(particle);
        }
    }
}

// Ring firework with circular pattern
function createRingFireworkExplosion(x, y, colorScheme, particleCount) {
    const ringThickness = 0.2 + Math.random() * 0.3; // How thick the ring is (0-1)
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        
        // Apply ring thickness variation
        const radiusVariation = 1 - ringThickness / 2 + Math.random() * ringThickness;
        const speed = (4 + Math.random() * 3) * radiusVariation;
        
        // Determine color based on scheme and position in ring
        let color;
        if (colorScheme === 'rainbow') {
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 1, 1);
        } else {
            color = getFireworkColor(colorScheme);
        }
        
        const particle = {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.3 + Math.random() * 1.7,
            color,
            opacity: 0.9,
            isCircular: true,
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * 0.4,
            drag: CONFIG.PHYSICS.SMALL_DRAG * 0.8,
            type: 'firework_ring',
            // Special properties
            decay: 0.01 + Math.random() * 0.01,
            // Glow effect
            glow: CONFIG.EFFECTS.GLOW,
            glowColor: { ...color },
            glowSize: (1.3 + Math.random() * 1.7) * 4,
            glowOpacity: 0.6,
            // Sparkle effect
            sparkle: CONFIG.EFFECTS.SPARKLE && Math.random() < 0.25,
            sparkleChance: CONFIG.EFFECTS.SPARKLE_CHANCE
        };
        
        particles.push(particle);
    }
}

// Trigger main explosion
function triggerMainExplosion(width, height, centerX, centerY) {
    // Create large explosion with many particles
    createExplosionWithVariants(centerX, centerY, CONFIG.EXPLOSION.FORCE, CONFIG.EXPLOSION.PARTICLE_COUNT);
    
    // Add shock wave
    if (CONFIG.EXPLOSION.SHOCKWAVE_ENABLED) {
        shockwaves.push({
            x: centerX,
            y: centerY,
            radius: 10,
            maxRadius: 200,
            opacity: 0.7,
            expansionRate: 5,
            color: {r: 255, g: 255, b: 255, a: 255}
        });
    }
}

// Trigger a secondary explosion
function triggerSecondaryExplosion(width, height, x, y) {
    // Create a smaller explosion
    const force = CONFIG.EXPLOSION.FORCE * 0.7;
    const particleCount = Math.floor(CONFIG.EXPLOSION.PARTICLE_COUNT * 0.6);
    
    // Make this one more colorful
    createExplosionWithVariants(x, y, force, particleCount, true);
    
    // Add shock wave
    if (CONFIG.EXPLOSION.SHOCKWAVE_ENABLED) {
        shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius: 100 + Math.random() * 40,
            opacity: 0.5,
            expansionRate: 4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
    }
}

// Create explosion with multiple particle variants
function createExplosionWithVariants(x, y, force, particleCount, rainbow = false) {
    // Distribution of particle types
    const powderParticleCount = Math.floor(particleCount * 0.5);
    const sparkParticleCount = Math.floor(particleCount * 0.3);
    const chunkParticleCount = Math.floor(particleCount * 0.15);
    const glowingParticleCount = particleCount - powderParticleCount - sparkParticleCount - chunkParticleCount;
    
    // 1. Create powder particles (main confetti)
    createPowderParticles(x, y, force, powderParticleCount, rainbow);
    
    // 2. Create spark particles (smaller, faster)
    createSparkParticles(x, y, force * 1.3, sparkParticleCount, rainbow);
    
    // 3. Create chunk particles (larger, heavier)
    createChunkParticles(x, y, force * 0.8, chunkParticleCount, rainbow);
    
    // 4. Create glowing particles (special effects)
    createGlowingParticles(x, y, force, glowingParticleCount, rainbow);
}

// Create powder-like particles
function createPowderParticles(x, y, force, count, rainbow = false) {
    for (let i = 0; i < count; i++) {
        const isCircular = Math.random() < 0.6;
        const size = Math.random() * 5 + 3;
        const angle = Math.random() * Math.PI * 2;
        
        // Variable speed for natural dispersion
        const speedMultiplier = 0.7 + Math.random() * 0.6;
        const speed = force * speedMultiplier;
        
        // Choose color
        let color;
        if (rainbow) {
            // Rainbow explosion - color based on angle
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.9, 0.9);
        } else {
            color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
        
        const rotation = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        particles.push({
            x: x + (Math.random() - 0.5) * 10, // Small initial spread
            y: y + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.9 + Math.random() * 0.1,
            isCircular,
            rotation,
            rotationSpeed,
            gravity: CONFIG.PHYSICS.LARGE_GRAVITY * (0.8 + Math.random() * 0.4),
            drag: CONFIG.PHYSICS.LARGE_DRAG * (0.8 + Math.random() * 0.4),
            type: 'powder',
            // Enhanced visual effects
            noiseLevel: Math.random(),
            matteFactor: 0.7 + Math.random() * 0.3,
            scaleY: 1,
            // Natural movement
            randomModifier: Math.random() * 100,
            // Special properties for explosion particles
            isExplosionParticle: true,
            // Fade rate
            fadeRate: 0.008 + Math.random() * 0.004,
            // Bounce properties
            canBounce: true,
            bounceFactor: CONFIG.PHYSICS.BOUNCE_FACTOR * (0.8 + Math.random() * 0.4),
            bounceCount: 0,
            maxBounces: Math.floor(Math.random() * 3)
        });
    }
}

// Create spark-like particles
function createSparkParticles(x, y, force, count, rainbow = false) {
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 2 + 1;
        const angle = Math.random() * Math.PI * 2;
        
        // Higher speed for sparks
        const speedMultiplier = 0.9 + Math.random() * 0.6;
        const speed = force * speedMultiplier;
        
        // Choose color
        let color;
        if (rainbow) {
            // Rainbow explosion - slightly modified colors
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.7, 1); // Higher brightness
        } else {
            // Sparks are often white or yellow-white
            const sparkType = Math.random();
            if (sparkType < 0.6) {
                // White spark
                color = {r: 255, g: 255, b: 255, a: 255};
            } else if (sparkType < 0.9) {
                // Yellow-white spark
                color = {r: 255, g: 250, b: 220, a: 255};
            } else {
                // Random color spark
                color = COLORS[Math.floor(Math.random() * COLORS.length)];
            }
        }
        
        particles.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.95 + Math.random() * 0.05,
            isCircular: true, // Sparks are always circular
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * (0.5 + Math.random() * 0.3),
            drag: CONFIG.PHYSICS.SMALL_DRAG * (0.5 + Math.random() * 0.3),
            type: 'spark',
            // Special properties for sparks
            isExplosionParticle: true,
            // Faster fade for sparks
            fadeRate: 0.015 + Math.random() * 0.01,
            // Glow effect for sparks
            glow: true,
            glowColor: { ...color },
            glowSize: size * (3 + Math.random() * 2),
            glowOpacity: 0.7 + Math.random() * 0.3,
            // Spark trail
            trail: Math.random() < 0.5,
            trailRate: 0.3 + Math.random() * 0.2,
            trailCounter: 0,
            // Sparkle effect
            sparkle: true,
            sparkleChance: 0.3 + Math.random() * 0.4
        });
    }
}

// Create larger chunk particles
function createChunkParticles(x, y, force, count, rainbow = false) {
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 10 + 6;
        const angle = Math.random() * Math.PI * 2;
        
        // Chunks are slower and heavier
        const speedMultiplier = 0.5 + Math.random() * 0.5;
        const speed = force * speedMultiplier;
        
        // Choose color
        let color;
        if (rainbow) {
            // Rainbow chunks
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.8, 0.8); // More subdued
        } else {
            color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
        
        const rotation = Math.random() * Math.PI * 2;
        const rotationSpeed = (Math.random() - 0.5) * 0.15;
        
        particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.95,
            isCircular: Math.random() < 0.3, // Mostly irregular shapes
            rotation,
            rotationSpeed,
            gravity: CONFIG.PHYSICS.LARGE_GRAVITY * 1.2,
            drag: CONFIG.PHYSICS.LARGE_DRAG * 1.5,
            type: 'chunk',
            // Visual properties
            noiseLevel: 0.9,
            matteFactor: 0.9,
            scaleY: 1,
            randomModifier: Math.random() * 100,
            // Special properties
            isExplosionParticle: true,
            fadeRate: 0.005 + Math.random() * 0.002, // Slower fade
            // Bounce properties
            canBounce: true,
            bounceFactor: CONFIG.PHYSICS.BOUNCE_FACTOR * 0.8,
            bounceCount: 0,
            maxBounces: 2 + Math.floor(Math.random() * 2),
            // Smoke on impact
            smokeOnImpact: CONFIG.EFFECTS.SMOKE_TRAIL && Math.random() < 0.7
        });
    }
}

// Create special glowing particles
function createGlowingParticles(x, y, force, count, rainbow = false) {
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        
        // Variable speed
        const speedMultiplier = 0.8 + Math.random() * 0.6;
        const speed = force * speedMultiplier;
        
        // Choose color with high brightness
        let color;
        if (rainbow) {
            const hue = (angle / (Math.PI * 2)) * 360;
            color = hsvToRgb(hue, 0.5, 1); // Less saturated, full brightness
        } else {
            const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            // Make it brighter
            color = {
                r: Math.min(255, baseColor.r + 50),
                g: Math.min(255, baseColor.g + 50),
                b: Math.min(255, baseColor.b + 50),
                a: 255
            };
        }
        
        particles.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size,
            color,
            opacity: 0.9,
            isCircular: true,
            gravity: CONFIG.PHYSICS.SMALL_GRAVITY * 0.7,
            drag: CONFIG.PHYSICS.SMALL_DRAG * 0.7,
            type: 'glow',
            // Special glowing properties
            isExplosionParticle: true,
            fadeRate: 0.01 + Math.random() * 0.005,
            // Enhanced glow effect
            glow: true,
            glowColor: { ...color },
            glowSize: size * (4 + Math.random() * 3),
            glowOpacity: 0.8,
            // Pulsating effect
            pulsate: true,
            pulsateSpeed: 0.05 + Math.random() * 0.1,
            pulsatePhase: Math.random() * Math.PI * 2,
            // Sparkle effect
            sparkle: Math.random() < 0.6,
            sparkleChance: 0.4
        });
    }
}

// Update and draw all particles
function updateAndDrawAllParticles(imageData, width, height) {
    // Filter out temporary particles before updating
    particles = particles.filter(p => !p.temporary);
    
    // Apply global wind to all particles
    const windForceX = Math.cos(windDirection) * windStrength;
    const windForceY = Math.sin(windDirection) * windStrength;
    
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Apply physics with enhanced realism
        
        // Gravity
        p.vy += p.gravity;
        
        // Air resistance (drag)
        p.vx *= (1 - p.drag);
        p.vy *= (1 - p.drag);
        
        // Apply wind force
        p.vx += windForceX;
        p.vy += windForceY;
        
        // Apply terminal velocity
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > CONFIG.PHYSICS.TERMINAL_VELOCITY) {
            p.vx = (p.vx / speed) * CONFIG.PHYSICS.TERMINAL_VELOCITY;
            p.vy = (p.vy / speed) * CONFIG.PHYSICS.TERMINAL_VELOCITY;
        }
        
        // Add turbulence for naturalistic movement
        if (Math.random() > 0.8) {
            p.vx += (Math.random() - 0.5) * CONFIG.PHYSICS.TURBULENCE;
            p.vy += (Math.random() - 0.5) * CONFIG.PHYSICS.TURBULENCE;
        }
        
        // Apply flutter effect for confetti
        if (p.type === 'confetti') {
            p.flutterPhase += p.flutterFrequency;
            p.vx += Math.sin(p.flutterPhase) * p.flutterAmplitude * CONFIG.CONFETTI.DRIFT;
        }
        
        // Update position
        const oldX = p.x;
        const oldY = p.y;
        p.x += p.vx;
        p.y += p.vy;
        
        // Handle bouncing off bottom of screen
        if (p.canBounce && p.y > height && p.vy > 0) {
            if (p.bounceCount < p.maxBounces) {
                p.vy = -p.vy * p.bounceFactor;
                p.vx *= 0.8; // Reduce horizontal momentum
                p.bounceCount++;
                
                // Create smoke puff on impact if enabled
                if (p.smokeOnImpact && CONFIG.EFFECTS.SMOKE_TRAIL) {
                    createSmokeOnImpact(p.x, height, p.size);
                }
            } else {
                // Stop bouncing after max bounces
                p.y = height;
                p.vy = 0;
                p.vx *= 0.9; // Slow down horizontal movement
            }
        }
        
        // Update rotation for rotating particles
        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed;
            
            // Update 3D scale effect for tumbling
            if (p.scaleY !== undefined && p.matteFactor !== undefined) {
                p.scaleY = Math.max(0.1, Math.cos((p.y + p.randomModifier) * 0.09) * p.matteFactor);
            }
        }
        
        // Pulsating effect for glowing particles
        if (p.pulsate) {
            p.pulsatePhase += p.pulsateSpeed;
            const pulseFactor = (Math.sin(p.pulsatePhase) + 1) / 2; // 0 to 1
            
            // Apply pulse to glow size and opacity
            if (p.glow) {
                p.glowSize = p.size * (3 + pulseFactor * 2);
                p.glowOpacity = 0.4 + pulseFactor * 0.4;
            }
        }
        
        // Twinkle effect for sparkle fireworks
        if (p.twinkle) {
            p.twinklePhase += p.twinkleSpeed;
            const twinkleFactor = (Math.sin(p.twinklePhase) + 1) / 2; // 0 to 1
            
            // Apply twinkle to opacity
            p.opacity = 0.3 + twinkleFactor * 0.7;
        }
        
        // Create particle trails if enabled
        if (p.trail && Math.random() < p.trailRate) {
            p.trailCounter++;
            
            if (p.trailCounter >= 1) {
                p.trailCounter = 0;
                
                // Create trail particle
                createTrailParticle(p, oldX, oldY);
            }
        }
        
        // Create smoke trail if enabled
        if (p.smokeTrail && Math.random() < 0.2 * CONFIG.EFFECTS.SMOKE_DENSITY) {
            createSmokeParticle(p.x, p.y, p.vx, p.vy);
        }
        
        // Fade particles out over time
        p.opacity -= p.fadeRate || (p.type === 'large' ? 0.006 : 0.01);
        
        // Skip drawing if particle is nearly invisible
        if (p.opacity <= 0.02) continue;
        
        // Sparkle effect - random brightness flashes
        let sparkleBoost = 0;
        if (p.sparkle && Math.random() < (p.sparkleChance || CONFIG.EFFECTS.SPARKLE_CHANCE)) {
            sparkleBoost = Math.random() * 0.4;
        }
        
        // Draw glow first (under the particle)
        if (p.glow && CONFIG.EFFECTS.GLOW) {
            drawGlow(imageData, p, sparkleBoost);
        }
        
        // Draw the particle
        drawParticle(imageData, p, sparkleBoost);
        
        // Remove particles that are out of bounds or completely faded
        if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50 || p.opacity <= 0.02) {
            particles.splice(i, 1);
            i--;
        }
    }
}

// Create trail particle for fireworks/explosion particles
function createTrailParticle(sourceParticle, oldX, oldY) {
    // Calculate position - somewhere between old and new position
    const trailX = oldX + (sourceParticle.x - oldX) * Math.random();
    const trailY = oldY + (sourceParticle.y - oldY) * Math.random();
    
    // Inherit color from source but with modifications
    const trailColor = { ...sourceParticle.color };
    
    // Create trail particle
    const trailParticle = {
        x: trailX,
        y: trailY,
        vx: sourceParticle.vx * 0.1,
        vy: sourceParticle.vy * 0.1,
        size: sourceParticle.size * (0.5 + Math.random() * 0.3),
        color: trailColor,
        opacity: sourceParticle.opacity * (0.3 + Math.random() * 0.3),
        isCircular: true,
        gravity: sourceParticle.gravity * 0.3,
        drag: sourceParticle.drag * 2,
        type: 'trail',
        fadeRate: sourceParticle.fadeRate * 1.5,
        glow: sourceParticle.glow && Math.random() < 0.5,
        glowColor: trailColor,
        glowSize: sourceParticle.size * 2,
        glowOpacity: 0.3
    };
    
    particles.push(trailParticle);
}

// Create smoke particle for trails
function createSmokeParticle(x, y, vx, vy) {
    const smokeSize = 2 + Math.random() * 3;
    
    // Random gray color for smoke
    const grayValue = 180 + Math.floor(Math.random() * 75);
    const smokeColor = {
        r: grayValue,
        g: grayValue,
        b: grayValue,
        a: 255
    };
    
    const smokeParticle = {
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        vx: vx * 0.05 + (Math.random() - 0.5) * 0.2,
        vy: vy * 0.05 - Math.random() * 0.5, // Slight upward drift
        size: smokeSize,
        color: smokeColor,
        opacity: 0.2 + Math.random() * 0.2,
        isCircular: true,
        gravity: 0.01, // Very low gravity
        drag: 0.02, // Higher drag
        type: 'smoke',
        fadeRate: 0.01 + Math.random() * 0.01,
        // Expansion properties
        expandRate: 0.05 + Math.random() * 0.05,
        maxSize: smokeSize * (2 + Math.random())
    };
    
    smokeTrails.push(smokeParticle);
}

// Create smoke puff on impact
function createSmokeOnImpact(x, y, size) {
    const smokeCount = Math.floor(3 + Math.random() * 5);
    
    for (let i = 0; i < smokeCount; i++) {
        const angle = Math.random() * Math.PI;
        const speed = 0.5 + Math.random();
        
        const smokeSize = size * (0.7 + Math.random() * 0.5);
        
        // Gray color with slight variation
        const grayValue = 200 + Math.floor(Math.random() * 55);
        const smokeColor = {
            r: grayValue,
            g: grayValue,
            b: grayValue,
            a: 255
        };
        
        smokeTrails.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y - Math.random() * 2, // Just above the ground
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - Math.random() * 0.5, // Upward component
            size: smokeSize,
            color: smokeColor,
            opacity: 0.3 + Math.random() * 0.2,
            isCircular: true,
            gravity: 0.005, // Very low gravity
            drag: 0.03, // High drag
            type: 'smoke_puff',
            fadeRate: 0.015 + Math.random() * 0.01,
            // Expansion properties
            expandRate: 0.08 + Math.random() * 0.06,
            maxSize: smokeSize * (3 + Math.random() * 2)
        });
    }
}

// Update and draw shockwaves
function updateAndDrawShockwaves(imageData, width, height) {
    for (let i = 0; i < shockwaves.length; i++) {
        const wave = shockwaves[i];
        
        // Expand the shockwave
        wave.radius += wave.expansionRate;
        
        // Reduce opacity as it expands
        const opacityReduction = wave.expansionRate / wave.maxRadius * 2;
        wave.opacity -= opacityReduction;
        
        // Draw the shockwave if still visible
        if (wave.opacity > 0.02 && wave.radius < wave.maxRadius) {
            drawShockwave(imageData, wave, width, height);
        } else {
            // Remove expired shockwave
            shockwaves.splice(i, 1);
            i--;
        }
    }
}

// Draw a shockwave effect
function drawShockwave(imageData, wave, width, height) {
    const { x, y, radius, opacity, color } = wave;
    
    // Calculate drawing bounds
    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(width - 1, Math.floor(x + radius));
    const top = Math.max(0, Math.floor(y - radius));
    const bottom = Math.min(height - 1, Math.floor(y + radius));
    
    // Ring thickness (proportional to radius)
    const ringThickness = radius * 0.1;
    
    // Draw the shockwave ring
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center
            const dx = px - x;
            const dy = py - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if point is within the ring
            if (Math.abs(distance - radius) <= ringThickness) {
                // Calculate intensity based on distance from exact radius
                const intensity = (1 - Math.abs(distance - radius) / ringThickness) * opacity;
                
                // Calculate pixel index
                const index = (py * width + px) * 4;
                
                // Blend with existing pixel
                imageData.data[index] = Math.round(
                    (color.r * intensity + imageData.data[index] * (1 - intensity))
                );
                imageData.data[index + 1] = Math.round(
                    (color.g * intensity + imageData.data[index + 1] * (1 - intensity))
                );
                imageData.data[index + 2] = Math.round(
                    (color.b * intensity + imageData.data[index + 2] * (1 - intensity))
                );
                
                // Alpha channel handling
                imageData.data[index + 3] = Math.min(255, 
                    imageData.data[index + 3] + (intensity * 255 * (1 - imageData.data[index + 3]/255))
                );
            }
        }
    }
}

// Update and draw smoke trails
function updateAndDrawSmokeTrails(imageData, width, height) {
    for (let i = 0; i < smokeTrails.length; i++) {
        const smoke = smokeTrails[i];
        
        // Apply physics with low gravity
        smoke.vy += smoke.gravity;
        
        // Air resistance (high drag for smoke)
        smoke.vx *= (1 - smoke.drag);
        smoke.vy *= (1 - smoke.drag);
        
        // Apply wind
        smoke.vx += Math.cos(windDirection) * windStrength * 1.5;
        smoke.vy += Math.sin(windDirection) * windStrength * 0.5;
        
        // Update position
        smoke.x += smoke.vx;
        smoke.y += smoke.vy;
        
        // Expand the smoke
        if (smoke.size < smoke.maxSize) {
            smoke.size += smoke.expandRate;
        }
        
        // Fade the smoke
        smoke.opacity -= smoke.fadeRate;
        
        // Draw the smoke if still visible
        if (smoke.opacity > 0.01) {
            drawSmokeParticle(imageData, smoke, width, height);
        } else {
            // Remove expired smoke
            smokeTrails.splice(i, 1);
            i--;
        }
    }
}

// Draw a smoke particle with soft edges
function drawSmokeParticle(imageData, smoke, width, height) {
    const { x, y, size, color, opacity } = smoke;
    
    // Calculate drawing bounds
    const left = Math.max(0, Math.floor(x - size));
    const right = Math.min(width - 1, Math.floor(x + size));
    const top = Math.max(0, Math.floor(y - size));
    const bottom = Math.min(height - 1, Math.floor(y + size));
    
    // Draw the smoke with soft gaussian falloff
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center
            const dx = px - x;
            const dy = py - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate gaussian falloff
            // e^(-(distance/size)^2 * 2)
            const factor = Math.exp((-(distance/size))**2 * 2);
            
            if (factor > 0.01) {
                // Apply opacity and falloff
                const particleOpacity = opacity * factor;
                
                // Calculate pixel index
                const index = (py * width + px) * 4;
                
                // Blend with existing pixel
                imageData.data[index] = Math.round(
                    (color.r * particleOpacity + imageData.data[index] * (1 - particleOpacity))
                );
                imageData.data[index + 1] = Math.round(
                    (color.g * particleOpacity + imageData.data[index + 1] * (1 - particleOpacity))
                );
                imageData.data[index + 2] = Math.round(
                    (color.b * particleOpacity + imageData.data[index + 2] * (1 - particleOpacity))
                );
                
                // Alpha channel handling
                imageData.data[index + 3] = Math.min(255, 
                    imageData.data[index + 3] + (particleOpacity * 255 * (1 - imageData.data[index + 3]/255))
                );
            }
        }
    }
}

// Draw glow effect for a particle
function drawGlow(imageData, particle, sparkleBoost = 0) {
    const { x, y, glowSize, glowColor, glowOpacity, type } = particle;
    const width = imageData.width;
    const height = imageData.height;
    
    // Adjusted opacity with sparkle boost
    const adjustedOpacity = Math.min(1, glowOpacity + sparkleBoost);
    
    // Calculate drawing bounds
    const left = Math.max(0, Math.floor(x - glowSize));
    const right = Math.min(width - 1, Math.floor(x + glowSize));
    const top = Math.max(0, Math.floor(y - glowSize));
    const bottom = Math.min(height - 1, Math.floor(y + glowSize));
    
    // Draw the glow with soft edges
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center
            const dx = px - x;
            const dy = py - y;
            
            // For spark-type particles, create elongated glow in direction of movement
            let distance;
            if (type === 'spark' && (particle.vx || particle.vy)) {
                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                if (speed > 1) {
                    // Calculate elongation direction
                    const dirX = particle.vx / speed;
                    const dirY = particle.vy / speed;
                    
                    // Project point onto direction vector
                    const dotProduct = dx * dirX + dy * dirY;
                    
                    // Calculate perpendicular and parallel components
                    const parallelDist = Math.abs(dotProduct);
                    const perpX = dx - dotProduct * dirX;
                    const perpY = dy - dotProduct * dirY;
                    const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
                    
                    // Elongated distance calculation
                    distance = Math.sqrt(perpDist * perpDist + (parallelDist * 0.5) * (parallelDist * 0.5));
                } else {
                    distance = Math.sqrt(dx * dx + dy * dy);
                }
            } else {
                distance = Math.sqrt(dx * dx + dy * dy);
            }
            
            // Calculate falloff factor
            let factor;
            if (type === 'glow' || type === 'firework_sparkle') {
                // Sharper falloff for intense glow
                factor = Math.max(0, 1 - (distance / glowSize));
                factor = factor * factor * (3 - 2 * factor); // Smoothstep
            } else {
                // Gaussian falloff for most glows
                // factor = Math.exp(-(distance/glowSize)**2 * 2);
                 factor = Math.exp((-(distance/glowSize))**2 * 2);

            }
            
            if (factor > 0.01) {
                // Apply opacity and falloff
                const finalOpacity = adjustedOpacity * factor;
                
                // Calculate pixel index
                const index = (py * width + px) * 4;
                
                // Apply additive blending for glow
                imageData.data[index] = Math.min(255, 
                    imageData.data[index] + Math.round(glowColor.r * finalOpacity));
                imageData.data[index + 1] = Math.min(255, 
                    imageData.data[index + 1] + Math.round(glowColor.g * finalOpacity));
                imageData.data[index + 2] = Math.min(255, 
                    imageData.data[index + 2] + Math.round(glowColor.b * finalOpacity));
            }
        }
    }
}

// Draw a particle
function drawParticle(imageData, particle, sparkleBoost = 0) {
    const { 
        x, y, size, color, opacity, isCircular, rotation, 
        type, scaleY, noiseLevel, matteFactor 
    } = particle;
    
    const width = imageData.width;
    const height = imageData.height;
    
    // Adjusted opacity with sparkle boost
    const adjustedOpacity = Math.min(1, opacity + sparkleBoost);
    
    // Adjusted size for scale effect (for 3D particles)
    const adjustedSizeX = size;
    const adjustedSizeY = type === 'large' || type === 'powder' || type === 'chunk' || type === 'confetti' 
        ? size * (scaleY || 1) 
        : size;
    
    // Calculate drawing bounds with scale consideration
    const left = Math.max(0, Math.floor(x - adjustedSizeX));
    const right = Math.min(width - 1, Math.floor(x + adjustedSizeX));
    const top = Math.max(0, Math.floor(y - adjustedSizeY));
    const bottom = Math.min(height - 1, Math.floor(y + adjustedSizeY));
    
    // Special case for confetti strips
    const isStrip = type === 'confetti' && particle.shape === 'strip';
    
    // Apply aspect ratio for non-circular shapes
    const aspect = particle.aspect || 1;
    
    // Draw the particle with enhanced rendering techniques
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
            // Calculate distance from center
            const dx = px - x;
            const dy = py - y;
            
            let inside = false;
            let edgeFactor = 0;
            
            if (isCircular) {
                // For circular particles
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Scale the y-distance for 3D effect
                const scaledDistance = Math.sqrt(dx * dx + (dy / (scaleY || 1)) * (dy / (scaleY || 1)));
                
                inside = scaledDistance <= adjustedSizeX;
                
                // Soft edge calculation
                if (inside) {
                    edgeFactor = Math.min(1, (adjustedSizeX - scaledDistance) / adjustedSizeX);
                    edgeFactor = Math.pow(edgeFactor, 1.5); // More natural falloff
                }
            } else if (isStrip) {
                // For confetti strips (elongated rectangles)
                // Rotate the point around particle center
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Check if point is inside rotated rectangle
                const halfWidth = adjustedSizeX * 0.5;
                const halfHeight = adjustedSizeX * aspect; // Very thin
                
                inside = Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
                
                // Soft edge calculation
                if (inside) {
                    const distFromEdgeX = halfWidth - Math.abs(rotatedX);
                    const distFromEdgeY = halfHeight - Math.abs(rotatedY);
                    const minDist = Math.min(distFromEdgeX, distFromEdgeY);
                    edgeFactor = Math.min(1, minDist / (halfWidth * 0.2));
                    edgeFactor = Math.pow(edgeFactor, 1.3);
                }
            } else {
                // For irregular polygonal particles (rotated rectangles/triangles)
                // Rotate the point around particle center
                const cos = Math.cos(rotation || 0);
                const sin = Math.sin(rotation || 0);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                if (particle.shape === 'triangle') {
                    // Triangle shape (approximated)
                    const halfHeight = adjustedSizeY;
                    const halfWidth = adjustedSizeX;
                    
                    // Simple triangle check using barycentric coordinates
                    const x1 = 0, y1 = -halfHeight;
                    const x2 = -halfWidth, y2 = halfHeight;
                    const x3 = halfWidth, y3 = halfHeight;
                    
                    const denominator = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
                    const a = ((y2 - y3) * (rotatedX - x3) + (x3 - x2) * (rotatedY - y3)) / denominator;
                    const b = ((y3 - y1) * (rotatedX - x3) + (x1 - x3) * (rotatedY - y3)) / denominator;
                    const c = 1 - a - b;
                    
                    inside = a >= 0 && b >= 0 && c >= 0;
                    
                    // Soft edge calculation for triangles
                    if (inside) {
                        // Distance from edge is approximately the minimum of a, b, c
                        const minCoord = Math.min(a, b, c);
                        edgeFactor = Math.min(1, minCoord / 0.2);
                        edgeFactor = Math.pow(edgeFactor, 1.3);
                    }
                } else {
                    // Rectangle or square shape
                    // Check if point is inside rotated rectangle with scaling
                    const halfWidth = adjustedSizeX * (aspect >= 1 ? 1 : aspect);
                    const halfHeight = adjustedSizeY * (aspect < 1 ? 1 : 1/aspect);
                    
                    inside = Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
                    
                    // Soft edge calculation
                    if (inside) {
                        const distFromEdgeX = halfWidth - Math.abs(rotatedX);
                        const distFromEdgeY = halfHeight - Math.abs(rotatedY);
                        const minDist = Math.min(distFromEdgeX, distFromEdgeY);
                        edgeFactor = Math.min(1, minDist / (halfWidth * 0.2));
                        edgeFactor = Math.pow(edgeFactor, 1.3);
                    }
                }
            }
            
            // Apply soft edge and opacity
            if (inside && edgeFactor > 0) {
                const particleOpacity = adjustedOpacity * edgeFactor;
                
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
                
                // Add texture detail to larger particles
                if ((type === 'large' || type === 'powder' || type === 'confetti' || type === 'chunk') && 
                    noiseLevel && noiseLevel > 0.6 && Math.random() < 0.2) {
                    addTextureDetail(imageData, px, py, width, r, g, b, particleOpacity);
                }
            }
        }
    }
}

// Add texture detail to particles
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

// Convert HSV to RGB
function hsvToRgb(h, s, v) {
    let r, g, b;
    
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255),
        a: 255
    };
}