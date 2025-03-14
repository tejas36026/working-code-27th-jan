
let isDrawingCircle = false;
let circleCenter = null;
let currentMousePos = null;

let activeTool = 'magicWand';
let isDrawingLasso = false;
// let isDrawingPolygon = false;
// let startPoint = null;
// let endPoint = null;
let lassoPoints = [];
let polygonPoints = [];
let isRectangleActive = false;
let isDrawingRectangle = false;
let startPoint = null;
let endPoint = null;

const imageUpload = document.getElementById('imageUpload');
const resultsContainer = document.getElementById('resultsContainer');
const effectControls = document.getElementById('effectControls');
const imageCountInput = document.getElementById('imageCount');
const processButton = document.getElementById('processButton');
const masterCheckbox = document.getElementById('masterCheckbox');
const fastProcessButton = document.getElementById('fastProcessButton');
const resizeButton = document.getElementById('resizeButton');
const toggleDrawButton = document.getElementById('toggleDraw');
const removeObjectButton = document.getElementById('removeObject');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const imageCanvas = document.getElementById('imageCanvas');
const ctx = imageCanvas.getContext('2d');
const progressDiv = document.getElementById('progress'); // Initialize progressDiv
const lipSyncButton = document.getElementById('lipSyncButton'); // New button
const generateImagesButton = document.getElementById('generateImages'); // Brightness button
const removeWatermarkButton = document.getElementById('removeWatermarkButton');
removeWatermarkButton.addEventListener('click', removeWatermark);
const magicWandButton = document.getElementById('magicWandTool');
const lassoButton = document.getElementById('lassoTool');
const polygonLassoButton = document.getElementById('polygonLassoTool');
// const imageCanvas = document.getElementById('imageCanvas');
// const ctx = imageCanvas.getContext('2d');

const workers = {};
effects.forEach(effect => { workers[effect] = new Worker(`js/${effect}Worker.js`); });
// console.log(effects);
let processedImages = {};
let originalImage;
let selectedRegions = [];
let tolerance = 32;
let magicWandMode = 'add';
let clickedPoints = [];
let drawMode = false;
let isDrawing = false;
let worker = null;

processButton.addEventListener('click', () => processImageWithMethod(processImage));
fastProcessButton.addEventListener('click', () => processImageWithMethod(fastProcessImage));
masterCheckbox.addEventListener('change', toggleAllEffects);
resizeButton.addEventListener('click', startResizing);
toggleDrawButton.addEventListener('click', toggleDrawMode);
removeObjectButton.addEventListener('click', performObjectRemoval);
// imageCanvas.addEventListener('click', handleCanvasClick);
// imageCanvas.addEventListener('mousedown', startDrawing);
// imageCanvas.addEventListener('mousemove', draw);
// imageCanvas.addEventListener('mouseup', stopDrawing);
lipSyncButton.addEventListener('click', startLipSyncAnimation); // New button event listener
generateImagesButton.addEventListener('click', generateBrightnessVariations); // Brightness button event listener

const animationControlDiv = document.createElement('div');
animationControlDiv.className = 'effect-control';
const animationCheckbox = document.createElement('input');
animationCheckbox.type = 'checkbox';
animationCheckbox.id = 'animationCheckbox';
animationCheckbox.addEventListener('change', toggleAnimationEffects);
const animationLabel = document.createElement('label');
animationLabel.htmlFor = 'animationCheckbox';
animationLabel.textContent = 'Animation';
animationControlDiv.appendChild(animationCheckbox);
animationControlDiv.appendChild(animationLabel);
effectControls.appendChild(animationControlDiv);

function handleCanvasClick(event) {
  console.log(activeTool);
    if (activeTool === 'magicWand') { // Only execute if magic wand is active
        const rect = imageCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (rect.width / imageCanvas.width));
        const y = Math.floor((event.clientY - rect.top) / (rect.height / imageCanvas.height));
        performMagicWandSelection(x, y); // Perform magic wand selection
    }
    else if (activeTool === TOOLS.CIRCLE_MAGIC_WAND) {
        // Add the clicked point to the array
        const rect = imageCanvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / (rect.width / imageCanvas.width));
        const y = Math.floor((event.clientY - rect.top) / (rect.height / imageCanvas.height));
    
//   alert(x)  
        clickedPoints.push({ x, y });
        alert(clickedPoints)
        // Redraw the canvas to show the circle
        redrawCanvas();
    }
    // else if (activeTool === TOOLS.CIRCLE_MAGIC_WAND) {
    //     performCircleMagicWandSelection(x, y);
    // }
}


function performCircleSelection(center, radius) {
    const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const selectedPixels = [];
    
    for (let y = 0; y < imageCanvas.height; y++) {
        for (let x = 0; x < imageCanvas.width; x++) {
            const distance = Math.sqrt(
                Math.pow(x - center.x, 2) +
                Math.pow(y - center.y, 2)
            );
            
            if (distance <= radius) {
                selectedPixels.push(y * imageCanvas.width + x);
            }
        }
    }
    
    updateSelectedRegions(selectedPixels);
    redrawCanvas();
}


function performMagicWandSelection(x, y) {
    const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const worker = new Worker('magicWand1Worker.js');
    
    worker.postMessage({
        imageData: imageData,
        startX: x,
        startY: y,
        tolerance: tolerance,
        mode: magicWandMode
    });
    
    worker.onmessage = function(e) {
        updateSelectedRegions(e.data.selectedRegion);
        redrawCanvas();
    };
    
}



function drawCirclePreview() {
    if (activeTool === TOOLS.CIRCLE_MAGIC_WAND && startPoint && currentMousePos && isDrawingCircle) {
        // Calculate center point between start and current points
        const centerX = (startPoint.x + currentMousePos.x) / 2;
        const centerY = (startPoint.y + currentMousePos.y) / 2;
        
        // Calculate radius as half the distance between points
        const radius = Math.sqrt(
            Math.pow(currentMousePos.x - startPoint.x, 2) +
            Math.pow(currentMousePos.y - startPoint.y, 2)
        ) / 2;

        // Draw circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Optionally draw the diameter line to show the points
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
        ctx.strokeStyle = '#00ff00';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash pattern
    }
}



const TOOLS = {
    MAGIC_WAND: 'magicWand',
    CIRCLE_MAGIC_WAND: 'circleMagicWand',
    RECTANGLE: 'rectangle',
    LASSO: 'lasso',
    POLYGON: 'polygon'
};

let circleRadius = 50; // Default radius, can be adjusted

const circleMagicWandButton = document.getElementById('circleMagicWandTool');
circleMagicWandButton.addEventListener('click', () => {
    activeTool = TOOLS.CIRCLE_MAGIC_WAND;
    resetAllTools();
    circleMagicWandButton.classList.add('active');
    imageCanvas.style.cursor = 'crosshair';
});


// let activeTool = TOOLS.MAGIC_WAND;
// let isDrawing = false;
// let startPoint = null;
// let endPoint = null;
// let polygonPoints = [];

let isDrawingPolygon = false;

function initializeSelectionTools() {
    // Get DOM elements
    const magicWandButton = document.getElementById('magicWandTool');
    const lassoButton = document.getElementById('lassoTool');
    const polygonLassoButton = document.getElementById('polygonLassoTool');
    
    // Set up button click handlers
    magicWandButton.addEventListener('click', () => {
        activeTool = 'magicWand';
        resetAllTools();
        magicWandButton.classList.add('active');
        imageCanvas.style.cursor = 'crosshair';
    });
    
    lassoButton.addEventListener('click', () => {
        activeTool = 'lasso';
        resetAllTools();
        lassoButton.classList.add('active');
        imageCanvas.style.cursor = 'crosshair';
    });
    
    polygonLassoButton.addEventListener('click', () => {
        activeTool = 'polygonLasso';
        resetAllTools();
        polygonLassoButton.classList.add('active');
        imageCanvas.style.cursor = 'crosshair';
    });
    
    // Set up canvas event listeners
    imageCanvas.addEventListener('mousedown', handleMouseDown);
    imageCanvas.addEventListener('mousemove', handleMouseMove);
    imageCanvas.addEventListener('mouseup', handleMouseUp);
    imageCanvas.addEventListener('click', handleClick);
}

function resetAllTools() {
    // Reset states
    isDrawingLasso = false;
    isDrawingPolygon = false;
    lassoPoints = [];
    polygonPoints = [];
    clickedPoints = [];

    
    // Reset UI
    document.getElementById('magicWandTool').classList.remove('active');
    document.getElementById('lassoTool').classList.remove('active');
    document.getElementById('polygonLassoTool').classList.remove('active');
    document.getElementById('circleMagicWandTool').classList.remove('active');

    // Reset canvas
    redrawCanvas();
}

function updateSelectedRegions(newRegion) {
    if (magicWandMode === 'add') {
        selectedRegions.push(newRegion);
    } else if (magicWandMode === 'subtract') {
        selectedRegions = selectedRegions.map(region => 
            region.filter(pixel => !newRegion.includes(pixel))
        );
    } else if (magicWandMode === 'invert') {
        selectedRegions = selectedRegions.map(region => {
            let invertedRegion = region.filter(pixel => !newRegion.includes(pixel))
                .concat(newRegion.filter(pixel => !region.includes(pixel)));
            return invertedRegion;
        });
    }
}

function updateObjectMask(newRegion) {
    if (!objectMask) {
        objectMask = matrix(imageCanvas.width, imageCanvas.height, false);
    }
    newRegion.forEach(pixelIndex => {
        const x = pixelIndex % imageCanvas.width;
        const y = Math.floor(pixelIndex / imageCanvas.width);
        objectMask[y][x] = true;
    });
}

function displaySelectedRegionsBorders() {
    ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    ctx.drawImage(originalImage, 0, 0);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 0.1;
    selectedRegions.forEach(region => {
        ctx.beginPath();
        region.forEach(pixelIndex => {
            const x = pixelIndex % imageCanvas.width;
            const y = Math.floor(pixelIndex / imageCanvas.width);
            ctx.rect(x, y, 1, 1);
        });
        ctx.stroke();
    });
}

function startResizing() {
    if (!originalImage || !originalImage.complete || !originalImage.naturalWidth) {
        alert('Image not loaded.');
        return;
    }

    if (!originalImageData) {
        alert('No image data available.');
        return;
    }

    const toWidth = parseInt(widthInput.value);
    const toHeight = parseInt(heightInput.value);

    if (isNaN(toWidth) || isNaN(toHeight)) {
        alert('Please enter valid width and height values.');
        return;
    }

    if (toWidth >= originalImage.width && toHeight >= originalImage.height) {
        alert('Please enter at least one dimension smaller than the original image.');
        return;
    }

    const resizedImageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    resizeImage(
        resizedImageData,
        toWidth,
        toHeight,
        ({ step, steps }) => {
            progressDiv.textContent = `Resizing... ${Math.round((step / steps) * 100)}%`;
        }
    ).then(() => {
        imageCanvas.width = toWidth;
        imageCanvas.height = toHeight;
        ctx.putImageData(resizedImageData, 0, 0);
        progressDiv.textContent = 'Resizing complete!';
    });
}

function toggleDrawMode() {
    drawMode = !drawMode;
    toggleDrawButton.textContent = drawMode ? 'Disable Draw' : 'Enable Draw';
}

