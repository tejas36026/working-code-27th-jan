// Constants for the salad worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the salad shader
const TWO_PI = 6.28318530718;

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let ingredientPositions = [];
let activeIngredientIndex = 0;

// WebGL objects
let gl, shaderProgram, ingredientsDataTexture;
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
    ingredientPositions = [];
    activeIngredientIndex = 0;
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
    
    // Setup ingredient data texture
    setupIngredientDataTexture();
    
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

// Set up ingredient data texture
function setupIngredientDataTexture() {
    // Create a texture to hold ingredient data
    ingredientsDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, ingredientsDataTexture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize with empty data
    const ingredientData = new Uint8Array(10 * 2 * 4).fill(0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 10, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, ingredientData);
    
    // Set the texture uniform
    const textureUniform = gl.getUniformLocation(shaderProgram, "u_ingredient_data_texture");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ingredientsDataTexture);
    gl.uniform1i(textureUniform, 0);
}

// Update ingredient data texture
function updateIngredientDataTexture() {
    // Create data array
    const ingredientData = new Uint8Array(10 * 2 * 4).fill(0);
    
    // Fill with ingredient positions
    for (let i = 0; i < ingredientPositions.length && i < 20; i++) {
        const ingredient = ingredientPositions[i];
        const idx = i * 4;
        
        ingredientData[idx] = Math.floor(ingredient.x * 255);
        ingredientData[idx + 1] = Math.floor(ingredient.y * 255);
        ingredientData[idx + 2] = Math.floor(ingredient.distance * 255);
        ingredientData[idx + 3] = Math.floor(ingredient.type * 255);
    }
    
    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, ingredientsDataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 10, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, ingredientData);
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
    
    // Add ingredients at the center if we're just starting
    if (currentIteration === 0 || currentIteration % 30 === 0) {
        addIngredient(centerX / canvasWidth, centerY / canvasHeight, 0); // Add lettuce
    }
    
    // Add random ingredients occasionally
    if (Math.random() < 0.05) {
        const randomX = centerX + (Math.random() - 0.5) * 100;
        const randomY = centerY + (Math.random() - 0.5) * 100;
        const ingredientType = Math.floor(Math.random() * 5); // 0: lettuce, 1: tomato, 2: cucumber, 3: carrot, 4: crouton
        addIngredient(randomX / canvasWidth, randomY / canvasHeight, ingredientType);
    }
    
    // Update ingredient animations
    updateIngredientAnimations();
    
    // Update ingredient data texture
    updateIngredientDataTexture();
    
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

// Add an ingredient position
function addIngredient(x, y, type) {
    // Keep a maximum of 15 ingredients
    if (ingredientPositions.length >= 15) {
        ingredientPositions.shift();
    }
    
    // Add new ingredient
    ingredientPositions.push({
        x: x,
        y: y,
        distance: 0,
        type: type / 5.0, // Normalize type to 0-1 range
        startTime: performance.now()
    });
}

