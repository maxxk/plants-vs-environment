type Vector = { x: number, y: number };
type Rectangle = Vector & { width: number, height: number };

type ResourceKinds = "rain" | "sun";
type TileKinds = "ground" | "air" | "sky";

type EntityPosition = { position: Point };
type Velocity = { velocity: Point };
type Bound =  { bounds: { centerX: number, centerY: number, width: number, height: number } };
type Resource = { kind: ResourceKinds, value: number } & EntityPosition & Velocity & Bound;

type Tile = ({ kind: "air" | "sky" } | { kind: "ground", value: number }) & Vector & {
    color?: string
};

type CellStatic = {
    energy: number,
    water: number,
    structure: number
};

type Cell = {
    kind: "cell",
} & CellStatic & EntityPosition & Bound;

type GameMap = {
    cols: number,
    rows: number,
    tsize: number,
    groundRows: number,
    layers: Array<Array<Tile>>,
    resources: Array<Resource|Cell>,

    deadPlants: Array<Cell>,
    getTile(layer: number, col: number, row: number): Tile?,
    getTileAt(v: Vector): Tile?
}
