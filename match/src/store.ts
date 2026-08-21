
export type ItemStringCallback<T, TCell> = (aggregate: T, cell: TCell, i: number, j: number) => T;

export class HexStore<TCell> {
    private readonly cells: TCell[][];
    private readonly w: number;

    constructor(public readonly size: number, callback: (i: number, j: number) => TCell) {
        this.w = 2 * size - 1;
        this.cells = [];

        for (let i = 0; i < this.w; ++i) {
            let row: TCell[] = new Array(this.w);
            for (let j = 0; j < this.w; ++j) {
                if (j - i >= size || i - j >= size) continue;
                row[j] = callback(i, j);
            }
            this.cells.push(row);
        }
    }

    public get(i: number, j: number) {
        if (j - i >= this.size || i - j >= this.size) return undefined;
        let row = this.cells[i];

        return row === undefined ? undefined : this.cells[i][j];
    }

    public each(callback: (i: number, j: number, cell: TCell) => void): void {
        for (let i = 0; i < this.cells.length; ++i) {
            for (let j = 0; j < this.cells[i].length; ++j)
                if (this.cells[i][j] !== undefined)
                    callback(i, j, this.cells[i][j]);
        }
    }

    public reduceCols<T>(init: () => T, callback: ItemStringCallback<T, TCell>): void {
        for (let i = 0; i < this.cells.length; ++i) {
            let agg = init();
            for (let j = 0; j < this.cells[i].length; ++j) {
                if (this.cells[i][j] !== undefined)
                    agg = callback(agg, this.cells[i][j], i, j);
            }
        }
    }

    public reduceRows<T>(init: () => T, callback: ItemStringCallback<T, TCell>): void {
        for (let j = 0; j < this.w; ++j) {
            let agg = init();
            for (let i = 0; i < this.cells.length; ++i) {
                if (this.cells[i][j] !== undefined)
                    agg = callback(agg, this.cells[i][j], i, j);
            }
        }
    }

    public reduceDiags<T>(init: () => T, callback: ItemStringCallback<T, TCell>): void {
        let agg = init();
        let agg2 = init();

        for (let i = 0; i < this.w; ++i)
            if (this.cells[i][i] != undefined)
                // main diagonal
                agg = callback(agg, this.cells[i][i], i, i);

        for (let i = 1; i < this.size; ++i) {
            agg = init();
            agg2 = init();

            for (var j = 0, k = i; j < this.w; ++j, ++k) {

                if (k < this.cells.length && this.cells[k][j] !== undefined)
                    agg = callback(agg, this.cells[k][j], k, j);

                if (this.cells[j][k] !== undefined)
                    agg2 = callback(agg2, this.cells[j][k], j, k);
            }
        }
    }
}