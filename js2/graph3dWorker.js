// Main web worker code
let canvas = null;
let ctx = null;
let startTime = 0;
let previousTime = 0;
let frameCount = 0;

// Animation parameters
let noiseTime = 0;
let noiseSpeed = 0.2;
let noiseFrequency = 0.8;
let noiseDistortion = 0.5;

// Add click-related data structure similar to HTML version
const clickData = [];
let activeClickIdx = 0;
const maxClicks = 15;

// Initialize click data
for (let i = 0; i < maxClicks; i++) {
  clickData.push({
    x: 0,
    y: 0,
    scale: 0,
    clickDistance: 0
  });
}

// Performance monitoring
const perfMonitor = {
  start: function() { this.startTime = performance.now(); },
  end: function() { return performance.now() - this.startTime; }
};

// Cache for performance optimization
let vertexCache = null;
let normalCache = null;

// Perlin noise implementation (keeping your existing implementation)
// ...

// Main worker function to handle messages
self.onmessage = function(e) {
  try {
    const startProcessingTime = performance.now();
    perfMonitor.start();
    
    const { 
      imageData, 
      reset,
      deviceInfo,
      config,
      clickEvent  // Add handling for click events
    } = e.data;
    
    const currentTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    
    // Handle configuration if provided
    if (config) {
      if (config.hasOwnProperty('speed')) {
        noiseSpeed = config.speed;
      }
      
      if (config.hasOwnProperty('frequency')) {
        noiseFrequency = config.frequency;
      }
      
      if (config.hasOwnProperty('distortion')) {
        noiseDistortion = config.distortion;
      }
    }
    
    // Handle click events similar to the HTML version
    if (clickEvent) {
      clickData[activeClickIdx].x = clickEvent.x / width + 0.03 * Math.random();
      clickData[activeClickIdx].y = 1.0 - clickEvent.y / height;
      clickData[activeClickIdx].clickDistance = 0;
      clickData[activeClickIdx].scale = 0;
      
      // Animate the click data over time
      // We'll simulate GSAP timeline by incrementing these values in future frames
      activeClickIdx = (activeClickIdx + 1) % maxClicks;
    }
    
    // Initialize canvas if not already done
    if (!canvas) {
      try {
        canvas = new OffscreenCanvas(width, height);
        ctx = canvas.getContext('2d', { 
          alpha: true,
          desynchronized: true,
          willReadFrequently: false
        });
        
        if (!ctx) {
          throw new Error("Failed to create canvas context");
        }
        
        // Set dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Create mesh only once
        const sphereMesh = createSphereMesh(1.0, 32);
        vertexCache = sphereMesh.vertices;
        normalCache = sphereMesh.normals;
        mesh = sphereMesh;
        
        // Initialize parameters based on device info
        if (deviceInfo) {
          if (deviceInfo.isLowPower || deviceInfo.isMobile) {
            // Lower quality for mobile
            mesh = createSphereMesh(1.0, 16); // Lower detail
            noiseFrequency = 0.5;
          } else if (deviceInfo.isHighPerformance) {
            // Higher quality for powerful devices
            mesh = createSphereMesh(1.0, 48); // Higher detail
            noiseFrequency = 1.0;
          }
        }
      } catch (canvasError) {
        self.postMessage({
          error: `Canvas initialization error: ${canvasError.message}`,
          isComplete: true
        });
        return;
      }
    }
    
    // Reset animation if requested
    if (reset) {
      startTime = currentTime;
      previousTime = currentTime;
      frameCount = 0;
    }
    
    // If this is first frame, initialize animation
    if (startTime === 0) {
      startTime = currentTime;
      previousTime = currentTime;
    }
    
    // Update animation time
    const elapsed = currentTime - startTime;
    noiseTime = elapsed * 0.001; // Convert to seconds
    
    // Update previous time
    previousTime = currentTime;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update animation for all click points (similar to HTML version)
    for (let i = 0; i < maxClicks; i++) {
      if (clickData[i].clickDistance < 1.0) {
        clickData[i].clickDistance += 0.016; // Roughly equivalent to GSAP animation
      }
      
      if (clickData[i].scale < 1.0) {
        clickData[i].scale += 0.023; // Simulate GSAP ease
      }
    }
    
    // Render the blobby shape with noise displacement
    renderMesh(ctx, mesh, width, height);
    
    // Add additional blob rendering for each click point
    for (let i = 0; i < maxClicks; i++) {
      if (clickData[i].scale > 0.01) {
        renderClickBlob(ctx, clickData[i], width, height);
      }
    }
    
    // Draw page title 
    ctx.font = '16vh sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 182, 193, 0.8)'; // light pink
    ctx.globalCompositeOperation = 'luminosity';
    ctx.fillText('Blobby Apple', width / 2, height / 2);
    ctx.globalCompositeOperation = 'source-over';
    
    // Get final image data
    let resultImageData;
    try {
      resultImageData = ctx.getImageData(0, 0, width, height);
    } catch (readError) {
      self.postMessage({
        error: `Canvas read error: ${readError.message}`,
        isComplete: true
      });
      return;
    }
    
    // Increment frame counter
    frameCount++;
    
    // Calculate processing time
    const processingTime = performance.now() - startProcessingTime;
    
    // Send result back to main thread
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      progress: Math.min(1.0, elapsed / 5000), // 5 second animation cycle
      performance: {
        noiseTime: noiseTime,
        noiseSpeed: noiseSpeed,
        noiseFrequency: noiseFrequency,
        noiseDistortion: noiseDistortion,
        renderTime: processingTime.toFixed(2),
        clicksActive: clickData.filter(c => c.scale > 0.01).length
      }
    }, [resultImageData.data.buffer]);
  } catch (error) {
    // Error handling
    console.error("Animation worker error:", error);
    
    self.postMessage({
      error: `Animation worker error: ${error.message}`,
      stack: error.stack,
      isComplete: true
    });
  }  
};

