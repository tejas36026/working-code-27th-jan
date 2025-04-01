self.onmessage = (e) => {
    const { width, height } = e.data.imageData;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw sine function y = sin(x)
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const scaleX = width / (2 * Math.PI);
    const scaleY = height / 4;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let x = -Math.PI; x <= Math.PI; x += 0.01) {
        const y = Math.sin(x);
        const screenX = centerX + x * scaleX;
        const screenY = centerY - y * scaleY;
        
        if (x === -Math.PI) {
            ctx.moveTo(screenX, screenY);
        } else {
            ctx.lineTo(screenX, screenY);
        }
    }
    
    ctx.stroke();
    self.postMessage({ segmentedImages: [ctx.getImageData(0, 0, width, height)] });
};