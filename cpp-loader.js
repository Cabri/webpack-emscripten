const { execFileSync } = require("child_process");
const { join, basename } = require("path");
const { createHash } = require("crypto");
const {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync
} = require("fs");
const { tmpdir } = require("os");
const loaderUtils = require("loader-utils");
const {initWEC, workoutBuildPath} = require("./webpack-emscripten-commons");

const emcc = "emcc";

let debug, mode;

function checkEmccIsThere(loaderThis) {
    try {
        let r = execFileSync(emcc, ["--version"]);
        if( r.indexOf('\r')>-1)
            r = r.substring(0, r.indexOf('\r'));
        console.log(r);
    } catch (error) {
        console.log("Error: emcc sounds not to be in the PATH.")
        loaderThis.emitError(error);
    }
}

function runEmcc(cwd, cppFile, includeDir) {

    let args = [ "-DEmscripten", "-std=c++11",  "--bind"];
    if (mode === "development")
        args.push(...["-g4", "-D_DEBUG"]);
    else args.push(...["g0", "-Oz"]);
    if(/.cpp/i.test(cppFile)) args.push( "-std=c++11");
    if(includeDir) args.push(`-I${includeDir}`);
    args.push(...["-Isrc", `-I${cwd}`, "-I/usr/local/include"]);
    const oFile = extractRoot(cppFile) + ".o";
    args.push(...["-o", oFile, "-c", cppFile]);
    const options = { cwd };
    if(debug) console.log("Running emscripten:", emcc, args, options);
    console.log("Compiling " + basename(cppFile));
    let r = execFileSync(emcc, args, options);
    console.log("emscripten finished.");
    return r;
}

const extractRoot = (cppFile) => {return cppFile.replace(/.c(pp)?$/i, "")}

module.exports = function(source, map, meta) {
    initWEC(this);
    checkEmccIsThere (this);
    const tmpdir = workoutBuildPath("object");
    const filenameRoot = extractRoot(basename(this.resource));
    debug = this.debug;
    mode = this.mode;
    if(source.toString() === filenameRoot + ".o") {
        // prevent re-entrant (TODO: why does this happen?)
        return "";
    }
    const file = join(tmpdir, basename(this.resource));
    // THINKME: use options for escmripten?
    const options = loaderUtils.getOptions(this) || {};

    if(existsSync(file)) {
        const oldSource = readFileSync(file);
        if(oldSource.toString() === source.toString() ) {
            return `${filenameRoot}.o`;
        }
    }
    //console.log("File? ", file)
    //console.log("---"); console.log(source.toString()); console.log("---");
    writeFileSync(file, source.toString());
    console.log("Invoking compilation of " + file);
    runEmcc(tmpdir, file, this.context);
    return `${filenameRoot}.o`;
};
