const DEFAULT_ITERATIONS = 120;
const DEFAULT_SHIMMER_INTENSITY = 40;

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
            resultImageData = applyLipShimmerEffect(imageData, selectedRegions, value);
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

function applyLipShimmerEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const shimmerIntensity = DEFAULT_SHIMMER_INTENSITY * intensityValue;
    const phase = currentIteration / DEFAULT_ITERATIONS * Math.PI * 2;

    selectedRegions.forEach(region => {
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            const baseIndex = pixelIndex * 4;
            
            // Create wave-like shimmer pattern
            const shimmerValue = Math.sin((x / 10) + (y / 10) + phase) * shimmerIntensity;
            
            // Apply shimmer to RGB channels
            for (let i = 0; i < 3; i++) {
                newImageData.data[baseIndex + i] = Math.min(255, 
                    Math.max(0, newImageData.data[baseIndex + i] + shimmerValue));
            }
        });
    });

    return newImageData;
}