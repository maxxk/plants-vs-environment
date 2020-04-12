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

function refreshCode(cm) {
    try {
        const size = codeMeasure(new Function(cm.getDoc().getValue()).toString());
        jsResult(`Complexity: ${size}`)
    } catch {
        jsResult("Parse error")
    }
}

editor.on("changes", debounce(refreshCode))
refreshCode(editor);
