const DEFAULT_DANCE_CYCLE = 1;
const DEFAULT_LIP_AMPLITUDE = 15;
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second
const PHASE_ONE_DURATION = 3 * FRAME_RATE; // 3 seconds with 3 dogs
const LARGE_DOG_DRAG_COEFFICIENT = 10;
const SMALL_DOG_DRAG_COEFFICIENT = 6;

const LARGE_DOG_GRAVITY = 0.25;
const SMALL_DOG_GRAVITY = 0.45;
const LARGE_DRAG_COEFFICIENT = 0.05;
const SMALL_DRAG_COEFFICIENT = 0.02;
const TERMINAL_VELOCITY = 3;

// Animation state
let currentIteration = 0;
let dogs = [];
let animationPhase = 0; // 0 = initial 3 dogs, 1 = explosion

// Dog properties
const DOG_COLORS = [
    {r: 194, g: 154, b: 107, a: 255},  // Light brown
    {r: 117, g: 76, b: 36, a: 255},    // Dark brown
    {r: 240, g: 240, b: 215, a: 255},  // Cream
    {r: 85, g: 85, b: 85, a: 255},     // Gray
    {r: 45, g: 45, b: 45, a: 255},     // Black
    {r: 214, g: 214, b: 214, a: 255},  // White
    {r: 206, g: 141, b: 114, a: 255},  // Light red
    {r: 179, g: 179, b: 102, a: 255}   // Beige
];

// Enhanced dog fur patterns
const DOG_PATTERNS = [
    {type: "solid", opacity: 1.0},
    {type: "spotted", spotColor: {r: 255, g: 255, b: 255, a: 200}, spotSize: 2, spotDensity: 0.2},
    {type: "patched", patchColor: {r: 255, g: 255, b: 255, a: 220}, patchSize: 4},
    {type: "brindle", stripeColor: {r: 60, g: 40, b: 20, a: 180}, stripeWidth: 1, stripeDensity: 0.3}
];

// Improved dog SVG paths for better 2D rendering
const DOG_BREEDS = [
    // German Shepherd - more detailed
    "M15,8 C18,4 22,7 24,9 C28,9 30,13 29,16 C33,16 32,20 30,22 C32,27 28,29 25,28 C22,31 18,31 16,29 C14,31 12,30 10,27 C6,28 5,25 7,22 C5,19 6,16 9,15 C7,13 9,9 11,9 C13,6 14,8 15,8 Z",
    
    // Labrador - more rounded
    "M8,10 C13,5 21,8 21,12 C25,12 27,15 26,18 C30,18 29,23 27,25 C29,30 25,32 21,31 C19,34 15,34 13,32 C11,34 9,33 7,30 C3,31 2,28 4,25 C2,22 3,19 6,18 C4,16 6,12 8,12 C10,9 11,11 12,11 Z",
    
    // Poodle - fluffier outline
    "M15,7 C19,7 22,10 22,14 C26,14 28,17 27,20 C31,20 30,24 28,26 C30,31 26,33 23,32 C21,34 18,34 16,32 C14,34 12,33 10,30 C6,31 5,28 7,25 C5,22 6,19 9,18 C8,16 10,13 14,13 C14,10 15,7 15,7 Z",
    
    // Dachshund - longer body
    "M12,9 C15,6 19,8 20,10 C32,10 32,14 30,18 C32,23 28,25 25,24 C20,27 15,25 13,23 C11,25 9,24 7,21 C4,22 3,19 5,16 C3,13 4,9 7,8 C9,5 11,8 12,9 Z",
    
    // Corgi - new breed with short legs
    "M12,12 C16,9 20,10 22,12 C28,11 30,14 29,16 C32,17 30,22 28,23 C30,27 25,29 22,28 C18,30 14,29 12,27 C10,28 8,27 7,25 C4,26 3,24 5,21 C3,19 4,17 6,16 C4,14 6,11 9,12 C10,10 11,11 12,12 Z",
    
    // Husky - distinctive face shape
    "M14,7 C18,3 23,6 26,9 C30,9 32,12 31,16 C34,16 33,21 31,22 C33,28 28,31 24,29 C20,32 16,31 14,29 C12,31 10,29 8,26 C5,27 4,24 6,22 C4,19 5,15 8,15 C6,12 9,8 12,9 C12,7 14,7 14,7 Z"
];