function startLassoDrawing(point) {
    isDrawingLasso = true;
    lassoPoints = [point];
    redrawCanvas();
}

function draw(e) {
    if (!isDrawing || !drawMode) return;
    const rect = imageCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (objectMask) {
        for (let i = -5; i <= 5; i++) {
            for (let j = -5; j <= 5; j++) {
                if (x + i >= 0 && x + i < imageCanvas.width && y + j >= 0 && y + j < imageCanvas.height) {
                    objectMask[y + j][x + i] = true;
                }
            }
        }
    }
}

function stopDrawing() {
    isDrawing = false;
}


// First, modify your HTML to have just one polygonLassoButton:
// Remove the first button and keep only the one in the sidebar

// Add this CSS to your styles2.css file:
`.lasso-active {
    cursor: crosshair !important;
}

.imageCanvas.lasso-active {
    border: 2px dashed ;
}

#polygonLassoButton.active {
    
    color: black;
}`

// Add this JavaScript code:
document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    // const polygonLassoButton = document.getElementById('lassoTool');



    
    const polygonLassoButton = document.getElementById('polygonLassoTool');
    const rectangleToolButton = document.getElementById('polygonLassoTool'); // Using the same button ID

    rectangleToolButton.addEventListener('click', () => {
        activeTool = 'rectangle';
        deactivateMagicWand();
        activateRectangleTool();
    });
    
    function deactivateMagicWand() {
        imageCanvas.style.cursor = 'default';
        // Reset any magic wand specific states if needed
    }


function activateRectangleTool() {
    isRectangleActive = true;
    imageCanvas.style.cursor = 'crosshair';
    rectangleToolButton.classList.add('active');
}
 