// Update ingredient animations
function updateIngredientAnimations() {
    const currentTime = performance.now();
    
    for (let i = 0; i < ingredientPositions.length; i++) {
        const ingredient = ingredientPositions[i];
        const elapsed = currentTime - ingredient.startTime;
        
        // Update ingredient distance (2 second animation)
        ingredient.distance = Math.min(elapsed / 2000, 1);
    }
    
    // Remove old ingredients
    ingredientPositions = ingredientPositions.filter(ingredient => {
        const elapsed = currentTime - ingredient.startTime;
        return elapsed < 5000; // Keep ingredients for 5 seconds
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

// Get fragment shader source for salad
function getFragmentShaderSource() {
    return `
    precision mediump float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_resolution_scale;
    uniform sampler2D u_ingredient_data_texture;

    #define TWO_PI 6.28318530718

    float rand(float n){ return fract(sin(n) * 43758.5453123); }

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

    vec3 getIngredientColor(float type, float value) {
        // Maps 0-1 type value to ingredient colors
        // 0: lettuce (green), 0.2: tomato (red), 0.4: cucumber (light green), 
        // 0.6: carrot (orange), 0.8: crouton (tan)
        
        if (type < 0.2) {
            // Lettuce: green
            return mix(vec3(0.49, 0.7, 0.26), vec3(0.55, 0.78, 0.29), value);
        } else if (type < 0.4) {
            // Tomato: red
            return mix(vec3(0.9, 0.22, 0.21), vec3(0.78, 0.16, 0.16), value);
        } else if (type < 0.6) {
            // Cucumber: light green
            return mix(vec3(0.4, 0.73, 0.42), vec3(0.3, 0.63, 0.31), value);
        } else if (type < 0.8) {
            // Carrot: orange
            return mix(vec3(1.0, 0.6, 0.0), vec3(0.96, 0.49, 0.0), value);
        } else {
            // Crouton: tan
            return mix(vec3(0.84, 0.8, 0.78), vec3(0.63, 0.54, 0.5), value);
        }
    }

    float getIngredientShape(float type, float dist, float angle, float noise) {
        if (type < 0.2) {
            // Lettuce: irregular, wavy shapes
            return dist * (1.0 + 0.3 * sin(5.0 * angle + noise * 10.0));
        } else if (type < 0.4) {
            // Tomato: circular
            return smoothstep(0.2, 0.8, dist);
        } else if (type < 0.6) {
            // Cucumber: elongated slices
            return dist * (1.0 + 0.4 * sin(2.0 * angle));
        } else if (type < 0.8) {
            // Carrot: thin strips
            return dist * (1.0 + 0.1 * sin(8.0 * angle + noise * 5.0));
        } else {
            // Crouton: square-ish
            float squareness = abs(sin(2.0 * angle)) + abs(cos(2.0 * angle));
            return dist * (0.8 + 0.2 * squareness);
        }
    }

    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;

        vec3 color = vec3(0.0);
        float opacity = 0.0;
        float saladBase = 0.0;

        uv.x *= u_ratio;

        float t = u_time;

        // Generate base salad
        for (int i = 0; i < 4; i++) {
            vec2 layer_randomizer = hash(vec2(10. * float(i), 200. * float(i)));
            vec2 layer_offset = hash(vec2(-100. * float(i), 2. * float(i))) - .5;
            float layer_scale = 1.1 - .1 * layer_randomizer.x;

            vec2 layer_uv = rotateUV(uv, layer_randomizer.y * TWO_PI);
            layer_uv += layer_offset;
            layer_uv *= layer_scale;

            vec2 i_uv = floor(layer_uv);
            vec2 f_uv = fract(layer_uv);

            vec2 cell_randomizer = vec2(0.);
            float cell_radius = 1.;
            float cell_angle = 0.;

            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 tile_offset = vec2(float(x), float(y));
                    vec2 o = hash(i_uv + tile_offset);

                    tile_offset += (.5 + .3 * sin(.4 * t + TWO_PI * o)) - f_uv;

                    float dist = dot(tile_offset, tile_offset);
                    if (dist < cell_radius) {
                        cell_radius = dist;
                        cell_angle = atan(tile_offset.x, tile_offset.y);
                        cell_randomizer = o;
                    }
                }
            }

            cell_radius = 1. - cell_radius;
            
            // Default to lettuce (base layer type 0.0)
            float cellType = 0.0;
            float shape = getIngredientShape(cellType, cell_radius, cell_angle, cell_randomizer.x);
            vec3 cellColor = getIngredientColor(cellType, cell_randomizer.y);

            float cellOpacity = shape * (0.7 + 0.3 * cell_randomizer.y);
            saladBase += cellOpacity;
            
            if (cellOpacity > 0.1) {
                color = mix(color, cellColor, min(1.0, cellOpacity));
                opacity = max(opacity, cellOpacity);
            }
        }

        // Add specific ingredients from texture data
        for (int i = 0; i < 20; i++) {
            float row = floor(float(i) / 10.) / 2.;
            float col = (float(i) - 10. * floor(float(i) / 10.)) / 10.;
            vec4 data = texture2D(u_ingredient_data_texture, vec2(col, row));

            float x = data[0];
            float y = data[1];
            float dist = data[2];
            float ingredientType = data[3];

            if (x == 0.0 && y == 0.0) continue; // Skip empty entries

            vec2 center = vec2(x, y);
            vec2 ingredientUV = vUv - center;
            ingredientUV.x *= u_ratio;
            
            float maxDistance = 0.15 + 0.1 * rand(ingredientType);
            
            if (length(ingredientUV) > maxDistance) continue;
            
            float angle = atan(ingredientUV.x, ingredientUV.y);
            float noise = snoise(ingredientUV * 10.0 + t * 0.1);
            
            // Normalize to 0-1 range for shape calculations
            float normalizedDist = length(ingredientUV) / maxDistance;
            
            float shape = getIngredientShape(ingredientType, 1.0 - normalizedDist, angle, noise);
            shape *= dist; // Apply animation progress
            
            vec3 ingredientColor = getIngredientColor(ingredientType, noise);
            
            if (shape > 0.2) {
                // Add some variation with lighting
                ingredientColor += 0.1 * vec3(sin(angle + t * 0.5));
                color = mix(color, ingredientColor, min(1.0, shape));
                opacity = max(opacity, shape);
            }
        }

        // Apply some noise for texture
        color += 0.05 * snoise(uv * 20.0 + t * 0.1) * vec3(1.0);
        
        // Set base opacity with some noise for irregular edges
        opacity = max(opacity, smoothstep(0.1, 0.3, saladBase + 0.1 * snoise(uv * 15.0)));

        gl_FragColor = vec4(color, opacity);
    }
    `;
}