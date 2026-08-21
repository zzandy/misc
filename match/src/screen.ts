import { fullscreenCanvas } from '../../lib/canvas';
import { World, Cell, Burst, Fall, ParticleSource } from './world';
import { Vector, AABB } from './geometry';
import { tau } from './util';

const colors = ['#fed203', '#d6050d', '#1337b2', '#079ecd', '#f76f03', '#8e0c70', '#cbcbcb'];
const gemColors = ['#1337b2', '#f76f03', '#fed203', '#d6050d', '#8e0c70', '#ffffff', '#d6050d'];

// gem shape index per stone color: blue→circle, orange→hexagon, yellow→rect, red→cuts, purple→oct, white→oct-pointy, red→cuts
const gemShapes = [0, 3, 2, 1, 5, 6, 1];

const sq32 = Math.sqrt(3) / 2;

const BAR_GAP = 10;
const TIMER_BAR_W = 12;
const GEM_BAR_R = 6;

const hexDirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];

function fillRoundedPolygon(ctx: CanvasRenderingContext2D, n: number, R: number, rot: number, cornerR: number): void {
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
        const a = rot + (k / n) * tau;
        pts.push([R * Math.cos(a), R * Math.sin(a)]);
    }
    const path = new Path2D();
    for (let k = 0; k < n; k++) {
        const p = pts[k];
        const prev = pts[(k + n - 1) % n];
        const next = pts[(k + 1) % n];
        const dx1 = prev[0] - p[0], dy1 = prev[1] - p[1];
        const dx2 = next[0] - p[0], dy2 = next[1] - p[1];
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const cr = Math.min(cornerR, len1 / 2, len2 / 2);
        const p1x = p[0] + dx1 / len1 * cr, p1y = p[1] + dy1 / len1 * cr;
        if (k === 0) path.moveTo(p1x, p1y);
        else path.lineTo(p1x, p1y);
        path.arcTo(p[0], p[1], p[0] + dx2 / len2 * cr, p[1] + dy2 / len2 * cr, cr);
    }
    path.closePath();
    ctx.fill(path);
}