const lassoButton = document.getElementById('lassoTool');

    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');

    // Global variables for lasso tool
    let isLassoActive = false;
    let isDrawingLasso = false;
    // let lassoPoints = [];
    let tolerance = 32; // You can adjust this value

    // Initialize the tool
    function initLassoTool() {
        // Add event listeners
        polygonLassoButton.addEventListener('click', toggleLassoTool);

        function deactivateMagicWand() {
            imageCanvas.style.cursor = 'default';
            // Reset any magic wand specific states if needed
        }

        function activatePolygonLasso() {
            activeTool = 'polygonLasso';
            imageCanvas.style.cursor = 'crosshair';
            polygonLassoButton.classList.add('active');
            magicWandButton.classList.remove('active');
            lassoButton.classList.remove('active');
        }
        magicWandButton.addEventListener('click', activateMagicWand);
        lassoButton.addEventListener('click', activateLasso);
        polygonLassoButton.addEventListener('click', activatePolygonLasso);
        
        // Canvas event listeners
        imageCanvas.addEventListener('mousedown', handleMouseDown);
        imageCanvas.addEventListener('mousemove', handleMouseMove);
        imageCanvas.addEventListener('mouseup', handleMouseUp);
        imageCanvas.addEventListener('click', handleClick);        

        function handleClick(event) {
            if (activeTool === 'magicWand') {
                const point = getCanvasPoint(event);
                performMagicWandSelection(point.x, point.y);
            } else if (activeTool === 'polygonLasso') {
                const point = getCanvasPoint(event);
                handlePolygonClick(point);
            }
            if (activeTool === TOOLS.CIRCLE_MAGIC_WAND) {
                // Add the clicked point to the array
                const rect = imageCanvas.getBoundingClientRect();
                const x = Math.floor((event.clientX - rect.left) / (rect.width / imageCanvas.width));
                const y = Math.floor((event.clientY - rect.top) / (rect.height / imageCanvas.height));            
                clickedPoints.push({ x, y });
                redrawCanvas();
            }
        }
        
        function handleMouseUp(event) {
            
            if (activeTool === 'lasso' && isDrawingLasso) {
                event.preventDefault();
                completeLassoSelection();
            }

            else if (activeTool === TOOLS.CIRCLE_MAGIC_WAND && isDrawingCircle) {
                isDrawingCircle = false;
                if (circleCenter && currentMousePos) {
                    const radius = Math.sqrt(
                        Math.pow(currentMousePos.x - circleCenter.x, 2) +
                        Math.pow(currentMousePos.y - circleCenter.y, 2)
                    );
                    performCircleSelection(circleCenter, radius);
                }
                circleCenter = null;
                currentMousePos = null;
            } 
        }

        function completeLassoSelection() {
            isDrawingLasso = false;
            
            if (lassoPoints.length > 2) {
                lassoPoints.push(lassoPoints[0]); // Close the path
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imageCanvas.width;
                tempCanvas.height = imageCanvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                tempCtx.beginPath();
                tempCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
                for (let i = 1; i < lassoPoints.length; i++) {
                    tempCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
                }
                tempCtx.closePath();
                tempCtx.fillStyle = 'red';
                tempCtx.fill();
                
                const maskData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const selectedPixels = [];
                
                for (let y = 0; y < maskData.height; y++) {
                    for (let x = 0; x < maskData.width; x++) {
                        const index = (y * maskData.width + x) * 4;
                        if (maskData.data[index] > 0) {
                            selectedPixels.push(y * maskData.width + x);
                        }
                    }
                }
                
                updateSelectedRegions(selectedPixels);
            }
            
            lassoPoints = [];
            redrawCanvas();
        }
        
        function activateLasso() {
            activeTool = 'lasso';
            imageCanvas.style.cursor = 'crosshair';
            lassoButton.classList.add('active');
            magicWandButton.classList.remove('active');
            polygonLassoButton.classList.remove('active');
        }

        lassoButton.addEventListener('click', () => {
            activeTool = 'lasso';
            deactivateMagicWand();
            activateLasso();
        });

        polygonLassoButton.addEventListener('click', () => {
            activeTool = 'polygonLasso';
            deactivateMagicWand();
            activatePolygonLasso();
        });
        
        // imageCanvas.addEventListener('mousedown', (e) => {
        //     if (activeTool === 'polygonLasso') {
        //         handlePolygonClick(e);
        //     }
        // });
       
        // function handleMouseDown(event) {
            
            
            
        //     const point = getCanvasPoint(event);
            
        //     switch(activeTool) {
        //         case 'lasso':
        //             startLassoDrawing(point);
        //             break;
        //         case 'polygonLasso':
        //             handlePolygonClick(point);
        //             break;
        //     }
        // }       
        function handleMouseDown(event) {
            if (activeTool === 'lasso') {
                event.preventDefault();
                isDrawingLasso = true;
                const point = getCanvasPoint(event);
                lassoPoints = [point];
                redrawCanvas();
            }
            else  if (activeTool === TOOLS.CIRCLE_MAGIC_WAND) {
                isDrawingCircle = true;
                const rect = imageCanvas.getBoundingClientRect();
                circleCenter = {
                    x: Math.floor((event.clientX - rect.left) / (rect.width / imageCanvas.width)),
                    y: Math.floor((event.clientY - rect.top) / (rect.height / imageCanvas.height))
                };
                currentMousePos = {...circleCenter};
            }
        }
        

        // function handleMouseMove(event) {
        //     const point = getCanvasPoint(event);
            
        //     switch(activeTool) {
        //         case 'lasso':
        //             if (isDrawingLasso) {
        //                 continueLassoDrawing(point);
        //             }
        //             break;
        //         case 'polygonLasso':
        //             if (isDrawingPolygon) {
        //                 updatePolygonPreview(point);
        //             }
        //             break;
        //     }
        // }

        function handleMouseMove(event) {

            if (activeTool === 'lasso' && isDrawingLasso) {
                event.preventDefault();
                const point = getCanvasPoint(event);
                lassoPoints.push(point);
                redrawCanvas();
            } else if (activeTool === 'polygonLasso' && isDrawingPolygon) {
                const point = getCanvasPoint(event);
                updatePolygonPreview(point);
            }
            else if (activeTool === TOOLS.CIRCLE_MAGIC_WAND && isDrawingCircle) {
                const rect = imageCanvas.getBoundingClientRect();
                currentMousePos = {
                    x: Math.floor((event.clientX - rect.left) / (rect.width / imageCanvas.width)),
                    y: Math.floor((event.clientY - rect.top) / (rect.height / imageCanvas.height))
                };
                redrawCanvas();
            }
        }
        


        function handlePolygonClick(point) {
            if (!isDrawingPolygon) {
                isDrawingPolygon = true;
                polygonPoints = [point];
            } else {
                const startPoint = polygonPoints[0];
                const distance = Math.sqrt(
                    Math.pow(point.x - startPoint.x, 2) + 
                    Math.pow(point.y - startPoint.y, 2)
                );
                
                if (distance < 10 && polygonPoints.length > 2) {
                    completePolygonSelection();
                } else {
                    polygonPoints.push(point);
                }
            }
            redrawCanvas();
        }



        function updatePolygonPreview(point) {
            redrawCanvas();
            
            // Draw preview line
            if (polygonPoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.moveTo(polygonPoints[polygonPoints.length - 1].x, polygonPoints[polygonPoints.length - 1].y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        }

        
        // imageCanvas.addEventListener('mousemove', (e) => {
        //     if (activeTool === 'polygonLasso') {
        //         updatePolygonPreview(e);
        //     }
        
        // });


        imageCanvas.addEventListener('dblclick', (e) => {
            if (activeTool === 'polygonLasso') {
                completePolygonSelection(e);
            }
        });
        



        function completePolygonSelection() {
            if (polygonPoints.length < 3) return;
            
            polygonPoints.push(polygonPoints[0]); // Close the polygon
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageCanvas.width;
            tempCanvas.height = imageCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.beginPath();
            tempCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
            for (let i = 1; i < polygonPoints.length; i++) {
                tempCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.fillStyle = 'red';
            tempCtx.fill();
            
            const maskData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const selectedPixels = [];
            
            for (let y = 0; y < maskData.height; y++) {
                for (let x = 0; x < maskData.width; x++) {
                    const index = (y * maskData.width + x) * 4;
                    if (maskData.data[index] > 0) {
                        selectedPixels.push(y * maskData.width + x);
                    }
                }
            }
            
            updateSelectedRegions(selectedPixels);
            isDrawingPolygon = false;
            polygonPoints = [];
            redrawCanvas();
        }



        function getPixelsInLassoSelection() {
            // Create temporary canvas for selection mask
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageCanvas.width;
            tempCanvas.height = imageCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw lasso path
            tempCtx.beginPath();
            tempCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            for (let i = 1; i < lassoPoints.length; i++) {
                tempCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.fill();
            
            // Get pixels inside lasso
            const maskData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const selectedPixels = [];
            
            for (let y = 0; y < maskData.height; y++) {
                for (let x = 0; x < maskData.width; x++) {
                    const index = (y * maskData.width + x) * 4;
                    if (maskData.data[index + 3] > 0) {
                        selectedPixels.push(y * maskData.width + x);
                    }
                }
            }
            
            return selectedPixels;
        }

        function getPixelsInPolygonSelection() {
            // Similar to getPixelsInLassoSelection but for polygon
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageCanvas.width;
            tempCanvas.height = imageCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.beginPath();
            tempCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
            for (let i = 1; i < polygonPoints.length; i++) {
                tempCtx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
            }
            tempCtx.closePath();
            tempCtx.fill();
            
            const maskData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const selectedPixels = [];
            
            for (let y = 0; y < maskData.height; y++) {
                for (let x = 0; x < maskData.width; x++) {
                    const index = (y * maskData.width + x) * 4;
                    if (maskData.data[index + 3] > 0) {
                        selectedPixels.push(y * maskData.width + x);
                    }
                }
            }
            
            return selectedPixels;
        }
        


        function resetPolygonTool() {
            polygonPoints = [];
            isDrawingPolygon = false;
            imageCanvas.removeEventListener('mousemove', updatePolygonPreview);
            polygonLassoButton.classList.remove('active');
            imageCanvas.style.cursor = 'default';
            activeTool = 'magicWand';
        }
        
        
        // imageCanvas.addEventListener('mousemove', continueLassoDrawing);
        
        // imageCanvas.addEventListener('mousemove', (e) => {
        //     if (activeTool === 'lasso' && isDrawingLasso) {
        //         continueLassoDrawing(e); // Continue lasso drawing
        //     }
        // });

        // imageCanvas.addEventListener('mousemove', (e) => {
        //     if ((activeTool === 'lasso' || activeTool === 'polygonLasso') && isDrawingLasso) {
        //         continueLassoDrawing(e);
        //     }
        // });
        
        // imageCanvas.addEventListener('mouseup', endLassoDrawing);
        // imageCanvas.addEventListener('mouseup', () => {
        //     if (activeTool === 'lasso' && isDrawingLasso) {
        //         endLassoDrawing(); // End lasso drawing
        //     }
        // });


        // imageCanvas.addEventListener('mouseup', () => {
        //     if (activeTool === 'lasso' || activeTool === 'polygonLasso') {
        //         endLassoDrawing();
        //     }
        // });
        
        // imageCanvas.addEventListener('mouseup', () => {
        //     if (activeTool === 'rectangle') {
        //         endRectangleDrawing();
        //     }
        // });


        function startRectangleDrawing(event) {
            isDrawingRectangle = true;
            startPoint = getCanvasPoint(event);
            endPoint = startPoint;
            redrawCanvas();
        }

        function updateRectangleDrawing(event) {
            if (!isDrawingRectangle) return;
            endPoint = getCanvasPoint(event);
            redrawCanvas();
        }

        function endRectangleDrawing() {
            if (!isDrawingRectangle) return;
            
            isDrawingRectangle = false;
            if (startPoint && endPoint) {
                const rect = normalizeRectangle(startPoint, endPoint);
                if (rect.width > 0 && rect.height > 0) {
                    const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                    const selectedRegion = getPixelsInRectangle(rect, imageCanvas.width);
                    updateSelectedRegions(selectedRegion);
                    redrawCanvas();
                }
            }
            resetRectangleState();
        }
        
        function normalizeRectangle(start, end) {
            return {
                x: Math.min(start.x, end.x),
                y: Math.min(start.y, end.y),
                width: Math.abs(end.x - start.x),
                height: Math.abs(end.y - start.y)
            };
        }

        function getPixelsInRectangle(rect, canvasWidth) {
            const selectedPixels = [];
            for (let y = rect.y; y < rect.y + rect.height; y++) {
                for (let x = rect.x; x < rect.x + rect.width; x++) {
                    selectedPixels.push(y * canvasWidth + x);
                }
            }
            return selectedPixels;
        }
        
        function resetRectangleState() {
            isRectangleActive = false;
            startPoint = null;
            endPoint = null;
            rectangleToolButton.classList.remove('active');
            imageCanvas.style.cursor = 'default';
            activeTool = 'magicWand'; // Reset to default tool
        }

        // Initialize button state
        polygonLassoButton.classList.remove('active');
    }


// Tool activation functions
function activateMagicWand() {
    activeTool = 'magicWand';
    imageCanvas.style.cursor = 'crosshair';
    magicWandButton.classList.add('active');
    lassoButton.classList.remove('active');
    polygonLassoButton.classList.remove('active');
}


    function activateLassoTool() {
        activeTool = 'lasso'; // Set active tool to lasso
        isLassoActive = true; // Enable lasso tool
        polygonLassoButton.classList.add('active'); // Update UI
        imageCanvas.classList.add('lasso-active'); // Update UI
        polygonLassoButton.textContent = 'Cancel Lasso'; // Update button text
    }
    
    function deactivateLassoTool() {
        activeTool = 'magicWand'; // Set active tool back to magic wand
        isLassoActive = false; // Disable lasso tool
        polygonLassoButton.classList.remove('active'); // Update UI
        imageCanvas.classList.remove('lasso-active'); // Update UI
        polygonLassoButton.textContent = 'Lasso Tool'; // Update button text
        lassoPoints = []; // Clear lasso points
        redrawCanvas(); // Redraw the canvas
    }

    function toggleLassoTool() {
        if (activeTool === 'lasso') {
            deactivateLassoTool(); // Deactivate lasso tool if it's already active
        } else {
            activateLassoTool(); // Activate lasso tool if it's not active
        }
    }
    
    // function startLassoDrawing(event) {
    //     if (activeTool === 'lasso') { // Only execute if lasso tool is active
    //         isDrawingLasso = true;
    //         const point = getCanvasPoint(event);
    //         lassoPoints = [point];
    //         redrawCanvas();
    //     }
    // }

    function startLassoDrawing(event) {
        isDrawingLasso = true;
        const point = getCanvasPoint(event);
        lassoPoints = [point];
        redrawCanvas();
    }
    function continueLassoDrawing(point) {
        if (!isDrawingLasso) return;
        
        const lastPoint = lassoPoints[lassoPoints.length - 1];
        if (Math.abs(point.x - lastPoint.x) > 2 || Math.abs(point.y - lastPoint.y) > 2) {
            lassoPoints.push(point);
            redrawCanvas();
        }
    }

    // function continueLassoDrawing(event) {
    //     if (activeTool === 'lasso' && isDrawingLasso) { // Only execute if lasso tool is active
    //         const point = getCanvasPoint(event);
    //         if (lassoPoints.length > 0) {
    //             const lastPoint = lassoPoints[lassoPoints.length - 1];
    //             if (Math.abs(point.x - lastPoint.x) > 2 || Math.abs(point.y - lastPoint.y) > 2) {
    //                 lassoPoints.push(point);
    //                 redrawCanvas();
    //             }
    //         }
    //     }
    // }

    // function continueLassoDrawing(event) {
    //     if (!isDrawingLasso) return;
        
    //     const point = getCanvasPoint(event);
    //     if (lassoPoints.length > 0) {
    //         const lastPoint = lassoPoints[lassoPoints.length - 1];
    //         if (Math.abs(point.x - lastPoint.x) > 2 || Math.abs(point.y - lastPoint.y) > 2) {
    //             lassoPoints.push(point);
    //             redrawCanvas();
    //         }
    //     }
    // }


    // function endLassoDrawing() {
    //     if (activeTool === 'lasso' && isDrawingLasso) {
    //         isDrawingLasso = false;
    //         if (lassoPoints.length > 2) {
    //             lassoPoints.push(lassoPoints[0]); // Close the path
    //             const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                
    //             // Create and send message to worker
    //             const worker = new Worker('lassoSelectionWorker.js');
    //             worker.postMessage({
    //                 imageData: imageData,
    //                 lassoPoints: lassoPoints
    //             });

    //             worker.onmessage = function(e) {
    //                 updateSelectedRegions(e.data.selectedRegion);
    //                 redrawCanvas();
                    
    //                 // Reset lasso tool
    //                 isLassoActive = false;
    //                 lassoPoints = [];
    //                 polygonLassoButton.classList.remove('active');
    //                 imageCanvas.classList.remove('lasso-active');
    //                 polygonLassoButton.textContent = 'Polygon Lasso Tool';
    //             };
    //         } else {
    //             lassoPoints = [];
    //             redrawCanvas();
    //         }
    //     }
    // }



    function endLassoDrawing() {
        if (!isDrawingLasso) return;
        
        isDrawingLasso = false;
        if (lassoPoints.length > 2) {
            // Close the path
            lassoPoints.push(lassoPoints[0]);
            
            // Create selection from lasso points
            const selectedPixels = getPixelsInLassoSelection();
            updateSelectedRegions(selectedPixels);
        }
        
        lassoPoints = [];
        redrawCanvas();
    }

    

function resetLassoState() {
    isLassoActive = false;
    lassoPoints = [];
    polygonLassoButton.classList.remove('active');
    lassoButton.classList.remove('active');
    imageCanvas.style.cursor = 'default';
    activeTool = 'magicWand'; // Reset to default tool
}


function getCanvasPoint(event) {
    const rect = imageCanvas.getBoundingClientRect();
    const scaleX = imageCanvas.width / rect.width;
    const scaleY = imageCanvas.height / rect.height;
    
    return {
        x: Math.floor((event.clientX - rect.left) * scaleX),
        y: Math.floor((event.clientY - rect.top) * scaleY)
    };
}



function redrawCanvas() {
    if (!originalImage) return;
    
    ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    ctx.drawImage(originalImage, 0, 0);
    
    // Draw existing selections
    displaySelectedRegionsBorders();
    
    // Draw tool-specific previews
    if (activeTool === 'lasso' && lassoPoints.length > 0) {
        drawLassoPreview();
    } else if (activeTool === 'polygonLasso' && polygonPoints.length > 0) {
        drawPolygonPreview();

    }
    else if (activeTool === TOOLS.CIRCLE_MAGIC_WAND) {
        drawCirclePreview();
    }
}



function drawLassoPreview() {
    ctx.beginPath();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    
    if (isDrawingLasso) {
        ctx.stroke();
    } else {
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fill();
        ctx.stroke();
    }
}



function drawPolygonPreview() {
    ctx.beginPath();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    ctx.stroke();
    
    // Draw points
    polygonPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#ff0000' : '#00ff00';
        ctx.fill();
    });
}


// function resetPolygonTool() {
//     polygonPoints = [];
//     isDrawingPolygon = false;
//     imageCanvas.removeEventListener('mousemove', updatePolygonPreview);
//     polygonLassoButton.classList.remove('active');
//     imageCanvas.style.cursor = 'default';
//     activeTool = 'magicWand';
// }





const styles = `
.rectangle-active {
    cursor: crosshair !important;
}

#polygonLassoTool.active {
    background-color: #007bff;
    color: white;
}
`;

// Create and append style element
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);



polygonLassoButton.addEventListener('click', toggleLassoTool); // Toggle lasso tool

    function sendToMagicWand(imageData) {
        // Calculate center point of lasso selection
        const bounds = getLassoBounds();
        const centerX = Math.floor((bounds.minX + bounds.maxX) / 2);
        const centerY = Math.floor((bounds.minY + bounds.maxY) / 2);

        // Create and send message to worker
        const worker = new Worker('magicWand1Worker.js');
        worker.postMessage({
            imageData: imageData,
            startX: centerX,
            startY: centerY,
            tolerance: tolerance,
            mode: 'add'
        });

        worker.onmessage = function(e) {
            updateSelectedRegions(e.data.selectedRegion);
            redrawCanvas();
            
            // Reset lasso tool
            isLassoActive = false;
            lassoPoints = [];
            polygonLassoButton.classList.remove('active');
            imageCanvas.classList.remove('lasso-active');
            polygonLassoButton.textContent = 'Polygon Lasso Tool';
        };
    }

    function getLassoBounds() {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        lassoPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        return { minX, minY, maxX, maxY };
    }

    // function getCanvasPoint(event) {
    //     const rect = imageCanvas.getBoundingClientRect();
    //     const scaleX = imageCanvas.width / rect.width;
    //     const scaleY = imageCanvas.height / rect.height;
        
    //     return {
    //         x: Math.floor((event.clientX - rect.left) * scaleX),
    //         y: Math.floor((event.clientY - rect.top) * scaleY)
    //     };
    // }

    // function redrawCanvas() {
    //     if (!originalImage) return;
        
    //     ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    //     ctx.drawImage(originalImage, 0, 0);
        
    //     // Draw existing selections

    //     // Draw current lasso selection
    //     if (lassoPoints.length > 0) {
    //         ctx.beginPath();
    //         ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            
    //         for (let i = 1; i < lassoPoints.length; i++) {
    //             ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    //         }
            
    //         ctx.strokeStyle = 'black';
    //         ctx.lineWidth = 2;
            
    //         if (isDrawingLasso) {
    //             ctx.setLineDash([5, 5]);
    //         } else {
    //             ctx.closePath();
    //             ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
    //             ctx.fill();
    //         }
            
    //         ctx.stroke();
    //         ctx.setLineDash([]);
    //     }
    // }

    // Initialize the tool


    initLassoTool();
});



