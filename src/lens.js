// @ts-check

class Observable {
    constructor() {
        this.subscribers = [];
    }
    emit(newValue, oldValue) {
        this.subscribers.forEach(s => s(newValue, oldValue));
    }
    on(handler) {
        this.subscribers.push(handler);
    }
}

class Lens extends Observable {
    constructor(atom, path) {
        if (!path || path.length === 0) {
            return atom;
        }
        super();
        this.atom = atom;
        this.path = path;
        atom.on(this.update.bind(this));
    }
    update(newValue, oldValue) {
        this.path.forEach(p => {
            newValue = newValue && newValue[p];
            oldValue = oldValue && oldValue[p];
        })
        if (newValue !== oldValue) {
            this.emit(newValue, oldValue);
        }
    }
    get() {
        let value = this.atom.get();
        this.path.forEach(p => {
            value = value && value[p];
        })
        return value;
    }
    set(value) {
        if (this.path.length === 0 || value === this.get()) { return; }
        const newAtom = Object.assign({}, this.atom.get());
        let current = newAtom;
        for (let i = 0, len = this.path.length - 1; i < len; i++) {
            current[this.path[i]] = Object.assign({}, current[this.path[i]]);
            current = current[this.path[i]];
        }
        current[this.path[this.path.length - 1]] = value;
        this.atom.set(newAtom);
    }
    lens(...path) {
        return new Lens(this.atom, this.path.concat(path));
    }
}

class Atom extends Observable {
    constructor(value) {
        super();
        this.value = value;
        this.lenses = {};
    }
    lens(...path) {
        if (path.length === 1) {
            if (!this.lenses[path[0]]) {
                this.lenses[path[0]] = new Lens(this, path);
            }
            return this.lenses[path[0]];
        }
        return new Lens(this, path);
    }
    get() {
        return this.value;
    }
    set(newValue) {
        if (newValue !== this.value) {
            const oldValue = this.value;
            this.value = newValue;
            this.emit(newValue, oldValue);
        }
    }
}
