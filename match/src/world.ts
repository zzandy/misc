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
    cells: HexStore<Cell>,
    dragStart: [number, number] | null,
    dragDir: [number, number] | null,
    activatedColor: number | null,
    shufflePending: boolean,
    shuffleCheckDelay: number,
    shuffleCheckTimer: number,
    wiggleCell: [number, number] | null,
    wiggleTimer: number,
    wiggleDuration: number,
    wiggleHintInterval: number
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
