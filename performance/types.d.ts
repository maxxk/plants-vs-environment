type Vector = { x: number, y: number };
type Rectangle = Vector & { width: number, height: number };

type ResourceKinds = "rain" | "sun";
type TileKinds = "ground" | "air" | "sky";

type EntityPosition = { position: Point };
type Velocity = { velocity: Point };
type Bound =  { bounds: Vector & { width: number, height: number } };
type Resource = { kind: ResourceKinds, value: number, photon?: boolean, image?: undefined } & EntityPosition & Velocity & Bound;

type Tile = ({ kind: "air" | "sky", value: undefined } | { kind: "ground", value: number }) & Vector & {
    color?: string
};

type CellStatic = {
    energy: number,
    water: number,
    structure: number
};

type Cell = {
    kind: "cell",
    velocity?: undefined,
    photon?: undefined,
    value?: undefined,
    static: CellStatic,
    data: any,
    image: HTMLImageElement,
    program: {
        code: (static: CellStatic, data: any, delta: number, api: any) => void,
        cost: number
    },
    age: number,
    log: {
        [reason: string]: {
            count: number,
            energy?: number,
            structure?: number,
            water?: number
        }
    }
} & EntityPosition & Bound;

type Entity = Resource | Cell;

type GameMap = {
    cols: number,
    rows: number,
    tsize: number,
    groundRows: number,
    layers: Array<Array<Tile>>,
    resources: Array<Entity>,

    deadPlants: Array<Cell>,
    getTile(layer: number, col: number, row: number): Tile?,
    getTileAt(v: Vector): Tile?
}

type System = {
    apply?(delta: number, entity: Entity, index: number, entities: Array<Entity>, map: Map): void,
    update?(delta: number, entities: Array<Entity>, map: Map): void,
}

