import { Loop } from '../../lib/loop';
import { ScreenManager } from './screen';
import { World, Cell, Burst, Fall } from './world';
import { rnd } from '../../lib/util';
import { Vector } from './geometry';
import { HexStore } from './store';

const size = 5;

let currentWorld: World | null = null;

const renderer = new ScreenManager(size);
renderer.onPlayAgain = () => { if (currentWorld != null) resetWorld(currentWorld); };

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

function randomStoneColor(world: World): number {
    if (!world.colorBiasActive) return rnd(world.numColors);
    const pool: number[] = [];
    for (let c = 0; c < world.numColors; c++) pool.push(c);
    pool.push(world.colorBiasColor, world.colorBiasColor);
    return pool[rnd(pool.length)];
}

function saveScoreToLocalStorage(score: number): void {
    const key = 'match-scores';
    const raw = localStorage.getItem(key);
    const scores: number[] = raw ? JSON.parse(raw) : [];
    scores.unshift(Math.floor(score));
    if (scores.length > 10) scores.length = 10;
    localStorage.setItem(key, JSON.stringify(scores));
}

function resetWorld(w: World): void {
    w.dragStart = null;
    w.dragDir = null;
    w.activatedColor = null;
    w.shufflePending = false;
    w.shuffleCheckTimer = 0;
    w.wiggleCell = null;
    w.wiggleTimer = 0;
    w.colorBiasActive = false;
    w.colorBiasColor = 0;
    w.colorBiasTimer = w.colorBiasFairDuration;
    w.score = 0;
    w.baseScoreMultiplier = 1;
    w.multiplierBarPoints = 0;
    w.multiplierBarLevel = 0;
    w.multiplierDrainActive = false;
    w.multiplierDrainDelay = 0;
    w.doubleScoreTimer = 0;
    w.timerActive = false;
    w.timerValue = w.timerMax;
    w.gameOver = false;
    w.gemsCollected = 0;
    w.gemBarCount = 0;
    w.gemMultiplierLevel = 0;
    w.gemHistory = [];
    w.cells = new HexStore<Cell>(w.size, () => ({ color: randomStoneColor(w), change: null, hasGem: Math.random() < w.gemChance, powerup: null }));
}

const loop = new Loop(1000 / 60, init, update, (delta, world) => renderer.render(delta, world));
loop.start();

function init(): World {
    const numColors = 7;

    const world: World = {
        size,
        numColors,
        cells: new HexStore<Cell>(size, () => ({ color: 0, change: null, hasGem: false, powerup: null })),
        dragStart: null,
        dragDir: null,
        activatedColor: null,
        shufflePending: false,
        shuffleCheckDelay: 10000,
        shuffleCheckTimer: 0,
        wiggleCell: null,
        wiggleTimer: 0,
        wiggleDuration: 500,
        wiggleHintInterval: 5000,
        colorBiasFairDuration: 12000,
        colorBiasBiasedDuration: 6000,
        colorBiasTimer: 12000,
        colorBiasActive: false,
        colorBiasColor: 0,
        score: 0,
        baseScoreMultiplier: 1,
        multiplierBarPoints: 0,
        multiplierBarLevel: 0,
        multiplierDrainActive: false,
        multiplierDrainDelay: 0,
        doubleScoreTimer: 0,
        baseMatchScore: 100,
        scorePerExtraStone: 1.6,
        multiplierBarMax: 1000,
        multiplierBarPerStone: 50,
        multiplierBarPerExtraStone: 25,
        multiplierDrainRate: 50,
        multiplierDrainDelayMs: 500,
        multiplierLevelBonus: 1.5,
        multiplierDrainRateMultiplier: 0.3,
        timerActive: false,
        timerValue: 60000,
        timerMax: 60000,
        gameOver: false,
        gemChance: 0.3,
        gemsPerMultiplierLevel: 10,
        gemMultiplierBonus: 1.2,
        gemsCollected: 0,
        gemBarCount: 0,
        gemMultiplierLevel: 0,
        gemHistory: [],
        clockPowerupTime: 5000
    };

    world.cells = new HexStore<Cell>(size, () => ({
        color: randomStoneColor(world),
        change: null,
        hasGem: Math.random() < world.gemChance,
        powerup: null
    }));

    window.addEventListener('keydown', e => {
        if (e.code == "KeyR") {
            world.cells = new HexStore<Cell>(size, () => ({
                color: randomStoneColor(world),
                change: null,
                hasGem: Math.random() < world.gemChance,
                powerup: null
            }));
        }
    });

    currentWorld = world;
    return world;
}

function grantPowerup(state: World, type: 'bomb' | 'clock' | 'asterisk', exclude: Set<Cell>): void {
    const candidates: Cell[] = [];
    state.cells.each((_i, _j, c) => { if (c.change === null && !exclude.has(c)) candidates.push(c); });
    if (candidates.length === 0) return;
    candidates[rnd(candidates.length)].powerup = type;
}

