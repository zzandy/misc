import { getContext } from "./canvas";

export async function fetchImage(
    url: string
): Promise<CanvasRenderingContext2D> {
    return new Promise((resolve, reject) => {
        let img = new Image();

        img.setAttribute("crossOrigin", "anonymous");

        img.onload = function () {
            let ctx = getContext(img.width, img.height, false);

            if (ctx != null) {
                ctx.drawImage(img, 0, 0);
                resolve(ctx);
            } else reject("Failed to load image");
        };

        img.src = url;
    });
}
