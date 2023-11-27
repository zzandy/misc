import { ICanvasRenderingContext2D } from "../../lib/canvas";
import { Map, Tile } from "./map";
import { Sprite, edgeIndex } from "./sprite";

export function renderMap(ctx: CanvasRenderingContext2D, map: Map, sprites: Sprite[], pups: Sprite[], texture: Sprite) {
    let ox = 10;
    let oy = 30;
    let sx = 20;
    let sy = 20;

    for (let i = 0; i < map.length; ++i) {
        for (let j = 0; j < map[i].length; ++j) {
            ctx.save();
            const left = j < 1 || map[i][j - 1] == Tile.Solid ? 1 : 0;
            const right = j > map[i].length - 2 || map[i][j + 1] == Tile.Solid ? 1 : 0;

            const top = i < 1 || map[i - 1][j] == Tile.Solid ? 1 : 0;
            const btm = i > map.length - 2 || map[i + 1][j] == Tile.Solid ? 1 : 0;

            // do this do anything?
            const tl = i < 1 || j < 1 || map[i - 1][j - 1] == Tile.Solid ? 1 : 0;
            const tr = i < 1 || j > map[i].length - 2 || map[i - 1][j + 1] == Tile.Solid ? 1 : 0;
            const bl = i > map.length - 2 || j < 1 || map[i + 1][j - 1] == Tile.Solid ? 1 : 0;
            const br = i > map.length - 2 || j > map[i].length - 2 || map[i +    1][j + 1] == Tile.Solid ? 1 : 0;

            if (map[i][j] != Tile.Solid) {
                sprites[edgeIndex(1, 1, top, left, tl)]?.draw(ctx, ox + sx * j, oy + sy * i);
                sprites[edgeIndex(1, 0, top, right, tr)]?.draw(ctx, ox + sx * j + sx / 2, oy + sy * i);
                sprites[edgeIndex(0, 1, btm, left, bl)]?.draw(ctx, ox + sx * j, oy + sy * i + sy / 2);
                sprites[edgeIndex(0, 0, btm, right, br)]?.draw(ctx, ox + sx * j + sx / 2, oy + sy * i + sy / 2);
                ctx.globalCompositeOperation = "darken";
                texture.draw(ctx, ox + sx * j, oy + sy * i);
                ctx.globalCompositeOperation = "source-over";
            }

            switch (map[i][j]) {
                case Tile.Solid:
                    //ctx.globalCompositeOperation = "darken";
                    texture.draw(ctx, ox + sx * j, oy + sy * i);
                    break;
                case Tile.Void:
                    break;
                case Tile.Geode:
                    pups[0].draw(ctx, ox + sx * j, oy + sy * i);
                    break;
                case Tile.Nugget:
                    pups[1].draw(ctx, ox + sx * j, oy + sy * i);
                    break;
            }

            ctx.restore();
        }
    }
}