async function processImageWithOverlay(processType) {
    const img = document.getElementById('sourceImage');
    const mainContainer = document.getElementById('mainContainer');
    mainContainer.innerHTML = '';
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-sequence-container';
    imageContainer.style.position = 'relative';
    mainContainer.appendChild(imageContainer);
    
    const imageGrid = document.createElement('div');
    imageGrid.className = 'image-grid';

    const segmentation = segmentationResult;
    const bodyPartImages = {};

    for (let partId = 0; partId < 24; partId++) {
        const partName = Object.keys(BODY_PARTS)[partId];
        if (!partName) continue;
        if (!segmentation.data.includes(partId)) {

            continue; // Skip processing if part is not present
        }

        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = img.width;
        segmentCanvas.height = img.height;
        // const segmentCtx = segmentCanvas.getContext('2d');
        const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
        segmentCtx.drawImage(img, 0, 0);

        const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
      
        for (let i = 0; i < segmentation.data.length; i++) {
            if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
        }

        const variations = await processSegmentVariations(imageData, partName);
        bodyPartImages[partName] = variations.map(v => ({
            imageData: v.data,
            width: img.width,
            height: img.height,
            extremePoints: v.extremePoints
        }));
    }
    
    const pointsToProcess = {
        leftFace: collectedPoints.get('left_face'),
        rightFace: collectedPoints.get('right_face'),
        leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
        leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
        leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
        leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
        leftHand: collectedPoints.get('left_hand'),
        rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
        rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
        rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
        rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
        rightHand: collectedPoints.get('right_hand'),
        torsoFront: collectedPoints.get('torso_front'),
        torsoBack: collectedPoints.get('torso_back'),
        leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
        leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
        leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
        leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
        rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
        rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
        rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
        rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
        leftFoot: collectedPoints.get('left_foot'),
        rightFoot: collectedPoints.get('right_foot')
    };

    segmentationWorker.postMessage({
        type: 'calculateAverage',
        points: pointsToProcess,
        bodyPartImages,
        partNames: {
            leftUpperArmFront: 'left_upper_arm_front',
            leftUpperArmBack: 'left_upper_arm_back',
            leftLowerArmFront: 'left_lower_arm_front',
            leftLowerArmBack: 'left_lower_arm_back',
            leftHand: 'left_hand',
            rightUpperArmFront: 'right_upper_arm_front',
            rightUpperArmBack: 'right_upper_arm_back',
            rightLowerArmFront: 'right_lower_arm_front',
            rightLowerArmBack: 'right_lower_arm_back',
            rightHand: 'right_hand',
            leftFoot: 'left_foot',
            rightFoot: 'right_foot',
            leftUpperFoot: 'left_upper_foot',
            leftLowerFoot: 'left_lower_foot',
            rightUpperFoot: 'right_upper_foot',
            rightLowerFoot: 'right_lower_foot',
            leftUpperLegFront: 'left_upper_leg_front',
            leftUpperLegBack: 'left_upper_leg_back',
            leftLowerLegFront: 'left_lower_leg_front',
            leftLowerLegBack: 'left_lower_leg_back',
            rightUpperLegFront: 'right_upper_leg_front',
            rightUpperLegBack: 'right_upper_leg_back',
            rightLowerLegFront: 'right_lower_leg_front',
            rightLowerLegBack: 'right_lower_leg_back'
        },
        offset: { x: 100, y: 50 },
        imageArray
    }); 

    segmentationWorker.onmessage = e => {
        const { type, averages, extremePoints, partNames } = e.data;
        
        if (type === 'combinedResults' && (averages || extremePoints)) {
            
            processedData = {
                averages,
                extremePoints,
                partNames,
                timestamp: Date.now()
            };

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            // const ctx = canvas.getContext('2d');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        // wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        // mainContainer.appendChild(wrapper);

// Determine which workers to use based on extreme points
const handParts = [
    'leftHand', 'rightHand', 
    'leftUpperArmFront', 'leftUpperArmBack', 
    'leftLowerArmFront', 'leftLowerArmBack',
    'rightUpperArmFront', 'rightUpperArmBack', 
    'rightLowerArmFront', 'rightLowerArmBack'
];

const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any hand or leg parts are present
const hasHandParts = handParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

const workersToUse = [];
if (hasHandParts) {
    const postprocessingWorker = new Worker('handworker.js');
    workersToUse.push({
        worker: postprocessingWorker,
        type: 'hand'
    });
}

if (hasLegParts) {
    const legWorker = new Worker('legworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations; // Assuming this is correctly set before processing starts

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};
console.log('generatedImages :>> ', generatedImages);


function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    // if (firstImageType === secondImageType) {
    //     console.error(`Cannot combine images of the same type: ${firstImageType}`);
    //     return; // Exit the function immediately
    // }

    
    // if (generatedImages.length > Math.max(index1, index2)) {
    //     const imagePromises = [index1, index2].map(idx => {
    //         return new Promise((resolve, reject) => {
    //             const imgInfo = generatedImages[idx];
    //             const img = new Image();
    //             // // console.log('img :>> ', img);

    //             if (imgInfo.imageUrl) {
    //                 img.src = imgInfo.imageUrl;
    //             } else {
    //                 try {
    //                     img.src = createImageFromData(
    //                         imgInfo.imageData,
    //                         imgInfo.width,
    //                         imgInfo.height
    //                     );
    //                 } catch (error) {
    //                     console.error('Error creating image:', error);
    //                     reject(error);
    //                     return;
    //                 }
    //             }

    //             img.onload = () => resolve(img);
    //             img.onerror = reject;
    //         });
    //     });

    //     Promise.all(imagePromises)
    //         .then(([img1, img2]) => safelyCombineImages(img1, img2))
    //         .then(combinedImg => {
    //             const combinedContainer = document.createElement('div');
    //             combinedContainer.className = 'combined-images-container';

    //             const combinedWrapper = document.createElement('div');
    //             combinedWrapper.className = 'image-wrapper combined';
    //             combinedWrapper.appendChild(combinedImg);

    //             const verificationInfo = document.createElement('div');
    //             verificationInfo.className = 'verification-info';

    //             combinedContainer.appendChild(verificationInfo);
    //             combinedContainer.appendChild(combinedWrapper);

    //             const container = document.getElementById('imageContainer');
    //             container.appendChild(combinedContainer);

    //             // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
    //         })
    //         .catch(error => {
    //             console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

    //             const errorContainer = document.createElement('div');
    //             errorContainer.className = 'verification-info';
    //             errorContainer.textContent = `Error combining images: ${error.message}`;

    //             const container = document.getElementById('imageContainer');
    //             container.appendChild(errorContainer);
    //         });
      
    //     }


    }

// Worker processing remains unchanged
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // console.log('generatedImages :>> ', generatedImages);
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });

const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
     
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});



// function startSequentialAnimation() {
//     let currentIndex = 0;
    
//     // First hide all images
//     generatedImages.forEach(item => {
//         item.wrapper.classList.remove('active');
//     });

//     function showNextImage() {
//         // Hide current image
//         if (currentIndex > 0) {
//             generatedImages[currentIndex - 1].wrapper.classList.remove('active');
//         } else {
//             // When starting a new cycle, hide the last image
//             generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
//         }

//         // Show next image
//         generatedImages[currentIndex].wrapper.classList.add('active');

//         // Increment counter
//         currentIndex = (currentIndex + 1) % generatedImages.length;

//         // Schedule next image - animation continues indefinitely
//         setTimeout(showNextImage, 200);
//     }

//     // Start the sequence
//     showNextImage();
// }




// Helper function to create an image from ImageData


function startSequentialAnimation() {
    // Create a canvas for combining images
    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');
    
    // Set canvas dimensions based on original image size
    combinedCanvas.width = generatedImages[0].image.width;
    combinedCanvas.height = generatedImages[0].image.height;
    
    // Group images by type
    const handImages = generatedImages.filter(img => img.type === 'hand');
    const legImages = generatedImages.filter(img => img.type === 'leg');
    
    // Create wrapper for combined images
    const combinedWrapper = document.createElement('div');
    combinedWrapper.className = 'image-wrapper active';
    imageContainer.appendChild(combinedWrapper);
    
    function combineAndShowImages(handIndex = 0, legIndex = 0) {
        // Clear canvas
        ctx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // Draw hand image
        if (handImages[handIndex]) {
            ctx.globalAlpha = 1;
            ctx.drawImage(handImages[handIndex].image, 0, 0);
        }
        
        // Draw leg image
        if (legImages[legIndex]) {
            ctx.globalAlpha = 1;
            ctx.drawImage(legImages[legIndex].image, 0, 0);
        }
        
        // Create combined image
        const combinedImage = new Image();
        combinedImage.src = combinedCanvas.toDataURL();
        
        // Update display
        combinedWrapper.innerHTML = '';
        combinedWrapper.appendChild(combinedImage);
        
        // Schedule next combination if needed
        setTimeout(() => {
            const nextHandIndex = (handIndex + 1) % handImages.length;
            const nextLegIndex = (legIndex + 1) % legImages.length;
            combineAndShowImages(nextHandIndex, nextLegIndex);
        }, 200);
    }
    
    // Start the combination process
    combineAndShowImages();
}



// Update the worker processing section
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const img = new Image();
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            image: img,
                            width: variation.width,
                            height: variation.height
                        });
                    });

                    // Start animation when all workers are done
                    if (generatedImages.length === totalworkerimages) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}

}
 
    };




}

