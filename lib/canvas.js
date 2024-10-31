"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fullscreenCanvas = exports.fullscreenCanvas3d = exports.getCanvas = void 0;
const getCanvas = (isRelative = false) => {
    const can = document.createElement('canvas');
    can.width = window.innerWidth;
    can.height = window.innerHeight;
    if (!isRelative) {
        can.style.position = 'absolute';
        can.style.top = '0';
        can.style.left = '0';
    }
    return can;
};
exports.getCanvas = getCanvas;
const fullscreenCanvas3d = (relative = false) => {
    const can = (0, exports.getCanvas)(relative);
    const gl = can.getContext('webgl');
    if (gl == null)
        throw new Error('failed to get \'webgl\' context');
    document.body.appendChild(can);
    return gl;
};
exports.fullscreenCanvas3d = fullscreenCanvas3d;
function fullscreenCanvas(relative = false, noAlpha = false) {
    const can = (0, exports.getCanvas)(relative);
    const ctx = can.getContext('2d', { alpha: !noAlpha });
    if (ctx == null)
        throw new Error('failed to get \'2d\' context');
    ctx.clear = function () {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return ctx;
    };
    ctx.makePath = function (vertices) {
        ctx.beginPath();
        ctx.moveTo(vertices[0], vertices[1]);
        for (var i = 2; i < vertices.length; i += 2) {
            ctx.lineTo(vertices[i], vertices[i + 1]);
        }
        ctx.closePath();
        return ctx;
    };
    ctx.strokeCircle = function (x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.stroke();
        return ctx;
    };
    ctx.fillCircle = function (x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();
        return ctx;
    };
    ctx.fillHex = function (x, y, r) {
        ctx.beginPath();
        ctx.save();
        ctx.translate(x, y);
        ctx.moveTo(r / sq32, 0);
        for (let i = 0; i < 5; ++i) {
            ctx.rotate(Math.PI / 3);
            ctx.lineTo(r / sq32, 0);
        }
        ctx.restore();
        ctx.closePath();
        ctx.fill();
        return ctx;
    };
    document.body.style.overflow = 'hidden';
    document.body.appendChild(can);
    return ctx;
}
exports.fullscreenCanvas = fullscreenCanvas;
const sq32 = Math.sqrt(3) / 2;
