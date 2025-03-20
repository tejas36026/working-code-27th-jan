// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants
const TWO_PI = 6.28318530718;

// Breakfast item types
const BREAKFAST_ITEMS = {
    EGG: 0,
    BACON: 1,
    TOAST: 2,
    PANCAKE: 3
};

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let breakfastItems = [];
let activeItemIndex = 0;

// WebGL objects
let gl, shaderProgram, itemsDataTexture;
let vertexBuffer, positionLocation;
let uniforms = {};

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

        // Initialize canvas dimensions if not already set
        if (!canvasWidth || !canvasHeight) {
            canvasWidth = imageData.width;
            canvasHeight = imageData.height;
            initializeWebGL(canvasWidth, canvasHeight);
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            // Apply the breakfast effect
            resultImageData = applyBreakfastEffect(imageData, selectedRegions, value);
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
    breakfastItems = [];
    activeItemIndex = 0;
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    return currentIteration / iterations;
}

// Initialize WebGL
function initializeWebGL(width, height) {
    const offscreenCanvas = new OffscreenCanvas(width, height);
    gl = offscreenCanvas.getContext('webgl');
    
    if (!gl) {
        throw new Error("WebGL is not supported in this worker context");
    }
    
    // Create shaders
    const vertShader = createShader(gl, getVertexShaderSource(), gl.VERTEX_SHADER);
    const fragShader = createShader(gl, getFragmentShaderSource(), gl.FRAGMENT_SHADER);
    
    // Create program
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Could not initialize shaders");
    }
    
    gl.useProgram(shaderProgram);
    
    // Set up vertex buffer
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Get attribute location
    positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Set up uniforms
    uniforms.u_ratio = gl.getUniformLocation(shaderProgram, "u_ratio");
    uniforms.u_resolution_scale = gl.getUniformLocation(shaderProgram, "u_resolution_scale");
    uniforms.u_time = gl.getUniformLocation(shaderProgram, "u_time");
    uniforms.u_items_data_texture = gl.getUniformLocation(shaderProgram, "u_items_data_texture");
    
    gl.uniform1f(uniforms.u_ratio, width / height);
    gl.uniform1f(uniforms.u_resolution_scale, width > height ? 1 : (height / width));
    
    // Setup breakfast items data texture
    setupItemsDataTexture();
    
    // Set viewport
    gl.viewport(0, 0, width, height);
}

// Create a WebGL shader
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error("Shader compile error: " + gl.getShaderInfoLog(shader));
    }
    
    return shader;
}

function setupItemsDataTexture() {
    // Create a texture to hold item data
    // Format: [x, y, type, progress, rotation, scale] packed into RGBA values
    itemsDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, itemsDataTexture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize with empty data (support for up to 20 items)
    // Use Uint8Array instead of Float32Array for better compatibility
    const itemsData = new Uint8Array(20 * 4 * 2).fill(0); // 20 items, 2 pixels per item (8 values total)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 20, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, itemsData);
    
    // Set the texture uniform
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, itemsDataTexture);
    gl.uniform1i(uniforms.u_items_data_texture, 0);
}



function updateItemsDataTexture() {
    // Create data array for 20 items with 8 values each (packed into 2 pixels)
    const itemsData = new Uint8Array(20 * 4 * 2).fill(0);
    
    // Fill with item positions and properties
    for (let i = 0; i < breakfastItems.length && i < 20; i++) {
        const item = breakfastItems[i];
        const baseIdx1 = i * 8;
        const baseIdx2 = baseIdx1 + 4;
        
        // First pixel: x, y, type, progress
        itemsData[baseIdx1] = Math.floor(item.x * 255);           // x position
        itemsData[baseIdx1 + 1] = Math.floor(item.y * 255);       // y position
        itemsData[baseIdx1 + 2] = Math.floor(item.type * 64);     // item type (0-3)
        itemsData[baseIdx1 + 3] = Math.floor(item.progress * 255); // animation progress
        
        // Second pixel: rotation, scale, and two extra values for future use
        itemsData[baseIdx2] = Math.floor((item.rotation / (Math.PI * 2)) * 255); // rotation normalized to 0-255
        itemsData[baseIdx2 + 1] = Math.floor(item.scale * 128);   // scale (0-2 normalized to 0-255)
        itemsData[baseIdx2 + 2] = 0; // reserved for future use
        itemsData[baseIdx2 + 3] = 255; // full alpha
    }
    
    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, itemsDataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 20, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, itemsData);
}