// Enhanced ear shapes
const DOG_EARS = [
    // Pointy ears with more detail
    "M12,8 C10,2 14,4 16,8 M24,8 C26,2 22,4 20,8",
    
    // Floppy ears with more realism
    "M11,9 C9,5 6,5 5,8 C3,10 4,14 8,14 M25,9 C27,5 30,5 31,8 C33,10 32,14 28,14",
    
    // One pointy, one floppy with improved look
    "M12,8 C10,2 14,4 16,8 M25,9 C27,5 30,5 31,8 C33,10 32,14 28,14",
    
    // Rounded bat-like ears
    "M10,6 C8,2 16,2 14,7 M26,6 C28,2 20,2 22,7",
    
    // Tiny ears
    "M13,8 C12,5 15,5 14,8 M23,8 C24,5 21,5 22,8"
];

// Enhanced tails with more variety
const DOG_TAILS = [
    // Curly tail with better shape
    "M7,22 C3,20 1,17 3,14 C5,13 8,15 7,22 Z",
    
    // Straight tail with thickness
    "M5,22 C3,20 2,18 1,16 C2,15 3,15 4,15 C5,16 6,19 5,22 Z",
    
    // Wagging tail with better curve
    "M5,22 Q1,18 3,14 C5,13 6,17 5,22 Z",
    
    // Bushy tail
    "M5,22 C3,19 1,18 2,14 C4,12 7,14 9,16 C8,19 7,21 5,22 Z",
    
    // Stub tail
    "M6,22 C5,21 4,21 5,20 C6,19 7,20 6,22 Z"
];

// Improved dog accessories
const DOG_ACCESSORIES = [
    // Collar with more realistic shape
    {type: "collar", color: {r: 255, g: 0, b: 0, a: 255}, hasTag: true, tagShape: "round"},
    {type: "collar", color: {r: 0, g: 100, b: 255, a: 255}, hasTag: true, tagShape: "bone"},
    {type: "collar", color: {r: 0, g: 180, b: 0, a: 255}, hasTag: false},
    
    // Bandana with more detail
    {type: "bandana", color: {r: 0, g: 0, b: 255, a: 255}, pattern: "solid"},
    {type: "bandana", color: {r: 255, g: 0, b: 0, a: 255}, pattern: "dots"},
    {type: "bandana", color: {r: 0, g: 180, b: 0, a: 255}, pattern: "stripes"},
    
    // Bow tie with more detail
    {type: "bowtie", color: {r: 255, g: 215, b: 0, a: 255}, size: "normal"},
    {type: "bowtie", color: {r: 255, g: 100, b: 180, a: 255}, size: "large"},
    
    // Glasses
    {type: "glasses", color: {r: 0, g: 0, b: 0, a: 255}, style: "round"},
    {type: "glasses", color: {r: 165, g: 42, b: 42, a: 255}, style: "square"},
    
    // Hat
    {type: "hat", color: {r: 101, g: 67, b: 33, a: 255}, style: "cowboy"},
    {type: "hat", color: {r: 25, g: 25, b: 112, a: 255}, style: "cap"},
    
    // None
    {type: "none"}
];

// Dog counts
const LARGE_DOG_COUNT = 100;
const SMALL_DOG_COUNT = 200;

// Create transparent ImageData object
function createTransparentImageData(width, height) {
    return new ImageData(new Uint8ClampedArray(width * height * 4), width, height);
}

// Handle messages from the main thread
self.onmessage = function(e) {
    const { imageData, selectedRegions, value, value5: iterations = DEFAULT_ITERATIONS, reset } = e.data;

    try {
        if (reset) {
            resetAnimationState();
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyDogBurstEffect(imageData, selectedRegions, value);
            progress = updateAnimationProgress(iterations);
        } else {
            resultImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
            progress = 1;
        }

        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress
        }, [resultImageData.data.buffer]);

    } catch (error) {
        self.postMessage({ error: error.message, isComplete: true });
    }
};

// Reset animation state
function resetAnimationState() {
    currentIteration = 0;
    dogs = [];
    animationPhase = 0;
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    if (currentIteration === 0) {
        animationPhase = 0;
        dogs = [];
    }
    return currentIteration / iterations;
}

