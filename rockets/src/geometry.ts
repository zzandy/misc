
export class AABB {
    constructor(public readonly x: number, public readonly y: number, public readonly w: number, public readonly h: number) { }

    public contains(p: Vector) {
        const { x, y, w, h } = this;
        return p.x >= x && p.y >= y && p.x < (x + w) && p.y < (y + h);
    }

    public intersects(bb: AABB) {
        const { x, y, w, h } = this;
        return !(x + w < bb.x || y + h < bb.y || bb.x + bb.w < x || bb.y + bb.h < y);
    }
}

export class Vector {
    constructor(public readonly x: number, public readonly y: number) { }

    public get mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public add(other: Vector) {
        return new Vector(this.x + other.x, this.y + other.y);
    }

    public times(a: number) {
        return new Vector(a * this.x, a * this.y);
    }

    public distance(other: Vector) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public rotate(rad:number){
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const {x, y} = this;
        
        return new Vector(
            x * c + y * -s,
            x * s + y * c
        );
    }
}

export const newVector = (a: number, m: number) => {
    return new Vector(Math.cos(a) * m, Math.sin(a) * m);
}