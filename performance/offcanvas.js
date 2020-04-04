var map = {
    cols: 64,
    rows: 48,
    tsize: 16,
    layers: [],
    getTile: function (layer, col, row) {
        if (!this.layers[layer][row * map.cols + col]) {
            console.error(layer, col, row);
        }
        return this.layers[layer][row * map.cols + col];
    }
};

function makeRow(layer, tile, cols) {
    for (let i = 0; i < cols; i++) {
        layer.push(tile)
    }
}

var groundRows = 20;
function makeMap(cols, rows) {
    let layer = [];
    makeRow(layer, { x: 3, y: 5, text: "S", color: "white" }, cols); // "sky"
    for (let i = 1; i < rows - groundRows; i++) {
        makeRow(layer, { x: 8, y: 1 }, cols)
    }
    for (let i = rows - groundRows; i < rows; i++) {
        makeRow(layer, { x: 1, y: 1, text: 0, color: "white" }, cols)
    }
    return layer;
}

map.layers.push(makeMap(map.cols, map.rows));


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
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');
    this.camera = new Camera(map, 512, 512);

    // create a canvas for each layer
    this.layerCanvas = map.layers.map(function () {
        var c = document.createElement('canvas');
        c.width = 512;
        c.height = 512;
        return c;
    });

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
};

Game._drawMap = function () {
    map.layers.forEach(function (layer, index) {
        this._drawLayer(index);
    }.bind(this));
};

Game._drawLayer = function (layer) {
    var context = this.layerCanvas[layer].getContext('2d');
    context.clearRect(0, 0, 512, 512);
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
                if (typeof tile.text !== "undefined") {
                    if (tile.color && tile.color !== lastColor) {
                        lastColor = tile.color;
                        context.fillStyle = lastColor;
                    }
                    context.fillText(tile.text, Math.round(x) + map.tsize/4, Math.round(y) + map.tsize/2)
                }
            }
        }
    }
};

Game.render = function () {
    // re-draw map if there has been scroll
    if (this.hasScrolled) {
        this._drawMap();
    }

    // draw the map layers into game context
    this.ctx.drawImage(this.layerCanvas[0], 0, 0);
    //this.ctx.drawImage(this.layerCanvas[1], 0, 0);
};
