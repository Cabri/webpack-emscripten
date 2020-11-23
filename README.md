# webpack-emscripten

Two-phases Emscripten loader for webpack
Forked from the simpler [wasm-tool/emscripten](https://github.com/polx/webpack-emscripten) where
an import could be on a simple C file.

The objective fo the this two-phases loader is to separate C/C++ compilation and "linking to WebAssembly" and
allow the JS to C++ connections permitted, e.g., by [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html).
It allows a flexible embedding of C/C++ classes and objects within JS code.

## Installation

Copy the loaders into `webpack` within your directory.
`emcc` must be available in the `$PATH`, see http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html.

Create or enrich the webpack config as below or see the [example](example) directory.

## Usage: webpack

```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.cpp$/,
        loader: path.resolve('webpack/cpp-loader.js')
      }
      {
        test: /\.cp$/,
        loader: path.resolve('webpack/cpp-loader.js')
      }
      {
        test: /\.emsc.js$/,
        loader: path.resolve('webpack/cpp-packager.js'),
        options : 
        {
          cfiles : 
          [
            'src/AClass.cpp'
          ]
         }
      }
    ]
  },
  // ...
};
```
Create a placeholder `EmscriptenModule.emsc.js` file (which can be empty).

You can then import it in JS to obtain a promise that delivers 
the Emscripten's runtime object where, for example, classes resulting of 
[Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html) 
can be directly invoked.


```js
import await emscriptenRuntime from './EmscriptenModule.emsc.js';
```

See the example.

## TODOs

* Break cleanly if there's a C++ compilation failure
  (currently, it is often a good idea to remove the `build` directory).
* Do not relink (phase of the cpp-packager) in case neither the C++ nor the emsc.js files are changed.
* (potential) find a way to vary the emcc parameters (in particular the includes);  the current method is just to incrementally include all compiled directories.