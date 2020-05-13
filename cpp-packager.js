const { execFileSync } = require("child_process");
const { join, basename } = require("path");
const {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync
} = require("fs");
const { tmpdir } = require("os");
const loaderUtils = require("loader-utils");

const emcc = "emcc";

function createOutputDir() {
    let path = join(__dirname, "..","build");
    if (!existsSync(path))  mkdirSync(path);
    path = join(path, "wasm-tool-emscripten");
    if (!existsSync(path))  mkdirSync(path);
    path = join(path, "web");
    if (!existsSync(path))  mkdirSync(path);
    return path;
}

function runEmcc(cwd, ofiles, outputFile) {
    const args = ["-o", outputFile, "--bind",
        "-DEmscripten", "-g4", "-D_DEBUG", "-fPIC",
        "-pipe", "-fexceptions", "-fmessage-length=0", "-Wall", "-Wno-unused-variable",
        "-Wno-non-virtual-dtor", "-Wno-deprecated", "-std=c++11", "-DUSE_BLAS",
        "-s", "EXPORT_ES6",
        "-s","ENVIRONMENT=web", "-s", "MODULARIZE", "-s", "EXPORT_NAME=EmscriptenInit"];
    args.push(...["-Isrc", `-I${cwd}`, "-I/usr/local/include"]);
    args.push(...ofiles);
    const options = { cwd };
    //console.log("Running emscripten: ", emcc, args, options);
    return execFileSync(emcc, args, options);
}

function requestDependencies(directory, cFiles, loadModule, callback)
{
    let remainingCount = cFiles.length;
    const lmCallBack = (err, source, sourceMap, module) => {
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
        loadModule(cFile, lmCallBack)
    });
    return ofiles;
}

module.exports = function(source, map, meta) {
    const tmpdir = createOutputDir();
    const filename = basename(this.resource);
    const webpackCallback = this.async();

    const options = loaderUtils.getOptions(this) || {};
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

            const result= ` // this is the loader of the emscripten initialization
                import EmscriptenInit from "${join(tmpdir, base + ".js")}";
                window.Module = EmscriptenInit;
                console.log("Invoking EmscriptenInit.", typeof(EmscriptenInit));
                // TODO: add version information from git or the hash of webpack
                let listener = null;
                EmscriptenInit().then((EmscriptenRuntime)=>{
                    if(console && console.log) {
                        console.log("EmscriptenRuntime is here.", EmscriptenRuntime);
                    }
                    // --- this is ${this.resource}
                    let s=function() {
                        ${source}
                    }; s();
                    // --- end include ${this.resource}
                    if(listener) listener(EmscriptenRuntime);
                });
                export const listen = (f) => {listener = f;}
                `;
            webpackCallback(null, result, null);
        });
    return;
};
