const DEFAULT_ITERATIONS = 120;
const DEFAULT_MORPH_STRENGTH = 0.7;

let currentIteration = 0;
let previousImageData = null;

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
            previousImageData = null;
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyLipMorphEffect(imageData, selectedRegions, value);
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

function applyLipMorphEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    // Store first frame for morphing if not already stored
    if (!previousImageData) {
        previousImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            width,
            height
        );
        return newImageData;
    }
    
    const morphStrength = DEFAULT_MORPH_STRENGTH * intensityValue;
    const morphFactor = 0.5 + 0.5 * Math.sin(currentIteration / DEFAULT_ITERATIONS * Math.PI * 2);
    
    selectedRegions.forEach(region => {
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            
            // Morph between original and modified shapes
            for (let i = 0; i < 4; i++) {
                const currentValue = imageData.data[baseIndex + i];
                const previousValue = previousImageData.data[baseIndex + i];
                
                newImageData.data[baseIndex + i] = 
                    currentValue * (1 - morphFactor * morphStrength) + 
                    previousValue * (morphFactor * morphStrength);
            }
        });
        
        // Create random perturbations for next frame
        if (currentIteration % 20 === 0) {
            region.forEach(pixelIndex => {
                const baseIndex = pixelIndex * 4;
                
                // Store current state with small random variations
                for (let i = 0; i < 3; i++) {
                    const randomOffset = (Math.random() - 0.5) * 30 * morphStrength;
                    previousImageData.data[baseIndex + i] = 
                        Math.min(255, Math.max(0, imageData.data[baseIndex + i] + randomOffset));
                }
                previousImageData.data[baseIndex + 3] = imageData.data[baseIndex + 3];
            });
        }
    });

    return newImageData;
}