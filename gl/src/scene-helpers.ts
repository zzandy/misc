import { Mesh, SimpleProgram } from './mesh';
import { Vec3, Vec4 } from './types';
import { hcy } from '../../lib/color';
import { deg, lengthUnder, rotate3d, sum, vectorAngleQuaternion } from './transform';
import { mul44v } from './matrix';

import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';

const s3 = Math.sqrt(3);
const s6 = Math.sqrt(6);

const rnd = (x: number): number => {
    return Math.random() * x;
}

export const makeCube = (gl: WebGLRenderingContext, pos: Vec3 = [0, 0, 0]): Mesh => {

    const p = new SimpleProgram(gl, vertex, fragment);

    const geometry = makeCubeMesh(0, 0, 0, 5, 5, 5);

    const colors = makeQuadColors(geometry, Math.random() * 360);

    return new Mesh(gl, p, geometry, colors, pos);
}

const repeat = <TItem>(a: TItem[], n: number): TItem[] => {
    const res: TItem[] = [];
    const m = a.length;
    for (let i = 0; i < n; ++i)
        for (let j = 0; j < m; ++j)
            res.push(a[j]);

    return res;
}

function tri(a: Vec3, b: Vec3, c: Vec3) {
    return [...a, ...b, ...c];
}

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
    return [...tri(a, b, c), ...tri(c, d, a)];
}

export const makeGrid = (gl: WebGLRenderingContext, center: Vec3, radius: number, d: number, color: [number, number, number]) => {
    const mesh = makeSimplexMesh([0, 0, 0], .7);
    const p = new SimpleProgram(gl, vertex, fragment);
    const colors = new Float32Array(repeat(color, mesh.length));
    const res = []
    const sq34 = Math.sqrt(3 / 4);

    let ext = radius * 2 / d;
    let offset: Vec3 = sum(center, [-radius, -radius, -radius]);

    for (let i = 0; i < ext; ++i)
        for (let j = 0; j < ext; ++j) {
            for (let k = 0; k < ext; ++k) {
                let pos = sum(offset, [
                    i * d,
                    j * d,
                    k * d]);

                if (lengthUnder(pos, radius))
                    res.push(new Mesh(gl, p, mesh, colors, pos))
            }
        }

    return res;
}

export const makeDodecahedronMesh = (a: number) => {
    const z = a * 3 / 2 / s6;
    const x = a / 2;
    const y = a / s3;
    const y2 = a / 2 / s3;
    const z2 = a / s6;
    const z3 = a / 2 / s6;

    const v: Vec3[] = [
        [0, 0, -z],
        [-x, -y2, -z2],
        [0, -y, -z3],
        [x, -y2, -z2],
        [x, y2, -z3],
        [0, y, -z2],
        [-x, y2, -z3],
        [-x, -y2, z3],
        [0, -y, z2],
        [x, -y2, z3],
        [x, y2, z2],
        [0, y, z3],
        [-x, y2, z2],
        [0, 0, z]
    ];

    const iquad = (i: number, j: number, k: number, l: number) => {
        return quad(v[i], v[j], v[k], v[l]);
    }

    return new Float32Array([
        ...iquad(0, 3, 2, 1),
        ...iquad(0, 5, 4, 3),
        ...iquad(0, 1, 6, 5),
        ...iquad(2, 8, 7, 1),
        ...iquad(2, 3, 9, 8),
        ...iquad(4, 10, 9, 3),
        ...iquad(4, 5, 11, 10),
        ...iquad(6, 12, 11, 5),
        ...iquad(6, 1, 7, 12),
        ...iquad(7, 8, 13, 12),
        ...iquad(9, 10, 13, 8),
        ...iquad(11, 12, 13, 10)]);
}

export const makeDodecahedrons = (gl: WebGLRenderingContext, a: number, cols: number, rows: number, layers: number, o: Vec3 = [0, 0, 0]) => {
    const mesh = makeDodecahedronMesh(a);
    const p = new SimpleProgram(gl, vertex, fragment);

    const dy = s3 / 2;
    const dz = 2 * a / s6;
    const oyz = a / 2 / s3;

    const res = [];

    for (var i = 0; i < rows; ++i)
        for (var j = 0; j < cols; ++j)
            for (var k = 0; k < layers; ++k)
                res.push(new Mesh(gl, p, mesh, makeQuadColors(mesh, rnd(360)),
                    [
                        -cols / 2 + o[0] + ((i + (k % 3)) % 2) * a / 2 + a * j,
                        -rows / 2 + o[1] + a * i * dy - oyz * (k % 3),
                        -layers / 2 + o[2] + dz * k
                    ]));

    return res;
}

const makeSimplexMesh = (pos: Vec3, r: number) => {
    const top: Vec4 = [0, 0, r, 1];
    const b1 = mul44v(rotate3d(vectorAngleQuaternion([1, 0, 0], 120 * deg)), top);
    const b2 = mul44v(rotate3d(vectorAngleQuaternion([0, 0, 1], 120 * deg)), b1);
    const b3 = mul44v(rotate3d(vectorAngleQuaternion([0, 0, 1], -120 * deg)), b1);

    function t(a: Vec4, b: Vec4, c: Vec4) {
        return [a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]]
    }

    return new Float32Array([
        ...t(top, b1, b2),
        ...t(top, b2, b3),
        ...t(top, b3, b1),
        ...t(b3, b2, b1),
    ]);
}

const makeCubeMesh = (x: number, y: number, z: number, w: number, hy: number, dz: number) => {

    const a: Vec3 = [x, y, z];
    const b: Vec3 = [x + w, y, z];
    const c: Vec3 = [x + w, y, z + dz];
    const d: Vec3 = [x, y, z + dz];
    const e: Vec3 = [x, y + hy, z];
    const f: Vec3 = [x + w, y + hy, z];
    const g: Vec3 = [x + w, y + hy, z + dz];
    const h: Vec3 = [x, y + hy, z + dz];

    return new Float32Array((<number[]>[]).concat(
        quad(b, c, d, a),
        quad(e, a, d, h),
        quad(f, b, a, e),
        quad(g, c, b, f),
        quad(h, d, c, g),
        quad(g, f, e, h)
    ));
}

const makeQuadColors = (geometry: Float32Array, baseHue: number) => {
    const rnd = Math.random
    const colors = new Float32Array(geometry.length * 3);

    let i = 0;
    while (i < colors.length) {
        const c = baseHue === undefined
            ? hcy(Math.random() * 360, 1, .5)
            : hcy(baseHue + 100 * (rnd() - .5), 1, .5);

        for (let j = 0; j < 6 && (i + j * 3 < colors.length); ++j) {
            colors[i + j * 3 + 0] = c[0];
            colors[i + j * 3 + 1] = c[1];
            colors[i + j * 3 + 2] = c[2];
        }

        i += 6 * 3;
    }

    return colors;
}