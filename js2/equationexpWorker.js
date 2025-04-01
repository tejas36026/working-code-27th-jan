self.onmessage = (e) => {
    const { width, height } = e.data.imageData;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw exponential function y = e^x
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const scaleX = width / 10;
    const scaleY = height / 100;
    const centerY = height;
    
    for (let x = -5; x <= 5; x += 0.1) {
        const y = Math.exp(x);
        const screenX = width / 2 + x * scaleX;
        const screenY = centerY - y * scaleY;
        
        if (x === -5) {
            ctx.moveTo(screenX, screenY);
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    
    ctx.stroke();
    self.postMessage({ segmentedImages: [ctx.getImageData(0, 0, width, height)] });
};