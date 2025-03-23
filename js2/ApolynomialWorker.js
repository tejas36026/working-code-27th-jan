
self.onmessage = function (e) {
        const { imageData } = e.data;
        
        const polyConfig = {
            degree: 4,                 // Change this to any degree you want (0-5+)
            showPoints: true,
            showAxes: true,
            animation: {
                enabled: true,
                speed: 0.01
            },
            domain: {
                min: -5,
                max: 5
            }
        };
        
        if (!self.animationCounter) {
            self.animationCounter = 0;
        }
        self.animationCounter++;
    
        try {
            // Basic setup for canvas
            if (!imageData || !imageData.data) {
                throw new Error('Invalid image data provided to worker');
            }
    
            const { width, height } = imageData;
            const resultImageData = new ImageData(width, height);
            resultImageData.data.set(imageData.data);
    
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
    
            // Use the polyConfig defined above
            const userConfig = polyConfig;
            console.log('userConfig :>> ', userConfig);
        // Create a configuration with defaults that can be overridden
        const config = {
            degree: userConfig.degree || 2,              // Default to quadratic
            showPoints: userConfig.showPoints !== undefined ? userConfig.showPoints : true,
            showAxes: userConfig.showAxes !== undefined ? userConfig.showAxes : true,
            animation: {
                enabled: userConfig.animation?.enabled !== undefined ? userConfig.animation.enabled : true,
                speed: userConfig.animation?.speed || 0.01
            },
            domain: {
                min: userConfig.domain?.min || -5,
                max: userConfig.domain?.max || 5
            }
        };
        
        // Generate appropriate coefficients based on the requested degree
        function generatePolynomialsForDegree(degree) {
            const polynomials = [];
            
            // Generate a polynomial with the specified degree
            const mainPoly = {
                coefficients: [],
                color: "#3498db",
                lineWidth: 2
            };
            
            // Generate meaningful coefficients for the specified degree
            // For demonstration, we'll generate coefficients that create visibly different curves
            switch(degree) {
                case 0:  // Constant function
                    mainPoly.coefficients = [2];  // Just a constant
                    mainPoly.color = "#e74c3c";  // Red
                    break;
                    
                case 1:  // Linear function (straight line)
                    mainPoly.coefficients = [0, 1];  // f(x) = x
                    mainPoly.color = "#2ecc71";  // Green
                    break;
                    
                case 2:  // Quadratic function (parabola)
                    mainPoly.coefficients = [0, 0, 1];  // f(x) = x²
                    mainPoly.color = "#3498db";  // Blue
                    break;
                    
                case 3:  // Cubic function
                    mainPoly.coefficients = [0, 0, 0, 0.2];  // f(x) = 0.2x³
                    mainPoly.color = "#9b59b6";  // Purple
                    break;
                    
                case 4:  // Quartic function
                    mainPoly.coefficients = [0, 0, 0, 0, 0.05];  // f(x) = 0.05x⁴
                    mainPoly.color = "#f39c12";  // Orange
                    break;
                    
                case 5:  // Quintic function
                    mainPoly.coefficients = [0, 0, 0, 0, 0, 0.01];  // f(x) = 0.01x⁵
                    mainPoly.color = "#1abc9c";  // Teal
                    break;
                    
                default:  // Higher degrees
                    // For higher degrees, create a polynomial with only the highest term
                    mainPoly.coefficients = Array(degree + 1).fill(0);
                    mainPoly.coefficients[degree] = 1 / Math.pow(2, degree - 2);  // Scale down for visibility
                    mainPoly.color = "#34495e";  // Dark blue
            }
            
            // Create a label for the polynomial
            mainPoly.label = createPolynomialLabel(mainPoly.coefficients);
            
            // Add the main polynomial
            polynomials.push(mainPoly);
            
            // Also add a reference line or simple polynomial for comparison
            if (degree > 1) {
                // Add a linear function for reference
                polynomials.push({
                    coefficients: [0, 0.5],
                    color: "rgba(150, 150, 150, 0.5)",
                    lineWidth: 1,
                    label: "Reference: 0.5x"
                });
            }
            
            return polynomials;
        }
        
        // Create a formatted label for a polynomial
        function createPolynomialLabel(coefficients) {
            const degree = coefficients.length - 1;
            let degreeNames = ["Constant", "Linear", "Quadratic", "Cubic", "Quartic", "Quintic"];
            let degreeName = degree <= 5 ? degreeNames[degree] : `Degree ${degree}`;
            
            // Create a new label based on the coefficients
            let label = `${degreeName}: `;
            let terms = [];
            
            coefficients.forEach((coeff, i) => {
                if (coeff === 0) return; // Skip zero coefficients
                
                let term = "";
                let absCoeff = Math.abs(coeff);
                
                // Format the coefficient
                if (i === 0) {
                    // Constant term
                    term = `${absCoeff}`;
                } else if (i === 1) {
                    // Linear term
                    term = absCoeff === 1 ? "x" : `${absCoeff}x`;
                } else {
                    // Higher powers
                    term = absCoeff === 1 ? `x^${i}` : `${absCoeff}x^${i}`;
                }
                
                // Add the sign
                if (coeff < 0) {
                    terms.push(`- ${term}`);
                } else if (terms.length > 0) {
                    terms.push(`+ ${term}`);
                } else {
                    terms.push(term);
                }
            });
            
            return `${degreeName}: ${terms.length > 0 ? terms.join(' ') : '0'}`;
        }
        
        // Generate the polynomials based on the requested degree
        config.polynomials = userConfig.polynomials || generatePolynomialsForDegree(config.degree);

        // Animation time
        const time = config.animation.enabled ? self.animationCounter * config.animation.speed : 0;

        // Draw coordinate system if enabled
        if (config.showAxes) {
            const origin = {
                x: width / 2,
                y: height / 2
            };
            
            const scale = Math.min(width, height) / 12;
            
            // Draw axes
            ctx.beginPath();
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 1;
            
            // X-axis
            ctx.moveTo(0, origin.y);
            ctx.lineTo(width, origin.y);
            
            // Y-axis
            ctx.moveTo(origin.x, 0);
            ctx.lineTo(origin.x, height);
            
            ctx.stroke();
            
            // Draw tick marks and labels
            ctx.font = "12px Arial";
            ctx.fillStyle = "#777";
            ctx.textAlign = "center";
            
            // X-axis ticks and labels
            for (let x = config.domain.min; x <= config.domain.max; x++) {
                if (x === 0) continue; // Skip origin
                
                const screenX = origin.x + x * scale;
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(screenX, origin.y - 5);
                ctx.lineTo(screenX, origin.y + 5);
                ctx.stroke();
                
                // Draw label
                ctx.fillText(x.toString(), screenX, origin.y + 20);
            }
            
            // Y-axis ticks and labels
            for (let y = -5; y <= 5; y++) {
                if (y === 0) continue; // Skip origin
                
                const screenY = origin.y - y * scale;
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(origin.x - 5, screenY);
                ctx.lineTo(origin.x + 5, screenY);
                ctx.stroke();
                
                // Draw label
                ctx.textAlign = "right";
                ctx.fillText(y.toString(), origin.x - 10, screenY + 4);
            }
            
            // Draw origin label
            ctx.textAlign = "right";
            ctx.fillText("0", origin.x - 10, origin.y + 20);
        }

        // Polynomial evaluation function
        function evaluatePolynomial(x, coefficients, time = 0) {
            let result = 0;
            
            // Using Horner's method for polynomial evaluation
            for (let i = coefficients.length - 1; i >= 0; i--) {
                // Add subtle animation to coefficients if enabled
                const coeff = coefficients[i] * (config.animation.enabled ? 
                    (1 + 0.1 * Math.sin(time * (i + 1))) : 1);
                    
                result = result * x + coeff;
            }
            
            return result;
        }

        // Draw each polynomial
        const origin = {
            x: width / 2,
            y: height / 2
        };
        const scale = Math.min(width, height) / 12;
        
        // Draw a grid for better visualization
        if (config.showAxes) {
            ctx.strokeStyle = "rgba(200, 200, 200, 0.2)";
            ctx.lineWidth = 0.5;
            
            // Vertical grid lines
            for (let x = config.domain.min; x <= config.domain.max; x++) {
                if (x === 0) continue; // Skip axis
                
                const screenX = origin.x + x * scale;
                
                ctx.beginPath();
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, height);
                ctx.stroke();
            }
            
            // Horizontal grid lines
            for (let y = -5; y <= 5; y++) {
                if (y === 0) continue; // Skip axis
                
                const screenY = origin.y - y * scale;
                
                ctx.beginPath();
                ctx.moveTo(0, screenY);
                ctx.lineTo(width, screenY);
                ctx.stroke();
            }
        }
        
        // Draw polynomials
        config.polynomials.forEach((poly, polyIndex) => {
            ctx.beginPath();
            ctx.strokeStyle = poly.color || "#3498db";
            ctx.lineWidth = poly.lineWidth || 2;
            
            // Generate points for the polynomial
            const pointCount = width;
            const pointsArray = []; // Store points for later if we need to draw them
            
            for (let i = 0; i < pointCount; i++) {
                // Convert screen coordinates to mathematical coordinates
                const domain = config.domain;
                const mathX = domain.min + (domain.max - domain.min) * (i / pointCount);
                
                // Evaluate the polynomial
                const mathY = evaluatePolynomial(mathX, poly.coefficients, time);
                
                // Convert back to screen coordinates
                const screenX = origin.x + mathX * scale;
                const screenY = origin.y - mathY * scale;
                
                // Store the point
                pointsArray.push({ x: screenX, y: screenY });
                
                // Draw the polynomial
                if (i === 0) {
                    ctx.moveTo(screenX, screenY);
                } else {
                    ctx.lineTo(screenX, screenY);
                }
            }
            
            ctx.stroke();
            
            // Draw points if enabled
            if (config.showPoints) {
                // Only draw a reasonable number of points, not all of them
                const skipFactor = Math.floor(pointsArray.length / 25);
                
                for (let i = 0; i < pointsArray.length; i += skipFactor) {
                    const point = pointsArray[i];
                    
                    ctx.beginPath();
                    ctx.fillStyle = poly.color || "#3498db";
                    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Draw polynomial label if provided
            if (poly.label) {
                ctx.font = "14px Arial";
                ctx.fillStyle = poly.color || "#3498db";
                ctx.textAlign = "left";
                ctx.fillText(poly.label, 20, 30 + polyIndex * 20);
            }
        });

        // Finalize and return result
        const canvasImageData = ctx.getImageData(0, 0, width, height);
        
        // Copy the visualization onto our result
        for (let i = 0; i < resultImageData.data.length; i += 4) {
            // Only copy pixels that have been drawn on
            if (canvasImageData.data[i+3] > 0) {
                resultImageData.data[i] = canvasImageData.data[i];         // R
                resultImageData.data[i+1] = canvasImageData.data[i+1];     // G
                resultImageData.data[i+2] = canvasImageData.data[i+2];     // B
                resultImageData.data[i+3] = canvasImageData.data[i+3];     // A
            }
        }
        
        self.postMessage({
            segmentedImages: [resultImageData],
            debug: {
                time: time,
                config: config,
                message: `Displaying polynomial of degree ${config.degree}`
            }
        });

   
        } catch (error) {
        // Send detailed error information for debugging
        self.postMessage({
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
};