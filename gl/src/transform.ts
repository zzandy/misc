import { Matrix4, Vec3, Vec4 } from './types';
import { mul44, mul44v } from './matrix';

export class Camera {
    constructor(
        public pos: Vec3,
        public lookat: Vec3,
        public up: Vec3 = [0, 0, 1],
        public fov: number
    ) { }
}

export const translate3d = (trans: Vec3): Matrix4 => {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        trans[0], trans[1], trans[2], 1
    ];
}

export const scale3d = (scale: Vec3): Matrix4 => {
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1
    ];
}

export const sum = (...vectors: Vec3[]): Vec3 => {
    return <Vec3>vectors[0].map((_, i) => vectors.reduce((s, v) => v[i] + s, 0));
}

export const scale = (vector: Vec3, scalar: number): Vec3 => {
    return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

export const diff = (a: Vec3, b: Vec3): Vec3 => {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export const vectorAngleQuaternion = (v: Vec3, a: number): Vec4 => {
    const s = Math.sin(a / 2);
    return [s * v[0], s * v[1], s * v[2], Math.cos(a / 2)];
}

export const rotateAArroundB = (a: Vec3, b: Vec3, angle: number, axis: Vec3): Vec3 => {
    const relative: Vec4 = [a[0] - b[0], a[1] - b[1], a[2] - b[2], 1];
    const r = mul44v(rotate3d(vectorAngleQuaternion(axis, angle)), relative);
    return [b[0] + r[0], b[1] + r[1], b[2] + r[2]];
}

export const rotate3d = (q: Vec3 | Vec4): Matrix4 => {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3] || 1;

    return [
        1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * z * w, 2 * x * z + 2 * y * w, 0,
        2 * x * y + 2 * z * w, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * x * w, 0,
        2 * x * z - 2 * y * w, 2 * y * z + 2 * x * w, 1 - 2 * x * x - 2 * y * y, 0,
        0, 0, 0, 1
    ];
}

export const makePerspective = (fov: number, aspect: number, near: number, far: number): Matrix4 => {
    const f = Math.tan((Math.PI - fov) / 2);
    const r = 1 / (near - far);

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * r, -1,
        0, 0, near * far * r * 2, 0
    ];
}

export const mul = (...matrices: Matrix4[]): Matrix4 => {
    if (matrices.length < 2) return matrices[0];

    return matrices.reverse().reduce((a, b) => mul44(a, b))
}

export const makeProjection3d = (view: Matrix4, proj: Matrix4, origin: Vec3, rv: Vec3, ra: number, scales: Vec3): Matrix4 => {
    const scale = scale3d(scales);
    const rot = rotate3d(vectorAngleQuaternion(rv, ra));
    const translate = translate3d(origin);

    return mul(proj, view, rot, scale, translate);
}

export const projection = (cam: Matrix4, pos: Vec3, rot: Vec3 | Vec4, scale: Vec3): Matrix4 => {
    return mul(cam, translate3d(pos), rotate3d(rot), scale3d(scale));
}

export const cross = (a: Vec3, b: Vec3): Vec3 => {
    return [a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]];
}

const epsilon = 1e-10;
export const tau = 2 * Math.PI;
export const deg = tau / 360;

export const length = (a: Vec3): number => {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export const lengthUnder = (a: Vec3, maxLen: number) => {
    return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] < maxLen * maxLen;
}

export const substract = (a: Vec3, b: Vec3): Vec3 => {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export const norm = (a: Vec3): Vec3 => {
    const len = length(a);
    return len > epsilon
        ? [a[0] / len, a[1] / len, a[2] / len]
        : [0, 0, 0];
}

export const lookAt = (pos: Vec3, target: Vec3, up: Vec3): Matrix4 => {
    const z = norm(substract(pos, target));
    const x = norm(cross(up, z));
    const y = norm(cross(z, x));

    return [
        x[0], x[1], x[2], 0,
        y[0], y[1], y[2], 0,
        z[0], z[1], z[2], 0,
        pos[0], pos[1], pos[2], 1
    ];
}