import { Loop } from '../../lib/loop';
import { ScreenManager } from './screen';
import { World, Cell, Burst, Fall } from './world';
import { rnd } from '../../lib/util';
import { Vector } from './geometry';
import { HexStore } from './store';

const size = 4;

const renderer = new ScreenManager(size);

const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];

function collectRuns(store: HexStore<Cell>): Cell[][] {
    const runs: Cell[][] = [];
    const w = 2 * store.size - 1;

    const processLine = (cells: (Cell | undefined)[]) => {
        let run: Cell[] = [];
        const finalize = () => { if (run.length >= 3) runs.push(run); run = []; };
        for (const cell of cells) {
            if (!cell || cell.change != null) { finalize(); continue; }
            if (run.length === 0 || run[0].color !== cell.color) { finalize(); run = [cell]; }
            else run.push(cell);
        }
        finalize();
    };

    // Rows: fixed j, i varies
    for (let j = 0; j < w; j++) {
        const line: (Cell | undefined)[] = [];
        for (let i = 0; i < w; i++) line.push(store.get(i, j));
        processLine(line);
    }

    // Cols: fixed i, j varies
    for (let i = 0; i < w; i++) {
        const line: (Cell | undefined)[] = [];
        for (let j = 0; j < w; j++) line.push(store.get(i, j));
        processLine(line);
    }

    // Diags: lines where col-row = constant (direction +1,+1)
    for (let diag = -(store.size - 1); diag <= store.size - 1; diag++) {
        const line: (Cell | undefined)[] = [];
        for (let i = 0; i < w; i++) {
            const j = i - diag;
            line.push(j >= 0 && j < w ? store.get(i, j) : undefined);
        }
        processLine(line);
    }

    return runs;
}

function mergeRuns(runs: Cell[][]): Set<Cell>[] {
    const groups: Set<Cell>[] = [];
    for (const run of runs) {
        const overlapping: number[] = [];
        for (let g = 0; g < groups.length; g++) {
            if (run.some(c => groups[g].has(c))) overlapping.push(g);
        }
        if (overlapping.length === 0) {
            groups.push(new Set(run));
        } else {
            const base = groups[overlapping[0]];
            for (const c of run) base.add(c);
            for (let k = overlapping.length - 1; k >= 1; k--) {
                for (const c of groups[overlapping[k]]) base.add(c);
                groups.splice(overlapping[k], 1);
            }
        }
    }
    return groups;
}

function hasMatch(store: HexStore<Cell>): boolean {
    return collectRuns(store).length > 0;
}

function hasAnyValidMove(store: HexStore<Cell>, size: number): boolean {
    let found = false;
    store.each((i, j, cell) => {
        if (found || cell.change !== null) return;
        for (const [di, dj] of dirs) {
            const neighbor = store.get(i + di, j + dj);
            if (neighbor === undefined || neighbor.change !== null) continue;
            const tmp = cell.color;
            cell.color = neighbor.color;
            neighbor.color = tmp;
            if (hasMatch(store)) found = true;
            neighbor.color = cell.color;
            cell.color = tmp;
            if (found) return;
        }
    });
    return found;
}

function findWiggleCell(store: HexStore<Cell>, size: number): [number, number] | null {
    const candidates: [[number, number], [number, number]][] = [];
    store.each((i, j, cell) => {
        if (cell.change !== null) return;
        for (const [di, dj] of dirs) {
            const neighbor = store.get(i + di, j + dj);
            if (neighbor === undefined || neighbor.change !== null) continue;
            const tmp = cell.color;
            cell.color = neighbor.color;
            neighbor.color = tmp;
            const valid = hasMatch(store);
            neighbor.color = cell.color;
            cell.color = tmp;
            if (valid) candidates.push([[i, j], [di, dj]]);
        }
    });

    if (candidates.length === 0) return null;

    const [[si, sj], [di, dj]] = candidates[Math.floor(Math.random() * candidates.length)];
    const ti = si + di, tj = sj + dj;
    const srcCell = store.get(si, sj)!;
    const tgtCell = store.get(ti, tj)!;

    const origSrc = srcCell.color;
    const origTgt = tgtCell.color;
    srcCell.color = origTgt;
    tgtCell.color = origSrc;

    const runs = collectRuns(store);
    const matchColor = runs.length > 0 ? runs[0][0].color : -1;

    srcCell.color = origSrc;
    tgtCell.color = origTgt;

    // Wiggle the stone (at its pre-swap position) whose color is the match color
    if (origSrc === matchColor) return [si, sj];
    if (origTgt === matchColor) return [ti, tj];
    return [si, sj];
}

