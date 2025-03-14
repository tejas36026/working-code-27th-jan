
function applyPuckerReleaseEffect(imageData, selectedRegions, cycleValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    newImageData.data.set(imageData.data);
    
    // Pucker-release parameters
    const cyclePhase = cycleValue * Math.PI * 2;
    const puckerFactor = 0.5 + 0.5 * Math.sin(cyclePhase); // 0.5 to 1.0 and back
    
    selectedRegions.forEach(region => {
      // Find region bounds and center
      let sumX = 0, sumY = 0, minX = width, maxX = 0, minY = height, maxY = 0;
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
      
      const centerX = sumX / region.length;
      const centerY = sumY / region.length;
      const regionRadius = Math.max(maxX - minX, maxY - minY) / 2;
      
      // Clear original region
      region.forEach(pixelIndex => {
        const baseIndex = pixelIndex * 4;
        newImageData.data[baseIndex] = 0;
        newImageData.data[baseIndex + 1] = 0;
        newImageData.data[baseIndex + 2] = 0;
        newImageData.data[baseIndex + 3] = 0;
      });
      
      // Apply pucker-release effect
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Calculate vector from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // Calculate new position with pucker effect
        // Closer to the center = less movement, edges move more
        const moveFactor = distance / regionRadius;
        const scaledMoveFactor = moveFactor * (1 - puckerFactor);
        
        const newX = centerX + dx * scaledMoveFactor;
        const newY = centerY + dy * scaledMoveFactor;
        
        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
          const targetIndex = (Math.floor(newY) * width + Math.floor(newX)) * 4;
          const sourceIndex = pixelIndex * 4;
          
          for (let i = 0; i < 4; i++) {
            newImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
          }
        }
      });
    });
    
    return newImageData;
  }

  
const DEFAULT_DANCE_CYCLE = 1;
const DEFAULT_LEG_AMPLITUDE = 15;
const DEFAULT_ITERATIONS = 120;


let currentIteration = 0;


function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}


self.onmessage = function(e) {
    const { 
        imageData, 
        selectedRegions, 
        value,
        value5: iterations = DEFAULT_ITERATIONS,
        reset 
    } = e.data;

    try {
        if (reset) {
            currentIteration = 0;
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyPuckerReleaseEffect(imageData, selectedRegions, cycleValue)
            currentIteration = (currentIteration + 1) % iterations;
            progress = currentIteration / iterations;
        } else {
            resultImageData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
            progress = 1;
        }

        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
            error: error.message,
            isComplete: true
        });
    }
};