// Apply breakfast effect
function applyBreakfastEffect(imageData, selectedRegions, intensity) {
    if (!gl) {
        return imageData;
    }
    
    // Create result ImageData
    const resultImageData = new ImageData(canvasWidth, canvasHeight);
    
    // Get center of the selected region
    const region = selectedRegions[0];
    const centerX = region.reduce((sum, point) => sum + point.x, 0) / region.length;
    const centerY = region.reduce((sum, point) => sum + point.y, 0) / region.length;
    
    // Add breakfast items at the center if we're just starting
    if (currentIteration === 0) {
        addBreakfastItem(centerX / canvasWidth, centerY / canvasHeight, BREAKFAST_ITEMS.EGG, 1.0);
        
        // Add some surrounding items with different types
        const radius = 0.1;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = (0.5 + Math.random() * 0.5) * radius;
            const x = centerX / canvasWidth + Math.cos(angle) * distance;
            const y = centerY / canvasHeight + Math.sin(angle) * distance;
            
            // Randomly choose a breakfast item type
            const type = Math.floor(Math.random() * 4);
            const scale = 0.7 + Math.random() * 0.6;
            
            addBreakfastItem(x, y, type, scale);
        }
    }
    
    // Occasionally add a new item
    if (currentIteration % 30 === 0 && breakfastItems.length < 15) {
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDist = 0.05 + Math.random() * 0.1;
        const x = centerX / canvasWidth + Math.cos(randomAngle) * randomDist;
        const y = centerY / canvasHeight + Math.sin(randomAngle) * randomDist;
        
        const type = Math.floor(Math.random() * 4);
        const scale = 0.6 + Math.random() * 0.8;
        
        addBreakfastItem(x, y, type, scale);
    }
    
    // Update breakfast item animations
    updateBreakfastItemAnimations();
    
    // Update items data texture
    updateItemsDataTexture();
    
    // Set time uniform
    const currentTime = (performance.now() - animationStartTime) / 1000;
    gl.uniform1f(uniforms.u_time, currentTime);
    
    // Draw the scene
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Read pixels from WebGL
    const pixels = new Uint8Array(canvasWidth * canvasHeight * 4);
    gl.readPixels(0, 0, canvasWidth, canvasHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    // Copy to result image data (flipping y-axis)
    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            const srcIdx = ((canvasHeight - y - 1) * canvasWidth + x) * 4;
            const dstIdx = (y * canvasWidth + x) * 4;
            
            // Alpha blending with original image
            const srcAlpha = pixels[srcIdx + 3] / 255;
            if (srcAlpha > 0) {
                const dstAlpha = imageData.data[dstIdx + 3] / 255;
                const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
                
                // Only blend if the result will be visible
                if (outAlpha > 0) {
                    resultImageData.data[dstIdx] = (pixels[srcIdx] * srcAlpha + 
                                                 imageData.data[dstIdx] * dstAlpha * (1 - srcAlpha)) / outAlpha;
                    resultImageData.data[dstIdx + 1] = (pixels[srcIdx + 1] * srcAlpha + 
                                                     imageData.data[dstIdx + 1] * dstAlpha * (1 - srcAlpha)) / outAlpha;
                    resultImageData.data[dstIdx + 2] = (pixels[srcIdx + 2] * srcAlpha + 
                                                     imageData.data[dstIdx + 2] * dstAlpha * (1 - srcAlpha)) / outAlpha;
                    resultImageData.data[dstIdx + 3] = outAlpha * 255;
                }
            } else {
                // Keep original pixel from image data
                resultImageData.data[dstIdx] = imageData.data[dstIdx];
                resultImageData.data[dstIdx + 1] = imageData.data[dstIdx + 1];
                resultImageData.data[dstIdx + 2] = imageData.data[dstIdx + 2];
                resultImageData.data[dstIdx + 3] = imageData.data[dstIdx + 3];
            }
        }
    }
    
    return resultImageData;
}

// Add a breakfast item
function addBreakfastItem(x, y, type, scale) {
    // Keep a maximum of 15 items
    if (breakfastItems.length >= 15) {
        breakfastItems.shift();
    }
    
    // Add new item
    breakfastItems.push({
        x: x,
        y: y,
        type: type,
        progress: 0.0,
        rotation: Math.random() * Math.PI * 2,
        scale: scale,
        startTime: performance.now(),
        velocity: { x: (Math.random() - 0.5) * 0.001, y: (Math.random() - 0.5) * 0.001 },
        rotationSpeed: (Math.random() - 0.5) * 0.02
    });
}

