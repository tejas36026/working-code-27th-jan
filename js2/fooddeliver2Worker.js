// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const FRAME_RATE = 60;

// Animation constants
const SCOOTER_SPEED = 2.5;
const ROAD_SPEED = 2;
const WHEEL_ROTATION_SPEED = 0.15;
const DELIVERY_TIME = 3000; // ms until delivery animation completes
const MAX_PATH_POINTS = 100; // Maximum number of points in the path
const PATH_SMOOTHING = 0.2; // Lower values make smoother curves

// Animation state
let animationStartTime = Date.now();
let isAnimating = true;
let canvas, ctx;
let pathPoints = []; // Points for the scooter to follow
let maskData = null; // For removing background

// Scooter position and physics
let scooter = {
  x: 100,
  y: CANVAS_HEIGHT - 150,
  targetIndex: 0, // Current target point index
  rotation: 0,
  wheelRotation: 0,
  bounceOffset: 0,
  isDelivering: false,
  deliveryStartTime: 0,
  deliveryProgress: 0,
  lastDeliveryTime: 0
};

// Handle messages from the main thread
self.onmessage = function(e) {
  const { imageData, selectedRegions, mousePosition, value, value5: iterations, reset, action } = e.data;
  
  try {
    // Initialize canvas if needed
    if (!canvas || canvas.width !== imageData.width || canvas.height !== imageData.height) {
      initializeCanvas(imageData.width, imageData.height);
    }
    
    // Handle special actions
    if (action === 'deliver_food') {
      triggerDelivery();
    } else if (action === 'reset') {
      resetAnimation();
    } else if (action === 'toggle_background') {
      // Toggle background visibility (set mask from selected regions)
      if (selectedRegions && selectedRegions.length > 0) {
        createMaskFromRegions(selectedRegions, imageData.width, imageData.height);
      } else {
        maskData = null; // Clear mask
      }
    }
    
    // Add mouse positions to path if provided
    if (mousePosition && mousePosition.x !== undefined) {
      addPathPoint(mousePosition.x, mousePosition.y);
    }
    
    // Create a frame of animation
    updateAnimation();
    const resultImageData = createAnimationFrame(imageData);
    
    // Send frame back to main thread
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      iteration: 0,
      progress: 1
    }, [resultImageData.data.buffer]);
    
  } catch (error) {
    self.postMessage({ error: error.message, isComplete: true });
  }
};

// Initialize the canvas using OffscreenCanvas
function initializeCanvas(width, height) {
  canvas = new OffscreenCanvas(width, height);
  ctx = canvas.getContext('2d');
  
  // Initialize with some default path points
  pathPoints = [];
  for (let i = 0; i < 10; i++) {
    pathPoints.push({
      x: width * 0.1 + (width * 0.8 * i / 9),
      y: height * 0.7 + Math.sin(i * 0.7) * height * 0.1
    });
  }
}

// Add a point to the path
function addPathPoint(x, y) {
  // Add new point to path
  pathPoints.push({ x, y });
  
  // Keep path at reasonable length
  if (pathPoints.length > MAX_PATH_POINTS) {
    pathPoints.shift();
  }
}

// Create mask from selected regions for background removal
function createMaskFromRegions(regions, width, height) {
  // Create a mask canvas
  const maskCanvas = new OffscreenCanvas(width, height);
  const maskCtx = maskCanvas.getContext('2d');
  
  // Clear mask
  maskCtx.clearRect(0, 0, width, height);
  
  // Draw regions as white on black background
  maskCtx.fillStyle = 'white';
  
  // Draw each region
  for (const region of regions) {
    if (region && region.length > 2) {
      maskCtx.beginPath();
      maskCtx.moveTo(region[0].x, region[0].y);
      
      for (let i = 1; i < region.length; i++) {
        maskCtx.lineTo(region[i].x, region[i].y);
      }
      
      maskCtx.closePath();
      maskCtx.fill();
    }
  }
  
  // Get mask data
  maskData = maskCtx.getImageData(0, 0, width, height);
}

