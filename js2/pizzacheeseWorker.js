// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the pizza shader
const TWO_PI = 6.28318530718;
const PI = 3.14159265359;

// Physics and animation constants
const GRAVITY = 0.05;
const SLICE_ELASTICITY = 0.65;
const FRICTION = 0.97;

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let clickPositions = [];
let activeClickIndex = 0;

// Pizza state
let pizzaSlices = [];
let pizzaBroken = false;
let lastImpactTime = 0;
let pizzaRotation = 0;
let pizzaScale = 1.0;

// WebGL objects
let gl = null;
let shaderProgram = null;
let clicksDataTexture = null;
let slicesDataTexture = null;
let vertexBuffer, positionLocation;
let programInitialized = false;

// Create transparent ImageData object
function createTransparentImageData(width, height) {
    return new ImageData(new Uint8ClampedArray(width * height * 4), width, height);
}

// Handle messages from the main thread
self.onmessage = function(e) {
    const { imageData, selectedRegions, value, value5: iterations = DEFAULT_ITERATIONS, reset, action } = e.data;

    try {
        if (reset) {
            resetAnimationState();
        }

        // Handle special actions
        if (action === 'break_pizza') {
            breakPizza();
        }

        // Initialize canvas dimensions if not already set
        if (!canvasWidth || !canvasHeight) {
            canvasWidth = imageData.width;
            canvasHeight = imageData.height;
            initializeWebGL(canvasWidth, canvasHeight);
            initializePizzaSlices();
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            // Apply the pizza effect
            resultImageData = applyPizzaEffect(imageData, selectedRegions, value);
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

// Initialize pizza slices physics
function initializePizzaSlices() {
    pizzaSlices = [];
    
    // Create 8 slices
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * TWO_PI;
        pizzaSlices.push({
            index: i,
            angle: angle,
            originalAngle: angle,
            xOffset: 0,
            yOffset: 0,
            xVelocity: 0,
            yVelocity: 0,
            rotationVelocity: 0,
            rotation: 0,
            scale: 1.0,
            active: true
        });
    }
}

// Break the pizza into slices that can move independently
function breakPizza() {
    if (pizzaBroken) return;
    
    pizzaBroken = true;
    lastImpactTime = performance.now();
    
    // Add random velocities to each slice
    for (let i = 0; i < pizzaSlices.length; i++) {
        const slice = pizzaSlices[i];
        const angleForce = slice.angle;
        
        // Apply forces in direction of slice
        slice.xVelocity = Math.cos(angleForce) * (0.5 + Math.random() * 2);
        slice.yVelocity = Math.sin(angleForce) * (0.5 + Math.random() * 2);
        slice.rotationVelocity = (Math.random() - 0.5) * 0.1;
    }
}

// Reset animation state
function resetAnimationState() {
    currentIteration = 0;
    animationStartTime = performance.now();
    clickPositions = [];
    activeClickIndex = 0;
    pizzaBroken = false;
    pizzaRotation = 0;
    pizzaScale = 1.0;
    initializePizzaSlices();
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    return currentIteration / iterations;
}

// Update pizza physics
function updatePizzaPhysics() {
    const currentTime = performance.now();
    
    // Whole pizza animation (when not broken)
    if (!pizzaBroken) {
        // Add wobble effect
        pizzaRotation = Math.sin(currentTime * 0.001) * 0.05;
        pizzaScale = 1.0 + Math.sin(currentTime * 0.002) * 0.02;
        return;
    }
    
    // Update each slice
    for (let i = 0; i < pizzaSlices.length; i++) {
        const slice = pizzaSlices[i];
        
        if (!slice.active) continue;
        
        // Apply gravity
        slice.yVelocity += GRAVITY;
        
        // Apply velocities
        slice.xOffset += slice.xVelocity;
        slice.yOffset += slice.yVelocity;
        slice.rotation += slice.rotationVelocity;
        
        // Apply friction
        slice.xVelocity *= FRICTION;
        slice.yVelocity *= FRICTION;
        slice.rotationVelocity *= FRICTION;
        
        // Bounce off walls
        if (Math.abs(slice.xOffset) > 1.0) {
            slice.xVelocity *= -SLICE_ELASTICITY;
            slice.xOffset = Math.sign(slice.xOffset) * 0.99;
        }
        
        // Bounce off floor
        if (slice.yOffset > 1.0) {
            slice.yVelocity *= -SLICE_ELASTICITY;
            slice.yOffset = 0.99;
            
            // Add some random rotation on impact
            slice.rotationVelocity += (Math.random() - 0.5) * 0.05;
        }
        
        // Simulate slice leaving the scene
        if (slice.yOffset > 2.0) {
            slice.active = false;
        }
    }
}

// Initialize WebGL
function initializeWebGL(width, height) {
    try {
        const offscreenCanvas = new OffscreenCanvas(width, height);
        gl = offscreenCanvas.getContext('webgl');
        
        if (!gl) {
            throw new Error("WebGL is not supported in this worker context");
        }
        
        // Create shaders
        const vertexShaderSource = getVertexShaderSource();
        const fragmentShaderSource = getFragmentShaderSource();
        
        const vertShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        
        // Create program
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertShader);
        gl.attachShader(shaderProgram, fragShader);
        gl.linkProgram(shaderProgram);
        
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(shaderProgram);
            throw new Error("Could not initialize shaders. \nProgram link error: " + info);
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
        const ratioUniform = gl.getUniformLocation(shaderProgram, "u_ratio");
        const resolutionScaleUniform = gl.getUniformLocation(shaderProgram, "u_resolution_scale");
        
        if (ratioUniform !== null) {
            gl.uniform1f(ratioUniform, width / height);
        }
        
        if (resolutionScaleUniform !== null) {
            gl.uniform1f(resolutionScaleUniform, width > height ? 1 : (height / width));
        }
        
        // Setup data textures
        setupClickDataTexture();
        setupSlicesDataTexture();
        
        // Set viewport
        gl.viewport(0, 0, width, height);
        
        programInitialized = true;
    } catch (error) {
        console.error("Error initializing WebGL:", error);
        throw error;
    }
}

// Create a WebGL shader
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Shader compile error: " + info);
    }
    
    return shader;
}

