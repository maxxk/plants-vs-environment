var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    matchBrackets: true,
    continueComments: "Enter",
    extraKeys: {"Ctrl-Q": "toggleComment"}
});

function Atom(handler, initial) {
    handler(initial);
    return function(value) {
        if (initial !== value) {
            initial = value;
            handler(value);
        }
    }
};

const jsResult = Atom(value => {
    document.getElementById("code-status").innerText = value
}, "No data");

function astSize(ast) {
    const state = { size: 0 };
    acorn.walk.full(ast, () => {
        state.size += 1;
    });
    return state.size;
}

editor.on("changes", debounce(function(cm) {
    try {
        const ast = acorn.parse(cm.getDoc().getValue());
        const size = astSize(ast);
        jsResult(`Complexity: ${Math.ceil(2*Math.log(size))}`)
    } catch {
        jsResult("Parse error")
    }
}))
