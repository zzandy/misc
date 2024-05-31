import { fullscreenCanvas, ICanvasRenderingContext2D } from "../../lib/canvas";
import { loadImages } from "./image";
import { Loop } from "../../lib/loop";
import { Heightmap, Inertial, Inputs, Player, triplet, WorldState } from "./types";

// maps lifted from https://github.com/s-macke/VoxelSpace

const deg = Math.PI / 180;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;

let color: ImageData, height: Heightmap;
let maps = [
    "C1W.png",
    "C2W.png",
    "C3.png",
    "C4.png",
    "C5W.png",
    "C6.png",
    "C6W.png",
    "C7W.png",
    "C9W.png",
    "C10W.png",
    "C11.png",
    "C11W.png",
    "C13.png",
    "C14.png",
    "C15.png",
    "C15W.png",
    "C16.png",
    "C16W.png",
    "C17W.png",
    "C18.png",
    "C18W.png",
    "C19W.png",
    "C20W.png",
    "C21.png",
    "C21W.png",
    "C22W.png",
    "C24W.png",
    "C25.png",
    "C25W.png",
];
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
    let scale = 4;
    let draw = <OffscreenCanvasRenderingContext2D>(
        new OffscreenCanvas(ctx.canvas.width / scale, ctx.canvas.height / scale).getContext("2d")
    );
    if (draw == null) throw new Error("failed to get '2d' context");
    ctx.imageSmoothingEnabled = false;

    let drawimg = draw.getImageData(0, 0, draw.canvas.width, draw.canvas.height);

    let player = {
        x: 0.11,
        y: 0.133,
        azimuth: -122.84802576606054,
        alt: 55.93534841801423,
    };

    let movement = {
        heading: new Inertial(10, 2, 0.1, 5),
        velocity: new Inertial(100, 1, 0.1, 100000),
        altitude: new Inertial(10, 1, 0.1, 10),
    };

    let camera = {
        fov: 90,
        range: 0.5,
    };

    let inputs = {
        throttle: 0,
        steer: 0,
        alt: 0,
        nextMap: 0,
        debug: 0,
    };

    bind(inputs, [
        ["throttle", "KeyS", "KeyW"],
        ["steer", "KeyA", "KeyD"],
        ["alt", "ShiftLeft", "Space"],
        ["nextMap", "KeyN", "KeyM"],
        ["debug", "F3", "F3"],
    ]);

    return {
        ctx,
        draw,
        drawimg,
        color,
        height,
        player,
        camera,
        inputs,
        movement,
    };
}

function update(delta: number, state: WorldState): WorldState {
    let { movement, player, inputs } = state;

    debug = inputs.debug != 0;
    inputs.debug = 0;

    if (inputs.nextMap) {
        currentMap = (currentMap + maps.length + inputs.nextMap) % maps.length;
        loadImages(maps[currentMap]).then((res) => ([state.color, state.height] = res));

        inputs.nextMap = 0;
    }

    let velocity = movement.velocity.update(inputs.throttle);
    let heading = movement.heading.update(inputs.steer);
    let altitude = movement.altitude.update(inputs.alt);

    player.azimuth += heading;

    player.alt += altitude;

    if (altitude > 0) player.alt = Math.max(player.alt, sample1d(height, player.x, player.y) + 10);

    if (player.alt < 0) player.alt = 0;
    else if (player.alt > 300) player.alt = 300;

    player.x = wrap(player.x + velocity * Math.cos(player.azimuth * deg));
    player.y = wrap(player.y + velocity * Math.sin(player.azimuth * deg));
    if (debug) console.log(player);

    return state;
}

function wrap(v: number): number {
    while (v < 0) v += 1;
    while (v >= 1) v -= 1;
    return v;
}

