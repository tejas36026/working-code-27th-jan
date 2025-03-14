// Heartbeat Effect - Quick-slow expansion pattern
function applyHeartbeatEffect(imageData, selectedRegions, danceValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    selectedRegions.forEach(region => {
        // Find region bounds and center
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let centerX = 0, centerY = 0;
        
        region.forEach(pixelIndex => {
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            centerX += x;
            centerY += y;
        });
        
        centerX /= region.length;
        centerY /= region.length;
        
        // Clear original region
        region.forEach(pixelIndex => {
            const baseIndex = pixelIndex * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        });
        
        // Create heartbeat pattern (quick-slow with two beats)
        let scale = 1.0;
        const normalizedValue = danceValue % 1;
        
        if (normalizedValue < 0.1) {
            // First quick beat
            scale = 1.0 + 0.3 * Math.sin(normalizedValue * Math.PI * 10);
        } else if (normalizedValue > 0.2 && normalizedValue < 0.35) {
            // Second slower beat
            scale = 1.0 + 0.2 * Math.sin((normalizedValue - 0.2) * Math.PI * 6.67);
        }
        
        // Apply scale transformation
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Calculate position relative to center
                const relX = x - centerX;
                const relY = y - centerY;
                
                // Apply scale
                const newX = centerX + relX * scale;
                const newY = centerY + relY * scale;
                
                // Boundary check
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const sourceIndex = (Math.floor(y) * width + Math.floor(x)) * 4;
                    const targetIndex = (Math.floor(newY) * width + Math.floor(newX)) * 4;
                    
                    // Copy pixel data
                    // for (let i = 0; i < 4; i++)
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
            resultImageData = applyHeartbeatEffect(imageData, selectedRegions, value);
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