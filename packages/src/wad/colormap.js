const { createCanvas, loadImage } = require('canvas')
class Colormap{
    
    constructor(data){
        this.colormaps = null;
        this.load(data)
    }
    
    
    load(lumpData) {
        var dv = new DataView(lumpData);
        this.colormaps = [];
        for (var i = 0; i < 34; i++) {
            let cm = []
            for (var j = 0; j < 256; j++) {
                cm.push(dv.getUint8((i*256)+j));
            }
            this.colormaps.push(cm);
        }
    }
    
    
    getImageData(wad) {

        const canvas = createCanvas(
            256, 
            34)
        var context = canvas.getContext("2d");
        var imageData = context.createImageData(256,34);
        for (var j = 0; j < 34; j++) {
            for (var i = 0; i < 256; i++) {
                let col = this.hexToRgb(wad.playpal.palettes[0][this.colormaps[j][i]]);
                imageData.data[(((j*256)+i)*4)+0] = col.r;
                imageData.data[(((j*256)+i)*4)+1] = col.g;
                imageData.data[(((j*256)+i)*4)+2] = col.b;
                imageData.data[(((j*256)+i)*4)+3] = 255;
            }
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
module.exports = Colormap;