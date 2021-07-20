import { HexStore } from "./store";
import { rnd } from "../../lib/util";

const sqrt = Math.sqrt;

export type Cell = {
    color: number,
    change: IChange | null
};

export type World = {
    size: number,
    numColors: number,
    cells: HexStore<Cell>
};

export interface IChange {
    phase: number;
}

export class Burst implements IChange {
    public phase: number = -sqrt(rnd(16) / 90);
}

export class Fall implements IChange {
    public phase: number = 0;
    constructor(public dropHeight: number) { }

    public plus(n: number): Fall {
        this.dropHeight += n;
        return this;
    }
}