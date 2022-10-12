const { createCanvas, loadImage } = require('canvas')
class Flat{
    
    constructor(data){
        this.data = null;
        this.load(data);
    }
    
    
    load(lumpData) {
        var dv = new DataView(lumpData);
        this.data = [];
        for (var j = 0; j < 4096; j++) {
            this.data.push(dv.getUint8(j));
        }
    }
    
    
    getImageData(wad) {
        const canvas = createCanvas(
            64, 
            64)
        var context = canvas.getContext("2d");
        var imageData = context.createImageData(64,64);
        for (var i = 0; i < 4096; i++) {
            let col = this.hexToRgb(wad.playpal.palettes[0][this.data[i]]);
            imageData.data[(i*4)+0] = col.r;
            imageData.data[(i*4)+1] = col.g;
            imageData.data[(i*4)+2] = col.b;
            imageData.data[(i*4)+3] = 255;
        }
        context.putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height)
        const buffer = canvas.toBuffer('image/png')
        return buffer;
    }

    hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}
module.exports = Flat;