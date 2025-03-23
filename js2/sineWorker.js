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

        // Sine wave parameters
        const waveFrequency = 0.02; // Controls the frequency of the sine wave
        const waveAmplitude = 50;   // Controls the height of the sine wave
        const waveSpeed = 0.1;     // Controls the speed of the wave animation
        
        // Use our internal counter instead of currentIteration
        const time = self.animationCounter * waveSpeed;

        // Overlay sine waves on the image
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const baseIndex = (y * width + x) * 4;

                // Compute sine wave offset for the current pixel
                // The negative sign in front of time makes it move right to left
                // Remove the negative sign to make it move left to right
                const waveOffset = Math.sin(x * waveFrequency - time) * waveAmplitude;

                // Check if the pixel lies on the sine wave (adjust the thickness as needed)
                if (Math.abs(y - height / 2 - waveOffset) < 2) {
                    // Apply a color overlay (e.g., red) to pixels on the sine wave
                    resultImageData.data[baseIndex] = 255;     // Red
                    resultImageData.data[baseIndex + 1] = 0;   // Green
                    resultImageData.data[baseIndex + 2] = 0;   // Blue
                    resultImageData.data[baseIndex + 3] = 255; // Alpha
                }
            }
        }

        // Process selected regions for additional effects (optional)
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

        // Calculate progress
        const progress = (currentIteration || 0) / value5;

        // Send processed image and progress back to the main thread
        self.postMessage({ segmentedImages: [resultImageData], progress });
    } catch (error) {
        // Post error message back to the main thread
        self.postMessage({ error: error.message });
    }
};