function drawShape(ctx: CanvasRenderingContext2D, r: number, shapeIndex: number): void {
    if (shapeIndex === 0) {
        ctx.beginPath(); ctx.arc(0, 0, r, 0, tau); ctx.fill(); return;
    }
    if (shapeIndex === 1) {
        const a = r * 0.62, k = r * 0.38;
        const p = new Path2D();
        p.moveTo(-a, -a);
        p.quadraticCurveTo(0, -a - k, a, -a);
        p.quadraticCurveTo(a - k, 0, a, a);
        p.quadraticCurveTo(0, a + k, -a, a);
        p.quadraticCurveTo(-a + k, 0, -a, -a);
        p.closePath();
        ctx.fill(p);
        ctx.stroke(p);
        return;
    }
    if (shapeIndex === 2) {
        const s = r * 0.78, c = r * 0.22;
        ctx.beginPath();
        ctx.moveTo(-s + c, -s);
        ctx.lineTo(s - c, -s);
        ctx.lineTo(s, -s + c);
        ctx.lineTo(s, s - c);
        ctx.lineTo(s - c, s);
        ctx.lineTo(-s + c, s);
        ctx.lineTo(-s, s - c);
        ctx.lineTo(-s, -s + c);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
    }
    if (shapeIndex === 3) { fillRoundedPolygon(ctx, 6, r * 0.9, 0, r * 0.15); return; }
    if (shapeIndex === 4) {
        const s = r * 0.78, c = r * 0.22, rot = 0.7071;
        const verts: [number, number][] = [
            [-s + c, -s], [s - c, -s], [s, -s + c], [s, s - c],
            [s - c, s], [-s + c, s], [-s, s - c], [-s, -s + c]
        ];
        ctx.beginPath();
        for (let k = 0; k < verts.length; k++) {
            const [x, y] = verts[k];
            const rx = (x - y) * rot, ry = (x + y) * rot;
            if (k === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
    }
    if (shapeIndex === 5) { fillRoundedPolygon(ctx, 8, r * 0.88, Math.PI / 8, r * 0.12); return; }
    fillRoundedPolygon(ctx, 8, r * 0.88, 0, r * 0.12);
}

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
    private scaler!: HexScaler;
    private readonly size: number;
    private active: [number, number] | null = null;
    private clipPath!: Path2D;
    private world: World | null = null;
    private multiplierBarDisplay = 0;
    private multiplierBarLevel = 0;
    public onPlayAgain: (() => void) | null = null;
    private playAgainRect: AABB | null = null;

    constructor(size: number) {
        this.size = size;
        this.resize();

        const canvas = this.ctx.canvas;
        canvas.addEventListener('mousemove', (e) => this.onMove(e));
        canvas.addEventListener('mousedown', (e) => this.onDown(e));
        canvas.addEventListener('mouseup', (e) => this.onUp(e));
        canvas.addEventListener('mouseleave', (e) => this.onUp(e));
        window.addEventListener('resize', () => this.resize());
    }

    private resize(): void {
        const canvas = this.ctx.canvas;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const { width, height } = canvas;
        const size = this.size;

        const hexPadL = 5 + TIMER_BAR_W + BAR_GAP;
        const hexPadR = 5 + GEM_BAR_R * 2 + BAR_GAP;
        this.scaler = new HexScaler(size, new AABB(hexPadL, 40, width - hexPadL - hexPadR, height - 50));
        const a = this.scaler.r;
        const sctr = tau / 12;
        const path = new Path2D();

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
                if (i == 0) path.moveTo(p.x, p.y);
                else path.lineTo(p.x, p.y);
            } else {
                path.arc(p.x, p.y, a, sctr * (i + 5), sctr * (i + 7));
            }
        });

        this.clipPath = path;
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
        if (this.world.gameOver) {
            if (this.playAgainRect != null && this.onPlayAgain != null) {
                const pos = new Vector(e.clientX, e.clientY);
                if (this.playAgainRect.contains(pos)) {
                    this.onPlayAgain();
                }
            }
            return;
        }
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
        if (this.world.gameOver) return;

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
                const origPowerup = src.powerup;
                const origHasGem = src.hasGem;
                src.color = tgt.color;
                src.powerup = tgt.powerup;
                src.hasGem = tgt.hasGem;
                tgt.color = origColor;
                tgt.powerup = origPowerup;
                tgt.hasGem = origHasGem;
                const candidate = origColor;
                if (candidate === this.world.activatedColor) {
                    this.world.activatedColorCount++;
                    if (this.world.activatedColorCount >= this.world.maxConsecutiveActivations) {
                        this.world.activatedColor = null;
                        this.world.activatedColorCount = 0;
                    } else {
                        this.world.pendingColorEffect = candidate;
                    }
                } else {
                    this.world.activatedColor = candidate;
                    this.world.activatedColorCount = 1;
                }
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

    private resolveParticlePos(p: ParticleSource): [number, number] {
        const r0 = this.scaler.r;
        if (p.kind === 'cell') {
            const s = this.scaler.storeToScreen(p.i, p.j);
            return [s.x, s.y];
        }
        const canvas = this.ctx.canvas;
        switch (p.name) {
            case 'color-indicator': {
                const circR = r0 * 0.28;
                const ringDist = circR * 2.6;
                const pad = circR * 0.6;
                return [
                    this.scaler.area.x + ringDist + circR + pad,
                    this.scaler.area.y + this.scaler.area.h - ringDist - circR - pad
                ];
            }
            case 'score':
                return [canvas.width - 10, 15];
            case 'timer-bar': {
                const topStone = this.scaler.storeToScreen(0, 0);
                const botStone = this.scaler.storeToScreen(0, this.size - 1);
                const timerBarX = topStone.x - r0 - BAR_GAP - TIMER_BAR_W;
                const timerBarH = botStone.y - topStone.y;
                return [timerBarX + TIMER_BAR_W / 2, topStone.y + timerBarH / 2];
            }
            case 'gem-bar': {
                const topStone = this.scaler.storeToScreen(2 * this.size - 2, this.size - 1);
                const botStone = this.scaler.storeToScreen(2 * this.size - 2, 2 * this.size - 2);
                const cx = topStone.x + r0 + BAR_GAP + GEM_BAR_R;
                return [cx, botStone.y];
            }
        }
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
            const isDragSource = world.dragStart != null
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
                drawShape(ctx, r, cell.color);
                if (cell.hasGem) {
                    ctx.fillStyle = gemColors[cell.color];
                    drawShape(ctx, r * 0.32, gemShapes[cell.color]);
                } else {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = '#000000';
                    drawShape(ctx, r * 0.32, gemShapes[cell.color]);
                    ctx.restore();
                }
                if (cell.powerup !== null) {
                    const ix = r * 0.52;
                    const iy = r * 0.52;
                    const ir = r * 0.25;
                    ctx.save();
                    ctx.translate(ix, iy);
                    if (cell.powerup === 'bomb') {
                        ctx.fillStyle = '#111111';
                        ctx.fillCircle(0, 0, ir);
                        ctx.strokeStyle = '#111111';
                        ctx.lineWidth = ir * 0.35;
                        ctx.beginPath();
                        ctx.moveTo(-ir * 0.65, -ir * 0.65);
                        ctx.lineTo(-ir * 1.4, -ir * 1.4);
                        ctx.stroke();
                        ctx.fillStyle = '#ffdd00';
                        ctx.fillCircle(-ir * 1.55, -ir * 1.55, ir * 0.22);
                    } else if (cell.powerup === 'clock') {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillCircle(0, 0, ir);
                        ctx.strokeStyle = '#111111';
                        ctx.lineWidth = ir * 0.25;
                        ctx.strokeCircle(0, 0, ir);
                        const hourAng = -Math.PI / 2 + (10 / 12) * tau;
                        const minAng = -Math.PI / 2 + (10 / 60) * tau;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(hourAng) * ir * 0.5, Math.sin(hourAng) * ir * 0.5);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(minAng) * ir * 0.75, Math.sin(minAng) * ir * 0.75);
                        ctx.stroke();
                    } else if (cell.powerup === 'asterisk') {
                        ctx.strokeStyle = '#111111';
                        ctx.lineWidth = ir * 0.35;
                        for (let k = 0; k < 6; k++) {
                            const ang = k * tau / 6;
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(Math.cos(ang) * ir, Math.sin(ang) * ir);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }
            }

            ctx.restore();
        });

        if (world.dragStart != null) {
            const [si, sj] = world.dragStart;
            const cell = world.cells.get(si, sj);
            if (cell != null) {
                const startScreen = this.scaler.storeToScreen(si, sj);
                const dx = this.pos.x - startScreen.x;
                const dy = this.pos.y - startScreen.y;
                const cursorDist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = r;
                const stoneDist = cursorDist / (1 + cursorDist / maxDist);
                let drawX = startScreen.x;
                let drawY = startScreen.y;
                if (cursorDist > 0) {
                    drawX += (dx / cursorDist) * stoneDist;
                    drawY += (dy / cursorDist) * stoneDist;
                }
                ctx.save();
                ctx.translate(drawX, drawY);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = colors[cell.color];
                drawShape(ctx, r, cell.color);
                ctx.globalAlpha = 1;
                ctx.restore();
            }
        }

        ctx.restore();

        for (const p of world.particles) {
            if (p.delay > 0) continue;
            const [sx, sy] = this.resolveParticlePos(p.source);
            const [tx, ty] = this.resolveParticlePos(p.target);
            const dx = tx - sx, dy = ty - sy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const arcHeight = Math.max(40, dist * 0.25);
            ctx.save();
            ctx.fillStyle = p.color;
            for (let step = 3; step >= 0; step--) {
                const tt = step === 0 ? p.t : Math.max(0, p.t - step * 0.05);
                const trailX = sx + dx * tt;
                const trailY = sy + dy * tt - arcHeight * 4 * tt * (1 - tt);
                ctx.globalAlpha = step === 0 ? 1 : (4 - step) / 12;
                ctx.beginPath();
                ctx.arc(trailX, trailY, 5, 0, tau);
                ctx.fill();
            }
            ctx.restore();
        }

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

        // Multiplier bar: along the top-right diagonal edge, from stone (size-1,0) to stone (2*size-2, size-1)
        {
            const barThick = 12;
            const edgeStart = this.scaler.storeToScreen(this.size - 1, 0);
            const edgeEnd = this.scaler.storeToScreen(2 * this.size - 2, this.size - 1);
            const edgeDx = edgeEnd.x - edgeStart.x;
            const edgeDy = edgeEnd.y - edgeStart.y;
            const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
            const edgeAngle = Math.atan2(edgeDy, edgeDx);
            const perpX = edgeDy / edgeLen;
            const perpY = -edgeDx / edgeLen;
            const ox = perpX * (r0 + BAR_GAP + barThick / 2);
            const oy = perpY * (r0 + BAR_GAP + barThick / 2);

            ctx.save();
            ctx.translate(edgeStart.x + ox, edgeStart.y + oy);
            ctx.rotate(edgeAngle);
            ctx.fillStyle = '#332200';
            ctx.fillRect(0, -barThick / 2, edgeLen, barThick);
            ctx.fillStyle = '#e8c000';
            ctx.fillRect(0, -barThick / 2, edgeLen * this.multiplierBarDisplay, barThick);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('×' + (world.multiplierBarLevel + 1), 4, 0);
            ctx.restore();
        }

        // Score: canvas top-right corner, above the hex field
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = world.doubleScoreTimer > 0 ? '#ffd700' : 'white';
        ctx.fillText(Math.floor(world.score).toString(), width - 10, 10);
        ctx.restore();

        // Timer bar: vertical bar left of the hex field, aligned with top/bottom stone centers in column 0
        {
            const topStone = this.scaler.storeToScreen(0, 0);
            const botStone = this.scaler.storeToScreen(0, this.size - 1);
            const timerBarX = topStone.x - r0 - BAR_GAP - TIMER_BAR_W;
            const timerBarTop = topStone.y;
            const timerBarH = botStone.y - topStone.y;
            const timerFill = world.timerMax > 0 ? world.timerValue / world.timerMax : 0;
            ctx.save();
            ctx.fillStyle = '#1a0800';
            ctx.fillRect(timerBarX, timerBarTop, TIMER_BAR_W, timerBarH);
            ctx.fillStyle = '#f76f03';
            ctx.fillRect(timerBarX, timerBarTop + timerBarH * (1 - timerFill), TIMER_BAR_W, timerBarH * timerFill);
            ctx.restore();
        }

        // Gem bar: evenly-spread gem dots right of the hex field
        {
            const topStone = this.scaler.storeToScreen(2 * this.size - 2, this.size - 1);
            const botStone = this.scaler.storeToScreen(2 * this.size - 2, 2 * this.size - 2);
            const cx = topStone.x + r0 + BAR_GAP + GEM_BAR_R;
            const barTop = topStone.y;
            const barH = botStone.y - topStone.y;

            ctx.save();

            ctx.strokeStyle = '#1a3a1a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, barTop);
            ctx.lineTo(cx, barTop + barH);
            ctx.stroke();

            const history = world.gemHistory;
            for (let k = 0; k < history.length; k++) {
                const t = history.length <= 1 ? 0 : k / (history.length - 1);
                ctx.fillStyle = gemColors[history[k]];
                ctx.beginPath();
                ctx.arc(cx, barTop + t * barH, GEM_BAR_R, 0, tau);
                ctx.fill();
            }

            ctx.fillStyle = '#2eb82e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('×' + (world.gemMultiplierLevel + 1), cx, barTop - 4);

            ctx.fillStyle = 'white';
            ctx.textBaseline = 'top';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(history.length.toString(), cx, botStone.y + 4);
            ctx.restore();
        }

        // Score popups
        if (world.scorePopups.length > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 22px sans-serif';
            for (const popup of world.scorePopups) {
                const t = popup.age / world.scorePopupDuration;
                const pos = this.scaler.storeToScreen(popup.i, popup.j);
                ctx.globalAlpha = 1 - t;
                ctx.fillStyle = 'white';
                ctx.fillText(popup.value.toString(), pos.x, pos.y - t * 40);
            }
            ctx.restore();
        }

        // Game-over overlay
        if (world.gameOver) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
            ctx.fillRect(area.x, area.y, area.w, area.h);

            const cx = area.x + area.w / 2;
            let cy = area.y + area.h * 0.18;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#f76f03';
            ctx.font = 'bold 52px sans-serif';
            ctx.fillText('GAME OVER', cx, cy);
            cy += 64;

            ctx.fillStyle = 'white';
            ctx.font = 'bold 30px sans-serif';
            ctx.fillText('Score: ' + Math.floor(world.score), cx, cy);
            cy += 46;

            const raw = localStorage.getItem('match-scores');
            const rawParsed: ({ score: number, date: string } | number)[] = raw ? JSON.parse(raw) : [];
            const scores = rawParsed.map(e => typeof e === 'number' ? { score: e, date: '' } : e);
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText('Top Scores', cx, cy);
            cy += 26;
            ctx.font = '15px sans-serif';
            const currentScore = Math.floor(world.score);
            let highlighted = false;
            for (let k = 0; k < scores.length; k++) {
                const entry = scores[k];
                const isCurrentGame = !highlighted && entry.score === currentScore;
                if (isCurrentGame) highlighted = true;
                ctx.fillStyle = isCurrentGame ? '#f76f03' : 'white';
                const age = scoreAge(entry.date);
                ctx.fillText((k + 1) + '.  ' + entry.score + '   ' + age, cx, cy);
                cy += 20;
            }
            cy += 12;

            const btnW = 160;
            const btnH = 44;
            const btnX = cx - btnW / 2;
            const btnY = cy;
            this.playAgainRect = new AABB(btnX, btnY, btnW, btnH);

            ctx.fillStyle = '#f76f03';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('Play Again', cx, btnY + btnH / 2);

            ctx.restore();
        } else {
            this.playAgainRect = null;
        }

        {
            const circR = r0 * 0.28;
            const ringDist = circR * 2.6;
            const pad = circR * 0.6;
            const wx = this.scaler.area.x + ringDist + circR + pad;
            const wy = this.scaler.area.y + this.scaler.area.h - ringDist - circR - pad;

            const activeColor = world.activatedColor;

            let centerColor: number;
            let ringColors: number[];

            if (activeColor === null || activeColor === 6) {
                centerColor = 6;
                ringColors = [0, 1, 2, 3, 4, 5];
            } else {
                centerColor = activeColor;
                ringColors = [0, 1, 2, 3, 4, 5].filter(c => c !== activeColor);
                ringColors.push(6);
            }

            ctx.save();
            ctx.globalAlpha = 0.75;
            for (let k = 0; k < 6; k++) {
                const rx = wx + Math.sin(k * Math.PI / 3) * ringDist;
                const ry = wy - Math.cos(k * Math.PI / 3) * ringDist;
                ctx.fillStyle = colors[ringColors[k]];
                ctx.beginPath();
                ctx.arc(rx, ry, circR, 0, tau);
                ctx.fill();
            }
            ctx.restore();

            ctx.save();
            if (activeColor !== null) {
                ctx.fillStyle = colors[centerColor];
                ctx.beginPath();
                ctx.arc(wx, wy, circR * 1.55, 0, tau);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = colors[6];
                ctx.beginPath();
                ctx.arc(wx, wy, circR * 0.9, 0, tau);
                ctx.fill();
            }
            ctx.restore();
        }
    }
}

function scoreAge(isoDate: string): string {
    if (!isoDate) return '—';
    const s = (Date.now() - new Date(isoDate).getTime()) / 1000;
    if (s < 60) return 'just now';
    const m = s / 60;
    if (m < 60) return Math.floor(m) + 'm ago';
    const h = m / 60;
    if (h < 24) return Math.floor(h) + 'h ago';
    const d = h / 24;
    if (d < 30) return Math.floor(d) + 'd ago';
    const mo = d / 30;
    if (mo < 12) return Math.floor(mo) + 'mo ago';
    return new Date(isoDate).getFullYear().toString();
}

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
