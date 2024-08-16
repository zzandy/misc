import { color } from "./palette";

export type adjarray = [number, number, number, number, number, number];
/* hex:  0
        ___
    5  /   \  1
    4  \___/  2
         3           */
export type adjindex = 0 | 1 | 2 | 3 | 4 | 5;

const stencil = (
    "" +
    ". . . . . . . ^ ^ ^ ^ . . . . . . . . . . . . .\n" +
    ". . . . . . ^ ^ ^ ^ ^ # # # # 7 7 . . . . . . .\n" +
    ". . . . . ^ ^ # # # # # # # # # 7 7 7 7 . . . .\n" +
    ". . . . # # # # # # # # # # # # # 7 7 7 . . . .\n" +
    ". . . # # # # # # # # # # # # # # # # 7 7 . . .\n" +
    ". . < # # # # # # # # # # # # # # # # # 7 . . .\n" +
    ". < < # # # # # # # # # # # # # # # # # # . . .\n" +
    "< < < # # # # # # # # # # # # # # # # # # # . .\n" +
    "< < # # # # # # # # # # # # # # # # # # # # . .\n" +
    ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
    ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
    ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
    ". . # # # # # # # # # # # # # # # # # # # # > >\n" +
    ". . # # # # # # # # # # # # # # # # # # # > > >\n" +
    ". . . # # # # # # # # # # # # # # # # # # > > .\n" +
    ". . . L # # # # # # # # # # # # # # # # # > . .\n" +
    ". . . L L # # # # # # # # # # # # # # # # . . .\n" +
    ". . . . L L L # # # # # # # # # # # # # . . . .\n" +
    ". . . . L L L L # # # # # # # # # v v . . . . .\n" +
    ". . . . . . . L L # # # # v v v v v . . . . . .\n" +
    ". . . . . . . . . . . . . v v v v . . . . . . ."
)
    .split("\n")
    .map((row) =>
        row.split(" ").map((c) => {
            switch (c) {
                case "#":
                    return 7;
                case "^":
                    return 1;
                case "7":
                    return 2;
                case ">":
                    return 3;
                case "v":
                    return 4;
                case "L":
                    return 5;
                case "<":
                    return 6;
                default:
                    return 0;
            }
        })
    );

const h = 21; //stencil.length;
const w = 24; //stencil[0].length;

export const getHexPos = (i: number, j: number) => [
    j * 20 - i * 4 - ((j / 2) | 0) * 4,
    i * 19 - (j % 2) * 5 + ((j / 2) | 0) * 9,
];

class Scaler {
    constructor(private readonly data: Uint8ClampedArray, private readonly sx: number, private readonly sy: number) {}

    public put(i: number, j: number, col: color) {
        const data = this.data;
        const sx = this.sx;
        const sy = this.sy;

        for (let si = 0; si < sy; ++si) {
            for (let sj = 0; sj < sx; ++sj) {
                let index = ((sy * i + si) * w * sx + sx * j + sj) * 4;
                data[index] = col[0];
                data[index + 1] = col[1];
                data[index + 2] = col[2];

                data[index + 3] = <number>(col.length > 3 ? col[3] : 255);
            }
        }
    }
}

export class SpriteRenderer {
    constructor(private readonly sx: number, private readonly sy: number) {}

    public render(coreValue: number, colorFn: (value: number) => color, adj: adjarray): HTMLCanvasElement {
        const { sx, sy } = this;
        const can = <HTMLCanvasElement>document.createElement("canvas");
        can.width = w * sx;
        can.height = h * sx;
        const ctx = <CanvasRenderingContext2D>can.getContext("2d");

        const id = ctx.createImageData(w * sx, h * sy);
        const scaler = new Scaler(id.data, sx, sy);

        for (let i = 0; i < h; ++i) {
            for (let j = 0; j < w; ++j) {
                const fragment = stencil[i][j];
                if (fragment == 0) continue;

                const color = colorFn(fragment == 7 ? coreValue : getCornerColor(fragment, coreValue, adj));

                scaler.put(i, j, color);
            }
        }

        scaler.put(((w / 2) | 0) - 2, ((h / 2) | 0) + 1, colorFn(3));
        ctx.putImageData(id, 0, 0);
        return can;
    }
}

const max = Math.max;
const min = Math.min;
const med = (a: number, b: number, c: number) => (a > b ? (b > c ? b : a > c ? c : a) : a > c ? a : b > c ? c : b);

const getCornerColor = (f: number, v: number, n: adjarray) => {
    return f === 1
        ? med(v, n[0], n[5])
        : f === 2
        ? med(v, n[0], n[1])
        : f === 3
        ? med(v, n[1], n[2])
        : f === 4
        ? med(v, n[2], n[3])
        : f === 5
        ? med(v, n[3], n[4])
        : f === 6
        ? med(v, n[4], n[5])
        : 0;
};
