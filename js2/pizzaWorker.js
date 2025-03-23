// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the pizza shader
const TWO_PI = 6.28318530718;

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let clickPositions = [];
let activeClickIndex = 0;

// WebGL objects
let gl = null;
let shaderProgram = null;
let clicksDataTexture = null;
let vertexBuffer, positionLocation;
let programInitialized = false;

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

// Reset animation state
function resetAnimationState() {
    currentIteration = 0;
    animationStartTime = performance.now();
    clickPositions = [];
    activeClickIndex = 0;
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    return currentIteration / iterations;
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
        
        // Setup click data texture
        setupClickDataTexture();
        
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
        
        // Add random clicks occasionally
        if (Math.random() < 0.05) {
            const randomX = centerX + (Math.random() - 0.5) * 100;
            const randomY = centerY + (Math.random() - 0.5) * 100;
            addClick(randomX / canvasWidth, randomY / canvasHeight);
        }
        
        // Update click animations
        updateClickAnimations();
        
        // Update click data texture
        updateClickDataTexture();
        
        // Make sure the program is active
        gl.useProgram(shaderProgram);
        
        // Set time uniform
        const timeUniform = gl.getUniformLocation(shaderProgram, "u_time");
        if (timeUniform !== null) {
            const currentTime = (performance.now() - animationStartTime) / 1000;
            gl.uniform1f(timeUniform, 10 + currentTime);
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

// Get fragment shader source for pizza 
function getFragmentShaderSource() {
    return `
    precision mediump float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_resolution_scale;
    uniform sampler2D u_click_data_texture;

    #define TWO_PI 6.28318530718

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

    // Function to create a pizza slice shape
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

    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;

        // Adjust UV coordinates for aspect ratio
        uv.x *= u_ratio;
        
        // Center and scale UV coordinates
        uv = (uv - 0.5) * 2.0;
        
        float t = u_time * 0.2;

        // Base pizza colors
        vec3 crustColor = vec3(0.82, 0.55, 0.25);
        vec3 sauceColor = vec3(0.72, 0.12, 0.07);
        vec3 cheeseColor = vec3(0.95, 0.85, 0.5);
        vec3 pepperoniColor = vec3(0.6, 0.1, 0.05);
        
        // Create the pizza base
        float crustSize = 0.1;
        float pizza = pizzaSlice(uv, 0.05, crustSize);
        
        // Add crust texture
        float crustNoise = snoise(uv * 10.0) * 0.1;
        float crust = smoothstep(1.0 - crustSize - crustNoise, 1.0 - crustSize + 0.03 + crustNoise, length(uv));
        crust *= pizza;
        
        // Add sauce and cheese texture
        float sauceNoise = snoise(uv * 15.0 + vec2(t * 0.1, t * 0.2)) * 0.05;
        float cheeseNoise = snoise(uv * 20.0 + vec2(t * 0.2, t * 0.3)) * 0.15;
        
        // Create sauce and cheese layers
        float sauce = pizza * (1.0 - crust) * (1.0 + sauceNoise);
        float cheese = sauce * (0.7 + cheeseNoise);
        
        // Add some brown cheese spots
        float brownSpots = smoothstep(0.65, 0.7, snoise(uv * 8.0 + t * 0.05));
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
        
        // Combine all the layers
        vec3 color = vec3(0.0);
        
        // Apply crust
        color = mix(color, crustColor * (0.8 + 0.2 * crustNoise), crust);
        
        // Apply sauce
        color = mix(color, sauceColor * (0.9 + 0.2 * sauceNoise), sauce * (1.0 - cheese * 0.5));
        
        // Apply cheese
        color = mix(color, cheeseColor * (0.9 + 0.2 * cheeseNoise), cheese);
        
        // Apply brown spots on cheese
        color = mix(color, vec3(0.7, 0.5, 0.2), brownSpots * 0.5);
        
        // Apply pepperoni
        color = mix(color, pepperoniColor, pepperoni * pizza);
        
        // Apply slice separation lines
        color = mix(color, vec3(0.3, 0.1, 0.05), sliceSeparation * 0.5);
        
        // Add some slight highlights to simulate grease
        float highlight = smoothstep(0.4, 0.6, snoise(uv * 5.0 + t * 0.1)) * cheese;
        color += highlight * 0.1;
        
        // Ensure the right opacity
        float opacity = pizza > 0.001 ? 1.0 : 0.0;
        
        gl_FragColor = vec4(color, opacity);
    }
    `;
}