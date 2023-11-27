import { getCanvas, fullscreenCanvas } from "../../lib/canvas";

export function getContext(
    width: number,
    height: number,
    disableAlpha: boolean
) {
    let canvas = getCanvas();
    canvas.width = width;
    canvas.height = height;

    let ctx = canvas.getContext("2d", { alpha: !disableAlpha });
    if (ctx == null) throw new Error("Failed to get '2d' context");
    return ctx;
}

export function getFullscreenContext(disableAlpha: boolean) {
    let canvas = getCanvas();

    document.body.appendChild(canvas);
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    let ctx = canvas.getContext("2d", { alpha: !disableAlpha });
    if (ctx == null) throw new Error("Failed to get '2d' context");
    return ctx;
}
