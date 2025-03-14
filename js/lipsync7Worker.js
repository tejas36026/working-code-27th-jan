const DEFAULT_ITERATIONS = 120;
const DEFAULT_TEXTURE_STRENGTH = 0.5;

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
            resultImageData = applyLipTextureEffect(imageData, selectedRegions, value);
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

function applyLipTextureEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    const textureStrength = DEFAULT_TEXTURE_STRENGTH * intensityValue;

    // Simple Perlin-like noise function
    const noise = (x, y) => {
        return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    };

    selectedRegions.forEach(region => {
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            const baseIndex = pixelIndex * 4;
            
            // Generate texture noise value
            const noiseValue = (noise(x, y) - 0.5) * textureStrength * 50;
            
            // Apply texture to lip pixels
            for (let i = 0; i < 3; i++) {
                newImageData.data[baseIndex + i] = Math.min(255, 
                    Math.max(0, newImageData.data[baseIndex + i] + noiseValue));
            }
        });
    });

    return newImageData;
}