// Apply the dog burst effect
function applyDogBurstEffect(imageData, selectedRegions, intensityValue) {
    const resultImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const { width, height } = imageData;
    const centerX = width / 2;
    const centerY = height / 2;
    const intensity = DEFAULT_LIP_AMPLITUDE * (intensityValue || 1);

    if (currentIteration === PHASE_ONE_DURATION) {
        animationPhase = 1;
        dogs = [];
    }

    if (dogs.length === 0) {
        if (animationPhase === 0) {
            initializeThreeRevolvingDogs(centerX, centerY);
        } else {
            initializeExplosionDogs(width, height, centerX, centerY);
        }
    }

    updateAndDrawAllDogs(resultImageData, width, height);
    return resultImageData;
}

// Initialize revolving dogs (phase 1)
function initializeThreeRevolvingDogs(centerX, centerY) {
    const colors = [DOG_COLORS[0], DOG_COLORS[2], DOG_COLORS[4]];
    const radius = 60; // Larger radius for better visibility
    const angularSpacing = Math.PI * 2 / 3;

    for (let i = 0; i < 3; i++) {
        const angle = i * angularSpacing;
        const size = 25; // Larger size for better detail
        const breedIndex = i % DOG_BREEDS.length;
        const patternIndex = i % DOG_PATTERNS.length;
        const accessoryIndex = i % DOG_ACCESSORIES.length;
        
        dogs.push(createDog(
            centerX, 
            centerY, 
            angle, 
            radius, 
            size, 
            colors[i], 
            'revolving', 
            breedIndex, 
            DOG_PATTERNS[patternIndex], 
            DOG_ACCESSORIES[accessoryIndex]
        ));
    }
}

// Initialize explosion dogs (phase 2)
function initializeExplosionDogs(width, height, centerX, centerY) {
    // Add larger dogs
    for (let i = 0; i < LARGE_DOG_COUNT; i++) {
        const size = Math.random() * 10 + 15; // Slightly larger for visibility
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 8;
        const colorIndex = Math.floor(Math.random() * DOG_COLORS.length);
        const breedIndex = Math.floor(Math.random() * DOG_BREEDS.length);
        const patternIndex = Math.floor(Math.random() * DOG_PATTERNS.length);
        const accessoryIndex = Math.floor(Math.random() * DOG_ACCESSORIES.length);
        
        dogs.push(createExplosionDog(
            centerX, 
            centerY, 
            angle, 
            speed, 
            size, 
            DOG_COLORS[colorIndex], 
            Math.random() * Math.PI * 2, 
            'large',
            DOG_PATTERNS[patternIndex],
            DOG_ACCESSORIES[accessoryIndex]
        ));
    }
    
    // Add smaller dogs
    for (let i = 0; i < SMALL_DOG_COUNT; i++) {
        const size = Math.random() * 5 + 8; // Slightly larger for visibility
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 10;
        const colorIndex = Math.floor(Math.random() * DOG_COLORS.length);
        const breedIndex = Math.floor(Math.random() * DOG_BREEDS.length);
        const patternIndex = Math.floor(Math.random() * DOG_PATTERNS.length);
        const accessoryIndex = Math.floor(Math.random() * DOG_ACCESSORIES.length);
        
        dogs.push(createExplosionDog(
            centerX, 
            centerY, 
            angle, 
            speed, 
            size, 
            DOG_COLORS[colorIndex], 
            Math.random() * Math.PI * 2, 
            'small',
            DOG_PATTERNS[patternIndex],
            DOG_ACCESSORIES[accessoryIndex]
        ));
    }
}

// Create a dog with basic properties
function createDog(centerX, centerY, angle, radius, size, color, type, breedIndex, pattern, accessory) {
    // Generate random values for animation
    const earIndex = Math.floor(Math.random() * DOG_EARS.length);
    const tailIndex = Math.floor(Math.random() * DOG_TAILS.length);
    
    // Return dog object with all properties
    return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        color,
        size,
        angle,
        speed: 1,
        type,
        breed: DOG_BREEDS[breedIndex],
        earType: DOG_EARS[earIndex],
        tailType: DOG_TAILS[tailIndex],
        drag: LARGE_DOG_DRAG_COEFFICIENT,
        gravity: LARGE_DOG_GRAVITY,
        rotation: Math.random() * Math.PI * 2,
        pattern,
        accessory,
        wagging: Math.random() > 0.3, // More likely to wag tails
        waggingOffset: Math.random() * Math.PI,
        waggingSpeed: 0.1 + Math.random() * 0.2,
        tongueOut: Math.random() > 0.5, // More likely to have tongues out
        blinking: Math.random() > 0.7,
        blinkState: 0,
        animTime: Math.random() * 100, // Random animation timing
        centerX, // Store center for revolving dogs
        centerY,
        radius,
        targetAngle: angle, // Used for revolving dogs
        jumpHeight: 0,
        jumping: Math.random() > 0.7 // Some dogs jump 
    };
}