function update(delta: number, state: World) {
    const runs = state.gameOver ? [] : collectRuns(state.cells);
    const groups = mergeRuns(runs);
    if (groups.length > 0 && !state.timerActive) state.timerActive = true;
    for (const group of groups) {
        const count = group.size;
        const totalMultiplier = state.baseScoreMultiplier
            * (1 + state.multiplierBarLevel * state.multiplierLevelBonus)
            * (state.doubleScoreTimer > 0 ? 2 : 1);
        state.score += state.baseMatchScore * Math.pow(state.scorePerExtraStone, count - 3) * totalMultiplier;
        state.multiplierBarPoints += state.multiplierBarPerStone * count + state.multiplierBarPerExtraStone * Math.max(0, count - 3);
        while (state.multiplierBarPoints >= state.multiplierBarMax) {
            state.multiplierBarPoints -= state.multiplierBarMax;
            state.multiplierBarLevel++;
        }
        state.multiplierDrainDelay = state.multiplierDrainDelayMs;
        for (const cell of group) {
            if (cell.change == null) {
                cell.change = new Burst();
                if (cell.hasGem) {
                    cell.hasGem = false;
                    state.gemHistory.push(cell.color);
                    state.gemsCollected++;
                    state.gemBarCount++;
                    if (state.gemBarCount >= state.gemsPerMultiplierLevel) {
                        state.gemMultiplierLevel++;
                        state.gemBarCount -= state.gemsPerMultiplierLevel;
                        state.baseScoreMultiplier = 1 + state.gemMultiplierLevel * state.gemMultiplierBonus;
                    }
                }
            }
        }
        const contributing = runs.filter(run => run.some(c => group.has(c)));
        const maxRunLength = contributing.reduce((m, r) => Math.max(m, r.length), 0);
        if (maxRunLength >= 5) grantPowerup(state, 'clock', group);
        else if (contributing.length >= 2) grantPowerup(state, 'asterisk', group);
        else if (count >= 4) grantPowerup(state, 'bomb', group);
    }

    const powerupQueue: Array<[number, number, 'bomb' | 'clock' | 'asterisk', number]> = [];
    state.cells.each((i, j, cell) => {
        if (cell.change instanceof Burst && cell.powerup !== null) {
            powerupQueue.push([i, j, cell.powerup, cell.color]);
            cell.powerup = null;
        }
    });
    while (powerupQueue.length > 0) {
        const [pi, pj, ptype, pcolor] = powerupQueue.shift()!;
        if (ptype === 'bomb') {
            for (const [di, dj] of dirs) {
                const nb = state.cells.get(pi + di, pj + dj);
                if (nb !== undefined && nb.change === null) {
                    nb.change = new Burst();
                    if (nb.powerup !== null) {
                        powerupQueue.push([pi + di, pj + dj, nb.powerup, nb.color]);
                        nb.powerup = null;
                    }
                }
            }
        } else if (ptype === 'clock') {
            state.timerValue = Math.min(state.timerValue + state.clockPowerupTime, state.timerMax);
        } else if (ptype === 'asterisk') {
            state.cells.each((ai, aj, c) => {
                if (c.change === null && c.color === pcolor) {
                    c.change = new Burst();
                    if (c.powerup !== null) {
                        powerupQueue.push([ai, aj, c.powerup, c.color]);
                        c.powerup = null;
                    }
                }
            });
        }
    }

    if (state.timerActive && !state.gameOver) {
        state.timerValue -= delta;
        if (state.timerValue <= 0) {
            state.timerValue = 0;
            state.gameOver = true;
            saveScoreToLocalStorage(state.score);
        }
        state.timerValue = Math.min(state.timerValue, state.timerMax);
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
                        prev.color = randomStoneColor(state);
                        prev.hasGem = Math.random() < state.gemChance;
                        prev.powerup = null;
                        --tgt;
                    }
                    else if (next.change == null) {
                        prev.change = new Fall(drop);
                        prev.color = next.color;
                        prev.hasGem = next.hasGem;
                        prev.powerup = next.powerup;
                        prev = next;
                        --tgt;
                    }
                    else if (next.change instanceof Fall) {
                        prev.color = next.color;
                        prev.hasGem = next.hasGem;
                        prev.powerup = next.powerup;
                        const newFall = new Fall(next.change.dropHeight + 1);
                        newFall.phase = next.change.phase;
                        prev.change = newFall;
                        drop = newFall.dropHeight;
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

    if (!state.gameOver) {
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

        if (state.multiplierDrainDelay > 0) {
            state.multiplierDrainDelay -= delta;
        } else {
            state.multiplierBarPoints -= state.multiplierDrainRate * (1 + state.multiplierBarLevel * state.multiplierDrainRateMultiplier) * delta / 1000;
            while (state.multiplierBarPoints < 0) {
                if (state.multiplierBarLevel > 0) {
                    state.multiplierBarLevel--;
                    state.multiplierBarPoints += state.multiplierBarMax;
                } else {
                    state.multiplierBarPoints = 0;
                    break;
                }
            }
        }

        state.colorBiasTimer -= delta;
        if (state.colorBiasTimer <= 0) {
            if (!state.colorBiasActive) {
                state.colorBiasActive = true;
                state.colorBiasColor = rnd(state.numColors);
                state.colorBiasTimer = state.colorBiasBiasedDuration;
            } else {
                state.colorBiasActive = false;
                state.colorBiasTimer = state.colorBiasFairDuration;
            }
        }
    }

    return state;
}
