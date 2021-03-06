const editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    matchBrackets: true,
    continueComments: "Enter",
    extraKeys: {"Ctrl-Q": "toggleComment"},
});

const savedCode = localStorage.getItem("currentCode");
if (savedCode) {
    editor.getDoc().setValue(savedCode)
}


const ViewModel = new Atom({
    code: "",
    complexity: undefined,
    codeError: false,
    pause: false,
    mouseAction: undefined,
    examples: {
        NoOp,
        Eater,
        Splitter,
        Roots,
        RootsLeaves
    }
})

ViewModel.lens("code").on(code => {
    try {
        const size = codeMeasure(new Function(ARGUMENTS, code).toString());
        ViewModel.lens("complexity").set(size);
    } catch (e) {
        ViewModel.lens("complexity").set(e);
    }
    localStorage.setItem("currentCode", code);
})

editor.on("changes", throttle(cm => ViewModel.lens("code").set(cm.getDoc().getValue()), 500));
ViewModel.lens("complexity").on(complexity => {
    if (!isNaN(complexity)) {
        document.getElementById("code-status").innerText = `complexity: ${complexity}`;
        document.getElementById("code-error").innerText = "";
         
    } else {
        document.getElementById("code-status").innerText = "error (see below)";
        document.getElementById("code-error").innerText = complexity;
    }
});
ViewModel.lens("complexity").on(complexity => { ViewModel.lens("codeError").set(isNaN(complexity)) });
ViewModel.lens("code").set(editor.getDoc().getValue());

const pause = document.getElementsByName("pause")[0];
pause.addEventListener("input", function() { ViewModel.lens("pause").set(this.checked) });
ViewModel.lens("pause").on(pause => document.getElementsByName("pause")[0].setAttribute("checked", pause));
ViewModel.lens("pause").on(pause => { Game.pause = pause });

document.getElementsByName("mouseAction").forEach(element => {
    element.addEventListener("input", () => 
    ViewModel.lens("mouseAction").set(document.forms.controls.mouseAction.value));
})
ViewModel.lens("mouseAction").on(mouseAction => { UI.mouseAction = mouseAction });
ViewModel.lens("mouseAction").on(mouseAction => {
    document.forms.controls.mouseAction.value = mouseAction;
})
ViewModel.lens("codeError").on(codeError => {
    const mouseAction = ViewModel.get().mouseAction;
    if (codeError && mouseAction === "plant") {
        ViewModel.lens("mouseAction").set("disable-plant");
    }
    if (!codeError && mouseAction === "disable-plant") {
        ViewModel.lens("mouseAction").set("plant");
    }
    document.querySelector("input[name=mouseAction][value=plant]").disabled = codeError;
})

const loadOptions = document.querySelector("form[name=codeEditor] select[name=loadName]");
const examples = ViewModel.get().examples;
for (const key of Object.keys(examples)) {
    const option = document.createElement("option");
    option.value = key;
    option.text = key;
    loadOptions.appendChild(option);
}

document.querySelector("form[name=codeEditor] input[name=load]").addEventListener("click", function(e) {
    const name = document.forms.codeEditor.loadName.value;
    const source = ViewModel.get().examples[name].toString();
    
    editor.getDoc().setValue(source.substring(source.indexOf("{") + 1, source.lastIndexOf("}")));
    e.preventDefault();
})

const mainCanvas = document.getElementById("demo");
mainCanvas.addEventListener("mouseenter", function(event) {
    UI.mouseInside = true;
    UI.setMousePosition(mainCanvas, event);
});
mainCanvas.addEventListener("mouseleave", function() { UI.mouseInside = false; });
mainCanvas.addEventListener("mousemove", function(event) { UI.setMousePosition(mainCanvas, event) });
mainCanvas.addEventListener("click", function(event) {
    if (UI.mouseInside && UI.mousePosition) {
        if (UI.mouseAction === "plant") {
            addResource(map, Plant(vectorAdd(vectorAdd(UI.mousePosition, Game.camera), { x: -map.tsize/2, y: -map.tsize/2 }), makeProgram(new Function(ARGUMENTS, editor.getDoc().getValue())), {}, {}, map));
            Game.render("force");
        }
    }
})

ViewModel.lens("pause").set(pause.checked);
