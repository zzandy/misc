import { fullscreenCanvas } from '../../lib/canvas';
import { World, Cell, Burst, Fall } from './world';
import { Vector, AABB } from './geometry';
import { tau } from './util';

const colors = ['#fed203', '#d6050d', '#1337b2', '#079ecd', '#f76f03', '#8e0c70', '#cbcbcb'];

const sq32 = Math.sqrt(3) / 2;

const hexDirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];

export class HexScaler {
    public readonly area: AABB;
    public readonly r: number;

    constructor(private readonly size: number, area: AABB) {
        const { x, y, w: width, h: height } = area;

        const hr = area.h / (2 * size - 1);
        const wr = area.w / ((2 * size - 2) * sq32 + 1);

        this.r = Math.min(hr, wr) / 2;

        const w = 2 * this.r * ((2 * size - 2) * sq32 + 1);
        const h = 2 * this.r * (2 * size - 1);
        this.area = new AABB(x + (width - w) / 2, y + (height - h) / 2, w, h);
    }

    public screenToStore(pos: Vector): [number, number] | null {
        if (!this.area.contains(pos)) return null;

        const fi = (pos.x - this.area.x - this.r) / 2 / sq32 / this.r + .333;
        let i = Math.floor(fi);
        let fj = (pos.y - this.area.y + (i - this.size) * this.r) / 2 / this.r + .5;
        let j = Math.floor(fj);

        const x = fi - i;
        const y = fj - j;
        let di = 0;
        let dj = 0;

        if (x > .666) {

            if (y < .5 && y < 3 * x / 2 - 1) {
                di = 1;
            }
            else if (y > .5 && y > -3 * x / 2 + 2) {
                di = 1;
                dj = 1
            }
        }

        return [i + di, j + dj];
    }

    public storeToScreen(i: number, j: number): Vector {
        return new Vector(this.area.x + sq32 * i * this.r * 2 + this.r,
            + this.area.y + j * this.r * 2 - (i - this.size) * this.r);
    }
}

export class ScreenManager {
    private readonly ctx = fullscreenCanvas();
    private pos: Vector = new Vector(0, 0);
    private readonly scaler: HexScaler;
    private active: [number, number] | null = null;
    private readonly clipPath: Path2D;
    private world: World | null = null;
    private multiplierBarDisplay = 0;
    private multiplierBarLevel = 0;

    constructor(size: number) {
        let canvas = this.ctx.canvas;
        let { width, height } = canvas;

        this.scaler = new HexScaler(size, new AABB(10, 10, width - 20, height - 20));
        const a = this.scaler.r;
        const sctr = tau / 12;
        const ctx = new Path2D();

        [
            this.scaler.storeToScreen(0, 0).add(new Vector(-a, 0)),
            this.scaler.storeToScreen(0, 0),

            this.scaler.storeToScreen(size - 1, 0).add(new Vector(-a / 2, -a * sq32)),
            this.scaler.storeToScreen(size - 1, 0),

            this.scaler.storeToScreen(size * 2 - 2, size - 1).add(new Vector(a / 2, -a * sq32)),
            this.scaler.storeToScreen(size * 2 - 2, size - 1),

            this.scaler.storeToScreen(size * 2 - 2, size * 2 - 2).add(new Vector(a, 0)),
            this.scaler.storeToScreen(size * 2 - 2, size * 2 - 2),

            this.scaler.storeToScreen(size - 1, size * 2 - 2).add(new Vector(a / 2, a * sq32)),
            this.scaler.storeToScreen(size - 1, size * 2 - 2),

            this.scaler.storeToScreen(0, size - 1).add(new Vector(-a / 2, a * sq32)),
            this.scaler.storeToScreen(0, size - 1),
        ].forEach((p, i) => {
            if (i % 2 == 0) {
                if (i == 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y)
            }
            else {
                let n = (i - 1) / 2;
                ctx.arc(p.x, p.y, a, sctr * (i + 5), sctr * (i + 7));
            }
        });

        this.clipPath = ctx;

        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mousedown', (e) => this.onDown(e));
        canvas.addEventListener('mouseup', (e) => this.onUp(e));
    }

