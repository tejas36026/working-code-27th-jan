const DEFAULT_ITERATIONS = 120;
const DEFAULT_FLOAT_HEIGHT = 15;
const DEFAULT_FLOAT_TILT = 5;
let currentIteration = 0;

function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

function applyFloatEffect(imageData, selectedRegions, floatValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    // Float parameters
    const floatHeight = DEFAULT_FLOAT_HEIGHT * Math.sin(floatValue * Math.PI * 2);
    const tiltAngle = (DEFAULT_FLOAT_TILT * Math.sin(floatValue * Math.PI * 4)) * (Math.PI / 180);
    
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

        // Apply floating effect (combination of vertical movement and slight rotation)
        const cos = Math.cos(tiltAngle);
        const sin = Math.sin(tiltAngle);
        
        for (let y = minY - 20; y <= maxY + 20; y++) {
            for (let x = minX - 20; x <= maxX + 20; x++) {
                // Calculate position relative to center
                const relX = x - centerX;
                const relY = y - centerY;
                
                // Apply rotation
                const rotX = relX * cos - relY * sin;
                const rotY = relX * sin + relY * cos;
                
                // Apply floating movement
                const sourceX = rotX + centerX;
                const sourceY = rotY + centerY - floatHeight;

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
            resultImageData = applyFloatEffect(imageData, selectedRegions, value);
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
console.log('resultImageData :>> ', resultImageData);
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