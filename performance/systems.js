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
        x: 0.2,
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

function isCollision(rect1, rect2) {
    if (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y) {
        return true;
    }
    return false;
}

function entityCenter(entity) {
    return {
        x: entity.position.x + entity.bounds.centerX,
        y: entity.position.y + entity.bounds.centerY,
    };
}

function entityRect(entity) {
    const center = entityCenter(entity);
    return {
        x: center.x - entity.bounds.width / 2,
        y: center.y - entity.bounds.height / 2,
        width: entity.bounds.width,
        height: entity.bounds.height
    }
}

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
                const delta = Math.min(tile.value, entity.value);
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
            const sunMeasure = Math.abs(sun.velocity.x) + Math.abs(sun.velocity.y);
            const measure = Math.abs(bounce.x) + Math.abs(bounce.y);
            const acceleration = {
                x: bounce.x * this.acceleration * delta * time * sunMeasure / measure / measure,
                y: bounce.y * this.acceleration * delta * time * sunMeasure / measure / measure,
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

const Sun = {
    maxNormalAngle: 0.8,
    normalAngle: 0.8,
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
        const count = Math.floor(3*map.cols*Math.random() * (1 - this.cutoff));
        for (let i = 0; i < count; i++) {
            const x = Math.round((3 * Math.random() - 2) * map.cols * map.tsize);
            entities.push({
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
                    centerX: 8,
                    centerY: 8,
                    width: 4,
                    height: 4,
                },
                value: Math.round(5 * Math.random() + 4)
            });
        }
    },
}

const SYSTEMS = [Gravity, Wind, RandomDrift, AirResistance, Velocity, PairwiseCollision, GroundCollision, Reaper, Sun ];