// Function to render additional blobs at click positions
function renderClickBlob(ctx, clickPoint, width, height) {
  // Create smaller blob at click position
  const x = clickPoint.x * width;
  const y = clickPoint.y * height;
  const scale = clickPoint.scale;
  const clickDistance = clickPoint.clickDistance;
  
  // Draw a simplified blob for each click
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * 0.3, scale * 0.3);
  
  // Use clickDistance to animate color and shape
  const colorIntensity = Math.min(1, clickDistance * 2);
  ctx.fillStyle = `rgba(255, ${Math.floor(182 * colorIntensity)}, ${Math.floor(193 * colorIntensity)}, ${0.8 * scale})`;
  
  // Draw blob shape with a bit of wobble
  ctx.beginPath();
  const wobble = 0.1 * Math.sin(noiseTime * 5 + clickPoint.x * 10);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 100 * (1 + wobble * Math.sin(angle * 3 + noiseTime * 2));
    const bx = Math.cos(angle) * radius;
    const by = Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(bx, by);
    } else {
      ctx.lineTo(bx, by);
    }
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

// Perlin noise implementation directly ported from the shader
// This is a JavaScript implementation of the GLSL shader noise functions
function mod289(x) {
  return x - Math.floor(x * (1.0 / 289.0)) * 289.0;
}

function permute(x) {
  return mod289((x * 34.0 + 1.0) * x);
}

