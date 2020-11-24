const { execFileSync } = require("child_process");
const { join, basename, isAbsolute } = require("path");
const { existsSync, mkdirSync, writeFileSync, copyFileSync,  readFileSync,
    statSync } = require("fs");
const { tmpdir } = require("os");
const {initWEC, workoutBuildPath} = require("./webpack-emscripten-commons");

let debug, mode;

const emcc = "emcc";

function checkEmccIsThere(loaderThis) {
    try {
        let r = execFileSync(emcc, ["--version"]);
        r = r.toString();
        if( r.indexOf('\n')>-1)
            r = r.substring(0, r.indexOf('\n'));
        if (debug) console.log("emscripten version: ", r);
    } catch (error) {
        console.log("Error: emcc sounds not to be in the PATH.")
        loaderThis.emitError(error);
    }
}

function runEmcc(cwd, ofiles, outputFile, otherArgs) {
    outputFile = join(cwd, outputFile);
    let runNeeded = false;
    if( existsSync(outputFile)) {
        // only run if one of the ofiles is newer than outputFile
        const outputFileM = statSync(outputFile).mtimeMs;
        for(let o of ofiles) {
            let s = statSync(join(cwd,o));
            if ( s && s.mtimeMs && s.mtimeMs >= outputFileM) {
                runNeeded = true; break;
            }
        }
    } else {
        runNeeded = true;
    }
    if( !runNeeded) {
        if(debug) console.log("No need to run emcc packager.");
        return;
    }

    const args = ["-o", outputFile, "--bind",
        "-DEmscripten", "-std=c++11",  "-s", "EXPORT_ES6",
        "-s","ENVIRONMENT=web", "-s", "MODULARIZE",
        "-s", "EXPORT_NAME=EmscriptenInit",
        ];
    if (mode === "development")
        args.push(...["-g4", "-D_DEBUG"]);
        else args.push(...["-g0", "-Oz"]);
    args.push(...["-Isrc", `-I${cwd}`, "-I/usr/local/include"]);
    args.push(...ofiles);
    if(otherArgs) args.push(...otherArgs);
    const options = { cwd };
    if(debug) console.log("Running emscripten: ", emcc, args, options);
    return execFileSync(emcc, args, options);
}

function requestDependencies(directory, request, cFiles, loadModule, addDependency, callback)
{
    let remainingCount = cFiles.length;
    const lmCallBack = (err, source, sourceMap, module) => {
        if(err) console.log(`Error at module ${module}: ${err}`);
        remainingCount--;
        if(module && debug)
            console.log("Done: " + module.rawRequest);
        if(remainingCount<=0) callback();
    };
    const ofiles = [];
    cFiles.forEach((cFile) => {
        if(! existsSync(join(directory,cFile))) throw new Error(`File ${cFile} does not exist.`);
        const ofile = join("..", "object", basename(cFile).replace(/.c(pp)?$/, ".o"));
        ofiles.push(ofile);
        if(!isAbsolute(cFile))
            cFile = './' + cFile;
        console.log("Adding dependency " + join(directory,cFile));
        let otherLoader = request.replace(new RegExp("/cpp-packager.js\\?.*"), "/cpp-loader.js");
        loadModule(otherLoader + "!" + join(directory,cFile), lmCallBack)
        addDependency(ofile);
    });
    return ofiles;
}

module.exports = function(source, map, meta) {
    const filename = basename(this.resource);
    const webpackCallback = this.async();
    debug = this.debug;
    mode = this.mode;
    initWEC(this);
    checkEmccIsThere (this);
    const tmpdir = workoutBuildPath("web");

    console.log(`this.request : ${this.request}, `)

    const options = this.getOptions() || {};
    const publicPath =
        typeof options.publicPath === "string"
            ? options.path === "" || options.publicPath.endsWith("/")
            ? options.path
            : `${options.path}/`
            : this._compilation.outputOptions.path || "dist";

    if (!existsSync(publicPath)) {
        mkdirSync(publicPath);
    }


    console.log("Requiring dependent .c and .cpp files (into .o files).")
    let base = filename.replace(/.emsc.js$/i, "");
    const outputjs = options.outputjs || base + ".js";
    //console.log("Will request dependency of ", options.cfiles);
    let ofiles = requestDependencies(this.context, this.request, options.cfiles, this.loadModule, this.addDependency,
        () => {
            console.log("Packaging ");
            try {
                checkEmccIsThere(this);
                runEmcc(tmpdir, ofiles, outputjs, options.otherArgs);
                // replace import.meta.url to null in outputjs (temporary workaround as otherwise it seems like an import....)
                writeFileSync(join(tmpdir, outputjs),
                    readFileSync(join(tmpdir, outputjs)).toString().replace(/import.meta.url/, "null"));
                const wasmPath = join(publicPath, base + ".wasm");
                const wasm = readFileSync(join(tmpdir, base + ".wasm"));
                console.log("Writing wasm to " + wasmPath)
                writeFileSync(wasmPath, wasm);

                // debug? copy .wasm.map file if there as well as all source files
                if (debug) {
                    if (existsSync(join(tmpdir, base + ".wasm.map"))) {
                        writeFileSync(join(publicPath, base + ".wasm.map"),
                            readFileSync(join(tmpdir, base + ".wasm.map")).toString().replace(/..\/object\//g, "./"));

                        options.cfiles.forEach((cFile) => {
                            copyFileSync(join(this.context, cFile), join(publicPath, basename(cFile)));
                        });
                    }
                }
            } catch (e) {
                console.log("Error at packaging ", e)
                this.emitError(e);
            }

            const result= ` // this is the loader of the emscripten initialization
                import EmscriptenInit from "${join(tmpdir, base + ".js")}";
                console.log("Invoking EmscriptenInit.", typeof(EmscriptenInit));
                // TODO: add version information from git or the hash of webpack
                let listener = null;
                console.log("Initializing Emscripten runtime");
                const emi = EmscriptenInit();
                console.log("Initialized Emscripten runtime");
                window.emi = emi;
                // --- this is ${this.resource}
                let s=function() {
                    ${source}
                }; s();
                // --- end include ${this.resource}
                export default emi;
                `;
            webpackCallback(null, result, null);
        });
    return;
};
