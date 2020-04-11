// @ts-check

const ENERGY_PER_PHOTON = 2000;
const WATER_PER_PHOTON = 1;
const ENERGY_TO_STRUCTURE = 32;
const STRUCTURE_TO_ENERGY = 2;
const LOOKUP_COST = 16;
const CONSUME_COST = 2;
const ARGUMENTS = ["static", "data", "delta", "api"];


/** @template T
 * @implements {Controls}
 */
class CellContext {
    /**
     * @param {Cell<T>} entity 
     * @param {Array<Entity>} nearby
     * @param {number} delta 
     * @param {GameMap} map
     */
    constructor(entity, nearby, delta, map) {
        this.entity = entity;
        this.nearby = nearby;
        this.delta = delta;
        this.map = map;
        this.static = deepCopy(entity.static);
        this.data = deepCopy(entity.data);

        /** @type {Controls} */
        this.controls = {
            consume: this.consume.bind(this),
            produce: this.produce.bind(this),
            split: this.split.bind(this),
            store: this.store.bind(this),
            drop: this.drop.bind(this),
            getNearby: this.getNearby.bind(this),
            getTile: this.getTile.bind(this),
        }
    }

    refreshData() {
        Object.assign(this.static, this.entity.static);
        Object.assign(this.data, deepCopy(this.entity.data));
    }

    run() {
        this.entity.program.code(this.static, this.data, this.delta, this.controls);
    }

    /**
     * @param {string} reason 
     * @param {number} amount 
     * @return {ApiError?}
     */
    pay(reason, amount) {
        return this.changeStatic(reason, { energy: -Math.ceil(amount * this.delta) });
    }

    /**
     * @param {string} reason 
     * @param {Partial<CellStatic>} values 
     * @return {ApiError?}
     */
    changeStatic(reason, values) {
        const log = this.entity.log[reason];
        if (!log) {
            this.entity.log[reason] = { ...values, count: 1 };
            return;
        }

        log.count += 1;

        if (values.energy) {
            if (this.entity.static.energy >= -values.energy) {
                log.energy = (log.energy || 0) + values.energy;
                this.entity.static.energy += values.energy;
            } else {
                return { error: true }
            }
        }

        if (values.structure) {
            if (this.entity.static.structure >= -values.structure) {
                log.structure = (log.structure || 0) + values.structure;
                this.entity.static.structure += values.structure;
            } else {
                return { error: true }
            }
        }

        if (values.water) {
            if (this.entity.static.water >= -values.water) {
                log.water == (log.water || 0) + values.water;
                this.entity.static.water += values.water;
            } else {
                return { error: true }
            }
        }

        this.refreshData();
    }

    /**
     * 
     * @param {{ vector: Vector, filter?(e: Entity): boolean, width?: number }} param0 
     * @return {Array<Entity>}
     */
    findNearest({ vector, filter, width }) {
        width = width || 16;
        const pointRect = {
            x: vector.x - width/2,
            y: vector.y - width/2,
            width,
            height: width
        };
        let result = this.nearby;
        if (filter) {
            result = result.filter(filter)
        }
        return result.filter(e => isCollision(entityRect(e), pointRect));
    }

    /**
     * 
     * @param {ResourceKind|"structure"} kind 
     * @param {number} amount 
     */
    consume(kind, amount) {
        const cost = (amount +1 ) * CONSUME_COST;

        if (kind === "structure") {
            if (this.entity.static.structure < amount) {
                return { error: true };
            }
            this.changeStatic(`consume_${kind}`, { structure: -amount, energy: STRUCTURE_TO_ENERGY * amount });
            return { ok: { amount }, cost: 0 }
        }

        if (kind !== "sun") {
            const pay = this.pay(`consume_${kind}`, cost);
            if (pay) { return pay; }
        }
        let transfer = amount;
        if (kind === "rain") {
            transfer -= this.consumeWaterFromTiles(entityCenter(this.entity), amount);
        }
        
        const resources = this.findNearest({
            vector: entityCenter(this.entity),
            filter: x => x.kind === kind && x.value > 0
        })

        for (let i = 0, len = resources.length; i < len && transfer > 0; i++) {
            if (kind === "rain") {
                transfer -= this.consumeWater(resources[i], transfer);
            } else if (kind === "sun") {
                transfer -= this.consumePhoton(resources[i], transfer);
            }
        }

        return { ok: { amount: amount - transfer }, cost };
    }

    /**
     * 
     * @param {Vector} position 
     * @param {number} amount 
     */
    consumeWaterFromTiles(position, amount) {
        let consumed = 0;
        consumed += this.consumeWater(this.map.getTileAt(position), amount);
        const offsets = [
            { x: -this.map.tsize, y: 0},
            { x: this.map.tsize, y: 0},
            { x: 0, y: -this.map.tsize },
            { x: 0, y: this.map.tsize }
        ];
        for (let i=0, len=offsets.length; i < len && consumed < amount; i++) {
            consumed += this.consumeWater(this.map.getTileAt(vectorAdd(position, offsets[i])), 1);
        }
        return consumed;
    }
    