    private onMove(e: MouseEvent): void {
        this.pos = new Vector(e.clientX, e.clientY);
        this.active = this.scaler.screenToStore(this.pos);

        if (this.world == null || this.world.dragStart == null) return;

        const [si, sj] = this.world.dragStart;
        const startScreen = this.scaler.storeToScreen(si, sj);
        const dx = this.pos.x - startScreen.x;
        const dy = this.pos.y - startScreen.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.scaler.r * 0.5) {
            this.world.dragDir = null;
            return;
        }

        let bestDir: [number, number] = hexDirs[0];
        let bestDot = -Infinity;

        for (const [di, dj] of hexDirs) {
            const vx = 2 * sq32 * di;
            const vy = 2 * dj - di;
            const len = Math.sqrt(vx * vx + vy * vy);
            const dot = (dx * vx + dy * vy) / len;
            if (dot > bestDot) {
                bestDot = dot;
                bestDir = [di, dj];
            }
        }

        this.world.dragDir = bestDir;
    }

    private onDown(e: MouseEvent): void {
        if (this.world == null) return;
        const pos = new Vector(e.clientX, e.clientY);
        const coord = this.scaler.screenToStore(pos);
        if (coord == null) return;
        const [ci, cj] = coord;
        const cell = this.world.cells.get(ci, cj);
        if (cell == null || cell.change != null) return;
        this.world.dragStart = [ci, cj];
        this.world.dragDir = null;
    }

    private onUp(_e: MouseEvent): void {
        if (this.world == null) return;

        if (this.world.dragStart != null && this.world.dragDir != null) {
            const [si, sj] = this.world.dragStart;
            const [di, dj] = this.world.dragDir;
            const ti = si + di;
            const tj = sj + dj;
            const src = this.world.cells.get(si, sj);
            const tgt = this.world.cells.get(ti, tj);

            if (src != null && src.change == null && tgt != null && tgt.change == null
                && this.hasMatchAfterSwap(si, sj, ti, tj)) {
                const origColor = src.color;
                src.color = tgt.color;
                tgt.color = origColor;
                this.world.activatedColor = origColor;
            }
        }

        this.world.dragStart = null;
        this.world.dragDir = null;
    }

    private hasMatchAfterSwap(i1: number, j1: number, i2: number, j2: number): boolean {
        if (this.world == null) return false;
        const cells = this.world.cells;
        const c1 = cells.get(i1, j1);
        const c2 = cells.get(i2, j2);
        if (c1 == null || c2 == null) return false;

        const origColor1 = c1.color;
        const origColor2 = c2.color;
        c1.color = origColor2;
        c2.color = origColor1;

        let found = false;
        const check = (agg: Cell[], cell: Cell, _i: number, _j: number): Cell[] => {
            if (cell.change != null) return [];
            if (agg.length === 0) return [cell];
            if (agg[0].color === cell.color) {
                agg.push(cell);
                if (agg.length >= 3) found = true;
                return agg;
            }
            return [cell];
        };

        cells.reduceRows(() => [], check);
        if (!found) cells.reduceCols(() => [], check);
        if (!found) cells.reduceDiags(() => [], check);

        c1.color = origColor1;
        c2.color = origColor2;

        return found;
    }

    public render(delta: number, world: World) {
        this.world = world;

        const ctx = this.ctx;
        const { width, height } = ctx.canvas;
        const r0 = this.scaler.r;
        const r = r0 * .9;

        ctx.fillStyle = '#161610';
        ctx.fillRect(0, 0, width, height);
        ctx.save();

        ctx.clip(this.clipPath);

        world.cells.each((i, j, cell) => {
            const isDragSource = world.dragStart != null && world.dragDir != null
                && i === world.dragStart[0] && j === world.dragStart[1];
            const isWiggle = world.wiggleTimer > 0 && world.wiggleCell != null
                && world.wiggleCell[0] === i && world.wiggleCell[1] === j;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.fillStyle = colors[cell.color];

            const pos = this.scaler.storeToScreen(i, j);
            ctx.translate(pos.x, pos.y);

            if (cell.change instanceof Burst) {
                const s = fade(Math.min(1, 1 - cell.change.phase));
                ctx.scale(s, s);
            }
            else if (cell.change instanceof Fall) {
                const c = cell.change;
                const dy = c.dropHeight * fade((c.dropHeight - c.phase) / c.dropHeight);
                ctx.translate(0, -dy * r0 * 2);
            }
            else if (isWiggle) {
                const t = (world.wiggleDuration - world.wiggleTimer) / world.wiggleDuration;
                const wobble = Math.sin(t * Math.PI * 6) * Math.sin(t * Math.PI) * r0 * 0.09;
                ctx.translate(wobble, 0);
            }

            if (isDragSource) {
                ctx.globalAlpha = 0.35;
                ctx.strokeCircle(0, 0, r);
                ctx.globalAlpha = 1;
            } else {
                if (this.active != null && this.active[0] == i && this.active[1] == j)
                    ctx.strokeCircle(0, 0, r);
                ctx.fillCircle(0, 0, r);
                ctx.fillStyle = 'black';
                const text = i + ' ' + j;
                ctx.fillText(text, 0 - ctx.measureText(text).width / 2, 4);
            }

            ctx.restore();
        });

        if (world.dragStart != null && world.dragDir != null) {
            const [si, sj] = world.dragStart;
            const [di, dj] = world.dragDir;
            const cell = world.cells.get(si, sj);
            if (cell != null) {
                const startPos = this.scaler.storeToScreen(si, sj);
                const targetPos = this.scaler.storeToScreen(si + di, sj + dj);
                const ex = targetPos.x - startPos.x;
                const ey = targetPos.y - startPos.y;
                const len2 = ex * ex + ey * ey;
                const px = this.pos.x - startPos.x;
                const py = this.pos.y - startPos.y;
                const t = len2 > 0 ? Math.max(0, Math.min(0.5, (px * ex + py * ey) / len2)) : 0;

                ctx.save();
                ctx.translate(startPos.x + ex * t, startPos.y + ey * t);
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = colors[cell.color];
                ctx.fillCircle(0, 0, r);
                ctx.globalAlpha = 1;
                ctx.restore();
            }
        }

        ctx.restore();

        const area = this.scaler.area;

        // Smooth bar fill toward actual value; snap instantly on level change
        const targetFill = world.multiplierBarMax > 0
            ? Math.min(1, world.multiplierBarPoints / world.multiplierBarMax)
            : 0;
        if (world.multiplierBarLevel !== this.multiplierBarLevel) {
            this.multiplierBarDisplay = targetFill;
            this.multiplierBarLevel = world.multiplierBarLevel;
        } else {
            this.multiplierBarDisplay += (targetFill - this.multiplierBarDisplay) * Math.min(1, delta * 0.008);
        }

        // Bar along top-right edge: starts at top vertex (area center-x, area.y), runs at 30° for half field width
        const barLength = area.w / 2;
        const barThick = 16;
        const topVx = area.x + area.w / 2;
        const topVy = area.y;

        ctx.save();
        ctx.translate(topVx, topVy);
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#332200';
        ctx.fillRect(0, -(barThick + 3), barLength, barThick);
        ctx.fillStyle = '#e8c000';
        ctx.fillRect(0, -(barThick + 3), barLength * this.multiplierBarDisplay, barThick);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('×' + (world.multiplierBarLevel + 1), 4, -(barThick / 2 + 3));
        ctx.restore();

        // Score: top-right corner of bounding box — right edge x, top edge y
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = world.doubleScoreTimer > 0 ? '#ffd700' : 'white';
        ctx.fillText(Math.floor(world.score).toString(), area.x + area.w, area.y);
        ctx.restore();
    }
}

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
