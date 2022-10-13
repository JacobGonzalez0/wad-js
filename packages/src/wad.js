const Playpal = require("./wad/playpal")
const Colormap = require("./wad/colormap")
const fs = require("fs");
const Constants = require("./wad/constants")
const { off } = require("process");

class Wad { 

    constructor(dir){

        this.onProgress = null;
        this.onLoad     = null;
        this.ident      = "";
        this.numlumps   = -1;
        this.dictpos    = -1;
        this.data       = null;
        this.lumps      = [];
        this.playpal    = null;
        this.colormap   = null;
        this.errormsg   = null;
        this.load(dir)

        this.playpal = new Playpal(this.getLumpByName("PLAYPAL"));
        this.colormap = new Colormap(this.getLumpByName("COLORMAP"));
    }
    

    error(msg) {
	    this.errormsg = msg;
    }
    
    loadURL(url){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        var self = this;
        xhr.onload = function(e) {
          if (this.status == 200) {
            var blob = this.response;
            self.load(blob);
          }
        };
        xhr.send();
    }
    
    load(dir) {
        var self = this;

    	self.lumps = [];

    	var offset = 0;
    	var chunkSize = -1;



        let file = fs.readFileSync(dir);
        //Get an arraybuffer for DataView
    
        const ab = new ArrayBuffer(file.byteLength);
        this.data = ab;
        const view = new Uint8Array(ab); 
        for (let i = 0; i < file.length; ++i) {
            view[i] = file[i];
        }

        let headerReader = new DataView(ab)
        this.ident = "";
        for(let i = 0; i < 4; i++){
            this.ident += String.fromCharCode(headerReader.getUint8(i));
        }

        if(this.ident != "IWAD" && this.ident != "PWAD"){
            this.error("Not a valid WAD file.")
            throw Error(this.errormsg)
        }else{
            this.numlumps = headerReader.getInt32(4, true);
            this.dictpos = headerReader.getInt32(8, true);

            offset = this.dictpos;
            chunkSize = 128;

            let buff = new Int32Array(file)
            
            let lastSize = 0
            let index = 0;
            for(let i = 0; i < this.numlumps ; i++){
                
                for(let c = 0; c < 8; c++){
                    if(index == this.numlumps) break;
                    let b = ab.slice(offset, offset + chunkSize);
                    let p = c * 16;
                    let dViewer = new DataView(b);
                    let lumpPos = dViewer.getInt32(p, true);
                    let lumpSize = dViewer.getInt32(p + 4, true);
                    let lumpName = ""
                    let j = 0;
                    for( j = p + 8; j < p + 16; j++){
                        if( dViewer.getUint8(j) != 0){
                            lumpName += String.fromCharCode(dViewer.getUint8(j));
                        }
                    }

                    
                    
                    let lumpEntry = {
                        pos  : lumpPos,
                        size : lumpSize,
                        name : lumpName,
                        index : index
                    }
                    index++
                    this.lumps.push(lumpEntry)
                }
                offset+= chunkSize;
            }

        }


    
    }

   


