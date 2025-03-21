// particleWorker.js

let confetti = [];
let sequins = [];
let canvasWidth = 0;
let canvasHeight = 0;

// Animation constants
const confettiCount = 150; // Number of confetti particles
const sequinCount = 80; // Number of sequin particles
const gravityConfetti = 0.25; // Gravity for confetti
const gravitySequins = 0.45; // Gravity for sequins
const dragConfetti = 0.05; // Drag for confetti
const dragSequins = 0.02; // Drag for sequins
const terminalVelocity = 3; // Maximum falling speed

// Holi colors - vibrant gulal powder colors
const colors = [
  { front: '#FF1744', back: '#D50000' }, // Red
  { front: '#FFEA00', back: '#FFD600' }, // Yellow
  { front: '#00E676', back: '#00C853' }, // Green
  { front: '#2979FF', back: '#2962FF' }, // Blue
  { front: '#D500F9', back: '#AA00FF' }, // Purple
  { front: '#FF9100', back: '#FF6D00' }, // Orange
  { front: '#F06292', back: '#EC407A' }, // Pink (gulabi)
  { front: '#18FFFF', back: '#00E5FF' }, // Cyan
];

// Helper function for random numbers
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Initial velocity for powder particles
function initConfettoVelocity(xRange, yRange) {
  const x = randomRange(xRange[0], xRange[1]);
  const range = yRange[1] - yRange[0] + 1;
  let y = yRange[1] - Math.abs(randomRange(0, range) + randomRange(0, range) - range);
  if (y >= yRange[1] - 1) {
    y += Math.random() < 0.25 ? randomRange(1, 3) : 0;
  }
  return { x: x, y: -y };
}

// Confetto constructor - represents larger powder particles
function Confetto() {
  this.randomModifier = randomRange(0, 99);
  this.color = colors[Math.floor(randomRange(0, colors.length))];

  // More varied shapes for powder look
  this.isCircular = Math.random() < 0.7;

  if (this.isCircular) {
    this.dimensions = {
      x: randomRange(5, 9),
      y: randomRange(5, 9),
    };
  } else {
    this.dimensions = {
      x: randomRange(4, 10),
      y: randomRange(3, 8),
    };
  }

  // Enhanced texture properties
  this.noiseLevel = randomRange(0.2, 0.9);
  this.initialOpacity = randomRange(0.7, 1.0);
  this.opacity = this.initialOpacity;
  this.matteFactor = randomRange(0.5, 0.9);

  // Position and movement
  this.position = {
    x: randomRange(canvasWidth / 2 - 100, canvasWidth / 2 + 100),
    y: randomRange(canvasHeight / 2 + 50, canvasHeight / 2 + 150),
  };
  this.rotation = randomRange(0, 2 * Math.PI);
  this.scale = { x: 1, y: 1 };
  this.velocity = initConfettoVelocity([-12, 12], [10, 16]); // Enhanced velocity
}

// Update confetto physics
Confetto.prototype.update = function () {
  // Apply forces with randomness for natural dispersion
  this.velocity.x -= this.velocity.x * dragConfetti;
  this.velocity.y = Math.min(this.velocity.y + gravityConfetti, terminalVelocity);

  // Add unpredictable movement
  if (Math.random() > 0.9) {
    this.velocity.x += (Math.random() > 0.5 ? 0.3 : -0.3) * randomRange(0.5, 1.5);
  }

  // Update position
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;

  // Adjust scale for 3D effect
  this.scale.y = Math.max(0.1, Math.cos((this.position.y + this.randomModifier) * 0.09) * this.matteFactor);

  // Decrease opacity for fade effect
  this.opacity = Math.max(0, this.opacity - 0.006 * randomRange(0.95, 1.05));

  // Air resistance
  if (Math.abs(this.velocity.x) > 0.1) {
    this.velocity.x *= 0.99;
  }
};

// Sequin constructor - represents tiny powder particles
function Sequin() {
  this.color = colors[Math.floor(randomRange(0, colors.length))].front;
  this.radius = randomRange(1, 3);
  this.position = {
    x: randomRange(canvasWidth / 2 - 100, canvasWidth / 2 + 100),
    y: randomRange(canvasHeight / 2 + 50, canvasHeight / 2 + 150),
  };
  this.velocity = {
    x: randomRange(-8, 8),
    y: randomRange(-10, -14),
  };
  this.opacity = randomRange(0.8, 1.0);
  this.grainFactor = randomRange(0.85, 0.95);
}

// Update sequin physics
Sequin.prototype.update = function () {
  // Apply forces with randomness
  this.velocity.x -= this.velocity.x * dragSequins;
  this.velocity.y = this.velocity.y + gravitySequins;

  // Random movement
  if (Math.random() > 0.9) {
    this.velocity.x += Math.random() > 0.5 ? 0.2 : -0.2;
  }

  // Update position
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;

  // Fade effect
  this.opacity = Math.max(0, this.opacity - 0.01 * this.grainFactor);
};

// Initialize particles
function initBurst() {
  for (let i = 0; i < confettiCount; i++) {
    confetti.push(new Confetto());
  }
  for (let i = 0; i < sequinCount; i++) {
    sequins.push(new Sequin());
  }
}

// Listen for messages from the main thread
self.onmessage = function (e) {
  const { action, width, height } = e.data;

  if (action === 'start') {
    // Initialize canvas dimensions
    canvasWidth = width;
    canvasHeight = height;

    // Initialize particles
    initBurst();

    // Start the animation loop
    function animate() {
      // Update confetti and sequins
      confetti.forEach((confetto) => confetto.update());
      sequins.forEach((sequin) => sequin.update());

      // Filter out particles that are out of bounds or fully faded
      confetti = confetti.filter((c) => c.position.y < canvasHeight && c.opacity > 0.1);
      sequins = sequins.filter((s) => s.position.y < canvasHeight && s.opacity > 0.1);

      // Send updated particles to the main thread
      self.postMessage({ confetti, sequins });

      // Continue the animation loop
      requestAnimationFrame(animate);
    }

    animate();
  } else if (action === 'resize') {
    // Update canvas dimensions
    canvasWidth = width;
    canvasHeight = height;
  }
};