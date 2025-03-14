const DEFAULT_ITERATIONS = 120;
const DEFAULT_GRADIENT_STRENGTH = 0.6;

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
            resultImageData = applyLipGradientEffect(imageData, selectedRegions, value);
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

function applyLipGradientEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const gradientStrength = DEFAULT_GRADIENT_STRENGTH * intensityValue;
    const phase = currentIteration / DEFAULT_ITERATIONS * Math.PI * 2;

    // Define gradient colors (starting and ending colors)
    const startColor = [255, 100, 100]; // Light pink
    const endColor = [180, 30, 60];     // Dark red

    selectedRegions.forEach(region => {
        // Find lip region bounds
        let minY = height, maxY = 0;
        
        region.forEach(pixelIndex => {
            const y = Math.floor(pixelIndex / width);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        const lipHeight = maxY - minY;
        
        region.forEach(pixelIndex => {
            const y = Math.floor(pixelIndex / width);
            const baseIndex = pixelIndex * 4;
            
            // Calculate gradient factor based on vertical position
            const gradientFactor = (y - minY) / lipHeight;
            
            // Add oscillation to gradient for animation
            const animatedFactor = (gradientFactor + 0.2 * Math.sin(phase)) % 1.0;
            
            // Calculate gradient color
            const r = startColor[0] * (1 - animatedFactor) + endColor[0] * animatedFactor;
            const g = startColor[1] * (1 - animatedFactor) + endColor[1] * animatedFactor;
            const b = startColor[2] * (1 - animatedFactor) + endColor[2] * animatedFactor;
            
            // Blend original color with gradient color
            newImageData.data[baseIndex] = 
                newImageData.data[baseIndex] * (1 - gradientStrength) + r * gradientStrength;
            newImageData.data[baseIndex + 1] = 
                newImageData.data[baseIndex + 1] * (1 - gradientStrength) + g * gradientStrength;
            newImageData.data[baseIndex + 2] = 
                newImageData.data[baseIndex + 2] * (1 - gradientStrength) + b * gradientStrength;
        });
    });

    return newImageData;
}