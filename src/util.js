// @ts-check
///  <reference path="../external/acorn.d.ts" />
///  <reference path="../external/acorn-walk.d.ts" />

/**
 * @param {Rectangle} rect1
 * @param {Rectangle} rect2
 */
function isCollision(rect1, rect2) {
    if (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y) {
        return true;
    }
    return false;
}

/**
 * @param {Vector} a
 * @param {Vector} b
 */
function vectorAdd(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

/**
 * 
 * @param {Vector} param0 
 */
function vectorNegate({x, y}) {
    return {
        x: -x,
        y: -y
    }
}

/**
 * 
 * @param {EntityPosition & Bound} entity 
 */
function entityCenter(entity) {
    return vectorAdd(entity.position, entity.bounds);
}

/**
 * @param {EntityPosition & Bound} entity
 */
function entityRect(entity) {
    const center = entityCenter(entity);
    return {
        x: center.x - entity.bounds.width / 2,
        y: center.y - entity.bounds.height / 2,
        width: entity.bounds.width,
        height: entity.bounds.height
    }
}

/**
 * @param {Tile?} tile
 */
function canSoak(tile) {
    return tile && tile.kind === "ground" && tile.value < 9
}

/**
 * @param {Tile?} tile
 */
function canLeak(tile) {
    return tile && tile.kind === "ground" && tile.value > 0
}

/**
 * 
 * @param {Vector} vector 
 */
function measure(vector) {
    return Math.abs(vector.x) + Math.abs(vector.y);
}

/**
 * 
 * @param {GameMap} map 
 * @param {Entity} resource 
 */
function addResource(map, resource) {
    map.resources.push(resource);
}


/**
 * 
 * @param {GameMap} map 
 * @param {Vector} position 
 * @param {Vector} velocity
 * @param {number} value 
 */
function addRain(map, position, velocity, value) {
    addResource(map, {
        kind: 'rain',
        position,
        velocity,
        bounds: {
            x: 8,
            y: 8,
            width: 8,
            height: 8,
        },
        //gravity: true,
        value
    });
}

/**
 * @param {GameMap} map
 * @param {Vector} position
 * @param {Vector} velocity
 * @param {number} value
 * @param {any?} data?
 */
function addSun(map, position, velocity, value, data) {
    addResource(map, {
        kind: 'sun',
        position,
        velocity,
        photon: true,
        bounds: {
            x: 8,
            y: 8,
            width: 4,
            height: 4,
        },
        value,
        data
    });
}

/**
 * @template T
 * @param {T} object 
 * @returns {T}
 */
function deepCopy(object) {
    return JSON.parse(JSON.stringify(object));
}


function throttle(func, wait) {
    let arg, result;
    let timeout = undefined;
    let previous = 0;
    const later = function() {
        previous = Date.now();
        timeout = undefined;
        result = func(arg);
    };
    return function(a) {
        const now = Date.now();
        const remaining = wait - (now - previous);
        arg = a;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            later();
        } else if (!timeout) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};

function astSize(ast) {
    let size = 0;
    acorn.walk.full(ast, () => {
        size += 1;
    });
    return size;
}

function codeMeasure(code) {
    const ast = acorn.parse(code);
    return Math.sqrt(astSize(ast))|0;
}
