// Constants for the salad generator
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// Salad ingredients configuration
const INGREDIENTS = {
  BROCCOLI: { 
    color: [30, 120, 30], 
    size: [15, 30],
    shape: 'floret'
  },
  CABBAGE: { 
    color: [120, 180, 100], 
    size: [20, 40],
    shape: 'leaf'
  },
  RED_CABBAGE: { 
    color: [150, 70, 150], 
    size: [20, 40],
    shape: 'leaf'
  },
  ONION: { 
    color: [220, 160, 200], 
    size: [10, 25],
    shape: 'slice'
  },
  CORIANDER: { 
    color: [50, 180, 50], 
    size: [5, 15],
    shape: 'herb'
  },
  LETTUCE: { 
    color: [100, 200, 80], 
    size: [25, 50],
    shape: 'frilly'
  },
  SPINACH: { 
    color: [40, 130, 40], 
    size: [20, 35],
    shape: 'oval'
  }
};

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let clickPositions = [];

// Handle messages from the main thread
self.onmessage = function(e) {
    const { imageData, selectedRegions, value, value5: iterations = DEFAULT_ITERATIONS, reset } = e.data;

    try {
        if (reset) {
            resetAnimationState();
        }

        // Initialize canvas dimensions if not already set
        if (!canvasWidth || !canvasHeight) {
            canvasWidth = imageData.width;
            canvasHeight = imageData.height;
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            // Apply the salad effect
            resultImageData = generateSaladImage(imageData, selectedRegions, value);
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
    animationStartTime = performance.now();
    clickPositions = [];
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    return currentIteration / iterations;
}

// Add a click position
function addClick(x, y) {
    // Keep a reasonable number of clicks
    if (clickPositions.length >= 50) {
        clickPositions.shift();
    }
    
    // Add new click with random ingredient type
    clickPositions.push({
        x: x,
        y: y,
        ingredient: getRandomIngredient(),
        rotation: Math.random() * 360,
        scale: 0.7 + Math.random() * 0.6,
        startTime: performance.now()
    });
}

// Get random ingredient type
function getRandomIngredient() {
    const ingredients = Object.keys(INGREDIENTS);
    return ingredients[Math.floor(Math.random() * ingredients.length)];
}

// Main function to generate salad image
function generateSaladImage(imageData, selectedRegions, intensity) {
    // Create result ImageData
    const resultImageData = new ImageData(new Uint8ClampedArray(imageData.data), canvasWidth, canvasHeight);
    
    // Get center of the selected region
    const region = selectedRegions[0];
    const bounds = getBoundingBox(region);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
// Draw base bowl/plate shape if needed
if (currentIteration === 0) {
    // Check for valid dimensions before creating gradient
    if (width > 0 && height > 0) {
        try {
            // Calculate safe gradient values
            const innerRadius = Math.max(1, width * 0.1); // Ensure radius is at least 1px
            const outerRadius = Math.max(innerRadius + 1, width * 0.7); // Ensure outer > inner
            
            // Create gradient with safe values
            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );
            gradient.addColorStop(0, 'rgba(245, 245, 245, 0.1)');
            gradient.addColorStop(1, 'rgba(230, 230, 230, 0.05)');
            
            ctx.fillStyle = gradient;
        } catch (error) {
            // Fallback to solid color if gradient creation fails
            console.error("Gradient creation failed, using fallback color", error);
            ctx.fillStyle = 'rgba(240, 240, 240, 0.08)';
        }
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(10, width * 0.65), Math.max(10, height * 0.55), 0, 0, Math.PI * 2);
        ctx.fill();
    }
}
    
    // Occasionally add new ingredients for animation
    if (currentIteration % 5 === 0 && Math.random() < 0.3) {
        const randomX = centerX + (Math.random() - 0.5) * width * 0.8;
        const randomY = centerY + (Math.random() - 0.5) * height * 0.8;
        addClick(randomX, randomY);
    }
    
    // Create an offscreen canvas to draw on
    const offscreenCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const ctx = offscreenCanvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw base bowl/plate shape if needed
    if (currentIteration === 0) {
        ctx.fillStyle = 'rgba(240, 240, 240, 0.1)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, width * 0.6, height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw all ingredients
    for (const item of clickPositions) {
        drawIngredient(ctx, item);
    }
    
    // Get the image data from the canvas
    const canvasImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    
    // Blend with original image
    for (let i = 0; i < resultImageData.data.length; i += 4) {
        if (canvasImageData.data[i + 3] > 0) { // If not fully transparent
            resultImageData.data[i] = canvasImageData.data[i];
            resultImageData.data[i + 1] = canvasImageData.data[i + 1];
            resultImageData.data[i + 2] = canvasImageData.data[i + 2];
            resultImageData.data[i + 3] = canvasImageData.data[i + 3];
        }
    }
    
    return resultImageData;
}

// Draw a single ingredient
function drawIngredient(ctx, item) {
    const config = INGREDIENTS[item.ingredient];
    const currentTime = performance.now();
    const elapsed = (currentTime - item.startTime) / 1000; // seconds
    
    // Get random size within range
    const baseSize = config.size[0] + Math.random() * (config.size[1] - config.size[0]);
    const size = baseSize * item.scale;
    
    // Animate appearance
    const appearProgress = Math.min(1, elapsed * 2); // 0.5 second to appear
    const currentSize = size * appearProgress;
    
    // Apply slight animation to position
    const wobble = Math.sin(elapsed * 3) * 2;
    
    // Set color with slight variation
    const colorVariation = 20; // amount of variation
    const r = config.color[0] + (Math.random() - 0.5) * colorVariation;
    const g = config.color[1] + (Math.random() - 0.5) * colorVariation;
    const b = config.color[2] + (Math.random() - 0.5) * colorVariation;
    
    // Save context state
    ctx.save();
    
    // Translate to position
    ctx.translate(item.x, item.y);
    
    // Rotate
    ctx.rotate((item.rotation + wobble) * Math.PI / 180);
    
    // Draw based on shape type
    switch(config.shape) {
        case 'floret': // Broccoli
            drawBroccoliFloret(ctx, currentSize, r, g, b);
            break;
        case 'leaf': // Cabbage
            drawCabbageLeaf(ctx, currentSize, r, g, b);
            break;
        case 'slice': // Onion
            drawOnionSlice(ctx, currentSize, r, g, b);
            break;
        case 'herb': // Coriander
            drawHerbLeaf(ctx, currentSize, r, g, b);
            break;
        case 'frilly': // Lettuce
            drawFrillyLeaf(ctx, currentSize, r, g, b);
            break;
        case 'oval': // Spinach
            drawOvalLeaf(ctx, currentSize, r, g, b);
            break;
        default:
            drawDefaultLeaf(ctx, currentSize, r, g, b);
    }
    
    // Restore context
    ctx.restore();
}

// Draw broccoli floret
function drawBroccoliFloret(ctx, size, r, g, b) {
    // Draw stalk
    ctx.fillStyle = `rgb(${r-20}, ${g-20}, ${b-20})`;
    ctx.beginPath();
    ctx.rect(-size/8, 0, size/4, size/2);
    ctx.fill();
    
    // Draw floret
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Main floret head
    ctx.beginPath();
    ctx.arc(0, -size/4, size/3, 0, Math.PI * 2);
    ctx.fill();
    
    // Small floret parts
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI/3;
        const x = Math.cos(angle) * size/3;
        const y = Math.sin(angle) * size/3 - size/4;
        
        ctx.beginPath();
        ctx.arc(x, y, size/5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add texture dots
    ctx.fillStyle = `rgb(${r+20}, ${g+20}, ${b+20})`;
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size/3;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - size/4;
        
        ctx.beginPath();
        ctx.arc(x, y, size/15, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw cabbage leaf
function drawCabbageLeaf(ctx, size, r, g, b) {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw main leaf shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
        size/2, -size/3,
        size/2, -size/2,
        0, -size
    );
    ctx.bezierCurveTo(
        -size/2, -size/2,
        -size/2, -size/3,
        0, 0
    );
    ctx.fill();
    
    // Draw veins
    ctx.strokeStyle = `rgb(${r-20}, ${g-20}, ${b-20})`;
    ctx.lineWidth = size/20;
    
    // Main vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size*0.85);
    ctx.stroke();
    
    // Side veins
    for (let i = 1; i < 5; i++) {
        const y = -i * size/5;
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size/3, y - size/10);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-size/3, y - size/10);
        ctx.stroke();
    }
    
    // Add highlights
    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    ctx.beginPath();
    ctx.ellipse(0, -size/2, size/3, size/2, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Draw onion slice
function drawOnionSlice(ctx, size, r, g, b) {
    // Base color
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw circular slice
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw rings
    const rings = 4;
    for (let i = 1; i <= rings; i++) {
        const radius = (size/2) * (i / rings);
        ctx.strokeStyle = `rgb(${r-20}, ${g-20}, ${b-20})`;
        ctx.lineWidth = size/30;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Add some texture
    ctx.fillStyle = `rgba(255, 255, 255, 0.2)`;
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size/3;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.arc(x, y, size/15, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw herb leaf (coriander/cilantro)
function drawHerbLeaf(ctx, size, r, g, b) {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw stem
    ctx.beginPath();
    ctx.rect(-size/20, 0, size/10, size/2);
    ctx.fill();
    
    // Draw leaflets
    const leaflets = 5;
    for (let i = 0; i < leaflets; i++) {
        const y = -size/3 - (i * size/7);
        const leafSize = size/5 - (i * size/25);
        
        // Left leaflet
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
            -leafSize, y - leafSize/2,
            -leafSize*1.5, y - leafSize,
            -leafSize, y - leafSize*1.5
        );
        ctx.bezierCurveTo(
            -leafSize/2, y - leafSize*1.2,
            0, y - leafSize*0.8,
            0, y
        );
        ctx.fill();
        
        // Right leaflet
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
            leafSize, y - leafSize/2,
            leafSize*1.5, y - leafSize,
            leafSize, y - leafSize*1.5
        );
        ctx.bezierCurveTo(
            leafSize/2, y - leafSize*1.2,
            0, y - leafSize*0.8,
            0, y
        );
        ctx.fill();
    }
    
    // Add serrations to the leaflets
    ctx.strokeStyle = `rgb(${r-10}, ${g-10}, ${b-10})`;
    ctx.lineWidth = size/40;
    
    for (let i = 0; i < leaflets; i++) {
        const y = -size/3 - (i * size/7);
        const leafSize = size/5 - (i * size/25);
        
        // Serrations on left leaflet
        for (let j = 0; j < 3; j++) {
            const x = -leafSize * (j+1)/3;
            const yOffset = y - leafSize * (j+1)/2;
            
            ctx.beginPath();
            ctx.moveTo(x, yOffset);
            ctx.lineTo(x - size/20, yOffset - size/20);
            ctx.stroke();
        }
        
        // Serrations on right leaflet
        for (let j = 0; j < 3; j++) {
            const x = leafSize * (j+1)/3;
            const yOffset = y - leafSize * (j+1)/2;
            
            ctx.beginPath();
            ctx.moveTo(x, yOffset);
            ctx.lineTo(x + size/20, yOffset - size/20);
            ctx.stroke();
        }
    }
}

// Draw frilly leaf (lettuce)
function drawFrillyLeaf(ctx, size, r, g, b) {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw main frilly leaf shape
    ctx.beginPath();
    
    // Start at center bottom
    ctx.moveTo(0, 0);
    
    // Create a frilly edge using many bezier curves
    const points = 12;
    for (let i = 0; i <= points; i++) {
        const angle = (Math.PI / points) * i;
        const radius = size * (0.5 + 0.2 * Math.sin(i * 5));
        
        const x1 = Math.cos(angle - Math.PI/points/3) * radius * 0.8;
        const y1 = -Math.sin(angle - Math.PI/points/3) * radius * 0.8;
        
        const x2 = Math.cos(angle + Math.PI/points/3) * radius * 0.8;
        const y2 = -Math.sin(angle + Math.PI/points/3) * radius * 0.8;
        
        const x = Math.cos(angle) * radius;
        const y = -Math.sin(angle) * radius;
        
        ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
    }
    
    // Complete the other half of the leaf
    for (let i = points; i >= 0; i--) {
        const angle = Math.PI + (Math.PI / points) * i;
        const radius = size * (0.5 + 0.2 * Math.sin(i * 5));
        
        const x1 = Math.cos(angle - Math.PI/points/3) * radius * 0.8;
        const y1 = -Math.sin(angle - Math.PI/points/3) * radius * 0.8;
        
        const x2 = Math.cos(angle + Math.PI/points/3) * radius * 0.8;
        const y2 = -Math.sin(angle + Math.PI/points/3) * radius * 0.8;
        
        const x = Math.cos(angle) * radius;
        const y = -Math.sin(angle) * radius;
        
        ctx.bezierCurveTo(x1, y1, x2, y2, x, y);
    }
    
    ctx.fill();
    
    // Draw veins
    ctx.strokeStyle = `rgb(${r-30}, ${g-10}, ${b-30})`;
    ctx.lineWidth = size/25;
    
    // Main vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size*0.7);
    ctx.stroke();
    
    // Side veins
    for (let i = 1; i < 5; i++) {
        const y = -i * size/6;
        
        // Left vein
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
            -size/6, y - size/20,
            -size/3, y - size/10,
            -size/2, y - size/8
        );
        ctx.stroke();
        
        // Right vein
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(
            size/6, y - size/20,
            size/3, y - size/10,
            size/2, y - size/8
        );
        ctx.stroke();
    }
}

// Draw oval leaf (spinach)
function drawOvalLeaf(ctx, size, r, g, b) {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw stem
    ctx.beginPath();
    ctx.rect(-size/20, 0, size/10, size/3);
    ctx.fill();
    
    // Draw oval leaf
    ctx.beginPath();
    ctx.ellipse(0, -size/2, size/2, size*0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw veins
    ctx.strokeStyle = `rgb(${r-30}, ${g-20}, ${b-30})`;
    ctx.lineWidth = size/25;
    
    // Main vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size);
    ctx.stroke();
    
    // Side veins
    for (let i = 1; i < 6; i++) {
        const y = -size/6 - i * size/7;
        const angle = 30 + i * 5; // Gradually increasing angle
        const angleRad = angle * Math.PI / 180;
        
        // Left vein
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(-Math.cos(angleRad) * size/2, y - Math.sin(angleRad) * size/4);
        ctx.stroke();
        
        // Right vein
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(Math.cos(angleRad) * size/2, y - Math.sin(angleRad) * size/4);
        ctx.stroke();
    }
    
    // Add highlight
    ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.beginPath();
    ctx.ellipse(0, -size/2, size/3, size/2, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Default simple leaf
function drawDefaultLeaf(ctx, size, r, g, b) {
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    
    // Draw a simple leaf shape
    ctx.beginPath();
    ctx.ellipse(0, -size/2, size/2, size, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add vein
    ctx.strokeStyle = `rgb(${r-20}, ${g-20}, ${b-20})`;
    ctx.lineWidth = size/20;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -size);
    ctx.stroke();
}

// Utility function to get bounding box of a region
function getBoundingBox(points) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }
    
    return { minX, minY, maxX, maxY };
}