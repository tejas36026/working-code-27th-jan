self.onmessage = function(e) {
    const { imageData, params } = e.data;
    
    // Initialize counters for animations
    if (!self.animationCounter) {
        self.animationCounter = 0;
    }
    self.animationCounter++;
    
    try {
        // Validate image data
        if (!imageData || !imageData.data) {
            throw new Error('Invalid image data provided to worker');
        }
        
        const { width, height } = imageData;
        const resultImageData = new ImageData(width, height);
        resultImageData.data.set(imageData.data);
        
        // Create canvas for drawing
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        
        // Default configuration
        const defaultConfig = {
            mode: 'fourier',            // Default visualization mode
            animation: {
                enabled: true,
                speed: 0.01,
                frame: self.animationCounter
            },
            display: {
                grid: true,
                axes: true,
                labels: true,
                infoPanel: true,
                theme: 'light'          // 'light' or 'dark'
            },
            fourier: {
                targetFunction: 'square',    // 'square', 'sawtooth', 'triangle'
                maxTerms: 10,                // Maximum number of terms to show
                showIndividualTerms: true,   // Show individual sine waves
                animateTerms: true           // Gradually increase the number of terms
            },
            taylor: {
                function: 'exp',             // 'exp', 'sin', 'cos', 'log'
                center: 0,                   // Expansion point
                maxTerms: 7,                 // Maximum number of terms
                showIndividualTerms: true,   // Show individual polynomial terms
                animateTerms: true           // Gradually increase the number of terms
            },
            lissajous: {
                a: 3,                        // X frequency
                b: 2,                        // Y frequency
                delta: 0.5,                  // Phase difference
                showComponents: true,        // Show sine components
                animate: true                // Animate phase and frequencies
            },
            vector: {
                fieldType: 'radial',         // 'radial', 'rotational', 'saddle', 'spiral'
                density: 15,                 // Density of vectors
                showParticle: true,          // Show particle moving through field
                fieldStrength: 1.0           // Strength of the vector field
            },
            probability: {
                distribution: 'normal',      // 'normal', 'uniform', 'exponential', 'bimodal'
                samples: 1000,               // Number of samples for histogram
                showPDF: true,               // Show probability density function
                binCount: 40                 // Number of histogram bins
            },
            complex: {
                function: 'square',          // 'square', 'exp', 'inverse', 'sin'
                resolution: 0.7,             // Resolution of the visualization (0-1)
                showAxes: true               // Show real and imaginary axes
            },
            differential: {
                equation: 'harmonic',        // 'harmonic', 'predator-prey', 'vanderpol'
                showVectorField: true,       // Show vector field
                showTrajectories: true,      // Show solution curves
                parameterValue: 1.0          // Parameter for the equation
            }
        };
        
        // Merge with user config from params
        const userConfig = params?.config || {};
        
        // Deep merge of configuration
        const config = mergeConfigs(defaultConfig, userConfig);
        
        // Update config with current animation frame
        config.animation.frame = self.animationCounter;
        
        // Calculate animation time
        const time = config.animation.enabled ? 
            config.animation.frame * config.animation.speed : 0;
        
        // Set up the coordinate system
        const origin = { x: width / 2, y: height / 2 };
        const scale = Math.min(width, height) / 12;
        
        // Define theme colors
        const themes = {
            light: {
                background: 'white',
                gridLines: 'rgba(200, 200, 200, 0.3)',
                axes: '#555',
                text: '#333',
                primary: '#3498db',
                secondary: '#e74c3c',
                tertiary: '#2ecc71',
                accent1: '#9b59b6',
                accent2: '#f39c12',
                panelBackground: 'rgba(0, 0, 0, 0.7)',
                panelText: 'white'
            },
            dark: {
                background: '#1a1a1a',
                gridLines: 'rgba(100, 100, 100, 0.3)',
                axes: '#aaa',
                text: '#eee',
                primary: '#3498db',
                secondary: '#e74c3c',
                tertiary: '#2ecc71',
                accent1: '#9b59b6',
                accent2: '#f39c12',
                panelBackground: 'rgba(240, 240, 240, 0.8)',
                panelText: 'black'
            }
        };
        
        // Get current theme
        const theme = themes[config.display.theme] || themes.light;
        
        // Fill background
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, width, height);
        
        // Set up the drawing environment
        const drawEnv = {
            ctx,
            width,
            height,
            time,
            theme,
            scale,
            origin,
            config
        };
        
        // Draw grid and axes if enabled
        if (config.display.grid || config.display.axes) {
            drawCoordinateSystem(drawEnv);
        }
        
        // Execute the visualization based on mode
        switch (config.mode) {
            case 'fourier':
                drawFourierSeries(drawEnv);
                break;
                
            case 'taylor':
                drawTaylorSeries(drawEnv);
                break;
                
            case 'lissajous':
                drawLissajousFigures(drawEnv);
                break;
                
            case 'vector':
                drawVectorField(drawEnv);
                break;
                
            case 'probability':
                drawProbabilityDistributions(drawEnv);
                break;
                
            case 'complex':
                drawComplexFunctions(drawEnv);
                break;
                
            case 'differential':
                drawDifferentialEquations(drawEnv);
                break;
                
            default:
                drawFourierSeries(drawEnv);
        }
        
        // Finalize and return the result
        const canvasImageData = ctx.getImageData(0, 0, width, height);
        
        // Copy canvas data to result
        for (let i = 0; i < resultImageData.data.length; i += 4) {
            resultImageData.data[i] = canvasImageData.data[i];         // R
            resultImageData.data[i+1] = canvasImageData.data[i+1];     // G
            resultImageData.data[i+2] = canvasImageData.data[i+2];     // B
            resultImageData.data[i+3] = canvasImageData.data[i+3];     // A
        }
        
        // Send result back to main thread
        self.postMessage({
            segmentedImages: [resultImageData],
            debug: {
                mode: config.mode,
                time: time,
                frame: config.animation.frame,
                message: `Visualization: ${config.mode}`
            }
        });
        
    } catch (error) {
        // Send error information for debugging
        self.postMessage({
            error: {
                message: error.message,
                stack: error.stack
            }
        });
    }
};

// Helper function to deep merge configurations
function mergeConfigs(defaultConfig, userConfig) {
    const result = { ...defaultConfig };
    
    for (const key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && 
                typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null) {
                result[key] = mergeConfigs(defaultConfig[key], userConfig[key]);
            } else {
                result[key] = userConfig[key];
            }
        }
    }
    
    return result;
}

// Helper function to convert from math to screen coordinates
function mathToScreen(x, y, origin, scale) {
    return {
        x: origin.x + x * scale,
        y: origin.y - y * scale
    };
}

