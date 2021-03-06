import { Point } from './geometry';

const sq = Math.sqrt(3) / 2;

export class HexPos {
    public constructor(public readonly i: number, public readonly j: number) { }

    public add(i: number, j: number): HexPos {
        return new HexPos(this.i + i, this.j + j);
    }

    public toPoint(): Point {
        return new Point(this.j * sq, this.i - this.j / 2);
    }

    public static fromPoint(p: Point): HexPos {
        const j = (p.x / sq) | 0
        return new HexPos((p.y + (j / 2) | 0) | 0, j);
    }
}

export class Supercell {
    constructor(public readonly pos: HexPos, public readonly rank: number) { }

    public get corners(): HexPos[] {

        const r = this.rank;

        return [
            new HexPos(2 * r, r - 1),
            new HexPos(2 * r, r),
            new HexPos(r, 2 * r),
            new HexPos(r - 1, 2 * r),
            new HexPos(1 - r, r + 1),
            new HexPos(-r, r),
            new HexPos(-2 * r, -r),
            new HexPos(-2 * r, -r - 1),
            new HexPos(-r - 1, -2 * r),
            new HexPos(-r, -2 * r),
            new HexPos(r, -r),
            new HexPos(r + 1, 1 - r),
        ];
    }

    public contains(point: HexPos): boolean {
        const x = point.j - this.pos.j;
        const y = point.i - this.pos.i;

        const a = this.rank * 3 + 1;
        const b = this.rank * 3;

        const leftup = 2 * x + b;
        const top = (x + a) / 2;
        const rightup = b - x;
        const rightdown = 2 * x - a;
        const bottom = (x - b) / 2;
        const leftdown = -x - a;

        return leftup >= y && top >= y && rightup >= y && rightdown <= y && bottom <= y && leftdown <= y;
    }
}