const fs = require("fs-extra");
const path = require("path");

const getPath = (paths = []) => {
    if(! Array.isArray(paths)) {
        paths = [paths]
    }
    const pathFile = path.join(...paths)
    const dir = path.dirname(pathFile)
    fs.ensureDirSync(dir) 
    return path.join(__dirname, pathFile)
}

module.exports = {
    getPath
}