function shuffleBoard(store: HexStore<Cell>, size: number): void {
    const stableCells: Cell[] = [];
    store.each((_i, _j, cell) => { if (cell.change === null) stableCells.push(cell); });
    const colors = stableCells.map(c => c.color);
    for (let attempt = 0; attempt < 20; attempt++) {
        for (let k = colors.length - 1; k > 0; k--) {
            const r = Math.floor(Math.random() * (k + 1));
            const tmp = colors[k]; colors[k] = colors[r]; colors[r] = tmp;
        }
        for (let k = 0; k < stableCells.length; k++) stableCells[k].color = colors[k];
        if (!hasMatch(store) && hasAnyValidMove(store, size)) break;
    }
}

const loop = new Loop(1000 / 60, init, update, (delta, world) => renderer.render(delta, world));
loop.start();

function init(): World {

    const numColors = 7;

    const cells = new HexStore<Cell>(size, (i, j) => ({
        color: rnd(numColors),
        spring: new Vector(0, 0),
        change: null
    }));

    const world: World = {
        size,
        numColors,
        cells,
        dragStart: null,
        dragDir: null,
        activatedColor: null,
        shufflePending: false,
        shuffleCheckDelay: 10000,
        shuffleCheckTimer: 0,
        wiggleCell: null,
        wiggleTimer: 0,
        wiggleDuration: 500,
        wiggleHintInterval: 5000
    };

    window.addEventListener('keydown', e => {
        if (e.code == "KeyR") {
            world.cells = new HexStore<Cell>(size, (i, j) => ({
                color: rnd(numColors),
                spring: new Vector(0, 0),
                change: null
            }))
        }
    });

    return world;
}

function update(delta: number, state: World) {
    // Collect all match groups and mark as Burst
    const groups = mergeRuns(collectRuns(state.cells));
    for (const group of groups) {
        for (const cell of group) {
            if (cell.change == null) cell.change = new Burst();
        }
    }

    const burstDuration = 120;
    const fallSpeed = 200;

    state.cells.each((i, j, cell) => {
        if (cell.change instanceof Fall) {
            cell.change.phase += delta / fallSpeed;
            if (cell.change.phase > cell.change.dropHeight) {
                cell.change = null;
            }
        }
        else if (cell.change instanceof Burst) {
            if (cell.change.phase < 1) {
                cell.change.phase += delta / burstDuration;
                if (cell.change.phase > 1) cell.change.phase = 1;
            }
            else {
                let tgt = j;
                let drop = 1;
                let n = 0;
                let prev = cell;

                while (tgt >= 0) {
                    ++n;
                    if (n > 1000) throw i + ' ' + j;
                    let next = state.cells.get(i, tgt - 1);

                    if (next === undefined) {
                        prev.change = new Fall(drop);
                        prev.color = rnd(state.numColors);
                        --tgt;
                    }
                    else if (next.change == null) {
                        prev.change = new Fall(drop);
                        prev.color = next.color;
                        prev = next;
                        --tgt;
                    }
                    else if (next.change instanceof Fall) {
                        prev.color = next.color;
                        prev.change = next.change.plus(1);
                        drop = (prev.change as Fall).dropHeight;

                        prev = next;

                        --tgt;
                    }
                    else if (next.change instanceof Burst) {
                        break;
                    }
                    else {
                        ++drop;
                    }
                }
            }
        }
    });

    let anyActive = false;
    state.cells.each((_i, _j, cell) => { if (cell.change !== null) anyActive = true; });

    // Wiggle countdown
    if (state.wiggleTimer > 0) {
        state.wiggleTimer -= delta;
        if (state.wiggleTimer <= 0) {
            state.wiggleTimer = 0;
            state.wiggleCell = null;
        }
    }

    if (anyActive) {
        state.shuffleCheckTimer = 0;
        state.wiggleCell = null;
        state.wiggleTimer = 0;
    } else {
        if (state.shuffleCheckTimer <= 0) {
            state.shuffleCheckTimer = state.shuffleCheckDelay;
        } else {
            state.shuffleCheckTimer -= delta;
            if (state.shuffleCheckTimer <= 0) {
                const wiggle = findWiggleCell(state.cells, state.size);
                if (wiggle === null) {
                    shuffleBoard(state.cells, state.size);
                    state.shuffleCheckTimer = 0;
                } else {
                    state.wiggleCell = wiggle;
                    state.wiggleTimer = state.wiggleDuration;
                    state.shuffleCheckTimer = state.wiggleHintInterval;
                }
            }
        }
    }

    return state;
}
