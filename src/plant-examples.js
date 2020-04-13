// @ts-check


/** @type {ProgramCode<{}>} */
function NoOp(static, data, delta, api) {}

/** @type {ProgramCode<{}>} */
function Eater(static, data, delta, api) {
    api.consume("rain", 1);
    api.consume("sun", 2);
}

/** @type {ProgramCode<{}>} */
function Splitter(static, data, delta, api) {
    if (static.water < 9) {
        if (static.water < 3 || static.energy > 5000) {
            api.consume("rain", 1);
        }
    }
    if (static.water > 0) {
        if (api.consume("sun", 1).error) {
            api.consume("structure", 8);
            api.consume("sun", 1);
        }
    } else if (api.consume("rain", 1).error) {
        api.consume("structure", 8);
        api.consume("rain", 1);
    }
    if (static.water > 0 && static.energy > 10000 && static.structure < 1000) {
        api.produce("structure", 8);
    }
    if (static.water > 0 && static.energy > 22000 && static.structure >= 1000) {
        const directions = [
            { x: 0, y: 16 },
            { x: 0, y: -16 },
            { x: 16, y: 0 },
            { x: -16, y: 0},
        ];
        for (let direction of directions) {
            const neighbors = api.getNearby(direction, 1);
            if (neighbors.ok && !neighbors.ok.some(x => x.kind === "cell")) {
                api.split(direction,
                    { water: Math.ceil(static.water/2), energy: Math.ceil(static.energy/2), structure: Math.ceil(static.structure/2) },
                    {});
                    break;
            }
        }
    }
}

/** @type {ProgramCode<{delta?: number}>} */
function Roots(static, data, delta, api) {
    data.delta = (data.delta || 0) + delta;
    if (static.water > 0 && api.consume("sun", 1).error) {
        api.consume("structure", 8);
        api.consume("sun", 1);
    }
    if (static.water < 9 && (static.water < 3 || static.energy > 5000)) {
        if (!api.consume("rain", 1).ok) {
            api.consume("structure", 8);
            api.consume("rain", 1);
        }
    }
    if (static.water > 0 && static.energy > 10000 && static.structure < 1000) {
        api.produce("structure", 8);
    }
    if (static.water > 5 && static.energy > 5000 && static.structure >= 1000) {
        const directions = [
            { x: 0, y: 16 },
            { x: 0, y: -16 },
            { x: 16, y: 0 },
            { x: -16, y: 0},
        ];
        for (let direction of directions) {
            const neighbors = api.getNearby(direction, 1);
            if (neighbors.ok) {
                const cell = neighbors.ok.filter(x => x.kind === "cell");
                if (cell.length === 0 && static.energy > 22000) {
                    api.split(direction,
                        { water: Math.ceil(static.water/2), energy: Math.ceil(static.energy/2), structure: Math.ceil(static.structure/2) },
                        {});
                    break;
                } else if (cell.length > 0 && cell[0].kind === "cell" && cell[0].static.water < static.water - 1) {
                    api.produce("rain", 1, { direction });
                    break;
                }
            }
        }
    }
}
