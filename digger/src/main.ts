import { fullscreenCanvas, getCanvas } from "../../lib/canvas";
import { Rect } from "../../lib/geometry";
import { Loop } from "../../lib/loop";
import { getContext, getFullscreenContext } from "./canvas";
import { hex2rgb, Palette } from "./color";
import { Tile } from "./map";
import { array, shuffle } from "../../lib/util";
import { pick } from "./util";
import { edgeIndex, Sprite } from "./sprite";
import { fetchImage } from "./image";
import spriteAtlas from "./sprite-atlas";
import { rgbtuple } from "../../lib/color";
import { renderMap } from "./render";

// geodes fall and break producing gems
// there are tunnels

const width = 320;
const height = 240;

const scale = 5;

let x = 0,
    y = 0;
let cw = width * scale,
    ch = height * scale;

let screenAspect = window.innerWidth / window.innerHeight;
let viewAspect = width / height;

if (viewAspect > screenAspect) {
    ch = (width / screenAspect) | 0;
    y = ((ch - height) / 2) | 0;
} else {
    cw = (height * screenAspect) | 0;
    x = ((cw - width) / 2) | 0;
}

const view = new Rect(x, y, width, height);
const can = new Rect(0, 0, cw, ch);

const buf = getContext(width, height, true);

const bg = getFullscreenContext(true);
const fg = getFullscreenContext(false);

bg.imageSmoothingEnabled = false;
fg.imageSmoothingEnabled = false;

const n = 10;
const m = 13;

const probabilities: [number, Tile][] = [
    [20, Tile.Solid],
    [2, Tile.Geode],
    [1, Tile.Void],
    [3, Tile.Nugget],
];

let totalProb = probabilities.reduce((sum, [prob, _]) => sum + prob, 0);
probabilities.forEach((pair) => (pair[0] /= totalProb));

const map = array(n, m, (i, j) => {
    return pick(probabilities);
});

for (let i = 0; i < n - 1; ++i)
    for (let j = 0; j < m; ++j) {
        let c = map[i][j];
        let b = map[i + 1][j];

        if (b == Tile.Void && c != Tile.Solid && c != Tile.Void) map[i + 1][j] = Tile.Solid;
    }

let bgColors: Palette = <Palette>["#a52a2a", "#752a2a", "#a58a2a"].map(hex2rgb);
let geodeColors: Palette = <Palette>["#502C8D", "#504CaD", "#3DD9D8"].map(hex2rgb);
let nuggetColors: Palette = <Palette>["#A67C00", "#FFBF00", "#FFE878"].map(hex2rgb);
let gemColors: Palette = <Palette>["#3DD9D8", "#3D7988", "#AFF8CA"].map(hex2rgb);

const sprites: Sprite[] = [];
// powerups
let pups: Sprite[] = [];
let textures: Sprite[] = [];

fetchImage(spriteAtlas).then((data) => {
    let s = 10;

    const img = document.createElement("img");
    img.src = spriteAtlas;

    document.body.appendChild(img);

    sprites[edgeIndex(1, 1, 1, 1, 1)] = sprites[edgeIndex(1, 1, 1, 1, 0)] = new Sprite(data, 0, s, s, s);
    sprites[edgeIndex(1, 1, 1, 0, 1)] = sprites[edgeIndex(1, 0, 1, 0, 1)] = new Sprite(data, s, s, s, s);
    sprites[edgeIndex(1, 0, 1, 1, 1)] = sprites[edgeIndex(1, 0, 1, 1, 0)] = new Sprite(data, 2 * s, s, s, s);

    sprites[edgeIndex(1, 1, 0, 1, 1)] = sprites[edgeIndex(0, 1, 0, 1, 1)] = new Sprite(data, 0, 2 * s, s, s);
    sprites[edgeIndex(1, 0, 0, 1, 1)] = sprites[edgeIndex(0, 0, 0, 1, 1)] = new Sprite(data, 2 * s, 2 * s, s, s);

    sprites[edgeIndex(0, 1, 1, 1, 1)] = sprites[edgeIndex(0, 1, 1, 1, 0)] = new Sprite(data, 0, 3 * s, s, s);
    sprites[edgeIndex(0, 1, 1, 0, 1)] = sprites[edgeIndex(0, 0, 1, 0, 1)] = new Sprite(data, s, 3 * s, s, s);
    sprites[edgeIndex(0, 0, 1, 1, 1)] = sprites[edgeIndex(0, 0, 1, 1, 0)] = new Sprite(data, 2 * s, 3 * s, s, s);

    sprites[edgeIndex(0, 1, 1, 0, 0)] = new Sprite(data, 4 * s, 0, s, s);
    sprites[edgeIndex(0, 0, 1, 0, 0)] = new Sprite(data, 5 * s, 0, s, s);
    sprites[edgeIndex(1, 1, 1, 0, 0)] = new Sprite(data, 4 * s, s, s, s);
    sprites[edgeIndex(1, 0, 1, 0, 0)] = new Sprite(data, 5 * s, s, s, s);

    sprites[edgeIndex(1, 0, 0, 1, 0)] = new Sprite(data, 3 * s, 2 * s, s, s);
    sprites[edgeIndex(1, 1, 0, 1, 0)] = new Sprite(data, 4 * s, 2 * s, s, s);
    sprites[edgeIndex(0, 0, 0, 1, 0)] = new Sprite(data, 3 * s, 3 * s, s, s);
    sprites[edgeIndex(0, 1, 0, 1, 0)] = new Sprite(data, 4 * s, 3 * s, s, s);

    textures = [
        new Sprite(data, 5 * s, 2 * s, 2 * s, 2 * s, bgColors),
        new Sprite(data, 7 * s, 2 * s, 2 * s, 2 * s, bgColors),
        new Sprite(data, 9 * s, 2 * s, 2 * s, 2 * s, bgColors),
        new Sprite(data, 11 * s, 2 * s, 2 * s, 2 * s, bgColors),
    ];

    pups = [
        new Sprite(data, 7 * s, 0, 2 * s, 2 * s, geodeColors),
        new Sprite(data, 9 * s, 0, 2 * s, 2 * s, nuggetColors),
        new Sprite(data, 11 * s, 0, 2 * s, 2 * s, gemColors),
    ];

    renderMap(bg, map, sprites, pups, textures[0]);
    bg.drawImage(bg.canvas, 10, 30, m * 20, n * 20, 10, 30, scale * m * 20, scale * n * 20);
});

new Loop(1000 / 60, init, update, render);

function init() {}

function update() {}

function render() {}
