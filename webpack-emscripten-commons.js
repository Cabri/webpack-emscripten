const { join } = require("path");
const { existsSync, mkdirSync } = require("fs");

let loaderThis = null;

const initWEC = (loaderThisParam) => {
    loaderThis = loaderThisParam;
}

const workoutBuildPath = (suffix) => {
    let dirs = suffix.split("/");
    dirs.unshift("wasm-tool-emscripten");
    dirs.unshift("build")
    let p = loaderThis.rootContext;

    for(let q of dirs) {
        p = join(p, q);
        if ( !existsSync(p) ) mkdirSync (p);
    }
    return p;
}

module.exports = {initWEC, workoutBuildPath};