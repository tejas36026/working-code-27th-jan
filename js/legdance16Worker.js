// Ripple Effect - Concentric waves emanating from center
function applyRippleEffect(imageData, selectedRegions, danceValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    // Ripple parameters
    const frequency = 8;
    const amplitude = 3;
    const phase = danceValue * Math.PI * 2;
    
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
        
        // Apply ripple effect
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate displacement based on distance
                const displacement = amplitude * Math.sin(distance * frequency / 10 + phase);
                
                // Calculate direction vector
                const dirX = dx === 0 ? 0 : dx / distance;
                const dirY = dy === 0 ? 0 : dy / distance;
                
                // Apply displacement in radial direction
                const newX = x + dirX * displacement;
                const newY = y + dirY * displacement;
                
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
            resultImageData = applyRippleEffect(imageData, selectedRegions, value);
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