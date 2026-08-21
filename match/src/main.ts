import { Loop } from '../../lib/loop';
import { ScreenManager } from './screen';
import { World, Cell, Burst, Fall } from './world';
import { rnd } from '../../lib/util';
import { Vector } from './geometry';
import { HexStore } from './store';

const size = 4;

const renderer = new ScreenManager(size);

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
        activatedColor: null
    };

    window.addEventListener('keydown', e => {
        // Reload
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
    function markBurn(string: Cell[], item: Cell, i: number, j: number): Cell[] {
        if (item.change != null)// && (item.change instanceof Burst && item.change.phase != 0 || !(item.change instanceof Burst)))
            return [];

        if (string.length == 0)
            return [item];
        else {
            if (string[0].color == item.color) {
                string.push(item);

                if (string.length == 3) {
                    string.forEach(cell => cell.change = new Burst());
                }

                else if (string.length > 3)
                    item.change = new Burst();

                return string;
            }
            else {
                return [item];
            }
        }
    }

    state.cells.reduceRows(() => [], markBurn);
    state.cells.reduceCols(() => [], markBurn);
    state.cells.reduceDiags(() => [], markBurn);

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

    return state;
}
