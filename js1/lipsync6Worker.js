const DEFAULT_ITERATIONS = 120;
const DEFAULT_GLOSS_INTENSITY = 0.8;

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
            resultImageData = applyLipGlossyEffect(imageData, selectedRegions, value);
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

function applyLipGlossyEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const glossIntensity = DEFAULT_GLOSS_INTENSITY * intensityValue;
    const phase = currentIteration / DEFAULT_ITERATIONS * Math.PI * 2;

    selectedRegions.forEach(region => {
        // Find lip region center and bounds
        let sumX = 0, sumY = 0;
        let minY = height, maxY = 0;
        
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            sumX += x;
            sumY += y;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        const centerX = sumX / region.length;
        const centerY = sumY / region.length;
        const lipHeight = maxY - minY;
        
        // Apply gloss highlight based on position
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            const baseIndex = pixelIndex * 4;
            
            // Create highlight near the bottom of upper lip or top of lower lip
            // Simplified model: if y is close to center, apply highlight
            const distanceFromCenter = Math.abs(y - centerY) / (lipHeight / 2);
            const highlightFactor = Math.max(0, 1 - distanceFromCenter * 2);
            
            // Add moving highlight
            const movingHighlight = highlightFactor * Math.max(0, 
                Math.sin((x - centerX) / 20 + phase) * 0.5 + 0.5);
            
            const glossFactor = Math.min(1, movingHighlight * glossIntensity);
            
            // Apply gloss by brightening the pixel
            for (let i = 0; i < 3; i++) {
                newImageData.data[baseIndex + i] = Math.min(255, 
                    newImageData.data[baseIndex + i] + (255 - newImageData.data[baseIndex + i]) * glossFactor);
            }
        });
    });

    return newImageData;
}