self.onmessage = function (e) {
    const { imageData, selectedRegions, value, value5, currentIteration, reset } = e.data;

    // Create a static counter that persists between function calls
    if (!self.animationCounter) {
        self.animationCounter = 0;
    }
    
    // Increment the counter each time the worker receives a message
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
        const time = self.animationCounter * 0.02;

        // Use a transparent canvas for better blending
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d', { alpha: true });
        tempCtx.clearRect(0, 0, width, height);

        // Calculate center and radius
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.4; // 40% of the smaller dimension

        // Draw the circular container
        tempCtx.beginPath();
        tempCtx.strokeStyle = 'rgba(50, 50, 255, 0.8)'; // Blue circle
        tempCtx.lineWidth = 2;
        tempCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        tempCtx.stroke();

        // Draw the sine wave inside the circle
        tempCtx.beginPath();
        tempCtx.strokeStyle = 'rgba(0, 0, 0, 0.9)'; // Black wave
        tempCtx.lineWidth = 1.5;

        // Parameters for the wave
        const frequency = 2; // Number of complete waves
        const phaseShift = time; // Moving phase for animation

        // Draw the wave point by point
        for (let angle = 0; angle <= Math.PI * 2; angle += 0.01) {
            // Calculate the radius at this angle (oscillating)
            const waveRadius = radius * 0.8 * Math.sin(frequency * angle + phaseShift);
            
            // Calculate x and y coordinates
            const x = centerX + waveRadius * Math.cos(angle);
            const y = centerY + waveRadius * Math.sin(angle);
            
            if (angle === 0) {
                tempCtx.moveTo(x, y);
            } else {
                tempCtx.lineTo(x, y);
            }
        }
        
        tempCtx.stroke();

        // Add a few more waves with different parameters
        const additionalWaves = [
            { freq: 3, phase: time * 1.3, color: 'rgba(150, 0, 0, 0.7)', width: 1.2 },
            { freq: 1, phase: time * 0.7, color: 'rgba(0, 150, 0, 0.7)', width: 1.2 }
        ];

        additionalWaves.forEach(wave => {
            tempCtx.beginPath();
            tempCtx.strokeStyle = wave.color;
            tempCtx.lineWidth = wave.width;
            
            for (let angle = 0; angle <= Math.PI * 2; angle += 0.01) {
                // Calculate the radius at this angle (oscillating)
                const waveRadius = radius * 0.6 * Math.sin(wave.freq * angle + wave.phase);
                
                // Calculate x and y coordinates
                const x = centerX + waveRadius * Math.cos(angle);
                const y = centerY + waveRadius * Math.sin(angle);
                
                if (angle === 0) {
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