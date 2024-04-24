import { Heightmap } from "./types";

async function fetchImage(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        var img = new Image();
        img.setAttribute("crossOrigin", "anonymous");

        img.onload = function () {
            let can = canvas(img.width, img.height);
            let ctx = can.getContext("2d");
            if (ctx != null) {
                ctx.drawImage(img, 0, 0);
                resolve(ctx.getImageData(0, 0, can.width, can.height));
            } else reject("Failed to load " + url);
        };

        img.onerror = () => reject("Failed to load " + url);

        img.src = url;
    });
}

export async function loadImages(src: string): Promise<[ImageData, Heightmap]> {
    const base = "";
    const color = await fetchImage(base + src);
    return [
        color,
        readHeight(color.width, color.height, await fetchImage(base + src.replace(/C/, "D").replace(/W/, ""))),
    ];
}

function readHeight(targetWidth: number, targetHeight: number, data: ImageData): Heightmap {
    let res = {
        width: targetWidth,
        height: targetHeight,
        data: new Uint8ClampedArray(targetWidth * targetHeight),
    };

    // resize to match color map
    let canvasOriginal = canvas(data.width, data.height);
    let contextOriginal = canvasOriginal.getContext("2d") as CanvasRenderingContext2D;
    contextOriginal.putImageData(data, 0, 0);

    let canvasResized = canvas(targetWidth, targetHeight);

    let contextResized = canvasResized.getContext("2d") as CanvasRenderingContext2D;
    contextResized.drawImage(canvasOriginal, 0, 0, targetWidth, targetHeight);
    let resized = contextResized.getImageData(0, 0, targetWidth, targetHeight);

    for (let i = 0; i < res.data.length; ++i) {
        res.data[i] = resized.data[i * 4];
    }

    return res;
}

function canvas(width: number, height: number) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    return canvas;
}
