// @ts-check

/** @returns {Cell} */
function Plant(position, program, static, data) {
    static.structure = static.structure || 1000;
    static.energy = static.energy || 10000;
    static.water = static.water || 1;
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

const ARGUMENTS = ["static", "data", "delta", "api"];

/**
 * 
 * @param {Entity} entity 
 * @param {Array<Entity>} list 
 * @param {number} size 
 */
function findEntities(entity, list, size) {
    const result = [];
    const { x, y } = entityCenter(entity);
    const nearbyRect = {
        x: x - size*2,
        y: y - size*2,
        width: size * 4,
        height: size * 4
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
 * @param {Cell} entity
 * @param {{ reason: string; water?: number; energy?: number; structure?: number; }} data
 */
function changeStatic(entity, data) {
    const { reason, energy, structure, water } = data;
    
    if (!entity.log[reason]) {
        entity.log[reason] = { ...data, count: 1 };
        return;
    }

    if (energy) {
        entity.log[reason].energy = (entity.log[reason].energy || 0) + energy;
        entity.static.energy += energy;
    }

    if (structure) {
        entity.log[reason].structure = (entity.log[reason].structure || 0) + structure;
        entity.static.structure += structure;
    }

    if (water) {
        entity.log[reason].water = (entity.log[reason].water || 0) + water;
        entity.static.water += water;
    }

    entity.log[reason].count += 1;
}

/**
 * @param {Cell} entity
 * @param {number} energy 
 * @param {string} reason 
 * @param {number} delta
 */
function pay(entity, energy, reason, delta) {
    energy = Math.ceil(energy * delta);
    if (entity.static.energy < energy) {
        return ERROR;
    }
    changeStatic(entity, { reason: reason || "Pay", energy: -energy });
}

/**
 * 
 * @param {Cell} entity 
 * @param {CellStatic} static 
 * @param {any} data 
 */
function refreshData(entity, static, data) {
    Object.assign(static, entity.static);
    Object.assign(data, deepCopy(entity.data));
}

const ERROR = "ERROR";

/** @type {System & {
 * structureCost: number,
 * drainCutoff: number,
 * drain(delta: number, entity: Cell, tile: { col: number, row: number }, map: GameMap): void
 * }} */
const PlantSystem = {
    structureCost: 0.1,
    drainCutoff: 1,
    drain(delta, entity, tile, map) {
        /**
         * @param {Tile} to
         */
        function doDrain(to) {
            if (entity.static.water > 0 
                && canSoak(to) 
                && !to.value
                && Math.random() < this.drainCutoff * delta) {
                changeStatic(entity, { reason: "drain", water: -1 });
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

        let static = Object.assign({}, entity.static); // static has only values
        let data = deepCopy(entity.data);

        const dataCost = Math.log(JSON.stringify(entity.data).length);
        const upkeep = Math.ceil(entity.static.structure * this.structureCost + dataCost)
            + entity.program.cost;

        if (pay(entity, upkeep, "Upkeep", delta)) {
            const structure = Math.ceil(upkeep * delta * this.structureCost);
            changeStatic(entity, { reason: "insufficient-energy", structure: -structure });
        }

        const center = entityCenter(entity);
        const tile = {
            col: center.x / map.tsize | 0,
            row: center.y / map.tsize | 0
        };
        this.drain(delta, entity, tile, map);
        
        let spatialCache = findEntities(entity, map.resources, map.tsize);

        /**
         * 
         * @param {{ point: Vector, filter(e: Entity): boolean, width?: number }} arg
         */
        function findNearest({ point, filter, width }) {
            width = width || 16;
            const pointRect = {
                x: point.x - width/2,
                y: point.y - width/2,
                width,
                height: width
            };
            let result = spatialCache;
            if (filter) {
                result = spatialCache.filter(filter)
            }
            return result.filter(e => isCollision(entityRect(e), pointRect));
        }

        refreshData(entity, static, data);

        const api = {
            getNearby(direction, width, filter, maxCount) {
                let cost = Math.ceil(measure(direction)*width*width*maxCount + 1);
                if (pay(entity, cost, `getNearby`, delta)) return ERROR;
                const result = findNearest({ point: vectorAdd(entityCenter(entity), direction), width, filter });
                result.sort((a, b) => measure(vectorAdd(entity.position, vectorNegate(a.position)))
                    - measure(vectorAdd(entity.position, vectorNegate(b.position))));
                refreshData(entity, static, data);
                return { cost, result: result.slice(0, maxCount) }
            },

            getTile(direction) {
                const cost = Math.ceil(measure(direction)/map.tsize + 1);
                if (pay(entity, cost, `getTile`, delta)) { return ERROR; }
                return { cost: 1, tile: map.getTileAt(vectorAdd(entity.position, direction)) };
            },

            storeData(key, value) {
                const keyString = JSON.stringify(key);
                const valueString = JSON.stringify(value);
                const cost = Math.ceil(Math.log(keyString.length + valueString.length));
                if (pay(entity, cost, `storeData`, delta)) { return ERROR; }
                entity.data[JSON.parse(keyString)] = JSON.parse(valueString);
                Object.assign(data, entity.data);
                refreshData(entity, static, data);
                return { cost };
            },

            deleteData(key) {
                const keyString = JSON.stringify(key);
                const cost = Math.ceil(Math.log(keyString.length));
                if (pay(entity, cost, `deleteData`, delta)) { return ERROR; }
                delete entity.data[JSON.parse(keyString)]
                refreshData(entity, static, data);
                return { cost };
            },

            consume(kind, amount) {
                const cost = amount * amount;
                if (pay(entity, cost, `consume ${kind}`, delta)) { return ERROR; }
                const resources = findNearest({
                    point: entityCenter(entity),
                    filter: e => e.kind === kind && e.value > 0
                });
                let transfer = 0;
                for (let i = 0, len = resources.length; i < len && transfer < amount; i++) {
                    const resource = resources[i];
                    
                }
                refreshData(entity, static, data);
                return { cost,  }
            },

            drainPhoton(vector, amount) {
                const cost = amount * amount;
                if (pay(entity, cost, `drainPhoton`, delta)) { return ERROR; }
                const photons = findNearest({
                    point: entityCenter(entity),
                    filter: e => e.kind === "sun" && e.value > 0
                });
                let transferred = 0;
                for (let i = 0, len = photons.length; i < len && transferred < amount; i++) {
                    const photon = photons[i];
                    const actualAmount = Math.min(amount - transferred, photon.value, entity.static.water * 2);
                    const water = Math.ceil(actualAmount/2);
                    changeStatic(entity, { reason: "drainPhoton", water: -water, energy: actualAmount * 2000 })
                    photon.value = 0;
                    transferred += actualAmount;
                }
                refreshData(entity, static, data);
                return { cost, actualAmount: transferred };
            },

            drainWaterDrop(vector, amount) {
                const cost = Math.ceil(measure(vector)*measure(vector)+1)*amount;
                if (pay(entity, cost, `drainWaterDrop`, delta)) { return ERROR; }
                if (entity.static.water >= 9) { return; }
                const drops = findNearest({
                    point: vectorAdd(entityCenter(entity), vector),
                    filter: e => e.kind === "rain" && e.value > 0
                });
                let transferred = 0;
                for (let i = 0, len = drops.length; i < len && transferred < amount; i++) {
                    const drop = drops[i];
                    const actualAmount = Math.min(amount - transferred, drop.value, 9 - entity.static.water);
                    changeStatic(entity, { reason: "drainWaterDrop", water: actualAmount });
                    drop.value -= actualAmount;
                    transferred += actualAmount;
                }
                refreshData(entity, static, data);
                return { cost, actualAmount: transferred };
            },

            drainWaterCapillar(vector, amount) {
                const cost = Math.ceil((measure(vector)*measure(vector)+1)/map.tsize/map.tsize)*amount;
                if (pay(entity, cost, `drainWaterCapillar`, delta)) { return ERROR; }
                if (entity.static.water >= 9) { return; }
                const tile = map.getTileAt(vectorAdd(entity.position, vector));
                let actualAmount;
                if (canLeak(tile)) {
                    actualAmount = Math.min(amount, tile.value, 9 - entity.static.water);
                    changeStatic(entity, { reason: "drainWaterCapillar", water: actualAmount });
                    tile.value -= actualAmount;
                } else {
                    actualAmount = 0;
                }
                refreshData(entity, static, data);
                return { cost, actualAmount };
            },

            spillWater(vector, amount) {
                const cost = Math.ceil(measure(vector)*measure(vector))*amount;
                if (pay(entity, cost, `spillWater`, delta)) { return ERROR; }
                const actualAmount = Math.min(amount, entity.static.water);
                changeStatic(entity, { reason: "spillWater", water: -actualAmount });
                addRain(map, vectorAdd(entity.position, vector), actualAmount);
                refreshData(entity, static, data);
                return { cost, actualAmount };
            },

            structureToEnergy(amount) {
                if (entity.static.structure < amount) {
                    return ERROR;
                }
                changeStatic(entity, { reason: "structureToEnergy", structure: -amount, energy: 2*amount });
            },

            repair(amount) {
                const cost = amount * 8;
                if (pay(entity, cost, "repair", delta)) { return ERROR; }
                refreshData(entity, static, data);
                changeStatic(entity, { reason: "repair", structure: amount });
            },

            split({ vector, structure, energy, water, data, code }) {
                const codeSize = code ? codeMeasure(code) : entity.program.cost;
                code = code ? new Function(...ARGUMENTS, code) : entity.program.code;
                data = data || {};
                
                const dataString = JSON.stringify(data);
                const dataSize = Math.ceil(Math.log(dataString.length));
                const cost = (10 + codeSize + dataSize + water) * Math.ceil((measure(vector)*measure(vector)+1)/map.tsize/map.tsize);
                if (entity.static.structure < structure
                        || entity.static.energy < cost + energy
                        || entity.static.water < water) {
                    return ERROR;
                }
                if (pay(entity, cost, "split", delta)) {
                    return ERROR;
                }
                changeStatic(entity, { reason: "split", structure: -structure, water: -water, energy: -energy });
                addResource(map, Plant(vectorAdd(entity.position, vector),
                    { code, cost: codeSize },
                    { structure, water, energy },
                    JSON.parse(dataString)));
                refreshData(entity, static, delta);
            }
            // todo: drawImage
        }
        
        entity.program.code(static, data, delta, api);
    }
}

SYSTEMS.push(PlantSystem);

setTimeout(() => {
    addResource(map, Plant({ x: 480, y: 440 }, { code: function(static, data, delta, api) {
        if (static.water < 9) {
            if (static.water < 3 || static.energy > 5000) {
                api.drainWaterCapillar({ x: 0, y: 8 }, 1);
                api.drainWaterDrop({ x: 0, y: 0 }, 1);
            }
        }
        if (static.water > 0) {
            if (api.drainPhoton({ x: 0, y: 0 }, 1) === "ERROR") {
                api.structureToEnergy(8);
                api.drainPhoton({ x: 0, y: 0 }, 1);
            }
        } else if (api.drainWaterCapillar({ x: 0, y: 8}, 1) === "ERROR") {
            api.structureToEnergy(8);
            api.drainWaterCapillar({ x: 0, y: 8 }, 1);
        }
        if (static.water > 0 && static.energy > 10000 && static.structure < 1000) {
            api.repair(16);
        }
        if (static.water > 0 && static.energy > 22000 && static.structure >= 1000) {
            const directions = [
                { x: 24, y: 0 },
                { x: -24, y: 0},
                { x: 0, y: 24 },
                { x: 0, y: -24 }
            ];
            for (let d of directions) {
                const neighbors = api.getNearby(d, 1, x => x.kind === "cell", 1);
                if (neighbors.result.length === 0) {
                    api.split({ vector: d, data: {},
                        water: Math.ceil(static.water/2), energy: Math.ceil(static.energy/2), structure: Math.ceil(static.structure/2) });
                        break;
                }
            }
        }
    }, cost: 8 }, {}, {}));
    addResource(map, Plant({ x: 400, y: 440 }, { code: function(static, data, delta, api) {
        api.drainWaterCapillar({ x: 0, y: 8 }, 1);
        api.drainWaterDrop({ x: 0, y: 0 }, 1);
        api.drainPhoton({ x: 0, y: 0 }, 1);
    }, cost: 7 }, {}, {}));
    addResource(map, Plant({ x: 320, y: 440 }, { code: function(static, data, delta, api) {
    }, cost: 0 }, {}, {}));
    
}, 1000);
