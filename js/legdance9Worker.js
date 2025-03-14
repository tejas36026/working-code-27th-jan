const DEFAULT_ITERATIONS = 120;
const DEFAULT_SQUASH_FACTOR = 0.3;

let currentIteration = 0;

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

function applySquashStretchEffect(imageData, selectedRegions, animValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    // Squash and stretch parameters
    const squashFactor = DEFAULT_SQUASH_FACTOR;
    const phase = animValue * Math.PI * 2;
    const scaleX = 1 + squashFactor * Math.sin(phase);
    const scaleY = 1 - squashFactor * Math.sin(phase); // Inverse of X for volume preservation
    
    selectedRegions.forEach(region => {
        // Find region bounds
        let minX = width, maxX = 0, minY = height, maxY = 0;
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });

        // Calculate center of region
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });

        // Apply squash and stretch
        for (let y = minY - 20; y <= maxY + 20; y++) {
            for (let x = minX - 20; x <= maxX + 20; x++) {
                // Calculate position relative to center
                const relX = x - centerX;
                const relY = y - centerY;
                
                // Apply scaling
                const sourceX = relX / scaleX + centerX;
                const sourceY = relY / scaleY + centerY;

                if (sourceX >= minX && sourceX <= maxX && sourceY >= minY && sourceY <= maxY &&
                    x >= 0 && x < width && y >= 0 && y < height) {
                    const targetIndex = (y * width + x) * 4;
                    const sourceIndex = (Math.floor(sourceY) * width + Math.floor(sourceX)) * 4;
                    
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
            resultImageData = applySquashStretchEffect(imageData, selectedRegions, value);
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