function render(delta: number, state: WorldState) {
    let {
        ctx,
        draw,
        drawimg,
        player: { x, y, azimuth, alt },
        color,
        height,
        camera: { fov, range },
    } = state;

    let maxDepth = 600 * range;
    let dq = 1.001;
    let vfov = 70;

    let rayscale = 1;

    let viewport = {
        ox: 0,
        oy: 0,
        width: draw.canvas.width,
        height: draw.canvas.height,
    };

    let numRays = viewport.width / rayscale;

    let rayWidth = (viewport.width / numRays) | 0;

    let sky: triplet = [0xa7, 0xed, 0xf3];
    sky = [220, 225, 255];

    const vw = viewport.width;
    const vh = viewport.height;
    const data = drawimg.data;

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

    alt = Math.max(alt, sample1d(height, x, y) + 10);

    for (let i = 0; i < numRays; ++i) {
        let ylevel = 0;

        let a = (azimuth - fov / 2 + ((i + 0.5) * fov) / numRays) * deg;

        let depth = 1;
        let depthStep = 1;

        let tx = range * cos(a),
            ty = range * sin(a);

        while (depth < maxDepth) {
            let q = depth / maxDepth;
            let px = x + tx * q,
                py = y + ty * q;

            let h = sample1d(height, px, py);
            let d = q * range;

            let screenheight = 1300 * d * tan((vfov / 2) * deg) * 2;
            let screenfloor = alt - screenheight / 2;

            let onscreensize =
                h < screenfloor ? 0 : h > screenfloor + screenheight ? 1 : (h - screenfloor) / screenheight;

            if (onscreensize > ylevel) {
                let c = sample(color, px, py);

                if (onscreensize > 0) {
                    putPar(mix(c, sky, alt / 255, h / 255, q), i, ylevel, onscreensize);
                }

                ylevel = onscreensize;
            }

            depth += depthStep;
            depthStep *= dq;
        }

        putPar(sky, i, ylevel, 1);
    }

    draw.putImageData(drawimg, 0, 0);
    ctx.drawImage(draw.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
}

function mix(color: triplet, haze: triplet, alt: number, ylevel: number, dist: number): triplet {
    let low = 1 - ylevel;
    let factor = Math.min(1, dist * dist * dist + 0.7 * exp(low));
    return [
        color[0] * (1 - factor) + factor * haze[0],
        color[1] * (1 - factor) + factor * haze[1],
        color[2] * (1 - factor) + factor * haze[2],
    ];
}

function exp(x: number) {
    return Math.pow(x - 2, -6) - Math.pow(2, -6) * (1 - x);
}

function sig(n: number) {
    return 1 / (1 + Math.exp(-n));
}

function ease(x: number) {
    return x * x * x * (x * (6 * x - 15) + 10);
}

function sample1d(image: Heightmap, x: number, y: number): number {
    let i = (image.height * wrap(y)) | 0;
    let j = (image.width * wrap(x)) | 0;
    let k = i * image.width + j;

    return image.data[k];
}

function sample(image: Heightmap, x: number, y: number): triplet {
    let i = (image.height * wrap(y)) | 0;
    let j = (image.width * wrap(x)) | 0;
    let k = (i * image.width + j) * 4;

    return [image.data[k], image.data[k + 1], image.data[k + 2]];
}

function bind<T extends { [key in P]: number }, P extends keyof T>(inputs: T, map: [P, string, string][]) {
    let keymap: { [key: string]: [P & keyof T, number] } = {};

    for (let [prop, dec, inc] of map) {
        keymap[inc] = [prop, 1];
        keymap[dec] = [prop, -1];
    }

    addEventListener("keydown", (e) => {
        let prop = keymap[e.code];
        if (prop !== undefined) {
            (inputs as { [key in P]: number })[prop[0]] = prop[1];
            e.preventDefault();
        }
    });

    addEventListener("keyup", (e) => {
        let prop = keymap[e.code];
        if (prop !== undefined) {
            (inputs as { [key in P]: number })[prop[0]] = 0;
            e.preventDefault();
        }
    });
}