async function processImageWithOverlay1(processType) {
    const img = document.getElementById('sourceImage');
    const mainContainer = document.getElementById('mainContainer');
    mainContainer.innerHTML = '';
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-sequence-container';
    imageContainer.style.position = 'relative';
    mainContainer.appendChild(imageContainer);
    
    const imageGrid = document.createElement('div');
    imageGrid.className = 'image-grid';

    const segmentation = segmentationResult;
    const bodyPartImages = {};

    for (let partId = 0; partId < 24; partId++) {
        const partName = Object.keys(BODY_PARTS)[partId];
        if (!partName) continue;
        if (!segmentation.data.includes(partId)) {

            continue; 

        }

        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = img.width;
        segmentCanvas.height = img.height;
        // const segmentCtx = segmentCanvas.getContext('2d');
        const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
        segmentCtx.drawImage(img, 0, 0);

        const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
      
        for (let i = 0; i < segmentation.data.length; i++) {
            if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
        }

        const variations = await processSegmentVariations(imageData, partName);
        bodyPartImages[partName] = variations.map(v => ({
            imageData: v.data,
            width: img.width,
            height: img.height,
            extremePoints: v.extremePoints
        }));
    }
    
    const pointsToProcess = {
        leftFace: collectedPoints.get('left_face'),
        rightFace: collectedPoints.get('right_face'),
        leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
        leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
        leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
        leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
        leftHand: collectedPoints.get('left_hand'),
        rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
        rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
        rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
        rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
        rightHand: collectedPoints.get('right_hand'),
        torsoFront: collectedPoints.get('torso_front'),
        torsoBack: collectedPoints.get('torso_back'),
        leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
        leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
        leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
        leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
        rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
        rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
        rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
        rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
        leftFoot: collectedPoints.get('left_foot'),
        rightFoot: collectedPoints.get('right_foot')
    };

    segmentationWorker.postMessage({
        type: 'calculateAverage',
        points: pointsToProcess,
        bodyPartImages,
        partNames: {
            leftUpperArmFront: 'left_upper_arm_front',
            leftUpperArmBack: 'left_upper_arm_back',
            leftLowerArmFront: 'left_lower_arm_front',
            leftLowerArmBack: 'left_lower_arm_back',
            leftHand: 'left_hand',
            rightUpperArmFront: 'right_upper_arm_front',
            rightUpperArmBack: 'right_upper_arm_back',
            rightLowerArmFront: 'right_lower_arm_front',
            rightLowerArmBack: 'right_lower_arm_back',
            rightHand: 'right_hand',
            leftFoot: 'left_foot',
            rightFoot: 'right_foot',
            leftUpperFoot: 'left_upper_foot',
            leftLowerFoot: 'left_lower_foot',
            rightUpperFoot: 'right_upper_foot',
            rightLowerFoot: 'right_lower_foot',
            leftUpperLegFront: 'left_upper_leg_front',
            leftUpperLegBack: 'left_upper_leg_back',
            leftLowerLegFront: 'left_lower_leg_front',
            leftLowerLegBack: 'left_lower_leg_back',
            rightUpperLegFront: 'right_upper_leg_front',
            rightUpperLegBack: 'right_upper_leg_back',
            rightLowerLegFront: 'right_lower_leg_front',
            rightLowerLegBack: 'right_lower_leg_back'
        },
        offset: { x: 100, y: 50 },
        imageArray
    }); 

    segmentationWorker.onmessage = e => {
        const { type, averages, extremePoints, partNames } = e.data;
        
        if (type === 'combinedResults' && (averages || extremePoints)) {
            
            processedData = {
                averages,
                extremePoints,
                partNames,
                timestamp: Date.now()
            };

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            // const ctx = canvas.getContext('2d');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        // wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        // mainContainer.appendChild(wrapper);

// Determine which workers to use based on extreme points
const handParts = [
    'leftHand', 'rightHand', 
    'leftUpperArmFront', 'leftUpperArmBack', 
    'leftLowerArmFront', 'leftLowerArmBack',
    'rightUpperArmFront', 'rightUpperArmBack', 
    'rightLowerArmFront', 'rightLowerArmBack'
];

const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any hand or leg parts are present
const hasHandParts = handParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

const workersToUse = [];
if (hasHandParts) {
    const postprocessingWorker = new Worker('handworker.js');
    workersToUse.push({
        worker: postprocessingWorker,
        type: 'hand'
    });
}

if (hasLegParts) {
    const legWorker = new Worker('legworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 15, 20, 35, 46],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations; // Assuming this is correctly set before processing starts

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

console.log('generatedImages :>> ', generatedImages);

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    // if (firstImageType === secondImageType) {
    //     console.error(`Cannot combine images of the same type: ${firstImageType}`);
    //     return; // Exit the function immediately
    // }

    
    // if (generatedImages.length > Math.max(index1, index2)) {
    //     const imagePromises = [index1, index2].map(idx => {
    //         return new Promise((resolve, reject) => {
    //             const imgInfo = generatedImages[idx];
    //             const img = new Image();
    //             // // console.log('img :>> ', img);

    //             if (imgInfo.imageUrl) {
    //                 img.src = imgInfo.imageUrl;
    //             } else {
    //                 try {
    //                     img.src = createImageFromData(
    //                         imgInfo.imageData,
    //                         imgInfo.width,
    //                         imgInfo.height
    //                     );
    //                 } catch (error) {
    //                     console.error('Error creating image:', error);
    //                     reject(error);
    //                     return;
    //                 }
    //             }

    //             img.onload = () => resolve(img);
    //             img.onerror = reject;
    //         });
    //     });

    //     Promise.all(imagePromises)
    //         .then(([img1, img2]) => safelyCombineImages(img1, img2))
    //         .then(combinedImg => {
    //             const combinedContainer = document.createElement('div');
    //             combinedContainer.className = 'combined-images-container';

    //             const combinedWrapper = document.createElement('div');
    //             combinedWrapper.className = 'image-wrapper combined';
    //             combinedWrapper.appendChild(combinedImg);

    //             const verificationInfo = document.createElement('div');
    //             verificationInfo.className = 'verification-info';

    //             combinedContainer.appendChild(verificationInfo);
    //             combinedContainer.appendChild(combinedWrapper);

    //             const container = document.getElementById('imageContainer');
    //             container.appendChild(combinedContainer);

    //             // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
    //         })
    //         .catch(error => {
    //             console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

    //             const errorContainer = document.createElement('div');
    //             errorContainer.className = 'verification-info';
    //             errorContainer.textContent = `Error combining images: ${error.message}`;

    //             const container = document.getElementById('imageContainer');
    //             container.appendChild(errorContainer);
    //         });
      
    //     }


    }

const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
     
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});


function startSequentialAnimation() {
    // Create a canvas for combining images
    const combinedCanvas = document.createElement('canvas');
    const ctx = combinedCanvas.getContext('2d');
    
    // Set canvas dimensions based on original image size
    combinedCanvas.width = generatedImages[0].image.width;
    combinedCanvas.height = generatedImages[0].image.height;
    
    // Group images by type
    const handImages = generatedImages.filter(img => img.type === 'hand');
    const legImages = generatedImages.filter(img => img.type === 'leg');
    
    // Create wrapper for combined images
    const combinedWrapper = document.createElement('div');
    combinedWrapper.className = 'image-wrapper active';
    imageContainer.appendChild(combinedWrapper);
    
    function combineAndShowImages(handIndex = 0, legIndex = 0) {
        // Clear canvas
        ctx.clearRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // Draw hand image
        if (handImages[handIndex]) {
            ctx.globalAlpha = 1;
            ctx.drawImage(handImages[handIndex].image, 0, 0);
        }
        
        // Draw leg image
        if (legImages[legIndex]) {
            ctx.globalAlpha = 1;
            ctx.drawImage(legImages[legIndex].image, 0, 0);
        }
        
        // Create combined image
        const combinedImage = new Image();
        combinedImage.src = combinedCanvas.toDataURL();
        
        // Update display
        combinedWrapper.innerHTML = '';
        combinedWrapper.appendChild(combinedImage);
        
        // Schedule next combination if needed
        setTimeout(() => {
            const nextHandIndex = (handIndex + 1) % handImages.length;
            const nextLegIndex = (legIndex + 1) % legImages.length;
            combineAndShowImages(nextHandIndex, nextLegIndex);
        }, 200);
    }
    
    // Start the combination process
    combineAndShowImages();
}

// Update the worker processing section
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const img = new Image();
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            image: img,
                            width: variation.width,
                            height: variation.height
                        });
                    });

                    // Start animation when all workers are done
                    if (generatedImages.length === totalworkerimages) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});


// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    // const ctx = canvas.getContext('2d');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}

}
 
    };




}




async function handcode() {

    const img = document.getElementById('sourceImage');
    const mainContainer = document.getElementById('mainContainer');
    mainContainer.innerHTML = '';

    const imageGrid = document.createElement('div');
    imageGrid.className = 'image-grid';

    const segmentation = segmentationResult;
    const bodyPartImages = {};
    // collectedPoints.clear();

    for (let partId = 0; partId < 24; partId++) {
        const partName = Object.keys(BODY_PARTS)[partId];
        if (!partName) continue;
        if (!segmentation.data.includes(partId)) {

            continue; 
        }

        const segmentCanvas = document.createElement('canvas');
        segmentCanvas.width = img.width;
        segmentCanvas.height = img.height;
        // const segmentCtx = segmentCanvas.getContext('2d');
        const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
        segmentCtx.drawImage(img, 0, 0);

        const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
      
        for (let i = 0; i < segmentation.data.length; i++) {
            if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
        }

        const variations = await processSegmentVariations(imageData, partName);
        bodyPartImages[partName] = variations.map(v => ({
            imageData: v.data,
            width: img.width,
            height: img.height,
            extremePoints: v.extremePoints
        }));
    }
    
    const pointsToProcess = {
        leftFace: collectedPoints.get('left_face'),
        rightFace: collectedPoints.get('right_face'),
        leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
        leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
        leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
        leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
        leftHand: collectedPoints.get('left_hand'),
        rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
        rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
        rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
        rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
        rightHand: collectedPoints.get('right_hand'),
        torsoFront: collectedPoints.get('torso_front'),
        torsoBack: collectedPoints.get('torso_back'),
        leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
        leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
        leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
        leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
        rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
        rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
        rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
        rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
        leftFoot: collectedPoints.get('left_foot'),
        rightFoot: collectedPoints.get('right_foot')
    };

    segmentationWorker.postMessage({
        type: 'calculateAverage',
        points: pointsToProcess,
        bodyPartImages,
        partNames: {
            leftUpperArmFront: 'left_upper_arm_front',
            leftUpperArmBack: 'left_upper_arm_back',
            leftLowerArmFront: 'left_lower_arm_front',
            leftLowerArmBack: 'left_lower_arm_back',
            leftHand: 'left_hand',
            rightUpperArmFront: 'right_upper_arm_front',
            rightUpperArmBack: 'right_upper_arm_back',
            rightLowerArmFront: 'right_lower_arm_front',
            rightLowerArmBack: 'right_lower_arm_back',
            rightHand: 'right_hand',
            leftFoot: 'left_foot',
            rightFoot: 'right_foot',
            leftUpperFoot: 'left_upper_foot',
            leftLowerFoot: 'left_lower_foot',
            rightUpperFoot: 'right_upper_foot',
            rightLowerFoot: 'right_lower_foot',
            leftUpperLegFront: 'left_upper_leg_front',
            leftUpperLegBack: 'left_upper_leg_back',
            leftLowerLegFront: 'left_lower_leg_front',
            leftLowerLegBack: 'left_lower_leg_back',
            rightUpperLegFront: 'right_upper_leg_front',
            rightUpperLegBack: 'right_upper_leg_back',
            rightLowerLegFront: 'right_lower_leg_front',
            rightLowerLegBack: 'right_lower_leg_back'
        },
        offset: { x: 100, y: 50 },
        imageArray
    }); 

    segmentationWorker.onmessage = e => {
        const { type, averages, extremePoints, partNames } = e.data;
        // console.log(e.data);
        if (type === 'combinedResults' && (averages || extremePoints)) {
            
            processedData = {
                averages,
                extremePoints,
                partNames,
                timestamp: Date.now()
            };

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            // const ctx = canvas.getContext('2d');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

// Determine which workers to use based on extreme points
const handParts = [
    'leftHand', 'rightHand', 
    'leftUpperArmFront', 'leftUpperArmBack', 
    'leftLowerArmFront', 'leftLowerArmBack',
    'rightUpperArmFront', 'rightUpperArmBack', 
    'rightLowerArmFront', 'rightLowerArmBack'
];

// Check if any hand parts are present
const hasHandParts = handParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasHandParts) {
    const postprocessingWorker = new Worker('handworker.js');
    workersToUse.push({
        worker: postprocessingWorker,
        type: 'hand'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}


const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        Promise.all(imagePromises)
            .then(([img1, img2]) => safelyCombineImages(img1, img2))
            .then(combinedImg => {
                const combinedContainer = document.createElement('div');
                combinedContainer.className = 'combined-images-container';

                const combinedWrapper = document.createElement('div');
                combinedWrapper.className = 'image-wrapper combined';
                combinedWrapper.appendChild(combinedImg);

                const verificationInfo = document.createElement('div');
                verificationInfo.className = 'verification-info';
                verificationInfo.innerHTML = `
                    Combination Verification:
                    <br>First Image Type: ${generatedImages[index1].type}
                    <br>Second Image Type: ${generatedImages[index2].type}
                    <br>First Image Dimensions: ${generatedImages[index1].width}x${generatedImages[index1].height}
                    <br>Second Image Dimensions: ${generatedImages[index2].width}x${generatedImages[index2].height}
                    <br>Combined Image Dimensions: ${combinedImg.width}x${combinedImg.height}
                `;

                combinedContainer.appendChild(verificationInfo);
                combinedContainer.appendChild(combinedWrapper);

                const container = document.getElementById('imageContainer');
                container.appendChild(combinedContainer);

                // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
            })
            .catch(error => {
                console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

                const errorContainer = document.createElement('div');
                errorContainer.className = 'verification-info';
                errorContainer.textContent = `Error combining images: ${error.message}`;

                const container = document.getElementById('imageContainer');
                container.appendChild(errorContainer);
            });
      
        }
}


const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}

    // Helper function to create an image from ImageData
    function createImageFromData(imageData, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
        return canvas.toDataURL();
    }


        }
    
    
    }


}