// Update breakfast item animations
function updateBreakfastItemAnimations() {
    const currentTime = performance.now();
    
    for (let i = 0; i < breakfastItems.length; i++) {
        const item = breakfastItems[i];
        const elapsed = currentTime - item.startTime;
        
        // Update progress (3 second animation)
        item.progress = Math.min(elapsed / 3000, 1);
        
        // Update position based on velocity
        item.x += item.velocity.x;
        item.y += item.velocity.y;
        
        // Update rotation
        item.rotation += item.rotationSpeed;
        
        // Keep items within bounds
        item.x = Math.max(0.05, Math.min(0.95, item.x));
        item.y = Math.max(0.05, Math.min(0.95, item.y));
        
        // Slightly bounce off edges
        if (item.x <= 0.05 || item.x >= 0.95) {
            item.velocity.x *= -0.8;
        }
        if (item.y <= 0.05 || item.y >= 0.95) {
            item.velocity.y *= -0.8;
        }
    }
    
    // Remove old items
    breakfastItems = breakfastItems.filter(item => {
        const elapsed = currentTime - item.startTime;
        return elapsed < 15000; // Keep items for 15 seconds
    });
}

// Get vertex shader source
function getVertexShaderSource() {
    return `
    precision highp float;

    varying vec2 vUv;
    attribute vec2 a_position;

    void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
    `;
}

