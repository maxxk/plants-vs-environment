type Vector = { x: number, y: number };
type Rectangle = Vector & { width: number, height: number };

type ResourceKind = "rain" | "sun";
type TileKinds = "ground" | "air" | "sky";

type EntityPosition = { position: Point };
type Velocity = { velocity: Point };
type Bound =  { bounds: Vector & { width: number, height: number } };
type Resource = { kind: ResourceKind, value: number, photon?: boolean, image?: undefined } & EntityPosition & Velocity & Bound;

type Tile = ({ kind: "air" | "sky", value?: undefined } | { kind: "ground", value: number }) & Vector & {
    color?: string
};

type CellStatic = {
    energy: number,
    water: number,
    structure: number
};


type ApiError = { error: true, ok?: undefined };
type ApiResult<T> = ApiError | { ok: T, cost: number, error?: undefined };

type Controls = {
    consume(kind: ResourceKind|"structure", amount: number): ApiResult<{ amount: number }>,
    produce(kind: ResourceKind|"structure", amount: number, options?: { velocity?: Vector, direction?: Vector }): ApiResult<{ amount: number; }>,
    split<T>(direction: Vector, static: CellStatic, data: T, code?: string): ApiResult<{}>,
    store(key: keyof T, value: T[key]): ApiResult<{}>,
    drop(key: keyof T): ApiResult<{}>,
    getTile(direction: Vector): ApiResult<Tile?>,
    getNearby(direction: Vector, width: number): ApiResult<Array<Entity>>,
};

type ProgramCode<T> = (static: CellStatic, data: T, delta: number, api: Controls) => void;

type Program<T> = {
    code: ProgramCode<T>,
    cost: number
};

type Cell<T> = {
    kind: "cell",
    velocity?: undefined,
    photon?: undefined,
    value?: undefined,
    static: CellStatic,
    data: T,
    image: HTMLImageElement,
    program: Program<T>,
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

type Entity = Resource | Cell<unknown>;

type GameMap = {
    cols: number,
    rows: number,
    tsize: number,
    groundRows: number,
    layers: Array<Array<Tile>>,
    resources: Array<Entity>,

    deadPlants: Array<Cell>,
    getTile(layer: number, col: number, row: number): Tile?,
    getTileAt(v: Vector): Tile?,
    setTileAt(v: Vector, value: Tile?): void,
}

type System = {
    apply?(delta: number, entity: Entity, index: number, entities: Array<Entity>, map: Map): void,
    update?(delta: number, entities: Array<Entity>, map: Map): void,
}

