// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const FRAME_RATE = 60;

// Animation constants
const SCOOTER_SPEED = 3;
const ROAD_SPEED = 2;
const WHEEL_ROTATION_SPEED = 0.15;
const DELIVERY_TIME = 3000; // ms until delivery animation completes

// Animation state
let animationStartTime = Date.now();
let isAnimating = true;
let canvas, ctx;

// Scooter position and physics
let scooter = {
  x: -200,            // Start off-screen
  y: CANVAS_HEIGHT - 150,
  targetX: CANVAS_WIDTH + 200,  // End position (off-screen right)
  wheelRotation: 0,
  bounceOffset: 0,
  isDelivering: false,
  deliveryStartTime: 0,
  deliveryProgress: 0
};

// Handle messages from the main thread
self.onmessage = function(e) {
  const { imageData, selectedRegions, value, value5: iterations, reset, action } = e.data;
  
  try {
    if (reset) {
      resetAnimation();
    }
    
    // Handle special actions
    if (action === 'deliver_food') {
      startDelivery();
    }
    
    // Initialize canvas if needed
    if (!canvas) {
      initializeCanvas(imageData.width, imageData.height);
    }
    
    // Create a frame of animation
    const resultImageData = createAnimationFrame(imageData);
    
    // Send frame back to main thread
    self.postMessage({
      segmentedImages: [resultImageData],
      isComplete: true,
      iteration: 0,
      progress: 1
    }, [resultImageData.data.buffer]);
    
    // Continue animation loop
    if (isAnimating) {
      setTimeout(updateAnimation, 1000 / FRAME_RATE);
    }
    
  } catch (error) {
    self.postMessage({ error: error.message, isComplete: true });
  }
};

// Initialize the canvas using OffscreenCanvas
function initializeCanvas(width, height) {
  canvas = new OffscreenCanvas(width, height);
  ctx = canvas.getContext('2d');
}

// Reset animation state
function resetAnimation() {
  animationStartTime = Date.now();
  resetScooter();
}

// Start a delivery sequence
function startDelivery() {
  if (!scooter.isDelivering) {
    scooter.isDelivering = true;
    scooter.deliveryStartTime = Date.now();
  }
}

// Update animation state and request a new frame
function updateAnimation() {
  // We don't directly render here - main thread will request frames
  // Just update the animation state
  const currentTime = Date.now();
  updateScooterPhysics(currentTime);
  
  // Check if scooter has moved off screen to reset animation
  if (scooter.x > scooter.targetX) {
    resetScooter();
  }
}

// Create a single frame of animation
function createAnimationFrame(sourceImageData) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Calculate time-based animations
  const currentTime = Date.now();
  const elapsedTime = currentTime - animationStartTime;
  
  // Draw background
  drawBackground(ctx);
  
  // Draw scene elements
  drawRoad(ctx, elapsedTime);
  drawBuildings(ctx);
  drawScooter(ctx);
  
  // Handle delivery animation
  if (scooter.isDelivering) {
    const deliveryElapsed = currentTime - scooter.deliveryStartTime;
    scooter.deliveryProgress = Math.min(1.0, deliveryElapsed / DELIVERY_TIME);
    
    if (scooter.deliveryProgress >= 1.0) {
      // Delivery complete, continue journey
      scooter.isDelivering = false;
    } else {
      drawDeliveryAnimation(ctx, scooter.deliveryProgress);
    }
  }
  
  // Create ImageData from canvas
  const resultImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Blend with source image if desired (for now just return the animation)
  return resultImageData;
}

// Update scooter physics
function updateScooterPhysics(currentTime) {
  if (scooter.isDelivering) {
    // Stay still during delivery
    scooter.bounceOffset = Math.sin(currentTime * 0.01) * 2; // Subtle idle bounce
  } else {
    // Move scooter across the screen
    scooter.x += SCOOTER_SPEED;
    
    // Add a slight bounce to make movement more lively
    scooter.bounceOffset = Math.sin(currentTime * 0.01) * 3;
    
    // Rotate wheels
    scooter.wheelRotation += WHEEL_ROTATION_SPEED;
    
    // Check if scooter is in delivery position (around center of screen)
    if (!scooter.isDelivering && scooter.x > CANVAS_WIDTH * 0.4 && scooter.x < CANVAS_WIDTH * 0.45) {
      scooter.isDelivering = true;
      scooter.deliveryStartTime = currentTime;
    }
  }
}

// Reset scooter to starting position
function resetScooter() {
  scooter.x = -200;
  scooter.isDelivering = false;
  scooter.deliveryProgress = 0;
}

// Draw the background with a nice gradient sky
function drawBackground(ctx) {
  // Create sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.7);
  skyGradient.addColorStop(0, '#87CEEB');  // Light blue sky
  skyGradient.addColorStop(1, '#E0F7FF');  // Lighter blue near horizon
  
  // Fill sky
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw ground
  ctx.fillStyle = '#FAD98C';  // Sandy/yellowish background
  ctx.fillRect(0, CANVAS_HEIGHT * 0.7, CANVAS_WIDTH, CANVAS_HEIGHT * 0.3);
}

// Draw a scrolling road
function drawRoad(ctx, elapsedTime) {
  // Road parameters
  const roadY = CANVAS_HEIGHT * 0.75;
  const roadHeight = 40;
  
  // Draw road base
  ctx.fillStyle = '#505050';
  ctx.fillRect(0, roadY, CANVAS_WIDTH, roadHeight);
  
  // Draw road markings that move
  ctx.fillStyle = 'white';
  
  // Calculate offset for moving dashed lines
  const lineOffset = (elapsedTime * ROAD_SPEED / 50) % 80;
  
  // Draw dashed lines
  for (let x = -lineOffset; x < CANVAS_WIDTH; x += 80) {
    ctx.fillRect(x, roadY + roadHeight/2 - 2, 40, 4);
  }
}

