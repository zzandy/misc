import { rnd } from "../../lib/util";
import { Vector, newVector } from "./geometry";

export class Rocket {
    private commandIndex: number = 0;
    private timer: number = 0;
    pos: Vector;

    public mainOn = true;
    public leftOn = false;
    public rightOn = false;

    thrust = .03;
    steer = .01;

    heading: Vector = newVector(Math.PI / 2, 1);
    vector = new Vector(0, 0);
    bestScore = 0;
    isDead = false;

    public get thrustVector() {
        return this.heading.times(this.thrust / this.heading.mag);
    }

    public get leftThrust() {
        const left = new Vector(this.heading.y, - this.heading.x);
        return left.times(this.steer / left.mag)
    }

    public get rightThrust() {
        const left = new Vector(-this.heading.y, this.heading.x);
        return left.times(this.steer / left.mag)
    }

    constructor(x: number, y: number, private readonly gravity: Vector, public readonly commands: Command[]) {
        this.pos = new Vector(x, y);
    }

    public score(n: number) {
        this.bestScore = Math.max(this.bestScore, n);
    }

    public advance(delta: number) {
        let time = delta;

        let burnVector = new Vector(0, 0);

        while (time > 0) {
            let cmd = this.commands[this.commandIndex];
            if (this.timer > 0) {
                const t = Math.min(this.timer, time);
                this.timer -= t;
                time -= t;

                if (this.mainOn) burnVector = burnVector.add(this.thrustVector.times(t));

                if (this.leftOn && !this.rightOn) {
                    this.heading = this.heading.rotate(-this.steer * t);
                }
                if (this.rightOn && !this.leftOn) {
                    this.heading = this.heading.rotate(this.steer * t);
                }
            }

            if (time > 0) {
                switch (cmd.thruster) {
                    case 0: this.mainOn = !this.mainOn; break;
                    case 1: this.leftOn = !this.leftOn; break;
                    case 2: this.rightOn = !this.rightOn; break;
                }

                this.timer += cmd.outTime;
                this.commandIndex = (++this.commandIndex) % this.commands.length;
            }
        }
        this.vector = this.vector.add(burnVector).add(this.gravity.times(delta));
        this.pos = this.pos.add(this.vector);
    }
}

export class Command {
    constructor(public readonly thruster: number,
        public readonly outTime: number) { }
}

export class Explosion {
    age: number = 0;
    lifespan: number = rnd(100, 300);

    constructor(public readonly pos: Vector) {

    }

    public advance(time: number) {
        this.age += time;
    }

    public get isAlive() {
        return this.age < this.lifespan;
    }
}
