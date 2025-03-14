// Wave Motion - Horizontal waves traveling across lips
function applyWaveMotionEffect(imageData, selectedRegions, danceValue) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);
    
    // Copy original image data
    newImageData.data.set(imageData.data);
    
    // Wave parameters
    const waveAmplitude = 6;
    const waveFrequency = 3;
    const phase = danceValue * Math.PI * 2;
    
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
        
        // Apply wave effect
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const normalizedX = (x - minX) / (maxX - minX);
                const normalizedY = (y - minY) / (maxY - minY);
                
                // Horizontal wave
                const offsetY = waveAmplitude * Math.sin(normalizedX * waveFrequency * Math.PI * 2 + phase);
                
                const newX = x;
                const newY = y + offsetY;
                
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
            resultImageData = applyWaveMotionEffect(imageData, selectedRegions, value);
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