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
 * 
 * @param {EntityPosition & Bound} entity 
 */
function entityCenter(entity) {
    return {
        x: entity.position.x + entity.bounds.centerX,
        y: entity.position.y + entity.bounds.centerY,
    };
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


function addRain(map, position, value) {
    addResource(map, {
        kind: 'rain',
        position,
        velocity: {
            x: 0,
            y: 0
        },
        bounds: {
            centerX: 8,
            centerY: 8,
            width: 8,
            height: 8,
        },
        //gravity: true,
        value
    });
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
 * @param {any} object
 */
function deepCopy(object) {
    return JSON.parse(JSON.stringify(object));
}

const debounce = (callback, delay = 250) => {
    let timeoutId
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
            timeoutId = null
            callback(...args)
        }, delay);
    }
}

function astSize(ast) {
    const state = { size: 0 };
    acorn.walk.full(ast, () => {
        state.size += 1;
    });
    return state.size;
}

function codeMeasure(code) {
    const ast = acorn.parse(code);
    return astSize(ast);
}
