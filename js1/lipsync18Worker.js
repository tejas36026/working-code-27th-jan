
function applyLipSnarlEffect(imageData, selectedRegions, snarlValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    newImageData.data.set(imageData.data);
    
    // Snarl parameters
    const snarlPhase = snarlValue * Math.PI * 2;
    const snarlAmount = 12 * Math.sin(snarlPhase);
    
    selectedRegions.forEach(region => {
      // Find region bounds
      let minX = width, maxX = 0, minY = height, maxY = 0;
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Clear original region
      region.forEach(pixelIndex => {
        const baseIndex = pixelIndex * 4;
        newImageData.data[baseIndex] = 0;
        newImageData.data[baseIndex + 1] = 0;
        newImageData.data[baseIndex + 2] = 0;
        newImageData.data[baseIndex + 3] = 0;
      });
      
      // Apply snarl effect (raise one side of the upper lip)
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Calculate if this is the right side and top half
        const isRightSide = x > centerX;
        const isTopHalf = y < centerY;
        
        let verticalOffset = 0;
        
        if (isRightSide && isTopHalf) {
          // Calculate how far to the right
          const normalizedX = (x - centerX) / (maxX - centerX);
          // And how far to the top
          const normalizedY = (centerY - y) / (centerY - minY);
          
          // Create a snarl that's stronger at the right edge and top
          verticalOffset = -snarlAmount * normalizedX * normalizedY;
        }
        
        const newX = x;
        const newY = y + verticalOffset;
        
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
            resultImageData = applyLipSnarlEffect(imageData, selectedRegions, snarlValue) 
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
