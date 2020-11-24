# WebPack-Emscripten Example

## Compiling and running 

* `npm install`
* Have `emcc` in your path (this was tested with emscripten version 1.39.16)
* Run the webpack build, e.g.:
	* `node node_modules/webpack/bin/webpack.js --mode development` 
	* or `npm run build` (then web-serve your `dist` directory)
	* or `npm run serve` (then call `http://localhost:9000/` in your browser, 
	  any change in the C/C++ files that have been declared in the webpack-config are tracked
	  and trigger a recompilation)

## Debugging C/C++ code

Note that using Chromium (tested: Iridium 2020.04) 
or Firefox (tested: 83.0 and dev-ed 84.0b4) it is possible to debug the C/C++ code by seeing the browser
crawl through the lines:

- activate the debug tab (that MUST come first)
- load the URL (reload if need be)
- see the NumberContainerCppClass.cpp and RandomNumberContainer.cpp files appear as source files
- put a breakpoint, say, at line 16 of NumberContainerCppClass
- reload: the document window shows frozen, the console shows `Hello there,`, the source shows the run stopped at the breakpoint.
- you can click on next-step but many C/C++ lines contain several steps (probably it's crawling the WebAssembly elementary lines)
- it is better to set your next stop as a next breakpoint and invoke continue (the triangle "play")

Observe that local variables' content (e.g. 32 after a reload) appear but not the variable names; moreover, many other variables appear which are invisible in the C source. 
Remember to remove breakpoints!