async function legcode() {

const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';
if (!window.imageArray) {
        window.imageArray = [];
    }
    
    // Push the current image to the array
    window.imageArray.push(img);
const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;

    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('legworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

// const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}


const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;

document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

        }
}

    const canvasImages = [];
    function convertImageDataToUrl(imageData, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        const imgDataObj = new ImageData(imageData, width, height);
        
        ctx.putImageData(imgDataObj, 0, 0);
        return canvas.toDataURL('image/png');
    }

    function displayImagesOnCanvases() {
    // Clear previous canvas images
    canvasImages.length = 0;

    // Get the container for canvases
    const canvasContainer = document.getElementById('canvasContainer');
    canvasContainer.innerHTML = ''; // Clear previous canvases

    generatedImages.forEach((imageData, index) => {
        // Create a wrapper div for each canvas
        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-wrapper';

        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        canvas.id = `canvas-${index}`;

        // Get canvas context
        const ctx = canvas.getContext('2d');

        // Create an image element to draw on canvas
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, imageData.width, imageData.height);
            
            const canvasImageData = ctx.getImageData(0, 0, imageData.width, imageData.height);

            const effectWorker = new Worker('js/running2Worker.js');
        // effectWorker.onmessage = (effectEvent) => {
        //     // Process the modified image data
        //     const modifiedCanvas = document.createElement('canvas');
        //     modifiedCanvas.width = imageData.width;
        //     modifiedCanvas.height = imageData.height;
        //     const modifiedCtx = modifiedCanvas.getContext('2d');
        //     // alert(modifiedCanvas)
            
        //     // Create a new ImageData from the worker's result
        //     modifiedCtx.putImageData(effectEvent.data.imageData, 0, 0);
            
        //     // Create an image from the modified canvas
        //     const modifiedImg = new Image();
        //     modifiedImg.src = modifiedCanvas.toDataURL('image/png');
            
        //                         // Create wrapper and display
        //                         const wrapper = document.createElement('div');
        //                         wrapper.className = 'image-wrapper1';
        //                         wrapper.appendChild(modifiedImg);

        //                         const container = document.getElementById('imageContainer');
        //                         container.appendChild(wrapper);

        //                         // Store in generatedImages
        //                         generatedImages.push({ 
        //                             index: variationIndex, 
        //                             type: workersToUse[index].type, 
        //                             image: modifiedImg, 
        //                             imageUrl: modifiedImg.src, 
        //                             imageData: effectEvent.data.imageData.data, 
        //                             width: variation.width, 
        //                             height: variation.height 
        //                         });

        //                         displayImagesOnCanvases();
        //                     };

                            
            canvasImages.push({
                canvas: canvas,
                imageData: imageData
            });
        };
        img.src = imageData.imageUrl;

        // Create info paragraph
        const infoP = document.createElement('p');
        infoP.textContent = `Canvas ${index + 1} - Type: ${imageData.type}, Width: ${imageData.width}, Height: ${imageData.height}`;

        // Append canvas and info to wrapper
        // wrapper.appendChild(canvas);
        // wrapper.appendChild(infoP);

        // Add wrapper to container
        // canvasContainer.appendChild(wrapper);
    });

}


const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}
    // // Worker processing
    // Promise.allSettled(
    //     workersToUse.map(({ worker }, index) =>
    //         new Promise((resolve, reject) => {
    //             worker.onmessage = (e) => {
    //                 if (e.data.type === 'processedVariations') {
    //                     if (!e.data.variations || e.data.variations.length === 0) {
    //                         console.warn(`No variations for ${workersToUse[index].type} worker`);
    //                         return;
    //                     }

    //                     workersToUse[index].variations = e.data.variations;

    //                     e.data.variations.forEach((variation, variationIndex) => {
    //                         const img = document.createElement('img');
    //                         img.src = variation.imageUrl || createImageFromData(
    //                             variation.imageData,
    //                             variation.width,
    //                             variation.height
    //                         );
                            
    //                         const wrapper = document.createElement('div');
    //                         wrapper.className = 'image-wrapper1';

    //                         wrapper.appendChild(img);

    //                         const container = document.getElementById('imageContainer');
    //                         container.appendChild(wrapper);
        
    //         function convertImageDataToUrl(imageData, width, height) {
    //             // Create a canvas to draw the image data
    //             const canvas = document.createElement('canvas');
    //             canvas.width = width;
    //             canvas.height = height;
                
    //             // Get the canvas context
    //             const ctx = canvas.getContext('2d');
                
    //             // Create an ImageData object from the Uint8ClampedArray
    //             const imgData = new ImageData(imageData, width, height);
                
    //             // Draw the image data on the canvas
    //             ctx.putImageData(imgData, 0, 0);
                
    //             // Convert the canvas to a data URL
    //             return canvas.toDataURL('image/png');
    //         }
                
    //     const imageUrl = convertImageDataToUrl(variation.imageData, variation.width, variation.height);

    //     // Store image data in generatedImages array
    //     generatedImages.push({ 
    //         index: variationIndex, 
    //         type: workersToUse[index].type, 
    //         image: img, 
    //         imageUrl: imageUrl, 
    //         imageData: variation.imageData, 
    //         width: variation.width, 
    //         height: variation.height 
    //     });
    //     displayImagesOnCanvases();



    // function displayGeneratedImages() {
    //     const imageDisplay = document.getElementById('imageDisplay');
    //     imageDisplay.innerHTML = ''; // Clear previous images

    //     generatedImages.forEach((imageData, index) => {
    //         const imageContainer = document.createElement('div');
    //         imageContainer.classList.add('image-item');

    //         const imgElement = document.createElement('img');
            
    //         // Use the created imageUrl
    //         imgElement.src = imageData.imageUrl;

    //         const infoP = document.createElement('p');
    //         infoP.textContent = `Image ${index + 1} - Type: ${imageData.type}, Width: ${imageData.width}, Height: ${imageData.height}`;

    //         imageContainer.appendChild(imgElement);
    //         imageContainer.appendChild(infoP);
    //         imageDisplay.appendChild(imageContainer);
    //     });

    //     // console.log('Generated Images:', generatedImages);
    // }
    //     });

    //                     resolve({
    //                         type: workersToUse[index].type,
    //                         variations: e.data.variations
    //                     });
                
    //                 }
    //             };

    //             worker.onerror = (error) => {
    //                 console.error('Worker error:', error);
    //                 reject(error);
    //             };

    //             worker.postMessage(workerMessages[index]);
    //         })
    //     )
    // ).catch(error => {
    //     console.error('Overall worker processing error:', error);
    // });

    // Helper function to create an image from ImageData
    function createImageFromData(imageData, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
        return canvas.toDataURL();
    }


    }


}
}

async function legfootcode() {
// console.log("button clicked");

const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('legfootworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        Promise.all(imagePromises)
            .then(([img1, img2]) => safelyCombineImages(img1, img2))
            .then(combinedImg => {
                const combinedContainer = document.createElement('div');
                combinedContainer.className = 'combined-images-container';

                const combinedWrapper = document.createElement('div');
                combinedWrapper.className = 'image-wrapper combined';
                combinedWrapper.appendChild(combinedImg);

                const verificationInfo = document.createElement('div');
                verificationInfo.className = 'verification-info';
               
               
                combinedContainer.appendChild(verificationInfo);
                combinedContainer.appendChild(combinedWrapper);

                const container = document.getElementById('imageContainer');
                container.appendChild(combinedContainer);

                // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
            })
            .catch(error => {
                console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

                const errorContainer = document.createElement('div');
                errorContainer.className = 'verification-info';
                errorContainer.textContent = `Error combining images: ${error.message}`;

                const container = document.getElementById('imageContainer');
                container.appendChild(errorContainer);
            });      
      }
}


const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}


// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}

async function rightfootcode() {

const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,   
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

        // Determine which workers to use based on extreme points
// Determine which workers to use based on extreme points

const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    // console.log("right foot ");
    const legWorker = new Worker('rightfootworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}

        // Promise.all(imagePromises)
        //     .then(([img1, img2]) => safelyCombineImages(img1, img2))
        //     .then(combinedImg => {
        //         const combinedContainer = document.createElement('div');
        //         combinedContainer.className = 'combined-images-container';

        //         const combinedWrapper = document.createElement('div');
        //         combinedWrapper.className = 'image-wrapper combined';
        //         combinedWrapper.appendChild(combinedImg);

        //         const verificationInfo = document.createElement('div');
        //         verificationInfo.className = 'verification-info';
               
               

        //         combinedContainer.appendChild(verificationInfo);
        //         combinedContainer.appendChild(combinedWrapper);

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(combinedContainer);

        //         // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
        //     })
        //     .catch(error => {
        //         console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

        //         const errorContainer = document.createElement('div');
        //         errorContainer.className = 'verification-info';
        //         errorContainer.textContent = `Error combining images: ${error.message}`;

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(errorContainer);
        //     });
      
        }
}

