// Split Effect - Middle part of lips disappears and reappears
function applySplitEffect(imageData, selectedRegions, danceValue) {
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
        
        const centerX = (minX + maxX) / 2;
        const regionWidth = maxX - minX;
        
        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });
        
        // Apply split effect - center part disappears/reappears
        const splitStrength = Math.abs(Math.sin(danceValue * Math.PI * 2));
        const gapWidth = regionWidth * 0.3 * splitStrength;
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Calculate distance from center
                const distFromCenter = Math.abs(x - centerX);
                
                // Apply horizontal shift based on side and distance
                let newX = x;
                if (x < centerX) {
                    // Left side - move left
                    newX = x - (gapWidth / 2) * (1 - distFromCenter / (centerX - minX));
                } else {
                    // Right side - move right
                    newX = x + (gapWidth / 2) * (1 - distFromCenter / (maxX - centerX));
                }
                
                const newY = y;
                
                // Boundary check
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const sourceIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
                    const targetIndex = (Math.floor(newY) * width + Math.floor(newX)) * 4;
                    
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
            resultImageData = applySplitEffect(imageData, selectedRegions, value);
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