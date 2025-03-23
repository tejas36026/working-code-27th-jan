self.onmessage = function (e) {
    const { imageData, selectedRegions, value, value5, currentIteration, reset } = e.data;

    // Create a static counter that persists between function calls
    if (!self.animationCounter) {
        self.animationCounter = 0;
    }
    
    // Increment the counter each time the worker receives a message
    self.animationCounter += 3; // Faster movement

    try {
        // Ensure valid input
        if (!imageData || !imageData.data || !selectedRegions) {
            throw new Error('Invalid input data received by the worker.');
        }

        const { data, width, height } = imageData;
        const resultImageData = new ImageData(width, height);

        // Copy the original image data to preserve it
        resultImageData.data.set(data);

        // Use our internal counter for animation
        const time = self.animationCounter;

        // Define a simple backdrop to make waves more visible
        // Add a semi-transparent overlay in the center area
        const centerY = height / 2;
        const overlayHeight = height * 0.4; // 40% of the image height

        for (let y = 0; y < height; y++) {
            // Only add background in the central area where waves will be
            if (Math.abs(y - centerY) < overlayHeight / 2) {
                for (let x = 0; x < width; x++) {
                    const baseIndex = (y * width + x) * 4;
                    
                    // Add slight darkening to make waves pop
                    resultImageData.data[baseIndex] = Math.max(0, resultImageData.data[baseIndex] - 30);
                    resultImageData.data[baseIndex + 1] = Math.max(0, resultImageData.data[baseIndex + 1] - 30);
                    resultImageData.data[baseIndex + 2] = Math.max(0, resultImageData.data[baseIndex + 2] - 30);
                }
            }
        }

        // Define wave colors - very bright and solid
        const waveColors = [
            [255, 0, 0, 255],     // Red
            [255, 165, 0, 255],   // Orange
            [255, 255, 0, 255],   // Yellow
            [0, 255, 0, 255],     // Green
            [0, 0, 255, 255]      // Blue
        ];

        // Create multiple waves
        for (let waveIndex = 0; waveIndex < 5; waveIndex++) {
            // Calculate wave parameters based on index
            const frequency = 0.01 + (waveIndex * 0.005); // Increasing frequencies
            const amplitude = 50 - (waveIndex * 5);      // Decreasing amplitudes
            const phase = time * (0.03 + (waveIndex * 0.01)); // Different speeds
            const color = waveColors[waveIndex];
            const waveThickness = 3 - (waveIndex * 0.4);  // Thicker lines for more visibility

            // Draw the wave
            for (let x = 0; x < width; x++) {
                // Calculate y position of the wave at this x coordinate
                const waveY = centerY + Math.sin(x * frequency + phase) * amplitude;
                
                // Draw a thick line at this position
                for (let dy = -waveThickness; dy <= waveThickness; dy++) {
                    const y = Math.round(waveY + dy);
                    
                    // Make sure y is within bounds
                    if (y >= 0 && y < height) {
                        const baseIndex = (y * width + x) * 4;
                        
                        // Set color with full opacity
                        resultImageData.data[baseIndex] = color[0];     // R
                        resultImageData.data[baseIndex + 1] = color[1]; // G
                        resultImageData.data[baseIndex + 2] = color[2]; // B
                        resultImageData.data[baseIndex + 3] = color[3]; // A (full opacity)
                    }
                }
            }
        }

        // Process selected regions for additional effects (optional)
        if (selectedRegions && selectedRegions.length > 0) {
            selectedRegions.forEach((region, regionIndex) => {
                const brightness = value + (currentIteration || 0) / value5; // Example animation logic
    
                region.forEach((pixelIndex) => {
                    const baseIndex = pixelIndex * 4;
    
                    // Modify pixel color (example: brighten the area)
                    resultImageData.data[baseIndex] = Math.min(255, resultImageData.data[baseIndex] + brightness); // Red
                    resultImageData.data[baseIndex + 1] = Math.min(255, resultImageData.data[baseIndex + 1] + brightness); // Green
                    resultImageData.data[baseIndex + 2] = Math.min(255, resultImageData.data[baseIndex + 2] + brightness); // Blue
                    // Alpha remains unchanged
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