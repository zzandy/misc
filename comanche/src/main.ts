import { fullscreenCanvas } from '../../lib/canvas';
import { loadImages } from './image';
import { Loop } from '../../lib/loop';
import { Heightmap, Inertial, Inputs, Player, triplet, WorldState } from './types';

// maps lifted from https://github.com/s-macke/VoxelSpace

const deg = Math.PI / 180;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;

let color: ImageData, height: Heightmap;
let maps = ['C1W.png', 'C2W.png', 'C3.png', 'C4.png', 'C5W.png', 'C6.png', 'C6W.png', 'C7W.png', 'C9W.png', 'C10W.png', 'C11.png', 'C11W.png', 'C13.png', 'C14.png', 'C15.png', 'C15W.png', 'C16.png', 'C16W.png', 'C17W.png', 'C18.png', 'C18W.png', 'C19W.png', 'C20W.png', 'C21.png', 'C21W.png', 'C22W.png', 'C24W.png', 'C25.png', 'C25W.png'];
let currentMap = 6;
let debug = false;

main();

async function main() {
    [color, height] = await loadImages(maps[currentMap]);
    let loop = new Loop(1000 / 60, init, update, render);
    loop.start();
}

function init(): WorldState {
    let ctx = fullscreenCanvas(false, true);

    let player = {
        x: .11, y: .133, azimuth: -192.84802576606054, alt: 55.93534841801423
    }

    let movement = {
        heading: new Inertial(10, 2, .1, 5),
        velocity: new Inertial(100, 10, .1, 100000),
        altitude: new Inertial(10, 1, .1, 30)
    };

    let camera = {
        fov: 90,
        range: .5
    }

    let inputs = {
        throttle: 0,
        steer: 0,
        alt: 0,
        nextMap: 0,
        debug: 0
    }

    bind(inputs, [
        ['throttle', 'KeyS', 'KeyW'],
        ['steer', 'KeyA', 'KeyD'],
        ['alt', 'ShiftLeft', 'Space'],
        ['nextMap', 'KeyN', 'KeyM'],
        ['debug', 'F3', 'F3']
    ]);

    return {
        ctx, color, height, player, camera, inputs, movement
    }
}

function update(delta: number, state: WorldState): WorldState {
    let { movement, player, inputs } = state;

    debug = inputs.debug != 0;
    inputs.debug = 0;

    if (inputs.nextMap) {
        currentMap = (currentMap + maps.length + inputs.nextMap) % maps.length;
        loadImages(maps[currentMap]).then((res) => [state.color, state.height] = res);

        inputs.nextMap = 0;
    }

    let velocity = movement.velocity.update(inputs.throttle);
    let heading = movement.heading.update(inputs.steer);
    let altitude = movement.altitude.update(inputs.alt);

    player.azimuth += heading;

    player.alt += altitude;

    if (altitude > 0)
        player.alt = Math.max(player.alt, sample1d(height, player.x, player.y) + 10)

    if (player.alt < 0) player.alt = 0;
    else if (player.alt > 300) player.alt = 300;

    player.x = wrap(player.x + velocity * Math.cos(player.azimuth * deg));
    player.y = wrap(player.y + velocity * Math.sin(player.azimuth * deg));
    if (debug) console.log(player)

    return state;
}

function wrap(v: number): number {
    while (v < 0) v += 1
    while (v >= 1) v -= 1;
    return v;
}

function render(delta: number, state: WorldState) {
    let { ctx, player: { x, y, azimuth, alt }, color, height, camera: { fov, range } } = state;

    let k = 600;
    let dq = 1.001
    let vfov = 70;

    let viewport = {
        ox: 0,
        oy: 0,
        width: ctx.canvas.width,
        height: ctx.canvas.height
    };

    let renderTarget = new ImageData(viewport.width, viewport.height);
    let numRays = viewport.width / 4;

    let rayWidth = (viewport.width / numRays) | 0;

    let sky: triplet = [0xa7, 0xed, 0xf3];
    sky = [220, 225, 255];

    const vw = viewport.width;
    const vh = viewport.height;
    const data = renderTarget.data;

    function putPar(color: triplet, ray: number, alt1: number, alt2: number) {
        let top = ((1 - alt2) * vh) | 0;
        let bottom = ((1 - alt1) * vh) | 0;

        for (let y = top; y < bottom; ++y) {
            let j = y * vw;
            for (let x = 0; x < rayWidth; ++x) {
                let i = j + ray * rayWidth + x;
                data[i * 4] = color[0];
                data[i * 4 + 1] = color[1];
                data[i * 4 + 2] = color[2];
                data[i * 4 + 3] = 255;
            }
        }
    }

    alt = Math.max(alt, sample1d(height, x, y) + 10)

    for (let i = 0; i < numRays; ++i) {
        let ylevel = 0;

        let a = ((azimuth - fov / 2) + (i + .5) * fov / numRays) * deg;

        let z = 1;
        let dz = 1;

        let tx = range * cos(a), ty = range * sin(a);

        while (z < k) {
            let q = z / k;
            let px = x + tx * q, py = y + ty * q;

            let h = sample1d(height, px, py);
            let d = q * range;

            let screenheight = 1300 * d * tan(vfov / 2 * deg) * 2;
            let screenfloor = alt - screenheight / 2;

            let onscreensize = h < screenfloor ? 0 : h > screenfloor + screenheight ? 1 : (h - screenfloor) / screenheight;

            if (onscreensize > ylevel) {
                let c = sample(color, px, py);

                if (onscreensize > 0) {
                    putPar(mix(c, sky, h / 255, q), i, ylevel, onscreensize)
                }

                ylevel = onscreensize;
            }

            z += dz;
            dz *= dq;
        }

        putPar(sky, i, ylevel, 1);
    }

    ctx.putImageData(renderTarget, viewport.ox, viewport.oy)
}

function mix(color: triplet, haze: triplet, ylevel: number, dist: number): triplet {
    let factor = Math.min(1, 1 - sig((ylevel - .05) * 10) + dist * dist);
    return [color[0] * (1 - factor) + factor * haze[0],
    color[1] * (1 - factor) + factor * haze[1],
    color[2] * (1 - factor) + factor * haze[2]
    ]
}

function sig(n: number) {
    return 1 / (1 + Math.exp(-n));
}

function sample1d(image: Heightmap, x: number, y: number): number {
    let i = (image.height * wrap(y)) | 0;
    let j = (image.width * wrap(x)) | 0;
    let k = i * image.width + j

    return image.data[k];
}

function sample(image: Heightmap, x: number, y: number): triplet {
    let i = (image.height * wrap(y)) | 0;
    let j = (image.width * wrap(x)) | 0;
    let k = (i * image.width + j) * 4;

    return [
        image.data[k],
        image.data[k + 1],
        image.data[k + 2]
    ];
}

function bind<T extends { [key in P]: number }, P extends keyof T>(inputs: T, map: [P, string, string][]) {
    let keymap: { [key: string]: [P & keyof T, number] } = {};

    for (let [prop, dec, inc] of map) {
        keymap[inc] = [prop, 1];
        keymap[dec] = [prop, -1];
    }

    addEventListener('keydown', (e) => {
        let prop = keymap[e.code];
        if (prop !== undefined) {
            (inputs as { [key in P]: number })[prop[0]] = prop[1];
            e.preventDefault();
        }
    });

    addEventListener('keyup', (e) => {
        let prop = keymap[e.code];
        if (prop !== undefined) {
            (inputs as { [key in P]: number })[prop[0]] = 0;
            e.preventDefault();
        }
    });
}
