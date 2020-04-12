// @ts-check


/** @type {ProgramCode<{}>} */
function NoOp() {}

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