// Draw stylized buildings in the background
function drawBuildings(ctx) {
  // Building parameters
  const buildingCount = 5;
  const horizon = CANVAS_HEIGHT * 0.7;
  const minHeight = 80;
  const maxHeight = 180;
  
  // Draw several buildings
  for (let i = 0; i < buildingCount; i++) {
    const x = i * (CANVAS_WIDTH / buildingCount);
    const width = CANVAS_WIDTH / buildingCount - 10;
    const height = minHeight + Math.sin(i * 1.5) * (maxHeight - minHeight);
    
    // Building color
    ctx.fillStyle = i % 2 === 0 ? '#E8D0AA' : '#D9BF8F';
    
    // Draw main building shape
    ctx.fillRect(x, horizon - height, width, height);
    
    // Draw windows
    ctx.fillStyle = '#FFDB99';
    
    const windowSize = 10;
    const windowGap = 18;
    
    for (let wx = x + 15; wx < x + width - 15; wx += windowGap) {
      for (let wy = horizon - height + 20; wy < horizon - 20; wy += windowGap) {
        ctx.fillRect(wx, wy, windowSize, windowSize);
      }
    }
  }
}

// Draw the delivery person on a scooter
function drawScooter(ctx) {
  // Save context for transformations
  ctx.save();
  
  // Position at scooter location with bounce effect
  ctx.translate(scooter.x, scooter.y + scooter.bounceOffset);
  
  // Draw rear wheel
  ctx.save();
  ctx.translate(-30, 40);
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
  ctx.translate(30, 40);
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
  ctx.fillStyle = '#FFD237';  // Yellow scooter like in the reference
  ctx.beginPath();
  ctx.moveTo(-35, 30);
  ctx.lineTo(35, 30);
  ctx.lineTo(40, 10);
  ctx.lineTo(25, 0);
  ctx.lineTo(-15, 0);
  ctx.lineTo(-35, 30);
  ctx.fill();
  
  // Draw handlebars
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, 5);
  ctx.lineTo(40, -10);
  ctx.stroke();
  
  // Draw delivery box
  ctx.fillStyle = '#FF5B35';  // Orange delivery box like in the image
  ctx.fillRect(-20, -40, 40, 35);
  
  // Draw box details
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('FOOD', 0, -20);
  ctx.fillText('DELIVERY', 0, -8);
  
  // Draw delivery person
  drawDeliveryPerson(ctx);
  
  // Restore context
  ctx.restore();
}

// Draw the delivery person
function drawDeliveryPerson(ctx) {
  // Draw helmet
  ctx.fillStyle = '#FF5B35';  // Orange helmet matching delivery box
  ctx.beginPath();
  ctx.ellipse(5, -55, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw face
  ctx.fillStyle = '#F8D8C0';  // Skin tone
  ctx.beginPath();
  ctx.arc(8, -53, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw body
  ctx.fillStyle = '#2389DA';  // Blue shirt/jacket
  ctx.beginPath();
  ctx.moveTo(-5, -45);
  ctx.lineTo(20, -45);
  ctx.lineTo(15, -10);
  ctx.lineTo(-5, -10);
  ctx.fill();
  
  // Draw arms
  ctx.strokeStyle = '#2389DA';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(15, -40);
  ctx.lineTo(30, -20);
  ctx.stroke();
  
  // Draw legs
  ctx.fillStyle = '#555';  // Dark pants
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(15, -10);
  ctx.lineTo(25, 30);
  ctx.lineTo(15, 30);
  ctx.lineTo(0, -10);
  ctx.fill();
}

// Draw delivery animation
function drawDeliveryAnimation(ctx, progress) {
  // Save context
  ctx.save();
  
  // Position at delivery location (slightly in front of scooter)
  ctx.translate(scooter.x + 100, scooter.y - 40);
  
  // Draw building entrance or door
  ctx.fillStyle = '#A67D5D';
  ctx.fillRect(-20, -60, 40, 100);
  
  // Draw door details
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(-15, -55, 30, 90);
  
  // Draw delivery person walking to door
  const walkPosition = progress * 50;
  
  ctx.save();
  ctx.translate(-80 + walkPosition, 0);
  
  // Draw food package in hands
  if (progress < 0.7) {
    ctx.fillStyle = '#FF5B35';
    ctx.fillRect(-10, -30, 20, 15);
    
    ctx.fillStyle = 'white';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('FOOD', 0, -20);
  }
  
  // Draw person
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
  const legOffset = Math.sin(progress * 10) * 5;
  ctx.fillRect(-10, 20, 8, 10 + legOffset);
  ctx.fillRect(2, 20, 8, 10 - legOffset);
  
  ctx.restore();
  
  // Draw customer receiving food
  if (progress > 0.7) {
    // Position customer at door
    ctx.save();
    ctx.translate(0, 0);
    
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
    ctx.ellipse(20, -70, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Speech bubble pointer
    ctx.beginPath();
    ctx.moveTo(0, -65);
    ctx.lineTo(10, -60);
    ctx.lineTo(10, -70);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Thanks!', 25, -67);
  }
  
  // Restore context
  ctx.restore();
}

// Start by sending an initial frame
updateAnimation();