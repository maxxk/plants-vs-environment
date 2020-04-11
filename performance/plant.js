// @ts-check

/**
 * @template T
 * @param {Vector} position 
 * @param {Program<T>} program 
 * @param {Partial<CellStatic>} defaultStatic 
 * @param {T} data 
 * @returns {Cell<T>}
 */
function Plant(position, program, defaultStatic, data) {
    /** @type {CellStatic} */
    let static = Object.assign({
        structure: 1000,
        energy: 10000,
        water: 1
    }, defaultStatic);
    return {
        kind: "cell",
        position,
        bounds: {
            x: 8,
            y: 8,
            width: 16,
            height: 16
        },
        static,
        data,
        program,
        age: 0,
        image: Loader.getImage('generic-plant'),
        log: {}
    }
}

/**
 * 
 * @param {Entity} entity 
 * @param {Array<Entity>} list 
 * @param {number} size 
 * @returns {Array<Entity>}
 */
function findEntities(entity, list, size) {
    /** @type {Array<Entity>} */
    const result = [];
    const { x, y } = entityCenter(entity);
    const nearbyRect = {
        x: x - size*3/2,
        y: y - size*3/2,
        width: size * 3,
        height: size * 3
    };
    for (let i = 0, len = list.length; i < len; i++) {
        const e = list[i];
        if (entity !== e && isCollision(entityRect(e), nearbyRect)) {
            result.push(e);
        }
    }
    return result;
}

/**
 * @type {System & {
 * structureCost: number,
 * drainCutoff: number,
 * drain(context: CellContext<unknown>, tile: { col: number, row: number }, map: GameMap): void
 * }} */
const PlantSystem = {
    structureCost: 0.1,
    drainCutoff: 1,
    drain(context, tile, map) {
        /**
         * @param {Tile} to
         */
        function doDrain(to) {
            if (context.entity.static.water > 0 
                && canSoak(to) 
                && !to.value
                && Math.random() < this.drainCutoff * context.delta) {
                context.changeStatic("drain", { water: -1 });
                to.value += 1;
                return true;
            }
            return false;
        }

        doDrain(map.getTile(0, tile.col, tile.row))
            || doDrain(map.getTile(0, tile.col, tile.row-1))
            || doDrain(map.getTile(0, tile.col-1, tile.row-1))
            || doDrain(map.getTile(0, tile.col+1, tile.row-1))
            || doDrain(map.getTile(0, tile.col, tile.row+1))
            || doDrain(map.getTile(0, tile.col-1, tile.row))
            || doDrain(map.getTile(0, tile.col+1, tile.row));
    },
    apply(delta, entity, index, entities, map) {
        if (entity.kind !== "cell") {
            return;
        }

        const neighbors = findEntities(entity, map.resources, map.tsize);
        const context = new CellContext(entity, neighbors, delta, map);

        const dataCost = Math.log(JSON.stringify(entity.data).length);
        const upkeep = Math.ceil(entity.static.structure * this.structureCost + dataCost)
            + entity.program.cost;

        if (context.pay("upkeep", upkeep)) {
            const structure = -Math.ceil(upkeep * delta * this.structureCost);
            context.changeStatic("insufficient-energy", { structure })
        }

        const center = entityCenter(entity);
        const tile = {
            col: center.x / map.tsize | 0,
            row: center.y / map.tsize | 0
        };
        this.drain(context, tile, map);
        context.refreshData();
        context.run();
    }
}

const SYSTEMS = [
    GroundSoak, PairwiseCollision, GroundCollision,
    Reaper, Sun, Rain,
    Gravity, Wind, RandomDrift,
    AirResistance, Velocity, PlantSystem ];

setTimeout(() => {
    addResource(map, Plant({ x: 480, y: 440 }, { code: function(static, data, delta, api) {
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
                { x: 24, y: 0 },
                { x: -24, y: 0},
                { x: 0, y: 24 },
                { x: 0, y: -24 }
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
    }, cost: 8 }, {}, {}));
    addResource(map, Plant({ x: 400, y: 440 }, { code: function(static, data, delta, api) {
        api.consume("rain", 1);
        api.consume("sun", 2);
    }, cost: 7 }, {}, {}));
    addResource(map, Plant({ x: 320, y: 440 }, { code: function(static, data, delta, api) {
    }, cost: 0 }, {}, {}));
    
}, 1000);
