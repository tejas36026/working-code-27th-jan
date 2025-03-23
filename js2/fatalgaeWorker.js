// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the salad shader
const TWO_PI = 6.28318530718;

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let clickPositions = [];
let activeClickIndex = 0;

// WebGL objects
let gl, shaderProgram, clicksDataTexture;
let vertexBuffer, positionLocation;

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
            // Apply the salad effect
            resultImageData = applySaladEffect(imageData, selectedRegions, value);
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
    const ratioUniform = gl.getUniformLocation(shaderProgram, "u_ratio");
    const resolutionScaleUniform = gl.getUniformLocation(shaderProgram, "u_resolution_scale");
    
    gl.uniform1f(ratioUniform, width / height);
    gl.uniform1f(resolutionScaleUniform, width > height ? 1 : (height / width));
    
    // Setup click data texture
    setupClickDataTexture();
    
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

// Set up click data texture
function setupClickDataTexture() {
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
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
    gl.uniform1i(textureUniform, 0);
}

// Update click data texture
function updateClickDataTexture() {
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

// Apply salad effect
function applySaladEffect(imageData, selectedRegions, intensity) {
    if (!gl) {
        return imageData;
    }
    
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
    
    // Add random clicks occasionally for more varied salad elements
    if (Math.random() < 0.08) {
        const randomX = centerX + (Math.random() - 0.5) * 120;
        const randomY = centerY + (Math.random() - 0.5) * 120;
        addClick(randomX / canvasWidth, randomY / canvasHeight);
    }
    
    // Update click animations
    updateClickAnimations();
    
    // Update click data texture
    updateClickDataTexture();
    
    // Set time uniform
    const timeUniform = gl.getUniformLocation(shaderProgram, "u_time");
    const currentTime = (performance.now() - animationStartTime) / 1000;
    gl.uniform1f(timeUniform, 10 + currentTime);
    
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

// Get fragment shader source
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
    float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }

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

    // Function to create lettuce leaf shape
    float leaf_shape(vec2 uv, vec2 center, float size, float angle, float waveFreq, float waveAmp, float seed) {
        vec2 rotated_uv = rotateUV(uv - center, angle);
        float base_shape = length(rotated_uv / vec2(1.0, 0.7)) / size;
        
        // Add wavy edges to leaves
        float wave = waveAmp * sin(waveFreq * rotated_uv.x + seed) * sin(waveFreq * rotated_uv.y + seed);
        base_shape += wave * 0.1;
        
        return smoothstep(1.0, 0.8, base_shape);
    }
    
    // Function to create tomato slice shape
    float tomato_slice(vec2 uv, vec2 center, float size, float angle, float seed) {
        vec2 rotated_uv = rotateUV(uv - center, angle);
        float base_shape = length(rotated_uv) / size;
        
        // Create the seeds pattern inside tomato
        float seeds = 0.0;
        for (int i = 0; i < 8; i++) {
            float a = float(i) * TWO_PI / 8.0 + seed;
            vec2 seed_pos = vec2(cos(a), sin(a)) * 0.4 * size;
            seeds += smoothstep(0.08, 0.05, length(rotated_uv - seed_pos));
        }
        
        float tomato = smoothstep(1.0, 0.9, base_shape);
        
        return tomato + (seeds * tomato * 0.3);
    }
    
    // Function to create cucumber slice shape
    float cucumber_slice(vec2 uv, vec2 center, float size, float angle, float seed) {
        vec2 rotated_uv = rotateUV(uv - center, angle);
        float base_shape = length(rotated_uv) / size;
        
        // Create the cucumber seed pattern
        float seeds = 0.0;
        for (int i = 0; i < 5; i++) {
            float r = 0.2 + 0.1 * float(i);
            float a_offset = seed + float(i) * 0.5;
            for (int j = 0; j < 6; j++) {
                float a = float(j) * TWO_PI / 6.0 + a_offset;
                vec2 seed_pos = vec2(cos(a), sin(a)) * r * size;
                seeds += smoothstep(0.06, 0.03, length(rotated_uv - seed_pos));
            }
        }
        
        float cucumber = smoothstep(1.0, 0.95, base_shape);
        
        return cucumber + (seeds * cucumber * 0.2);
    }
    
    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;
        uv.x *= u_ratio;
        
        float t = u_time * 0.2;
        
        // Initialize salad components
        float lettuce = 0.0;
        float tomato = 0.0;
        float cucumber = 0.0;
        
        // Seed for randomization
        float seed = 42.0;
        
        // Generate lettuce leaves
        for (int i = 0; i < 5; i++) {
            vec2 offset = vec2(
                0.2 * sin(t * 0.3 + float(i)),
                0.2 * cos(t * 0.2 + float(i) * 0.5)
            );
            
            float size = 0.3 + 0.1 * sin(t + float(i) * 0.7);
            float angle = t * 0.1 + float(i) * 1.2;
            float waveFreq = 6.0 + float(i);
            float waveAmp = 0.2 + 0.1 * sin(t * 0.5 + float(i));
            
            lettuce += leaf_shape(uv, vec2(0.5) + offset, size, angle, waveFreq, waveAmp, seed + float(i) * 10.0);
        }
        
        // Generate tomato slices
        for (int i = 0; i < 3; i++) {
            vec2 offset = vec2(
                0.3 * sin(t * 0.4 + float(i) * 2.1),
                0.3 * cos(t * 0.3 + float(i) * 1.7)
            );
            
            float size = 0.15 + 0.05 * sin(t + float(i));
            float angle = t * 0.2 + float(i) * 2.0;
            
            tomato += tomato_slice(uv, vec2(0.5) + offset, size, angle, seed + float(i) * 5.0);
        }
        
        // Generate cucumber slices
        for (int i = 0; i < 4; i++) {
            vec2 offset = vec2(
                0.35 * sin(t * 0.5 + float(i) * 1.5),
                0.35 * cos(t * 0.4 + float(i) * 1.3)
            );
            
            float size = 0.12 + 0.03 * sin(t + float(i) * 0.9);
            float angle = t * 0.15 + float(i) * 1.5;
            
            cucumber += cucumber_slice(uv, vec2(0.5) + offset, size, angle, seed + float(i) * 15.0);
        }
        
        // Process click-based elements
        for (int i = 0; i < 20; i++) {
            float row = floor(float(i) / 10.) / 2.;
            float col = (float(i) - 10. * floor(float(i) / 10.)) / 10.;
            vec4 data = texture2D(u_click_data_texture, vec2(col, row));
            
            if (data.r + data.g + data.b + data.a < 0.01) continue; // Skip empty data
            
            float x = data[0];
            float y = data[1];
            float pos_offset = data[2];
            float scale = data[3];
            
            vec2 center = vec2(x, y);
            float rand_val = rand(center);
            
            // Determine what type of salad element to create based on random value
            if (rand_val < 0.5) {
                // Lettuce leaf at click position
                vec2 offset = vec2(
                    0.05 * sin(t * 0.3 + rand_val * 10.0),
                    0.05 * cos(t * 0.2 + rand_val * 8.0)
                );
                
                float size = 0.25 * scale;
                float angle = t * 0.1 + rand_val * 10.0;
                float waveFreq = 6.0 + rand_val * 4.0;
                float waveAmp = 0.2 + 0.1 * sin(t * 0.5 + rand_val * 3.0);
                
                lettuce += leaf_shape(uv, center + offset, size, angle, waveFreq, waveAmp, rand_val * 100.0);
            } else if (rand_val < 0.8) {
                // Tomato slice at click position
                float size = 0.15 * scale;
                float angle = t * 0.2 + rand_val * 5.0;
                
                tomato += tomato_slice(uv, center, size, angle, rand_val * 50.0);
            } else {
                // Cucumber slice at click position
                float size = 0.12 * scale;
                float angle = t * 0.15 + rand_val * 7.0;
                
                cucumber += cucumber_slice(uv, center, size, angle, rand_val * 30.0);
            }
        }
        
        // Compose salad colors
        vec3 color = vec3(0.0);
        
        // Lettuce color (various shades of green)
        vec3 lettuce_color = mix(
            vec3(0.2, 0.75, 0.2),  // Bright green
            vec3(0.1, 0.4, 0.1),   // Dark green
            snoise(uv * 10.0 + t)
        );
        
        // Tomato color (red with slight variations)
        vec3 tomato_color = mix(
            vec3(0.9, 0.2, 0.1),  // Bright red
            vec3(0.7, 0.15, 0.1), // Darker red
            snoise(uv * 8.0 + t * 0.5)
        );
        
        // Cucumber color (light green with variations)
        vec3 cucumber_color = mix(
            vec3(0.45, 0.75, 0.3),  // Light green
            vec3(0.55, 0.75, 0.4),  // Slightly different green
            snoise(uv * 12.0 + t * 0.3)
        );
        
        // Apply colors with slight overlap handling
        color = mix(color, lettuce_color, min(1.0, lettuce));
        color = mix(color, tomato_color, min(1.0, tomato));
        color = mix(color, cucumber_color, min(1.0, cucumber));
        
        // Calculate opacity - any component makes it visible
        float opacity = min(1.0, lettuce + tomato + cucumber);
        
        gl_FragColor = vec4(color, opacity);
    }
    `;
}