    /**
     * @param {Tile|Entity|undefined} source
     * @param {number} amount 
     * @return {number}
     */
    consumeWater(source, amount) {
        if (this.entity.static.water >= 9) { return 0; }
        if (source && source.value > 0) {
            const water = Math.min(amount, source.value, 9 - this.entity.static.water);
            this.changeStatic("consume_water", { water });
            source.value -= water;
            return water;
        }
        return 0;
    }
    
    /**
     * 
     * @param {Entity} resource 
     * @param {number} amount 
     */
    consumePhoton(resource, amount) {
        const photons = Math.min(amount, resource.value, this.entity.static.water * WATER_PER_PHOTON);
        const water = -Math.ceil(photons/WATER_PER_PHOTON);
        resource.value -= photons;
        this.changeStatic("consume_photon", { water, energy: photons * ENERGY_PER_PHOTON });
        return photons;
    }

    /**
     * 
     * @param {"rain"|"structure"} kind 
     * @param {number} amount 
     * @param {Vector?} velocity?
     */
    produce(kind, amount, velocity) {
        if (kind === "structure") {
            const cost = amount * ENERGY_TO_STRUCTURE;
            const pay = this.pay("produce_structure", cost);
            if (pay) { return pay; }
            this.changeStatic("produce_structure", { structure: amount });
            return { ok: { amount }, cost }
        }
    
        if (kind === "rain") {
            velocity = velocity || { x: 0, y: 0 }
            const cost = Math.ceil(amount * amount * (measure(velocity) + 1) * (measure(velocity) + 1) / 2);
            const pay = this.pay("produce_rain", cost);
            if (pay) { return pay; }
            const water = Math.min(amount, this.entity.static.water);
            this.changeStatic("produce_rain", { water: -water });
            addRain(this.map, this.entity.position, velocity, water);
            return { ok: { amount: water }, cost };
        }
        
    }

    /**
     * @termplate T
     * @param {Vector} direction 
     * @param {CellStatic} staticData
     * @param {T?} data 
     * @param {string?} code 
     */
    split(direction, staticData, data, code) {
        /** @type {Program<T>} */
        let program;
        if (code) {
            program = {
                cost: codeMeasure(code),
                code: /** @type {any} */ (new Function(...ARGUMENTS, code))
            }
        } else {
            program = {...this.entity.program};
        }

        const dataString = JSON.stringify(data);
        const dataSize = Math.ceil(Math.log(dataString.length));
        const cost = (10 + program.cost + dataSize + staticData.water * staticData.water) * Math.ceil((measure(direction)*measure(direction)+1)/this.map.tsize/this.map.tsize);
        if (this.entity.static.structure < staticData.structure
                || this.entity.static.energy < cost + staticData.energy
                || this.entity.static.water < staticData.water) {
            return { error: true };
        }

        const pay = this.pay("split", cost);
        if (pay) { return pay; }

        this.changeStatic("split", { structure: -staticData.structure, water: -staticData.water, energy: -staticData.energy })
        addResource(this.map, Plant(vectorAdd(this.entity.position, direction),
            program,
            staticData,
            JSON.parse(dataString)));
        this.refreshData();
    }

    store(key, value) {
        const keyString = JSON.stringify(key);
        const valueString = JSON.stringify(value);
        const cost = Math.ceil(Math.log(keyString.length + valueString.length));
        const pay = this.pay("store", cost);
        if (pay) { return pay; }
        this.entity.data[JSON.parse(keyString)] = JSON.parse(valueString);
        this.refreshData();
        return { ok: true, cost };
    }

    drop(key) {
        const keyString = JSON.stringify(key);
        const cost = Math.ceil(Math.log(keyString.length));
        const pay = this.pay("drop", cost);
        if (pay) { return pay; }
        delete this.entity.data[JSON.parse(keyString)]
        this.refreshData();
        return { ok: true, cost };
    }

    /**
     * 
     * @param {Vector} direction 
     * @param {number} width
     */
    getNearby(direction, width) {
        let cost = Math.ceil(measure(direction)*width*width + LOOKUP_COST);
        const pay = this.pay("drop", cost);
        if (pay) { return pay; }

        const result = this.findNearest({ vector: vectorAdd(entityCenter(this.entity), direction), width });
        result.sort((a, b) => measure(vectorAdd(this.entity.position, vectorNegate(a.position)))
            - measure(vectorAdd(this.entity.position, vectorNegate(b.position))));
        return { cost, ok: result };
    }

    /**
     * 
     * @param {Vector} direction 
     */
    getTile(direction) {
        const cost = Math.ceil(measure(direction)/this.map.tsize + 1);
        const pay = this.pay("drop", cost);
        if (pay) { return pay; }
        
        return { cost, ok: this.map.getTileAt(vectorAdd(this.entity.position, direction)) };
    }
}
