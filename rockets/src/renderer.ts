import { fullscreenCanvas } from '../../lib/canvas';
import { AABB, Vector } from './geometry';
import { Rocket, Explosion } from './rocket';
import { Stats, tau } from './util';

export class Renderer {
    private readonly ctx = fullscreenCanvas(false, true);


    public draw(goals: Vector[], obstacles: AABB[], rockets: Rocket[], explosions: Explosion[], area: AABB, stats: Stats) {
        const { ctx, width, height } = this;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        const pad = (Math.min(height / 50, width / 50) | 0) + .5;
        const w = width - pad * 2;
        const h = height - pad * 2;

        ctx.scale(w / area.w, -h / area.h);
        ctx.translate(pad - area.x, -pad - area.y - area.h);

        ctx.beginPath()
        ctx.rect(area.x, area.y, area.w, area.h);
        ctx.clip();

        // render grid

        ctx.strokeStyle = '#630';
        let dx = (area.w / 24) | 0;
        let dy = (area.h / 24) | 0;

        for (let i = 0; i < 12; ++i) {
            ctx.strokeRect(area.x + dx * i * 2, area.y, dx, area.h)
            ctx.strokeRect(area.x, area.y + dy * i * 2, area.w, dy)

        }

        ctx.fillStyle = 'gold';
        ctx.strokeStyle = 'gold';

        const r = 10;
        let n = 0;
        for (let goal of goals) {
            ctx.fillCircle(goal.x, goal.y, r * (1 + .2 * Math.sin((1 + n / 10) * stats.frame / 10)));
            ctx.strokeCircle(goal.x, goal.y, 5 * r * (1 + .2 * Math.sin((1 + n / 10) * stats.frame / 9)));
        }

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;

        // render exausts
        for (let rocket of rockets) {
            if (rocket.isDead) continue;

            //ctx.lineTo(rocket.pos.x - 70 * rocket.burnVector.x, rocket.pos.y - 70 * rocket.burnVector.y);

            if (rocket.mainOn) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 8;
                const v = rocket.thrustVector.times(300);
                ctx.beginPath();
                ctx.moveTo(rocket.pos.x, rocket.pos.y)
                ctx.lineTo(rocket.pos.x - v.x, rocket.pos.y - v.y)
                ctx.stroke();
            }

            if (rocket.leftOn && !rocket.rightOn) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 5;

                const v = rocket.leftThrust.times(2000);
                ctx.beginPath();
                ctx.moveTo(rocket.pos.x, rocket.pos.y)
                ctx.lineTo(rocket.pos.x + v.x, rocket.pos.y + v.y)
                ctx.stroke();
            }

            if (rocket.rightOn && !rocket.leftOn) {
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 5;

                const v = rocket.rightThrust.times(2000);
                ctx.beginPath();
                ctx.moveTo(rocket.pos.x, rocket.pos.y)
                ctx.lineTo(rocket.pos.x + v.x, rocket.pos.y + v.y)
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#E23636';

        // render rockets
        for (let rocket of rockets) {
            if (rocket.isDead) continue;

            ctx.save();
            ctx.translate(rocket.pos.x, rocket.pos.y);
            ctx.rotate(Math.atan2(rocket.heading.y, rocket.heading.x) - Math.PI / 2)
            ctx.scale(2, 2)
            ctx.beginPath();

            ctx.moveTo(0, r);
            ctx.lineTo(r / 3, 0);
            ctx.lineTo(-r / 3, 0);

            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = 'white';
        for (let expl of explosions) {
            ctx.fillCircle(expl.pos.x, expl.pos.y, easeOutQuint(expl.age / expl.lifespan) * 50);
        }

        ctx.lineWidth = 2;
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fc0';
        ctx.strokeRect(area.x, area.y, area.w, area.h);

        for (let block of obstacles) {
            ctx.fillRect(block.x, block.y, block.w, block.h);
            ctx.strokeRect(block.x, block.y, block.w, block.h);
        }

        ctx.translate(area.x + 10, area.h - 10);
        ctx.scale(1, -1);

        let y = 0;
        let line = 3;
        let s = 80;

        // render genome

        for (let i = 0; i < 12; ++i) {
            let rocket = rockets[(i + (stats.frame / 10 | 0)) % rockets.length];

            let x = 0;
            for (let command of rocket.commands) {
                ctx.fillStyle = `hsl(${command.thruster * 120 / Math.PI}, 100%, 80%)`;
                ctx.fillRect(x / s, y * line, 5, line - 1);
                x += command.outTime;
            }

            if (++y > 12) break;
        }

        y += 45;

        this.ctx.fillStyle = 'grey';
        this.ctx.fillText(stats.first + 's', 0, y)
        this.ctx.fillText(stats.globalBest.toFixed(2) + 'pts % ' + (1 / stats.rate / 1000).toFixed(3) + "s/pt", 0, y + 20)
        this.ctx.fillText(stats.best.toFixed(2) + 'pts', 0, y + 40)

        this.ctx.restore();
    }

    public get width() {
        return this.ctx.canvas.width;
    }

    public get height() {
        return this.ctx.canvas.height;
    }
}

function easeOutQuint(x: number): number {
    return 1 - Math.pow(1 - x, 5);
}
