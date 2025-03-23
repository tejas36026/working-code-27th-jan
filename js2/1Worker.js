self.onmessage = function (e) {
    const { imageData, selectedRegions, value, value5, currentIteration, reset, polyConfig } = e.data;

    // Default polynomial configuration if not provided
    const config = polyConfig || {
        degree: 2,         // Polynomial degree
        count: 5,          // Number of polynomials
        length: 10,      // Number of points per polynomial
        scale: 1,        // Scale factor for visualization
        speed: 0.001,       // Animation speed
        colors: [          // Colors for each polynomial
            [255, 255, 200, 0.6],  // Light yellow
            [200, 255, 200, 0.6],  // Light green
            [200, 200, 255, 0.6],  // Light blue
            [255, 200, 200, 0.6],  // Light red
            [255, 200, 255, 0.6]   // Light purple
        ]
    };

    // Create a static counter that persists between function calls
    if (!self.animationCounter) {
        self.animationCounter = 0;
    }
    
    // Increment the counter each time the worker receives a message
    self.animationCounter += 1;

    try {
        // Ensure valid input
        if (!imageData || !imageData.data) {
            throw new Error('Invalid input data received by the worker.');
        }

        const { data, width, height } = imageData;
        const resultImageData = new ImageData(width, height);

        // Copy the original image data to preserve it
        resultImageData.data.set(data);

        // Animation time based on our counter
        const time = self.animationCounter * config.speed;

        // Use a transparent canvas for better blending
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d', { alpha: true });
        tempCtx.clearRect(0, 0, width, height);

        // Calculate center
        const centerX = width / 2;
        const centerY = height / 2;
        
        /**
         * Generates a polynomial of specified degree
         * @param {number} x - The x coordinate
         * @param {number} degree - The polynomial degree
         * @param {Array} coefficients - Array of coefficients
         * @param {number} phaseOffset - Phase offset for animation
         * @returns {number} The polynomial value at x
         */
        function evaluatePolynomial(x, degree, coefficients, phaseOffset) {
            let result = 0;
            // Normalize x to be between -1 and 1 for better control
            const normalized_x = (x / config.length) * 2 - 1;
            
            // Evaluate the polynomial using Horner's method
            for (let i = 0; i <= degree; i++) {
                // Use coefficient with animation
                const coef = coefficients[i] * Math.sin(time + phaseOffset * (i + 1));
                result = result * normalized_x + coef;
            }
            
            return result;
        }
        
        /**
         * Generates random coefficients for a polynomial
         * @param {number} degree - The polynomial degree
         * @returns {Array} Array of coefficients
         */
        function generateCoefficients(degree) {
            const coefficients = [];
            for (let i = 0; i <= degree; i++) {
                coefficients.push((Math.random() * 2 - 1) * 0.5); // Random between -0.5 and 0.5
            }
            return coefficients;
        }
        
        // Generate polynomials with different parameters
        const polynomials = [];
        
        for (let i = 0; i < config.count; i++) {
            // Vary the degree slightly for each polynomial
            const polydegree = config.degree + (i % 3 - 1); // Varies by -1, 0, or 1
            
            polynomials.push({
                degree: Math.max(1, polydegree), // Ensure degree is at least 1
                coefficients: generateCoefficients(Math.max(1, polydegree)),
                color: config.colors[i % config.colors.length],
                phaseOffset: i * 0.5,
                lineWidth: 1 + (i % 3) * 0.5  // Varying line widths
            });
        }

        // Draw each polynomial
        polynomials.forEach((poly, index) => {
            tempCtx.beginPath();
            tempCtx.strokeStyle = `rgba(${poly.color[0]}, ${poly.color[1]}, ${poly.color[2]}, ${poly.color[3]})`;
            tempCtx.lineWidth = poly.lineWidth;
            
            // Additional parameters for unique curves
            const amplitude = config.scale * (0.7 + (index % 3) * 0.2);
            const horizontalShift = time * 50 * (index % 2 === 0 ? 1 : -1);
            
            for (let i = 0; i < config.length; i++) {
                // Calculate polynomial value
                const x = i - horizontalShift;
                const y = evaluatePolynomial(x, poly.degree, poly.coefficients, poly.phaseOffset) * amplitude;
                
                // Calculate screen coordinates
                const screenX = (i / config.length) * width;
                const screenY = centerY + y;
                
                if (i === 0) {
                    tempCtx.moveTo(screenX, screenY);
                } else {
                    tempCtx.lineTo(screenX, screenY);
                }
            }
            
            tempCtx.stroke();
        });

        // Add some visual enhancements: connection points between polynomials
        tempCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        for (let i = 0; i < config.count; i++) {
            const poly = polynomials[i];
            
            // Draw points at specific intervals
            for (let t = 0; t < config.length; t += config.length / 20) {
                const amplitude = config.scale * (0.7 + (i % 3) * 0.2);
                const horizontalShift = time * 50 * (i % 2 === 0 ? 1 : -1);
                
                const x = t - horizontalShift;
                const y = evaluatePolynomial(x, poly.degree, poly.coefficients, poly.phaseOffset) * amplitude;
                
                const screenX = (t / config.length) * width;
                const screenY = centerY + y;
                
                // Draw connection point
                tempCtx.beginPath();
                tempCtx.arc(screenX, screenY, 2, 0, Math.PI * 2);
                tempCtx.fill();
            }
        }

        // Apply a subtle glow effect
        tempCtx.shadowBlur = 10;
        tempCtx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        
        // Get the image data from the temporary canvas
        const tempImageData = tempCtx.getImageData(0, 0, width, height);
        
        // Combine the visualization with the original image
        for (let i = 0; i < data.length; i += 4) {
            // If there's any color in the visualization, blend it with the image
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