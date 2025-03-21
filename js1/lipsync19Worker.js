
function applyLipWobbleEffect(imageData, selectedRegions, wobbleValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    newImageData.data.set(imageData.data);
    
    // Wobble parameters
    const wobblePhase = wobbleValue * Math.PI * 3;
    const horizontalAmplitude = 6 * Math.sin(wobbleValue * Math.PI * 2);
    const verticalAmplitude = 4 * Math.cos(wobbleValue * Math.PI * 2);
    
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
      
      // Clear original region
      region.forEach(pixelIndex => {
        const baseIndex = pixelIndex * 4;
        newImageData.data[baseIndex] = 0;
        newImageData.data[baseIndex + 1] = 0;
        newImageData.data[baseIndex + 2] = 0;
        newImageData.data[baseIndex + 3] = 0;
      });
      
      // Apply wobble effect (jelly-like motion)
      region.forEach(pixelIndex => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Create wobbling patterns using multiple sine waves with different frequencies
        const normalizedX = (x - minX) / (maxX - minX);
        const normalizedY = (y - minY) / (maxY - minY);
        
        const xOffset = horizontalAmplitude * Math.sin(normalizedY * 3 * Math.PI + wobblePhase);
        const yOffset = verticalAmplitude * Math.sin(normalizedX * 2 * Math.PI + wobblePhase * 1.3);
        
        const newX = x + xOffset;
        const newY = y + yOffset;
        
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
            resultImageData = applyLipWobbleEffect(imageData, selectedRegions, wobbleValue)
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
