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

editor.on("changes", debounce(function(cm) {
    try {
        const size = codeMeasure(cm.getDoc().getValue());
        jsResult(`Complexity: ${Math.ceil(2*Math.log(size))}`)
    } catch {
        jsResult("Parse error")
    }
}))
