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
        const time = self.animationCounter * 0.03;

        // Center of the image
        const centerY = height / 2;
        const centerX = width / 2;

        // Use a transparent canvas for better blending
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d', { alpha: true });
        tempCtx.clearRect(0, 0, width, height);

        // Define parabola properties
        const parabolas = [
            // Wider parabolas (outer curves)
            { scale: 0.0003, offset: 80, phase: 0, color: [76, 201, 240, 0.6], width: 1.5 },   // Light blue
            { scale: 0.0004, offset: 65, phase: 0.2, color: [72, 149, 239, 0.6], width: 1.5 }, // Medium blue
            
            // Medium parabolas
            { scale: 0.0005, offset: 50, phase: 0.4, color: [86, 67, 250, 0.5], width: 1.2 },  // Purple blue
            { scale: 0.0006, offset: 40, phase: 0.6, color: [145, 65, 172, 0.5], width: 1.2 }, // Purple
            
            // Narrower parabolas (inner curves)
            { scale: 0.0007, offset: 30, phase: 0.8, color: [187, 62, 103, 0.4], width: 1 },   // Pink
            { scale: 0.0008, offset: 25, phase: 1.0, color: [248, 102, 36, 0.4], width: 1 },   // Orange
            { scale: 0.0009, offset: 20, phase: 1.2, color: [255, 155, 57, 0.4], width: 0.8 }, // Light orange
            { scale: 0.001, offset: 15, phase: 1.4, color: [255, 190, 11, 0.3], width: 0.8 }   // Yellow
        ];

        // Animation shift amount (for horizontal movement)
        const shiftAmount = time * 200 % (width * 2);

        // Draw each parabola
        parabolas.forEach(parabola => {
            tempCtx.beginPath();
            tempCtx.strokeStyle = `rgba(${parabola.color[0]}, ${parabola.color[1]}, ${parabola.color[2]}, ${parabola.color[3]})`;
            tempCtx.lineWidth = parabola.width;
            
            // Draw a parabola path
            for (let x = 0; x < width; x += 1) {
                // Calculate the relative x position with movement
                const relativeX = x - centerX + shiftAmount - (width * parabola.phase);
                
                // Parabola equation: y = a(x - h)² + k
                // Where (h,k) is the vertex, and a controls the curvature
                const y = centerY + (parabola.scale * Math.pow(relativeX, 2) - parabola.offset);
                
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