const fs = require("fs-extra");
const path = require("path");

const getPath = (paths = []) => {
    if(! Array.isArray(paths)) {
        paths = [paths]
    }
    const dir = path.join(...paths)
    fs.ensureDirSync(dir) 
    return path.join(__dirname, dir)
}

module.exports = {
    getPath
}

