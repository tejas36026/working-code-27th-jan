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

// Get fragment shader source for salad
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

    // Determine ingredient shape based on angle and randomizer
    float getIngredientShape(float angle, vec2 randomizer, float t) {
        float ingredientType = randomizer.x * 5.0; // 0-5 range for different types
        
        if (ingredientType < 1.0) {
            // Lettuce - wavy, irregular shape
            float waves = 5.0 + floor(randomizer.y * 3.0);
            return 0.5 * (1.0 + sin(waves * angle + t * 0.2));
        } else if (ingredientType < 2.0) {
            // Tomato - rounder
            return 0.7 + 0.3 * sin(angle * 2.0 - t);
        } else if (ingredientType < 3.0) {
            // Cucumber - oval shape
            return 0.5 + 0.5 * sin(2.0 * angle);
        } else if (ingredientType < 4.0) {
            // Carrot - thin strips
            return 0.3 + 0.7 * abs(sin(8.0 * angle + t));
        } else {
            // Crouton - square-ish
            return 0.5 + 0.5 * (abs(sin(4.0 * angle)) + abs(cos(4.0 * angle)));
        }
    }

    // Get color for salad greens
    vec3 getGreenColor(float rand, float noise) {
        if (rand < 0.3) {
            // Lettuce - light green
            return vec3(0.5, 0.75, 0.3) * (0.9 + 0.2 * noise);
        } else if (rand < 0.6) {
            // Spinach - darker green
            return vec3(0.2, 0.55, 0.25) * (0.9 + 0.2 * noise);
        } else {
            // Arugula - olive green
            return vec3(0.4, 0.5, 0.2) * (0.9 + 0.2 * noise);
        }
    }

    // Get color for vegetables
    vec3 getVeggieColor(float rand, float noise) {
        if (rand < 0.25) {
            // Tomato - red
            return vec3(0.9, 0.2, 0.2) * (0.9 + 0.2 * noise);
        } else if (rand < 0.5) {
            // Cucumber - light green
            return vec3(0.4, 0.7, 0.4) * (0.9 + 0.2 * noise);
        } else if (rand < 0.75) {
            // Carrot - orange
            return vec3(1.0, 0.6, 0.1) * (0.9 + 0.2 * noise);
        } else {
            // Red onion - purple
            return vec3(0.7, 0.3, 0.5) * (0.9 + 0.2 * noise);
        }
    }

    // Get crouton color
    vec3 getCroutonColor(float noise) {
        return vec3(0.8, 0.7, 0.4) * (0.9 + 0.2 * noise);
    }

    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;

        // Variables for different elements
        float greens = 0.0;        // Base salad greens
        float veggies = 0.0;       // Vegetables (tomato, cucumber, etc.)
        float croutons = 0.0;      // Croutons
        float dressing = 0.0;      // Salad dressing drizzles
        
        // Texture for different layers
        float greensTexture = 0.0;
        float veggiesTexture = 0.0;
        float croutonsTexture = 0.0;
        float dressingTexture = 0.0;

        uv.x *= u_ratio;

        float t = u_time;

        // Generate base salad (greens)
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
            
            // Get shape based on ingredient type
            float shape = getIngredientShape(cell_angle, cell_randomizer, t);
            
            // Lettuce and greens (base layer)
            float greenDistortion = cell_radius * shape;
            greenDistortion = pow(greenDistortion, 50. + 100. * cell_randomizer.x);
            
            // Add texture to greens
            greensTexture += cell_randomizer.y * cell_radius;
            
            // Add to greens
            greens += greenDistortion;
        }

        // Process ingredients from click data (vegetables, croutons, etc.)
        for (int i = 0; i < 20; i++) {
            float row = floor(float(i) / 10.) / 2.;
            float col = (float(i) - 10. * floor(float(i) / 10.)) / 10.;
            vec4 data = texture2D(u_click_data_texture, vec2(col, row));

            float x = data[0];
            float y = data[1];
            float progress = data[2];
            float scale = data[3];

            if (x == 0.0 && y == 0.0) continue; // Skip empty slots

            vec2 center = vec2(x, y);

            vec2 layer_uv = vUv - center;
            layer_uv *= (.9 + .4 * rand(center.x));
            layer_uv.x *= u_ratio;

            vec2 layer_offset = hash(data.rg * 100.) - .5;
            layer_uv += .25 * progress * sin(.2 * t + 10. * layer_offset);

            float cell_angle = atan(layer_uv.x, layer_uv.y);

            vec2 cell_randomizer = hash(data.rg);
            float cell_radius = 1. - clamp(0., 1., dot(layer_uv, layer_uv));

            // Determine ingredient type by randomizer
            float ingredientType = cell_randomizer.x;
            float shape = getIngredientShape(cell_angle, cell_randomizer, t);
            
            // Apply different scaling based on ingredient type
            if (ingredientType < 0.6) {
                // Veggies (tomato, cucumber, carrot)
                float veggieShape = cell_radius * shape;
                veggieShape = pow(veggieShape, 200. + 100. * cell_randomizer.y);
                veggieShape *= pow(scale, 0.8);
                
                // Add texture
                veggiesTexture += cell_randomizer.y * cell_radius;
                
                // Add to veggies
                veggies += veggieShape;
            } else if (ingredientType < 0.9) {
                // Croutons
                float croutonShape = cell_radius * shape;
                croutonShape = pow(croutonShape, 600. - 200. * cell_randomizer.y);
                croutonShape *= pow(scale, 0.6);
                
                // Add texture
                croutonsTexture += cell_randomizer.y * cell_radius;
                
                // Add to croutons
                croutons += croutonShape;
            } else {
                // Dressing drizzle
                float dressingShape = cell_radius;
                dressingShape = pow(dressingShape, 300. - 100. * cell_randomizer.y);
                dressingShape *= pow(scale, 0.4);
                
                // Add texture and flow
                dressingTexture += snoise(layer_uv * 10.0 + t * 0.1);
                
                // Add to dressing
                dressing += dressingShape;
            }
        }

        // Apply non-linear transformations for better visual effect
        greens = pow(greens, 1.1);
        veggies = pow(veggies, 1.2);
        croutons = pow(croutons, 1.3);
        dressing = pow(dressing, 0.8);
        
        // Base salad shape
        float baseSaladShape = smoothstep(0.28, 0.3, greens);
        
        // Veggie shapes
        float veggieShape = smoothstep(0.45, 0.5, veggies);
        
        // Crouton shape
        float croutonShape = smoothstep(0.4, 0.45, croutons);
        
        // Dressing shape
        float dressingShape = smoothstep(0.25, 0.3, dressing);
        
        // Generate final colors
        vec3 color = vec3(0.0);
        
        // Base greens
        vec3 greenColor = getGreenColor(greensTexture, snoise(uv * 10.0 + t * 0.05));
        color = mix(color, greenColor, baseSaladShape);
        
        // Add veggies
        vec3 veggieColor = getVeggieColor(veggiesTexture, snoise(uv * 20.0 + t * 0.1));
        color = mix(color, veggieColor, veggieShape);
        
        // Add croutons
        vec3 croutonColor = getCroutonColor(snoise(uv * 30.0 + t * 0.15));
        color = mix(color, croutonColor, croutonShape);
        
        // Add dressing (balsamic)
        vec3 dressingColor = vec3(0.3, 0.2, 0.1);
        color = mix(color, dressingColor, dressingShape * 0.7);
        
        // Add highlights and details
        float highlights = 0.1 * snoise(uv * 40.0 + t * 0.2);
        color += highlights * vec3(1.0);
        
        // Calculate opacity
        float opacity = baseSaladShape;
        opacity += veggieShape * 0.8;
        opacity += croutonShape * 0.9;
        opacity += dressingShape * 0.6;
        opacity = min(opacity, 1.0);

        gl_FragColor = vec4(color, opacity);
    }
    `;
}