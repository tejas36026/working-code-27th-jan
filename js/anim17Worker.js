const DEFAULT_ITERATIONS = 120;
const APPLE_LOGO_URL = 'path/to/apple-logo.png'; // Replace with the actual path to the Apple logo image

let appleLogoImage = null;
let currentIteration = 0;

function loadAppleLogo() {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = APPLE_LOGO_URL;
        img.onload = () => {
            appleLogoImage = img;
            resolve();
        };
        img.onerror = reject;
    });
}

function applyColorBurstEffect(imageData, selectedRegions, intensityValue) {
    const resultImageData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;

    if (appleLogoImage) {
        drawAppleLogo(resultImageData, centerX, centerY, width, height);
    }

    return resultImageData;
}

function drawAppleLogo(imageData, centerX, centerY, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw the original image data onto the canvas
    ctx.putImageData(imageData, 0, 0);

    // Calculate the size and position of the Apple logo
    const logoWidth = appleLogoImage.width * 0.5; // Adjust the size as needed
    const logoHeight = appleLogoImage.height * 0.5; // Adjust the size as needed
    const logoX = centerX - logoWidth / 2;
    const logoY = centerY - logoHeight / 2;

    // Draw the Apple logo
    ctx.drawImage(appleLogoImage, logoX, logoY, logoWidth, logoHeight);

    // Get the updated image data
    const updatedImageData = ctx.getImageData(0, 0, width, height);

    // Copy the updated image data back to the resultImageData
    for (let i = 0; i < updatedImageData.data.length; i++) {
        imageData.data[i] = updatedImageData.data[i];
    }
}

self.onmessage = async function(e) {
    const {
        imageData,
        selectedRegions,
        value,
        value5: iterations = DEFAULT_ITERATIONS,
        reset
    } = e.data;

    try {
        if (reset) {
            currentIteration = 0;
        }

        let resultImageData;
        let progress;

        if (selectedRegions?.length > 0 && selectedRegions[0]?.length > 0) {
            if (!appleLogoImage) {
                await loadAppleLogo();
            }
            resultImageData = applyColorBurstEffect(imageData, selectedRegions, value);
            currentIteration = (currentIteration + 1);

            if (currentIteration >= iterations) {
                currentIteration = 0;
            }

            progress = currentIteration / iterations;
        } else {
            resultImageData = new ImageData(
                new Uint8ClampedArray(imageData.data),
                imageData.width,
                imageData.height
            );
            progress = 1;
        }

        self.postMessage({
            segmentedImages: [resultImageData],
            isComplete: true,
            iteration: currentIteration,
            progress
        }, [resultImageData.data.buffer]);
    } catch (error) {
        self.postMessage({
            error: error.message,
            isComplete: true
        });
    }
};