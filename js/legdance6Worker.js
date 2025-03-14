const DEFAULT_SWING_ANGLE = 20;
const DEFAULT_ITERATIONS = 120;

let currentIteration = 0;

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

function applySwingEffect(imageData, selectedRegions, swingValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);

    // Swing parameters
    const swingAngle = DEFAULT_SWING_ANGLE * Math.sin(swingValue * Math.PI * 2) * (Math.PI / 180);
    
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

        // Calculate pivot point (top center of the region)
        const pivotX = (minX + maxX) / 2;
        const pivotY = minY;

        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });

        // Apply swing rotation
        const cos = Math.cos(swingAngle);
        const sin = Math.sin(swingAngle);
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Calculate position relative to pivot
                const relX = x - pivotX;
                const relY = y - pivotY;
                
                // Apply rotation
                const sourceX = relX * cos - relY * sin + pivotX;
                const sourceY = relX * sin + relY * cos + pivotY;

                if (sourceX >= minX && sourceX <= maxX && sourceY >= minY && sourceY <= maxY) {
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
            resultImageData = applySwingEffect(imageData, selectedRegions, value);
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