// Create explosion dog properties
function createExplosionDog(centerX, centerY, angle, speed, size, color, rotation, type, pattern, accessory) {
    // Get base dog
    const dog = createDog(centerX, centerY, angle, 0, size, color, type, 
        Math.floor(Math.random() * DOG_BREEDS.length), pattern, accessory);
    
    // Add explosion-specific properties
    dog.speed = speed;
    dog.rotation = rotation;
    dog.drag = (type === 'large') ? LARGE_DOG_DRAG_COEFFICIENT : SMALL_DOG_DRAG_COEFFICIENT;
    dog.gravity = (type === 'large') ? LARGE_DOG_GRAVITY : SMALL_DOG_GRAVITY;
    dog.rotationSpeed = (Math.random() - 0.5) * 0.2;
    dog.spinDirection = Math.random() > 0.5 ? 1 : -1;
    
    return dog;
}

// Update and draw all dogs
function updateAndDrawAllDogs(imageData, width, height) {
    // Sort dogs by size for proper depth
    dogs.sort((a, b) => a.size - b.size);
    
    // Update and draw each dog
    for (let i = dogs.length - 1; i >= 0; i--) {
        updateDogPosition(dogs[i]);
        
        // Only draw if within bounds with a margin
        const margin = dogs[i].size * 2;
        if (dogs[i].x > -margin && dogs[i].x < width + margin && 
            dogs[i].y > -margin && dogs[i].y < height + margin) {
            drawDog(dogs[i], imageData, width, height);
        } else {
            // Remove dogs that are too far outside the viewport
            dogs.splice(i, 1);
        }
    }
}

// Update dog position based on physics and behavior
function updateDogPosition(dog) {
    // Increment animation time
    dog.animTime += 0.16;
    
    // Update blinking
    if (dog.blinking) {
        dog.blinkState = (Math.sin(dog.animTime * 2) > 0.9) ? 1 : 0;
    }
    
    // Handle different types of movement
    if (dog.type === 'revolving') {
        // Circular motion for revolving dogs
        dog.targetAngle += 0.02;
        dog.x = dog.centerX + dog.radius * Math.cos(dog.targetAngle);
        dog.y = dog.centerY + dog.radius * Math.sin(dog.targetAngle);
        
        // Add wobble/bounce for more playful animation
        if (dog.jumping && Math.sin(dog.animTime * 0.5) > 0.7) {
            dog.jumpHeight = Math.sin(dog.animTime * 0.5) * 10;
            dog.y -= dog.jumpHeight;
        }
        
        // Face direction of movement
        dog.rotation = dog.targetAngle + Math.PI / 2;
    } else {
        // Physics for explosion dogs
        dog.speed *= 0.98; // Air resistance
        dog.y += dog.gravity;
        
        // Apply explosion movement
        dog.x += Math.cos(dog.angle) * dog.speed;
        dog.y += Math.sin(dog.angle) * dog.speed;
        
        // Add rotation
        dog.rotation += dog.rotationSpeed * dog.spinDirection;
    }
    
    // Update wagging animation with variable speed
    if (dog.wagging) {
        dog.waggingOffset += dog.waggingSpeed;
    }
}

