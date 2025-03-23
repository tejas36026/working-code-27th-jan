// Constants from the original worker
const DEFAULT_ITERATIONS = 120;
const FRAME_RATE = 30; // Frames per second

// WebGL constants for the delivery shader
const TWO_PI = 6.28318530718;
const PI = 3.14159265359;

// Physics and animation constants
const GRAVITY = 0.05;
const CAR_ELASTICITY = 0.65;
const FRICTION = 0.97;
const ROAD_SPEED = 0.5;
const DELIVERY_TIME = 3000; // ms until food is delivered

// Animation state
let currentIteration = 0;
let animationStartTime = 0;
let canvasWidth, canvasHeight;
let clickPositions = [];
let activeClickIndex = 0;

// Delivery state
let deliveryVehicle = {
  x: -1.2, // Start off-screen
  y: 0.5,
  xVelocity: 0.01,
  yVelocity: 0,
  rotation: 0,
  scale: 1.0,
  arrived: false,
  deliveryTime: 0
};

let foodPackage = {
  x: -1.2,
  y: 0.45,
  xVelocity: 0,
  yVelocity: 0,
  rotation: 0,
  scale: 0.7,
  delivered: false,
  handingOver: false
};

// WebGL objects
let gl = null;
let shaderProgram = null;
let clicksDataTexture = null;
let deliveryDataTexture = null;
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
        if (action === 'deliver_food') {
            startDelivery();
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
            // Apply the delivery effect
            resultImageData = applyDeliveryEffect(imageData, selectedRegions, value);
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

// Start food delivery animation
function startDelivery() {
    deliveryVehicle.x = -1.2;
    deliveryVehicle.arrived = false;
    foodPackage.delivered = false;
    foodPackage.handingOver = false;
    deliveryVehicle.deliveryTime = performance.now();
}

// Reset animation state
function resetAnimationState() {
    currentIteration = 0;
    animationStartTime = performance.now();
    clickPositions = [];
    activeClickIndex = 0;
    
    // Reset delivery vehicle
    deliveryVehicle.x = -1.2;
    deliveryVehicle.y = 0.5;
    deliveryVehicle.arrived = false;
    
    // Reset food package
    foodPackage.x = -1.2;
    foodPackage.y = 0.45;
    foodPackage.delivered = false;
    foodPackage.handingOver = false;
}

// Update animation progress
function updateAnimationProgress(iterations) {
    currentIteration = (currentIteration + 1) % iterations;
    return currentIteration / iterations;
}

// Update delivery animation physics
function updateDeliveryPhysics() {
    const currentTime = performance.now();
    
    // Update vehicle position
    if (!deliveryVehicle.arrived) {
        // Move vehicle toward delivery point (x = 0.7)
        deliveryVehicle.x += deliveryVehicle.xVelocity;
        
        // Add a slight bounce to the vehicle
        deliveryVehicle.y = 0.5 + Math.sin(currentTime * 0.005) * 0.02;
        
        // Update rotation for subtle wobble
        deliveryVehicle.rotation = Math.sin(currentTime * 0.003) * 0.1;
        
        // Check if arrived at destination
        if (deliveryVehicle.x >= 0.7) {
            deliveryVehicle.arrived = true;
            deliveryVehicle.x = 0.7; // Snap to position
            deliveryVehicle.deliveryTime = currentTime;
        }
    }
    
    // Update food package position
    if (!foodPackage.delivered) {
        if (!deliveryVehicle.arrived) {
            // Food stays in vehicle
            foodPackage.x = deliveryVehicle.x;
            foodPackage.y = deliveryVehicle.y - 0.05;
        } else if (!foodPackage.handingOver) {
            // Start handover animation after a delay
            if (currentTime - deliveryVehicle.deliveryTime > 500) {
                foodPackage.handingOver = true;
            }
        } else {
            // Animate food moving from vehicle to delivery point
            const deliveryProgress = Math.min(1, (currentTime - deliveryVehicle.deliveryTime - 500) / 1000);
            
            // Move along a curve to simulate handover
            foodPackage.x = deliveryVehicle.x + 0.2 * deliveryProgress;
            foodPackage.y = deliveryVehicle.y - 0.05 - Math.sin(deliveryProgress * PI) * 0.1;
            
            // Rotate slightly during handover
            foodPackage.rotation = Math.sin(deliveryProgress * PI) * 0.2;
            
            // Check if delivery complete
            if (deliveryProgress >= 1) {
                foodPackage.delivered = true;
                foodPackage.x = deliveryVehicle.x + 0.2;
                foodPackage.y = deliveryVehicle.y - 0.05;
                foodPackage.rotation = 0;
            }
        }
    }
    
    // Reset delivery if it's been complete for a while
    if (foodPackage.delivered && currentTime - deliveryVehicle.deliveryTime > 5000) {
        startDelivery();
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
        setupDeliveryDataTexture();
        
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

// Set up delivery data texture
function setupDeliveryDataTexture() {
    if (!gl || !shaderProgram) return;
    
    // Create a texture to hold delivery data
    deliveryDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, deliveryDataTexture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Initialize with empty data
    const deliveryData = new Uint8Array(4 * 4 * 4).fill(0); // 4 objects (vehicle, food, etc), 4 rows, 4 bytes (RGBA)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, deliveryData);
    
    // Set the texture uniform
    const textureUniform = gl.getUniformLocation(shaderProgram, "u_delivery_data_texture");
    if (textureUniform !== null) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, deliveryDataTexture);
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

// Update delivery data texture
function updateDeliveryDataTexture() {
    if (!gl || !deliveryDataTexture) return;
    
    // Create data array
    const deliveryData = new Uint8Array(4 * 4 * 4).fill(0);
    
    // Row 0, Col 0: Delivery vehicle data
    deliveryData[0] = deliveryVehicle.arrived ? 255 : 0;
    deliveryData[1] = Math.floor(((deliveryVehicle.x + 1.0) / 2.0) * 255);
    deliveryData[2] = Math.floor(((deliveryVehicle.y + 1.0) / 2.0) * 255);
    deliveryData[3] = Math.floor(((deliveryVehicle.rotation + PI) / TWO_PI) * 255);
    
    // Row 0, Col 1: Food package data
    deliveryData[4] = foodPackage.delivered ? 255 : 0;
    deliveryData[5] = foodPackage.handingOver ? 255 : 0;
    deliveryData[6] = Math.floor(((foodPackage.x + 1.0) / 2.0) * 255);
    deliveryData[7] = Math.floor(((foodPackage.y + 1.0) / 2.0) * 255);
    
    // Row 1, Col 0: Additional vehicle data
    deliveryData[16] = Math.floor(deliveryVehicle.scale * 255);
    deliveryData[17] = Math.floor(((deliveryVehicle.xVelocity + 1.0) / 2.0) * 255);
    deliveryData[18] = Math.floor(((deliveryVehicle.yVelocity + 1.0) / 2.0) * 255);
    deliveryData[19] = 0; // Reserved
    
    // Row 1, Col 1: Additional food package data
    deliveryData[20] = Math.floor(foodPackage.scale * 255);
    deliveryData[21] = Math.floor(((foodPackage.rotation + PI) / TWO_PI) * 255);
    deliveryData[22] = 0; // Reserved
    deliveryData[23] = 0; // Reserved
    
    // Update texture
    gl.bindTexture(gl.TEXTURE_2D, deliveryDataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, deliveryData);
}

// Apply delivery effect
function applyDeliveryEffect(imageData, selectedRegions, intensity) {
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
        
        // Randomly add clicks for random effects
        if (Math.random() < 0.05) {
            const randomX = centerX + (Math.random() - 0.5) * 100;
            const randomY = centerY + (Math.random() - 0.5) * 100;
            addClick(randomX / canvasWidth, randomY / canvasHeight);
        }
        
        // Update animations
        updateClickAnimations();
        updateDeliveryPhysics();
        
        // Update textures
        updateClickDataTexture();
        updateDeliveryDataTexture();
        
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
        console.error("Error applying delivery effect:", error);
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

// Get fragment shader source for food delivery animation
function getFragmentShaderSource() {
    return `
    precision mediump float;

    varying vec2 vUv;
    uniform float u_time;
    uniform float u_ratio;
    uniform float u_resolution_scale;
    uniform sampler2D u_click_data_texture;
    uniform sampler2D u_delivery_data_texture;

    #define TWO_PI 6.28318530718
    #define PI 3.14159265359

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

    // Function to get delivery data
    vec4 getDeliveryData(int obj, int row) {
        // Normalize texture coordinates for accessing data
        float xCoord = (float(obj) + 0.5) / 4.0;
        float yCoord = (float(row) + 0.5) / 4.0;
        
        return texture2D(u_delivery_data_texture, vec2(xCoord, yCoord));
    }

    // Draw the road
    vec4 drawRoad(vec2 uv, float time) {
        // Road
        float roadWidth = 0.5;
        float roadY = 0.2;
        float roadThickness = 0.1;
        
        // Check if point is on the road
        float onRoad = smoothstep(roadY - roadThickness / 2.0, roadY - roadThickness / 2.0 + 0.01, uv.y) * 
                       (1.0 - smoothstep(roadY + roadThickness / 2.0 - 0.01, roadY + roadThickness / 2.0, uv.y));
                       
        // Road color
        vec3 roadColor = vec3(0.2, 0.2, 0.2);
        
        // Add road markings
        float markingWidth = 0.03;
        float markingLength = 0.1;
        float markingGap = 0.1;
        float markingSpeed = 0.2;
        
        // Offset for animation
        float xOffset = time * markingSpeed;
        float xPos = mod(uv.x + xOffset, markingLength + markingGap);
        
        // Draw dashed line
        float onMarking = step(0.0, xPos) * step(xPos, markingLength) * 
                          step(abs(uv.y - roadY), markingWidth / 2.0);
                          
        // Combine road and markings
        vec3 color = roadColor;
        color = mix(color, vec3(1.0), onMarking);
        
        return vec4(color, onRoad);
    }
    
    // Draw the delivery vehicle
    vec4 drawDeliveryVehicle(vec2 uv, vec4 vehicleData, vec4 vehicleData2) {
        // Extract vehicle data
        bool arrived = vehicleData.r > 0.5;
        float vehicleX = vehicleData.g * 2.0 - 1.0;
        float vehicleY = vehicleData.b * 2.0 - 1.0;
        float vehicleRotation = vehicleData.a * TWO_PI - PI;
        float vehicleScale = vehicleData2.r;
        
        // Transform UV to vehicle space
        vec2 vehicleUV = uv - vec2(vehicleX, vehicleY);
        vehicleUV = rotateUV(vehicleUV, -vehicleRotation);
        vehicleUV /= vehicleScale;
        
        // Vehicle body dimensions
        float bodyWidth = 0.2;
        float bodyHeight = 0.08;
        float cabWidth = 0.08;
        float cabHeight = 0.06;
        
        // Vehicle color
        vec3 vehicleColor = vec3(1.0, 0.5, 0.0); // Orange
        vec3 cabColor = vec3(0.9, 0.4, 0.0); // Darker orange
        vec3 windowColor = vec3(0.7, 0.8, 1.0); // Light blue
        vec3 wheelColor = vec3(0.1, 0.1, 0.1); // Black
        
        // Draw vehicle body (truck/car box)
        float bodyShape = smoothstep(bodyWidth, bodyWidth - 0.01, abs(vehicleUV.x)) * 
                          smoothstep(bodyHeight, bodyHeight - 0.01, abs(vehicleUV.y));
                          
        // Draw cab (front part of vehicle)
        float cabShape = smoothstep(cabWidth, cabWidth - 0.01, abs(vehicleUV.x - (bodyWidth - cabWidth))) * 
                         smoothstep(cabHeight, cabHeight - 0.01, abs(vehicleUV.y - (bodyHeight - cabHeight) / 2.0));
        
        // Draw window in cab
        float windowShape = smoothstep(cabWidth * 0.7, cabWidth * 0.7 - 0.01, abs(vehicleUV.x - (bodyWidth - cabWidth))) * 
                            smoothstep(cabHeight * 0.5, cabHeight * 0.5 - 0.01, abs(vehicleUV.y - (bodyHeight - cabHeight) / 2.0 - 0.01));
                            
        // Draw wheels
        float wheelRadius = 0.03;
        float frontWheel = smoothstep(wheelRadius, wheelRadius - 0.01, length(vehicleUV - vec2(bodyWidth - wheelRadius, -bodyHeight + wheelRadius)));
        float rearWheel = smoothstep(wheelRadius, wheelRadius - 0.01, length(vehicleUV - vec2(-bodyWidth + wheelRadius, -bodyHeight + wheelRadius)));
        
        // Combine all parts
        vec3 color = vec3(0.0);
        float opacity = 0.0;
        
        // Body
        if (bodyShape > 0.01) {
            color = vehicleColor;
            opacity = bodyShape;
        }
        
        // Cab
        if (cabShape > 0.01) {
            color = mix(color, cabColor, cabShape);
            opacity = max(opacity, cabShape);
        }
        
        // Window
        if (windowShape > 0.01) {
            color = mix(color, windowColor, windowShape);
            opacity = max(opacity, windowShape);
        }
        
        // Wheels
        if (frontWheel > 0.01 || rearWheel > 0.01) {
            color = mix(color, wheelColor, max(frontWheel, rearWheel));
            opacity = max(opacity, max(frontWheel, rearWheel));
        }
        
        // Add logo or text on the side of delivery vehicle
        if (bodyShape > 0.01 && abs(vehicleUV.y) < bodyHeight * 0.5) {
            float logoOpacity = smoothstep(0.05, 0.04, length(vehicleUV - vec2(0.0, 0.0)));
            color = mix(color, vec3(1.0, 1.0, 1.0), logoOpacity * 0.5);
        }
        
        return vec4(color, opacity);
    }
    
    // Draw the food package
    vec4 drawFoodPackage(vec2 uv, vec4 packageData, vec4 packageData2) {
        // Extract package data
        bool delivered = packageData.r > 0.5;
        bool handingOver = packageData.g > 0.5;
        float packageX = packageData.b * 2.0 - 1.0;
        float packageY = packageData.a * 2.0 - 1.0;
        float packageScale = packageData2.r;
        float packageRotation = packageData2.g * TWO_PI - PI;
        
        // Transform UV to package space
        vec2 packageUV = uv - vec2(packageX, packageY);
        packageUV = rotateUV(packageUV, -packageRotation);
        packageUV /= packageScale;
        
        // Package dimensions
        float packageWidth = 0.06;
        float packageHeight = 0.06;
        
        // Package shape
        float packageShape = smoothstep(packageWidth, packageWidth - 0.01, abs(packageUV.x)) * 
                             smoothstep(packageHeight, packageHeight - 0.01, abs(packageUV.y));
                             
        // Package colors
        vec3 packageColor = vec3(0.95, 0.95, 0.95); // White/light gray
        vec3 logoColor = vec3(1.0, 0.5, 0.0); // Orange like the vehicle
        
        // Draw logo on package
        float logoSize = 0.03;
        float logoShape = smoothstep(logoSize, logoSize - 0.01, length(packageUV));
        
        // Combine parts
        vec3 color = packageColor;
        
        // Add logo to package
        if (logoShape > 0.01) {
            color = mix(color, logoColor, logoShape * 0.8);
        }
        
        // Add steam/aroma if delivered (food is hot)
        float opacity = packageShape;
        
        if (delivered && packageShape > 0.01) {
            // Add some wavy steam above package
            for (int i = 0; i < 3; i++) {
                float steamY = float(i) * 0.03;
                float steamX = sin(u_time * 2.0 + float(i) * PI / 3.0) * 0.02;
                float steamShape = smoothstep(0.015, 0.0, length(packageUV - vec2(steamX, packageHeight + 0.02 + steamY)));
                color = mix(color, vec3(1.0), steamShape * 0.3);
                opacity = max(opacity, steamShape * 0.3);
            }
        }
        
        return vec4(color, opacity);
    }
    
    // Draw the recipient
    vec4 drawRecipient(vec2 uv, vec4 vehicleData) {
        // Extract vehicle data to position recipient
        bool arrived = vehicleData.r > 0.5;
        float vehicleX = vehicleData.g * 2.0 - 1.0;
        
        // Only draw recipient if vehicle has arrived
        if (!arrived) {
            return vec4(0.0, 0.0, 0.0, 0.0);
        }
        
        // Recipient position
        float recipientX = vehicleX + 0.3;
        float recipientY = 0.18;
        
        // Transform UV to recipient space
        vec2 recipientUV = uv - vec2(recipientX, recipientY);
        
        // Recipient dimensions
        float headRadius = 0.04;
        float bodyWidth = 0.03;
        float bodyHeight = 0.08;
        
        // Draw head
        float headShape = smoothstep(headRadius, headRadius - 0.01, length(recipientUV - vec2(0.0, headRadius + bodyHeight / 2.0)));
        
        // Draw body
        float bodyShape = smoothstep(bodyWidth, bodyWidth - 0.01, abs(recipientUV.x)) * 
                          smoothstep(bodyHeight / 2.0, bodyHeight / 2.0 - 0.01, abs(recipientUV.y));
                          
        // Draw arms
        float armWidth = 0.02;
        float armHeight = 0.05;
        float armShape = smoothstep(armWidth, armWidth - 0.01, abs(recipientUV.y)) * 
                         smoothstep(armHeight, armHeight - 0.01, abs(recipientUV.x - (bodyWidth + armHeight / 2.0)));
        
        // Colors
        vec3 skinColor = vec3(0.9, 0.8, 0.7);
        vec3 shirtColor = vec3(0.2, 0.3, 0.8); // Blue shirt
        
        // Combine parts
        vec3 color = vec3(0.0);
        float opacity = 0.0;
        
        // Head
        if (headShape > 0.01) {
            color = skinColor;
            opacity = headShape;
        }
        
        // Body
        if (bodyShape > 0.01) {
            color = mix(color, shirtColor, bodyShape);
            opacity = max(opacity, bodyShape);
        }
        
        // Arms
        if (armShape > 0.01) {
            color = mix(color, shirtColor, armShape);
            opacity = max(opacity, armShape);
        }
        
        return vec4(color, opacity);
    }
    
    // Draw the delivery person
    vec4 drawDeliveryPerson(vec2 uv, vec4 vehicleData, vec4 packageData) {
        // Extract data
        bool arrived = vehicleData.r > 0.5;
        float vehicleX = vehicleData.g * 2.0 - 1.0;
        bool delivered = packageData.r > 0.5;
        
        // Only draw delivery person if vehicle has arrived
        if (!arrived) {
            return vec4(0.0, 0.0, 0.0, 0.0);
        }
        
        // Calculate position based on whether package has been delivered
        float personX = vehicleX + (delivered ? 0.15 : 0.22);
        float personY = 0.18;
        
        // Transform UV to person space
        vec2 personUV = uv - vec2(personX, personY);
        
        // Person dimensions
        float headRadius = 0.04;
        float bodyWidth = 0.03;
        float bodyHeight = 0.08;
        
        // Draw head
        float headShape = smoothstep(headRadius, headRadius - 0.01, length(personUV - vec2(0.0, headRadius + bodyHeight / 2.0)));
        
        // Draw body
        float bodyShape = smoothstep(bodyWidth, bodyWidth - 0.01, abs(personUV.x)) * 
                          smoothstep(bodyHeight / 2.0, bodyHeight / 2.0 - 0.01, abs(personUV.y));
                          
        // Draw arms with animation based on delivery state
        float armWidth = 0.02;
        float armHeight = 0.05;
        float armOffset = delivered ? -0.02 : 0.05;
        float armShape = smoothstep(armWidth, armWidth - 0.01, abs(personUV.y)) * 
                         smoothstep(armHeight, armHeight - 0.01, abs(personUV.x - (bodyWidth + armOffset)));
        
        // Colors
        vec3 skinColor = vec3(0.9, 0.8, 0.7);
        vec3 uniformColor = vec3(1.0, 0.5, 0.0); // Same as vehicle
        vec3 capColor = vec3(0.9, 0.4, 0.0);
        
        // Draw cap
        float capWidth = 0.05;
        float capHeight = 0.02;
        float capShape = smoothstep(capWidth, capWidth - 0.01, abs(personUV.x)) * 
                         smoothstep(capHeight, capHeight - 0.01, 
                         abs(personUV.y - (headRadius + bodyHeight / 2.0 + capHeight / 2.0)));
        
        // Combine parts
        vec3 color = vec3(0.0);
        float opacity = 0.0;
        
        // Head
        if (headShape > 0.01) {
            color = skinColor;
            opacity = headShape;
        }
        
        // Cap
        if (capShape > 0.01) {
            color = mix(color, capColor, capShape);
            opacity = max(opacity, capShape);
        }
        
        // Body
        if (bodyShape > 0.01) {
            color = mix(color, uniformColor, bodyShape);
            opacity = max(opacity, bodyShape);
        }
        
        // Arms
        if (armShape > 0.01) {
            color = mix(color, uniformColor, armShape);
            opacity = max(opacity, armShape);
        }
        
        return vec4(color, opacity);
    }
    
    // Draw a simple house/building
    vec4 drawBuilding(vec2 uv) {
        // Building position
        float buildingX = 0.7;
        float buildingY = 0.3;
        
        // Transform UV to building space
        vec2 buildingUV = uv - vec2(buildingX, buildingY);
        
        // Building dimensions
        float buildingWidth = 0.25;
        float buildingHeight = 0.3;
        
        // Draw building body
        float buildingShape = smoothstep(buildingWidth, buildingWidth - 0.01, abs(buildingUV.x)) * 
                              smoothstep(buildingHeight, buildingHeight - 0.01, abs(buildingUV.y));
                              
        // Draw roof
        float roofHeight = 0.1;
        vec2 roofPoint1 = vec2(-buildingWidth, -buildingHeight);
        vec2 roofPoint2 = vec2(buildingWidth, -buildingHeight);
        vec2 roofPoint3 = vec2(0.0, -buildingHeight - roofHeight);
        
        // Check if point is inside triangle
        vec2 v0 = roofPoint2 - roofPoint1;
        vec2 v1 = roofPoint3 - roofPoint1;
        vec2 v2 = buildingUV - roofPoint1;
        
        float dot00 = dot(v0, v0);
        float dot01 = dot(v0, v1);
        float dot02 = dot(v0, v2);
        float dot11 = dot(v1, v1);
        float dot12 = dot(v1, v2);
        
        float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
        float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        
        float roofShape = float(u >= 0.0 && v >= 0.0 && u + v <= 1.0);
        
        // Draw door
        float doorWidth = 0.05;
        float doorHeight = 0.1;
        float doorShape = smoothstep(doorWidth, doorWidth - 0.01, abs(buildingUV.x)) * 
                          smoothstep(doorHeight, doorHeight - 0.01, abs(buildingUV.y - (buildingHeight - doorHeight / 2.0)));
                          
        // Draw windows
        float windowSize = 0.06;
        float windowSpacing = 0.12;
        
        float window1 = smoothstep(windowSize/2.0, windowSize/2.0 - 0.01, 
                        max(abs(buildingUV.x - windowSpacing), abs(buildingUV.y - windowSpacing)));
        float window2 = smoothstep(windowSize/2.0, windowSize/2.0 - 0.01, 
                        max(abs(buildingUV.x + windowSpacing), abs(buildingUV.y - windowSpacing)));
        
        // Colors
        vec3 buildingColor = vec3(0.9, 0.85, 0.7); // Light beige
        vec3 roofColor = vec3(0.7, 0.3, 0.2); // Red/brown
        vec3 doorColor = vec3(0.4, 0.25, 0.15); // Brown
        vec3 windowColor = vec3(0.7, 0.9, 1.0); // Light blue
        
        // Combine parts
        vec3 color = vec3(0.0);
        float opacity = 0.0;
        
        // Building body
        if (buildingShape > 0.01) {
            color = buildingColor;
            opacity = buildingShape;
        }
        
        // Roof
        if (roofShape > 0.01) {
            color = mix(color, roofColor, roofShape);
            opacity = max(opacity, roofShape);
        }
        
        // Door
        if (doorShape > 0.01) {
            color = mix(color, doorColor, doorShape);
            opacity = max(opacity, doorShape);
        }
        
        // Windows
        if (window1 > 0.01 || window2 > 0.01) {
            color = mix(color, windowColor, max(window1, window2));
            opacity = max(opacity, max(window1, window2));
        }
        
        return vec4(color, opacity);
    }
    
    // Draw background with sky and ground
    vec4 drawBackground(vec2 uv) {
        // Sky gradient
        vec3 skyColor = mix(vec3(0.5, 0.8, 1.0), vec3(0.7, 0.9, 1.0), smoothstep(-1.0, 1.0, uv.y));
        
        // Ground
        float groundLevel = 0.1;
        float onGround = step(uv.y, groundLevel);
        vec3 groundColor = vec3(0.4, 0.6, 0.3);
        
        vec3 color = mix(skyColor, groundColor, onGround);
        
        // Add some subtle clouds
        for (int i = 0; i < 3; i++) {
            float cloudY = 0.5 + float(i) * 0.2;
            float cloudX = mod(u_time * 0.02 + float(i) * 0.3, 2.0) - 1.0;
            float cloudSize = 0.2 + float(i) * 0.1;
            
            float cloud = smoothstep(cloudSize, cloudSize - 0.1, 
                         length(vec2(uv.x - cloudX, uv.y - cloudY) * vec2(1.5, 1.0)));
                         
            color = mix(color, vec3(1.0), cloud * 0.3);
        }
        
        return vec4(color, 1.0);
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
        
        // Get delivery data
        vec4 vehicleData = getDeliveryData(0, 0); // Vehicle base data
        vec4 vehicleData2 = getDeliveryData(0, 1); // Additional vehicle data
        vec4 packageData = getDeliveryData(1, 0); // Food package base data
        vec4 packageData2 = getDeliveryData(1, 1); // Additional package data
        
        // Draw the scene
        vec4 background = drawBackground(uv);
        vec4 building = drawBuilding(uv);
        vec4 road = drawRoad(uv, t);
        vec4 vehicle = drawDeliveryVehicle(uv, vehicleData, vehicleData2);
        vec4 foodPackage = drawFoodPackage(uv, packageData, packageData2);
        vec4 deliveryPerson = drawDeliveryPerson(uv, vehicleData, packageData);
        vec4 recipient = drawRecipient(uv, vehicleData);
        
        // Combine everything with proper blending
        vec3 color = background.rgb;
        
        // Add building
        color = mix(color, building.rgb, building.a);
        
        // Add road
        color = mix(color, road.rgb, road.a);
        
        // Add vehicle
        color = mix(color, vehicle.rgb, vehicle.a);
        
        // Add delivery person
        color = mix(color, deliveryPerson.rgb, deliveryPerson.a);
        
        // Add recipient
        color = mix(color, recipient.rgb, recipient.a);
        
        // Add food package
        color = mix(color, foodPackage.rgb, foodPackage.a);
        
        // Determine alpha (need both road and vehicle to be visible)
        float alpha = max(max(vehicle.a, road.a), max(foodPackage.a, max(deliveryPerson.a, recipient.a)));
        
        // Add delivery effects based on click positions
        if (alpha > 0.01) {
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
                    
                    // Create effect at click position
                    if (dist < radiusVal) {
                        // Create a highlight at the position
                        float highlight = smoothstep(radiusVal, 0.0, dist) * 0.3 * (1.0 - clickDistance);
                        color += vec3(1.0, 0.9, 0.5) * highlight;
                    }
                }
            }
        }
        
        gl_FragColor = vec4(color, alpha);
    }
    `;
}