// Helper function to draw coordinate system (grid + axes)
function drawCoordinateSystem(env) {
    const { ctx, width, height, theme, scale, origin, config } = env;
    
    // Draw grid if enabled
    if (config.display.grid) {
        ctx.strokeStyle = theme.gridLines;
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = -5; x <= 5; x++) {
            if (x === 0 && config.display.axes) continue; // Skip axes
            
            const pos = mathToScreen(x, 0, origin, scale);
            ctx.beginPath();
            ctx.moveTo(pos.x, 0);
            ctx.lineTo(pos.x, height);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = -5; y <= 5; y++) {
            if (y === 0 && config.display.axes) continue; // Skip axes
            
            const pos = mathToScreen(0, y, origin, scale);
            ctx.beginPath();
            ctx.moveTo(0, pos.y);
            ctx.lineTo(width, pos.y);
            ctx.stroke();
        }
    }
    
    // Draw axes if enabled
    if (config.display.axes) {
        ctx.strokeStyle = theme.axes;
        ctx.lineWidth = 2;
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(width, origin.y);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, height);
        ctx.stroke();
        
        // Add axis labels and ticks
        if (config.display.labels) {
            ctx.fillStyle = theme.text;
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            
            // X-axis labels
            for (let x = -5; x <= 5; x++) {
                if (x === 0) continue; // Skip origin
                
                const pos = mathToScreen(x, 0, origin, scale);
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(pos.x, origin.y - 5);
                ctx.lineTo(pos.x, origin.y + 5);
                ctx.stroke();
                
                // Draw label
                ctx.fillText(x.toString(), pos.x, origin.y + 20);
            }
            
            // Y-axis labels
            for (let y = -5; y <= 5; y++) {
                if (y === 0) continue; // Skip origin
                
                const pos = mathToScreen(0, y, origin, scale);
                
                // Draw tick
                ctx.beginPath();
                ctx.moveTo(origin.x - 5, pos.y);
                ctx.lineTo(origin.x + 5, pos.y);
                ctx.stroke();
                
                // Draw label
                ctx.textAlign = 'right';
                ctx.fillText(y.toString(), origin.x - 10, pos.y + 5);
            }
            
            // Origin label
            ctx.textAlign = 'right';
            ctx.fillText('0', origin.x - 10, origin.y + 20);
        }
    }
}

// Draw an information panel
function drawInfoPanel(env, title, lines) {
    const { ctx, width, theme } = env;
    
    const panelWidth = 280;
    const lineHeight = 30;
    const panelHeight = lineHeight * (lines.length + 1);
    const padding = 20;
    
    // Draw panel background
    ctx.fillStyle = theme.panelBackground;
    ctx.fillRect(width - panelWidth - padding, padding, panelWidth, panelHeight);
    
    // Draw title
    ctx.fillStyle = theme.panelText;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, width - panelWidth - padding + 15, padding + 25);
    
    // Draw content lines
    ctx.font = '14px Arial';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(
            lines[i], 
            width - panelWidth - padding + 15, 
            padding + 25 + (i + 1) * lineHeight
        );
    }
}

