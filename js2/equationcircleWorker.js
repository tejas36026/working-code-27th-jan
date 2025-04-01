self.onmessage = (e) => {
    const { width, height } = e.data.imageData;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw ellipse (x^2)/a^2 + (y^2)/b^2 = 1
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const a = width / 4; // Semi-major axis
    const b = height / 4; // Semi-minor axis
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let angle = 0; angle <= 2 * Math.PI; angle += 0.01) {
        const x = centerX + a * Math.cos(angle);
        const y = centerY + b * Math.sin(angle);
        
        if (angle === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    self.postMessage({ segmentedImages: [ctx.getImageData(0, 0, width, height)] });
};