function taylorInvSqrt(r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

function fade(t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// 3D Perlin noise implementation matching the shader
function pnoise(P) {
  // Grid point indices
  const Pi0x = Math.floor(P.x) % 4;
  const Pi0y = Math.floor(P.y) % 4;
  const Pi0z = Math.floor(P.z) % 4;
  
  const Pi1x = (Pi0x + 1) % 4;
  const Pi1y = (Pi0y + 1) % 4;
  const Pi1z = (Pi0z + 1) % 4;
  
  // Modulo 289 operations
  const Pi0xMod = mod289(Pi0x);
  const Pi0yMod = mod289(Pi0y);
  const Pi0zMod = mod289(Pi0z);
  
  const Pi1xMod = mod289(Pi1x);
  const Pi1yMod = mod289(Pi1y);
  const Pi1zMod = mod289(Pi1z);
  
  // Fractional parts
  const Pf0x = P.x - Math.floor(P.x);
  const Pf0y = P.y - Math.floor(P.y);
  const Pf0z = P.z - Math.floor(P.z);
  
  const Pf1x = Pf0x - 1.0;
  const Pf1y = Pf0y - 1.0;
  const Pf1z = Pf0z - 1.0;
  
  // Simplified hash function for gradient generation
  function hash(x, y, z) {
    return mod289((x + y * 157 + z * 113) % 289);
  }
  
  // Gradient generation - simplified version of permute logic
  function getGradient(hash) {
    // Create a pseudo-random gradient vector
    const h = hash % 13 * 0.5;
    const theta = 2 * Math.PI * h;
    
    return {
      x: Math.cos(theta),
      y: Math.sin(theta),
      z: h > 0.1 ? 0.5 : -0.5
    };
  }
  
  // Calculate gradients for 8 corners
  const g000 = getGradient(hash(Pi0xMod, Pi0yMod, Pi0zMod));
  const g100 = getGradient(hash(Pi1xMod, Pi0yMod, Pi0zMod));
  const g010 = getGradient(hash(Pi0xMod, Pi1yMod, Pi0zMod));
  const g110 = getGradient(hash(Pi1xMod, Pi1yMod, Pi0zMod));
  const g001 = getGradient(hash(Pi0xMod, Pi0yMod, Pi1zMod));
  const g101 = getGradient(hash(Pi1xMod, Pi0yMod, Pi1zMod));
  const g011 = getGradient(hash(Pi0xMod, Pi1yMod, Pi1zMod));
  const g111 = getGradient(hash(Pi1xMod, Pi1yMod, Pi1zMod));
  
  // Dot products
  function dot(g, x, y, z) {
    return g.x * x + g.y * y + g.z * z;
  }
  
  const n000 = dot(g000, Pf0x, Pf0y, Pf0z);
  const n100 = dot(g100, Pf1x, Pf0y, Pf0z);
  const n010 = dot(g010, Pf0x, Pf1y, Pf0z);
  const n110 = dot(g110, Pf1x, Pf1y, Pf0z);
  const n001 = dot(g001, Pf0x, Pf0y, Pf1z);
  const n101 = dot(g101, Pf1x, Pf0y, Pf1z);
  const n011 = dot(g011, Pf0x, Pf1y, Pf1z);
  const n111 = dot(g111, Pf1x, Pf1y, Pf1z);
  
  // Faded interpolation
  const fadeX = fade(Pf0x);
  const fadeY = fade(Pf0y);
  const fadeZ = fade(Pf0z);
  
  // Interpolation along Z
  const nx00 = n000 * (1 - fadeZ) + n001 * fadeZ;
  const nx01 = n100 * (1 - fadeZ) + n101 * fadeZ;
  const nx10 = n010 * (1 - fadeZ) + n011 * fadeZ;
  const nx11 = n110 * (1 - fadeZ) + n111 * fadeZ;
  
  // Interpolation along Y
  const nx0 = nx00 * (1 - fadeY) + nx10 * fadeY;
  const nx1 = nx01 * (1 - fadeY) + nx11 * fadeY;
  
  // Final interpolation along X
  const result = nx0 * (1 - fadeX) + nx1 * fadeX;
  
  // Scale to match shader output
  return 2.2 * result;
}

// Direct port of the shader displacement function
function displacement(p) {
  const t = 3.0 * noiseSpeed * noiseTime;
  const noiseInput = {
    x: p.x * noiseFrequency + (t % 4), 
    y: p.y * noiseFrequency, 
    z: p.z * noiseFrequency
  };
  
  const noise_shape = pnoise(noiseInput);
  const pos = {
    x: p.x - p.x * noiseDistortion * noise_shape,
    y: p.y - p.y * noiseDistortion * noise_shape,
    z: p.z - p.z * noiseDistortion * noise_shape
  };
  
  return pos;
}

// Create orthogonal vector (equivalent to shader function)
function orthogonal(v) {
  if (Math.abs(v.x) > Math.abs(v.z)) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    return {
      x: -v.y / length,
      y: v.x / length,
      z: 0.0
    };
  } else {
    const length = Math.sqrt(v.y * v.y + v.z * v.z);
    return {
      x: 0.0,
      y: -v.z / length,
      z: v.y / length
    };
  }
}

// Calculate normal vector after displacement
function calculateDisplacedNormal(position, normal) {
  // Create tangent and bitangent just like in the shader
  const offset = 1.0 / 128.0;
  const tangent = orthogonal(normal);
  
  // Cross product to get bitangent
  const bitangent = {
    x: normal.y * tangent.z - normal.z * tangent.y,
    y: normal.z * tangent.x - normal.x * tangent.z,
    z: normal.x * tangent.y - normal.y * tangent.x
  };
  
  // Normalize bitangent
  const bitLength = Math.sqrt(bitangent.x * bitangent.x + bitangent.y * bitangent.y + bitangent.z * bitangent.z);
  bitangent.x /= bitLength;
  bitangent.y /= bitLength;
  bitangent.z /= bitLength;
  
  // Calculate neighbor positions
  const neighbour1 = {
    x: position.x + tangent.x * offset,
    y: position.y + tangent.y * offset,
    z: position.z + tangent.z * offset
  };
  
  const neighbour2 = {
    x: position.x + bitangent.x * offset,
    y: position.y + bitangent.y * offset,
    z: position.z + bitangent.z * offset
  };
  
  // Calculate displaced positions
  const displacedPosition = displacement(position);
  const displacedNeighbour1 = displacement(neighbour1);
  const displacedNeighbour2 = displacement(neighbour2);
  
  // Calculate tangent vectors in displaced space
  const displacedTangent = {
    x: displacedNeighbour1.x - displacedPosition.x,
    y: displacedNeighbour1.y - displacedPosition.y,
    z: displacedNeighbour1.z - displacedPosition.z
  };
  
  const displacedBitangent = {
    x: displacedNeighbour2.x - displacedPosition.x,
    y: displacedNeighbour2.y - displacedPosition.y,
    z: displacedNeighbour2.z - displacedPosition.z
  };
  
  // Cross product for normal
  const crossX = displacedTangent.y * displacedBitangent.z - displacedTangent.z * displacedBitangent.y;
  const crossY = displacedTangent.z * displacedBitangent.x - displacedTangent.x * displacedBitangent.z;
  const crossZ = displacedTangent.x * displacedBitangent.y - displacedTangent.y * displacedBitangent.x;
  
  // Normalize
  const length = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
  
  return {
    x: crossX / length,
    y: crossY / length,
    z: crossZ / length
  };
}

// Create a sphere mesh for the apple shape - simplified for 2D canvas rendering
function createSphereMesh(radius, detail) {
  const vertices = [];
  const normals = [];
  const indices = [];
  
  // Generate sphere vertices
  for (let y = 0; y <= detail; y++) {
    const v = y / detail;
    const phi = v * Math.PI;
    
    for (let x = 0; x <= detail; x++) {
      const u = x / detail;
      const theta = u * 2 * Math.PI;
      
      // Spherical to Cartesian coordinates
      const px = radius * Math.sin(phi) * Math.cos(theta);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(phi) * Math.sin(theta);
      
      // Vertex
      vertices.push({ x: px, y: py, z: pz });
      
      // Normal (normalized vertex for a sphere)
      const nx = px / radius;
      const ny = py / radius;
      const nz = pz / radius;
      normals.push({ x: nx, y: ny, z: nz });
      
      // Indices for triangle faces
      if (y < detail && x < detail) {
        const a = y * (detail + 1) + x;
        const b = a + 1;
        const c = a + (detail + 1);
        const d = c + 1;
        
        // Two triangles per grid cell
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }
  
  return { vertices, normals, indices };
}

// Render a mesh with displacement applied
function renderMesh(ctx, mesh, width, height) {
  const { vertices, normals, indices } = mesh;
  
  // Create a new ImageData
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Clear all pixels
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;        // R
    data[i + 1] = 248;    // G
    data[i + 2] = 238;    // B
    data[i + 3] = 255;    // A (fully opaque)
  }
  
  // Apply displacement to vertices
  const displacedVertices = [];
  const displacedNormals = [];
  
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    const normal = normals[i];
    
    // Apply displacement
    const displacedVertex = displacement(vertex);
    displacedVertices.push(displacedVertex);
    
    // Calculate new normal
    const displacedNormal = calculateDisplacedNormal(vertex, normal);
    displacedNormals.push(displacedNormal);
  }
  
  // Project vertices to 2D screen space (simplified projection)
  const projectedVertices = [];
  const scale = Math.min(width, height) * 0.4; // Scale to fit screen
  const centerX = width / 2;
  const centerY = height / 2;
  
  for (const v of displacedVertices) {
    // Simple perspective effect
    const perspective = 3.0 / (3.0 + v.z);
    
    projectedVertices.push({
      x: centerX + v.x * scale * perspective,
      y: centerY - v.y * scale * perspective,
      z: v.z
    });
  }
  
  // Calculate lighting for each face
  const lightPos = { x: 15, y: 0, z: 15 }; // Match the light position from Three.js
  
  // Simple rendering by drawing triangles
  ctx.clearRect(0, 0, width, height);
  
  // Ambient light setting
  const ambientIntensity = 0.5;
  const directionalIntensity = 10.0;
  
  // Material color (light pink like in the example)
  const materialColor = { r: 255, g: 182, b: 193 };
  
  // Render each triangle
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];
    
    const v1 = projectedVertices[i1];
    const v2 = projectedVertices[i2];
    const v3 = projectedVertices[i3];
    
    // Backface culling - skip triangles facing away
    const edge1x = v2.x - v1.x;
    const edge1y = v2.y - v1.y;
    const edge2x = v3.x - v1.x;
    const edge2y = v3.y - v1.y;
    
    const crossProduct = edge1x * edge2y - edge1y * edge2x;
    if (crossProduct <= 0) continue; // Skip back-facing triangles
    
    // Calculate lighting
    const n1 = displacedNormals[i1];
    const n2 = displacedNormals[i2];
    const n3 = displacedNormals[i3];
    
    // Average normal for the face
    const nx = (n1.x + n2.x + n3.x) / 3;
    const ny = (n1.y + n2.y + n3.y) / 3;
    const nz = (n1.z + n2.z + n3.z) / 3;
    
    // Normalized light direction vector
    const lightDirX = lightPos.x;
    const lightDirY = lightPos.y;
    const lightDirZ = lightPos.z;
    const lightLength = Math.sqrt(lightDirX * lightDirX + lightDirY * lightDirY + lightDirZ * lightDirZ);
    
    const ldx = lightDirX / lightLength;
    const ldy = lightDirY / lightLength;
    const ldz = lightDirZ / lightLength;
    
    // Diffuse lighting calculation
    let diffuse = nx * ldx + ny * ldy + nz * ldz;
    diffuse = Math.max(0, diffuse); // No negative values
    
    // Combined lighting result
    const lightIntensity = ambientIntensity + diffuse * directionalIntensity;
    
    // Calculate final color with lighting
    const r = Math.min(255, Math.floor(materialColor.r * lightIntensity));
    const g = Math.min(255, Math.floor(materialColor.g * lightIntensity));
    const b = Math.min(255, Math.floor(materialColor.b * lightIntensity));
    
    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.lineTo(v3.x, v3.y);
    ctx.closePath();
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fill();
  }
}
