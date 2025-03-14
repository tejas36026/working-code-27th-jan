const DEFAULT_ITERATIONS = 120;
const DEFAULT_COLOR_INTENSITY = 1.5;

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
            resultImageData = applyLipColorEnhancement(imageData, selectedRegions, value);
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

function applyLipColorEnhancement(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const colorIntensity = DEFAULT_COLOR_INTENSITY * intensityValue;

    selectedRegions.forEach(region => {
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            
            // Enhance red channel for lips
            newImageData.data[baseIndex] = Math.min(255, newImageData.data[baseIndex] * colorIntensity);
            
            // Slightly reduce other channels for more vibrant red
            newImageData.data[baseIndex + 1] = newImageData.data[baseIndex + 1] * 0.9;
            newImageData.data[baseIndex + 2] = newImageData.data[baseIndex + 2] * 0.9;
        });
    });

    return newImageData;
}