// Get fragment shader source
function getFragmentShaderSource() {
    return `
    precision highp float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_resolution_scale;
    uniform sampler2D u_items_data_texture;

    #define TWO_PI 6.28318530718
    #define ITEM_TYPE_EGG 0.0
    #define ITEM_TYPE_BACON 1.0
    #define ITEM_TYPE_TOAST 2.0
    #define ITEM_TYPE_PANCAKE 3.0

    // Utility functions
    float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float hash(float n) { 
        return fract(sin(n) * 43758.5453123); 
    }

    vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 18.5453);
    }

    // Noise functions
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f*f*(3.0-2.0*f);
        
        float a = rand(i);
        float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0));
        float d = rand(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float f = 0.0;
        float w = 0.5;
        for (int i = 0; i < 5; i++) {
            f += w * noise(p);
            p *= 2.0;
            w *= 0.5;
        }
        return f;
    }

    vec2 rotate(vec2 uv, float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c) * uv;
    }

    // Shape functions
    float circle(vec2 uv, float r) {
        return smoothstep(r, r-0.01, length(uv));
    }

    float ellipse(vec2 uv, vec2 r) {
        return smoothstep(1.0, 0.99, dot(uv/r, uv/r));
    }

    float rectangle(vec2 uv, vec2 size) {
        vec2 d = abs(uv) - size;
        return 1.0 - smoothstep(0.0, 0.01, max(d.x, d.y));
    }

    float roundedRectangle(vec2 uv, vec2 size, float radius) {
        vec2 d = abs(uv) - size + radius;
        return 1.0 - smoothstep(radius, radius-0.01, length(max(d, 0.0)) + min(max(d.x, d.y), 0.0));
    }

    // Function to draw a realistic fried egg
    vec4 drawEgg(vec2 uv, float progress, float time) {
        vec4 color = vec4(0.0);
        
        // Egg white
        float whiteNoise = fbm(uv * 5.0 + vec2(time * 0.1));
        float white = ellipse(uv, vec2(0.5, 0.4));
        white *= (0.9 + 0.1 * whiteNoise);
        
        // Add small bubbles to the egg white
        float bubbles = 0.0;
        for (int i = 0; i < 10; i++) {
            vec2 pos = vec2(
                hash(float(i) * 43.2) - 0.5, 
                hash(float(i) * 71.3) - 0.5
            ) * 0.5;
            float size = 0.02 + 0.03 * hash(float(i) * 13.1);
            bubbles += smoothstep(size, size-0.01, length(uv - pos)) * 0.03;
        }
        
        // Egg yolk
        float yolkSize = 0.15 + 0.02 * sin(time);
        vec2 yolkPos = vec2(0.0, -0.05); // Slightly off center
        float yolk = circle(uv - yolkPos, yolkSize);
        
        // Add reflection on yolk
        float yolkReflection = smoothstep(0.08, 0.0, length(uv - yolkPos - vec2(0.05, 0.05)));
        
        // Colors
        vec3 whiteColor = vec3(0.95, 0.95, 0.9) * (1.0 + 0.1 * whiteNoise);
        vec3 yolkColor = vec3(1.0, 0.65, 0.1) * (1.0 + 0.2 * fbm(uv * 4.0 + vec2(time * 0.2)));
        vec3 yolkReflectionColor = vec3(1.0, 0.9, 0.6);
        
        // Combine
        color.rgb = mix(color.rgb, whiteColor, white * progress);
        color.rgb = mix(color.rgb, whiteColor * 0.9 - vec3(0.1), bubbles * white);
        color.rgb = mix(color.rgb, yolkColor, yolk * progress);
        color.rgb = mix(color.rgb, yolkReflectionColor, yolkReflection * yolk * progress * 0.7);
        
        // Alpha
        color.a = max(white, yolk) * progress;
        
        // Add a slight crispy edge to the white
        float edge = smoothstep(0.5, 0.48, length(uv / vec2(0.5, 0.4)));
        edge -= smoothstep(0.48, 0.46, length(uv / vec2(0.5, 0.4)));
        color.rgb = mix(color.rgb, vec3(0.85, 0.65, 0.3), edge * white * progress);
        
        return color;
    }

    // Function to draw realistic bacon
    vec4 drawBacon(vec2 uv, float progress, float time) {
        vec4 color = vec4(0.0);
        
        // Deform UV for wavy bacon shape
        float waveAmp = 0.1;
        float waveFreq = 8.0;
        float wave = sin(uv.y * waveFreq + time) * waveAmp;
        
        // Adjust UVs for the strip shape
        uv.x += wave;
        
        // Create a bacon strip shape
        float strip = roundedRectangle(uv, vec2(0.35, 0.2), 0.05);
        
        // Create meat and fat pattern
        float pattern = fbm(uv * 7.0 + vec2(0.0, time * 0.1));
        float fatPattern = smoothstep(0.4, 0.6, fbm(uv * 5.0 + vec2(0.0, time * 0.05)));
        
        // Colors
        vec3 meatColor = mix(vec3(0.6, 0.2, 0.15), vec3(0.8, 0.3, 0.2), fbm(uv * 8.0));
        vec3 fatColor = vec3(0.95, 0.85, 0.7) * (0.8 + 0.2 * pattern);
        vec3 baconColor = mix(meatColor, fatColor, fatPattern);
        
        // Sizzle effect
        float sizzle = step(0.97, noise(uv * 40.0 + time));
        baconColor += sizzle * vec3(0.3, 0.1, 0.0);
        
        // Crispy edges
        float edge = smoothstep(0.35, 0.33, abs(uv.x)) * smoothstep(0.2, 0.18, abs(uv.y));
        edge -= smoothstep(0.33, 0.31, abs(uv.x)) * smoothstep(0.18, 0.16, abs(uv.y));
        baconColor = mix(baconColor, vec3(0.4, 0.2, 0.1), edge * 0.6);
        
        // Combine
        color.rgb = mix(color.rgb, baconColor, strip * progress);
        color.a = strip * progress;
        
        return color;
    }

    // Function to draw toast
    vec4 drawToast(vec2 uv, float progress, float time) {
        vec4 color = vec4(0.0);
        
        // Toast shape
        float toast = roundedRectangle(uv, vec2(0.4, 0.35), 0.05);
        
        // Toast texture
        float toastTexture = fbm(uv * 10.0 + vec2(time * 0.05));
        
        // Toast color with gradient from center to edges
        float centerDist = length(uv) / 0.4;
        vec3 toastColorCenter = vec3(0.95, 0.8, 0.5); // light golden
        vec3 toastColorEdge = vec3(0.7, 0.5, 0.2);    // darker, more toasted
        vec3 toastColor = mix(toastColorCenter, toastColorEdge, smoothstep(0.5, 1.0, centerDist));
        
        // Add some variation in the toast color
        toastColor *= (0.9 + 0.2 * toastTexture);
        
        // Toasted spots
        for (int i = 0; i < 8; i++) {
            vec2 pos = vec2(
                hash(float(i) * 37.2) * 0.8 - 0.4, 
                hash(float(i) * 65.3) * 0.7 - 0.35
            );
            float size = 0.03 + 0.04 * hash(float(i) * 17.1);
            float spot = smoothstep(size, size-0.01, length(uv - pos));
            toastColor = mix(toastColor, vec3(0.4, 0.25, 0.1), spot * 0.6);
        }
        
        // Combine
        color.rgb = mix(color.rgb, toastColor, toast * progress);
        color.a = toast * progress;
        
        return color;
    }

    // Function to draw pancakes
    vec4 drawPancake(vec2 uv, float progress, float time) {
        vec4 color = vec4(0.0);
        
        // Pancake shape - slightly oval
        float pancake = ellipse(uv, vec2(0.4, 0.3));
        
        // Pancake texture
        float pancakeTexture = fbm(uv * 8.0 + vec2(time * 0.05));
        
        // Small bubbles in the pancake
        float bubbles = 0.0;
        for (int i = 0; i < 15; i++) {
            vec2 pos = vec2(
                hash(float(i) * 31.2) * 0.7 - 0.35, 
                hash(float(i) * 57.3) * 0.5 - 0.25
            );
            float size = 0.01 + 0.02 * hash(float(i) * 19.1);
            bubbles += smoothstep(size, size-0.005, length(uv - pos)) * 0.1;
        }
        
        // Pancake color
        vec3 pancakeColor = vec3(0.9, 0.75, 0.55) * (0.9 + 0.2 * pancakeTexture);
        
        // Syrup dripping
        float syrup = 0.0;
        for (int i = 0; i < 3; i++) {
            float xPos = hash(float(i) * 23.7) * 0.6 - 0.3;
            float width = 0.05 + 0.05 * hash(float(i) * 45.3);
            syrup += smoothstep(width, width-0.01, abs(uv.x - xPos)) 
                   * smoothstep(0.0, 0.3, uv.y) 
                   * smoothstep(0.3, 0.0, uv.y + 0.1);
        }
        
        // Combine with pancake
        color.rgb = mix(color.rgb, pancakeColor, pancake * progress);
        color.rgb = mix(color.rgb, pancakeColor * 0.8, bubbles * pancake * progress);
        
        // Add syrup
        color.rgb = mix(color.rgb, vec3(0.5, 0.25, 0.1), syrup * pancake * progress * 0.7);
        
        // Slight browning at the edges
        float edge = smoothstep(0.4, 0.38, length(uv / vec2(0.4, 0.3)));
        edge -= smoothstep(0.38, 0.36, length(uv / vec2(0.4, 0.3)));
        color.rgb = mix(color.rgb, vec3(0.7, 0.5, 0.3), edge * pancake * progress);
        
        color.a = pancake * progress;
        
        // Add a small pool of syrup around the pancake
        float syrupPool = smoothstep(0.4, 0.5, length(uv / vec2(0.4, 0.3)));
        syrupPool *= smoothstep(0.6, 0.5, length(uv / vec2(0.4, 0.3)));
        syrupPool *= smoothstep(0.0, 0.2, uv.y + 0.1);
        
        color.rgb = mix(color.rgb, vec3(0.5, 0.25, 0.1), syrupPool * progress * 0.8);
        color.a = max(color.a, syrupPool * progress * 0.8);
        
        return color;
    }

    void main() {
        vec2 uv = vUv;
        vec2 screenUV = uv * u_resolution_scale;
        screenUV.x *= u_ratio;
        
        vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);
        
        // Process each breakfast item
        for (int i = 0; i < 20; i++) {
            // Read item data
            // Layout: [x, y, type, progress, rotation, scale]
            float row = floor(float(i) / 4.0);
            float col = mod(float(i), 4.0);
            vec4 data1 = texture2D(u_items_data_texture, vec2(col / 10.0, row / 12.0));
            vec4 data2 = texture2D(u_items_data_texture, vec2((col + 1.0) / 10.0, row / 12.0));
            
            float x = data1.r;
            float y = data1.g;
            float type = data1.b;
            float progress = data1.a;
            float rotation = data2.r;
            float scale = data2.g;
            
            // Skip if no item (x, y both 0)
            if (x == 0.0 && y == 0.0) continue;
            
            // Calculate UV relative to this item
            vec2 itemUV = screenUV - vec2(x * u_ratio, y);
            
            // Apply rotation and scale
            itemUV = rotate(itemUV, rotation);
            itemUV /= scale;
            
            // Draw different breakfast items
            vec4 itemColor;
            if (type < 0.5) { // Egg
                itemColor = drawEgg(itemUV, progress, u_time);
            } else if (type < 1.5) { // Bacon
                itemColor = drawBacon(itemUV, progress, u_time);
            } else if (type < 2.5) { // Toast
                itemColor = drawToast(itemUV, progress, u_time);
            } else { // Pancake
                itemColor = drawPancake(itemUV, progress, u_time);
            }
            
            // Alpha composite
            finalColor = vec4(
                mix(finalColor.rgb, itemColor.rgb, itemColor.a),
                finalColor.a + itemColor.a * (1.0 - finalColor.a)
            );
        }
        
        gl_FragColor = finalColor;
    }
    `;
}