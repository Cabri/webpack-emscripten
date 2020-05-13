# webpack-emscripten

> Two-phases Emscripten loader for webpack
Forked from the simpler [wasm-tool/emscripten](https://github.com/polx/webpack-emscripten).

## Installation

Copy the loaders into `webpack` within your directory.
Create or enrich the webpack config as below

## Usage: webpack

Add the loader and mock the `fs` module in your webpack configuration:

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
  node: {
    fs: "empty"
  },
  // ...
};
```
Create a placeholder `EmscriptenModule.emsc.js` file (which can be empty).

You can then import it to obtain a promise that delivers the Emscripten's runtime object where, for example, classes resulting of [Embind](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/embind.html) can be directly invoked.

```js
import("./EmscriptenModule.emsc.js").then(exports => ...);
```

`emcc` must be available in your `$PATH`, see http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html.
