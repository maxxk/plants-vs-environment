const editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    lineNumbers: true,
    matchBrackets: true,
    continueComments: "Enter",
    extraKeys: {"Ctrl-Q": "toggleComment"}
});


const ViewModel = new Atom({
    code: "",
    complexity: undefined,
    codeError: false,
    pause: false,
    mouseAction: undefined,
})

ViewModel.lens("code").on(code => {
    try {
        const size = codeMeasure(new Function(ARGUMENTS, code).toString());
        ViewModel.lens("complexity").set(size);
    } catch (e) {
        ViewModel.lens("complexity").set(e);
    }
})

editor.on("changes", throttle(cm => ViewModel.lens("code").set(cm.getDoc().getValue()), 500));
ViewModel.lens("complexity").on(complexity => {
    if (!isNaN(complexity)) {
        document.getElementById("code-status").innerText = `Code complexity: ${complexity}`;
    } else {
        document.getElementById("code-status").innerHTML = `Error: <pre>
${complexity}
        </pre>`
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
        }
    }
})
