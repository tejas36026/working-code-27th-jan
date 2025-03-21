const DEFAULT_ITERATIONS = 120;
const DEFAULT_SMOOTH_STRENGTH = 0.7;

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
            resultImageData = applyLipSmoothEffect(imageData, selectedRegions, value);
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

function applyLipSmoothEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const smoothStrength = DEFAULT_SMOOTH_STRENGTH * intensityValue;
    
    const gaussianBlur = (pixelIndex, channel) => {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        let sum = 0;
        let weightSum = 0;
        
        // Apply 3x3 gaussian blur
        for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
                const nx = x + kx;
                const ny = y + ky;
                
                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                
                const neighborIndex = (ny * width + nx) * 4;
                
                // Gaussian weight (approximate)
                const weight = (kx === 0 && ky === 0) ? 4 : 
                               ((kx === 0 || ky === 0) ? 2 : 1);
                
                sum += imageData.data[neighborIndex + channel] * weight;
                weightSum += weight;
            }
        }
        
        return sum / weightSum;
    };

    selectedRegions.forEach(region => {
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            
            // Apply smoothing to each channel
            for (let i = 0; i < 3; i++) {
                const originalValue = imageData.data[baseIndex + i];
                const blurredValue = gaussianBlur(pixelIndex, i);
                
                // Blend between original and smoothed based on strength
                newImageData.data[baseIndex + i] = 
                    originalValue * (1 - smoothStrength) + blurredValue * smoothStrength;
            }
        });
    });

    return newImageData;
}