// Set up click data texture
function setupClickDataTexture() {
    if (!gl || !shaderProgram) return;
    
    // Create a texture to hold click data
    clicksDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize with empty data
    const clickData = new Uint8Array(10 * 2 * 4).fill(0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 10, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, clickData);
    
    // Set the texture uniform
    const textureUniform = gl.getUniformLocation(shaderProgram, "u_click_data_texture");
    if (textureUniform !== null) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
        gl.uniform1i(textureUniform, 0);
    }
}

// Set up slices data texture
function setupSlicesDataTexture() {
    if (!gl || !shaderProgram) return;
    
    // Create a texture to hold slice data
    slicesDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, slicesDataTexture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize with empty data
    const slicesData = new Uint8Array(8 * 4 * 4).fill(0); // 8 slices, 4 rows, 4 bytes (RGBA)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, slicesData);
    
    // Set the texture uniform
    const textureUniform = gl.getUniformLocation(shaderProgram, "u_slices_data_texture");
    if (textureUniform !== null) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, slicesDataTexture);
        gl.uniform1i(textureUniform, 1);
    }
}

// Update click data texture
function updateClickDataTexture() {
    if (!gl || !clicksDataTexture) return;
    
    // Create data array
    const clickData = new Uint8Array(10 * 2 * 4).fill(0);
    
    // Fill with click positions
    for (let i = 0; i < clickPositions.length && i < 20; i++) {
        const click = clickPositions[i];
        const idx = i * 4;
        
        clickData[idx] = Math.floor(click.x * 255);
        clickData[idx + 1] = Math.floor(click.y * 255);
        clickData[idx + 2] = Math.floor(click.clickDistance * 255);
        clickData[idx + 3] = Math.floor(click.radius * 255);
    }
    
    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 10, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, clickData);
}

