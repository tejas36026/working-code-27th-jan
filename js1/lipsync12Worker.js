const DEFAULT_ITERATIONS = 120;
const DEFAULT_SMILE_STRENGTH = 20;

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
            resultImageData = applyLipSmileEffect(imageData, selectedRegions, value);
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

function applyLipSmileEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    const smileStrength = DEFAULT_SMILE_STRENGTH * intensityValue;
    const smileFactor = 0.5 + 0.5 * Math.sin(currentIteration / DEFAULT_ITERATIONS * Math.PI * 2);
    const currentSmileStrength = smileStrength * smileFactor;

    selectedRegions.forEach(region => {
        // Find lip region bounds
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
        
        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            for (let i = 0; i < 4; i++) {
                newImageData.data[baseIndex + i] = 0;
            }
        });
        
        // Apply smile effect: curve the lips upward at the edges
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const pixelIndex = y * width + x;
                
                // Skip if this pixel is not in the lip region
                if (!region.includes(pixelIndex)) continue;
                
                // Calculate horizontal distance from center
                const dx = (x - centerX) / ((maxX - minX) / 2);
                
                // Parabolic curve for smile effect
                const verticalOffset = -currentSmileStrength * dx * dx;
                
                // Calculate new position
                const newY = Math.round(y + verticalOffset);
                
                // Boundary check
                if (newY >= 0 && newY < height) {
                    const sourceIndex = pixelIndex * 4;
                    const targetIndex = (newY * width + x) * 4;
                    
                    // Copy pixel data
                    for (let i = 0; i < 4; i++) {
                        newImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
                    }
                }
            }
        }
    });

    return newImageData;
}