const { execFileSync } = require("child_process");
const { join, basename } = require("path");
const {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync
} = require("fs");
const { tmpdir } = require("os");
const {initWEC, workoutBuildPath} = require("./webpack-emscripten-commons");

let debug, mode;

const emcc = "emcc";


function runEmcc(cwd, ofiles, outputFile) {
    const args = ["-o", outputFile, "--bind",
        "-DEmscripten", "-std=c++11",  "-s", "EXPORT_ES6",
        "-s","ENVIRONMENT=web", "-s", "MODULARIZE",
        "-s", "EXPORT_NAME=EmscriptenInit"];
    if (mode === "development")
        args.push(...["-g4", "-D_DEBUG"]);
        else args.push(...["g0", "-Oz"]);
    args.push(...["-Isrc", `-I${cwd}`, "-I/usr/local/include"]);
    args.push(...ofiles);
    const options = { cwd };
    if(debug) console.log("Running emscripten: ", emcc, args, options);
    return execFileSync(emcc, args, options);
}

function requestDependencies(directory, cFiles, loadModule, callback)
{
    let remainingCount = cFiles.length;
    const lmCallBack = (err, source, sourceMap, module) => {
        if(err) console.log(`Error at module ${module}: ${err}`);
        remainingCount--;
        if(module)
            console.log("Done: " + module.rawRequest);
        if(remainingCount<=0) callback();
    };
    const ofiles = [];
    cFiles.forEach((cFile) => {
        if(! existsSync(join(directory,cFile))) throw new Error(`File ${cFile} does not exist.`);
        ofiles.push(join("..", "object", basename(cFile).replace(/.c(pp)?$/, ".o")));
        if(!cFile.startsWith('/') && !cFile.startsWith('/'))
            cFile = './' + cFile; // TODO: that may fail on Windows
        console.log("Adding dependency " + join(directory,cFile));
        loadModule("../../cpp-loader.js!" + join(directory,cFile), lmCallBack)
    });
    return ofiles;
}

module.exports = function(source, map, meta) {
    const filename = basename(this.resource);
    const webpackCallback = this.async();
    debug = this.debug;
    mode = this.mode;
    initWEC(this);
    const tmpdir = workoutBuildPath("web");

    console.log(`this.request : ${this.request}, `)

    const options = this.getOptions() || {};
    const publicPath =
        typeof options.publicPath === "string"
            ? options.publicPath === "" || options.publicPath.endsWith("/")
            ? options.publicPath
            : `${options.publicPath}/`
            : typeof options.publicPath === "function"
            ? options.publicPath(this.resourcePath, this.rootContext)
            : this._compilation.outputOptions.publicPath || "dist";

    if (!existsSync(publicPath)) {
        mkdirSync(publicPath);
    }


    console.log("Requiring dependent .c and .cpp files (into .o files).")
    let base = filename.replace(/.emsc.js$/i, "");
    const outputjs = options.outputjs || base + ".js";
    //console.log("Will request dependency of ", options.cfiles);
    let ofiles = requestDependencies(this.context, options.cfiles, this.loadModule,
        () => {
            console.log("Packaging ");
            runEmcc(tmpdir, ofiles, outputjs);
            // replace import.meta.url to null in outputjs (temporary workaround as otherwise it seems like an import....)
            writeFileSync(join(tmpdir,outputjs),
                readFileSync(join(tmpdir, outputjs)).toString().replace(/import.meta.url/, "null"));
            const wasmPath = join(publicPath, base + ".wasm");
            const wasm = readFileSync(join(tmpdir, base + ".wasm"));
            writeFileSync(wasmPath, wasm);
            // import async ?
            const result= ` // this is the loader of the emscripten initialization
                import EmscriptenInit from "${join(tmpdir, base + ".js")}";
                window.Module = EmscriptenInit;
                console.log("Invoking EmscriptenInit.", typeof(EmscriptenInit));
                // TODO: add version information from git or the hash of webpack
                let listener = null;
                console.log("Initializing Emscripten runtime");
                const emRuntime = EmscriptenInit();
                console.log("Got Emscripten runtime", emRuntime);
                export default emRuntime; 
                // --- this is ${this.resource}
                let s=function() {
                    ${source}
                }; s();
                // --- end include ${this.resource}
                `;
            webpackCallback(null, result, null);
        });
    return;
};