// Draw a dog on the ImageData
function drawDog(dog, imageData, width, height) {
    // Create a temporary canvas to draw the dog
    const tempCanvas = new OffscreenCanvas(dog.size * 2.5, dog.size * 2.5);
    const ctx = tempCanvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Set up transformation
    ctx.save();
    ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    ctx.rotate(dog.rotation || 0);
    ctx.scale(dog.size / 25, dog.size / 25); // Scale relative to original path size
    
    // Apply shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    // Draw the dog body
    ctx.fillStyle = `rgba(${dog.color.r}, ${dog.color.g}, ${dog.color.b}, ${dog.color.a / 255})`;
    const path = new Path2D(dog.breed);
    ctx.fill(path);
    
    // Apply fur pattern if exists
    if (dog.pattern) {
        applyFurPattern(ctx, dog.pattern, dog.breed);
    }
    
    // Reset shadow for details
    ctx.shadowColor = 'transparent';
    
    // Draw ears
    ctx.strokeStyle = `rgba(${Math.max(0, dog.color.r - 30)}, ${Math.max(0, dog.color.g - 30)}, ${Math.max(0, dog.color.b - 30)}, ${dog.color.a / 255})`;
    ctx.lineWidth = 1;
    const earsPath = new Path2D(dog.earType);
    ctx.stroke(earsPath);
    
    // Draw wagging or normal tail
    if (dog.wagging) {
        // Draw wagging tail with animation
        ctx.save();
        ctx.translate(5, 22);
        ctx.rotate(Math.sin(dog.waggingOffset) * 0.4); // Increased amplitude
        ctx.translate(-5, -22);
        const tailsPath = new Path2D(dog.tailType);
        ctx.fill(tailsPath);
        ctx.restore();
    } else {
        // Draw normal tail
        const tailsPath = new Path2D(dog.tailType);
        ctx.fill(tailsPath);
    }
    
    // Draw eyes
    if (dog.blinkState === 0) {
        // Open eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-5, 10, 1.5, 0, Math.PI * 2);
        ctx.arc(5, 10, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw shine in eyes for cuteness
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5.5, 9.5, 0.5, 0, Math.PI * 2);
        ctx.arc(4.5, 9.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Closed eyes (blinking)
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, 10);
        ctx.lineTo(-4, 10);
        ctx.moveTo(4, 10);
        ctx.lineTo(6, 10);
        ctx.stroke();
    }
    
    // Draw nose
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 13, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tongue if applicable
    if (dog.tongueOut) {
        ctx.fillStyle = 'rgba(255, 150, 150, 0.8)';
        
        // Animated tongue
        const tongueHeight = 2 + Math.sin(dog.animTime * 2) * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 15, 1, tongueHeight, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw small smile
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(0, 13, 3, 0.1 * Math.PI, 0.9 * Math.PI, false);
    ctx.stroke();
    
    // Draw accessory if exists
    if (dog.accessory && dog.accessory.type !== 'none') {
        drawEnhancedAccessory(ctx, dog.accessory);
    }
    
    // Restore context
    ctx.restore();
    
    // Transfer the temp canvas to the ImageData
    const dogData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Calculate where to place the dog in the main ImageData
    const startX = Math.max(0, Math.round(dog.x - tempCanvas.width / 2));
    const startY = Math.max(0, Math.round(dog.y - tempCanvas.height / 2));
    const endX = Math.min(width, startX + tempCanvas.width);
    const endY = Math.min(height, startY + tempCanvas.height);
    
    // Copy pixels to the main ImageData
    for (let y = 0; y < endY - startY; y++) {
        for (let x = 0; x < endX - startX; x++) {
            const srcIdx = (y * tempCanvas.width + x) * 4;
            const destIdx = ((startY + y) * width + (startX + x)) * 4;
        
            // Only draw non-transparent pixels
            if (dogData.data[srcIdx + 3] > 0) {
                // Use alpha compositing for smoother edges
                const srcAlpha = dogData.data[srcIdx + 3] / 255;
                const destAlpha = imageData.data[destIdx + 3] / 255;
                const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);
                
                if (outAlpha > 0) {
                    imageData.data[destIdx] = (dogData.data[srcIdx] * srcAlpha + 
                        imageData.data[destIdx] * destAlpha * (1 - srcAlpha)) / outAlpha;
                    imageData.data[destIdx + 1] = (dogData.data[srcIdx + 1] * srcAlpha + 
                        imageData.data[destIdx + 1] * destAlpha * (1 - srcAlpha)) / outAlpha;
                    imageData.data[destIdx + 2] = (dogData.data[srcIdx + 2] * srcAlpha + 
                        imageData.data[destIdx + 2] * destAlpha * (1 - srcAlpha)) / outAlpha;
                    imageData.data[destIdx + 3] = outAlpha * 255;
                }
            }
        }
    }
}

