// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the egg shader
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

    float get_cell_sectors(float angle, vec2 radomizer, float t) {
        float sectors = .5 * (1. + sin((2. + floor(radomizer.y * 2.)) * angle));
        sectors *= (.7 + .5 * sin(angle - 2. * t + radomizer.x));
        sectors *= (.5 + .5 * cos(angle + t));
        return sectors;
    }

    float get_area_around_yellow(float old_area_around_yellow, float dist, float angle, float sectors) {
        float area_around_yellow = max(old_area_around_yellow, .3 * dist * (1. + sin(angle - .6)));
        area_around_yellow += .1 * smoothstep(.0, .3, dist * (1. + 10. * sectors));
        return area_around_yellow;
    }

    float get_yellow(float dist, float radomizer) {
        return (.8 + .6 * radomizer) * dist;
    }

    float get_yellow_hit_area(float old_yellow_hit_area, float dist, float scale) {
        float yellow_hit_area = max(old_yellow_hit_area, dist);
        yellow_hit_area -= .12 * scale * dist;
        return yellow_hit_area;
    }

    float get_yellow_light(float dist, float angle, float radius, float radomizer) {
        float side_arc_light = dist;
        side_arc_light *= (.5 * (1. + sin(angle - .6)));
        side_arc_light *= (1. - smoothstep(.999, 1., radius));
        return radomizer * side_arc_light;
    }

    float get_blick(float old_yellow_blick, float dist, float angle, float radius) {
        float side_arc_blick = dist;
        side_arc_blick *= (.5 * (1. + sin(angle + 3.)));
        side_arc_blick *= (1. - smoothstep(.9994, 1., radius));
        return max(old_yellow_blick, side_arc_blick);
    }

    void main() {
        vec2 uv = vUv;
        uv *= u_resolution_scale;
        uv.y = 1. - uv.y;

        float white = 0.;
        float white_shadow = 0.;
        float area_around_yellow = 0.;
        float yellow = 0.;
        float yellow_hit_area = 0.;
        float yellow_light = 0.;
        float yellow_blick = 0.;

        uv.x *= u_ratio;
        uv.x *= .9;

        float t = u_time;

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
            float cell_angle_local = 0.;

            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    vec2 tile_offset = vec2(float(x), float(y));
                    vec2 o = hash(i_uv + tile_offset);

                    tile_offset += (.5 + .3 * sin(.4 * t + TWO_PI * o)) - f_uv;

                    float dist = dot(tile_offset, tile_offset);
                    if (dist < cell_radius) {
                        cell_radius = dist;
                        cell_angle_local = atan(tile_offset.x, tile_offset.y);
                        cell_randomizer = o;
                    }
                }
            }

            cell_radius = 1. - cell_radius;
            float sectors = get_cell_sectors(cell_angle_local, cell_randomizer, t);
            float cell_angle_global = cell_angle_local - layer_randomizer.y * TWO_PI;
            float wavy_cell_distance = cell_radius + .015 * sectors;
            wavy_cell_distance = pow(wavy_cell_distance, 50. + 100. * cell_randomizer.x);
            float round_cell_distance = cell_radius;
            round_cell_distance = pow(round_cell_distance, 600. - 200. * layer_scale);
            white_shadow += (smoothstep(.0, 1.5, wavy_cell_distance + round_cell_distance));
            white += wavy_cell_distance;
            yellow_hit_area = get_yellow_hit_area(yellow_hit_area, round_cell_distance, layer_scale);
            yellow += get_yellow(round_cell_distance, cell_randomizer.y);
            yellow_light += get_yellow_light(round_cell_distance, cell_angle_global, cell_radius, cell_randomizer.x);
            yellow_blick = get_blick(yellow_blick, round_cell_distance, cell_angle_global, cell_radius);
            area_around_yellow = get_area_around_yellow(area_around_yellow, round_cell_distance, cell_angle_global, sectors);
        }


        for (int i = 0; i < 20; i++) {
            float row = floor(float(i) / 10.) / 2.;
            float col = (float(i) - 10. * floor(float(i) / 10.)) / 10.;
            vec4 data = texture2D(u_click_data_texture, vec2(col, row));

            float x = data[0];
            float y = data[1];
            float pos_offset = data[2];
            float scale = data[3];

            vec2 center = vec2(x, y);

            vec2 layer_uv = vUv - center;
            layer_uv *= (.9 + .4 * rand(center.x));
            layer_uv.x *= u_ratio;
            layer_uv.x *= .9;

            vec2 layer_offset = hash(data.rg * 100.) - .5;
            layer_uv += .25 * pos_offset * sin(.2 * t + 10. * layer_offset);

            float cell_angle = atan(layer_uv.x, layer_uv.y) - .4 * TWO_PI;

            vec2 cell_randomizer = hash(data.rg);
            float cell_radius = 1. - clamp(0., 1., dot(layer_uv, layer_uv));

            float sectors = get_cell_sectors(cell_angle, cell_randomizer, t);
            float wavy_cell_distance = cell_radius + .015 * sectors * scale;
            wavy_cell_distance = pow(wavy_cell_distance, 50. + 100. * cell_randomizer.x);
            wavy_cell_distance *= pow(scale, .4);

            float round_cell_distance = cell_radius;
            round_cell_distance = pow(round_cell_distance, 400.);
            round_cell_distance *= pow(min(1., 2. * scale), .8);

            white_shadow += (smoothstep(.0, 1.5, wavy_cell_distance + round_cell_distance));
            white += wavy_cell_distance;
            yellow_hit_area = get_yellow_hit_area(yellow_hit_area, round_cell_distance, 1.);
            yellow += get_yellow(round_cell_distance, cell_randomizer.y);
            yellow_light += get_yellow_light(round_cell_distance, cell_angle, cell_radius, cell_randomizer.x);
            yellow_blick = get_blick(yellow_blick, round_cell_distance, cell_angle, cell_radius);
            area_around_yellow = get_area_around_yellow(area_around_yellow, round_cell_distance, cell_angle, sectors);
        }

        white = pow(white, 1.1);

        float base_shape = smoothstep(.28, .3, white);

        white_shadow *= (1. + snoise(3. * uv) + 2. * area_around_yellow);
        float white_color_shape = (1. - smoothstep(.3, 1., white_shadow));
        white_color_shape = 2. * pow(white_color_shape, 6.);
        white_color_shape *= smoothstep(.35, .7, white);

        float hit_area = yellow - yellow_hit_area;

        float white_central_shape = area_around_yellow;
        white_central_shape *= (1. - hit_area);
        white_central_shape *= .6;

        yellow -= 1.2 * hit_area;

        float yellow_shape = smoothstep(.49, .5, yellow);

        yellow_blick *= 1.05;
        yellow_blick -= .3 * hit_area;
        yellow_blick = step(.7, yellow_blick);

        vec3 color = vec3(.0);
        color = mix(color, .98 * vec3(1., .98, .99), base_shape);
        color = mix(color, vec3(1.), white_color_shape);
        color = mix(color, vec3(0., 0., .3), white_central_shape);
        color = mix(color, vec3(1., .6, 0.), yellow_shape);
        color += .2 * yellow_light;
        color = mix(color, vec3(1.), yellow_blick);

        float opacity = smoothstep(.25, .34, white);
        opacity += .05 * smoothstep(.15, .2, white);
        opacity -= 1.5 * white_central_shape;
        opacity += yellow_shape;

        gl_FragColor = vec4(color, opacity);
    }
    `;
}