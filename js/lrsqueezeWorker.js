console.log(" lrsqueeze worker")

const DEFAULT_CYCLE_LENGTH = 10; // Number of frames in the run cycle
const DEFAULT_FORWARD_LEAN_AMPLITUDE = 0.1; // Amplitude of the forward lean effect
const DEFAULT_VERTICAL_STRETCH_AMPLITUDE = 0.2; // Amplitude of the vertical stretch effect
const DEFAULT_HORIZONTAL_STRETCH_AMPLITUDE = 0.1; // Amplitude of the horizontal stretch effect
const DEFAULT_RUNNING_MOTION_AMPLITUDE = 0.1; // Amplitude of the running motion effect

let currentIteration = 0;

// Create a transparent ImageData object
function createTransparentImageData(width, height) {
    const buffer = new Uint8ClampedArray(width * height * 4);
    buffer.fill(0);
    return new ImageData(buffer, width, height);
}

// Calculate the bounds of a region
function getBounds(region, width) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < region.length; i++) {
        const x = region[i] % width;
        const y = Math.floor(region[i] / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    return { minX, maxX, minY, maxY };
}

// Apply running motion effects to the image
function applyRunningEffect(imageData, selectedRegions, t) {
    const { width, height } = imageData;
    const newImageData = createTransparentImageData(width, height);

    // Animation parameters
    const cycleLength = DEFAULT_CYCLE_LENGTH;
    const phase = (t * cycleLength) % 1; // Current phase of the run cycle
    const forwardLean = DEFAULT_FORWARD_LEAN_AMPLITUDE + 0.05 * Math.sin(phase * Math.PI * 2); // Forward lean effect
    const verticalStretch = 1 + DEFAULT_VERTICAL_STRETCH_AMPLITUDE * Math.sin(phase * Math.PI * 4); // Vertical stretch effect
    const horizontalStretch = 1 + DEFAULT_HORIZONTAL_STRETCH_AMPLITUDE * Math.sin(phase * Math.PI * 2); // Horizontal stretch effect
    const runningMotionAmplitude = DEFAULT_RUNNING_MOTION_AMPLITUDE; // Running motion effect

    // Copy original image data
    newImageData.data.set(imageData.data);

    // Process each region iteratively
    for (let regionIndex = 0; regionIndex < selectedRegions.length; regionIndex++) {
        const region = selectedRegions[regionIndex];
        const regionSet = new Set(region);

        // Get bounds for current region
        const { minX, maxX, minY, maxY } = getBounds(region, width);

        // Calculate expanded bounds to allow for all effects
        const padding = Math.ceil(Math.max(width, height) * (DEFAULT_FORWARD_LEAN_AMPLITUDE + DEFAULT_VERTICAL_STRETCH_AMPLITUDE + DEFAULT_HORIZONTAL_STRETCH_AMPLITUDE + DEFAULT_RUNNING_MOTION_AMPLITUDE));

        const expandedMinX = Math.max(0, minX - padding);
        const expandedMaxX = Math.min(width - 1, maxX + padding);
        const expandedMinY = Math.max(0, minY - padding);
        const expandedMaxY = Math.min(height - 1, maxY + padding);

        // Clear the original region in the destination
        for (let i = 0; i < region.length; i++) {
            const baseIndex = region[i] * 4;
            newImageData.data[baseIndex] = 0;
            newImageData.data[baseIndex + 1] = 0;
            newImageData.data[baseIndex + 2] = 0;
            newImageData.data[baseIndex + 3] = 0;
        }

        // Process expanded area for all effects
        for (let y = expandedMinY; y <= expandedMaxY; y++) {
            for (let x = expandedMinX; x <= expandedMaxX; x++) {
                // Convert to normalized space (-0.5 to 0.5)
                let nx = (x / width) - 0.5;
                let ny = (y / height) - 0.5;

                // Apply horizontal and vertical stretch
                nx *= horizontalStretch;
                ny *= verticalStretch;

                // Apply forward lean
                nx += ny * forwardLean;

                // Apply running motion
                nx += runningMotionAmplitude * Math.sin(ny * Math.PI * 2 + phase * Math.PI * 2);
                ny += runningMotionAmplitude * 0.5 * Math.sin(nx * Math.PI * 4 + phase * Math.PI * 4);

                // Convert back to pixel coordinates
                let sourceX = (nx + 0.5) * width;
                let sourceY = (ny + 0.5) * height;

                // Ensure sourceX and sourceY are within bounds
                sourceX = Math.max(0, Math.min(width - 1, sourceX));
                sourceY = Math.max(0, Math.min(height - 1, sourceY));

                // Check if the source pixel is in bounds
                if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                    const sourcePixelX = Math.floor(sourceX);
                    const sourcePixelY = Math.floor(sourceY);
                    const sourceIndex = sourcePixelY * width + sourcePixelX;

                    // Only copy if source pixel was in the original region
                    if (regionSet.has(sourceIndex)) {
                        const targetIndex = (y * width + x) * 4;
                        const sourceDataIndex = sourceIndex * 4;

                        // Copy pixel data
                        newImageData.data[targetIndex] = imageData.data[sourceDataIndex];
                        newImageData.data[targetIndex + 1] = imageData.data[sourceDataIndex + 1];
                        newImageData.data[targetIndex + 2] = imageData.data[sourceDataIndex + 2];
                        newImageData.data[targetIndex + 3] = imageData.data[sourceDataIndex + 3];
                    }
                }
            }
        }
    }

    return newImageData;
}

// Handle messages from the main thread
self.onmessage = function(e) {
    try {
        const {
            imageData,
            selectedRegions,
            value,
            reset,
            cycleLength = DEFAULT_CYCLE_LENGTH,
            forwardLeanAmplitude = DEFAULT_FORWARD_LEAN_AMPLITUDE,
            verticalStretchAmplitude = DEFAULT_VERTICAL_STRETCH_AMPLITUDE,
            horizontalStretchAmplitude = DEFAULT_HORIZONTAL_STRETCH_AMPLITUDE,
            runningMotionAmplitude = DEFAULT_RUNNING_MOTION_AMPLITUDE
        } = e.data;
console.log('e.data :>> ', e.data);
        // Reset the iteration counter if requested
        if (reset) {
            currentIteration = 0;
        }

        let resultImageData;
        let progress;

        // Apply effects if regions are selected
        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            resultImageData = applyRunningEffect(imageData, selectedRegions, value);
            currentIteration = (currentIteration + 1) % cycleLength;
            progress = currentIteration / cycleLength;
        } else {
            // Return the original image data if no regions are selected
            resultImageData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
            progress = 1;
        }

        // Send the result back to the main thread
        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress
        }, [resultImageData.data.buffer]);

    } catch (error) {
        // Handle errors and send them back to the main thread
        self.postMessage({
            error: `Animation error: ${error.message}`,
            isComplete: true,
            stack: error.stack
        });
    }
};
