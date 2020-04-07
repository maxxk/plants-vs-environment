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

function canSoak(tile) {
    return tile && tile.kind === "ground" && tile.value < 9
}

function canLeak(tile) {
    return tile && tile.kind === "ground" && tile.value > 0
}

function measure(vector) {
    return Math.abs(vector.x) + Math.abs(vector.y);
}

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
        gravity: true,
        value
    });
}

function vectorAdd(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    }
}

function vectorNegate({x, y}) {
    return {
        x: -x,
        y: -y
    }
}

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