    save() {
        var name = prompt("Save as...","output.wad");
        if (this.data != null) {
            var toDownload=new Blob([this.data],{type:'octet/stream'});
            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style='display:none;';
            var url=window.URL.createObjectURL(toDownload);
            a.href = url;
            a.download = name;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }

    saveLump(index) {
        var name = this.lumps[index].name + '.lmp';
        var toDownload=new Blob([this.getLump(index)],{type:'octet/stream'});
        var a = document.createElement('a');
        document.body.appendChild(a);
        a.style='display:none;';
        var url=window.URL.createObjectURL(toDownload);
        a.href = url;
        a.download = name;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    lumpExists(name) {
        for (var i = 0; i < this.numlumps; i++) {
            if (this.lumps[i].name == name) {
                return true;
            }
        }
        return false;
    }

    getLumpByName(name) {
        for (var i = 0; i < this.numlumps; i++) {
            if (this.lumps[i].name == name) {
                let l = this.lumps[i];
                return this.data.slice(l.pos,l.pos+l.size);
            }
        }
        return null;
    }
    
    getLumpIndexByName(name) {
        for (var i = this.numlumps-1; i >= 0; i--) {
            if (this.lumps[i].name == name) {
                return i;
            }
        }
        return null;
    }

    getLumpAsText(index) {
        var dat = this.getLump(index);
        return this.lumpDataToText(dat);
    }
    
    lumpDataToText(data) {
        output = "";
        var dv = new DataView(data);
        for (i = 0; i < data.byteLength; i++) output += String.fromCharCode(dv.getUint8(i));
        return output;
    }
    
    getLump(index) {
        let l = this.lumps[index];
        return this.data.slice(l.pos,l.pos+l.size);
    }

    headerCheck(dataView, header) {
        var chrs = header.split("");
        for (var i = 0; i < header.length; i++) {
            if (header.charCodeAt(i) != dataView.getUint8(i)) return false;
        }
        return true;
    }

    // Doom GFX check
    isDoomGFX(dv,lump) {
        // first check the dimensions aren't ridiculous
        if (dv.getUint16(0,true) > 4096) return false; // width
        if (dv.getUint16(2,true) > 4096) return false; // height
        if (dv.getInt16(4,true) > 2000 || dv.getInt16(4,true) < -2000) return false; // offsets
        if (dv.getInt16(6,true) > 2000 || dv.getInt16(6,true) < -2000) return false;

        // then check it ends in 0xFF
        if (dv.getUint8(lump.size-1) != 0xFF) {
            // sometimes the graphics have up to 3 garbage 0x00 bytes at the end
            var found = false;
            for (var b = 1; b <= 4; b++) {
                if (found == false) {
                    if (dv.getUint8(lump.size-b) == 0xFF) {
                        found = true;
                    } else if (dv.getUint8(lump.size-b) != 0x00) {
                        return false;
                    }
                }
            }
            if (found == false) return false;
        }
        // I think this is enough for now. If I get false positives, I'll look into more comprehensive checks.
        return true;
    }

    detectLumpType (index){
        //TODO: get patches from pnames
    
        //data-based detection
        if (this.lumps[index].size != 0) {
            var dv = new DataView(this.data, this.lumps[index].pos);
            if (this.headerCheck(dv, 'MThd')) return Constants.MIDI;
            if (this.headerCheck(dv, 'ID3')) return Constants.MP3;
            if (this.headerCheck(dv, 'MUS')) return Constants.MUS;
            if (this.headerCheck(dv, String.fromCharCode(137)+'PNG')) return PNG;
        }
    
        //name-based detection
        var name = this.lumps[index].name;
        if (Constants.DEMO.indexOf(name) >= 0) return Constants.DEMO;
        if (Constants.TEXTLUMPS.indexOf(name) >= 0) return Constants.TEXT;
        if (Constants.MAPLUMPS.indexOf(name) >= 0) return Constants.MAPDATA;
        if (Constants.DATA_LUMPS.indexOf(name) >= 0) return name;
        if (/^MAP\d\d/.test(name)) return Constants.MAP;
        if (/^E\dM\d/.test(name)) return Constants.MAP;
        if (/_START$/.test(name)) return Constants.MARKER;
        if (/_END$/.test(name)) return Constants.MARKER;
        
    
        if (this.lumps[index].size == 0) return Constants.MARKER;
    
        //between markers
        for (var i = index; i>=0; i--) {
            if (/_END$/.test(this.lumps[i].name)) break;
            if (/_START$/.test(this.lumps[i].name)) {
                let pre = this.lumps[i].name.substr(0,this.lumps[i].name.indexOf("_")+1);
                if (Constants.GRAPHIC_MARKERS.indexOf(pre)>= 0) return Constants.GRAPHIC;
                if (Constants.FLAT_MARKERS.indexOf(pre)>= 0) return Constants.FLAT;
            }
        }
        
        //shitty name-based detection
        if (/^D_/.test(name)) return Constants.MUSIC;
    
        
    
        if (this.isDoomGFX(dv,this.lumps[index])) return Constants.GRAPHIC;
        
        return "demo";
    }
};



module.exports = Wad