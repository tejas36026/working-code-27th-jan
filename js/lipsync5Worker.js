const DEFAULT_ITERATIONS = 120;
const DEFAULT_CONTOUR_STRENGTH = 2.0;

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
            resultImageData = applyLipContourEffect(imageData, selectedRegions, value);
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

function applyLipContourEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const contourStrength = DEFAULT_CONTOUR_STRENGTH * intensityValue;

    selectedRegions.forEach(region => {
        // Create a map of lip pixels for quick lookup
        const lipPixels = new Set(region);
        
        // Find border pixels
        const borderPixels = new Set();
        
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            // Check 8 neighbors
            for (let ny = y - 1; ny <= y + 1; ny++) {
                for (let nx = x - 1; nx <= x + 1; nx++) {
                    if (nx === x && ny === y) continue;
                    
                    const neighborIndex = ny * width + nx;
                    if (!lipPixels.has(neighborIndex) && 
                        nx >= 0 && nx < width && 
                        ny >= 0 && ny < height) {
                        borderPixels.add(pixelIndex);
                        break;
                    }
                }
                if (borderPixels.has(pixelIndex)) break;
            }
        });
        
        // Enhance lip border
        borderPixels.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            
            // Darken the contour
            for (let i = 0; i < 3; i++) {
                newImageData.data[baseIndex + i] = Math.max(0, 
                    newImageData.data[baseIndex + i] / contourStrength);
            }
        });
    });

    return newImageData;
}