// Worker processing
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // // console.log('generatedImages :>> ', generatedImages);
                  
                  
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });


const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}
// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}

async function leftlegonly() {


const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

        // Determine which workers to use based on extreme points

// Determine which workers to use based on extreme points
const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('leftlegonlyworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        // Promise.all(imagePromises)
        //     .then(([img1, img2]) => safelyCombineImages(img1, img2))
        //     .then(combinedImg => {
        //         const combinedContainer = document.createElement('div');
        //         combinedContainer.className = 'combined-images-container';

        //         const combinedWrapper = document.createElement('div');
        //         combinedWrapper.className = 'image-wrapper combined';
        //         combinedWrapper.appendChild(combinedImg);

        //         const verificationInfo = document.createElement('div');
        //         verificationInfo.className = 'verification-info';
        //         verificationInfo.innerHTML = `
        //             Combination Verification:
        //             <br>First Image Type: ${generatedImages[index1].type}
        //             <br>Second Image Type: ${generatedImages[index2].type}
        //             <br>First Image Dimensions: ${generatedImages[index1].width}x${generatedImages[index1].height}
        //             <br>Second Image Dimensions: ${generatedImages[index2].width}x${generatedImages[index2].height}
        //             <br>Combined Image Dimensions: ${combinedImg.width}x${combinedImg.height}
        //         `;

        //         combinedContainer.appendChild(verificationInfo);
        //         combinedContainer.appendChild(combinedWrapper);

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(combinedContainer);

        //         // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
        //     })
        //     .catch(error => {
        //         console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

        //         const errorContainer = document.createElement('div');
        //         errorContainer.className = 'verification-info';
        //         errorContainer.textContent = `Error combining images: ${error.message}`;

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(errorContainer);
        //     });
      
        }
}

// // Worker processing
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // console.log('generatedImages :>> ', generatedImages);
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });



const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}
// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}

async function rightlegonly() {

// console.log("1111111111111111");
const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

        // Determine which workers to use based on extreme points

// Determine which workers to use based on extreme points
const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('rightlegonlyworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        // Promise.all(imagePromises)
        //     .then(([img1, img2]) => safelyCombineImages(img1, img2))
        //     .then(combinedImg => {
        //         const combinedContainer = document.createElement('div');
        //         combinedContainer.className = 'combined-images-container';

        //         const combinedWrapper = document.createElement('div');
        //         combinedWrapper.className = 'image-wrapper combined';
        //         combinedWrapper.appendChild(combinedImg);

        //         const verificationInfo = document.createElement('div');
        //         verificationInfo.className = 'verification-info';
        //         verificationInfo.innerHTML = `
        //             Combination Verification:
        //             <br>First Image Type: ${generatedImages[index1].type}
        //             <br>Second Image Type: ${generatedImages[index2].type}
        //             <br>First Image Dimensions: ${generatedImages[index1].width}x${generatedImages[index1].height}
        //             <br>Second Image Dimensions: ${generatedImages[index2].width}x${generatedImages[index2].height}
        //             <br>Combined Image Dimensions: ${combinedImg.width}x${combinedImg.height}
        //         `;

        //         combinedContainer.appendChild(verificationInfo);
        //         combinedContainer.appendChild(combinedWrapper);

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(combinedContainer);

        //         // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
        //     })
        //     .catch(error => {
        //         console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

        //         const errorContainer = document.createElement('div');
        //         errorContainer.className = 'verification-info';
        //         errorContainer.textContent = `Error combining images: ${error.message}`;

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(errorContainer);
        //     });
      
        }
}

// // Worker processing
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // console.log('generatedImages :>> ', generatedImages);
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });


const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
                }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });

                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}

// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}

async function rightarmonly() {

// console.log("1111111111111111");
const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

        // Determine which workers to use based on extreme points

// Determine which workers to use based on extreme points
const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('rightarmonlyworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        // Promise.all(imagePromises)
        //     .then(([img1, img2]) => safelyCombineImages(img1, img2))
        //     .then(combinedImg => {
        //         const combinedContainer = document.createElement('div');
        //         combinedContainer.className = 'combined-images-container';

        //         const combinedWrapper = document.createElement('div');
        //         combinedWrapper.className = 'image-wrapper combined';
        //         combinedWrapper.appendChild(combinedImg);

        //         const verificationInfo = document.createElement('div');
        //         verificationInfo.className = 'verification-info';
        //         verificationInfo.innerHTML = `
        //             Combination Verification:
        //             <br>First Image Type: ${generatedImages[index1].type}
        //             <br>Second Image Type: ${generatedImages[index2].type}
        //             <br>First Image Dimensions: ${generatedImages[index1].width}x${generatedImages[index1].height}
        //             <br>Second Image Dimensions: ${generatedImages[index2].width}x${generatedImages[index2].height}
        //             <br>Combined Image Dimensions: ${combinedImg.width}x${combinedImg.height}
        //         `;

        //         combinedContainer.appendChild(verificationInfo);
        //         combinedContainer.appendChild(combinedWrapper);

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(combinedContainer);

        //         // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
        //     })
        //     .catch(error => {
        //         console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

        //         const errorContainer = document.createElement('div');
        //         errorContainer.className = 'verification-info';
        //         errorContainer.textContent = `Error combining images: ${error.message}`;

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(errorContainer);
        //     });
      
        }
}

// // Worker processing
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // console.log('generatedImages :>> ', generatedImages);

//                         function displayGeneratedImages() {
//             const imageDisplay = document.getElementById('imageDisplay');
            
//             // Clear previous images
//             imageDisplay.innerHTML = '';

//             // Loop through generated images and create display elements
//             generatedImages.forEach((imageData, index) => {
//                 // Create a container for each image
//                 const imageContainer = document.createElement('div');
//                 imageContainer.classList.add('image-item');

//                 // Create image element
//                 const imgElement = document.createElement('img');
                
//                 // Determine how to set the image source
//                 if (imageData.imageUrl) {
//                     imgElement.src = imageData.imageUrl;
//                 } else if (imageData.imageData) {
//                     // If imageData is a base64 string or Blob
//                     imgElement.src = imageData.imageData;
//                 } else if (imageData.image instanceof HTMLImageElement) {
//                     // If it's an already created image element
//                     imgElement.src = imageData.image.src;
//                 }

//                 // Create additional info paragraph
//                 const infoP = document.createElement('p');
//                 infoP.textContent = `Image ${index + 1} - Type: ${imageData.type}, Width: ${imageData.width}, Height: ${imageData.height}`;

//                 // Append elements
//                 imageContainer.appendChild(imgElement);
//                 imageContainer.appendChild(infoP);
//                 imageDisplay.appendChild(imageContainer);
//             });

//             // Log for debugging
//             // console.log('Generated Images:', generatedImages);
//         }

//         // Call the display function after generating images
//         displayGeneratedImages();
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });



const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}


// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}

async function leftarmonly() {

// console.log("1111111111111111");
const img = document.getElementById('sourceImage');
const mainContainer = document.getElementById('mainContainer');
mainContainer.innerHTML = '';

const imageGrid = document.createElement('div');
imageGrid.className = 'image-grid';

const segmentation = segmentationResult;
const bodyPartImages = {};
// collectedPoints.clear();

for (let partId = 0; partId < 24; partId++) {
    const partName = Object.keys(BODY_PARTS)[partId];
    if (!partName) continue;
    if (!segmentation.data.includes(partId)) {

        continue; 
    
    }

    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = img.width;
    segmentCanvas.height = img.height;
    // const segmentCtx = segmentCanvas.getContext('2d');
    const segmentCtx = segmentCanvas.getContext('2d', { willReadFrequently: true });
    segmentCtx.drawImage(img, 0, 0);

    const imageData = segmentCtx.getImageData(0, 0, img.width, img.height);
  
    for (let i = 0; i < segmentation.data.length; i++) {
        if (segmentation.data[i] !== partId) imageData.data[i * 4 + 3] = 0;
    }

    const variations = await processSegmentVariations(imageData, partName);
    bodyPartImages[partName] = variations.map(v => ({
        imageData: v.data,
        width: img.width,
        height: img.height,
        extremePoints: v.extremePoints
    }));
}

const pointsToProcess = {
    leftFace: collectedPoints.get('left_face'),
    rightFace: collectedPoints.get('right_face'),
    leftUpperArmFront: collectedPoints.get('left_upper_arm_front'),
    leftUpperArmBack: collectedPoints.get('left_upper_arm_back'),
    leftLowerArmFront: collectedPoints.get('left_lower_arm_front'),
    leftLowerArmBack: collectedPoints.get('left_lower_arm_back'),
    leftHand: collectedPoints.get('left_hand'),
    rightUpperArmFront: collectedPoints.get('right_upper_arm_front'),
    rightUpperArmBack: collectedPoints.get('right_upper_arm_back'),
    rightLowerArmFront: collectedPoints.get('right_lower_arm_front'),
    rightLowerArmBack: collectedPoints.get('right_lower_arm_back'),
    rightHand: collectedPoints.get('right_hand'),
    torsoFront: collectedPoints.get('torso_front'),
    torsoBack: collectedPoints.get('torso_back'),
    leftUpperLegFront: collectedPoints.get('left_upper_leg_front'),
    leftUpperLegBack: collectedPoints.get('left_upper_leg_back'),
    leftLowerLegFront: collectedPoints.get('left_lower_leg_front'),
    leftLowerLegBack: collectedPoints.get('left_lower_leg_back'),
    rightUpperLegFront: collectedPoints.get('right_upper_leg_front'),
    rightUpperLegBack: collectedPoints.get('right_upper_leg_back'),
    rightLowerLegFront: collectedPoints.get('right_lower_leg_front'),
    rightLowerLegBack: collectedPoints.get('right_lower_leg_back'),
    leftFoot: collectedPoints.get('left_foot'),
    rightFoot: collectedPoints.get('right_foot')
};

segmentationWorker.postMessage({
    type: 'calculateAverage',
    points: pointsToProcess,
    bodyPartImages,
    partNames: {
        leftUpperArmFront: 'left_upper_arm_front',
        leftUpperArmBack: 'left_upper_arm_back',
        leftLowerArmFront: 'left_lower_arm_front',
        leftLowerArmBack: 'left_lower_arm_back',
        leftHand: 'left_hand',
        rightUpperArmFront: 'right_upper_arm_front',
        rightUpperArmBack: 'right_upper_arm_back',
        rightLowerArmFront: 'right_lower_arm_front',
        rightLowerArmBack: 'right_lower_arm_back',
        rightHand: 'right_hand',
        leftFoot: 'left_foot',
        rightFoot: 'right_foot',
        leftUpperFoot: 'left_upper_foot',
        leftLowerFoot: 'left_lower_foot',
        rightUpperFoot: 'right_upper_foot',
        rightLowerFoot: 'right_lower_foot',
        leftUpperLegFront: 'left_upper_leg_front',
        leftUpperLegBack: 'left_upper_leg_back',
        leftLowerLegFront: 'left_lower_leg_front',
        leftLowerLegBack: 'left_lower_leg_back',
        rightUpperLegFront: 'right_upper_leg_front',
        rightUpperLegBack: 'right_upper_leg_back',
        rightLowerLegFront: 'right_lower_leg_front',
        rightLowerLegBack: 'right_lower_leg_back'
    },
    offset: { x: 100, y: 50 },
    imageArray
}); 

segmentationWorker.onmessage = e => {
    const { type, averages, extremePoints, partNames } = e.data;
    // console.log(e.data);
    if (type === 'combinedResults' && (averages || extremePoints)) {
        
        processedData = {
            averages,
            extremePoints,
            partNames,
            timestamp: Date.now()
        };

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // const ctx = canvas.getContext('2d');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.id = "wrapperid";
        wrapper.appendChild(canvas);
        canvas.id = "canvasid1";
        wrapper.appendChild(document.createElement('div')).className = 'keypoints-label';
        mainContainer.appendChild(wrapper);

        // Determine which workers to use based on extreme points

// Determine which workers to use based on extreme points
const legParts = [
    'leftFoot', 'rightFoot',
    'leftUpperLegFront', 'leftUpperLegBack', 
    'leftLowerLegFront', 'leftLowerLegBack',
    'rightUpperLegFront', 'rightUpperLegBack', 
    'rightLowerLegFront', 'rightLowerLegBack'
];

// Check if any leg parts are present
const hasLegParts = legParts.some(part => 
    extremePoints[part] && 
    Object.keys(extremePoints[part]).length > 0
);

// Create workers conditionally
const workersToUse = [];
if (hasLegParts) {
    const legWorker = new Worker('leftarmonlyworker.js');
    workersToUse.push({
        worker: legWorker,
        type: 'leg'
    });
}

numberOfVariations = document.getElementById('imageCount').value;

const workerMessages = workersToUse.map(({type}) => ({
    type: e.data.type,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    width: canvas.width,
    height: canvas.height,
    extremePoints,
    averages,
    timestamp: Date.now(),
    partNames,
    numberOfVariations, 
    bodyPartImages,
    rotationAngles: [0, 45, 90, 135, 180],
    imageArray
}));

let accumulatedVariations = [];

let totalVariationsExpected = numberOfVariations;

let totalworkerimages = 2 * numberOfVariations;

const generatedImages = [];
let combinedImagesProcessed = 0;

// Track already processed pairs
const processedPairs = new Set();

function attemptCombination() {
    for (let i = 0; i < totalworkerimages; i += 2) {
        // Stop if we already have the required number of combined images
        if (combinedImagesProcessed >= numberOfVariations) {
            break;
        }

        // Check if the pair has already been processed
        const pairKey = `${i}-${i + 1}`;
        if (generatedImages.length >= i + 2 && !processedPairs.has(pairKey)) {
            combineImagesByIndexes(i, i + 1); // Combine images in pairs
            processedPairs.add(pairKey); // Mark the pair as processed
            combinedImagesProcessed++;
        }
    }
}

// Overwrite the `push` method of the generatedImages array to trigger combination checks dynamically
const originalPush = generatedImages.push;
generatedImages.push = function (...args) {
    originalPush.apply(this, args);
    attemptCombination(); // Check if combinations can be processed
};

function safelyCombineImages(img1, img2) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = img1.width;
        canvas.height = img1.height;

        ctx.drawImage(img1, 0, 0);

        ctx.globalAlpha = 1;

        const x = (canvas.width - img2.width) / 2;
        const y = (canvas.height - img2.height) / 2;
        ctx.drawImage(img2, x, y);

        ctx.globalAlpha = 1;

        const combinedImg = new Image();
        combinedImg.onload = () => resolve(combinedImg);
        combinedImg.onerror = reject;
        combinedImg.src = canvas.toDataURL();
    });
}

