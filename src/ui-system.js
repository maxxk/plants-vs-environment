// @ts-check

const UI = {
    dirty: true,
    mouseInside: false,
    mouseState: undefined,
    /** @type {Vector?} */
    mousePosition: undefined,

    drawUI(layer) {
        if (!this.dirty) { return; }
        /** @type {CanvasRenderingContext2D} */
        const context = layer.getContext('2d');
        context.clearRect(0, 0, WIDTH, HEIGHT);
        if (this.mouseInside && this.mousePosition) {
            if (this.mouseState === 'plant') {
                /** @type {HTMLImageElement} */
                const image = Loader.getImage("generic-plant");
                context.drawImage(image,
                    Math.round(this.mousePosition.x / map.tsize - 0.5) * map.tsize,
                    Math.round(this.mousePosition.y / map.tsize - 0.5) * map.tsize);
            }
        }
    },
    setMousePosition(canvas, evt) {
        this.dirty = true;
        var rect = canvas.getBoundingClientRect();
        this.mousePosition = {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
    },
};

