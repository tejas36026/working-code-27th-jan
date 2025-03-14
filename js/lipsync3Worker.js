const DEFAULT_ITERATIONS = 120;
const DEFAULT_PULSE_STRENGTH = 0.2;

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
            resultImageData = applyLipPulsatingEffect(imageData, selectedRegions, value);
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

function applyLipPulsatingEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        width,
        height
    );
    
    // Calculate pulsating factor based on current iteration
    const pulseStrength = DEFAULT_PULSE_STRENGTH * intensityValue;
    const pulseFactor = 1 + pulseStrength * Math.sin(currentIteration / DEFAULT_ITERATIONS * Math.PI * 4);

    selectedRegions.forEach(region => {
        // Find lip region center
        let sumX = 0, sumY = 0;
        region.forEach(pixelIndex => {
            sumX += pixelIndex % width;
            sumY += Math.floor(pixelIndex / width);
        });
        
        const centerX = sumX / region.length;
        const centerY = sumY / region.length;

        // Create new image with pulsating effect
        const tempImageData = createTransparentImageData(width, height);
        
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            // Calculate distance from center and new position
            const dx = x - centerX;
            const dy = y - centerY;
            
            // Scale position from center based on pulse factor
            const newX = Math.round(centerX + dx * pulseFactor);
            const newY = Math.round(centerY + dy * pulseFactor);
            
            // Boundary check
            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                const sourceIndex = pixelIndex * 4;
                const targetIndex = (newY * width + newX) * 4;
                
                // Copy pixel data
                for (let i = 0; i < 4; i++) {
                    tempImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
                }
            }
        });
        
        // Copy processed lip region back to result image
        for (let i = 0; i < width * height * 4; i += 4) {
            if (tempImageData.data[i + 3] > 0) {
                for (let j = 0; j < 4; j++) {
                    newImageData.data[i + j] = tempImageData.data[i + j];
                }
            }
        }
    });

    return newImageData;
}