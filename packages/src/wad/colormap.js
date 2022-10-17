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
    
    /**
     * 
     * @param {*} palleteData | Place a wad or playpal file
     * @param {Number} palette | Choose the palette index
     * @returns Buffer with png data
     */
    getImageData(palleteData, pallete = 0) {

        let p = pallete;
        let pd;
        try{
            switch(palleteData.constructor.name){
                case "Wad": pd = palleteData.playpal.palettes[p]
                    break; 
                case "Playpal": pd = palleteData.palettes[p]
                    break; 
                default: 
                    throw Error("Unknown type, no palette data found")
                    break;
            }
        }catch(err){
            console.error("The pallatte data does not exist")
            throw Error(err)
        }

        const canvas = createCanvas(
            256, 
            34)
        var context = canvas.getContext("2d");
        var imageData = context.createImageData(256,34);
        for (var j = 0; j < 34; j++) {
            for (var i = 0; i < 256; i++) {
                let col = this.hexToRgb(pd[this.colormaps[j][i]]);
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