// Update slices data texture
function updateSlicesDataTexture() {
    if (!gl || !slicesDataTexture) return;
    
    // Create data array
    const slicesData = new Uint8Array(8 * 4 * 4).fill(0);
    
    // Fill with slice position/rotation data
    for (let i = 0; i < pizzaSlices.length; i++) {
        const slice = pizzaSlices[i];
        
        // Row 0: Base parameters
        slicesData[i * 4] = slice.active ? 255 : 0;
        slicesData[i * 4 + 1] = Math.floor((slice.angle / TWO_PI) * 255);
        slicesData[i * 4 + 2] = Math.floor(((slice.originalAngle / TWO_PI) * 255));
        slicesData[i * 4 + 3] = Math.floor(slice.scale * 255);
        
        // Row 1: Position
        slicesData[i * 4 + 32] = Math.floor(((slice.xOffset + 1.0) / 2.0) * 255);
        slicesData[i * 4 + 33] = Math.floor(((slice.yOffset + 1.0) / 2.0) * 255);
        slicesData[i * 4 + 34] = 0; // reserved
        slicesData[i * 4 + 35] = 0; // reserved
        
        // Row 2: Rotation
        slicesData[i * 4 + 64] = Math.floor(((slice.rotation + PI) / TWO_PI) * 255);
        slicesData[i * 4 + 65] = 0; // reserved
        slicesData[i * 4 + 66] = 0; // reserved
        slicesData[i * 4 + 67] = 0; // reserved
        
        // Row 3: Velocity
        slicesData[i * 4 + 96] = Math.floor(((slice.xVelocity + 1.0) / 2.0) * 255);
        slicesData[i * 4 + 97] = Math.floor(((slice.yVelocity + 1.0) / 2.0) * 255);
        slicesData[i * 4 + 98] = Math.floor(((slice.rotationVelocity + 1.0) / 2.0) * 255);
        slicesData[i * 4 + 99] = 0; // reserved
    }
    
    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, slicesDataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, slicesData);
}

