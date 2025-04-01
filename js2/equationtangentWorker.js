self.onmessage = (e) => {
    const { width, height } = e.data.imageData;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw tangent function y = tan(x)
    ctx.strokeStyle = "#0000ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const scaleX = width / (2 * Math.PI);
    const scaleY = height / 4;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let x = -Math.PI/2 + 0.1; x <= Math.PI/2 - 0.1; x += 0.01) {
        const y = Math.tan(x);
        const screenX = centerX + x * scaleX;
        const screenY = centerY - y * scaleY;
        
        if (x === -Math.PI/2 + 0.1) {
            ctx.moveTo(screenX, screenY);
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    
    ctx.stroke();
    self.postMessage({ segmentedImages: [ctx.getImageData(0, 0, width, height)] });
};