function combineImagesByIndexes(index1, index2) {
    const firstImageType = generatedImages[index1].type;
    const secondImageType = generatedImages[index2].type;

    // console.log(`Attempting to combine - First Type: ${firstImageType}, Second Type: ${secondImageType}`);

    // Prevent combination if types are the same
    if (firstImageType === secondImageType) {
        console.error(`Cannot combine images of the same type: ${firstImageType}`);
        return; // Exit the function immediately
    }

    if (generatedImages.length > Math.max(index1, index2)) {
        const imagePromises = [index1, index2].map(idx => {
            return new Promise((resolve, reject) => {
                const imgInfo = generatedImages[idx];
                const img = new Image();

                if (imgInfo.imageUrl) {
                    img.src = imgInfo.imageUrl;
                } else {
                    try {
                        img.src = createImageFromData(
                            imgInfo.imageData,
                            imgInfo.width,
                            imgInfo.height
                        );
                    } catch (error) {
                        console.error('Error creating image:', error);
                        reject(error);
                        return;
                    }
                }

                img.onload = () => resolve(img);
                img.onerror = reject;
            });
        });

        // Promise.all(imagePromises)
        //     .then(([img1, img2]) => safelyCombineImages(img1, img2))
        //     .then(combinedImg => {
        //         const combinedContainer = document.createElement('div');
        //         combinedContainer.className = 'combined-images-container';

        //         const combinedWrapper = document.createElement('div');
        //         combinedWrapper.className = 'image-wrapper combined';
        //         combinedWrapper.appendChild(combinedImg);

        //         const verificationInfo = document.createElement('div');
        //         verificationInfo.className = 'verification-info';
        //         verificationInfo.innerHTML = `
        //             Combination Verification:
        //             <br>First Image Type: ${generatedImages[index1].type}
        //             <br>Second Image Type: ${generatedImages[index2].type}
        //             <br>First Image Dimensions: ${generatedImages[index1].width}x${generatedImages[index1].height}
        //             <br>Second Image Dimensions: ${generatedImages[index2].width}x${generatedImages[index2].height}
        //             <br>Combined Image Dimensions: ${combinedImg.width}x${combinedImg.height}
        //         `;

        //         combinedContainer.appendChild(verificationInfo);
        //         combinedContainer.appendChild(combinedWrapper);

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(combinedContainer);

        //         // console.log(`Images at indexes ${index1} and ${index2} combined successfully`);
        //     })
        //     .catch(error => {
        //         console.error(`Error combining images at indexes ${index1} and ${index2}:`, error);

        //         const errorContainer = document.createElement('div');
        //         errorContainer.className = 'verification-info';
        //         errorContainer.textContent = `Error combining images: ${error.message}`;

        //         const container = document.getElementById('imageContainer');
        //         container.appendChild(errorContainer);
        //     });
      
        }
}

const imageContainer = document.getElementById('imageContainer');
imageContainer.innerHTML = ''; // Clear existing content
imageContainer.style.position = 'relative';
imageContainer.style.height = '600px'; // Adjust as needed
imageContainer.style.overflow = 'hidden';

// Add styles
const style = document.createElement('style');
style.textContent = `
    #imageContainer {
        position: relative;
        width: 100%;
        margin: 20px 0;
        overflow: hidden;
    }

    .image-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        }

    .image-wrapper.active {
        opacity: 1;
    }

    .image-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;
document.head.appendChild(style);

// Promise.allSettled code remains the same
Promise.allSettled(
    workersToUse.map(({ worker }, index) =>
        new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'processedVariations') {
                    if (!e.data.variations || e.data.variations.length === 0) {
                        console.warn(`No variations for ${workersToUse[index].type} worker`);
                        return;
                    }

                    workersToUse[index].variations = e.data.variations;

                    e.data.variations.forEach((variation, variationIndex) => {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'image-wrapper';
                        
                        const img = document.createElement('img');
                        img.src = variation.imageUrl || createImageFromData(
                            variation.imageData,
                            variation.width,
                            variation.height
                        );

                        wrapper.appendChild(img);
                        imageContainer.appendChild(wrapper);

                        generatedImages.push({
                            index: variationIndex,
                            type: workersToUse[index].type,
                            wrapper: wrapper,
                            image: img
                        });
                    });

                    // Start animation when all workers are done
                    if (index === workersToUse.length - 1) {
                        startSequentialAnimation();
                    }

                    resolve({
                        type: workersToUse[index].type,
                        variations: e.data.variations
                    });
                }
            };

            worker.onerror = (error) => {
                console.error('Worker error:', error);
                reject(error);
            };

            worker.postMessage(workerMessages[index]);
        })
    )
).catch(error => {
    console.error('Overall worker processing error:', error);
});

// Modified sequential animation function for continuous animation
function startSequentialAnimation() {
    let currentIndex = 0;
    
    // First hide all images
    generatedImages.forEach(item => {
        item.wrapper.classList.remove('active');
    });

    function showNextImage() {
        // Hide current image
        if (currentIndex > 0) {
            generatedImages[currentIndex - 1].wrapper.classList.remove('active');
        } else {
            // When starting a new cycle, hide the last image
            generatedImages[generatedImages.length - 1].wrapper.classList.remove('active');
        }

        // Show next image
        generatedImages[currentIndex].wrapper.classList.add('active');

        // Increment counter
        currentIndex = (currentIndex + 1) % generatedImages.length;

        // Schedule next image - animation continues indefinitely
        setTimeout(showNextImage, 200);
    }

    // Start the sequence
    showNextImage();
}

// // Worker processing
// Promise.allSettled(
//     workersToUse.map(({ worker }, index) =>
//         new Promise((resolve, reject) => {
//             worker.onmessage = (e) => {
//                 if (e.data.type === 'processedVariations') {
//                     if (!e.data.variations || e.data.variations.length === 0) {
//                         console.warn(`No variations for ${workersToUse[index].type} worker`);
//                         return;
//                     }

//                     workersToUse[index].variations = e.data.variations;

//                     e.data.variations.forEach((variation, variationIndex) => {
//                         const img = document.createElement('img');
//                         img.src = variation.imageUrl || createImageFromData(
//                             variation.imageData,
//                             variation.width,
//                             variation.height
//                         );

//                         const wrapper = document.createElement('div');
//                         wrapper.className = 'image-wrapper';

//                         wrapper.appendChild(img);

//                         const container = document.getElementById('imageContainer');
//                         container.appendChild(wrapper);
//                         // console.log(workersToUse[index].type);
//                         generatedImages.push({
//                             index: variationIndex,
//                             type: workersToUse[index].type,
//                             image: img,
//                             imageUrl: variation.imageUrl,
//                             imageData: variation.imageData,
//                             width: variation.width,
//                             height: variation.height
//                         });
//                         // console.log('generatedImages :>> ', generatedImages);
//                     });

//                     resolve({
//                         type: workersToUse[index].type,
//                         variations: e.data.variations
//                     });
//                 }
//             };

//             worker.onerror = (error) => {
//                 console.error('Worker error:', error);
//                 reject(error);
//             };

//             worker.postMessage(workerMessages[index]);
//         })
//     )
// ).catch(error => {
//     console.error('Overall worker processing error:', error);
// });

// Helper function to create an image from ImageData
function createImageFromData(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
    return canvas.toDataURL();
}


    }
}
}



function openVideoModal(videoUrl) {
    const videoModal = document.getElementById('videoModal');
    const youtubeVideo = document.getElementById('youtubeVideo');
    youtubeVideo.src = videoUrl;
    videoModal.style.display = 'flex';
}

function closeVideoModal() {
    const videoModal = document.getElementById('videoModal');
    const youtubeVideo = document.getElementById('youtubeVideo');
    youtubeVideo.src = '';
    videoModal.style.display = 'none';
}