// Apply pizza effect
function applyPizzaEffect(imageData, selectedRegions, intensity) {
    if (!gl || !programInitialized) {
        console.warn("WebGL not initialized properly, returning original image");
        return imageData;
    }
    
    try {
        // Create result ImageData
        const resultImageData = new ImageData(canvasWidth, canvasHeight);
        
        // Get center of the selected region
        const region = selectedRegions[0];
        const centerX = region.reduce((sum, point) => sum + point.x, 0) / region.length;
        const centerY = region.reduce((sum, point) => sum + point.y, 0) / region.length;
        
        // Add a click at the center if we're just starting
        if (currentIteration === 0 || currentIteration % 30 === 0) {
            addClick(centerX / canvasWidth, centerY / canvasHeight);
        }
        
        // Randomly break the pizza
        if (!pizzaBroken && Math.random() < 0.001) {
            breakPizza();
        }
        
        // Add random clicks occasionally for cheese bubbling and other effects
        if (Math.random() < 0.05) {
            const randomX = centerX + (Math.random() - 0.5) * 100;
            const randomY = centerY + (Math.random() - 0.5) * 100;
            addClick(randomX / canvasWidth, randomY / canvasHeight);
        }
        
        // Update animations
        updateClickAnimations();
        updatePizzaPhysics();
        
        // Update textures
        updateClickDataTexture();
        updateSlicesDataTexture();
        
        // Make sure the program is active
        gl.useProgram(shaderProgram);
        
        // Set time uniform
        const timeUniform = gl.getUniformLocation(shaderProgram, "u_time");
        if (timeUniform !== null) {
            const currentTime = (performance.now() - animationStartTime) / 1000;
            gl.uniform1f(timeUniform, 10 + currentTime);
        }
        
        // Set pizza uniforms
        const pizzaBrokenUniform = gl.getUniformLocation(shaderProgram, "u_pizza_broken");
        if (pizzaBrokenUniform !== null) {
            gl.uniform1i(pizzaBrokenUniform, pizzaBroken ? 1 : 0);
        }
        
        const pizzaRotationUniform = gl.getUniformLocation(shaderProgram, "u_pizza_rotation");
        if (pizzaRotationUniform !== null) {
            gl.uniform1f(pizzaRotationUniform, pizzaRotation);
        }
        
        const pizzaScaleUniform = gl.getUniformLocation(shaderProgram, "u_pizza_scale");
        if (pizzaScaleUniform !== null) {
            gl.uniform1f(pizzaScaleUniform, pizzaScale);
        }
        
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
                
                // Only copy non-transparent pixels
                if (pixels[srcIdx + 3] > 0) {
                    resultImageData.data[dstIdx] = pixels[srcIdx];
                    resultImageData.data[dstIdx + 1] = pixels[srcIdx + 1];
                    resultImageData.data[dstIdx + 2] = pixels[srcIdx + 2];
                    resultImageData.data[dstIdx + 3] = pixels[srcIdx + 3];
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
    } catch (error) {
        console.error("Error applying pizza effect:", error);
        return imageData; // Return original image on error
    }
}

// Add a click position
function addClick(x, y) {
    // Keep a maximum of 15 clicks
    if (clickPositions.length >= 15) {
        clickPositions.shift();
    }
    
    // Add new click
    clickPositions.push({
        x: x,
        y: y,
        clickDistance: 0,
        radius: 0,
        startTime: performance.now()
    });
}

// Update click animations
function updateClickAnimations() {
    const currentTime = performance.now();
    
    for (let i = 0; i < clickPositions.length; i++) {
        const click = clickPositions[i];
        const elapsed = currentTime - click.startTime;
        
        // Update click distance (2 second animation)
        click.clickDistance = Math.min(elapsed / 2000, 1);
        
        // Update radius (0.7 second animation)
        click.radius = Math.min(elapsed / 700, 1);
    }
    
    // Remove old clicks
    clickPositions = clickPositions.filter(click => {
        const elapsed = currentTime - click.startTime;
        return elapsed < 5000; // Keep clicks for 5 seconds
    });
}

// Get vertex shader source
function getVertexShaderSource() {
    return `
    precision mediump float;

    varying vec2 vUv;
    attribute vec2 a_position;

    void main() {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
    `;
}

// Get fragment shader source for enhanced pizza animation
function getFragmentShaderSource() {
    return `
    precision mediump float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_resolution_scale;
    uniform sampler2D u_click_data_texture;
    uniform sampler2D u_slices_data_texture;
    uniform int u_pizza_broken;
    uniform float u_pizza_rotation;
    uniform float u_pizza_scale;

    #define TWO_PI 6.28318530718
    #define PI 3.14159265359
    #define NUM_SLICES 8

    float rand(float n){ return fract(sin(n) * 43758.5453123); }
    float rand2(vec2 n) { 
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
    vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
        m = m*m;
        m = m*m;
        vec3 x = 2. * fract(p * C.www) - 1.;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130. * dot(m, g);
    }

    vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p)*18.5453);
    }

    vec2 rotateUV(vec2 uv, float angle) {
        float s = sin(angle), c = cos(angle);
        return mat2(c, -s, s, c) * uv;
    }

    // Function to get slice data
    vec4 getSliceData(int slice, int row) {
        // Normalize texture coordinates for accessing slice data
        float xCoord = (float(slice) + 0.5) / 8.0;
        float yCoord = (float(row) + 0.5) / 4.0;
        
        return texture2D(u_slices_data_texture, vec2(xCoord, yCoord));
    }

    // Function to check if point is in a pizza slice
    bool isInSlice(vec2 uv, int sliceIndex) {
        // Get slice data
        vec4 baseData = getSliceData(sliceIndex, 0);
        vec4 posData = getSliceData(sliceIndex, 1);
        vec4 rotData = getSliceData(sliceIndex, 2);
        
        // Check if slice is active
        if (baseData.r < 0.5) return false;
        
        // Get slice parameters
        float sliceAngle = baseData.g * TWO_PI;
        float originalAngle = baseData.b * TWO_PI;
        float scale = baseData.a;
        
        // Get position and rotation
        vec2 offset = vec2(posData.r * 2.0 - 1.0, posData.g * 2.0 - 1.0);
        float rotation = rotData.r * TWO_PI - PI;
        
        // Apply slice transform
        vec2 localUV = uv - offset;
        localUV = rotateUV(localUV, -rotation);
        
        // Check distance from center
        float dist = length(localUV);
        if (dist > scale) return false;
        
        // Get angle in slice space
        float angle = atan(localUV.y, localUV.x);
        angle = mod(angle + TWO_PI, TWO_PI);
        
        // Calculate slice bounds
        float sliceWidth = TWO_PI / float(NUM_SLICES);
        float startAngle = originalAngle - sliceWidth / 2.0;
        float endAngle = originalAngle + sliceWidth / 2.0;
        
        // Check if point is in slice angular bounds
        return (angle >= startAngle && angle <= endAngle) || 
               (angle + TWO_PI >= startAngle && angle + TWO_PI <= endAngle) ||
               (angle - TWO_PI >= startAngle && angle - TWO_PI <= endAngle);
    }

    // Function to create a pizza slice shape for the whole pizza
    float pizzaSlice(vec2 uv, float sliceWidth, float crustSize) {
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);
        
        // Normalize angle to [0, TWO_PI]
        angle = mod(angle, TWO_PI);
        
        // Check if we're in a slice
        float sliceAngle = TWO_PI / 8.0; // 8 slices
        float sliceIndex = floor(angle / sliceAngle);
        float sliceStart = sliceIndex * sliceAngle;
        float sliceCenter = sliceStart + sliceAngle * 0.5;
        float angleDiff = min(abs(angle - sliceStart), abs(angle - (sliceStart + sliceAngle)));
        
        // Create the pizza disc with crust
        float pizza = smoothstep(1.0, 0.98, dist); // Main pizza shape
        float crust = smoothstep(1.0 - crustSize, 1.0 - crustSize - 0.02, dist) * pizza; // Crust
        
        // Create slice separation lines
        float sliceSeparation = smoothstep(0.02, 0.0, angleDiff);
        
        return pizza;
    }

    // Function to create pizza toppings
    float makePepperoni(vec2 uv, vec2 position, float size) {
        float dist = length(uv - position);
        return smoothstep(size, size * 0.8, dist);
    }

    // Function to create cheese stretching lines
    float cheeseStretch(vec2 uv, vec2 from, vec2 to, float width, float waviness) {
        vec2 dir = to - from;
        float len = length(dir);
        dir /= len;
        
        vec2 normal = vec2(-dir.y, dir.x);
        
        // Project point onto line
        float t = dot(uv - from, dir);
        t = clamp(t, 0.0, len);
        
        vec2 projected = from + dir * t;
        float dist = length(uv - projected);
        
        // Add waviness
        float wave = sin(t * 10.0 + u_time * 2.0) * waviness;
        dist += wave;
        
        return smoothstep(width, width * 0.8, dist);
    }

    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;

        // Adjust UV coordinates for aspect ratio
        uv.x *= u_ratio;
        
        // Center and scale UV coordinates
        uv = (uv - 0.5) * 2.0;
        
        // Apply global pizza transforms when not broken
        if (u_pizza_broken == 0) {
            uv = rotateUV(uv, u_pizza_rotation);
            uv /= u_pizza_scale;
        }
        
        float t = u_time * 0.2;

        // Base pizza colors
        vec3 crustColor = vec3(0.82, 0.55, 0.25);
        vec3 sauceColor = vec3(0.72, 0.12, 0.07);
        vec3 cheeseColor = vec3(0.95, 0.85, 0.5);
        vec3 pepperoniColor = vec3(0.6, 0.1, 0.05);
        
        // Final color and opacity
        vec3 color = vec3(0.0);
        float opacity = 0.0;
        
        // Pre-compute cheese bubbling and browning effects
        float sauceNoise = snoise(uv * 15.0 + vec2(t * 0.1, t * 0.2)) * 0.05;
        float cheeseNoise = snoise(uv * 20.0 + vec2(t * 0.2, t * 0.3)) * 0.15;
        float brownSpots = smoothstep(0.65, 0.7, snoise(uv * 8.0 + t * 0.05));
        
        // If the pizza is broken, check each slice individually
        if (u_pizza_broken == 1) {
            // Check each slice
            for (int i = 0; i < NUM_SLICES; i++) {
                if (isInSlice(uv, i)) {
                    // Get slice data for positioning
                    vec4 baseData = getSliceData(i, 0);
                    vec4 posData = getSliceData(i, 1);
                    vec4 rotData = getSliceData(i, 2);
                    
                    // Get position and rotation for this slice
                    vec2 offset = vec2(posData.r * 2.0 - 1.0, posData.g * 2.0 - 1.0);
                    float rotation = rotData.r * TWO_PI - PI;
                    
                    // Transform uv to slice space
                    vec2 sliceUV = uv - offset;
                    sliceUV = rotateUV(sliceUV, -rotation);
                    
                    // Get original slice angle
                    float originalAngle = baseData.b * TWO_PI;
                    
                    // Calculate slice bounds
                    float sliceWidth = TWO_PI / float(NUM_SLICES);
                    float startAngle = originalAngle - sliceWidth / 2.0;
                    float endAngle = originalAngle + sliceWidth / 2.0;
                    
                    // Create the slice
                    float dist = length(sliceUV);
                    float angle = atan(sliceUV.y, sliceUV.x);
                    angle = mod(angle + TWO_PI, TWO_PI);
                    
                    // Check if point is within slice angle bounds
                    if ((angle >= startAngle && angle <= endAngle) || 
                        (angle + TWO_PI >= startAngle && angle + TWO_PI <= endAngle) ||
                        (angle - TWO_PI >= startAngle && angle - TWO_PI <= endAngle)) {
                        
                        // Create the slice with crust
                        float crustSize = 0.1;
                        float pizza = smoothstep(1.0, 0.98, dist);
                        float crust = smoothstep(1.0 - crustSize, 1.0 - crustSize - 0.02, dist) * pizza;
                        
                        // Add crust texture
                        float crustNoise = snoise(sliceUV * 10.0) * 0.1;
                        
                        // Calculate sauce and cheese for this slice
                        float sauce = pizza * (1.0 - crust) * (1.0 + sauceNoise);
                        float cheese = sauce * (0.7 + cheeseNoise);
                        
                        // Apply brown spots to this slice
                        float sliceBrownSpots = brownSpots * cheese;
                        
                        // Calculate pepperoni for this slice
                        float pepperoni = 0.0;
                        
                        // Add pepperoni if it falls within this slice's angle
                        for (int j = 0; j < 12; j++) {
                            float pepAngle = float(j) / 12.0 * TWO_PI;
                            // Only add pepperoni if it's within this slice's angle range
                            if ((pepAngle >= startAngle && pepAngle <= endAngle) || 
                                (pepAngle + TWO_PI >= startAngle && pepAngle + TWO_PI <= endAngle) ||
                                (pepAngle - TWO_PI >= startAngle && pepAngle - TWO_PI <= endAngle)) {
                                
                                float radius = 0.3 + 0.4 * rand(float(j) * 0.1);
                                vec2 pos = vec2(cos(pepAngle), sin(pepAngle)) * radius;
                                
                                // Add some random variation
                                pos += 0.1 * vec2(rand(pos.y), rand(pos.x)) - 0.05;
                                
                                float size = 0.08 + 0.04 * rand(pos.y);
                                pepperoni += makePepperoni(sliceUV, pos, size);
                            }
                        }
                        
                        // Apply cheese stretching between slices
                        float cheeseStretchEffect = 0.0;
                        
                        // Only apply cheese stretch if broken recently
                        if (u_time - 10.0 < 5.0) {
                            for (int j = 0; j < NUM_SLICES; j++) {
                                if (i != j) {
                                    vec4 otherPosData = getSliceData(j, 1);
                                    vec2 otherOffset = vec2(otherPosData.r * 2.0 - 1.0, otherPosData.g * 2.0 - 1.0);
                                    
                                    // Calculate distance between slices
                                    float sliceDist = length(offset - otherOffset);
                                    
                                    // Only stretch cheese between nearby slices
                                    if (sliceDist < 0.5) {
                                        float stretchWidth = 0.03 * (1.0 - sliceDist / 0.5);
                                        float waviness = 0.02 * (1.0 - sliceDist / 0.5);
                                        
                                        cheeseStretchEffect += cheeseStretch(uv, offset, otherOffset, stretchWidth, waviness);
                                    }
                                }
                            }
                        }
                        
                        // Combine all the layers for this slice
                        color = crustColor * (0.8 + 0.2 * crustNoise) * crust;
                        color += sauceColor * (0.9 + 0.2 * sauceNoise) * sauce * (1.0 - cheese * 0.5);
                        color += cheeseColor * (0.9 + 0.2 * cheeseNoise) * cheese;
                        color += vec3(0.7, 0.5, 0.2) * sliceBrownSpots * 0.5;
                        color += pepperoniColor * pepperoni * pizza;
                        color += cheeseColor * cheeseStretchEffect * 0.7;
                        
                        // Add some slight highlights to simulate grease
                        float highlight = smoothstep(0.4, 0.6, snoise(sliceUV * 5.0 + t * 0.1)) * cheese;
                        color += highlight * 0.1;
                        
                        opacity = pizza > 0.001 ? 1.0 : 0.0;
                        opacity += cheeseStretchEffect * 0.7;
                        
                        break; // We found the slice, no need to check others
                    }
                }
            }
        } else {
            // Regular whole pizza rendering
            float crustSize = 0.1;
            float pizza = pizzaSlice(uv, 0.05, crustSize);
            
            // Add crust texture
            float crustNoise = snoise(uv * 10.0) * 0.1;
            float crust = smoothstep(1.0 - crustSize - crustNoise, 1.0 - crustSize + 0.03 + crustNoise, length(uv));
            crust *= pizza;
            
            // Create sauce and cheese layers
            float sauce = pizza * (1.0 - crust) * (1.0 + sauceNoise);
            float cheese = sauce * (0.7 + cheeseNoise);
            
            // Add brown cheese spots
            brownSpots *= cheese;
            
            // Add pepperoni
            float pepperoni = 0.0;
            
            // Random pepperoni placements
            for (int i = 0; i < 12; i++) {
                float angle = float(i) / 12.0 * TWO_PI;
                float radius = 0.3 + 0.4 * rand(float(i) * 0.1);
                vec2 pos = vec2(cos(angle), sin(angle)) * radius;
                
                // Add some random variation
                pos += 0.1 * vec2(rand(pos.y), rand(pos.x)) - 0.05;
                
                float size = 0.08 + 0.04 * rand(pos.y);
                pepperoni += makePepperoni(uv, pos, size);
            }
            
            // Add pizza slices separation
            float sliceAngle = TWO_PI / 8.0; // 8 slices
            float sliceSeparation = 0.0;
            
            for (int i = 0; i < 8; i++) {
                float angle = float(i) * sliceAngle;
                float angleDiff = min(abs(mod(atan(uv.y, uv.x) + TWO_PI, TWO_PI) - angle), 
                                    abs(mod(atan(uv.y, uv.x) + TWO_PI, TWO_PI) - (angle + sliceAngle)));
                sliceSeparation += smoothstep(0.03, 0.0, angleDiff) * pizza;
            }
            
            // Combine all the layers for the whole pizza
            color = crustColor * (0.8 + 0.2 * crustNoise) * crust;
            color += sauceColor * (0.9 + 0.2 * sauceNoise) * sauce * (1.0 - cheese * 0.5);
            color += cheeseColor * (0.9 + 0.2 * cheeseNoise) * cheese;
            color += vec3(0.7, 0.5, 0.2) * brownSpots * 0.5;
            color += pepperoniColor * pepperoni * pizza;
            color += vec3(0.3, 0.1, 0.05) * sliceSeparation * 0.5;
            
            // Add some slight highlights to simulate grease
            float highlight = smoothstep(0.4, 0.6, snoise(uv * 5.0 + t * 0.1)) * cheese;
            color += highlight * 0.1;
            
            // Ensure the right opacity
            opacity = pizza > 0.001 ? 1.0 : 0.0;
        }
        
        // Add cheese bubbles popping effect
        if (length(color) > 0.01) {
            for (int i = 0; i < 15; i++) {
                // Sample click data
                float clickX = texture2D(u_click_data_texture, vec2((float(i) + 0.5) / 10.0, 0.25)).r;
                float clickY = texture2D(u_click_data_texture, vec2((float(i) + 0.5) / 10.0, 0.25)).g;
                float clickDistance = texture2D(u_click_data_texture, vec2((float(i) + 0.5) / 10.0, 0.25)).b;
                float clickRadius = texture2D(u_click_data_texture, vec2((float(i) + 0.5) / 10.0, 0.25)).a;
                
                if (clickRadius > 0.01) {
                    vec2 clickPos = vec2(clickX * 2.0 - 1.0, clickY * 2.0 - 1.0);
                    clickPos.x *= u_ratio;
                    
                    float dist = length(uv - clickPos);
                    float radiusVal = clickRadius * 0.2;
                    
                    // Create bubble pop effect
                    if (dist < radiusVal) {
                        // Make the center darker for the bubble pop
                        float darkness = smoothstep(radiusVal, 0.0, dist) * 0.6 * (1.0 - clickDistance);
                        color = mix(color, vec3(0.7, 0.3, 0.1), darkness);
                        
                        // Add a brighter edge to simulate the bubble edge
                        float edge = smoothstep(radiusVal * 0.8, radiusVal, dist) * 0.4 * (1.0 - clickDistance);
                        color = mix(color, vec3(1.0, 0.9, 0.5), edge);
                    }
                }
            }
        }
        
        gl_FragColor = vec4(color, opacity);
    }
    `;
}