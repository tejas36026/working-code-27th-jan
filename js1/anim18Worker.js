
    // Core animation parameters
    const DEFAULT_ANIMATION_DURATION = 8; // seconds
    const FRAME_RATE = 60; // frames per second
    const DEFAULT_ITERATIONS = DEFAULT_ANIMATION_DURATION * FRAME_RATE;
    const DEFAULT_DANCE_CYCLE = 1.5;
    const DEFAULT_AMPLITUDE = 18;

    // Dog breed characteristics
    const DOG_BREEDS = {
    GOLDEN_RETRIEVER: {
        name: "Golden Retriever",
        color: {r: 230, g: 180, b: 80, a: 255},
        tailWagSpeed: 1.4,
        size: 1111.2,
        playfulness: 0.9,
        silhouetteScale: 1.0
    },
    CORGI: {
        name: "Corgi",
        color: {r: 210, g: 160, b: 90, a: 255},
        tailWagSpeed: 1.8,
        size: 1111.8,
        playfulness: 0.95,
        silhouetteScale: 0.7
    },
    HUSKY: {
        name: "Husky",
        color: {r: 200, g: 200, b: 220, a: 255},
        tailWagSpeed: 1.1,
        size: 1111.1,
        playfulness: 0.85,
        silhouetteScale: 1.0
    },
    DACHSHUND: {
        name: "Dachshund",
        color: {r: 160, g: 100, b: 60, a: 255},
        tailWagSpeed: 2.0,
        size: 1110.7,
        playfulness: 0.9,
        silhouetteScale: 0.65
    },
    DALMATIAN: {
        name: "Dalmatian",
        color: {r: 240, g: 240, b: 240, a: 255},
        tailWagSpeed: 1.3,
        size: 1111.1,
        playfulness: 0.8,
        silhouetteScale: 1.0,
        spotColor: {r: 30, g: 30, b: 30, a: 255}
    }
    };

    // Colors for particles (dog-themed)
    const COLOR_PALETTES = {
    PLAYFUL: [
        {r: 255, g: 105, b: 97, a: 255},  // Coral
        {r: 255, g: 180, b: 128, a: 255}, // Peach
        {r: 248, g: 243, b: 141, a: 255}, // Light Yellow
        {r: 66, g: 214, b: 164, a: 255},  // Mint
        {r: 8, g: 131, b: 149, a: 255}    // Teal
    ],
    NATURAL: [
        {r: 188, g: 140, b: 76, a: 255},  // Golden Brown
        {r: 225, g: 193, b: 110, a: 255}, // Tan
        {r: 149, g: 114, b: 79, a: 255},  // Brown
        {r: 94, g: 73, b: 52, a: 255},    // Dark Brown
        {r: 240, g: 234, b: 214, a: 255}  // Cream
    ],
    VIBRANT: [
        {r: 255, g: 89, b: 94, a: 255},   // Red
        {r: 255, g: 202, b: 58, a: 255},  // Yellow
        {r: 138, g: 201, b: 38, a: 255},  // Green
        {r: 25, g: 130, b: 196, a: 255},  // Blue
        {r: 106, g: 76, b: 147, a: 255}   // Purple
    ],
    TOY: [
        {r: 255, g: 183, b: 3, a: 255},   // Tennis Ball Yellow
        {r: 255, g: 73, b: 92, a: 255},   // Toy Red
        {r: 66, g: 134, b: 244, a: 255},  // Toy Blue
        {r: 0, g: 175, b: 0, a: 255},     // Ball Green
        {r: 255, g: 112, b: 166, a: 255}  // Pink Toy
    ],
    TREAT: [
        {r: 195, g: 155, b: 119, a: 255}, // Biscuit
        {r: 165, g: 42, b: 42, a: 255},   // Meat Treat
        {r: 218, g: 165, b: 32, a: 255},  // Golden Treat
        {r: 139, g: 69, b: 19, a: 255},   // Jerky Brown
        {r: 160, g: 82, b: 45, a: 255}    // Milk Bone
    ],
    PAWPRINTS: [
        {r: 80, g: 60, b: 40, a: 255},    // Dark Brown
        {r: 110, g: 90, b: 70, a: 255},   // Medium Brown
        {r: 140, g: 120, b: 100, a: 255}, // Light Brown
        {r: 170, g: 150, b: 130, a: 255}, // Beige
        {r: 200, g: 180, b: 160, a: 255}  // Cream
    ]
    };

    // Default active color palette
    let activePalette = COLOR_PALETTES.PLAYFUL;

    // Physics constants
    const PHYSICS = {
    GRAVITY: {
        STANDARD: 0.25,
        LIGHT: 0.12,
        HEAVY: 0.35,
        BOUNCY: 0.28
    },
    DRAG: {
        LOW: 0.005,
        MEDIUM: 0.02,
        HIGH: 0.04,
        FEATHER: 0.06
    },
    ELASTICITY: {
        NONE: 0,
        LOW: 0.2,
        MEDIUM: 0.5,
        HIGH: 0.8,
        SUPER: 0.95
    },
    TERMINAL_VELOCITY: {
        SLOW: 2,
        MEDIUM: 3.5,
        FAST: 5,
        VERY_FAST: 7
    }
    };

    // Particle counts for different animation phases
    const PARTICLE_COUNTS = {
    INTRO: {
        DOG_SILHOUETTES: 1,
        PAWPRINTS: 5,
        TREATS: 0,
        TOYS: 0
    },
    MAIN: {
        LARGE_PARTICLES: 350,
        SMALL_PARTICLES: 600,
        MEDIUM_PARTICLES: 250,
        PAW_PARTICLES: 150,
        BONE_PARTICLES: 75,
        BALL_PARTICLES: 30,
        SPARKLE_PARTICLES: 100
    },
    FINALE: {
        CONFETTI: 500,
        STREAMERS: 100,
        GLITTER: 300,
        FINAL_SILHOUETTES: 3
    }
    };

    // Animation phases and timing
    const ANIMATION_PHASES = {
    INTRO: {
        name: "Introduction",
        duration: FRAME_RATE * 2, // 2 seconds
        description: "Dog silhouette appears with pawprints"
    },
    BUILDUP: {
        name: "Build-up",
        duration: FRAME_RATE * 1.5, // 1.5 seconds
        description: "Silhouette starts to vibrate with energy"
    },
    EXPLOSION: {
        name: "Explosion",
        duration: FRAME_RATE * 3, // 3 seconds
        description: "Explosion of dog-themed particles"
    },
    SETTLE: {
        name: "Settling",
        duration: FRAME_RATE * 1.5, // 1.5 seconds
        description: "Particles settle and fade"
    }
    };

    // Animation paths for particles
    const PARTICLE_PATHS = {
    PARABOLIC: (t) => ({ x: t, y: 4 * t * (1 - t) }),
    CIRCULAR: (t, radius = 1) => ({ x: Math.cos(t * Math.PI * 2) * radius, y: Math.sin(t * Math.PI * 2) * radius }),
    SPIRAL: (t, factor = 0.3) => {
        const angle = t * Math.PI * 10;
        const radius = t * factor;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    },
    ZIGZAG: (t) => ({ x: t, y: Math.sin(t * Math.PI * 8) * 0.1 }),
    WAGGING_TAIL: (t, speed = 1, amplitude = 1) => {
        return { x: t, y: Math.sin(t * Math.PI * speed * 6) * amplitude * Math.min(1, t * 3) };
    },
    BOUNCE: (t) => {
        const bounce = Math.abs(Math.sin(t * Math.PI * 2.5));
        return { x: t, y: 1 - bounce * Math.min(1, t * 2) };
    }
    };

    // Special shapes for particles
    const SPECIAL_SHAPES = {
    PAW_PRINT: {
        drawFn: drawPawPrint,
        sizeMultiplier: 11.8,
        aspectRatio: 0.9
    },
    BONE: {
        drawFn: drawBoneShape,
        sizeMultiplier: 11.5,
        aspectRatio: 0.4
    },
    TENNIS_BALL: {
        drawFn: drawTennisBallShape,
        sizeMultiplier: 11.2,
        aspectRatio: 1.0
    },
    FRISBEE: {
        drawFn: drawFrisbeeShape,
        sizeMultiplier: 11.3,
        aspectRatio: 1.0
    },
    DOG_HEAD: {
        drawFn: drawDogHeadShape,
        sizeMultiplier: 21.0,
        aspectRatio: 0.8
    }
    };

    // Dog behavior patterns
    const DOG_BEHAVIORS = {
    PLAYFUL_BOUNCE: {
        pathFn: PARTICLE_PATHS.BOUNCE,
        speed: 1.2,
        tailWag: 1.5,
        particleEmission: 0.8
    },
    CHASE_TAIL: {
        pathFn: PARTICLE_PATHS.CIRCULAR,
        speed: 1.3,
        tailWag: 2.0,
        particleEmission: 0.6
    },
    FETCH_RUN: {
        pathFn: PARTICLE_PATHS.ZIGZAG,
        speed: 1.8,
        tailWag: 1.2,
        particleEmission: 0.5
    },
    EXCITED_SPIN: {
        pathFn: PARTICLE_PATHS.SPIRAL,
        speed: 1.4,
        tailWag: 2.2,
        particleEmission: 0.9
    }
    };

    // Current animation state
    let animationState = {
    currentIteration: 0,
    particles: [],
    phase: "INTRO",
    selectedBreed: DOG_BREEDS.GOLDEN_RETRIEVER,
    behavior: DOG_BEHAVIORS.PLAYFUL_BOUNCE,
    palette: COLOR_PALETTES.PLAYFUL,
    emissionRate: 1.0,
    timeElapsed: 0,
    playbackSpeed: 1.0,
    specialEffectsLevel: 0.8,
    pawPrintDensity: 0.6,
    treatDensity: 0.4,
    toyDensity: 0.5,
    currentPhaseStartTime: 0
    };

    // ==================== PARTICLE SYSTEM ====================

    // Base particle class attributes
    class ParticleBase {
    constructor(options = {}) {
        // Position
        this.x = options.x || 0;
        this.y = options.y || 0;
        
        // Velocity
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        
        // Acceleration
        this.ax = options.ax || 0;
        this.ay = options.ay || 0;
        
        // Size
        this.size = options.size || 15;
        this.originalSize = this.size;
        this.growthRate = options.growthRate || 0;
        
        // Appearance
        this.color = options.color || { r: 255, g: 255, b: 255, a: 255 };
        this.opacity = options.opacity !== undefined ? options.opacity : 1.0;
        this.opacityDecay = options.opacityDecay || 0.01;
        
        // Shape
        this.isCircular = options.isCircular !== undefined ? options.isCircular : true;
        this.shape = options.shape || null;
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        
        // Physics
        this.gravity = options.gravity || PHYSICS.GRAVITY.STANDARD;
        this.drag = options.drag || PHYSICS.DRAG.MEDIUM;
        this.elasticity = options.elasticity || PHYSICS.ELASTICITY.NONE;
        this.terminalVelocity = options.terminalVelocity || PHYSICS.TERMINAL_VELOCITY.MEDIUM;
        
        // Lifespan
        this.lifespan = options.lifespan || 100;
        this.age = 0;
        
        // Behavior
        this.behaviorFn = options.behaviorFn || null;
        this.behaviorParams = options.behaviorParams || {};
        
        // Special effects
        this.emitsSecondaryParticles = options.emitsSecondaryParticles || false;
        this.emissionRate = options.emissionRate || 0;
        this.emissionType = options.emissionType || null;
        
        // Rendering enhancements
        this.glow = options.glow || 0;
        this.glowColor = options.glowColor || this.color;
        this.blur = options.blur || 0;
        this.shadowOffset = options.shadowOffset || { x: 0, y: 0 };
        this.shadowColor = options.shadowColor || { r: 0, g: 0, b: 0, a: 0.5 };
        
        // 3D effects
        this.scaleY = options.scaleY || 1;
        this.scaleX = options.scaleX || 1;
        this.depth = options.depth || 0;
        this.perspective = options.perspective || 0.001;
        
        // Animation
        this.animationPath = options.animationPath || null;
        this.pathPosition = options.pathPosition || 0;
        this.pathSpeed = options.pathSpeed || 0.01;
        
        // Type/category
        this.type = options.type || "generic";
        this.subtype = options.subtype || "";
        
        // Special attributes for dog particles
        this.breed = options.breed || null;
        this.dogPart = options.dogPart || null;
        this.behavior = options.behavior || null;
        this.tailWagSpeed = options.tailWagSpeed || 1;
        this.playfulness = options.playfulness || 0.5;
        
        // Visual texture/pattern
        this.pattern = options.pattern || null;
        this.textureVariation = options.textureVariation || 0;
        this.noiseLevel = options.noiseLevel || 0;
        
        // Custom state
        this.state = options.state || {};
        this.customUpdateFn = options.customUpdateFn || null;
        this.customRenderFn = options.customRenderFn || null;
    }
    
    update(deltaTime = 1) {
        // Age the particle
        this.age += deltaTime;
        
        // Custom update function if available
        if (this.customUpdateFn) {
        this.customUpdateFn(this, deltaTime);
        return;
        }
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Update path position if using a predefined animation path
        if (this.animationPath) {
        this.updatePathPosition(deltaTime);
        }
        
        // Update size if growing/shrinking
        if (this.growthRate !== 0) {
        this.size += this.growthRate * deltaTime;
        this.size = Math.max(0, this.size);
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Update opacity
        this.opacity -= this.opacityDecay * deltaTime;
        this.opacity = Math.max(0, Math.min(1, this.opacity));
        
        // Handle behavior function if set
        if (this.behaviorFn) {
        this.behaviorFn(this, deltaTime, this.behaviorParams);
        }
        
        // Check if should emit secondary particles
        if (this.emitsSecondaryParticles && Math.random() < this.emissionRate * deltaTime) {
        this.emitSecondaryParticle();
        }
    }
    
    applyPhysics(deltaTime) {
        // Apply acceleration to velocity
        this.vx += this.ax * deltaTime;
        this.vy += this.ay * deltaTime;
        
        // Apply gravity
        this.vy += this.gravity * deltaTime;
        
        // Apply drag/air resistance
        this.vx *= (1 - this.drag * deltaTime);
        this.vy *= (1 - this.drag * deltaTime);
        
        // Apply terminal velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.terminalVelocity) {
        this.vx = (this.vx / speed) * this.terminalVelocity;
        this.vy = (this.vy / speed) * this.terminalVelocity;
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Handle floor collision with elasticity (bounce)
        if (this.y > 500 && this.elasticity > 0) { // Assuming canvas height is 500
        this.y = 500;
        this.vy = -this.vy * this.elasticity;
        
        // Reduce horizontal velocity slightly on bounce
        this.vx *= (1 - 0.1 * (1 - this.elasticity));
        
        // Prevent endless tiny bounces
        if (Math.abs(this.vy) < 0.3) {
            this.vy = 0;
            this.elasticity = 0; // Stop bouncing
        }
        }
    }
    
    updatePathPosition(deltaTime) {
        // Update position on predefined path
        this.pathPosition += this.pathSpeed * deltaTime;
        
        // Get new position from path function
        const newPos = this.animationPath(this.pathPosition, this.behaviorParams);
        
        // Update actual position based on path
        this.x = this.state.originX + newPos.x * this.state.pathScale;
        this.y = this.state.originY + newPos.y * this.state.pathScale;
    }
    
    emitSecondaryParticle() {
        // Implementation depends on the particle system management
        // This would typically add a new particle to the global particles array
        if (typeof createSecondaryParticle === 'function') {
        const newParticle = createSecondaryParticle(this);
        if (newParticle) {
            animationState.particles.push(newParticle);
        }
        }
    }
    
    isAlive() {
        // Check if particle should still be alive
        if (this.age >= this.lifespan) return false;
        if (this.opacity <= 0.01) return false;
        if (this.size <= 0) return false;
        
        // Check if particle is far off-screen (with buffer)
        const offscreenBuffer = Math.max(100, this.size * 2);
        if (this.x < -offscreenBuffer || this.x > 1000 + offscreenBuffer || 
            this.y < -offscreenBuffer || this.y > 500 + offscreenBuffer) {
        return false;
        }
        
        return true;
    }
    }

    // Specialized Particle Types

    // Silhouette particle (for dog shapes)
    class DogSilhouetteParticle extends ParticleBase {
    constructor(options = {}) {
        super(options);
        
        // Silhouette specific properties
        this.breedType = options.breedType || DOG_BREEDS.GOLDEN_RETRIEVER;
        this.silhouetteData = options.silhouetteData || generateDogSilhouette(this.breedType);
        this.tailWagAngle = 0;
        this.tailWagDirection = 1;
        this.tailWagSpeed = this.breedType.tailWagSpeed || 1;
        this.earFlapAngle = 0;
        this.earFlapSpeed = 0.8;
        this.breatheScale = 1;
        this.breatheDirection = 0.0005;
        this.pulsate = options.pulsate || false;
        this.bodyPoints = this.silhouetteData.bodyPoints || [];
        this.tailPoints = this.silhouetteData.tailPoints || [];
        this.headPoints = this.silhouetteData.headPoints || [];
        this.earPoints = this.silhouetteData.earPoints || [];
        this.legPoints = this.silhouetteData.legPoints || [];
        
        // Animation state
        this.animationState = {
        action: options.action || "idle",
        actionTime: 0,
        actionDuration: options.actionDuration || 60,
        nextAction: null,
        isJumping: false,
        jumpHeight: 0,
        jumpDirection: 1,
        isBarking: false,
        barkTime: 0,
        isWaggingTail: true
        };
        
        // Override default update with custom function
        this.customUpdateFn = this.updateSilhouette;
        this.customRenderFn = this.renderSilhouette;
    }
    
    updateSilhouette(particle, deltaTime) {
        // Apply base physics
        particle.applyPhysics(deltaTime);
        
        // Update animation state
        particle.animationState.actionTime += deltaTime;
        
        // Wag tail
        if (particle.animationState.isWaggingTail) {
        particle.tailWagAngle += particle.tailWagSpeed * 0.05 * particle.tailWagDirection * deltaTime;
        if (Math.abs(particle.tailWagAngle) > 0.3) {
            particle.tailWagDirection *= -1;
        }
        }
        
        // Handle breathing/pulsating
        particle.breatheScale += particle.breatheDirection * deltaTime;
        if (particle.breatheScale > 1.03) {
        particle.breatheDirection = -0.0005;
        } else if (particle.breatheScale < 0.97) {
        particle.breatheDirection = 0.0005;
        }
        
        // Handle ear flapping
        particle.earFlapAngle = Math.sin(animationState.currentIteration * 0.02 * particle.earFlapSpeed) * 0.1;
        
        // Handle actions
        switch (particle.animationState.action) {
        case "idle":
            // Occasional random behaviors
            if (Math.random() < 0.005) {
            particle.animationState.action = ["bark", "jump", "spin"][Math.floor(Math.random() * 3)];
            particle.animationState.actionTime = 0;
            }
            break;
            
        case "bark":
            // Handle barking animation
            particle.animationState.isBarking = true;
            particle.animationState.barkTime += deltaTime;
            
            // Open/close mouth based on bark time
            if (particle.animationState.barkTime > 20) {
            particle.animationState.isBarking = false;
            particle.animationState.action = "idle";
            particle.animationState.actionTime = 0;
            }
            break;
            
        case "jump":
            // Handle jumping animation
            particle.animationState.isJumping = true;
            particle.animationState.jumpHeight += 0.5 * particle.animationState.jumpDirection * deltaTime;
            
            if (particle.animationState.jumpHeight > 15) {
            particle.animationState.jumpDirection = -1;
            } else if (particle.animationState.jumpHeight < 0) {
            particle.animationState.jumpHeight = 0;
            particle.animationState.isJumping = false;
            particle.animationState.action = "idle";
            particle.animationState.actionTime = 0;
            }
            break;
            
        case "spin":
            // Handle spinning animation
            particle.rotation += 0.1 * deltaTime;
            
            if (particle.animationState.actionTime > 40) {
            particle.animationState.action = "idle";
            particle.animationState.actionTime = 0;
            }
            break;
        }
        
        // Handle pulsating effect if enabled
        if (particle.pulsate) {
        const pulseAmount = Math.sin(animationState.currentIteration * 0.05) * 0.2 + 0.8;
        particle.opacity = pulseAmount;
        }
    }
    
    renderSilhouette(particle, ctx, imageData, width, height) {
       
        // Draw body
        for (const point of particle.bodyPoints) {
        // Apply transformations to point
        const transformedX = particle.x + point.x * particle.breatheScale * particle.size;
        const transformedY = particle.y + point.y * particle.breatheScale * particle.size - 
                            (particle.animationState.isJumping ? particle.animationState.jumpHeight : 0);
        
        // Draw the point
        drawPixel(imageData, transformedX, transformedY, particle.color, particle.opacity);
        }
        
        // Draw tail with wagging
        for (const point of particle.tailPoints) {
        // Apply tail wag transformation
        const wagX = Math.cos(particle.tailWagAngle) * point.x - Math.sin(particle.tailWagAngle) * point.y;
        const wagY = Math.sin(particle.tailWagAngle) * point.x + Math.cos(particle.tailWagAngle) * point.y;
        
        const transformedX = particle.x + wagX * particle.size;
        const transformedY = particle.y + wagY * particle.size - 
                            (particle.animationState.isJumping ? particle.animationState.jumpHeight : 0);
        
        // Draw the point
        drawPixel(imageData, transformedX, transformedY, particle.color, particle.opacity);
        }
        
        // Draw head
        for (const point of particle.headPoints) {
        const transformedX = particle.x + point.x * particle.size;
        const transformedY = particle.y + point.y * particle.size - 
                            (particle.animationState.isJumping ? particle.animationState.jumpHeight : 0);
        
        // Adjust for barking
        const isMouth = point.type === "mouth";
        const barkOffset = isMouth && particle.animationState.isBarking ? 
                            Math.sin(particle.animationState.barkTime * 0.3) * 3 : 0;
        
        // Draw the point
        drawPixel(imageData, transformedX, transformedY + barkOffset, particle.color, particle.opacity);
        }
        
        // Draw ears with flapping
        for (const point of particle.earPoints) {
        // Apply ear flap transformation
        const flapX = Math.cos(particle.earFlapAngle) * point.x - Math.sin(particle.earFlapAngle) * point.y;
        const flapY = Math.sin(particle.earFlapAngle) * point.x + Math.cos(particle.earFlapAngle) * point.y;
        
        const transformedX = particle.x + flapX * particle.size;
        const transformedY = particle.y + flapY * particle.size - 
                            (particle.animationState.isJumping ? particle.animationState.jumpHeight : 0);
        
        // Draw the point
        drawPixel(imageData, transformedX, transformedY, particle.color, particle.opacity);
        }
        
        // Draw legs
        for (const point of particle.legPoints) {
        const legOffset = particle.animationState.isJumping ? 
                            Math.sin(particle.animationState.actionTime * 0.2) * 2 : 0;
        
        const transformedX = particle.x + point.x * particle.size;
        const transformedY = particle.y + point.y * particle.size + legOffset - 
                            (particle.animationState.isJumping ? particle.animationState.jumpHeight : 0);
        
        // Draw the point
        drawPixel(imageData, transformedX, transformedY, particle.color, particle.opacity);
        }
    }
    }

    // Paw Print Particle
    class PawPrintParticle extends ParticleBase {
    constructor(options = {}) {
        super(options);
        
        // Paw print specific properties
        this.pawSize = options.pawSize || 1;
        this.pawType = options.pawType || "dog"; // dog, puppy, etc.
        this.padColor = options.padColor || { r: 120, g: 80, b: 60, a: 255 };
        this.toeSeparation = options.toeSeparation || 1;
        this.toeCount = options.toeCount || 4;
        this.isLeftPaw = options.isLeftPaw !== undefined ? options.isLeftPaw : Math.random() > 0.5;
        
        // Set custom render function
        this.customRenderFn = this.renderPawPrint;
    }
    
    renderPawPrint(particle, ctx, imageData, width, height) {
        const baseSize = particle.size * particle.pawSize;
        const padSize = baseSize * 0.6;
        const toeSize = baseSize * 0.3;
        const toeSeparation = particle.toeSeparation;
        
        // Draw the main pad
        drawOval(
        imageData,
        particle.x,
        particle.y + padSize * 0.2,
        padSize,
        padSize * 0.8,
        particle.padColor,
        particle.opacity,
        particle.rotation
        );
        
        // Draw the toes
        const toeOffsetY = -padSize * 0.5;
        const spreadFactor = particle.isLeftPaw ? -1 : 1;
        
        for (let i = 0; i < particle.toeCount; i++) {
        let toeOffsetX;
        
        if (particle.toeCount === 4) {
            // Position for 4 toes
            if (i < 2) {
            // Top row - two toes
            toeOffsetX = (i * 2 - 0.5) * toeSize * toeSeparation * spreadFactor;
            drawOval(
                imageData,
                particle.x + toeOffsetX,
                particle.y + toeOffsetY,
                toeSize,
                toeSize,
                particle.padColor,
                particle.opacity,
                particle.rotation
            );
            } else {
            // Bottom row - two toes
            toeOffsetX = ((i - 2) * 2 - 0.5) * toeSize * toeSeparation * spreadFactor;
            drawOval(
                imageData,
                particle.x + toeOffsetX,
                particle.y + toeOffsetY - toeSize * 0.8,
                toeSize,
                toeSize,
                particle.padColor,
                particle.opacity,
                particle.rotation
            );
            }
        } else {
            // Position for other toe counts (like 5 for certain animals)
            const angle = (i / particle.toeCount) * Math.PI;
            toeOffsetX = Math.cos(angle) * padSize * 0.6 * spreadFactor;
            const toeOffsetY2 = toeOffsetY + Math.sin(angle) * padSize * 0.3;
            
            drawOval(
            imageData,
            particle.x + toeOffsetX,
            particle.y + toeOffsetY2,
            toeSize,
            toeSize,
            particle.padColor,
            particle.opacity,
            particle.rotation
            );
        }
        }
    }
    }

    // Dog Toy Particle
    class DogToyParticle extends ParticleBase {
    constructor(options = {}) {
        super(options);
        
        // Toy specific properties
        this.toyType = options.toyType || "ball"; // ball, bone, frisbee, etc.
        this.toyColor = options.toyColor || { r: 255, g: 0, b: 0, a: 255 };
        this.secondaryColor = options.secondaryColor;
        this.hasSqueak = options.hasSqueak || Math.random() > 0.5;
        this.squeezeAmount = 0;
        this.squeezeDirection = 1;
        this.isSqueezing = false;
        this.squeakTime = 0;
        
        // Override update and render
        this.customUpdateFn = this.updateToy;
        this.customRenderFn = this.renderToy;
    }
    
    updateToy(particle, deltaTime) {
        // Apply base physics
        particle.applyPhysics(deltaTime);
        
        // Update rotation
        particle.rotation += particle.rotationSpeed * deltaTime;
        
        // Handle squeaking if applicable
        if (particle.hasSqueak) {
        // Random chance to trigger a squeak
        if (!particle.isSqueezing && Math.random() < 0.01) {
            particle.isSqueezing = true;
            particle.squeakTime = 0;
        }
        
        // Update squeak animation
        if (particle.isSqueezing) {
            particle.squeakTime += deltaTime;
            particle.squeezeAmount += 0.1 * particle.squeezeDirection * deltaTime;
            
            if (particle.squeezeAmount > 0.3) {
            particle.squeezeDirection = -1;
            } else if (particle.squeezeAmount < 0) {
            particle.squeezeAmount = 0;
            particle.squeezeDirection = 1;
            particle.isSqueezing = false;
            }
        }
        }
        
        // Apply bouncing effect for balls
        if (particle.toyType === "ball" && particle.y > 480 && particle.vy > 0) {
        particle.y = 480;
        particle.vy = -particle.vy * 0.6;
        particle.vx *= 0.8;
        
        // Prevent endless tiny bounces
        if (Math.abs(particle.vy) < 0.3) {
            particle.vy = 0;
        }
        }
        
        // Update opacity
        particle.opacity -= particle.opacityDecay * deltaTime;
        particle.opacity = Math.max(0, Math.min(1, particle.opacity));
    }
    
    renderToy(particle, ctx, imageData, width, height) {
        // Render based on toy type
        switch (particle.toyType) {
        case "ball":
            this.renderBall(particle, imageData);
            break;
            
        case "bone":
            this.renderBone(particle, imageData);
            break;
            
        case "frisbee":
            this.renderFrisbee(particle, imageData);
            break;
            
        default:
            this.renderBall(particle, imageData);
        }
    }
    
    renderBall(particle, imageData) {
        const scaleX = 1 - particle.squeezeAmount;
        const scaleY = 1 + particle.squeezeAmount;
        
        // Draw tennis ball
        drawOval(
        imageData,
        particle.x,
        particle.y,
        particle.size * scaleX,
        particle.size * scaleY,
        particle.toyColor,
        particle.opacity,
        particle.rotation
        );
        
        // Draw the seam on the tennis ball
        if (particle.secondaryColor) {
        // Draw a curved line for the tennis ball seam
        const seamRadius = particle.size * 0.7;
        const seamWidth = particle.size * 0.15;
        
        drawArc(
            imageData,
            particle.x,
            particle.y,
            seamRadius,
            seamWidth,
            0,
            Math.PI * 2,
            particle.secondaryColor,
            particle.opacity * 0.9,
            particle.rotation
        );
        }
    }
    
    renderBone(particle, imageData) {
        const baseSize = particle.size;
        const endSize = baseSize * 0.7;
        const midWidth = baseSize * 0.3;
        const midLength = baseSize * 1.2;
        
        // Squeeze effect
        const squeezeX = 1 - particle.squeezeAmount * 0.5;
        const squeezeY = 1 + particle.squeezeAmount * 0.5;
        
        // Calculate bone end positions
        const endDist = midLength / 2;
        const cos = Math.cos(particle.rotation);
        const sin = Math.sin(particle.rotation);
        
        // End 1
        drawOval(
        imageData,
        particle.x - cos * endDist * squeezeX,
        particle.y - sin * endDist * squeezeY,
        endSize * squeezeY,
        endSize * squeezeX,
        particle.toyColor,
        particle.opacity,
        particle.rotation + Math.PI/2
        );
        
        // End 2
        drawOval(
        imageData,
        particle.x + cos * endDist * squeezeX,
        particle.y + sin * endDist * squeezeY,
        endSize * squeezeY,
        endSize * squeezeX,
        particle.toyColor,
        particle.opacity,
        particle.rotation + Math.PI/2
        );
        
        // Middle section
        drawRectangle(
        imageData,
        particle.x,
        particle.y,
        midLength * squeezeX,
        midWidth * squeezeY,
        particle.toyColor,
        particle.opacity,
        particle.rotation
        );
    }
    
    renderFrisbee(particle, imageData) {
        // Main frisbee disc
        drawOval(
        imageData,
        particle.x,
        particle.y,
        particle.size,
        particle.size * (0.2 + Math.abs(Math.sin(particle.rotation)) * 0.8),
        particle.toyColor,
        particle.opacity,
        particle.rotation
        );
        
        // Inner circle
        if (particle.secondaryColor) {
        drawOval(
            imageData,
            particle.x,
            particle.y,
            particle.size * 0.5,
            particle.size * (0.1 + Math.abs(Math.sin(particle.rotation)) * 0.4),
            particle.secondaryColor,
            particle.opacity * 0.9,
            particle.rotation
        );
        }
    }
    }

    // Dog Treat Particle
    class DogTreatParticle extends ParticleBase {
    constructor(options = {}) {
        super(options);
        
        // Treat specific properties
        this.treatType = options.treatType || "bone"; // bone, biscuit, jerky
        this.treatColor = options.treatColor || { r: 200, g: 160, b: 100, a: 255 };
        this.hasCrumbs = options.hasCrumbs || true;
        this.crumbRate = options.crumbRate || 0.05;
        this.isBroken = options.isBroken || false;
        this.breakFactor = options.breakFactor || 0;
        
        // Override update and render
        this.customUpdateFn = this.updateTreat;
        this.customRenderFn = this.renderTreat;
    }
    
    updateTreat(particle, deltaTime) {
        // Apply base physics
        particle.applyPhysics(deltaTime);
        
        // Update rotation
        particle.rotation += particle.rotationSpeed * deltaTime;
        
        // Handle breaking animation if broken
        if (particle.isBroken) {
        particle.breakFactor = Math.min(1, particle.breakFactor + 0.02 * deltaTime);
        }
        
        // Emit crumbs
        if (particle.hasCrumbs && Math.random() < particle.crumbRate * deltaTime) {
        this.emitCrumb(particle);
        }
        
        // Update opacity
        particle.opacity -= particle.opacityDecay * deltaTime;
        particle.opacity = Math.max(0, Math.min(1, particle.opacity));
    }
    
    emitCrumb(particle) {
        // Create a small crumb particle
        const crumb = new ParticleBase({
        x: particle.x + (Math.random() - 0.5) * particle.size,
        y: particle.y + (Math.random() - 0.5) * particle.size,
        vx: particle.vx + (Math.random() - 0.5) * 1,
        vy: particle.vy + (Math.random() - 0.5) * 1,
        size: particle.size * 0.15 * Math.random(),
        color: {
            r: particle.treatColor.r * 0.8,
            g: particle.treatColor.g * 0.8,
            b: particle.treatColor.b * 0.8,
            a: 255
        },
        opacity: particle.opacity * 0.7,
        gravity: particle.gravity * 0.5,
        drag: particle.drag * 1.2,
        lifespan: 30 + Math.random() * 20,
        opacityDecay: 0.03,
        isCircular: true
        });
        
        animationState.particles.push(crumb);
    }
    
    renderTreat(particle, imageData) {
        // Render based on treat type
        switch (particle.treatType) {
        case "bone":
            this.renderBoneTreat(particle, imageData);
            break;
            
        case "biscuit":
            this.renderBiscuitTreat(particle, imageData);
            break;
            
        case "jerky":
            this.renderJerkyTreat(particle, imageData);
            break;
            
        default:
            this.renderBoneTreat(particle, imageData);
        }
    }
    
    renderBoneTreat(particle, imageData) {
        const baseSize = particle.size;
        const endSize = baseSize * 0.6;
        const midWidth = baseSize * 0.25;
        const midLength = baseSize;
        
        // Calculate bone end positions
        const endDist = midLength / 2;
        const cos = Math.cos(particle.rotation);
        const sin = Math.sin(particle.rotation);
        
        // Handle broken bone
        if (particle.isBroken && particle.breakFactor > 0) {
        const breakOffset = particle.breakFactor * baseSize * 0.3;
        const rotOffset = particle.breakFactor * 0.3;
        
        // First half of bone
        drawOval(
            imageData,
            particle.x - cos * (endDist + breakOffset),
            particle.y - sin * (endDist + breakOffset),
            endSize,
            endSize,
            particle.treatColor,
            particle.opacity,
            particle.rotation + Math.PI/2 - rotOffset
        );
        
        drawRectangle(
            imageData,
            particle.x - cos * breakOffset * 0.5,
            particle.y - sin * breakOffset * 0.5,
            midLength * 0.5 - breakOffset,
            midWidth,
            particle.treatColor,
            particle.opacity,
            particle.rotation - rotOffset * 0.5
        );
        
        // Second half of bone
        drawOval(
            imageData,
            particle.x + cos * (endDist + breakOffset),
            particle.y + sin * (endDist + breakOffset),
            endSize,
            endSize,
            particle.treatColor,
            particle.opacity,
            particle.rotation + Math.PI/2 + rotOffset
        );
        
        drawRectangle(
            imageData,
            particle.x + cos * breakOffset * 0.5,
            particle.y + sin * breakOffset * 0.5,
            midLength * 0.5 - breakOffset,
            midWidth,
            particle.treatColor,
            particle.opacity,
            particle.rotation + rotOffset * 0.5
        );
        } else {
        // Intact bone
        // End 1
        drawOval(
            imageData,
            particle.x - cos * endDist,
            particle.y - sin * endDist,
            endSize,
            endSize,
            particle.treatColor,
            particle.opacity,
            particle.rotation + Math.PI/2
        );
        
        // End 2
        drawOval(
            imageData,
            particle.x + cos * endDist,
            particle.y + sin * endDist,
            endSize,
            endSize,
            particle.treatColor,
            particle.opacity,
            particle.rotation + Math.PI/2
        );
        
        // Middle section
        drawRectangle(
            imageData,
            particle.x,
            particle.y,
            midLength,
            midWidth,
            particle.treatColor,
            particle.opacity,
            particle.rotation
        );
        }
    }
    
    renderBiscuitTreat(particle, imageData) {
        // Draw a simple biscuit shape (rounded square)
        drawRoundedRectangle(
        imageData,
        particle.x,
        particle.y,
        particle.size,
        particle.size * 0.8,
        particle.size * 0.2,
        particle.treatColor,
        particle.opacity,
        particle.rotation
        );
        
        // Add some texture details
        const details = 5;
        const detailSize = particle.size * 0.12;
        const detailColor = {
        r: particle.treatColor.r * 0.9,
        g: particle.treatColor.g * 0.9,
        b: particle.treatColor.b * 0.9,
        a: 255
        };
        
        for (let i = 0; i < details; i++) {
        const angle = (i / details) * Math.PI * 2 + particle.rotation;
        const distance = particle.size * 0.3;
        
        drawOval(
            imageData,
            particle.x + Math.cos(angle) * distance,
            particle.y + Math.sin(angle) * distance,
            detailSize,
            detailSize,
            detailColor,
            particle.opacity * 0.7,
            particle.rotation
        );
        }
    }
    
    renderJerkyTreat(particle, imageData) {
        // Jerky is an irregular strip
        const jerkyLength = particle.size * 1.5;
        const jerkyWidth = particle.size * 0.4;
        const waveFrequency = 6;
        const waveAmplitude = jerkyWidth * 0.3;
        
        // Calculate points along the jerky strip
        const points = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = -jerkyLength/2 + t * jerkyLength;
        const waveY = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
        const edgeVariation = (Math.random() - 0.5) * jerkyWidth * 0.3;
        
        points.push({
            x: x,
            y: jerkyWidth/2 + waveY + edgeVariation
        });
        
        points.push({
            x: x,
            y: -jerkyWidth/2 + waveY - edgeVariation
        });
        }
        
        // Transform points
        const cos = Math.cos(particle.rotation);
        const sin = Math.sin(particle.rotation);
        
        for (let i = 0; i < points.length; i++) {
        const x = points[i].x;
        const y = points[i].y;
        
        // Rotate
        points[i].x = x * cos - y * sin + particle.x;
        points[i].y = x * sin + y * cos + particle.y;
        }
        
        // Draw as a filled polygon
        drawPolygon(
        imageData,
        points,
        particle.treatColor,
        particle.opacity
        );
        
        // Add some texture lines
        const textureLines = 5;
        const textureColor = {
        r: particle.treatColor.r * 0.8,
        g: particle.treatColor.g * 0.8,
        b: particle.treatColor.b * 0.8,
        a: 255
        };
        
        for (let i = 0; i < textureLines; i++) {
        const t = 0.2 + (i / textureLines) * 0.6;
        const x1 = -jerkyLength/2 + t * jerkyLength;
        const x2 = x1 + jerkyLength * 0.1;
        
        const y1 = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
        const y2 = Math.sin((t + 0.1) * Math.PI * waveFrequency) * waveAmplitude;
        
        // Transform line points
        const tx1 = x1 * cos - y1 * sin + particle.x;
        const ty1 = x1 * sin + y1 * cos + particle.y;
        const tx2 = x2 * cos - y2 * sin + particle.x;
        const ty2 = x2 * sin + y2 * cos + particle.y;
        
        drawLine(
            imageData,
            tx1, ty1,
            tx2, ty2,
            jerkyWidth * 0.1,
            textureColor,
            particle.opacity * 0.7
        );
        }
    }
    }

    // ==================== PARTICLE CREATION FUNCTIONS ====================

    // Create initial dog silhouette particles
    function createInitialDogSilhouette(x, y, breedType) {
    const breed = breedType || animationState.selectedBreed;
    
    const silhouette = new DogSilhouetteParticle({
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        size: 40 * (breed.silhouetteScale || 1),
        color: breed.color,
        opacity: 0.9,
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
        drag: 0,
        type: "silhouette",
        breedType: breed,
        lifespan: ANIMATION_PHASES.INTRO.duration + ANIMATION_PHASES.BUILDUP.duration,
        pulsate: true
    });
    
    return silhouette;
    }

    // Create paw print particles
    function createPawPrintParticle(x, y, options = {}) {
    const defaultColor = {
        r: 120 + Math.random() * 30,
        g: 80 + Math.random() * 20,
        b: 40 + Math.random() * 30,
        a: 255
    };
    
    const paw = new PawPrintParticle({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * 2,
        vy: options.vy || (Math.random() - 0.5) * 2 - 1,
        size: options.size || 8 + Math.random() * 4,
        padColor: options.color || defaultColor,
        opacity: options.opacity || 0.7 + Math.random() * 0.3,
        rotation: options.rotation || Math.random() * Math.PI * 2,
        rotationSpeed: options.rotationSpeed || (Math.random() - 0.5) * 0.05,
        gravity: options.gravity || PHYSICS.GRAVITY.LIGHT,
        drag: options.drag || PHYSICS.DRAG.MEDIUM,
        elasticity: options.elasticity || PHYSICS.ELASTICITY.LOW,
        lifespan: options.lifespan || 80 + Math.random() * 40,
        opacityDecay: options.opacityDecay || 0.01,
        pawType: options.pawType || "dog",
        toeSeparation: options.toeSeparation || 0.8 + Math.random() * 0.4,
        type: "pawprint",
        isLeftPaw: options.isLeftPaw !== undefined ? options.isLeftPaw : Math.random() > 0.5
    });
    
    return paw;
    }

    // Create toy particles
    function createToyParticle(x, y, options = {}) {
    const toyTypes = ["ball", "bone", "frisbee"];
    const toyType = options.toyType || toyTypes[Math.floor(Math.random() * toyTypes.length)];
    
    let mainColor, secondaryColor;
    
    switch (toyType) {
        case "ball":
        mainColor = options.color || { r: 230, g: 230, b: 0, a: 255 }; // Tennis ball yellow
        secondaryColor = options.secondaryColor || { r: 255, g: 255, b: 255, a: 255 }; // White seam
        break;
        case "bone":
        mainColor = options.color || { r: 220, g: 220, b: 220, a: 255 }; // White bone
        secondaryColor = null;
        break;
        case "frisbee":
        mainColor = options.color || { r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255, a: 255 };
        secondaryColor = options.secondaryColor || { r: 220, g: 220, b: 220, a: 255 }; // White circle
        break;
        default:
        mainColor = options.color || { r: 255, g: 0, b: 0, a: 255 }; // Default red
        secondaryColor = null;
    }
    
    const toy = new DogToyParticle({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * 5,
        vy: options.vy || (Math.random() - 0.5) * 5 - 2,
        size: options.size || 12 + Math.random() * 8,
        toyColor: mainColor,
        secondaryColor: secondaryColor,
        opacity: options.opacity || 0.9,
        rotation: options.rotation || Math.random() * Math.PI * 2,
        rotationSpeed: options.rotationSpeed || (Math.random() - 0.5) * 0.1,
        gravity: options.gravity || PHYSICS.GRAVITY.STANDARD,
        drag: options.drag || PHYSICS.DRAG.LOW,
        elasticity: options.elasticity || PHYSICS.ELASTICITY.MEDIUM,
        lifespan: options.lifespan || 150 + Math.random() * 100,
        opacityDecay: options.opacityDecay || 0.005,
        toyType: toyType,
        hasSqueak: options.hasSqueak !== undefined ? options.hasSqueak : Math.random() > 0.6,
        type: "toy"
    });
    
    return toy;
    }

    // Create treat particles
    function createTreatParticle(x, y, options = {}) {
    const treatTypes = ["bone", "biscuit", "jerky"];
    const treatType = options.treatType || treatTypes[Math.floor(Math.random() * treatTypes.length)];
    
    // Get appropriate color based on treat type
    let treatColor;
    switch (treatType) {
        case "bone":
        treatColor = options.color || { r: 240, g: 230, b: 200, a: 255 }; // Bone white
        break;
        case "biscuit":
        treatColor = options.color || { r: 200, g: 150, b: 100, a: 255 }; // Biscuit brown
        break;
        case "jerky":
        treatColor = options.color || { r: 160, g: 80, b: 60, a: 255 }; // Jerky reddish-brown
        break;
        default:
        treatColor = options.color || { r: 200, g: 150, b: 100, a: 255 }; // Default brown
    }
    
    const treat = new DogTreatParticle({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * 4,
        vy: options.vy || (Math.random() - 0.5) * 4 - 1,
        size: options.size || 10 + Math.random() * 6,
        treatColor: treatColor,
        opacity: options.opacity || 0.9,
        rotation: options.rotation || Math.random() * Math.PI * 2,
        rotationSpeed: options.rotationSpeed || (Math.random() - 0.5) * 0.1,
        gravity: options.gravity || PHYSICS.GRAVITY.STANDARD,
        drag: options.drag || PHYSICS.DRAG.MEDIUM,
        elasticity: options.elasticity || PHYSICS.ELASTICITY.LOW,
        lifespan: options.lifespan || 100 + Math.random() * 80,
        opacityDecay: options.opacityDecay || 0.008,
        treatType: treatType,
        hasCrumbs: options.hasCrumbs !== undefined ? options.hasCrumbs : Math.random() > 0.3,
        crumbRate: options.crumbRate || 0.03 + Math.random() * 0.04,
        isBroken: options.isBroken || Math.random() > 0.7,
        type: "treat"
    });
    
    return treat;
    }

    // Create standard particle
    function createStandardParticle(x, y, options = {}) {
    const size = options.size || (options.isLarge ? 8 + Math.random() * 6 : 2 + Math.random() * 3);
    const color = options.color || getRandomColorFromPalette(animationState.palette);
    
    const particle = new ParticleBase({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * (options.speed || 6),
        vy: options.vy || (Math.random() - 0.5) * (options.speed || 6) - (options.isLarge ? 2 : 1),
        size: size,
        color: color,
        opacity: options.opacity || 0.8 + Math.random() * 0.2,
        isCircular: options.isCircular !== undefined ? options.isCircular : Math.random() > 0.3,
        rotation: options.rotation || Math.random() * Math.PI * 2,
        rotationSpeed: options.rotationSpeed || (Math.random() - 0.5) * (options.isLarge ? 0.1 : 0.2),
        gravity: options.gravity || (options.isLarge ? PHYSICS.GRAVITY.STANDARD : PHYSICS.GRAVITY.LIGHT),
        drag: options.drag || (options.isLarge ? PHYSICS.DRAG.MEDIUM : PHYSICS.DRAG.LOW),
        elasticity: options.elasticity || (options.isLarge ? PHYSICS.ELASTICITY.LOW : PHYSICS.ELASTICITY.NONE),
        lifespan: options.lifespan || (options.isLarge ? 100 + Math.random() * 50 : 60 + Math.random() * 40),
        opacityDecay: options.opacityDecay || (options.isLarge ? 0.008 : 0.015),
        type: options.isLarge ? "large" : "small",
        noiseLevel: options.noiseLevel || Math.random(),
        scaleY: options.scaleY || 1,
        glow: options.glow || 0,
        shape: options.shape || null
    });
    
    return particle;
    }

    // Create shaped particles
    function createShapedParticle(x, y, shape, options = {}) {
    const shapeConfig = SPECIAL_SHAPES[shape];
    if (!shapeConfig) return createStandardParticle(x, y, options);
    
    const size = options.size || 10 + Math.random() * 10;
    const adjustedSize = size * shapeConfig.sizeMultiplier;
    
    const particle = new ParticleBase({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * 4,
        vy: options.vy || (Math.random() - 0.5) * 4 - 2,
        size: adjustedSize,
        color: options.color || getRandomColorFromPalette(animationState.palette),
        opacity: options.opacity || 0.9,
        rotation: options.rotation || Math.random() * Math.PI * 2,
        rotationSpeed: options.rotationSpeed || (Math.random() - 0.5) * 0.1,
        gravity: options.gravity || PHYSICS.GRAVITY.STANDARD,
        drag: options.drag || PHYSICS.DRAG.MEDIUM,
        elasticity: options.elasticity || PHYSICS.ELASTICITY.LOW,
        lifespan: options.lifespan || 120 + Math.random() * 80,
        opacityDecay: options.opacityDecay || 0.007,
        shape: shape,
        isCircular: false,
        customRenderFn: (particle, ctx, imageData) => {
        shapeConfig.drawFn(imageData, particle.x, particle.y, particle.size, particle.color, particle.opacity, particle.rotation);
        },
        type: "shaped",
        subtype: shape
    });
    
    return particle;
    }

    // Create secondary particles (emitted by other particles)
    function createSecondaryParticle(sourceParticle) {
    // Determine the type of secondary particle based on the source
    let type = "small";
    
    switch (sourceParticle.type) {
        case "toy":
        // Toys emit tiny pieces or sparkles
        if (sourceParticle.toyType === "ball" && Math.random() < 0.3) {
            // Fuzz from tennis ball
            return createStandardParticle(
            sourceParticle.x,
            sourceParticle.y,
            {
                size: 1 + Math.random(),
                color: { r: 230, g: 230, b: 30, a: 255 },
                opacity: 0.6,
                isCircular: true,
                speed: 1,
                gravity: PHYSICS.GRAVITY.LIGHT * 0.5,
                drag: PHYSICS.DRAG.HIGH,
                lifespan: 20 + Math.random() * 15,
                opacityDecay: 0.03
            }
            );
        } else {
            // Generic sparkle
            return createSparkleParticle(sourceParticle.x, sourceParticle.y);
        }
        
        case "treat":
        // Treats emit crumbs
        return createStandardParticle(
            sourceParticle.x + (Math.random() - 0.5) * sourceParticle.size * 0.5,
            sourceParticle.y + (Math.random() - 0.5) * sourceParticle.size * 0.5,
            {
            size: sourceParticle.size * 0.1 * Math.random(),
            color: {
                r: sourceParticle.treatColor.r * 0.9,
                g: sourceParticle.treatColor.g * 0.9,
                b: sourceParticle.treatColor.b * 0.9,
                a: 255
            },
            opacity: sourceParticle.opacity * 0.8,
            isCircular: Math.random() > 0.3,
            speed: 1.5,
            gravity: PHYSICS.GRAVITY.STANDARD,
            drag: PHYSICS.DRAG.MEDIUM,
            lifespan: 30 + Math.random() * 20,
            opacityDecay: 0.03
            }
        );
        
        case "silhouette":
        // Silhouettes emit energy particles during buildup
        const particleColor = getRandomColorFromPalette(animationState.palette);
        
        return createStandardParticle(
            sourceParticle.x + (Math.random() - 0.5) * sourceParticle.size,
            sourceParticle.y + (Math.random() - 0.5) * sourceParticle.size,
            {
            size: 2 + Math.random() * 3,
            color: particleColor,
            opacity: 0.7,
            isCircular: true,
            speed: 2 + Math.random() * 2,
            gravity: -0.05, // Float upward slightly
            drag: PHYSICS.DRAG.LOW,
            lifespan: 30 + Math.random() * 20,
            opacityDecay: 0.03,
            glow: 2
            }
        );
        
        default:
        // Generic small particle
        return createStandardParticle(
            sourceParticle.x,
            sourceParticle.y,
            {
            size: sourceParticle.size * 0.3 * Math.random(),
            isLarge: false,
            color: sourceParticle.color,
            opacity: sourceParticle.opacity * 0.7,
            speed: 2
            }
        );
    }
    }

    // Create sparkle particle
    function createSparkleParticle(x, y, options = {}) {
    const size = options.size || 1 + Math.random() * 2;
    const color = options.color || {
        r: 255,
        g: 255,
        b: 255 - Math.random() * 50,
        a: 255
    };
    
    const particle = new ParticleBase({
        x: x,
        y: y,
        vx: options.vx || (Math.random() - 0.5) * 3,
        vy: options.vy || (Math.random() - 0.5) * 3 - 1,
        size: size,
        color: color,
        opacity: options.opacity || 0.9,
        isCircular: true,
        rotation: 0,
        rotationSpeed: 0,
        gravity: options.gravity || PHYSICS.GRAVITY.LIGHT * 0.5,
        drag: options.drag || PHYSICS.DRAG.HIGH,
        lifespan: options.lifespan || 30 + Math.random() * 20,
        opacityDecay: options.opacityDecay || 0.03,
        glow: 3,
        glowColor: color,
        type: "sparkle"
    });
    
    return particle;
    }

    // ==================== ANIMATION PHASE MANAGEMENT ====================

    // Initialize animation phase
    function initializeAnimationPhase(phase) {
    const width = 600; // Assuming canvas width
    const height = 400; // Assuming canvas height
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear existing particles if needed
    if (phase === "INTRO") {
        animationState.particles = [];
    }
    
    // Set the current phase and start time
    animationState.phase = phase;
    animationState.currentPhaseStartTime = animationState.currentIteration;
    
    switch (phase) {
        case "INTRO":
        // Create dog silhouette
        const silhouette = createInitialDogSilhouette(centerX, centerY);
        animationState.particles.push(silhouette);
        
        // Create paw prints leading to the dog
        const pawCount = PARTICLE_COUNTS.INTRO.PAWPRINTS;
        for (let i = 0; i < pawCount; i++) {
            const distance = 80 + i * 20;
            const angle = Math.PI * (0.7 + Math.random() * 0.1); // Coming from left side
            const x = centerX - Math.cos(angle) * distance;
            const y = centerY - Math.sin(angle) * distance;
            
            const paw = createPawPrintParticle(x, y, {
            vx: 0,
            vy: 0,
            rotation: angle + Math.PI/2,
            opacity: 0.8 - i * 0.1,
            isLeftPaw: i % 2 === 0
            });
            
            animationState.particles.push(paw);
        }
        break;
        
        case "BUILDUP":
        // The main silhouette should already be there from INTRO
        // Add energy buildup particles
        for (let silhouette of animationState.particles) {
            if (silhouette.type === "silhouette") {
            // Make silhouette emit particles
            silhouette.emitsSecondaryParticles = true;
            silhouette.emissionRate = 0.3;
            silhouette.pulsate = true;
            
            // Add shake effect that increases
            silhouette.customUpdateFn = function(particle, deltaTime) {
                // Original update
                particle.updateSilhouette(particle, deltaTime);
                
                // Add shake effect that increases with time
                const phaseProgress = (animationState.currentIteration - animationState.currentPhaseStartTime) / ANIMATION_PHASES.BUILDUP.duration;
                const shakeAmount = phaseProgress * 3;
                
                particle.x += (Math.random() - 0.5) * shakeAmount;
                particle.y += (Math.random() - 0.5) * shakeAmount;
            };
            }
        }
        break;
        
        case "EXPLOSION":
        // Create explosion of particles
        const largeCount = PARTICLE_COUNTS.MAIN.LARGE_PARTICLES;
        const smallCount = PARTICLE_COUNTS.MAIN.SMALL_PARTICLES;
        const boneCount = PARTICLE_COUNTS.MAIN.BONE_PARTICLES;
        const ballCount = PARTICLE_COUNTS.MAIN.BALL_PARTICLES;
        const sparkleCount = PARTICLE_COUNTS.MAIN.SPARKLE_PARTICLES;
        
        // Create large particles
        for (let i = 0; i < largeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            
            const particle = createStandardParticle(
            centerX,
            centerY,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                isLarge: true,
                color: getRandomColorFromPalette(animationState.palette)
            }
            );
            
            animationState.particles.push(particle);
        }
        
        // Create small particles
        for (let i = 0; i < smallCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 8 + Math.random() * 15;
            
            const particle = createStandardParticle(
            centerX,
            centerY,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                isLarge: false,
                color: getRandomColorFromPalette(animationState.palette)
            }
            );
            
            animationState.particles.push(particle);
        }
        
        // Create paw print particles
        for (let i = 0; i < pawCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            
            const paw = createPawPrintParticle(
            centerX,
            centerY,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 8,
                lifespan: 100 + Math.random() * 100
            }
            );
            
            animationState.particles.push(paw);
        }
        
        // Create bone particles
        for (let i = 0; i < boneCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            
            const treat = createTreatParticle(
            centerX,
            centerY,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                treatType: "bone"
            }
            );
            
            animationState.particles.push(treat);
        }
        
        // Create ball/toy particles
        for (let i = 0; i < ballCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            
            const toy = createToyParticle(
            centerX,
            centerY,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            }
            );
            
            animationState.particles.push(toy);
        }
        
        // Create sparkle particles
        for (let i = 0; i < sparkleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 15;
            const distance = Math.random() * 50;
            
            const sparkle = createSparkleParticle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                lifespan: 40 + Math.random() * 30
            }
            );
            
            animationState.particles.push(sparkle);
        }
        
        // Create some shaped particles
        const shapeKeys = Object.keys(SPECIAL_SHAPES);
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 6;
            const shape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
            
            const shapedParticle = createShapedParticle(
            centerX,
            centerY,
            shape,
            {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            }
            );
            
            animationState.particles.push(shapedParticle);
        }
        break;
        
        case "SETTLE":
        // No new particles to create here, just let existing ones settle
        // Add gravity to any floating particles
        for (let particle of animationState.particles) {
            if (particle.gravity < 0) particle.gravity = PHYSICS.GRAVITY.LIGHT;
            
            // Add some fade
            particle.opacityDecay *= 1.5;
        }
        break;
    }
    }

    // Update current animation phase based on time
    function updateAnimationPhase() {
    const currentTime = animationState.currentIteration;
    
    // Phase timing calculations
    const introEnd = ANIMATION_PHASES.INTRO.duration;
    const buildupEnd = introEnd + ANIMATION_PHASES.BUILDUP.duration;
    const explosionEnd = buildupEnd + ANIMATION_PHASES.EXPLOSION.duration;
    const settleEnd = explosionEnd + ANIMATION_PHASES.SETTLE.duration;
    
    // Determine current phase
    let newPhase;
    
    if (currentTime < introEnd) {
        newPhase = "INTRO";
    } else if (currentTime < buildupEnd) {
        newPhase = "BUILDUP";
    } else if (currentTime < explosionEnd) {
        newPhase = "EXPLOSION";
    } else if (currentTime < settleEnd) {
        newPhase = "SETTLE";
    } else {
        // Animation complete
        newPhase = null;
    }
    
    // If phase changed, initialize the new phase
    if (newPhase !== animationState.phase) {
        if (newPhase) {
        initializeAnimationPhase(newPhase);
        } else {
        // Animation complete, reset
        animationState.currentIteration = 0;
        initializeAnimationPhase("INTRO");
        }
    }
    }

    // ==================== DRAWING UTILITIES ====================

    // Draw a pixel at (x, y) with given color and opacity
    function drawPixel(imageData, x, y, color, opacity) {
    x = Math.floor(x);
    y = Math.floor(y);
    
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
        return;
    }
    
    const index = (y * imageData.width + x) * 4;
    
    imageData.data[index] = Math.round(
        color.r * opacity + imageData.data[index] * (1 - opacity)
    );
    imageData.data[index + 1] = Math.round(
        color.g * opacity + imageData.data[index + 1] * (1 - opacity)
    );
    imageData.data[index + 2] = Math.round(
        color.b * opacity + imageData.data[index + 2] * (1 - opacity)
    );
    imageData.data[index + 3] = Math.max(imageData.data[index + 3], Math.round(opacity * 255));
    }

    // Draw a circle at (x, y) with given radius, color, and opacity
    function drawCircle(imageData, x, y, radius, color, opacity) {
    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(imageData.width - 1, Math.floor(x + radius));
    const top = Math.max(0, Math.floor(y - radius));
    const bottom = Math.min(imageData.height - 1, Math.floor(y + radius));
    
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
        const dx = px - x;
        const dy = py - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
            const edgeFactor = Math.min(1, (radius - distance) / radius);
            const finalOpacity = opacity * edgeFactor;
            
            drawPixel(imageData, px, py, color, finalOpacity);
        }
        }
    }
    }

    // Draw an oval at (x, y) with given width, height, color, opacity, and rotation
    function drawOval(imageData, x, y, width, height, color, opacity, rotation = 0) {
    const radiusX = width / 2;
    const radiusY = height / 2;
    
    const left = Math.max(0, Math.floor(x - radiusX - 1));
    const right = Math.min(imageData.width - 1, Math.floor(x + radiusX + 1));
    const top = Math.max(0, Math.floor(y - radiusY - 1));
    const bottom = Math.min(imageData.height - 1, Math.floor(y + radiusY + 1));
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
        // Calculate distance from center (accounting for rotation)
        const dx = px - x;
        const dy = py - y;
        
        // Rotate the point around the center
        const rotatedX = dx * cos + dy * sin;
        const rotatedY = -dx * sin + dy * cos;
        
        // Check if point is inside the oval
        const normalizedX = rotatedX / radiusX;
        const normalizedY = rotatedY / radiusY;
        const normalizedDistance = normalizedX * normalizedX + normalizedY * normalizedY;
        
        if (normalizedDistance <= 1) {
            // Calculate soft edge effect
            const edgeFactor = Math.min(1, (1 - normalizedDistance) * 2);
            const finalOpacity = opacity * edgeFactor;
            
            drawPixel(imageData, px, py, color, finalOpacity);
        }
        }
    }
    }

    // Draw a rectangle at (x, y) with given width, height, color, opacity, and rotation
    function drawRectangle(imageData, x, y, width, height, color, opacity, rotation = 0) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // Calculate the bounding box
    const maxRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
    
    const left = Math.max(0, Math.floor(x - maxRadius));
    const right = Math.min(imageData.width - 1, Math.floor(x + maxRadius));
    const top = Math.max(0, Math.floor(y - maxRadius));
    const bottom = Math.min(imageData.height - 1, Math.floor(y + maxRadius));
    
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
        // Calculate distance from center (accounting for rotation)
        const dx = px - x;
        const dy = py - y;
        
        // Rotate the point around the center
        const rotatedX = dx * cos + dy * sin;
        const rotatedY = -dx * sin + dy * cos;
        
        // Check if point is inside the rectangle
        if (Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight) {
            // Calculate distance to edge for soft edge effect
            const distX = halfWidth - Math.abs(rotatedX);
            const distY = halfHeight - Math.abs(rotatedY);
            const minDist = Math.min(distX, distY);
            
            // Apply soft edge effect for smoother appearance
            const edgeThreshold = 1.0;
            const edgeFactor = Math.min(1, minDist / edgeThreshold);
            const finalOpacity = opacity * edgeFactor;
            
            drawPixel(imageData, px, py, color, finalOpacity);
        }
        }
    }
    }

    // Draw a rounded rectangle
    function drawRoundedRectangle(imageData, x, y, width, height, radius, color, opacity, rotation = 0) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // Calculate the bounding box
    const maxRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight);
    
    const left = Math.max(0, Math.floor(x - maxRadius));
    const right = Math.min(imageData.width - 1, Math.floor(x + maxRadius));
    const top = Math.max(0, Math.floor(y - maxRadius));
    const bottom = Math.min(imageData.height - 1, Math.floor(y + maxRadius));
    
    const innerWidth = halfWidth - radius;
    const innerHeight = halfHeight - radius;
    
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
        // Calculate distance from center (accounting for rotation)
        const dx = px - x;
        const dy = py - y;
        
        // Rotate the point around the center
        const rotatedX = dx * cos + dy * sin;
        const rotatedY = -dx * sin + dy * cos;
        
        let inside = false;
        let edgeFactor = 1.0;
        
        // Check if point is inside the inner rectangle
        if (Math.abs(rotatedX) <= innerWidth && Math.abs(rotatedY) <= innerHeight) {
            inside = true;
        }
        // Check if point is in the corner regions
        else if (Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight) {
            // Calculate distance to corner
            const cornerX = rotatedX > 0 ? innerWidth : -innerWidth;
            const cornerY = rotatedY > 0 ? innerHeight : -innerHeight;
            
            const distToCorner = Math.sqrt(
            Math.pow(rotatedX - cornerX, 2) + 
            Math.pow(rotatedY - cornerY, 2)
            );
            
            if (distToCorner <= radius) {
            inside = true;
            edgeFactor = Math.min(1, (radius - distToCorner) / 2);
            }
        }
        
        if (inside) {
            const finalOpacity = opacity * edgeFactor;
            drawPixel(imageData, px, py, color, finalOpacity);
        }
        }
    }
    }

    // Draw a polygon from a list of points
    function drawPolygon(imageData, points, color, opacity) {
    // Find bounding box for optimization
    let minX = Number.MAX_SAFE_INTEGER;
    let maxX = Number.MIN_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;
    
    for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    
    minX = Math.max(0, Math.floor(minX));
    maxX = Math.min(imageData.width - 1, Math.ceil(maxX));
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(imageData.height - 1, Math.ceil(maxY));
    
    // Check each pixel in the bounding box
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
        if (pointInPolygon(x, y, points)) {
            // Calculate distance to edge for soft edge effect
            const distToEdge = distanceToPolygonEdge(x, y, points);
            const edgeWidth = 2.0;
            const edgeFactor = Math.min(1, distToEdge / edgeWidth);
            
            drawPixel(imageData, x, y, color, opacity * edgeFactor);
        }
        }
    }
    }

    // Check if a point is inside a polygon
    function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
    }

    // Calculate approximate distance from point to polygon edge
    function distanceToPolygonEdge(x, y, points) {
    let minDistance = Number.MAX_SAFE_INTEGER;
    
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        
        // Calculate distance to line segment
        const distance = distanceToLineSegment(x, y, xi, yi, xj, yj);
        minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
    }

    // Calculate distance from point to line segment
    function distanceToLineSegment(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
    }

    // Draw an arc
    function drawArc(imageData, x, y, radius, width, startAngle, endAngle, color, opacity, rotation = 0) {
    const innerRadius = radius - width / 2;
    const outerRadius = radius + width / 2;
    
    const left = Math.max(0, Math.floor(x - outerRadius));
    const right = Math.min(imageData.width - 1, Math.floor(x + outerRadius));
    const top = Math.max(0, Math.floor(y - outerRadius));
    const bottom = Math.min(imageData.height - 1, Math.floor(y + outerRadius));
    
    for (let py = top; py <= bottom; py++) {
        for (let px = left; px <= right; px++) {
        const dx = px - x;
        const dy = py - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance >= innerRadius && distance <= outerRadius) {
            // Calculate angle of the point
            let angle = Math.atan2(dy, dx) + rotation;
            while (angle < 0) angle += Math.PI * 2;
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            
            // Check if angle is within the arc range
            let angleInRange = false;
            if (startAngle <= endAngle) {
            angleInRange = angle >= startAngle && angle <= endAngle;
            } else {
            angleInRange = angle >= startAngle || angle <= endAngle;
            }
            
            if (angleInRange) {
            // Calculate edge fade
            const edgeDist = Math.min(
                Math.abs(distance - innerRadius),
                Math.abs(distance - outerRadius)
            );
            const edgeFactor = Math.min(1, edgeDist / (width * 0.2));
            
            drawPixel(imageData, px, py, color, opacity * edgeFactor);
            }
        }
        }
    }
    }

    // Draw a line
    function drawLine(imageData, x1, y1, x2, y2, width, color, opacity) {
    // Calculate line length
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    // Normalize direction
    const nx = dx / length;
    const ny = dy / length;
    
    // Perpendicular direction
    const px = -ny;
    const py = nx;
    
    // Calculate corners of the line rectangle
    const halfWidth = width / 2;
    const points = [
        { x: x1 + px * halfWidth, y: y1 + py * halfWidth },
        { x: x1 - px * halfWidth, y: y1 - py * halfWidth },
        { x: x2 - px * halfWidth, y: y2 - py * halfWidth },
        { x: x2 + px * halfWidth, y: y2 + py * halfWidth }
    ];
    
    // Draw as polygon
    drawPolygon(imageData, points, color, opacity);
    }

    // Draw paw print shape
    function drawPawPrint(imageData, x, y, size, color, opacity, rotation) {
    const padSize = size * 0.6;
    const toeSize = size * 0.3;
    const toeSeparation = 0.9;
    
    // Draw the main pad
    drawOval(
        imageData,
        x,
        y + padSize * 0.2,
        padSize,
        padSize * 0.8,
        color,
        opacity,
        rotation
    );
    
    // Draw the toes
    const toeOffsetY = -padSize * 0.5;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // Top row - two toes
    for (let i = 0; i < 2; i++) {
        const toeOffsetX = (i * 2 - 0.5) * toeSize * toeSeparation;
        const rotatedX = toeOffsetX * cos - toeOffsetY * sin;
        const rotatedY = toeOffsetX * sin + toeOffsetY * cos;
        
        drawOval(
        imageData,
        x + rotatedX,
        y + rotatedY,
        toeSize,
        toeSize,
        color,
        opacity,
        rotation
        );
    }
    
    // Bottom row - two toes
    for (let i = 0; i < 2; i++) {
        const toeOffsetX = (i * 2 - 0.5) * toeSize * toeSeparation;
        const offsetY = toeOffsetY - toeSize * 0.8;
        const rotatedX = toeOffsetX * cos - offsetY * sin;
        const rotatedY = toeOffsetX * sin + offsetY * cos;
        
        drawOval(
        imageData,
        x + rotatedX,
        y + rotatedY,
        toeSize,
        toeSize,
        color,
        opacity,
        rotation
        );
    }
    }

    // Draw bone shape
    function drawBoneShape(imageData, x, y, size, color, opacity, rotation) {
    const baseSize = size;
    const endSize = baseSize * 0.7;
    const midWidth = baseSize * 0.3;
    const midLength = baseSize * 1.2;
    
    // Calculate bone end positions
    const endDist = midLength / 2;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // End 1
    drawOval(
        imageData,
        x - cos * endDist,
        y - sin * endDist,
        endSize,
        endSize,
        color,
        opacity,
        rotation + Math.PI/2
    );
    
    // End 2
    drawOval(
        imageData,
        x + cos * endDist,
        y + sin * endDist,
        endSize,
        endSize,
        color,
        opacity,
        rotation + Math.PI/2
    );
    
    // Middle section
    drawRectangle(
        imageData,
        x,
        y,
        midLength,
        midWidth,
        color,
        opacity,
        rotation
    );
    }

    // Draw tennis ball shape
    function drawTennisBallShape(imageData, x, y, size, color, opacity, rotation) {
    // Main ball
    drawOval(
        imageData,
        x,
        y,
        size,
        size,
        color,
        opacity,
        rotation
    );
    
    // Draw the seam on the tennis ball
    const seamColor = {
        r: 255,
        g: 255,
        b: 255,
        a: 255
    };
    
    const seamRadius = size * 0.7;
    const seamWidth = size * 0.15;
    
    drawArc(
        imageData,
        x,
        y,
        seamRadius,
        seamWidth,
        0,
        Math.PI * 2,
        seamColor,
        opacity * 0.9,
        rotation
    );
    }

    // Draw frisbee shape
    function drawFrisbeeShape(imageData, x, y, size, color, opacity, rotation) {
    // Main frisbee disc
    drawOval(
        imageData,
        x,
        y,
        size,
        size * (0.2 + Math.abs(Math.sin(rotation)) * 0.8),
        color,
        opacity,
        rotation
    );
    
    // Inner circle
    const innerColor = {
        r: 255,
        g: 255,
        b: 255,
        a: 255
    };
    
    drawOval(
        imageData,
        x,
        y,
        size * 0.5,
        size * (0.1 + Math.abs(Math.sin(rotation)) * 0.4),
        innerColor,
        opacity * 0.9,
        rotation
    );
    }

    // Draw dog head shape (simplified)
    function drawDogHeadShape(imageData, x, y, size, color, opacity, rotation) {
    // Main head (oval)
    drawOval(
        imageData,
        x,
        y,
        size,
        size * 0.9,
        color,
        opacity,
        rotation
    );
    
    // Snout
    const snoutColor = {
        r: color.r * 0.9,
        g: color.g * 0.9,
        b: color.b * 0.9,
        a: color.a
    };
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const snoutOffset = size * 0.5;
    
    drawOval(
        imageData,
        x + cos * snoutOffset,
        y + sin * snoutOffset,
        size * 0.5,
        size * 0.4,
        snoutColor,
        opacity,
        rotation
    );
    
    // Nose
    const noseColor = {
        r: 50,
        g: 50,
        b: 50,
        a: 255
    };
    
    const noseOffset = size * 0.7;
    
    drawOval(
        imageData,
        x + cos * noseOffset,
        y + sin * noseOffset,
        size * 0.15,
        size * 0.12,
        noseColor,
        opacity,
        rotation
    );
    
    // Ears
    const ear1Angle = rotation - Math.PI/4;
    const ear2Angle = rotation + Math.PI/4;
    const earOffset = size * 0.5;
    
    drawOval(
        imageData,
        x + Math.cos(ear1Angle) * earOffset,
        y + Math.sin(ear1Angle) * earOffset,
        size * 0.4,
        size * 0.6,
        color,
        opacity,
        ear1Angle
    );
    
    drawOval(
        imageData,
        x + Math.cos(ear2Angle) * earOffset,
        y + Math.sin(ear2Angle) * earOffset,
        size * 0.4,
        size * 0.6,
        color,
        opacity,
        ear2Angle
    );
    
    // Eyes
    const eyeColor = {
        r: 40,
        g: 40,
        b: 40,
        a: 255
    };
    
    const eyeOffset = size * 0.3;
    const eyeSpacing = size * 0.2;
    const eyeAngle = rotation + Math.PI/2;
    
    drawCircle(
        imageData,
        x + cos * eyeOffset + Math.cos(eyeAngle) * eyeSpacing,
        y + sin * eyeOffset + Math.sin(eyeAngle) * eyeSpacing,
        size * 0.08,
        eyeColor,
        opacity
    );
    
    drawCircle(
        imageData,
        x + cos * eyeOffset - Math.cos(eyeAngle) * eyeSpacing,
        y + sin * eyeOffset - Math.sin(eyeAngle) * eyeSpacing,
        size * 0.08,
        eyeColor,
        opacity
    );
    }

    // ==================== UTILITY FUNCTIONS ====================

    // Generate dog silhouette data for a specific breed
    function generateDogSilhouette(breed) {
    // This would be more complex in a real implementation
    // For now, return a simplified set of points representing a dog silhouette
    
    // Simple parameters that change based on breed
    const headSize = breed.size || 1;
    const bodyLength = breed.size * 1.2 || 1.2;
    const legLength = breed.size * 0.8 || 0.8;
    const earSize = (breed === DOG_BREEDS.GOLDEN_RETRIEVER || breed === DOG_BREEDS.HUSKY) ? 0.6 : 0.4;
    const tailLength = (breed === DOG_BREEDS.CORGI || breed === DOG_BREEDS.DACHSHUND) ? 0.6 : 1.0;
    
    // Generate points for each part of the dog
    const bodyPoints = [];
    const tailPoints = [];
    const headPoints = [];
    const earPoints = [];
    const legPoints = [];
    
    // Body points
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = Math.cos(angle) * bodyLength;
        const y = Math.sin(angle) * bodyLength * 0.6;
        
        bodyPoints.push({
        x: x,
        y: y,
        type: "body"
        });
    }
    
    // Tail points
    for (let i = 0; i < 10; i++) {
        const t = i / 9;
        const angle = Math.PI * 0.3;
        const length = tailLength * (1 - t);
        
        const x = -bodyLength + Math.cos(angle) * t * tailLength * 1.5;
        const y = Math.sin(angle) * t * tailLength - t * t * 1;
        
        tailPoints.push({
        x: x,
        y: y,
        type: "tail",
        t: t
        });
    }
    
    // Head points
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = bodyLength + Math.cos(angle) * headSize * 0.6;
        const y = Math.sin(angle) * headSize * 0.5;
        
        headPoints.push({
        x: x,
        y: y,
        type: "head"
        });
    }
    
    // Snout points
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI + Math.PI/2;
        const x = bodyLength + Math.cos(angle) * headSize * 0.4 + headSize * 0.5;
        const y = Math.sin(angle) * headSize * 0.3;
        
        headPoints.push({
        x: x,
        y: y,
        type: "snout"
        });
    }
    
    // Mouth point
    headPoints.push({
        x: bodyLength + headSize * 0.7,
        y: headSize * 0.1,
        type: "mouth"
    });
    
    // Nose point
    headPoints.push({
        x: bodyLength + headSize * 0.9,
        y: 0,
        type: "nose"
    });
    
    // Eye points
    headPoints.push({
        x: bodyLength + headSize * 0.4,
        y: -headSize * 0.15,
        type: "eye"
    });
    
    headPoints.push({
        x: bodyLength + headSize * 0.4,
        y: headSize * 0.15,
        type: "eye"
    });
    
    // Ear points
    const earOffset = headSize * 0.2;
    const earAngle1 = Math.PI/4;
    const earAngle2 = -Math.PI/4;
    
    // Left ear
    for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const x = bodyLength + Math.cos(earAngle1) * earSize * t;
        const y = Math.sin(earAngle1) * earSize * t - earOffset;
        
        earPoints.push({
        x: x,
        y: y,
        type: "ear",
        ear: "left"
        });
    }
    
    // Right ear
    for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const x = bodyLength + Math.cos(earAngle2) * earSize * t;
        const y = Math.sin(earAngle2) * earSize * t + earOffset;
        
        earPoints.push({
        x: x,
        y: y,
        type: "ear",
        ear: "right"
        });
    }
    
    // Leg points
    const legOffsetX = bodyLength * 0.6;
    const legOffsetY = bodyLength * 0.5;
    
    // Front legs
    for (let leg = 0; leg < 2; leg++) {
        const legX = bodyLength * 0.5;
        const legY = (leg === 0) ? -legOffsetY : legOffsetY;
        
        for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = legX;
        const y = legY + (leg === 0 ? 1 : -1) * t * legLength;
        
        legPoints.push({
            x: x,
            y: y,
            type: "leg",
            leg: leg === 0 ? "frontLeft" : "frontRight",
            t: t
        });
        }
    }
    
    // Back legs
    for (let leg = 0; leg < 2; leg++) {
        const legX = -bodyLength * 0.3;
        const legY = (leg === 0) ? -legOffsetY : legOffsetY;
        
        for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const x = legX;
        const y = legY + (leg === 0 ? 1 : -1) * t * legLength;
        
        legPoints.push({
            x: x,
            y: y,
            type: "leg",
            leg: leg === 0 ? "backLeft" : "backRight",
            t: t
        });
        }
    }
    
    return {
        bodyPoints,
        tailPoints,
        headPoints,
        earPoints,
        legPoints,
        breed: breed.name
    };
    }

    // Get a random color from a palette
    function getRandomColorFromPalette(palette) {
    return palette[Math.floor(Math.random() * palette.length)];
    }

    // ==================== MAIN WORKER FUNCTION ====================

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
        // Reset animation state
        animationState.currentIteration = 0;
        animationState.particles = [];
        animationState.phase = "INTRO";
        
        // Initialize the first phase
        initializeAnimationPhase("INTRO");
        }
        
        let resultImageData;
        let progress;
        
        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
        // Create a copy of the original image data to work with
        resultImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        
        // Apply the dog animation effect
        applyDogAnimation(resultImageData, selectedRegions, value);
        
        // Update iteration counter
        animationState.currentIteration = (animationState.currentIteration + 1);
        
        // Check if animation is complete
        if (animationState.currentIteration >= iterations) {
            animationState.currentIteration = 0;
            animationState.particles = [];
            animationState.phase = "INTRO";
            initializeAnimationPhase("INTRO");
        }
        
        progress = animationState.currentIteration / iterations;
        } else {
        // No regions selected, just return the original image
        resultImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        progress = 1;
        }
        
        // Send the result back to the main thread
        self.postMessage({
        segmentedImages: [resultImageData],
        isComplete: true,
        iteration: animationState.currentIteration,
        progress
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
        error: error.message,
        isComplete: true
        });
    }
    };

    // Main animation function
    function applyDogAnimation(imageData, selectedRegions, intensityValue) {
    // Canvas dimensions
    const width = imageData.width;
    const height = imageData.height;
    
    // Center point (origin of the animation)
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Animation parameters
    const intensity = (DEFAULT_AMPLITUDE || 15) * (intensityValue || 1);
    
    // Check and update the current animation phase
    updateAnimationPhase();
    
    // Update all particles
    for (let i = 0; i < animationState.particles.length; i++) {
        const particle = animationState.particles[i];
        
        // Update the particle
        if (particle.customUpdateFn) {
        particle.customUpdateFn(particle, 1);
        } else {
        particle.update(1);
        }
        
        // Check if particle is still alive
        if (!particle.isAlive()) {
        animationState.particles.splice(i, 1);
        i--;
        continue;
        }
        
        // Render the particle
        if (particle.customRenderFn) {
        particle.customRenderFn(particle, null, imageData, width, height);
        } else {
        renderParticle(particle, imageData);
        }
    }
    
    // Add new particles based on current phase
    if (animationState.phase === "BUILDUP") {
        // Emit energy particles randomly during buildup
        if (Math.random() < 0.3) {
        // Find the dog silhouette
        for (const particle of animationState.particles) {
            if (particle.type === "silhouette") {
            // Create an energy particle
            const angle = Math.random() * Math.PI * 2;
            const distance = particle.size * Math.random() * 0.8;
            
            const x = particle.x + Math.cos(angle) * distance;
            const y = particle.y + Math.sin(angle) * distance;
            
            const energyParticle = createSparkleParticle(x, y, {
                color: getRandomColorFromPalette(animationState.palette),
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 - 1,
                gravity: -0.1, // Float upward
                lifespan: 20 + Math.random() * 10
            });
            
            animationState.particles.push(energyParticle);
            break;
            }
        }
        }
    } else if (animationState.phase === "EXPLOSION") {
        // Occasionally add new particles during explosion phase
        if (Math.random() < 0.1) {
        const type = Math.random();
        
        if (type < 0.3) {
            // Sparkle
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100;
            const sparkle = createSparkleParticle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance
            );
            animationState.particles.push(sparkle);
        } else if (type < 0.5) {
            // Paw print
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150;
            const pawprint = createPawPrintParticle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            {
                size: 5 + Math.random() * 3,
                gravity: 0.1
            }
            );
            animationState.particles.push(pawprint);
        } else if (type < 0.7) {
            // Bone
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 120;
            const treat = createTreatParticle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            {
                treatType: "bone",
                size: 6 + Math.random() * 4
            }
            );
            animationState.particles.push(treat);
        } else {
            // Standard particle
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150;
            const particle = createStandardParticle(
            centerX + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            {
                isLarge: Math.random() > 0.7,
                color: getRandomColorFromPalette(animationState.palette)
            }
            );
            animationState.particles.push(particle);
        }
        }
    }
    
    return imageData;
    }

    // Generic particle rendering function
    function renderParticle(particle, imageData) {
    // Determine shape type
    if (particle.shape && SPECIAL_SHAPES[particle.shape]) {
        // Use special shape rendering function
        SPECIAL_SHAPES[particle.shape].drawFn(
        imageData,
        particle.x,
        particle.y,
        particle.size,
        particle.color,
        particle.opacity,
        particle.rotation
        );
        return;
    }
    
    if (particle.isCircular) {
        // Draw circular particle
        drawCircle(
        imageData,
        particle.x,
        particle.y,
        particle.size,
        particle.color,
        particle.opacity
        );
        
        // Add glow if specified
        if (particle.glow > 0) {
        const glowColor = particle.glowColor || particle.color;
        drawCircle(
            imageData,
            particle.x,
            particle.y,
            particle.size * (1 + particle.glow * 0.5),
            glowColor,
            particle.opacity * 0.3
        );
        }
    } else {
        // Draw rectangular or irregular particle
        if (particle.scaleX !== 1 || particle.scaleY !== 1) {
        // Draw with scaling
        drawOval(
            imageData,
            particle.x,
            particle.y,
            particle.size * particle.scaleX,
            particle.size * particle.scaleY,
            particle.color,
            particle.opacity,
            particle.rotation
        );
        } else {
        // Draw standard rectangle
        drawRectangle(
            imageData,
            particle.x,
            particle.y,
            particle.size * 1.5,
            particle.size * 0.8,
            particle.color,
            particle.opacity,
            particle.rotation
        );
        }
    }
    
    // Add noise/texture if specified
    if (particle.noiseLevel > 0.5 && particle.size > 4) {
        addTextureDetail(
        imageData,
        particle.x,
        particle.y,
        imageData.width,
        particle.color.r,
        particle.color.g,
        particle.color.b,
        particle.opacity
        );
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

    }
