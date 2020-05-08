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

const concurrent = async (xs, f, n=Infinity) => {
	const finished = Symbol();
	let promises = xs.slice(0, n).map(f), others = xs.slice(n);
	while (promises.length) {
		await Promise.race(promises.map(promise => promise.then(() => {promise[finished] = true;})));
		promises = promises.filter(promise => !promise[finished]);
		promises.push(...others.splice(0, n - promises.length).map(f));
    }
};

module.exports = {
    getPath,
    concurrent
}

