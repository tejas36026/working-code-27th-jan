
function applySquashStretchEffect(imageData, selectedRegions, cycleValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    newImageData.data.set(imageData.data);
    
    // Squash and stretch parameters
    const cyclePhase = cycleValue * Math.PI * 2;
    const stretchFactor = Math.sin(cyclePhase);
    
    // Calculate horizontal and vertical scale factors (preserve area)
    const horizontalScale = 1 + 0.3 * stretchFactor;
    const verticalScale = 1 / horizontalScale; // Preserve area
    
    selectedRegions.forEach(region => {
      // Find region center
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
      
      // Clear original region
      region.forEach(pixelIndex => {
        const baseIndex = pixelIndex * 4;
        newImageData.data[baseIndex] = 0;
        newImageData.data[baseIndex + 1] = 0;
        newImageData.data[baseIndex + 2] = 0;
        newImageData.data[baseIndex + 3] = 0;
      });
      
      // Apply squash and stretch effect
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Calculate position relative to center
        const relX = x - centerX;
        const relY = y - centerY;
        
        // Apply scaling
        const newX = centerX + relX * horizontalScale;
        const newY = centerY + relY * verticalScale;
        
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
            resultImageData = applySquashStretchEffect(imageData, selectedRegions, value) 
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
