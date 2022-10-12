const Wad = require("./wad")
const Graphic  = require('./wad/graphic')
const fs = require("fs")
const { parse } = require("path")

let parser = new Wad("DOOM1.WAD")
let g = parser.getLump(367)

let test = new Graphic(g)


console.log(test.getImageData(parser))
fs.writeFileSync('./image.png', test.getImageData(parser))
// let parser = new Wad().load(file)
// console.log(parser.getLump(4))
