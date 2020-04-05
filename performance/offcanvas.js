const WIDTH = 512;
const HEIGHT = 512;
const GRAVITY = 64;

var map = {
    cols: 64,
    rows: 48,
    tsize: 16,
    layers: [],
    getTile: function (layer, col, row) {
        if (col < 0 || col > this.cols || row < 0 || row > this.rows) {
            return;
        }
        return this.layers[layer][row * map.cols + col];
    },
    resources: [] // entity
};

const Gravity = {
    acceleration: 4*map.tsize,
    apply(delta, entity) {
        if (entity.velocity && !entity.photon) {
            entity.velocity.y += this.acceleration * delta;
        }
    }
}

const Wind = {
    multiplier: 4,
    cutoff: 0.5,
    max: map.tsize*4,
    direction: {
        x: 0,
        y: -map.tsize*2
    },
    applyBound(value) {
        return value > 0 ? Math.min(value, this.max) : Math.max(value, -this.max);
    },
    update(delta) {
        const angle = Math.random()*2*Math.PI;
        const power = Math.random() * this.multiplier;
        this.direction.x += power * Math.sin(angle);
        this.direction.y -= power * Math.cos(angle);
        this.direction.x = this.applyBound(this.direction.x);
        this.direction.y = this.applyBound(this.direction.y);
    },
    apply(delta, entity) {
        if (entity.velocity && !entity.photon) {
            const probability = Math.random();
            if (probability > this.cutoff) {
                entity.velocity.x += delta * this.direction.x;
                entity.velocity.y += delta * this.direction.y;
            }
        }
    }
}

const AirResistance = {
    soundSpeed: 8 * map.tsize,
    viscosity: {
        x: 0.1,
        y: 1
    },
    apply(delta, entity) {
        if (entity.velocity && !entity.photon) {
            const velocityMeasure = Math.abs(entity.velocity.x) + Math.abs(entity.velocity.y);
            const coeff = velocityMeasure > this.soundSpeed ? 2 : 1;
            entity.velocity.x *= (1 - coeff * delta * this.viscosity.x);
            entity.velocity.y *= (1 - coeff * delta * this.viscosity.y);
            if (Math.abs(entity.velocity.x) < 1) {
                entity.velocity.x = 0;
            }
            if (Math.abs(entity.velocity.y) < 1) {
                entity.velocity.y = 0;
            }
        }
    }
}

const Velocity = {
    apply(delta, entity) {
        if (entity.velocity) {
            entity.position.x = Math.round(entity.position.x + delta * entity.velocity.x);
            entity.position.y = Math.round(entity.position.y + delta * entity.velocity.y);
        }
    }
}

const RandomDrift = {
    cutoff: 0.1,
    amount: 4 * map.tsize,
    apply(delta, entity) {
        if (entity.velocity && !entity.photon) {
            let probability = Math.random();
            if (probability > this.cutoff) {
                entity.velocity.x += this.amount * delta * (Math.random() - 0.5)
            }
            probability = Math.random();
            if (probability > this.cutoff) {
                entity.velocity.y += this.amount * delta * (Math.random() - 0.5)
            }
        }
    }
}

const Reaper = {
    toDelete: [],
    update(delta, entities) {
        for (let i = 0, len = this.toDelete.length; i < len; i++) {
            entities.splice(this.toDelete[i]-i, 1);
        }
        this.toDelete.length = 0;
    },
    apply(delta, entity, index) {
        const lowerBound = entity.velocity && entity.position.y > map.rows * map.tsize;
        const lostValue = entity.value < 1;
        const upperBound = entity.position.y < 0;
        const sunBound = (entity.position.x < 0 || entity.position.x > map.tsize * map.cols) && entity.photon
            && entity.velocity.y < 0;
        if (lowerBound || lostValue || upperBound || sunBound) {
            this.toDelete.push(index);
        }
    }
}

const SpriteDrawer = {
    canvas: undefined,
    context: undefined,
    update(delta) {
        if (this.canvas) {

        }
    },
    apply(delta, entity) {
        if (this.context) {

        }
    }
}

function isCollision(rect1, rect2) {
    if (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y) {
        return true;
    }
    return false;
}

const GroundCollision = {
    processCollision(entity, tile) {
        if (entity.velocity && entity.velocity.y > 0) {
            entity.velocity.y = -entity.velocity.y;
        }
        if (entity.kind === "rain") {
            if (tile.text < 9) {
                const delta = Math.min(9 - tile.text, entity.value);
                tile.text += delta;
                entity.value -= delta;
            }
        } else if (entity.kind === "sun") {
            if (tile.text > 0) {
                const delta = Math.min(tile.text, entity.value);
                tile.text -= delta;
            }
            entity.value = 0;
        }
    },
    apply(delta, entity) {
        if (entity.bounds) {
            const center = {
                x: entity.position.x + entity.bounds.centerX,
                y: entity.position.y + entity.bounds.centerY,
            };
            const rect = {
                x: center.x - entity.bounds.width / 2,
                y: center.y - entity.bounds.height / 2,
                width: entity.bounds.width,
                height: entity.bounds.height
            };
            const tileCoordinates = {
                x: Math.floor(center.x / map.tsize),
                y: Math.floor(center.y / map.tsize)
            };

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const tileX = tileCoordinates.x + dx;
                    const tileY = tileCoordinates.y + dy;
                    const tile = map.getTile(0, tileX, tileY);
                    if (tile && tile.kind === "ground") {
                        const tileRect = {
                            x: tileX*map.tsize,
                            y: tileY*map.tsize,
                            width: map.tsize,
                            height: map.tsize,
                        };
                        if (isCollision(rect, tileRect)) {
                            this.processCollision(entity, tile);
                        }
                    }
                }
            }
        }
    }
}