// Apply fur pattern to the dog
function applyFurPattern(ctx, pattern, bodyPath) {
    ctx.save();
    
    // Create clipping path to keep pattern inside dog body
    const clipPath = new Path2D(bodyPath);
    ctx.clip(clipPath);
    
    switch (pattern.type) {
        case "spotted":
            // Draw random spots with improved appearance
            ctx.fillStyle = `rgba(${pattern.spotColor.r}, ${pattern.spotColor.g}, ${pattern.spotColor.b}, ${pattern.spotColor.a / 255})`;
            const spotCount = Math.floor(300 * pattern.spotDensity);
            for (let i = 0; i < spotCount; i++) {
                const x = (Math.random() - 0.5) * 30;
                const y = (Math.random() - 0.5) * 30;
                const size = Math.random() * pattern.spotSize + 0.5;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
            
        case "patched":
            // Draw larger organic patches
            ctx.fillStyle = `rgba(${pattern.patchColor.r}, ${pattern.patchColor.g}, ${pattern.patchColor.b}, ${pattern.patchColor.a / 255})`;
            const patchCount = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < patchCount; i++) {
                const x = (Math.random() - 0.5) * 25;
                const y = (Math.random() - 0.5) * 25;
                const size = Math.random() * pattern.patchSize + pattern.patchSize;
                const rotation = Math.random() * Math.PI;
                
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                ctx.beginPath();
                ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
            
        case "brindle":
            // Draw realistic brindle stripes
            ctx.fillStyle = `rgba(${pattern.stripeColor.r}, ${pattern.stripeColor.g}, ${pattern.stripeColor.b}, ${pattern.stripeColor.a / 255})`;
            const stripeCount = Math.floor(20 * pattern.stripeDensity);
            const stripeAngle = Math.random() * Math.PI;
            for (let i = 0; i < stripeCount; i++) {
                const offset = (Math.random() - 0.5) * 40;
                ctx.save();
                ctx.rotate(stripeAngle);
                
                // Create a more natural stripe shape
                ctx.beginPath();
                ctx.moveTo(offset - pattern.stripeWidth/2, -20);
                ctx.lineTo(offset + pattern.stripeWidth/2, -20);
                ctx.lineTo(offset + pattern.stripeWidth/2 + (Math.random() - 0.5), 20);
                ctx.lineTo(offset - pattern.stripeWidth/2 + (Math.random() - 0.5), 20);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
            break;
            
        case "solid":
        default:
            // No pattern needed for solid
            break;
    }
    
    ctx.restore();
}

// Draw enhanced dog accessories
function drawEnhancedAccessory(ctx, accessory) {
    const color = `rgba(${accessory.color.r}, ${accessory.color.g}, ${accessory.color.b}, ${accessory.color.a / 255})`;
    
    switch (accessory.type) {
        case "collar":
            // Draw collar with improved design
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 16, 9, 3, 0, 0, Math.PI);
            ctx.stroke();
            
            // Add highlight to collar
            ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.ellipse(0, 15.5, 8.5, 2.5, 0, 0.1, 0.9 * Math.PI);
            ctx.stroke();
            
            // Draw tag if specified
            if (accessory.hasTag) {
                // Different tag shapes
                if (accessory.tagShape === "bone") {
                    ctx.fillStyle = 'rgba(220, 220, 220, 0.9)';
                    ctx.beginPath();
                    ctx.ellipse(-0.8, 17, 0.8, 0.6, 0, 0, Math.PI * 2);
                    ctx.ellipse(0.8, 17, 0.8, 0.6, 0, 0, Math.PI * 2);
                    ctx.rect(-0.8, 16.4, 1.6, 1.2);
                    ctx.fill();
                } else {
                    // Default round tag
                    ctx.fillStyle = 'gold';
                    ctx.beginPath();
                    ctx.ellipse(0, 17, 1.2, 1.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
                    ctx.lineWidth = 0.3;
                    ctx.stroke();
                    
                    // Add a little dog paw print on the tag
                    ctx.fillStyle = 'rgba(100, 60, 20, 0.8)';
                    ctx.beginPath();
                    ctx.arc(0, 17, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(-0.5, 16.5, 0.2, 0, Math.PI * 2);
                    ctx.arc(0.5, 16.5, 0.2, 0, Math.PI * 2);
                    ctx.arc(-0.5, 17.5, 0.2, 0, Math.PI * 2);
                    ctx.arc(0.5, 17.5, 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
            
        case "bandana":
            // Draw bandana with pattern options
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-8, 15);
            ctx.lineTo(8, 15);
            ctx.lineTo(0, 21);
            ctx.closePath();
            ctx.fill();
            
            // Add pattern based on bandana style
            if (accessory.pattern === "dots") {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                for (let i = 0; i < 5; i++) {
                    const x = (Math.random() * 14) - 7;
                    const y = 15 + (Math.random() * 5);
                    ctx.beginPath();
                    ctx.arc(x, y, 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (accessory.pattern === "stripes") {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 3; i++) {
                    const y = 16 + i * 1.5;
                    const startX = -7 + i * 2;
                    const endX = 7 - i * 2;
                    ctx.beginPath();
                    ctx.moveTo(startX, y);
                    ctx.lineTo(endX, y);
                    ctx.stroke();
                }
            } else {
                // Default solid pattern with border
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.moveTo(-8, 15);
                ctx.lineTo(8, 15);
                ctx.lineTo(0, 21);
                ctx.closePath();
                ctx.stroke();
            }
            break;
            
        case "bowtie":
            // Draw bow tie with size options
            ctx.fillStyle = color;
            
            const bowScale = accessory.size === "large" ? 1.3 : 1.0;
            
            // Left side
            ctx.beginPath();
            ctx.moveTo(-5 * bowScale, 15);
            ctx.lineTo(-2 * bowScale, 13);
            ctx.lineTo(-2 * bowScale, 17);
            ctx.closePath();
            ctx.fill();
            
            // Right side
            ctx.beginPath();
            ctx.moveTo(5 * bowScale, 15);
            ctx.lineTo(2 * bowScale, 13);
            ctx.lineTo(2 * bowScale, 17);
            ctx.closePath();
            ctx.fill();
            
            // Center knot
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.rect(-1, 14, 2, 2);
            ctx.fill();
            
            // Add highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(-3.5 * bowScale, 14.5, 1, 0.5, Math.PI / 4, 0, Math.PI * 2);
            ctx.ellipse(3.5 * bowScale, 14.5, 1, 0.5, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case "glasses":
            // Draw glasses
            ctx.strokeStyle = `rgba(${accessory.color.r}, ${accessory.color.g}, ${accessory.color.b}, ${accessory.color.a / 255})`;
            ctx.lineWidth = 0.6;
            
            if (accessory.style === "round") {
                // Round glasses
                ctx.beginPath();
                ctx.arc(-4, 10, 2.5, 0, Math.PI * 2);
                ctx.arc(4, 10, 2.5, 0, Math.PI * 2);
                ctx.moveTo(-1.5, 10);
                ctx.lineTo(1.5, 10);
                ctx.stroke();
                
                // Add lens reflection
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.arc(-4.5, 9.5, 1, 0, Math.PI * 0.8);
                ctx.arc(3.5, 9.5, 1, 0, Math.PI * 0.8);
                ctx.stroke();
            } else {
                // Square glasses
                ctx.beginPath();
                ctx.rect(-6.5, 8, 4, 4);
                ctx.rect(2.5, 8, 4, 4);
                ctx.moveTo(-2.5, 10);
                ctx.lineTo(2.5, 10);
                ctx.stroke();
                
                // Add lens reflection
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 0.3;
                ctx.beginPath();
                ctx.moveTo(-6, 9);
                ctx.lineTo(-4, 9);
                ctx.moveTo(3, 9);
                ctx.lineTo(5, 9);
                ctx.stroke();
            }
            break;
            
        case "hat":
            // Draw hat
            ctx.fillStyle = color;
            
            if (accessory.style === "cowboy") {
                // Cowboy hat
                ctx.beginPath();
                ctx.ellipse(0, 4, 10, 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Hat top
                ctx.beginPath();
                ctx.ellipse(0, 1, 5, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Hat band
                ctx.fillStyle = 'rgba(80, 40, 20, 0.8)';
                ctx.beginPath();
                ctx.rect(-5, 2, 10, 1);
                ctx.fill();
            } else {
                // Baseball cap
                ctx.beginPath();
                ctx.ellipse(0, 4, 8, 3, 0, Math.PI, Math.PI * 2);
                ctx.fill();
                
                // Cap bill
                ctx.beginPath();
                ctx.ellipse(0, 4, 8, 1, 0, 0, Math.PI);
                ctx.fill();
                
                // Cap top detailing
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-3, 2);
                ctx.quadraticCurveTo(0, 0, 3, 2);
                ctx.stroke();
            }
            break;
    }
}