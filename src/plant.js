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
    position.x = Math.round(position.x / map.tsize) * map.tsize;
    position.y = Math.round(position.y / map.tsize) * map.tsize;
    let static = Object.assign({
        structure: 1000,
        energy: 100000,
        water: 1
    }, defaultStatic);
    const tile = map.getTileAt(position);
    if (tile && tile.kind === "ground") {
        map.setTileAt(position, undefined);
    }
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
            const structure = -Math.ceil(upkeep * delta * this.structureCost / 2);
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

/**
 * @template T
 * @param {ProgramCode<T>} fn 
 * @returns {Program<T>}
 */
function makeProgram(fn) {
    return {
        code: fn,
        cost: Math.max(codeMeasure(fn.toString())-3, 0)
    }
}

function addPlants(){
    addResource(map, Plant({ x: 448, y: 432 }, makeProgram(Roots), {}, {}, map));
    addResource(map, Plant({ x: 448, y: 448 }, makeProgram(Roots), {}, { root: true }, map));
    addResource(map, Plant({ x: 384, y: 432 }, makeProgram(Eater), {}, {}, map));
    addResource(map, Plant({ x: 320, y: 432 }, makeProgram(NoOp), {}, {}, map));
};

setTimeout(addPlants, 2000);
