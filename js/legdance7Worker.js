const DEFAULT_ITERATIONS = 120;

let currentIteration = 0;

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

function applyFlipEffect(imageData, selectedRegions, flipValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
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

        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });

        // Calculate the scale for 3D perspective (scale to simulate flip)
        const angle = flipValue * Math.PI * 2;
        const scaleX = Math.abs(Math.cos(angle));
        const centerX = (minX + maxX) / 2;
        
        // Apply 3D flip (horizontal flip)
        if (Math.cos(angle) >= 0) {
            // Front side of the flip
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    // Scale X around center to create 3D flip effect
                    const relX = x - centerX;
                    const scaledX = relX * scaleX + centerX;
                    
                    if (scaledX >= minX && scaledX <= maxX) {
                        const targetIndex = (y * width + x) * 4;
                        const sourceIndex = (y * width + Math.floor(scaledX)) * 4;
                        
                        // Copy pixel data
                        for (let i = 0; i < 4; i++) {
                            newImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
                        }
                    }
                }
            }
        } else {
            // Back side of the flip (horizontally flipped)
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    // Scale X around center with horizontal flip
                    const relX = x - centerX;
                    const scaledX = centerX - (relX * scaleX);
                    
                    if (scaledX >= minX && scaledX <= maxX) {
                        const targetIndex = (y * width + x) * 4;
                        const sourceIndex = (y * width + Math.floor(scaledX)) * 4;
                        
                        // Copy pixel data
                        for (let i = 0; i < 4; i++) {
                            newImageData.data[targetIndex + i] = imageData.data[sourceIndex + i];
                        }
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
            resultImageData = applyFlipEffect(imageData, selectedRegions, value);
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