// Reset animation state
function resetAnimation() {
  animationStartTime = Date.now();
  scooter.x = 100;
  scooter.y = CANVAS_HEIGHT - 150;
  scooter.targetIndex = 0;
  scooter.rotation = 0;
  scooter.isDelivering = false;
  pathPoints = []; // Clear path
}

// Trigger a delivery animation
function triggerDelivery() {
  const currentTime = Date.now();
  // Only allow a new delivery after some cooldown
  if (!scooter.isDelivering && currentTime - scooter.lastDeliveryTime > 3000) {
    scooter.isDelivering = true;
    scooter.deliveryStartTime = currentTime;
  }
}

// Update animation state
function updateAnimation() {
  const currentTime = Date.now();
  const deltaTime = (currentTime - animationStartTime) / 1000;
  animationStartTime = currentTime;
  
  // Update scooter physics
  updateScooterPhysics(currentTime, deltaTime);
  
  // Update delivery animation
  if (scooter.isDelivering) {
    const deliveryElapsed = currentTime - scooter.deliveryStartTime;
    scooter.deliveryProgress = Math.min(1.0, deliveryElapsed / DELIVERY_TIME);
    
    if (scooter.deliveryProgress >= 1.0) {
      // Delivery complete
      scooter.isDelivering = false;
      scooter.lastDeliveryTime = currentTime;
    }
  }
}

// Create a single frame of animation
function createAnimationFrame(sourceImageData) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw original image if no mask, or apply mask to remove background
  if (!maskData) {
    ctx.putImageData(sourceImageData, 0, 0);
  } else {
    // Apply mask to source image (keep only masked areas)
    const maskedImageData = new ImageData(
      new Uint8ClampedArray(sourceImageData.data),
      sourceImageData.width,
      sourceImageData.height
    );
    
    for (let i = 0; i < maskedImageData.data.length; i += 4) {
      // If mask pixel is not white, make transparent
      if (maskData.data[i] < 128) {
        maskedImageData.data[i + 3] = 0; // Set alpha to 0
      }
    }
    
    ctx.putImageData(maskedImageData, 0, 0);
  }
  
  // Draw scene elements
  drawBackground();
  drawPath();
  
  // Draw scooter and delivery animation
  if (scooter.isDelivering) {
    drawDeliveryAnimation(scooter.deliveryProgress);
  } else {
    drawScooter();
  }
  
  // Return the result
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Update scooter physics to follow the path
function updateScooterPhysics(currentTime, deltaTime) {
  // Skip movement if delivering or no path
  if (scooter.isDelivering || pathPoints.length === 0) {
    // Still animate wheels and bounce
    scooter.wheelRotation += WHEEL_ROTATION_SPEED;
    scooter.bounceOffset = Math.sin(currentTime * 0.01) * 2;
    return;
  }
  
  // Get current target point
  const targetIndex = Math.min(scooter.targetIndex, pathPoints.length - 1);
  const target = pathPoints[targetIndex];
  
  if (!target) return;
  
  // Calculate direction to target
  const dx = target.x - scooter.x;
  const dy = target.y - scooter.y;
  const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
  
  // Move to next target if close enough
  if (distanceToTarget < 10) {
    scooter.targetIndex++;
    
    // If we've reached the end of the path, circle back to start
    if (scooter.targetIndex >= pathPoints.length) {
      scooter.targetIndex = 0;
    }
  } else {
    // Calculate normalized direction
    const dirX = dx / distanceToTarget;
    const dirY = dy / distanceToTarget;
    
    // Calculate target rotation (in radians)
    const targetRotation = Math.atan2(dirY, dirX);
    
    // Smoothly rotate towards target direction
    let rotDiff = targetRotation - scooter.rotation;
    // Handle angle wrapping
    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    
    // Apply smooth rotation
    scooter.rotation += rotDiff * 0.1;
    
    // Move scooter along its facing direction
    const moveSpeed = SCOOTER_SPEED * deltaTime * 60; // Normalize by frame rate
    scooter.x += Math.cos(scooter.rotation) * moveSpeed;
    scooter.y += Math.sin(scooter.rotation) * moveSpeed;
    
    // Animate wheels and add bounce
    scooter.wheelRotation += WHEEL_ROTATION_SPEED;
    scooter.bounceOffset = Math.sin(currentTime * 0.01) * 3;
  }
}

