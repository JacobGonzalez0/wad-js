const {describe, expect, test} = require('@jest/globals');
const { Wad, Graphic, MapData, Flat, Mus2midi, Constants, Playpal } = require("src");
const fs = require("fs")
const mime = require('mime-types')

describe("Load WAD file", () =>{
    let WadFile;
    let graphic;
    let playpal;
    let mus;
    let mapData;

    //clear folder for test
    const dir = './tempWrite'
    if (fs.existsSync(dir)) {
        console.log('Directory exists!')
        fs.rmdir(dir, { recursive: true }, err => {
            if (err) {
              throw err
            }
            
        })
    }else{
        fs.mkdirSync(dir);
    }

    test("Create Wad File", () => { 
        WadFile = new Wad("./DOOM1.WAD"); 
    })

    test("Get Playpal from WAD", () =>{
        playpal = WadFile.playpal;
        expect(playpal).toBeInstanceOf(Playpal)
    })

    test("Grab Graphic from WAD", () =>{
        graphic = new Graphic(WadFile.getLumpByName("TITLEPIC"))
        expect(graphic).toBeInstanceOf(Graphic)
    })

    test("Write Pallete from WAD to PNG", () =>{
        fs.writeFileSync(dir + '/playpal.png', playpal.getImageData(WadFile))
        expect(mime.lookup(dir + '/playpal.png')).toEqual(
            "image/png"
        );
    })

    test("Write Colormap from WAD to PNG", () =>{
        fs.writeFileSync(dir + '/colormap.png', WadFile.colormap.getImageData(WadFile))
        expect(mime.lookup(dir + '/colormap.png')).toEqual(
            "image/png"
        );
    })

    test("Write Graphic from WAD to PNG", () =>{
        fs.writeFileSync(dir + '/test1Graphic.png', graphic.getImageData(WadFile))
        expect(mime.lookup(dir + '/test1Graphic.png')).toEqual(
            "image/png"
        );
    })

    test("Write Graphic from WAD to PNG with different pallete", () =>{
        fs.writeFileSync(dir + '/test2Graphio.png', graphic.getImageData(WadFile, 4))
        expect(mime.lookup(dir + '/test2Graphio.png')).toEqual(
            "image/png"
        );
    })

    test("Grab Mapdata from WAD", ()=>{
        mapData = new MapData(WadFile, "E1M1")
        expect(mapData).toBeInstanceOf(MapData)
    })

    test("Write Map from WAD to PNG", () =>{
        fs.writeFileSync(dir + '/map.png', mapData.getImageData())
        expect(mime.lookup(dir + '/map.png')).toEqual(
            "image/png"
        );
    })

    test("Grab Mus from WAD", () =>{
        mus = new Mus2midi(WadFile.getLumpByName("D_E1M1"))
        expect(mus).toBeInstanceOf(ArrayBuffer)
    })
    
    test("Write Mus from WAD to midi", () =>{
        fs.writeFileSync(dir + '/music.mid', Buffer.from(mus))
        expect(mime.lookup(dir + '/music.mid')).toEqual(
            "audio/midi"
        );
    })

})