// Fourier Series Visualization
function drawFourierSeries(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Fourier Series', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Building complex waveforms from simple sine waves', origin.x, 80);
    
    // Parameters
    const fourierConfig = config.fourier;
    const animationTerms = (fourierConfig.animateTerms) ? 
        Math.floor(time * 5) % fourierConfig.maxTerms + 1 : 
        fourierConfig.maxTerms;
    const numTerms = Math.min(animationTerms, fourierConfig.maxTerms);
    
    // Draw the target function
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
        const x = (i - origin.x) / scale;
        let y = 0;
        
        // Different target functions
        switch (fourierConfig.targetFunction) {
            case 'square':
                y = x % 2 < 1 ? 1 : -1;
                break;
            case 'sawtooth':
                y = 2 * ((x / 2) - Math.floor(0.5 + (x / 2)));
                break;
            case 'triangle':
                y = 2 * Math.abs(2 * ((x / 2) - Math.floor(0.5 + (x / 2)))) - 1;
                break;
        }
        
        const screenPos = mathToScreen(x, y, origin, scale);
        
        if (i === 0) {
            ctx.moveTo(screenPos.x, screenPos.y);
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.stroke();
    
    // Draw the Fourier approximation
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
        const x = (i - origin.x) / scale;
        
        // Calculate Fourier series based on the target function
        let y = 0;
        
        switch (fourierConfig.targetFunction) {
            case 'square':
                for (let n = 1; n <= numTerms; n += 2) {
                    y += (4 / (n * Math.PI)) * Math.sin(n * Math.PI * x);
                }
                break;
            case 'sawtooth':
                for (let n = 1; n <= numTerms; n++) {
                    y += (2 / (n * Math.PI)) * Math.sin(n * Math.PI * x) * Math.pow(-1, n+1);
                }
                break;
            case 'triangle':
                for (let n = 1; n <= numTerms; n += 2) {
                    y += (8 / (n * Math.PI) / (n * Math.PI)) * Math.sin(n * Math.PI * x) * Math.pow(-1, (n-1)/2);
                }
                break;
        }
        
        const screenPos = mathToScreen(x, y, origin, scale);
        
        if (i === 0) {
            ctx.moveTo(screenPos.x, screenPos.y);
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.stroke();
    
    // Draw individual terms if enabled
    if (fourierConfig.showIndividualTerms) {
        const termColors = [theme.tertiary, theme.accent1, theme.accent2];
        
        // Show up to 3 individual terms
        const individualTermCount = Math.min(3, numTerms);
        
        for (let termIdx = 0; termIdx < individualTermCount; termIdx++) {
            let n;
            
            // Get the term index based on target function
            switch (fourierConfig.targetFunction) {
                case 'square':
                    n = 1 + termIdx * 2;  // 1, 3, 5, ...
                    break;
                case 'sawtooth':
                    n = termIdx + 1;      // 1, 2, 3, ...
                    break;
                case 'triangle':
                    n = 1 + termIdx * 2;  // 1, 3, 5, ...
                    break;
            }
            
            ctx.strokeStyle = termColors[termIdx % termColors.length];
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            for (let i = 0; i < width; i++) {
                const x = (i - origin.x) / scale;
                let y = 0;
                
                // Calculate the term based on the target function
                switch (fourierConfig.targetFunction) {
                    case 'square':
                        y = (4 / (n * Math.PI)) * Math.sin(n * Math.PI * x);
                        break;
                    case 'sawtooth':
                        y = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * x) * Math.pow(-1, n+1);
                        break;
                    case 'triangle':
                        y = (8 / (n * Math.PI) / (n * Math.PI)) * Math.sin(n * Math.PI * x) * Math.pow(-1, (n-1)/2);
                        break;
                }
                
                const screenPos = mathToScreen(x, y, origin, scale);
                
                if (i === 0) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
            }
            
            ctx.stroke();
        }
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        let title = 'Fourier Series';
        let functionName;
        let equation;
        
        switch (fourierConfig.targetFunction) {
            case 'square':
                functionName = 'Square Wave';
                equation = 'f(x) = 4/π · Σ(sin((2n-1)πx)/(2n-1))';
                break;
            case 'sawtooth':
                functionName = 'Sawtooth Wave';
                equation = 'f(x) = 2/π · Σ((-1)^(n+1) · sin(nπx)/n)';
                break;
            case 'triangle':
                functionName = 'Triangle Wave';
                equation = 'f(x) = 8/π² · Σ((-1)^((n-1)/2) · sin(nπx)/n²)';
                break;
        }
        
        const lines = [
            `Function: ${functionName}`,
            `Number of terms: ${numTerms}`,
            `${equation}`,
            ``,
            `Red: Target function`,
            `Blue: Fourier approximation`,
            `Green/Purple: Individual terms`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Taylor Series Visualization
function drawTaylorSeries(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Taylor Series', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Approximating functions with polynomials', origin.x, 80);
    
    // Parameters
    const taylorConfig = config.taylor;
    const animationTerms = (taylorConfig.animateTerms) ? 
        Math.floor(time * 3) % taylorConfig.maxTerms + 1 : 
        taylorConfig.maxTerms;
    const numTerms = Math.min(animationTerms, taylorConfig.maxTerms);
    const centralPoint = taylorConfig.center;
    
    // Function definitions and their derivatives
    const functions = {
        exp: {
            fn: (x) => Math.exp(x),
            taylorTerm: (x, n) => {
                let term = 1;
                for (let i = 1; i <= n; i++) {
                    term *= (x - centralPoint) / i;
                }
                return term;
            },
            label: 'e^x',
            equation: 'e^x = Σ(x^n/n!)',
            domain: [-3, 3]
        },
        sin: {
            fn: (x) => Math.sin(x),
            taylorTerm: (x, n) => {
                if (n % 2 === 0) return 0; // Even terms are zero
                const power = n - (n % 2);
                const sign = (power / 2) % 2 === 0 ? 1 : -1;
                let term = sign;
                for (let i = 1; i <= n; i++) {
                    term *= (x - centralPoint) / i;
                }
                return term;
            },
            label: 'sin(x)',
            equation: 'sin(x) = Σ((-1)^n · x^(2n+1)/(2n+1)!)',
            domain: [-3 * Math.PI, 3 * Math.PI]
        },
        cos: {
            fn: (x) => Math.cos(x),
            taylorTerm: (x, n) => {
                if (n % 2 === 1) return 0; // Odd terms are zero
                const power = n - (n % 2);
                const sign = (power / 2) % 2 === 0 ? 1 : -1;
                let term = sign;
                for (let i = 1; i <= n; i++) {
                    term *= (x - centralPoint) / i;
                }
                return term;
            },
            label: 'cos(x)',
            equation: 'cos(x) = Σ((-1)^n · x^(2n)/(2n)!)',
            domain: [-3 * Math.PI, 3 * Math.PI]
        },
        log: {
            fn: (x) => Math.log(x + 1),
            taylorTerm: (x, n) => {
                if (n === 0) return 0;
                const sign = n % 2 === 1 ? 1 : -1;
                return sign * Math.pow(x - centralPoint, n) / n;
            },
            label: 'ln(1+x)',
            equation: 'ln(1+x) = Σ((-1)^(n+1) · x^n/n)',
            domain: [-0.9, 3]
        }
    };
    
    const selectedFunc = functions[taylorConfig.function] || functions.exp;
    
    // Draw the target function
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const [domainMin, domainMax] = selectedFunc.domain;
    let firstPoint = true;
    
    for (let i = 0; i < width; i++) {
        const x = domainMin + (domainMax - domainMin) * (i / width);
        
        // Evaluate the function
        let y;
        try {
            y = selectedFunc.fn(x);
            
            // Skip if out of reasonable range
            if (isNaN(y) || y > 5 || y < -5) continue;
            
            const screenPos = mathToScreen(x, y, origin, scale);
            
            if (firstPoint) {
                ctx.moveTo(screenPos.x, screenPos.y);
                firstPoint = false;
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        } catch (e) {
            // Skip errors (e.g., domain errors for log)
            continue;
        }
    }
    
    ctx.stroke();
    
    // Draw the Taylor approximation
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    firstPoint = true;
    
    for (let i = 0; i < width; i++) {
        const x = domainMin + (domainMax - domainMin) * (i / width);
        
        // Calculate Taylor series approximation
        let y = 0;
        for (let n = 0; n <= numTerms; n++) {
            y += selectedFunc.taylorTerm(x, n);
        }
        
        // Skip if out of reasonable range
        if (isNaN(y) || y > 5 || y < -5) continue;
        
        const screenPos = mathToScreen(x, y, origin, scale);
        
        if (firstPoint) {
            ctx.moveTo(screenPos.x, screenPos.y);
            firstPoint = false;
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.stroke();
    
    // Draw central point
    try {
        const centerY = selectedFunc.fn(centralPoint);
        const centerScreen = mathToScreen(centralPoint, centerY, origin, scale);
        
        ctx.fillStyle = theme.accent1;
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, 5, 0, Math.PI * 2);
        ctx.fill();
    } catch (e) {
        // Skip if center point is not in domain
    }
    
    // Draw individual terms if enabled
    if (taylorConfig.showIndividualTerms) {
        const termColors = [theme.tertiary, theme.accent1, theme.accent2];
        
        // Show up to 3 individual terms
        const individualTermCount = Math.min(3, numTerms);
        
        for (let termIdx = 0; termIdx < individualTermCount; termIdx++) {
            ctx.strokeStyle = termColors[termIdx % termColors.length];
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            let firstPoint = true;
            
            for (let i = 0; i < width; i++) {
                const x = domainMin + (domainMax - domainMin) * (i / width);
                
                // Calculate specific term
                const term = selectedFunc.taylorTerm(x, termIdx);
                
                // Skip if out of reasonable range
                if (isNaN(term) || term > 5 || term < -5) continue;
                
                const screenPos = mathToScreen(x, term, origin, scale);
                
                if (firstPoint) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
            }
            
            ctx.stroke();
        }
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        const title = 'Taylor Series';
        const lines = [
            `Function: ${selectedFunc.label}`,
            `Center: x = ${centralPoint}`,
            `Number of terms: ${numTerms + 1}`,
            `${selectedFunc.equation}`,
            ``,
            `Red: Original function`,
            `Blue: Taylor approximation`,
            `Green/Purple: Individual terms`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Lissajous Figures Visualization
function drawLissajousFigures(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Lissajous Figures', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Harmonic motion in two dimensions', origin.x, 80);
    
    // Parameters for Lissajous figure
    const lissajousConfig = config.lissajous;
    
    // If animation is enabled, cycle through different parameters
    let a, b, delta;
    
    if (lissajousConfig.animate) {
        a = 1 + Math.floor(time) % 5;
        b = 1 + Math.floor(time * 0.7) % 5;
        delta = time * Math.PI * 0.2;
    } else {
        a = lissajousConfig.a;
        b = lissajousConfig.b;
        delta = lissajousConfig.delta * Math.PI;
    }
    
    // Draw the Lissajous figure
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let t = 0; t < Math.PI * 20; t += 0.01) {
        const x = 3 * Math.sin(a * t + delta);
        const y = 3 * Math.sin(b * t);
        
        const screenPos = mathToScreen(x, y, origin, scale);
        
        if (t === 0) {
            ctx.moveTo(screenPos.x, screenPos.y);
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.stroke();
    
    // Draw the sine components if enabled
    if (lissajousConfig.showComponents) {
        // X component
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let t = -5; t <= 5; t += 0.01) {
            const x = t;
            const y = -4 + Math.sin(a * t + delta);
            
            const screenPos = mathToScreen(x, y, origin, scale);
            
            if (t === -5) {
                ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        
        ctx.stroke();
        
        // Y component
        ctx.strokeStyle = theme.tertiary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        for (let t = -5; t <= 5; t += 0.01) {
            const x = -4 + Math.sin(b * t);
            const y = t;
            
            const screenPos = mathToScreen(x, y, origin, scale);
            
            if (t === -5) {
                ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        
        ctx.stroke();
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        const title = 'Lissajous Figures';
        const lines = [
            `X frequency: ${a}`,
            `Y frequency: ${b}`,
            `Phase shift: ${(delta / Math.PI).toFixed(2)}π`,
            ``,
            `Parametric equations:`,
            `x = sin(${a}t + δ)`,
            `y = sin(${b}t)`,
            ``,
            `Blue: Lissajous curve`,
            `Red/Green: Component waves`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Vector Field Visualization
function drawVectorField(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Vector Fields', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Visualizing forces and gradients in 2D space', origin.x, 80);
    
    // Parameters
    const vectorConfig = config.vector;
    const density = vectorConfig.density;
    const maxLength = scale / 3 * vectorConfig.fieldStrength;
    
    // Choose vector field type
    let fieldType;
    if (vectorConfig.fieldType === 'cycle') {
        fieldType = Math.floor(time * 0.2) % 4;
    } else {
        switch (vectorConfig.fieldType) {
            case 'radial': fieldType = 0; break;
            case 'rotational': fieldType = 1; break;
            case 'saddle': fieldType = 2; break;
            case 'spiral': fieldType = 3; break;
            default: fieldType = 0;
        }
    }
    
    // Draw vector field
    for (let i = -Math.floor(density/2); i <= Math.floor(density/2); i++) {
        for (let j = -Math.floor(density/2); j <= Math.floor(density/2); j++) {
            const x = i * (width / density);
            const y = j * (height / density);
            
            const mathX = (x - origin.x) / scale;
            const mathY = -(y - origin.y) / scale;
            
            let dx = 0, dy = 0;
            
            // Different vector field types
            switch (fieldType) {
                case 0: // Radial field
                    dx = mathX;
                    dy = mathY;
                    break;
                    
                case 1: // Rotational field
                    dx = -mathY;
                    dy = mathX;
                    break;
                    
                case 2: // Saddle point
                    dx = mathX;
                    dy = -mathY;
                    break;
                    
                case 3: // Spiral sink
                    dx = mathX - 0.5 * mathY;
                    dy = 0.5 * mathX + mathY;
                    break;
            }
            
            // Normalize and scale
            const length = Math.sqrt(dx*dx + dy*dy);
            if (length > 0) {
                dx = dx / length * Math.min(length, 1);
                dy = dy / length * Math.min(length, 1);
            }
            
            // Add animation if enabled
            if (config.animation.enabled) {
                const animFactor = 0.8 + 0.2 * Math.sin(time * 3 + mathX * 2 + mathY * 2);
                dx *= animFactor;
                dy *= animFactor;
            }
            
            // Convert back to screen coordinates
            const screenDx = dx * maxLength;
            const screenDy = -dy * maxLength;
            
            // Calculate color based on vector magnitude
            const magnitude = Math.sqrt(dx*dx + dy*dy);
            const hue = (240 + 120 * magnitude) % 360;
            ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
            
            // Draw vector
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + screenDx, y + screenDy);
            ctx.stroke();
            
            // Draw arrowhead
            const angle = Math.atan2(screenDy, screenDx);
            const arrowSize = 5;
            
            ctx.beginPath();
            ctx.moveTo(x + screenDx, y + screenDy);
            ctx.lineTo(
                x + screenDx - arrowSize * Math.cos(angle - Math.PI/6),
                y + screenDy - arrowSize * Math.sin(angle - Math.PI/6)
            );
            ctx.lineTo(
                x + screenDx - arrowSize * Math.cos(angle + Math.PI/6),
                y + screenDy - arrowSize * Math.sin(angle + Math.PI/6)
            );
            ctx.closePath();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        }
    }
    
    // Draw a test particle moving through the field if enabled
    if (vectorConfig.showParticle) {
        const particleTime = time % 10;
        let particleX = 0, particleY = 0;
        
        // Integrate through the field to find particle position
        let dt = 0.1;
        let t = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        while (t < particleTime) {
            const mathX = particleX;
            const mathY = particleY;
            
            let dx = 0, dy = 0;
            
            // Different vector field types
            switch (fieldType) {
                case 0: // Radial field
                    dx = mathX;
                    dy = mathY;
                    break;
                    
                case 1: // Rotational field
                    dx = -mathY;
                    dy = mathX;
                    break;
                    
                case 2: // Saddle point
                    dx = mathX;
                    dy = -mathY;
                    break;
                    
                case 3: // Spiral sink
                    dx = mathX - 0.5 * mathY;
                    dy = 0.5 * mathX + mathY;
                    break;
            }
            
            // Update particle position
            particleX += dx * dt;
            particleY += dy * dt;
            
            const screenPos = mathToScreen(particleX, particleY, origin, scale);
            
            if (t === 0) {
                ctx.moveTo(screenPos.x, screenPos.y);
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
            
            t += dt;
        }
        
        ctx.stroke();
        
        // Draw current particle position
        const finalPos = mathToScreen(particleX, particleY, origin, scale);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(finalPos.x, finalPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        let fieldName, fieldEquation;
        
        switch (fieldType) {
            case 0:
                fieldName = "Radial Field";
                fieldEquation = "F(x,y) = (x, y)";
                break;
            case 1:
                fieldName = "Rotational Field";
                fieldEquation = "F(x,y) = (-y, x)";
                break;
            case 2:
                fieldName = "Saddle Point";
                fieldEquation = "F(x,y) = (x, -y)";
                break;
            case 3:
                fieldName = "Spiral Sink";
                fieldEquation = "F(x,y) = (x-0.5y, 0.5x+y)";
                break;
        }
        
        const title = 'Vector Fields';
        const lines = [
            `Field type: ${fieldName}`,
            `Vector field: ${fieldEquation}`,
            ``,
            `Color represents vector magnitude`,
            `Particle shows field flow`,
            `Time: ${(time % 10).toFixed(1)}s`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Probability Distributions Visualization
function drawProbabilityDistributions(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Probability Distributions', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Visualizing how random variables are distributed', origin.x, 80);
    
    // Parameters
    const probConfig = config.probability;
    let distributionType;
    
    if (probConfig.distribution === 'cycle') {
        distributionType = Math.floor(time * 0.3) % 4;
    } else {
        switch (probConfig.distribution) {
            case 'normal': distributionType = 0; break;
            case 'uniform': distributionType = 1; break;
            case 'exponential': distributionType = 2; break;
            case 'bimodal': distributionType = 3; break;
            default: distributionType = 0;
        }
    }
    
    // Set up vertical scale
    const verticalScale = scale * 0.5;
    
    // Generate random samples for histogram
    const sampleCount = probConfig.samples;
    const samples = [];
    
    // Function to generate random samples based on distribution
    function generateSamples() {
        samples.length = 0;
        
        // Use deterministic seed based on time for consistent animation
        const seedTime = Math.floor(time / 2);
        let seed = seedTime * 9301 + 49297;
        
        // Simple random number generator with seed
        function random() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }
        
        switch (distributionType) {
            case 0: // Normal distribution
                for (let i = 0; i < sampleCount; i++) {
                    // Box-Muller transform for normal distribution
                    const u1 = random();
                    const u2 = random();
                    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                    samples.push(z);
                }
                break;
                
            case 1: // Uniform distribution
                for (let i = 0; i < sampleCount; i++) {
                    // Uniform between -3 and 3
                    samples.push(-3 + random() * 6);
                }
                break;
                
            case 2: // Exponential distribution
                for (let i = 0; i < sampleCount; i++) {
                    // Exponential with rate parameter λ = 1
                    const lambda = 1;
                    samples.push(-Math.log(1 - random()) / lambda);
                }
                break;
                
            case 3: // Bimodal distribution
                for (let i = 0; i < sampleCount; i++) {
                    // Mixture of two normals
                    const u1 = random();
                    const u2 = random();
                    
                    if (random() < 0.5) {
                        // First normal centered at -1.5
                        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.5 - 1.5;
                        samples.push(z);
                    } else {
                        // Second normal centered at 1.5
                        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.5 + 1.5;
                        samples.push(z);
                    }
                }
                break;
        }
    }
    
    generateSamples();
    
    // Create histogram
    const binCount = probConfig.binCount;
    const binWidth = 6 / binCount; // -3 to 3 range
    const bins = new Array(binCount).fill(0);
    
    samples.forEach(sample => {
        const binIndex = Math.floor((sample + 3) / binWidth);
        if (binIndex >= 0 && binIndex < binCount) {
            bins[binIndex]++;
        }
    });
    
    // Normalize bin heights
    const maxBinHeight = Math.max(...bins);
    const normalizedBins = bins.map(bin => bin / maxBinHeight * 3);
    
    // Draw histogram
    ctx.fillStyle = theme.primary;
    
    for (let i = 0; i < binCount; i++) {
        const x = -3 + i * binWidth;
        const height = normalizedBins[i];
        
        const screenX = mathToScreen(x, 0, origin, scale).x;
        const screenY = origin.y;
        const screenWidth = binWidth * scale;
        const screenHeight = -height * verticalScale;
        
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    }
    
    // Draw probability density function (PDF) if enabled
    if (probConfig.showPDF) {
        ctx.strokeStyle = theme.secondary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        let firstPoint = true;
        
        for (let i = 0; i < width; i++) {
            const x = (i - origin.x) / scale;
            
            // Skip if outside visible range
            if (x < -3 || x > 3) continue;
            
            let y = 0;
            
            switch (distributionType) {
                case 0: // Normal PDF
                    y = Math.exp(-x*x/2) / Math.sqrt(2 * Math.PI);
                    break;
                    
                case 1: // Uniform PDF
                    y = (x >= -3 && x <= 3) ? 1/6 : 0;
                    break;
                    
                case 2: // Exponential PDF
                    const lambda = 1;
                    y = (x >= 0) ? lambda * Math.exp(-lambda * x) : 0;
                    break;
                    
                case 3: // Bimodal PDF
                    // Mixture of two normals
                    const sigma = 0.5;
                    const mu1 = -1.5;
                    const mu2 = 1.5;
                    y = 0.5 * (
                        Math.exp(-(x-mu1)*(x-mu1)/(2*sigma*sigma)) / (sigma * Math.sqrt(2 * Math.PI)) +
                        Math.exp(-(x-mu2)*(x-mu2)/(2*sigma*sigma)) / (sigma * Math.sqrt(2 * Math.PI))
                    );
                    break;
            }
            
            // Scale the PDF to match histogram height
            y = y * 3;
            
            const screenPos = mathToScreen(x, y, origin, scale);
            
            if (firstPoint) {
                ctx.moveTo(screenPos.x, screenPos.y);
                firstPoint = false;
            } else {
                ctx.lineTo(screenPos.x, screenPos.y);
            }
        }
        
        ctx.stroke();
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        let distName, distEquation, distProperties;
        
        switch (distributionType) {
            case 0:
                distName = "Normal Distribution";
                distEquation = "f(x) = e^(-x²/2) / √(2π)";
                distProperties = "Mean: 0, Variance: 1";
                break;
            case 1:
                distName = "Uniform Distribution";
                distEquation = "f(x) = 1/6 for x ∈ [-3,3]";
                distProperties = "Mean: 0, Variance: 3";
                break;
            case 2:
                distName = "Exponential Distribution";
                distEquation = "f(x) = e^(-x) for x ≥ 0";
                distProperties = "Mean: 1, Variance: 1";
                break;
            case 3:
                distName = "Bimodal Distribution";
                distEquation = "Mixture of two normals";
                distProperties = "Modes at x = -1.5 and x = 1.5";
                break;
        }
        
        const title = 'Probability Distribution';
        const lines = [
            `Distribution: ${distName}`,
            `PDF: ${distEquation}`,
            `${distProperties}`,
            `Sample size: ${sampleCount}`,
            ``,
            `Blue: Histogram`,
            `Red: Probability Density Function`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Complex Functions Visualization
function drawComplexFunctions(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Complex Functions', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Visualizing functions in the complex plane', origin.x, 80);
    
    // Parameters
    const complexConfig = config.complex;
    let functionType;
    
    if (complexConfig.function === 'cycle') {
        functionType = Math.floor(time * 0.3) % 4;
    } else {
        switch (complexConfig.function) {
            case 'square': functionType = 0; break;
            case 'exp': functionType = 1; break;
            case 'inverse': functionType = 2; break;
            case 'sin': functionType = 3; break;
            default: functionType = 0;
        }
    }
    
    // Create domain coloring visualization
    const size = Math.min(width, height) * complexConfig.resolution;
    const left = origin.x - size/2;
    const top = origin.y - size/2;
    
    const imgData = ctx.createImageData(size, size);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // Map to complex plane [-2,2] x [-2,2]
            const re = 4 * (x / size - 0.5);
            const im = 4 * (0.5 - y / size);
            
            // Evaluate complex function
            let resultRe = 0, resultIm = 0;
            
            // Add animation by rotating the input slightly
            let animRe = re, animIm = im;
            if (config.animation.enabled) {
                const angle = time * 0.1;
                animRe = re * Math.cos(angle) - im * Math.sin(angle);
                animIm = re * Math.sin(angle) + im * Math.cos(angle);
            }
            
            switch (functionType) {
                case 0: // z²
                    resultRe = animRe*animRe - animIm*animIm;
                    resultIm = 2 * animRe * animIm;
                    break;
                    
                case 1: // e^z
                    const expRe = Math.exp(animRe);
                    resultRe = expRe * Math.cos(animIm);
                    resultIm = expRe * Math.sin(animIm);
                    break;
                    
                case 2: // 1/z
                    const denom = animRe*animRe + animIm*animIm;
                    if (denom > 0.0001) {
                        resultRe = animRe / denom;
                        resultIm = -animIm / denom;
                    }
                    break;
                    
                case 3: // sin(z)
                    resultRe = Math.sin(animRe) * Math.cosh(animIm);
                    resultIm = Math.cos(animRe) * Math.sinh(animIm);
                    break;
            }
            
            // Convert to color using domain coloring
            // Get magnitude and phase
            const mag = Math.sqrt(resultRe*resultRe + resultIm*resultIm);
            const phase = Math.atan2(resultIm, resultRe);
            
            // Map magnitude to brightness using logarithmic scale
            const brightness = Math.min(1, 0.5 + 0.2 * Math.log(1 + mag));
            
            // Map phase to hue
            const hue = ((phase / Math.PI) * 180 + 180) % 360;
            
            // Convert HSV to RGB
            let r, g, b;
            
            const c = brightness;
            const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
            const m = 0;
            
            if (hue < 60) {
                r = c; g = x; b = 0;
            } else if (hue < 120) {
                r = x; g = c; b = 0;
            } else if (hue < 180) {
                r = 0; g = c; b = x;
            } else if (hue < 240) {
                r = 0; g = x; b = c;
            } else if (hue < 300) {
                r = x; g = 0; b = c;
            } else {
                r = c; g = 0; b = x;
            }
            
            r = (r + m) * 255;
            g = (g + m) * 255;
            b = (b + m) * 255;
            
            // Set pixel color
            const idx = (y * size + x) * 4;
            imgData.data[idx] = r;
            imgData.data[idx+1] = g;
            imgData.data[idx+2] = b;
            imgData.data[idx+3] = 255; // Alpha
        }
    }
    
    // Draw the image
    ctx.putImageData(imgData, left, top);
    
    // Draw axes over the image if enabled
    if (complexConfig.showAxes) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        
        // Real axis
        ctx.beginPath();
        ctx.moveTo(left, origin.y);
        ctx.lineTo(left + size, origin.y);
        ctx.stroke();
        
        // Imaginary axis
        ctx.beginPath();
        ctx.moveTo(origin.x, top);
        ctx.lineTo(origin.x, top + size);
        ctx.stroke();
        
        // Add axis labels
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Real axis labels
        for (let x = -2; x <= 2; x++) {
            if (x === 0) continue;
            
            const screenX = origin.x + x * (size / 4);
            ctx.fillText(x.toString(), screenX, origin.y + 15);
        }
        
        // Imaginary axis labels
        ctx.textAlign = 'right';
        for (let y = -2; y <= 2; y++) {
            if (y === 0) continue;
            
            const screenY = origin.y - y * (size / 4);
            ctx.fillText(y + 'i', origin.x - 5, screenY);
        }
        
        // Origin
        ctx.textAlign = 'right';
        ctx.fillText('0', origin.x - 5, origin.y + 15);
    }
    
    // Draw information panel
    if (config.display.infoPanel) {
        let funcName, funcEquation, funcDescription;
        
        switch (functionType) {
            case 0:
                funcName = "Square Function";
                funcEquation = "f(z) = z²";
                funcDescription = "Doubles angles, squares magnitude";
                break;
            case 1:
                funcName = "Exponential Function";
                funcEquation = "f(z) = e^z";
                funcDescription = "Periodic along imaginary axis";
                break;
            case 2:
                funcName = "Reciprocal Function";
                funcEquation = "f(z) = 1/z";
                funcDescription = "Inversion with singularity at origin";
                break;
            case 3:
                funcName = "Sine Function";
                funcEquation = "f(z) = sin(z)";
                funcDescription = "Complex periodic function";
                break;
        }
        
        const title = 'Complex Function';
        const lines = [
            `Function: ${funcName}`,
            `${funcEquation}`,
            `${funcDescription}`,
            ``,
            `Color represents phase angle`,
            `Brightness represents magnitude`,
            `Domain: [-2,2] × [-2,2]i`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Differential Equations Visualization
function drawDifferentialEquations(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    
    // Title and description
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Differential Equations', origin.x, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText('Visualizing solutions and phase portraits', origin.x, 80);
    
    // Parameters
    const diffConfig = config.differential;
    let equationType;
    
    if (diffConfig.equation === 'cycle') {
        equationType = Math.floor(time * 0.2) % 3;
    } else {
        switch (diffConfig.equation) {
            case 'harmonic': equationType = 0; break;
            case 'predator-prey': equationType = 1; break;
            case 'vanderpol': equationType = 2; break;
            default: equationType = 0;
        }
    }
    
    // Draw solution curves for differential equations
    switch (equationType) {
        case 0:
            // Simple harmonic oscillator: d²y/dt² + y = 0
            drawHarmonicOscillator(env);
            break;
            
        case 1:
            // Predator-prey model (Lotka-Volterra)
            drawPredatorPrey(env);
            break;
            
        case 2:
            // Van der Pol oscillator
            drawVanDerPol(env);
            break;
    }
}

// Simple Harmonic Oscillator
function drawHarmonicOscillator(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    const diffConfig = config.differential;
    
    // Phase portrait for harmonic oscillator
    // dy/dt = v, dv/dt = -y
    
    // Draw vector field if enabled
    if (diffConfig.showVectorField) {
        const density = 15;
        const maxLength = scale / 4;
        
        for (let i = -Math.floor(density/2); i <= Math.floor(density/2); i++) {
            for (let j = -Math.floor(density/2); j <= Math.floor(density/2); j++) {
                const x = i * (width / density);
                const y = j * (height / density);
                
                const mathX = (x - origin.x) / scale;  // Position (y in the ODE)
                const mathY = -(y - origin.y) / scale; // Velocity (v in the ODE)
                
                const dx = mathY;           // dy/dt = v
                const dy = -mathX;          // dv/dt = -y
                
                // Normalize and scale
                const length = Math.sqrt(dx*dx + dy*dy);
                if (length > 0) {
                    const normalizedDx = dx / length * Math.min(length, 1);
                    const normalizedDy = dy / length * Math.min(length, 1);
                    
                    // Convert back to screen coordinates
                    const screenDx = normalizedDx * maxLength;
                    const screenDy = -normalizedDy * maxLength;
                    
                    // Draw vector
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = `rgba(128, 128, 255, 0.5)`;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + screenDx, y + screenDy);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Draw several solution curves (phase trajectories) if enabled
    if (diffConfig.showTrajectories) {
        for (let amplitude = 0.5; amplitude <= 3; amplitude += 0.5) {
            ctx.strokeStyle = `hsla(${amplitude * 40}, 80%, 60%, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Parametric circle in phase space
            for (let t = 0; t <= 2 * Math.PI; t += 0.01) {
                const y = amplitude * Math.cos(t);
                const v = -amplitude * Math.sin(t);
                
                const screenPos = mathToScreen(y, v, origin, scale);
                
                if (t === 0) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
            }
            
            ctx.closePath();
            ctx.stroke();
        }
    }
    
    // Draw a moving solution
    const omega = 1; // Natural frequency
    const A = 2; // Amplitude
    
    // Position and velocity as functions of time
    const y = A * Math.cos(omega * time);
    const v = -A * omega * Math.sin(omega * time);
    
    // Position in phase space
    const particlePos = mathToScreen(y, v, origin, scale);
    
    // Draw particle
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(particlePos.x, particlePos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the time solution
    ctx.strokeStyle = theme.tertiary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const timeScale = scale / 5;
    
    for (let t = 0; t < 10; t += 0.01) {
        const x = t - 5;
        const y_t = A * Math.cos(omega * (time + x));
        
        const screenPos = { 
            x: origin.x + x * scale, 
            y: origin.y + 3 * scale - y_t * timeScale 
        };
        
        if (t === 0) {
            ctx.moveTo(screenPos.x, screenPos.y);
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.stroke();
    
    // Draw information panel
    if (config.display.infoPanel) {
        const title = 'Simple Harmonic Oscillator';
        const lines = [
            `Second-order ODE: d²y/dt² + y = 0`,
            `First-order system:`,
            `   dy/dt = v`,
            `   dv/dt = -y`,
            ``,
            `Energy is conserved: E = y² + v²`,
            `Solution: y(t) = A cos(t + φ)`,
            `Current: y = ${y.toFixed(2)}, v = ${v.toFixed(2)}`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Predator-Prey Model (Lotka-Volterra equations)
function drawPredatorPrey(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    const diffConfig = config.differential;
    
    // Parameters for the Lotka-Volterra model
    const alpha = 2/3;  // Prey growth rate
    const beta = 4/3;   // Predation rate
    const gamma = 1;    // Predator death rate
    const delta = 1;    // Reproduction rate of predators per prey
    
    // Draw vector field if enabled
    if (diffConfig.showVectorField) {
        const density = 15;
        const maxLength = scale / 4;
        
        for (let i = -Math.floor(density/2); i <= Math.floor(density/2); i++) {
            for (let j = -Math.floor(density/2); j <= Math.floor(density/2); j++) {
                const x = i * (width / density);
                const y = j * (height / density);
                
                const mathX = Math.max(0.1, (x - origin.x) / scale);  // Prey population
                const mathY = Math.max(0.1, -(y - origin.y) / scale); // Predator population
                
                const dx = alpha * mathX - beta * mathX * mathY;  // dx/dt
                const dy = delta * mathX * mathY - gamma * mathY;  // dy/dt
                
                // Normalize and scale
                const length = Math.sqrt(dx*dx + dy*dy);
                if (length > 0) {
                    const normalizedDx = dx / length * Math.min(length, 1);
                    const normalizedDy = dy / length * Math.min(length, 1);
                    
                    // Convert back to screen coordinates
                    const screenDx = normalizedDx * maxLength;
                    const screenDy = -normalizedDy * maxLength;
                    
                    // Draw vector
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = `rgba(128, 128, 255, 0.5)`;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + screenDx, y + screenDy);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Draw several solution curves (phase trajectories) if enabled
    if (diffConfig.showTrajectories) {
        const initialConditions = [
            { x: 0.5, y: 0.5 },
            { x: 1.0, y: 1.0 },
            { x: 1.5, y: 0.5 },
            { x: 0.5, y: 1.5 }
        ];
        
        initialConditions.forEach((initial, index) => {
            ctx.strokeStyle = `hsla(${index * 60}, 80%, 60%, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Integrate the ODE using Runge-Kutta 4th order method
            let x = initial.x;
            let y = initial.y;
            const dt = 0.05;
            const steps = 200;
            
            for (let i = 0; i < steps; i++) {
                const screenPos = mathToScreen(x, y, origin, scale);
                
                if (i === 0) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
                
                // Runge-Kutta 4th order integration
                const k1x = alpha * x - beta * x * y;
                const k1y = delta * x * y - gamma * y;
                
                const k2x = alpha * (x + dt * k1x / 2) - beta * (x + dt * k1x / 2) * (y + dt * k1y / 2);
                const k2y = delta * (x + dt * k1x / 2) * (y + dt * k1y / 2) - gamma * (y + dt * k1y / 2);
                
                const k3x = alpha * (x + dt * k2x / 2) - beta * (x + dt * k2x / 2) * (y + dt * k2y / 2);
                const k3y = delta * (x + dt * k2x / 2) * (y + dt * k2y / 2) - gamma * (y + dt * k2y / 2);
                
                const k4x = alpha * (x + dt * k3x) - beta * (x + dt * k3x) * (y + dt * k3y);
                const k4y = delta * (x + dt * k3x) * (y + dt * k3y) - gamma * (y + dt * k3y);
                
                x += dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
                y += dt * (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
                
                // Ensure populations stay positive
                x = Math.max(0.01, x);
                y = Math.max(0.01, y);
            }
            
            ctx.stroke();
        });
    }
    
    // Draw equilibrium point
    const eqX = gamma / delta;
    const eqY = alpha / beta;
    
    const eqPos = mathToScreen(eqX, eqY, origin, scale);
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(eqPos.x, eqPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = theme.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Equilibrium (${eqX.toFixed(2)}, ${eqY.toFixed(2)})`, eqPos.x + 10, eqPos.y);
    
    // Draw axis labels
    ctx.fillStyle = theme.text;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Prey Population (x)', origin.x, height - 20);
    
    ctx.save();
    ctx.translate(20, origin.y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Predator Population (y)', 0, 0);
    ctx.restore();
    
    // Draw information panel
    if (config.display.infoPanel) {
        const title = 'Lotka-Volterra Model';
        const lines = [
            `Predator-Prey System:`,
            `   dx/dt = αx - βxy`,
            `   dy/dt = δxy - γy`,
            ``,
            `Parameters:`,
            `   α = ${alpha} (prey growth)`,
            `   β = ${beta} (predation rate)`,
            `   γ = ${gamma} (predator death)`,
            `   δ = ${delta} (conversion rate)`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}

// Van der Pol Oscillator
function drawVanDerPol(env) {
    const { ctx, width, height, time, theme, scale, origin, config } = env;
    const diffConfig = config.differential;
    
    // Parameter for the Van der Pol oscillator
    const mu = diffConfig.parameterValue || 1.0;
    
    // Draw vector field if enabled
    if (diffConfig.showVectorField) {
        const density = 15;
        const maxLength = scale / 4;
        
        for (let i = -Math.floor(density/2); i <= Math.floor(density/2); i++) {
            for (let j = -Math.floor(density/2); j <= Math.floor(density/2); j++) {
                const x = i * (width / density);
                const y = j * (height / density);
                
                const mathX = (x - origin.x) / scale;  // Position (x in the ODE)
                const mathY = -(y - origin.y) / scale; // Velocity (y in the ODE)
                
                const dx = mathY;
                const dy = mu * (1 - mathX * mathX) * mathY - mathX;
                
                // Normalize and scale
                const length = Math.sqrt(dx*dx + dy*dy);
                if (length > 0) {
                    const normalizedDx = dx / length * Math.min(length, 1);
                    const normalizedDy = dy / length * Math.min(length, 1);
                    
                    // Convert back to screen coordinates
                    const screenDx = normalizedDx * maxLength;
                    const screenDy = -normalizedDy * maxLength;
                    
                    // Draw vector
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = `rgba(128, 128, 255, 0.5)`;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + screenDx, y + screenDy);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Draw several solution curves (phase trajectories) if enabled
    if (diffConfig.showTrajectories) {
        const initialConditions = [
            { x: 0.1, y: 0 },
            { x: 0.5, y: 0 },
            { x: 1.0, y: 0 },
            { x: 2.0, y: 0 },
            { x: 3.0, y: 0 }
        ];
        
        initialConditions.forEach((initial, index) => {
            ctx.strokeStyle = `hsla(${index * 60}, 80%, 60%, 0.8)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Integrate the ODE using Runge-Kutta 4th order method
            let x = initial.x;
            let y = initial.y;
            const dt = 0.05;
            const steps = 400;
            
            for (let i = 0; i < steps; i++) {
                const screenPos = mathToScreen(x, y, origin, scale);
                
                if (i === 0) {
                    ctx.moveTo(screenPos.x, screenPos.y);
                } else {
                    ctx.lineTo(screenPos.x, screenPos.y);
                }
                
                // Runge-Kutta 4th order integration
                const k1x = y;
                const k1y = mu * (1 - x * x) * y - x;
                
                const k2x = y + dt * k1y / 2;
                const k2y = mu * (1 - (x + dt * k1x / 2) * (x + dt * k1x / 2)) * (y + dt * k1y / 2) - (x + dt * k1x / 2);
                
                const k3x = y + dt * k2y / 2;
                const k3y = mu * (1 - (x + dt * k2x / 2) * (x + dt * k2x / 2)) * (y + dt * k2y / 2) - (x + dt * k2x / 2);
                
                const k4x = y + dt * k3y;
                const k4y = mu * (1 - (x + dt * k3x) * (x + dt * k3x)) * (y + dt * k3y) - (x + dt * k3x);
                
                x += dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
                y += dt * (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
            }
            
            ctx.stroke();
        });
    }
    
    // Draw limit cycle (approximate)
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    
    for (let t = 0; t <= 2 * Math.PI; t += 0.01) {
        const r = 2;
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        
        const screenPos = mathToScreen(x, y, origin, scale);
        
        if (t === 0) {
            ctx.moveTo(screenPos.x, screenPos.y);
        } else {
            ctx.lineTo(screenPos.x, screenPos.y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw equilibrium point at origin
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = theme.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Unstable equilibrium', origin.x + 10, origin.y);
    
    // Draw axis labels
    ctx.fillStyle = theme.text;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Position (x)', origin.x, height - 20);
    
    ctx.save();
    ctx.translate(20, origin.y);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Velocity (y)', 0, 0);
    ctx.restore();
    
    // Draw information panel
    if (config.display.infoPanel) {
        const title = 'Van der Pol Oscillator';
        const lines = [
            `Second-order ODE:`,
            `   ẍ - μ(1-x²)ẋ + x = 0`,
            ``,
            `First-order system:`,
            `   dx/dt = y`,
            `   dy/dt = μ(1-x²)y - x`,
            ``,
            `Parameter: μ = ${mu}`,
            `Stable limit cycle, unstable origin`
        ];
        
        drawInfoPanel(env, title, lines);
    }
}