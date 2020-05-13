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

const emcc = "emcc";

// TODO: refactor common
function createOutputDir(subdir) {
    let path = join(__dirname, "..","build");
    if (!existsSync(path))  mkdirSync(path);
    path = join(__dirname, "..", "build", "wasm-tool-emscripten", subdir);
    if (!existsSync(path))  mkdirSync(path);
    return path;
}

function runEmcc(cwd, cppFile, includeDir) {

    // TODO: evaluate if we need all these options
    let args = ["--bind",
        "-DEmscripten", "-g4", "-D_DEBUG", "-fPIC",
           "-pipe", "-fexceptions", "-fmessage-length=0", "-Wall", "-Wno-unused-variable",
           "-Wno-non-virtual-dtor", "-Wno-deprecated", "-DUSE_BLAS", "-c"];
    if(/.cpp/i.test(cppFile)) args.push( "-std=c++11");
    if(includeDir) args.push(`-I${includeDir}`);
    args.push(...["-Isrc", `-I${cwd}`, "-I/usr/local/include"]);
    const oFile = extractRoot(cppFile) + ".o";
    args.push(...["-o", oFile, cppFile]);
    const options = { cwd };
    //console.log("Running emscripten:", emcc, args, options);
    console.log("Compiling " + basename(cppFile));
    let r = execFileSync(emcc, args, options);
    //console.log("Execced.");
    return r;
}

const extractRoot = (cppFile) => {return cppFile.replace(/.c(pp)?$/i, "")}

module.exports = function(source, map, meta) {
    const tmpdir = createOutputDir("object");
    const filenameRoot = extractRoot(basename(this.resource));
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
    execFileSync("ls", ["-l", file]);
    runEmcc(tmpdir, file, this.context);
    return `${filenameRoot}.o`;
};
