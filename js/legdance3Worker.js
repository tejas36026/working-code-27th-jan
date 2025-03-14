const DEFAULT_SCALE_FACTOR = 0.15;
const DEFAULT_ITERATIONS = 120;

let currentIteration = 0;
console.log("1111111111111111111111111111111111111")
function createTransparentImageData(width, height) {
    return new ImageData(
        new Uint8ClampedArray(width * height * 4),
        width,
        height
    );
}

function applyPulseEffect(imageData, selectedRegions, pulseValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);

    // Pulse parameters
    const scaleFactor = 1 + DEFAULT_SCALE_FACTOR * Math.sin(pulseValue * Math.PI * 2);
    
    selectedRegions.forEach(region => {
        // Find region bounds and center
        let minX = width, maxX = 0, minY = height, maxY = 0;
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const regionWidth = maxX - minX;
        const regionHeight = maxY - minY;

        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });

        // Apply scaling effect from center
        for (let y = minY - regionHeight/2; y <= maxY + regionHeight/2; y++) {
            for (let x = minX - regionWidth/2; x <= maxX + regionWidth/2; x++) {
                // Calculate position relative to center
                const relX = x - centerX;
                const relY = y - centerY;
                
                // Apply scaling
                const sourceX = relX / scaleFactor + centerX;
                const sourceY = relY / scaleFactor + centerY;

                if (sourceX >= minX && sourceX <= maxX && sourceY >= minY && sourceY <= maxY &&
                    x >= 0 && x < width && y >= 0 && y < height) {
                    const sourceIndex = (Math.floor(sourceY) * width + Math.floor(sourceX)) * 4;
                    const targetIndex = (Math.floor(y) * width + Math.floor(x)) * 4;

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
            resultImageData = applyPulseEffect(imageData, selectedRegions, value);
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
