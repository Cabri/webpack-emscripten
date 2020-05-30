import await emscriptenRuntime from './cpp-classes.emsc.js';
console.log("emscriptenRuntime", emscriptenRuntime)

let f = async function() {
    let emR = await emscriptenRuntime;
    window.emscriptenRuntime = emR;
    console.log("Now having emscriptenRuntime as ", emR)
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

