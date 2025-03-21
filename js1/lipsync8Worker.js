const DEFAULT_ITERATIONS = 120;
const DEFAULT_VOLUME_STRENGTH = 3;

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
            resultImageData = applyLipVolumeEffect(imageData, selectedRegions, value);
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

function applyLipVolumeEffect(imageData, selectedRegions, intensityValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    const volumeStrength = DEFAULT_VOLUME_STRENGTH * intensityValue;

    selectedRegions.forEach(region => {
        // Find lip region center
        let sumX = 0, sumY = 0;
        let minX = width, maxX = 0, minY = height, maxY = 0;
        
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            sumX += x;
            sumY += y;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        const centerX = sumX / region.length;
        const centerY = sumY / region.length;
        
        // Clear original lip region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            for (let i = 0; i < 4; i++) {
                newImageData.data[baseIndex + i] = 0;
            }
        });
        
        // Create a temporary image for the expanded lips
        const tempImageData = createTransparentImageData(width, height);
        
        // Apply volume effect by expanding from center
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const pixelIndex = y * width + x;
                
                // Skip if this pixel is not in the lip region
                if (!region.includes(pixelIndex)) continue;
                
                // Calculate vector from center
                const dx = x - centerX;
                const dy = y - centerY;
                
                // Calculate distance from center (normalized)
                const distance = Math.sqrt(dx*dx + dy*dy);
                const maxDistance = Math.sqrt(
                    Math.pow(Math.max(Math.abs(maxX - centerX), Math.abs(minX - centerX)), 2) +
                    Math.pow(Math.max(Math.abs(maxY - centerY), Math.abs(minY - centerY)), 2)
                );
                
                const normalizedDistance = distance / maxDistance;
                
                // Calculate expansion factor (more expansion at the center)
                const expansionFactor = 1 + volumeStrength * (1 - normalizedDistance);
                
                // Calculate new position
                const newX = Math.round(centerX + dx * expansionFactor);
                const newY = Math.round(centerY + dy * expansionFactor);
                
                // Boundary check
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const sourceIndex = pixelIndex * 4;
                    const targetIndex = (newY * width + newX) * 4;
                    
                    // Copy pixel data
                    for (let i = 0; i < 4; i++) {
                        tempImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
                    }
                }
            }
        }
        
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