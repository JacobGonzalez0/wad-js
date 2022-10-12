const Wad = require("./wad")
const fs = require("fs")
const { parse } = require("path")

let parser = new Wad()
parser.load("DOOM1.WAD")
// let parser = new Wad().load(file)
// console.log(parser.getLump(4))
