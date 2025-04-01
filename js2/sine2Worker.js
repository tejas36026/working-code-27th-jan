self.onmessage = function (e) {

    const { imageData, selectedRegions, value, value5, currentIteration, reset } = e.data;

    if (!self.animationCounter) {
        self.animationCounter = 0;
    }

    self.animationCounter += 1;

    try {
        // Ensure valid input
        if (!imageData || !imageData.data || !selectedRegions) {
            throw new Error('Invalid input data received by the worker.');
        }

        const { data, width, height } = imageData;
        const resultImageData = new ImageData(width, height);

        // Copy the original image data to preserve it
        resultImageData.data.set(data);

        // Animation time based on our counter
        const time = self.animationCounter * 0.05;

        // Clear a region in the center for the waves
        const centerY = height / 2;
        const waveAreaHeight = height * 0.6;

        // Use a transparent canvas for better blending
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d', { alpha: true });
        tempCtx.clearRect(0, 0, width, height);

        // Define wave properties for a more aesthetic visualization
        const waves = [
            // Large amplitude waves (outer waves)
            { freq: 0.005, amp: 80, phase: 0, color: [76, 201, 240, 0.6], width: 1.5 },     // Light blue
            { freq: 0.007, amp: 70, phase: 1.5, color: [72, 149, 239, 0.6], width: 1.5 },   // Medium blue
            
            // Medium amplitude waves
            { freq: 0.01, amp: 60, phase: 0.8, color: [86, 67, 250, 0.5], width: 1.2 },     // Purple blue
            { freq: 0.015, amp: 50, phase: 1.2, color: [145, 65, 172, 0.5], width: 1.2 },   // Purple
            
            // Higher frequency waves (inner waves)
            { freq: 0.02, amp: 40, phase: 0.5, color: [187, 62, 103, 0.4], width: 1 },      // Pink
            { freq: 0.025, amp: 30, phase: 0.7, color: [248, 102, 36, 0.4], width: 1 },     // Orange
            { freq: 0.03, amp: 20, phase: 0.3, color: [255, 155, 57, 0.4], width: 0.8 },    // Light orange
            
            // Very high frequency center waves
            { freq: 0.035, amp: 15, phase: 1.0, color: [255, 190, 11, 0.3], width: 0.8 }    // Yellow
        ];

        // Draw each wave
        waves.forEach(wave => {
            tempCtx.beginPath();
            tempCtx.strokeStyle = `rgba(${wave.color[0]}, ${wave.color[1]}, ${wave.color[2]}, ${wave.color[3]})`;
            tempCtx.lineWidth = wave.width;
            
            // Draw a smooth wave path
            for (let x = 0; x < width; x += 1) {
                const y = centerY + Math.sin(x * wave.freq + time + wave.phase) * wave.amp;
                
                if (x === 0) {
                    tempCtx.moveTo(x, y);
                } else {
                    tempCtx.lineTo(x, y);
                }
            }
            
            tempCtx.stroke();
        });

        // Get the image data from the temporary canvas
        const tempImageData = tempCtx.getImageData(0, 0, width, height);
        
        // Combine the wave visualization with the original image
        for (let i = 0; i < data.length; i += 4) {
            // If there's any color in the wave visualization, blend it with the image
            if (tempImageData.data[i+3] > 0) {
                // Simple alpha blending
                const alpha = tempImageData.data[i+3] / 255;
                resultImageData.data[i] = (1 - alpha) * resultImageData.data[i] + alpha * tempImageData.data[i];
                resultImageData.data[i+1] = (1 - alpha) * resultImageData.data[i+1] + alpha * tempImageData.data[i+1];
                resultImageData.data[i+2] = (1 - alpha) * resultImageData.data[i+2] + alpha * tempImageData.data[i+2];
            }
        }

        // Process selected regions for additional effects (optional)
        if (selectedRegions && selectedRegions.length > 0) {
            selectedRegions.forEach((region, regionIndex) => {
                const brightness = value + (currentIteration || 0) / value5;
    
                region.forEach((pixelIndex) => {
                    const baseIndex = pixelIndex * 4;
    
                    // Modify pixel color (brighten the area)
                    resultImageData.data[baseIndex] = Math.min(255, resultImageData.data[baseIndex] + brightness);
                    resultImageData.data[baseIndex+1] = Math.min(255, resultImageData.data[baseIndex+1] + brightness);
                    resultImageData.data[baseIndex+2] = Math.min(255, resultImageData.data[baseIndex+2] + brightness);
                });
            });
        }

        // Calculate progress
        const progress = (currentIteration || 0) / value5;

        // Send processed image and progress back to the main thread
        self.postMessage({ segmentedImages: [resultImageData], progress });
    } catch (error) {
        // Post error message back to the main thread
        self.postMessage({ error: error.message });
    }

};