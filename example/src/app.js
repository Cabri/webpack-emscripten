// this import sounds to not bring the resolved exported promise but an empty module
// (see https://github.com/webpack/webpack/issues/10890)
// However, we can use the hack window.emi to fetch and resolve the emscripten's loader as done in the async function below
// note: import was await import
const emscriptenRuntimeToImport = import('./cpp-classes.emsc.js');
console.log("If bug 10890 was resolved, the following should not be undefined: ", emscriptenRuntimeToImport.NumberContainerCppClass);
console.log("... within emscriptenRuntimeImport", emscriptenRuntimeToImport);
console.log("Will rather use emi: ", window.emi);
let f = async function() {
    let ignored = await emscriptenRuntimeToImport;
    console.log("Promise to expect: ", window.emi);
    const emscriptenRuntime = await window.emi;
    console.log("Promise yielded: ",emscriptenRuntime);
    delete window.emi;
    let emR = emscriptenRuntime;
    window.emscriptenRuntime = emR;
    console.log(`Now having emscriptenRuntime as`, emR);
    console.log("Did the NumberContainerCppClass load through embind? " + (typeof(emR.NumberContainerCppClass)!== "undefined"));
    document.body.appendChild(
        document.createTextNode("From NumberContainerCppClass: "
            + new emR.NumberContainerCppClass().getNumber() + ". ")
    );
    document.body.appendChild(
        document.createTextNode("From RandomNumberContainerCppClass: "
            + new emR.RandomNumberContainerCppClass().getNumber() + ".")
    );
};
f();

