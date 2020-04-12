// @ts-check

const WIDTH = 512;
const HEIGHT = 512;

function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
}

Camera.SPEED = 256; // pixels per second

Camera.prototype.move = function (delta, dirx, diry) {
    // move camera
    this.x += dirx * Camera.SPEED * delta;
    this.y += diry * Camera.SPEED * delta;
    // clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));
};

Game.load = function () {
    return [
        Loader.loadImage('tiles', '../assets/bloo.png'),
        Loader.loadImage('rain', '../assets/orb-blue.png'),
        Loader.loadImage('sun', '../assets/orb-yellow.png'),
        Loader.loadImage('generic-plant', '../assets/generic-plant.png'),
    ];
};

function newCanvasLayer() {
    var c = document.createElement('canvas');
    c.width = WIDTH;
    c.height = HEIGHT;
    return c;
}

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');
    this.sun = Loader.getImage('sun');
    this.rain = Loader.getImage('rain');
    this.camera = new Camera(map, WIDTH, HEIGHT);

    // create a canvas for each layer
    this.layerCanvas = map.layers.map(newCanvasLayer);

    this.resourceCanvas = newCanvasLayer();

    this.systemsApply = [];
    this.systemsUpdate = [];
    for (let s of SYSTEMS) {
        if (s.update) {
            this.systemsUpdate.push(s);
        }
        if (s.apply) {
            this.systemsApply.push(s);
        }
    }

    // initial draw of the map
    this._drawMap();
};

Game.update = function (delta) {
    this.hasScrolled = false;
    // handle camera movement with arrow keys
    var dirx = 0;
    var diry = 0;
    if (Keyboard.isDown(Keyboard.LEFT)) { dirx = -1; }
    if (Keyboard.isDown(Keyboard.RIGHT)) { dirx = 1; }
    if (Keyboard.isDown(Keyboard.UP)) { diry = -1; }
    if (Keyboard.isDown(Keyboard.DOWN)) { diry = 1; }

    if (dirx !== 0 || diry !== 0) {
        this.camera.move(delta, dirx, diry);
        this.hasScrolled = true;
    }

    if (this.pause) { return; }

    for (let i = 0, len = this.systemsUpdate.length; i < len; i++) {
        const system = this.systemsUpdate[i];
        if (system.update) {
            system.update(delta, map.resources, map);
        }
    }

    for (let e = 0, entityLen = map.resources.length; e < entityLen; e++) {
        const entity = map.resources[e];
        for (let s = 0, systemLen = this.systemsApply.length; s < systemLen; s++) {
            this.systemsApply[s].apply(delta, entity, e, map.resources, map);
        }
    }
};

Game._drawMap = function () {
    map.layers.forEach(function (layer, index) {
        this._drawLayer(index);
    }.bind(this));
};

Game._drawLayer = function (layer) {
    var context = this.layerCanvas[layer].getContext('2d');
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.font = '10px serif';
    let lastColor = undefined;

    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile(layer, c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile) {
                if (tile.x) {
                    context.drawImage(
                        this.tileAtlas, // image
                        tile.x * map.tsize, // source x
                        tile.y * map.tsize, // source y
                        map.tsize, // source width
                        map.tsize, // source height
                        Math.round(x),  // target x
                        Math.round(y), // target y
                        map.tsize, // target width
                        map.tsize // target height
                    );
                } 
                if (tile.value) {
                    if (tile.color && tile.color !== lastColor) {
                        lastColor = tile.color;
                        context.fillStyle = lastColor;
                    }
                    context.fillText(tile.value, Math.round(x) + map.tsize/4, Math.round(y) + map.tsize/2)
                }
            }
        }
    }
};

Game._drawResources = function() {
    const context = this.resourceCanvas.getContext('2d');
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.font = '8px serif bold';
    let lastColor = undefined;
    for (let i = 0; i < map.resources.length; i++) {
        let resource = map.resources[i];
        const x = resource.position.x - this.camera.x;
        const y = resource.position.y - this.camera.y;
        const image = resource.image || (resource.kind === 'sun' ? this.sun : this.rain);
        const color = resource.kind === 'sun' ? 'black' : 'white';
        if (lastColor != color) {
            context.fillStyle = color;
        }
        context.drawImage(image, x, y);
        if (resource.value) {
            context.fillText(resource.value, x + map.tsize/4 | 0, y + map.tsize*3/4 | 0);
        } else if (resource.kind === "cell") {
            context.fillText(resource.static.structure/100|0, x | 0, y);
            context.fillText(resource.static.water, x + map.tsize | 0, y);
            context.fillText(resource.static.energy/1000|0, x, y + map.tsize);
        }
    }
}

Game.render = function (force) {
    // re-draw map if there has been scroll
    if (this.hasScrolled || force || !this.pause && map.resources.length > 0) {
        this._drawResources();
        this._drawMap();
    }

    // draw the map layers into game context
    this.ctx.drawImage(this.layerCanvas[0], 0, 0);
    this.ctx.drawImage(this.resourceCanvas, 0, 0)
    //this.ctx.drawImage(this.layerCanvas[1], 0, 0);
};

Game.cycleResources = function(rainProbability, cutoff) {
    rainProbability = rainProbability || 1;
    cutoff = cutoff || 0.75;
    for (let i = 0; i < map.cols; i++) {
        let rain = rainProbability * Math.random();

        if (rain > cutoff) {
            addRain(map, { x: i * map.tsize, y: 1 * map.tsize }, { x: 0, y: 0 }, Math.round(5 * Math.random() + 4));
        }
    }
    this.render(0.001)
}

Game.setPause = function(checkbox) {
    this.pause = checkbox.checked;
}
