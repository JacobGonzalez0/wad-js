# Wad-JS

A NodeJS module for extracting resources and loading Lumps/Data from WAD files


### Supported Features

 - Opening WAD and listing all Lumps
 - Opening and exporting Graphics/Flat Lumps as PNG
 - Map Data parsing and export to PNG
 - Convert MUS data to Midi and export

## Getting started

There are a few different classes/types that handle all these tasks,

    
    
    let { Wad, Graphic, MapData, Flat, Mus2Midi, Playpal } = require("wadjs")
    

 - Wad
 - Graphic
 - MapData
 - Flat
 - Mus2Midi
 - Playpal

You can load a WAD file using the following

    let Wadfile = new Wad("./path/to/wad");

once loaded you can then check on the lumps/files that the wad file has with a console.log of

    Wadfile.getLump( index ) 
or check the LumpType here

    Wadfile.detectLumpType( index )


When you know what file you are working with, you can choose the type and create a new object with the data needed

    let mapData = new MapData(WadFile, "E1M1")
    let graphic = new Graphic(WadFile.getLumpByName("TITLEPIC"))
    let mus = new Mus2midi(WadFile.getLumpByName("D_E1M1"))

You can then write a png or midi using the following

    fs.writeFileSync('./map.png', mapData.getImageData())
    fs.writeFileSync('/music.mid', Buffer.from(mus))
    fs.writeFileSync('/image.png', graphic.getImageData(WadFile))

More examples can be found in the test package included running Jest


More documentation coming soon!
