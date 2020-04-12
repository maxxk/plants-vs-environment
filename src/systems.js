// @ts-check
/// <reference path="./map.js" />
/** @type {System & { acceleration: number }} */
const Gravity = {
    acceleration: 4*map.tsize,
    apply(delta, entity) {
        if (typeof entity.velocity !== "undefined" && entity.photon !== true) {
            entity.velocity.y += this.acceleration * delta;
        }
    }
}

/** @type {System & { 
 * multiplier: number, cutoff: number, direction: Vector, max: number,
 * applyBound(value: number): number
 * }} */
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
                entity.velocity.x += delta * this.direction.x / Math.sqrt(entity.value + 1);
                entity.velocity.y += delta * this.direction.y / Math.sqrt(entity.value + 1);
            }
        }
    }
}

/** @type {System & { soundSpeed: number, viscosity: Vector }} */
const AirResistance = {
    soundSpeed: 8 * map.tsize,
    viscosity: {
        x: 0.2,
        y: 1
    },
    apply(delta, entity) {
        if (entity.velocity && !entity.photon) {
            const coeff = measure(entity.velocity) > this.soundSpeed ? 2 : 1;
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

/** @type {System} */
const Velocity = {
    apply(delta, entity) {
        if (entity.velocity) {
            entity.position.x = Math.round(entity.position.x + delta * entity.velocity.x);
            entity.position.y = Math.round(entity.position.y + delta * entity.velocity.y);
        }
    }
}

/** @type {System & { cutoff: number, amount: number }} */
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

/** @type {System & { toDelete: Array<number> }} */
const Reaper = {
    toDelete: [],
    update(delta, entities) {
        for (let i = 0, len = this.toDelete.length; i < len; i++) {
            entities.splice(this.toDelete[i]-i, 1);
        }
        this.toDelete.length = 0;
    },
    apply(delta, entity, index, entities, map) {
        const lowerBound = entity.velocity && entity.position.y > map.rows * map.tsize;
        const lostValue = entity.value < 1;
        const upperBound = entity.position.y < 0;
        const sunBound = (entity.position.x < 0 || entity.position.x > map.tsize * map.cols) && entity.photon
            && entity.velocity.y < 0;
        const deadPlant = (entity.kind == "cell" && entity.static.structure <= 0);
        if (lowerBound || lostValue || upperBound || sunBound || deadPlant) {
            this.toDelete.push(index);
            if (deadPlant) {
                map.deadPlants.push(entity);
            }
        }
    }
}

/** @type { System & { processCollision(entity: Entity, tile: Tile): void } } */
const GroundCollision = {
    processCollision(entity, tile) {
        if (entity.velocity && entity.velocity.y > 0) {
            entity.velocity.y = -entity.velocity.y;
        }
        if (entity.kind === "rain") {
            if (tile.value < 9) {
                const delta = Math.min(9 - tile.value, entity.value);
                tile.value += delta;
                entity.value -= delta;
            }
        } else if (entity.kind === "sun") {
            if (tile.value > 0) {
                const delta = Math.min(tile.value, Math.ceil(entity.value/2));
                tile.value -= delta;
            }
            entity.value = 0;
        }
    },
    apply(delta, entity) {
        if (entity.bounds) {
            const center = entityCenter(entity);
            const rect = entityRect(entity);
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

/** @type { System & { multiplier: number, acceleration: number, 
 *  processCollision(time: number, e1: Entity, e2: Entity): void
 *  } } */
const PairwiseCollision = {
    multiplier: 2,
    acceleration: 16 * map.tsize,
    processCollision(time, e1, e2) {
        let sun, rain;
        if (e1.kind == 'sun' && e2.kind == 'rain') {
            sun = e1;
            rain = e2;
        } else if (e1.kind == 'rain' && e2.kind == 'sun') {
            sun = e2;
            rain = e1;
        } else {
            return;
        }

        const delta = Math.round(Math.min(sun.value, rain.value) * Math.min(1, this.multiplier*Math.random()));
        sun.value -= delta;
        rain.value -= delta;

        if (delta > 0 && rain.value > 0) {
            const bounce = {
                x: rain.position.x - sun.position.x + sun.velocity.x,
                y: rain.position.y - sun.position.y + sun.velocity.y,
            };
            const sunMeasure = measure(sun.velocity);
            const bounceMeasure = measure(bounce);
            const acceleration = {
                x: bounce.x * this.acceleration * delta * time * sunMeasure / bounceMeasure / bounceMeasure,
                y: bounce.y * this.acceleration * delta * time * sunMeasure / bounceMeasure / bounceMeasure,
            };
            rain.velocity.x += acceleration.x;
            rain.velocity.y += acceleration.y;
        }
    },
    apply(delta, entity, index, entities) {
        if (!entity.bounds) { return; }

        const rect = entityRect(entity);
        for (let i = index + 1, len = entities.length; i < len; i++) {
            const other = entities[i];
            if (!other.bounds || !other.value) { continue; }
            const otherRect = entityRect(other);
            if (isCollision(rect, otherRect)) {
                this.processCollision(delta, entity, other);
                if (!entity.value) { break; }
            }
        }
    }
}

/** @type { System & {
 * maxNormalAngle: number,
 * normalAngle: number,
 * step: number,
 * cutoff: number,
 * velocity: number
 * }} */
const Sun = {
    maxNormalAngle: 0.8,
    normalAngle: 0.8,
    step: 0.002,
    cutoff: 0.97,
    velocity: 8*map.tsize,
    update(delta, entities, map) {
        this.normalAngle -= this.step;
        if (this.normalAngle < -Math.PI/2) {
            this.normalAngle = Math.PI/2;
        }
        if (Math.abs(this.normalAngle) > this.maxNormalAngle) {
            return;
        }
        const count = Math.floor(3*map.cols*Math.random() * (1 - this.cutoff));
        for (let i = 0; i < count; i++) {
            const x = Math.round((3 * Math.random() - 2) * map.cols * map.tsize);
            addResource(map, {
                kind: 'sun',
                position: {
                    x: x,
                    y: 0,
                },
                velocity: {
                    x: this.velocity * Math.sin(this.normalAngle),
                    y: this.velocity * Math.cos(this.normalAngle)
                },
                photon: true,
                bounds: {
                    x: 8,
                    y: 8,
                    width: 4,
                    height: 4,
                },
                value: Math.round(5 * Math.random() + 4)
            });
        }
    },
}

/** @type { System & { cutoff: number } } */
const Rain = {
    cutoff: 0.98,
    update(delta, entities, map) {
        const count = Math.floor(map.cols*Math.random() * (1 - this.cutoff));
        for (let i = 0; i < count; i++) {
            const x = Math.round(Math.random() * map.cols * map.tsize);
            addRain(map, { x, y: 1 * map.tsize }, { x: 0, y: 0}, Math.round(5 * Math.random() + 4));
        }
    }
}

/** @type { System & {
 * primeStep: number,
 * stepShift: number,
 * bottomLeak: number,
 * cutoff: number,
 * multiplier: number,
 * lastRowLeak(map: GameMap): void,
 * transferPart(from: Tile, to: Tile, divisor: number): boolean,
 * transferOne(from: Tile, to: Tile): boolean,
 * gravitySoak(tile: Tile, col: number, row: number, map: GameMap),
 * capillarSoak(tile: Tile, col: number, row: number, map: GameMap)
 * }} */
const GroundSoak = {
    primeStep: 101,
    stepShift: 0,
    bottomLeak: 1,
    cutoff: 0.4,
    multiplier: 2,
    lastRowLeak(map) {
        const row = map.rows - 1;
        for (let col = 0; col < map.cols; col++) {
            const tile = map.getTile(0, col, row);
            if (!tile || !tile.value || tile.kind !== "ground") {
                continue;
            }
            if (Math.random() > this.cutoff) {
                continue;
            }
            tile.value -= this.bottomLeak;
        }
    },
    transferPart(from, to, divisor) {
        if (canLeak(from)
            && to.value < 9
            && Math.random() < this.cutoff) {
            const delta = Math.min(9 - to.value, Math.ceil(from.value / divisor));
            from.value -= delta;
            to.value += delta;
            return true;
        }
        return false;
    },
    transferOne(from, to) {
        if (canLeak(from) 
            && to.value < from.value 
            && from.value > 1 
            && Math.random() < this.cutoff) {
            to.value += 1;
            from.value -= 1;
            return true;
        }
        return false;
    },
    gravitySoak(tile, col, row, map) {
        const north = map.getTile(0, col, row-1);
        const northeast = map.getTile(0, col-1, row-1);
        const northwest = map.getTile(0, col+1, row-1);
        this.transferPart(north, tile, 3) 
            || this.transferPart(northeast, tile, 4)
            || this.transferPart(northwest, tile, 4);
    },
    capillarSoak(tile, col, row, map) {
        const west = map.getTile(0, col+1, row);
        const east = map.getTile(0, col-1, row);
        const south = map.getTile(0, col, row-1);

        this.transferOne(west, tile)
            || this.transferOne(east, tile)
            || this.transferOne(south, tile);
    },
    update(delta, entities, map) {
        this.lastRowLeak(map);

        let i = map.rows*map.cols - 1 + this.stepShift;
        while (i >= 0) {
            const row = (i / map.cols) | 0; // integer division
            const col = (i % map.cols);
            const tile = map.getTile(0, col, row);
            if (canSoak(tile)) {
                this.capillarSoak(tile, col, row, map);
                if (canSoak(tile)) {
                    this.gravitySoak(tile, col, row, map);
                }
            }
            i -= this.primeStep;
        }
        this.stepShift = i;
    }
}