// Draw the path for debugging
function drawPath() {
  if (pathPoints.length < 2) return;
  
  ctx.save();
  
  // Draw path line
  ctx.strokeStyle = 'rgba(255, 180, 50, 0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  
  for (let i = 1; i < pathPoints.length; i++) {
    ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  }
  
  ctx.stroke();
  
  // Draw current target point
  if (scooter.targetIndex < pathPoints.length) {
    const target = pathPoints[scooter.targetIndex];
    ctx.fillStyle = 'rgba(255, 100, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

// Draw the background with a nice gradient sky
function drawBackground() {
  // Only draw background if we're removing the original background
  if (!maskData) return;
  
  // Create sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
  skyGradient.addColorStop(0, '#87CEEB');  // Light blue sky
  skyGradient.addColorStop(1, '#E0F7FF');  // Lighter blue near horizon
  
  // Fill sky
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw ground
  ctx.fillStyle = '#FAD98C';  // Sandy/yellowish background
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
  
  // Draw road
  const roadY = canvas.height * 0.75;
  const roadHeight = 40;
  
  ctx.fillStyle = '#505050';
  ctx.fillRect(0, roadY, canvas.width, roadHeight);
  
  // Draw road markings
  ctx.fillStyle = 'white';
  const lineOffset = (Date.now() * ROAD_SPEED / 50) % 80;
  
  for (let x = -lineOffset; x < canvas.width; x += 80) {
    ctx.fillRect(x, roadY + roadHeight/2 - 2, 40, 4);
  }
}

// Draw the delivery person on a scooter
function drawScooter() {
  // Save context for transformations
  ctx.save();
  
  // Position at scooter location with bounce effect
  ctx.translate(scooter.x, scooter.y + scooter.bounceOffset);
  
  // Apply scooter rotation
  ctx.rotate(scooter.rotation);
  
  // Draw rear wheel
  ctx.save();
  ctx.translate(-30, 0);
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw wheel spokes
  ctx.rotate(scooter.wheelRotation);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.rotate(Math.PI / 4);
  }
  ctx.restore();
  
  // Draw front wheel
  ctx.save();
  ctx.translate(30, 0);
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw wheel spokes
  ctx.rotate(scooter.wheelRotation);
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.rotate(Math.PI / 4);
  }
  ctx.restore();
  
  // Draw scooter body
  ctx.fillStyle = '#FFD237';  // Yellow scooter like in reference
  ctx.beginPath();
  ctx.moveTo(-35, -10);
  ctx.lineTo(35, -10);
  ctx.lineTo(40, -30);
  ctx.lineTo(25, -40);
  ctx.lineTo(-15, -40);
  ctx.lineTo(-35, -10);
  ctx.fill();
  
  // Draw handlebars
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, -35);
  ctx.lineTo(40, -50);
  ctx.stroke();
  
  // Draw delivery box
  ctx.fillStyle = '#FF5B35';  // Orange delivery box
  ctx.fillRect(-20, -80, 40, 35);
  
  // Draw box details
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('FOOD', 0, -60);
  ctx.fillText('DELIVERY', 0, -48);
  
  // Draw delivery person
  drawDeliveryPerson();
  
  // Restore context
  ctx.restore();
}

