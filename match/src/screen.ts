import { fullscreenCanvas } from '../../lib/canvas';
import { World, Cell, Burst, Fall } from './world';
import { Vector, AABB } from './geometry';
import { tau } from './util';

const colors = ['#fed203', '#d6050d', '#1337b2', '#079ecd', '#f76f03', '#8e0c70', '#cbcbcb'];
const gemColors = ['#8e0c70', '#079ecd', '#fed203', '#d6050d', '#1337b2', '#fed203', '#000000'];

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
    private readonly size: number;
    private active: [number, number] | null = null;
    private readonly clipPath: Path2D;
    private world: World | null = null;
    private multiplierBarDisplay = 0;
    private multiplierBarLevel = 0;
    public onPlayAgain: (() => void) | null = null;
    private playAgainRect: AABB | null = null;

    constructor(size: number) {
        this.size = size;
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
                if (cell.hasGem) {
                    ctx.fillStyle = gemColors[cell.color];
                    ctx.fillCircle(0, 0, r * 0.25);
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

        // Multiplier bar: along the top-right diagonal edge, from stone (size-1,0) to stone (2*size-2, size-1)
        {
            const barThick = 12;
            const barGap = 6;
            const edgeStart = this.scaler.storeToScreen(this.size - 1, 0);
            const edgeEnd = this.scaler.storeToScreen(2 * this.size - 2, this.size - 1);
            const edgeDx = edgeEnd.x - edgeStart.x;
            const edgeDy = edgeEnd.y - edgeStart.y;
            const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
            const edgeAngle = Math.atan2(edgeDy, edgeDx);
            // Outward perpendicular: clockwise 90° from edge direction
            const perpX = edgeDy / edgeLen;
            const perpY = -edgeDx / edgeLen;
            const ox = perpX * (r0 + barGap + barThick / 2);
            const oy = perpY * (r0 + barGap + barThick / 2);

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

        // Score: top-right corner of bounding box — right edge x, top edge y
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = world.doubleScoreTimer > 0 ? '#ffd700' : 'white';
        ctx.fillText(Math.floor(world.score).toString(), area.x + area.w, area.y);
        ctx.restore();

        // Timer bar: vertical bar left of the hex field, aligned with top/bottom stone centers in column 0
        {
            const timerBarW = 12;
            const timerGap = 6;
            const topStone = this.scaler.storeToScreen(0, 0);
            const botStone = this.scaler.storeToScreen(0, this.size - 1);
            const timerBarX = topStone.x - r0 - timerGap - timerBarW;
            const timerBarTop = topStone.y;
            const timerBarH = botStone.y - topStone.y;
            const timerFill = world.timerMax > 0 ? world.timerValue / world.timerMax : 0;
            ctx.save();
            ctx.fillStyle = '#1a0800';
            ctx.fillRect(timerBarX, timerBarTop, timerBarW, timerBarH);
            ctx.fillStyle = '#f76f03';
            ctx.fillRect(timerBarX, timerBarTop + timerBarH * (1 - timerFill), timerBarW, timerBarH * timerFill);
            ctx.restore();
        }

        // Gem bar: evenly-spread gem dots right of the hex field
        {
            const gemR = 6;
            const gemGap = 6;
            const topStone = this.scaler.storeToScreen(2 * this.size - 2, this.size - 1);
            const botStone = this.scaler.storeToScreen(2 * this.size - 2, 2 * this.size - 2);
            const cx = topStone.x + r0 + gemGap + gemR;
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
                ctx.arc(cx, barTop + t * barH, gemR, 0, tau);
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
            const scores: number[] = raw ? JSON.parse(raw) : [];
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText('Top Scores', cx, cy);
            cy += 26;
            ctx.font = '15px sans-serif';
            for (let k = 0; k < scores.length; k++) {
                const isCurrentGame = k === 0;
                ctx.fillStyle = isCurrentGame ? '#f76f03' : 'white';
                ctx.fillText((k + 1) + '.  ' + scores[k], cx, cy);
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
    }
}

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
