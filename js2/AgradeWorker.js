self.onmessage = function (e) {
    const { imageData } = e.data;
    
    const polyConfig = {
        degree: 4,                 
        showPoints: true,
        showAxes: true,
        animation: {
            enabled: true,
            speed: 0.01
        },
        domain: {
            min: -5,
            max: 5
        },
        range: {
            min: -5,
            max: 5
        },
        grid: true,
        customPolynomials: [],     // Allow for custom polynomial input
        derivatives: {
            show: true,            // Show derivative curves
            count: 1               // Number of derivatives to show
        },
        integral: {
            show: true,            // Show integral curve
            constant: 0            // Integration constant
        },
        roots: {
            show: true,            // Show polynomial roots
            highlight: true        // Highlight roots on graph
        },
        critical: {
            show: true             // Show critical points (where derivative = 0)
        },
        inflection: {
            show: true             // Show inflection points (where second derivative = 0)
        },
        zoom: 1.0                  // Zoom level
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
        
        // Create a configuration with defaults that can be overridden
        const config = {
            degree: userConfig.degree || 2,
            showPoints: userConfig.showPoints !== undefined ? userConfig.showPoints : true,
            showAxes: userConfig.showAxes !== undefined ? userConfig.showAxes : true,
            animation: {
                enabled: userConfig.animation?.enabled !== undefined ? userConfig.animation.enabled : true,
                speed: userConfig.animation?.speed || 0.01
            },
            domain: {
                min: userConfig.domain?.min || -5,
                max: userConfig.domain?.max || 5
            },
            range: {
                min: userConfig.range?.min || -5,
                max: userConfig.range?.max || 5
            },
            grid: userConfig.grid !== undefined ? userConfig.grid : true,
            customPolynomials: userConfig.customPolynomials || [],
            derivatives: {
                show: userConfig.derivatives?.show !== undefined ? userConfig.derivatives.show : true,
                count: userConfig.derivatives?.count || 1
            },
            integral: {
                show: userConfig.integral?.show !== undefined ? userConfig.integral.show : true,
                constant: userConfig.integral?.constant || 0
            },
            roots: {
                show: userConfig.roots?.show !== undefined ? userConfig.roots.show : true,
                highlight: userConfig.roots?.highlight !== undefined ? userConfig.roots.highlight : true
            },
            critical: {
                show: userConfig.critical?.show !== undefined ? userConfig.critical.show : true
            },
            inflection: {
                show: userConfig.inflection?.show !== undefined ? userConfig.inflection.show : true
            },
            zoom: userConfig.zoom || 1.0
        };
        
        // Generate appropriate coefficients based on the requested degree
        function generatePolynomialsForDegree(degree) {
            const polynomials = [];
            
            // Use custom polynomials if provided
            if (config.customPolynomials.length > 0) {
                return config.customPolynomials;
            }
            
            // Generate a polynomial with the specified degree
            const mainPoly = {
                coefficients: Array(degree + 1).fill(0),
                color: "#3498db",
                lineWidth: 2
            };
            
            // Generate meaningful coefficients for the specified degree
            if (degree === 0) {
                // Constant function
                mainPoly.coefficients = [2];
                mainPoly.color = "#e74c3c";  // Red
            } else if (degree === 1) {
                // Linear function (ax + b)
                mainPoly.coefficients = [-1, 1];  // f(x) = x - 1
                mainPoly.color = "#2ecc71";  // Green
            } else if (degree === 2) {
                // Quadratic function (ax² + bx + c)
                mainPoly.coefficients = [-2, 0, 1];  // f(x) = x² - 2
                mainPoly.color = "#3498db";  // Blue
            } else if (degree === 3) {
                // Cubic function
                mainPoly.coefficients = [0, -1, 0, 0.2];  // f(x) = 0.2x³ - x
                mainPoly.color = "#9b59b6";  // Purple
            } else if (degree === 4) {
                // Quartic function
                mainPoly.coefficients = [1, 0, -2, 0, 0.1];  // f(x) = 0.1x⁴ - 2x² + 1
                mainPoly.color = "#f39c12";  // Orange
            } else if (degree === 5) {
                // Quintic function
                mainPoly.coefficients = [0, 1, 0, -0.5, 0, 0.05];  // f(x) = 0.05x⁵ - 0.5x³ + x
                mainPoly.color = "#1abc9c";  // Teal
            } else {
                // For higher degrees, create a more interesting polynomial
                for (let i = 0; i <= degree; i++) {
                    // Alternating coefficients with decreasing magnitude for higher powers
                    const sign = i % 2 === 0 ? 1 : -1;
                    const magnitude = (i === degree) ? 1 / Math.pow(10, Math.floor(degree / 2)) : (1 / (i + 1));
                    mainPoly.coefficients[i] = sign * magnitude;
                }
                mainPoly.color = "#34495e";  // Dark blue
            }
            
            // Create a label for the polynomial
            mainPoly.label = createPolynomialLabel(mainPoly.coefficients);
            
            // Add the main polynomial
            polynomials.push(mainPoly);
            
            return polynomials;
        }
        
        // Create a formatted label for a polynomial
        function createPolynomialLabel(coefficients) {
            const degree = coefficients.length - 1;
            let degreeNames = ["Constant", "Linear", "Quadratic", "Cubic", "Quartic", "Quintic"];
            let degreeName = degree <= 5 ? degreeNames[degree] : `Degree ${degree}`;
            
            // Create a new label based on the coefficients
            let terms = [];
            
            coefficients.forEach((coeff, i) => {
                if (coeff === 0) return; // Skip zero coefficients
                
                let term = "";
                let absCoeff = Math.abs(coeff);
                let formattedCoeff = absCoeff.toFixed(2).replace(/\.00$/, "").replace(/\.(\d)0$/, ".$1");
                
                // Format the coefficient
                if (i === 0) {
                    // Constant term
                    term = `${formattedCoeff}`;
                } else if (i === 1) {
                    // Linear term
                    term = absCoeff === 1 ? "x" : `${formattedCoeff}x`;
                } else {
                    // Higher powers
                    term = absCoeff === 1 ? `x^${i}` : `${formattedCoeff}x^${i}`;
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
        
        // Compute derivative of a polynomial
        function computeDerivative(coefficients) {
            if (coefficients.length <= 1) {
                return [0]; // Derivative of constant is 0
            }
            
            const derivative = [];
            for (let i = 1; i < coefficients.length; i++) {
                derivative.push(i * coefficients[i]);
            }
            
            return derivative;
        }
        
        // Compute all derivatives up to the specified count
        function computeDerivatives(coefficients, count) {
            const derivatives = [];
            let currentCoeffs = [...coefficients];
            
            for (let i = 0; i < count; i++) {
                currentCoeffs = computeDerivative(currentCoeffs);
                derivatives.push({
                    coefficients: currentCoeffs,
                    color: `rgba(255, 0, 0, ${0.7 - i * 0.2})`,
                    lineWidth: 1.5,
                    label: `Derivative ${i+1}`
                });
                
                // If we've reached a constant, stop computing derivatives
                if (currentCoeffs.length <= 1) break;
            }
            
            return derivatives;
        }
        
        // Compute integral of a polynomial
        function computeIntegral(coefficients, constant = 0) {
            const integral = [constant]; // Add integration constant
            
            for (let i = 0; i < coefficients.length; i++) {
                integral.push(coefficients[i] / (i + 1));
            }
            
            return integral;
        }
        
        // Find roots of a polynomial using numerical methods
        // This uses a basic approach - for production code, use more robust methods
        function findRoots(coefficients) {
            // For degree 1 (linear), analytical solution
            if (coefficients.length === 2) {
                if (coefficients[1] === 0) return []; // No solution for 0x + b = 0 where b ≠ 0
                return [-coefficients[0] / coefficients[1]];
            }
            
            // For degree 2 (quadratic), use quadratic formula
            if (coefficients.length === 3) {
                const a = coefficients[2];
                const b = coefficients[1];
                const c = coefficients[0];
                
                if (a === 0) return findRoots([c, b]); // Degrade to linear case
                
                const discriminant = b*b - 4*a*c;
                if (discriminant < 0) return []; // No real roots
                
                if (discriminant === 0) {
                    return [-b / (2*a)]; // Single root
                }
                
                // Two roots
                return [
                    (-b + Math.sqrt(discriminant)) / (2*a),
                    (-b - Math.sqrt(discriminant)) / (2*a)
                ];
            }
            
            // For higher degrees, use numerical approach
            const roots = [];
            const samples = 1000;
            const domain = config.domain;
            let lastValue = evaluatePolynomial(domain.min, coefficients);
            
            // Sample points across the domain to find sign changes (roots)
            for (let i = 1; i <= samples; i++) {
                const x = domain.min + (domain.max - domain.min) * (i / samples);
                const value = evaluatePolynomial(x, coefficients);
                
                // If sign changes, a root exists between last point and current point
                if (lastValue * value <= 0 && !(lastValue === 0 && value === 0)) {
                    // Use bisection method to refine the root
                    const root = findRootBisection(
                        x - (domain.max - domain.min) / samples,
                        x,
                        coefficients
                    );
                    roots.push(root);
                }
                
                lastValue = value;
            }
            
            return roots;
        }
        
        // Find root using bisection method
        function findRootBisection(a, b, coefficients, tolerance = 1e-10, maxIterations = 100) {
            let fa = evaluatePolynomial(a, coefficients);
            let fb = evaluatePolynomial(b, coefficients);
            
            // Ensure there's a sign change
            if (fa * fb > 0) {
                return null;
            }
            
            let c, fc;
            let iterations = 0;
            
            while ((b - a) > tolerance && iterations < maxIterations) {
                c = (a + b) / 2;
                fc = evaluatePolynomial(c, coefficients);
                
                if (Math.abs(fc) < tolerance) {
                    break; // Found root
                }
                
                if (fa * fc < 0) {
                    b = c;
                    fb = fc;
                } else {
                    a = c;
                    fa = fc;
                }
                
                iterations++;
            }
            
            return (a + b) / 2;
        }
        
        // Find critical points (where derivative = 0)
        function findCriticalPoints(coefficients) {
            const derivative = computeDerivative(coefficients);
            return findRoots(derivative);
        }
        
        // Find inflection points (where second derivative = 0)
        function findInflectionPoints(coefficients) {
            const firstDerivative = computeDerivative(coefficients);
            const secondDerivative = computeDerivative(firstDerivative);
            return findRoots(secondDerivative);
        }
        
        // Generate additional curves and features
        function enhancePolynomials(polynomials) {
            const enhanced = [...polynomials];
            const mainPoly = polynomials[0];
            
            // Add derivatives if enabled
            if (config.derivatives.show && config.derivatives.count > 0) {
                const derivatives = computeDerivatives(
                    mainPoly.coefficients, 
                    config.derivatives.count
                );
                enhanced.push(...derivatives);
            }
            
            // Add integral if enabled
            if (config.integral.show) {
                const integral = {
                    coefficients: computeIntegral(mainPoly.coefficients, config.integral.constant),
                    color: "rgba(0, 128, 255, 0.7)",
                    lineWidth: 1.5,
                    label: "Integral"
                };
                enhanced.push(integral);
            }
            
            return enhanced;
        }
        
        // Generate the polynomials based on the requested degree
        config.polynomials = userConfig.polynomials || 
                            generatePolynomialsForDegree(config.degree);
        
        // Enhance polynomials with derivatives, integrals, etc.
        config.polynomials = enhancePolynomials(config.polynomials);

        // Animation time
        const time = config.animation.enabled ? self.animationCounter * config.animation.speed : 0;

        // Calculate the screen transformation parameters
        const origin = {
            x: width / 2,
            y: height / 2
        };
        
        const scaleX = (width * config.zoom) / (config.domain.max - config.domain.min);
        const scaleY = (height * config.zoom) / (config.range.max - config.range.min);
        
        // Transform mathematical coordinates to screen coordinates
        function mathToScreen(x, y) {
            return {
                x: origin.x + (x - (config.domain.min + config.domain.max) / 2) * scaleX,
                y: origin.y - (y - (config.range.min + config.range.max) / 2) * scaleY
            };
        }
        
        // Transform screen coordinates to mathematical coordinates
        function screenToMath(x, y) {
            return {
                x: (x - origin.x) / scaleX + (config.domain.min + config.domain.max) / 2,
                y: -((y - origin.y) / scaleY) + (config.range.min + config.range.max) / 2
            };
        }
        
        // Draw coordinate system if enabled
        if (config.showAxes) {
            // Draw grid if enabled
            if (config.grid) {
                ctx.strokeStyle = "rgba(200, 200, 200, 0.2)";
                ctx.lineWidth = 0.5;
                
                // Vertical grid lines
                for (let x = Math.ceil(config.domain.min); x <= config.domain.max; x++) {
                    if (x === 0) continue; // Skip axis
                    
                    const screenX = mathToScreen(x, 0).x;
                    
                    ctx.beginPath();
                    ctx.moveTo(screenX, 0);
                    ctx.lineTo(screenX, height);
                    ctx.stroke();
                }
                
                // Horizontal grid lines
                for (let y = Math.ceil(config.range.min); y <= config.range.max; y++) {
                    if (y === 0) continue; // Skip axis
                    
                    const screenY = mathToScreen(0, y).y;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, screenY);
                    ctx.lineTo(width, screenY);
                    ctx.stroke();
                }
            }
            
            // Draw axes
            ctx.beginPath();
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 1;
            
            // X-axis (only if visible in range)
            if (config.range.min <= 0 && config.range.max >= 0) {
                const axisY = mathToScreen(0, 0).y;
                ctx.moveTo(0, axisY);
                ctx.lineTo(width, axisY);
            }
            
            // Y-axis (only if visible in domain)
            if (config.domain.min <= 0 && config.domain.max >= 0) {
                const axisX = mathToScreen(0, 0).x;
                ctx.moveTo(axisX, 0);
                ctx.lineTo(axisX, height);
            }
            
            ctx.stroke();
            
            // Draw tick marks and labels
            ctx.font = "12px Arial";
            ctx.fillStyle = "#777";
            ctx.textAlign = "center";
            
            // X-axis ticks and labels
            const xStep = calculateTickStep(config.domain.max - config.domain.min);
            for (let x = Math.ceil(config.domain.min / xStep) * xStep; x <= config.domain.max; x += xStep) {
                if (Math.abs(x) < 1e-10) continue; // Skip origin
                
                const screenPos = mathToScreen(x, 0);
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(screenPos.x, screenPos.y - 5);
                ctx.lineTo(screenPos.x, screenPos.y + 5);
                ctx.stroke();
                
                // Draw label
                ctx.fillText(x.toFixed(xStep < 1 ? 1 : 0), screenPos.x, screenPos.y + 20);
            }
            
            // Y-axis ticks and labels
            const yStep = calculateTickStep(config.range.max - config.range.min);
            for (let y = Math.ceil(config.range.min / yStep) * yStep; y <= config.range.max; y += yStep) {
                if (Math.abs(y) < 1e-10) continue; // Skip origin
                
                const screenPos = mathToScreen(0, y);
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(screenPos.x - 5, screenPos.y);
                ctx.lineTo(screenPos.x + 5, screenPos.y);
                ctx.stroke();
                
                // Draw label
                ctx.textAlign = "right";
                ctx.fillText(y.toFixed(yStep < 1 ? 1 : 0), screenPos.x - 10, screenPos.y + 4);
            }
            
            // Draw origin label
            const originPos = mathToScreen(0, 0);
            ctx.textAlign = "right";
            ctx.fillText("0", originPos.x - 10, originPos.y + 20);
        }
        
        // Calculate appropriate tick step based on range
        function calculateTickStep(range) {
            const baseTicks = 10; // Target number of ticks
            const roughStep = range / baseTicks;
            
            // Find a "nice" step value (1, 2, 5, 10, etc.)
            const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const normalizedStep = roughStep / magnitude;
            
            let step;
            if (normalizedStep < 1.5) {
                step = 1 * magnitude;
            } else if (normalizedStep < 3.5) {
                step = 2 * magnitude;
            } else if (normalizedStep < 7.5) {
                step = 5 * magnitude;
            } else {
                step = 10 * magnitude;
            }
            
            return step;
        }

        // Polynomial evaluation function
        function evaluatePolynomial(x, coefficients, time = 0) {
            let result = 0;
            
            // Using Horner's method for polynomial evaluation
            for (let i = coefficients.length - 1; i >= 0; i--) {
                // Add subtle animation to coefficients if enabled
                const coeff = coefficients[i] * (config.animation.enabled ? 
                    (1 + 0.1 * Math.sin(time * (i + 1) * 0.5)) : 1);
                    
                result = result * x + coeff;
            }
            
            return result;
        }

        // Find roots for the main polynomial
        let roots = [];
        let criticalPoints = [];
        let inflectionPoints = [];
        
        if (config.polynomials.length > 0) {
            const mainPoly = config.polynomials[0];
            
            // Find roots if enabled
            if (config.roots.show) {
                roots = findRoots(mainPoly.coefficients);
            }
            
            // Find critical points if enabled
            if (config.critical.show) {
                criticalPoints = findCriticalPoints(mainPoly.coefficients);
            }
            
            // Find inflection points if enabled
            if (config.inflection.show) {
                inflectionPoints = findInflectionPoints(mainPoly.coefficients);
            }
        }

        // Draw each polynomial
        config.polynomials.forEach((poly, polyIndex) => {
            ctx.beginPath();
            ctx.strokeStyle = poly.color || "#3498db";
            ctx.lineWidth = poly.lineWidth || 2;
            
            // Generate points for the polynomial
            const pointCount = width;
            const pointsArray = []; // Store points for later if we need to draw them
            let lastY = null;
            let isFirstPoint = true;
            
            for (let i = 0; i < pointCount; i++) {
                // Convert screen coordinates to mathematical coordinates
                const mathX = config.domain.min + (config.domain.max - config.domain.min) * (i / pointCount);
                
                // Evaluate the polynomial
                const mathY = evaluatePolynomial(mathX, poly.coefficients, time);
                
                // Only plot if within range
                if (mathY >= config.range.min && mathY <= config.range.max) {
                    // Convert to screen coordinates
                    const screenPos = mathToScreen(mathX, mathY);
                    
                    // Handle discontinuities (large jumps)
                    if (!isFirstPoint && lastY !== null) {
                        const jump = Math.abs(mathY - lastY);
                        if (jump > (config.range.max - config.range.min) / 10) {
                            // This is a large jump, break the line
                            ctx.stroke();
                            ctx.beginPath();
                            isFirstPoint = true;
                        }
                    }
                    
                    // Store the point
                    pointsArray.push(screenPos);
                    
                    // Draw the polynomial
                    if (isFirstPoint) {
                        ctx.moveTo(screenPos.x, screenPos.y);
                        isFirstPoint = false;
                    } else {
                        ctx.lineTo(screenPos.x, screenPos.y);
                    }
                    
                    lastY = mathY;
                } else {
                    // Outside of range, break the line
                    if (!isFirstPoint) {
                        ctx.stroke();
                        ctx.beginPath();
                        isFirstPoint = true;
                    }
                    lastY = null;
                }
            }
            
            ctx.stroke();
            
            // Draw points if enabled
            if (config.showPoints && pointsArray.length > 0) {
                // Only draw a reasonable number of points, not all of them
                const skipFactor = Math.max(1, Math.floor(pointsArray.length / 25));
                
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
        
        // Draw roots if enabled and found
        if (config.roots.show && roots.length > 0) {
            ctx.fillStyle = "#e74c3c";  // Red for roots
            
            roots.forEach(root => {
                const screenPos = mathToScreen(root, 0);
                
                // Draw root point
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw label
                ctx.fillText(`Root: ${root.toFixed(2)}`, screenPos.x + 10, screenPos.y - 10);
            });
        }
        
        // Draw critical points if enabled and found
        if (config.critical.show && criticalPoints.length > 0) {
            ctx.fillStyle = "#f39c12";  // Orange for critical points
            
            criticalPoints.forEach(cp => {
                // Only draw if within domain
                if (cp >= config.domain.min && cp <= config.domain.max) {
                    // Calculate y-value
                    const y = evaluatePolynomial(cp, config.polynomials[0].coefficients, time);
                    
                    // Only draw if within range
                    if (y >= config.range.min && y <= config.range.max) {
                        const screenPos = mathToScreen(cp, y);
                        
                        // Draw critical point
                        ctx.beginPath();
                        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Draw label
                        ctx.fillText(`Critical: (${cp.toFixed(2)}, ${y.toFixed(2)})`, 
                            screenPos.x + 10, screenPos.y - 10);
                    }
                }
            });
        }
        
        // Draw inflection points if enabled and found
        if (config.inflection.show && inflectionPoints.length > 0) {
            ctx.fillStyle = "#9b59b6";  // Purple for inflection points
            
            inflectionPoints.forEach(ip => {
                // Only draw if within domain
                if (ip >= config.domain.min && ip <= config.domain.max) {
                    // Calculate y-value
                    const y = evaluatePolynomial(ip, config.polynomials[0].coefficients, time);
                    
                    // Only draw if within range
                    if (y >= config.range.min && y <= config.range.max) {
                        const screenPos = mathToScreen(ip, y);
                        
                        // Draw inflection point
                        ctx.beginPath();
                        ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Draw label
                        ctx.fillText(`Inflection: (${ip.toFixed(2)}, ${y.toFixed(2)})`, 
                            screenPos.x + 10, screenPos.y + 20);
                    }
                }
            });
        }

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
                message: `Displaying polynomial of degree ${config.degree}`,
                stats: {
                    roots: roots,
                    criticalPoints: criticalPoints,
                    inflectionPoints: inflectionPoints
                }
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