// Draw the delivery person
function drawDeliveryPerson() {
  // Draw helmet
  ctx.fillStyle = '#FF5B35';  // Orange helmet
  ctx.beginPath();
  ctx.ellipse(5, -95, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw face
  ctx.fillStyle = '#F8D8C0';  // Skin tone
  ctx.beginPath();
  ctx.arc(8, -93, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw body
  ctx.fillStyle = '#2389DA';  // Blue shirt/jacket
  ctx.beginPath();
  ctx.moveTo(-5, -85);
  ctx.lineTo(20, -85);
  ctx.lineTo(15, -50);
  ctx.lineTo(-5, -50);
  ctx.fill();
  
  // Draw arms
  ctx.strokeStyle = '#2389DA';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(15, -80);
  ctx.lineTo(30, -60);
  ctx.stroke();
  
  // Draw legs
  ctx.fillStyle = '#555';  // Dark pants
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(15, -50);
  ctx.lineTo(25, -10);
  ctx.lineTo(15, -10);
  ctx.lineTo(0, -50);
  ctx.fill();
}

// Draw delivery animation
function drawDeliveryAnimation(progress) {
  // Save context
  ctx.save();
  
  // Position at delivery location
  ctx.translate(scooter.x, scooter.y - 40);
  
  // Draw scooter (static)
  ctx.save();
  ctx.translate(0, 40);
  
  // Draw scooter body and wheels (simplified)
  ctx.fillStyle = '#FFD237';
  ctx.beginPath();
  ctx.moveTo(-35, -10);
  ctx.lineTo(35, -10);
  ctx.lineTo(40, -30);
  ctx.lineTo(25, -40);
  ctx.lineTo(-15, -40);
  ctx.lineTo(-35, -10);
  ctx.fill();
  
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(-30, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(30, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw delivery box
  ctx.fillStyle = '#FF5B35';
  ctx.fillRect(-20, -80, 40, 35);
  
  ctx.restore();
  
  // Draw building entrance or door
  ctx.fillStyle = '#A67D5D';
  ctx.fillRect(70, -60, 40, 100);
  
  // Draw door details
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(75, -55, 30, 90);
  
  // Draw delivery person walking to door
  const walkPosition = Math.min(progress * 120, 70);
  
  ctx.save();
  ctx.translate(walkPosition, 0);
  
  // Draw food package in hands
  if (progress < 0.7) {
    ctx.fillStyle = '#FF5B35';
    ctx.fillRect(-10, -30, 20, 15);
    
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FOOD', 0, -20);
  }
  
  // Draw person with walking animation
  ctx.fillStyle = '#FF5B35';  // Orange helmet
  ctx.beginPath();
  ctx.arc(0, -50, 8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#F8D8C0';  // Skin tone
  ctx.beginPath();
  ctx.arc(0, -48, 5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#2389DA';  // Blue uniform
  ctx.beginPath();
  ctx.moveTo(-10, -40);
  ctx.lineTo(10, -40);
  ctx.lineTo(15, -10);
  ctx.lineTo(-15, -10);
  ctx.fill();
  
  ctx.fillStyle = '#555';  // Dark pants
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  ctx.lineTo(10, -10);
  ctx.lineTo(10, 20);
  ctx.lineTo(-10, 20);
  ctx.fill();
  
  // Add walking animation
  const legOffset = Math.sin(progress * 15) * 5;
  ctx.fillRect(-10, 20, 8, 10 + legOffset);
  ctx.fillRect(2, 20, 8, 10 - legOffset);
  
  ctx.restore();
  
  // Draw customer receiving food
  if (progress > 0.7) {
    // Position customer at door
    ctx.save();
    ctx.translate(90, 0);
    
    // Draw customer
    ctx.fillStyle = '#B87333';  // Brown hair
    ctx.beginPath();
    ctx.arc(0, -50, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#F8D8C0';  // Skin tone
    ctx.beginPath();
    ctx.arc(0, -48, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#6B8E23';  // Green clothing
    ctx.beginPath();
    ctx.moveTo(-10, -40);
    ctx.lineTo(10, -40);
    ctx.lineTo(15, -10);
    ctx.lineTo(-15, -10);
    ctx.fill();
    
    // Show food package being handed over
    ctx.fillStyle = '#FF5B35';
    ctx.fillRect(-15, -30, 20, 15);
    
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FOOD', -5, -20);
    
    ctx.restore();
  }
  
  // Add "Thanks!" speech bubble for completed delivery
  if (progress > 0.9) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(110, -70, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Speech bubble pointer
    ctx.beginPath();
    ctx.moveTo(90, -65);
    ctx.lineTo(100, -60);
    ctx.lineTo(100, -70);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Thanks!', 110, -67);
  }
  
  // Restore context
  ctx.restore();
}