const Sun = {
    maxNormalAngle: 0.5,
    normalAngle: 0.5,
    step: 0.005,
    cutoff: 0.99,
    velocity: 8*map.tsize,
    update(delta, entities) {
        this.normalAngle -= this.step;
        if (this.normalAngle < -Math.PI/2) {
            this.normalAngle = Math.PI/2;
        }
        if (Math.abs(this.normalAngle) > this.maxNormalAngle) {
            return;
        }
        for (let i = -map.cols, last = 2*map.cols; i < last; i++) {
            const emit = Math.random() > this.cutoff;
            if (emit) {
                entities.push({
                    kind: 'sun',
                    position: {
                        x: i * map.tsize,
                        y: 0,
                    },
                    velocity: {
                        x: this.velocity * Math.sin(this.normalAngle),
                        y: this.velocity * Math.cos(this.normalAngle)
                    },
                    photon: true,
                    bounds: {
                        centerX: 8,
                        centerY: 8,
                        width: 2,
                        height: 2,
                    },
                    value: Math.round(5 * Math.random() + 4)
                });
            }
        }
    },
}

const SYSTEMS = [Gravity, Wind, RandomDrift, AirResistance, Velocity, GroundCollision, Reaper, Sun, SpriteDrawer];

function makeRow(layer, tile, cols) {
    for (let i = 0; i < cols; i++) {
        layer.push(Object.assign({}, tile))
    }
}

var groundRows = 20;
function makeMap(cols, rows) {
    let layer = [];
    makeRow(layer, { x: 3, y: 5, text: "S", color: "white", kind: "sky" }, cols); // "sky"
    for (let i = 1; i < rows - groundRows; i++) {
        makeRow(layer, { x: 8, y: 1, kind: "air" }, cols)
    }
    for (let i = rows - groundRows; i < rows; i++) {
        makeRow(layer, { x: 1, y: 1, text: 0, color: "white", kind: "ground" }, cols)
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
        Loader.loadImage('rain', '../assets/orb-blue.png'),
        Loader.loadImage('sun', '../assets/orb-yellow.png')
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

    for (let i = 0, len = this.systemsUpdate.length; i < len; i++) {
        const system = this.systemsUpdate[i];
        if (system.update) {
            system.update(delta, map.resources);
        }
    }

    for (let e = 0, entityLen = map.resources.length; e < entityLen; e++) {
        const entity = map.resources[e];
        for (let s = 0, systemLen = this.systemsApply.length; s < systemLen; s++) {
            this.systemsApply[s].apply(delta, entity, e);
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
                if (tile.text) {
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

function isVisible(camera, x, y, width, height) {
    return x + width >= camera.x && x < camera.maxX && y+height >= camera.y && y < camera.maxY
}

Game._drawResources = function() {
    const context = this.resourceCanvas.getContext('2d');
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.font = '8px serif bold';
    let lastColor = undefined;
    for (let i = 0; i < map.resources.length; i++) {
        let resource = map.resources[i];
        const x = resource.position.x - this.camera.x;
        const y = resource.position.y - this.camera.y;
        const image = resource.kind === 'sun' ? this.sun : this.rain;
        const color = resource.kind === 'sun' ? 'black' : 'white';
        if (lastColor != color) {
            context.fillStyle = color;
        }
        context.drawImage(image, x, y);
        if (resource.value) {
            context.fillText(resource.value, x + map.tsize/4, y + map.tsize*3/4);
        }
    }
}

Game.render = function () {
    // re-draw map if there has been scroll
    if (map.resources.length > 0) {
        this._drawResources();
        this._drawMap();
    } else if (this.hasScrolled) {
        this._drawMap();
    }

    // draw the map layers into game context
    this.ctx.drawImage(this.layerCanvas[0], 0, 0);
    this.ctx.drawImage(this.resourceCanvas, 0, 0)
    //this.ctx.drawImage(this.layerCanvas[1], 0, 0);
};

Game.cycleResources = function(sunProbability, rainProbability, cutoff) {
    sunProbability = sunProbability || 1;
    rainProbability = rainProbability || 1;
    cutoff = cutoff || 0.75;
    for (let i = 0; i < map.cols; i++) {
        let sun = sunProbability * Math.random();
        let rain = rainProbability * Math.random();

        if (rain > cutoff) {
            map.resources.push({
                kind: 'rain',
                position: {
                    x: i * map.tsize,
                    y: 1 * map.tsize,
                },
                velocity: {
                    x: 0,
                    y: 0
                },
                bounds: {
                    centerX: 8,
                    centerY: 8,
                    width: 8,
                    height: 8,
                },
                gravity: true,
                value: Math.round(5 * Math.random() + 4)
            });
        }
    }
}
