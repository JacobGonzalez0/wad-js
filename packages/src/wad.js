const FileReader = require("filereader")
const Playpal = require("./wad/playpal")
const Colormap = require("./wad/colormap")
const fs = require("fs");
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

};

module.exports = Wad