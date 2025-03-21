// Worker for replacing selected indices with chocolate

self.onmessage = function(e) {
  try {
    const { imageData, selectedRegions } = e.data;
    
    // Log received data for debugging
    console.log("Worker received:", {
      hasImageData: !!imageData,
      selectedRegionsType: typeof selectedRegions,
      selectedRegionsLength: selectedRegions ? selectedRegions.length : 0,
      selectedRegionsSample: selectedRegions ? selectedRegions.slice(0, 10) : null
    });
    
    // Validate image data
    if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
      throw new Error("Invalid image data");
    }
    
    // Check if we have selected regions
    if (!selectedRegions || !selectedRegions.length) {
      // No regions to process, return original
      self.postMessage({
        segmentedImages: [imageData],
        isComplete: true,
        message: "No selected regions provided"
      }, [imageData.data.buffer]);
      return;
    }
    
    // Process the image
    const processedImage = replaceIndicesWithChocolate(imageData, selectedRegions);
    
    // Send back the processed image
    self.postMessage({
      segmentedImages: [processedImage],
      isComplete: true
    }, [processedImage.data.buffer]);
    
  } catch (error) {
    console.error("Worker error:", error);
    
    // Try to send back original image if available
    if (e.data && e.data.imageData) {
      self.postMessage({
        segmentedImages: [e.data.imageData],
        error: `Error: ${error.message}`,
        isComplete: true
      }, [e.data.imageData.data.buffer]);
    } else {
      self.postMessage({
        error: `Error: ${error.message}`,
        isComplete: true
      });
    }
  }
};

// Replace indices with chocolate
function replaceIndicesWithChocolate(imageData, selectedIndices) {
  const width = imageData.width;
  const height = imageData.height;
  
  // Create a copy of the image data
  const newData = new Uint8ClampedArray(imageData.data);
  const resultImageData = new ImageData(newData, width, height);
  
  // Generate chocolate texture
  const chocolate = createChocolateTexture(width, height);
  const chocolateData = chocolate.data;
  
  // Process each selected index
  for (let i = 0; i < selectedIndices.length; i++) {
    const pixelIndex = selectedIndices[i];
    
    // Convert linear index to x,y coordinates
    // Assuming the indices are pixel positions in the image
    const y = Math.floor(pixelIndex / width);
    const x = pixelIndex % width;
    
    // Check bounds
    if (x >= 0 && x < width && y >= 0 && y < height) {
      // Get the data array index (4 bytes per pixel)
      const dataIndex = (y * width + x) * 4;
      
      // Replace with chocolate color
      newData[dataIndex] = chocolateData[dataIndex];         // R
      newData[dataIndex + 1] = chocolateData[dataIndex + 1]; // G
      newData[dataIndex + 2] = chocolateData[dataIndex + 2]; // B
      // Keep original alpha value
    }
  }
  
  return resultImageData;
}

// Create chocolate texture
function createChocolateTexture(width, height) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Base chocolate color gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgb(80, 45, 25)');    // Dark chocolate
  gradient.addColorStop(0.4, 'rgb(110, 60, 35)');  // Milk chocolate
  gradient.addColorStop(0.7, 'rgb(130, 70, 40)');  // Lighter milk chocolate
  gradient.addColorStop(1, 'rgb(90, 50, 30)');     // Return to darker tone
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add texture for realism
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.2;
  
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 1 + Math.random() * 2;
    
    ctx.fillStyle = `rgba(${20 + Math.random() * 40}, ${10 + Math.random() * 20}, 0, ${0.1 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, size, size);
  }
  
  // Add highlights
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.1;
  
  for (let i = 0; i < 30; i++) {
    const centerX = Math.random() * width;
    const centerY = Math.random() * height;
    const radius = 20 + Math.random() * 80;
    
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    
    const brightness = Math.random() > 0.5 ? 
      `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})` : 
      `rgba(0, 0, 0, ${0.05 + Math.random() * 0.1})`;
    
    gradient.addColorStop(0, brightness);
    gradient.addColorStop(0.5, 'rgba(128, 128, 128, 0.01)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Reset
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  
  // Add chocolate details
  addChocolateDetails(ctx, width, height);
  
  return ctx.getImageData(0, 0, width, height);
}

// Add chocolate details like swirls and patterns
function addChocolateDetails(ctx, width, height) {
  // Add chocolate swirls
  ctx.strokeStyle = 'rgba(160, 100, 60, 0.3)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  for (let i = 0; i < 10; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Create a swirl pattern
    const radius = 10 + Math.random() * 40;
    const turns = 1 + Math.random() * 2;
    const points = 20;
    
    for (let j = 0; j <= points; j++) {
      const angle = (j / points) * Math.PI * 2 * turns;
      const distance = (j / points) * radius;
      
      const x = startX + Math.cos(angle) * distance;
      const y = startY + Math.sin(angle) * distance;
      
      ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }
  
  // Add some chocolate chunks
  ctx.fillStyle = 'rgba(90, 55, 30, 0.5)';
  
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 3 + Math.random() * 8;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight to chunk
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(x - size/3, y - size/3, size/3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(90, 55, 30, 0.5)';
  }
  
  // Add edge shine/highlight
  const gradient = ctx.createLinearGradient(0, 0, width, height/4);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height/3);
}