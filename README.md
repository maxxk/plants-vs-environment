# Plants vs Environment simulator

[На русском](README.ru.md)

![](gameplay.gif)

Inspired, in a way, by [Dwarf Fortress](http://bay12games.com/dwarves/),
based on the idea of a game for teaching programming.

For now it is just a technical demo of a sandbox game, without any further obligation to develop it.

Two-dimensional map consists of empty space and "soil".
Resources (“sun” and “rain”) are generated from the top of the map.
The plant is composed of independent cells.
Three main stats of the plant: structure, energy and water.
The plant has a control program called at each step of the simulation.

The plant constantly spends energy for the upkeep,
the amount of required energy increases with
points of structure and with the complexity of the control program
(src/plant.js).
After exhausting the energy, penalty points are subtracted from the plant structure.

The plant can catch a "photon"
and convert 1 photon and 1 unit of water into energy.
A plant cell split itself into two cells setting
for a new cell its own program and data set.
All actions cost a certain amount of energy.
Preliminary list of available actions is given below,

Rain drops are affected by gravity, wind, air resistance and random wind impulses
(src/systems.js).
Gravity doesn’t work on “photons”
but collisions between "photon" and "water" leads to partial or complete evaporation.
The rain dampens the soil, moisture spreads through the ground.

## TODO

### Intended to be done

- [ ] the third resource (“glucose”) for energy transmission and message passing, or instead the ability to emit photons
- [ ] complete the editor
- [ ] cell selection with the cursor, cell controls
- [ ] manual cell control
- [ ] procedural landscape generation
- [ ] simulation settings
- [ ] cell image generation

### Could be added in the next version if it were

- [ ] “plot”, training, missions
- [ ] changing weather
- [ ] mechanical interaction between cells (connections, movement, gravity and wind, "dandelions")
- [ ] cell damage due to dryness or high humidity
- [ ] cell specialization in terms of increased efficiency of specific actions? (will likely complicate the game too much)
- [ ] MMO elements (e.g. random "contamination" by cells with a different code
or intersections with alien "worlds" along the Z axis,
arena)
- [ ] instead of JavaScript, use some machine code (Forth machine or DCPU-16) and spend energy for the program’s clock cycles or execute a certain number of program clocks in a simulation step
- [ ] "unfriendly" interactions between cells (destruction, stealing the energy or water)
- [ ] new resource - “chemicals” in the soil
- [ ] generating images with code + data (hash visualization)

## Management program

The control program for cell takes 4 arguments:

- static - plant stats;
- data - persistent data;
- delta - time elapsed from the the previous step;
- api - functions for interacting with the outside world.

Functions:

```typescript
type Controls = {
    // Absorb the resource or translate the structure into energy
    consume(kind: "sun" | "rain" | "structure", amount: number),
    // “Shoot” a drop of water or repair itself
    produce(kind: "rain" | "structure", amount: number, velocity?: { x: number, y: number }),
    // Split a new cell
    split<T>(direction: { x: number, y: number }, static: { water: number, structure: number, energy: number }, data: T, code?: string),
    // Write data
    store(key: string, value: any),
    // Delete data (to stop spending an energy for maintaining it)
    drop(key: string),
    // Get map cell information regarding cell position
    getTile(direction: { x: number, y: number } ),
    // Get a list of resources and cells that intersects
    // square with width side
    // on this vector relative to the position of the cell
    getNearby(direction: { x: number, y: number }, width: number)
}
```

A simple example of a control program:

```js
api.consume("rain", 1);
api.consume("sun", 2);
```

## Code structure
Code is in the ./src directory

For high-level overview of the code you can start with the file ./src/types.d.ts with the definition of the main types.

In the order of loading:
- common.js - the common part of the “engine” from the MDN example
- util.js - helper functions
- map.js - map generation
- systems.js - physical simulation
- cell-code.js - runtime context for cell control program
- plant-examples.js - control program examples
- plant.js - helper code for cells
- game.js - drawing and scrolling

We try to keep things simple
and don't use compilers and code packaging tools.

## Licenses
The code (“engine”) is based on an example from a series of articles on MDN: https://github.com/mozdevs/gamedev-js-tiles

The new code, following the original is licensed under MPL2.

JavaScript libraries:
- CodeMirror (text editor; MIT license): https://codemirror.net/
- AcornJS (JavaScript parser, to calculate the complexity of the plant program; MIT license): https://github.com/acornjs/acorn

Graphic assets:
- Map assets/bloo.png: (chipmunk, license OGA-BY 3.0) https://opengameart.org/content/platform-tileset-0
- Plant assets/generic-plant.png: (Matt Hackett of Lost Decade Games, license CC-BY 3.0) https://opengameart.org/content/bomb-party
- Drops assets/orb*.png:
https://www.piskelapp.com/p/agxzfnBpc2tlbC1hcHByEwsSBlBpc2tlbBiAgID4h730Cww/edit
https://www.piskelapp.com/p/agxzfnBpc2tlbC1hcHByEwsSBlBpc2tlbBiAgID4o-i4CAw/edit
