import { rnd } from "../../lib/util";

const Tau = Math.PI * 2;
const sin = Math.sin;
const cos = Math.cos;
const min = Math.min;
const max = Math.max;

export class Point {
    constructor(public readonly x: number, public readonly y: number) { }

    public dist(other: Point) {
        return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
    }

    public add(v: Vector) {
        return new Point(this.x + v.x, this.y + v.y);
    }

    public to(end: Point) {
        return new Vector(end.x - this.x, end.y - this.y);
    }

    public clamp(xrange: [number, number], yrange: [number, number]) {

        const dx = this.x - xrange[0];
        const wx = xrange[1] - xrange[0];

        const dy = this.y - yrange[0];
        const wy = yrange[1] - yrange[0];

        return new Point(xrange[0] + (dx + 10 * wx) % wx, yrange[0] + (dy + 10 * wy) % wy);
    }
}

export function newRandomVector(length: number) {
    const a = rnd(Tau);
    return new Vector(length * cos(a), length * sin(a));
}

export class Vector {
    constructor(public readonly x: number, public readonly y: number) {
    }

    public add(other: Vector) {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    public times(n: number) {
        return new Vector(this.x * n, this.y * n);
    }

    public get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public get norm() {
        const l = this.length;
        return this.times(1 / l);
    }
}