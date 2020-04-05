var map = {
    cols: 64,
    rows: 48,
    groundRows: 20,
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

function makeRow(layer, tile, cols) {
    for (let i = 0; i < cols; i++) {
        layer.push(Object.assign({}, tile))
    }
}

function makeMap(cols, rows) {
    let layer = [];
    makeRow(layer, { x: 3, y: 5, text: "S", color: "white", kind: "sky" }, cols); // "sky"
    for (let i = 1; i < rows - map.groundRows; i++) {
        makeRow(layer, { x: 8, y: 1, kind: "air" }, cols)
    }
    for (let i = rows - map.groundRows; i < rows; i++) {
        makeRow(layer, { x: 1, y: 1, text: 0, color: "white", kind: "ground" }, cols)
    }
    return layer;
}

map.layers.push(makeMap(map.cols, map.rows));
