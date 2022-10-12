const Wad = require("./wad")
const Graphic  = require('./wad/graphic')
const MapData  = require('./wad/mapdata')
const Flat  = require('./wad/flat')
const fs = require("fs")
const { parse } = require("path")

let parser = new Wad("DOOM1.WAD")
let g = parser.getLump(366
    )
let f = parser.getLump(1267
    )

let test = new Graphic(g)
let flat = new Flat(f)

let maptest = new MapData(parser, "E1M4")
console.log(maptest.getImageData())
fs.writeFileSync('./image2.png', test.getImageData(parser, 1))
fs.writeFileSync('./map.png', maptest.getImageData())
fs.writeFileSync('./flat.png', flat.getImageData(parser))
fs.writeFileSync('./image.png', parser.playpal.getImageData(parser, 1))
// let parser = new Wad().load(file)
// console.log(parser.getLump(4))
