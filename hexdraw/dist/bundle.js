var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
System.register("lib/color", [], function (exports_1, context_1) {
    "use strict";
    var breaks;
    var __moduleName = context_1 && context_1.id;
    function hcy(h, c, y) {
        var r = .3;
        var g = .59;
        var b = .11;
        h %= 360;
        h /= 60;
        var k = (1 - Math.abs((h % 2) - 1));
        var K = h < 1 ? r + k * g
            : h < 2 ? g + k * r
                : h < 3 ? g + k * b
                    : h < 4 ? b + k * g
                        : h < 5 ? b + k * r
                            : r + k * b;
        var cmax = 1;
        if (y <= 0 || y >= 1)
            cmax = 0;
        else
            cmax *= K < y ? (y - 1) / (K - 1) : K > y ? y / K : 1;
        c = Math.min(c, cmax);
        var x = c * k;
        var rgb = h < 1 ? [c, x, 0]
            : h < 2 ? [x, c, 0]
                : h < 3 ? [0, c, x]
                    : h < 4 ? [0, x, c]
                        : h < 5 ? [x, 0, c]
                            : [c, 0, x];
        var m = y - (r * rgb[0] + g * rgb[1] + b * rgb[2]);
        return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
    }
    exports_1("hcy", hcy);
    function wheelHcy(h, c, y) {
        var _a;
        h %= 360;
        var h2 = h;
        var _b = [0, 0], s0 = _b[0], t0 = _b[1];
        for (var _i = 0, breaks_1 = breaks; _i < breaks_1.length; _i++) {
            var _c = breaks_1[_i], t = _c[0], s = _c[1];
            if (h < s) {
                h2 = t0 + (h - s0) * (t - t0) / (s - s0);
                break;
            }
            _a = [s, t], s0 = _a[0], t0 = _a[1];
        }
        return hcy(h2, c, y);
    }
    exports_1("wheelHcy", wheelHcy);
    function wheel2rgb(h, c, y, a) {
        if (a === void 0) { a = 1; }
        var rgbdata = wheelHcy(h, c, y);
        return tuple2rgb(rgbdata[0], rgbdata[1], rgbdata[2], a || 1);
    }
    exports_1("wheel2rgb", wheel2rgb);
    function tuple2rgb(r, g, b, a) {
        return 'rgba(' + (r * 255).toFixed(0) + ',' + (g * 255).toFixed(0) + ',' + (b * 255).toFixed(0) + ', ' + a + ')';
    }
    function hcy2rgb(h, c, y, a) {
        if (a === void 0) { a = 1; }
        var rgbdata = hcy(h, c, y);
        return tuple2rgb(rgbdata[0], rgbdata[1], rgbdata[2], a || 1);
    }
    exports_1("hcy2rgb", hcy2rgb);
    function rgbdata2rgb(t, a) {
        return tuple2rgb(t[0], t[1], t[2], a === undefined ? 1 : a);
    }
    exports_1("rgbdata2rgb", rgbdata2rgb);
    return {
        setters: [],
        execute: function () {
            breaks = [
                [39, 60],
                [60, 120],
                [120, 180],
                [240, 240],
                [290, 300],
                [360, 360]
            ];
        }
    };
});
System.register("lib/geometry", [], function (exports_2, context_2) {
    "use strict";
    var Point, Rect, Range;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [],
        execute: function () {
            Point = (function () {
                function Point(x, y) {
                    this.x = x;
                    this.y = y;
                }
                Point.prototype.times = function (a, b) {
                    if (typeof (a) === 'number')
                        return new Point(this.x * a, this.y * b);
                    return new Point(this.x * a.x, this.y * a.y);
                };
                Point.prototype.plus = function (a, b) {
                    if (typeof (a) === 'number')
                        return new Point(this.x + a, this.y + b);
                    return new Point(this.x + a.x, this.y + a.y);
                };
                return Point;
            }());
            exports_2("Point", Point);
            Rect = (function (_super) {
                __extends(Rect, _super);
                function Rect(x, y, w, h) {
                    var _this = _super.call(this, x, y) || this;
                    _this.w = w;
                    _this.h = h;
                    return _this;
                }
                Object.defineProperty(Rect.prototype, "horizontal", {
                    get: function () {
                        return new Range(this.x, this.w);
                    },
                    enumerable: false,
                    configurable: true
                });
                Object.defineProperty(Rect.prototype, "vertical", {
                    get: function () {
                        return new Range(this.y, this.h);
                    },
                    enumerable: false,
                    configurable: true
                });
                return Rect;
            }(Point));
            exports_2("Rect", Rect);
            Range = (function () {
                function Range(start, length) {
                    this.start = start;
                    this.length = length;
                }
                Object.defineProperty(Range.prototype, "end", {
                    get: function () {
                        return this.start + this.length;
                    },
                    enumerable: false,
                    configurable: true
                });
                return Range;
            }());
            exports_2("Range", Range);
        }
    };
});
System.register("lib/loop", [], function (exports_3, context_3) {
    "use strict";
    var Loop;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [],
        execute: function () {
            Loop = (function () {
                function Loop(fixedDelta, init, fixed, variable) {
                    this.fixedDelta = fixedDelta;
                    this.init = init;
                    this.fixed = fixed;
                    this.variable = variable;
                    this.isRunning = false;
                    this.fixedAccum = 0;
                }
                Loop.prototype.start = function () {
                    var _this = this;
                    if (this.isRunning)
                        return;
                    var state = this.init();
                    this.isRunning = true;
                    var time = 0;
                    var frame = function (ts) {
                        var force = time == 0;
                        var delta = force ? 0 : ts - time;
                        time = ts;
                        state = _this.update(delta, state, force);
                        if (_this.isRunning)
                            requestAnimationFrame(frame);
                    };
                    requestAnimationFrame(frame);
                };
                Loop.prototype.stop = function () {
                    this.isRunning = false;
                };
                Loop.prototype.update = function (delta, state, force) {
                    if (force === void 0) { force = false; }
                    var newState = state;
                    this.fixedAccum += delta;
                    var upd = false;
                    if (force) {
                        newState = this.fixed(this.fixedDelta, newState);
                        upd = true;
                    }
                    else
                        while (this.fixedAccum > this.fixedDelta) {
                            this.fixedAccum -= this.fixedDelta;
                            newState = this.fixed(this.fixedDelta, newState);
                            upd = true;
                        }
                    if (upd)
                        this.variable(delta, newState);
                    return newState;
                };
                return Loop;
            }());
            exports_3("Loop", Loop);
        }
    };
});
System.register("lib/canvas", [], function (exports_4, context_4) {
    "use strict";
    var getCanvas, fullscreenCanvas3d, sq32;
    var __moduleName = context_4 && context_4.id;
    function fullscreenCanvas(relative, noAlpha) {
        if (relative === void 0) { relative = false; }
        if (noAlpha === void 0) { noAlpha = false; }
        var can = getCanvas(relative);
        var ctx = can.getContext('2d', { alpha: !noAlpha });
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
            for (var i = 0; i < 5; ++i) {
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
    exports_4("fullscreenCanvas", fullscreenCanvas);
    return {
        setters: [],
        execute: function () {
            exports_4("getCanvas", getCanvas = function (isRelative) {
                if (isRelative === void 0) { isRelative = false; }
                var can = document.createElement('canvas');
                can.width = window.innerWidth;
                can.height = window.innerHeight;
                if (!isRelative) {
                    can.style.position = 'absolute';
                    can.style.top = '0';
                    can.style.left = '0';
                }
                return can;
            });
            exports_4("fullscreenCanvas3d", fullscreenCanvas3d = function (relative) {
                if (relative === void 0) { relative = false; }
                var can = getCanvas(relative);
                var gl = can.getContext('webgl');
                if (gl == null)
                    throw new Error('failed to get \'webgl\' context');
                document.body.appendChild(can);
                return gl;
            });
            sq32 = Math.sqrt(3) / 2;
        }
    };
});
System.register("hexdraw/src/palette", [], function (exports_5, context_5) {
    "use strict";
    var Palette;
    var __moduleName = context_5 && context_5.id;
    function rgb(color) {
        return '#' + color.map(function (c) { return c.toString(16).padStart(2, '0'); }).join('');
    }
    exports_5("rgb", rgb);
    return {
        setters: [],
        execute: function () {
            Palette = (function () {
                function Palette(bg, secondary, primary, accent) {
                    this.bg = bg;
                    this.secondary = secondary;
                    this.primary = primary;
                    this.accent = accent;
                }
                return Palette;
            }());
            exports_5("Palette", Palette);
        }
    };
});
System.register("hexdraw/src/sprite-renderer", [], function (exports_6, context_6) {
    "use strict";
    var stencil, h, w, getHexPos, Scaler, SpriteRenderer, max, min, med, getCornerColor;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [],
        execute: function () {
            stencil = ("" +
                ". . . . . . . ^ ^ ^ ^ . . . . . . . . . . . . .\n" +
                ". . . . . . ^ ^ ^ ^ ^ # # # # 7 7 . . . . . . .\n" +
                ". . . . . ^ ^ # # # # # # # # # 7 7 7 7 . . . .\n" +
                ". . . . # # # # # # # # # # # # # 7 7 7 . . . .\n" +
                ". . . # # # # # # # # # # # # # # # # 7 7 . . .\n" +
                ". . < # # # # # # # # # # # # # # # # # 7 . . .\n" +
                ". < < # # # # # # # # # # # # # # # # # # . . .\n" +
                "< < < # # # # # # # # # # # # # # # # # # # . .\n" +
                "< < # # # # # # # # # # # # # # # # # # # # . .\n" +
                ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
                ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
                ". < # # # # # # # # # # # # # # # # # # # # > .\n" +
                ". . # # # # # # # # # # # # # # # # # # # # > >\n" +
                ". . # # # # # # # # # # # # # # # # # # # > > >\n" +
                ". . . # # # # # # # # # # # # # # # # # # > > .\n" +
                ". . . L # # # # # # # # # # # # # # # # # > . .\n" +
                ". . . L L # # # # # # # # # # # # # # # # . . .\n" +
                ". . . . L L L # # # # # # # # # # # # # . . . .\n" +
                ". . . . L L L L # # # # # # # # # v v . . . . .\n" +
                ". . . . . . . L L # # # # v v v v v . . . . . .\n" +
                ". . . . . . . . . . . . . v v v v . . . . . . .")
                .split("\n")
                .map(function (row) {
                return row.split(" ").map(function (c) {
                    switch (c) {
                        case "#":
                            return 7;
                        case "^":
                            return 1;
                        case "7":
                            return 2;
                        case ">":
                            return 3;
                        case "v":
                            return 4;
                        case "L":
                            return 5;
                        case "<":
                            return 6;
                        default:
                            return 0;
                    }
                });
            });
            h = 21;
            w = 24;
            exports_6("getHexPos", getHexPos = function (i, j) { return [
                j * 20 - i * 4 - ((j / 2) | 0) * 4,
                i * 19 - (j % 2) * 5 + ((j / 2) | 0) * 9,
            ]; });
            Scaler = (function () {
                function Scaler(data, sx, sy) {
                    this.data = data;
                    this.sx = sx;
                    this.sy = sy;
                }
                Scaler.prototype.put = function (i, j, col) {
                    var data = this.data;
                    var sx = this.sx;
                    var sy = this.sy;
                    for (var si = 0; si < sy; ++si) {
                        for (var sj = 0; sj < sx; ++sj) {
                            var index = ((sy * i + si) * w * sx + sx * j + sj) * 4;
                            data[index] = col[0];
                            data[index + 1] = col[1];
                            data[index + 2] = col[2];
                            data[index + 3] = (col.length > 3 ? col[3] : 255);
                        }
                    }
                };
                return Scaler;
            }());
            SpriteRenderer = (function () {
                function SpriteRenderer(sx, sy) {
                    this.sx = sx;
                    this.sy = sy;
                }
                SpriteRenderer.prototype.render = function (coreValue, colorFn, adj) {
                    var _a = this, sx = _a.sx, sy = _a.sy;
                    var can = document.createElement("canvas");
                    can.width = w * sx;
                    can.height = h * sx;
                    var ctx = can.getContext("2d");
                    var id = ctx.createImageData(w * sx, h * sy);
                    var scaler = new Scaler(id.data, sx, sy);
                    for (var i = 0; i < h; ++i) {
                        for (var j = 0; j < w; ++j) {
                            var fragment = stencil[i][j];
                            if (fragment == 0)
                                continue;
                            var color = colorFn(fragment == 7 ? coreValue : getCornerColor(fragment, coreValue, adj));
                            scaler.put(i, j, color);
                        }
                    }
                    scaler.put(((w / 2) | 0) - 2, ((h / 2) | 0) + 1, colorFn(3));
                    ctx.putImageData(id, 0, 0);
                    return can;
                };
                return SpriteRenderer;
            }());
            exports_6("SpriteRenderer", SpriteRenderer);
            max = Math.max;
            min = Math.min;
            med = function (a, b, c) { return (a > b ? (b > c ? b : a > c ? c : a) : a > c ? a : b > c ? c : b); };
            getCornerColor = function (f, v, n) {
                return f === 1
                    ? med(v, n[0], n[5])
                    : f === 2
                        ? med(v, n[0], n[1])
                        : f === 3
                            ? med(v, n[1], n[2])
                            : f === 4
                                ? med(v, n[2], n[3])
                                : f === 5
                                    ? med(v, n[3], n[4])
                                    : f === 6
                                        ? med(v, n[4], n[5])
                                        : 0;
            };
        }
    };
});
System.register("hexdraw/src/world-renderer", ["hexdraw/src/palette", "hexdraw/src/sprite-renderer"], function (exports_7, context_7) {
    "use strict";
    var palette_1, sprite_renderer_1, WorldRenderer;
    var __moduleName = context_7 && context_7.id;
    return {
        setters: [
            function (palette_1_1) {
                palette_1 = palette_1_1;
            },
            function (sprite_renderer_1_1) {
                sprite_renderer_1 = sprite_renderer_1_1;
            }
        ],
        execute: function () {
            WorldRenderer = (function () {
                function WorldRenderer(ctx, background, ox, oy, sx, sy) {
                    this.ctx = ctx;
                    this.background = background;
                    this.ox = ox;
                    this.oy = oy;
                    this.sx = sx;
                    this.sy = sy;
                }
                WorldRenderer.prototype.render = function (i, j, sprite) {
                    var _a = sprite_renderer_1.getHexPos(i, j), hj = _a[0], hi = _a[1];
                    var _b = this, ox = _b.ox, oy = _b.oy, sx = _b.sx, sy = _b.sy;
                    this.ctx.drawImage(sprite, ox + hj * sx, oy + hi * sy);
                };
                WorldRenderer.prototype.clear = function () {
                    var ctx = this.ctx;
                    var can = ctx.canvas;
                    ctx.fillStyle = palette_1.rgb(this.background);
                    ctx.fillRect(0, 0, can.width, can.height);
                };
                return WorldRenderer;
            }());
            exports_7("WorldRenderer", WorldRenderer);
        }
    };
});
System.register("lib/util", [], function (exports_8, context_8) {
    "use strict";
    var __moduleName = context_8 && context_8.id;
    function rnd(min, max) {
        if (typeof max === 'number' && typeof min === 'number')
            return Math.floor(min + Math.random() * (max - min));
        if (typeof min === 'number')
            return Math.floor(min * Math.random());
        if (min instanceof Array)
            return min[Math.floor(min.length * Math.random())];
        return Math.random();
    }
    exports_8("rnd", rnd);
    function array(w, h, fn) {
        var res = [];
        for (var i = 0; i < h; ++i) {
            var row = [];
            for (var j = 0; j < w; ++j)
                row.push(fn(i, j));
            res.push(row);
        }
        return res;
    }
    exports_8("array", array);
    function shuffle(a) {
        var _a;
        for (var i = a.length - 1; i > 0; --i) {
            var idx = rnd(i + 1);
            _a = [a[idx], a[i]], a[i] = _a[0], a[idx] = _a[1];
        }
    }
    exports_8("shuffle", shuffle);
    return {
        setters: [],
        execute: function () {
        }
    };
});
System.register("hexdraw/src/world", ["lib/util"], function (exports_9, context_9) {
    "use strict";
    var util_1, Cell, World, collectAdjacency, isSolid, getAdj;
    var __moduleName = context_9 && context_9.id;
    return {
        setters: [
            function (util_1_1) {
                util_1 = util_1_1;
            }
        ],
        execute: function () {
            Cell = (function () {
                function Cell(value) {
                    this.value = value;
                    this.sprite = null;
                }
                return Cell;
            }());
            World = (function () {
                function World(w, h, palette, sr, wr) {
                    var _this = this;
                    this.w = w;
                    this.h = h;
                    this.palette = palette;
                    this.sr = sr;
                    this.wr = wr;
                    this.data = this.initMap();
                    window.addEventListener('click', function () {
                        _this.data = _this.initMap();
                        _this.render();
                    });
                }
                World.makeMap = function (w, h) {
                    return util_1.array(w, h, function (i, j) { return new Cell((j === 0 || j === w - 1 || (i === 0 && j % 2 === 1) || i === h - 1 && !!(j % 2)) ? 0 : Math.random() < .7 ? 1 : 0); });
                };
                World.pickRandomPair = function (data) {
                    var overflow = 0;
                    var h = data.length;
                    var w = data[0].length;
                    while (1) {
                        var i = util_1.rnd(h);
                        var j = util_1.rnd(w / 2);
                        var k = h - i - 1;
                        var l = w - j - 1;
                        if (i >= 0 && i < h && j >= 0 && j < w && k >= 0 && k < h && l >= 0 && l < w && data[i][j].value && data[k][l].value)
                            return [i, j, k, l];
                        if (++overflow > 100)
                            break;
                    }
                    throw new Error("Failed to place source and destination");
                };
                World.prototype.initMap = function () {
                    var _this = this;
                    var data = World.makeMap(this.w, this.h);
                    var _a = World.pickRandomPair(data), i = _a[0], j = _a[1], k = _a[2], l = _a[3];
                    data[i][j].value = 2;
                    data[k][l].value = 3;
                    for (var i_1 = 0; i_1 < this.h; ++i_1)
                        for (var j_1 = 0; j_1 < this.w; ++j_1) {
                            var cell = data[i_1][j_1];
                            var adjs = collectAdjacency(data, i_1, j_1);
                            cell.sprite = this.sr.render(cell.value, function (n) { return _this.getColor(n); }, adjs);
                        }
                    return data;
                };
                World.prototype.getColor = function (value) {
                    return value == 1
                        ? this.palette.secondary
                        : value == 2
                            ? this.palette.accent
                            : value == 3
                                ? this.palette.primary
                                : this.palette.bg;
                };
                World.prototype.render = function () {
                    this.wr.clear();
                    for (var i = 0; i < this.data.length; ++i)
                        for (var j = 0; j < this.data[i].length; ++j) {
                            var cell = this.data[i][j];
                            if (cell.sprite != null)
                                this.wr.render(i, j, cell.sprite);
                        }
                };
                return World;
            }());
            exports_9("World", World);
            collectAdjacency = function (data, i, j) {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return [
                    (_b = (_a = getAdj(data, 0, i, j)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0,
                    (_d = (_c = getAdj(data, 1, i, j)) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : 0,
                    (_f = (_e = getAdj(data, 2, i, j)) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : 0,
                    (_h = (_g = getAdj(data, 3, i, j)) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : 0,
                    (_k = (_j = getAdj(data, 4, i, j)) === null || _j === void 0 ? void 0 : _j.value) !== null && _k !== void 0 ? _k : 0,
                    (_m = (_l = getAdj(data, 5, i, j)) === null || _l === void 0 ? void 0 : _l.value) !== null && _m !== void 0 ? _m : 0
                ];
            };
            isSolid = function (adj, value) {
                return adj !== null && adj.value > 0 && adj.value >= value;
            };
            getAdj = function (data, n, i, j) {
                var ni = i, nj = j;
                switch (n) {
                    case 0:
                        ni -= 1;
                        break;
                    case 1:
                        ni -= j % 2 ? 1 : 0;
                        nj += 1;
                        break;
                    case 2:
                        ni += j % 2 ? 0 : 1;
                        nj += 1;
                        break;
                    case 3:
                        ni += 1;
                        break;
                    case 4:
                        ni += j % 2 ? 0 : 1;
                        nj -= 1;
                        break;
                    case 5:
                        ni -= j % 2 ? 1 : 0;
                        nj -= 1;
                        break;
                }
                return ni >= 0 && nj >= 0 && ni < data.length && nj < data[ni].length ? data[ni][nj] : null;
            };
        }
    };
});
System.register("hexdraw/src/main", ["lib/canvas", "hexdraw/src/sprite-renderer", "hexdraw/src/world-renderer", "hexdraw/src/world", "hexdraw/src/palette"], function (exports_10, context_10) {
    "use strict";
    var canvas_1, sprite_renderer_2, world_renderer_1, world_1, palette_2, main;
    var __moduleName = context_10 && context_10.id;
    return {
        setters: [
            function (canvas_1_1) {
                canvas_1 = canvas_1_1;
            },
            function (sprite_renderer_2_1) {
                sprite_renderer_2 = sprite_renderer_2_1;
            },
            function (world_renderer_1_1) {
                world_renderer_1 = world_renderer_1_1;
            },
            function (world_1_1) {
                world_1 = world_1_1;
            },
            function (palette_2_1) {
                palette_2 = palette_2_1;
            }
        ],
        execute: function () {
            exports_10("main", main = function () {
                var _a = [4, 2], sx = _a[0], sy = _a[1];
                var _b = [25, 15], w = _b[0], h = _b[1];
                var ctx = canvas_1.fullscreenCanvas();
                var _c = sprite_renderer_2.getHexPos(h / 2, w / 2), ox = _c[0], oy = _c[1];
                var palette = new palette_2.Palette([0x00, 0x36, 0x38], [0x05, 0x50, 0x52], [0x53, 0xB8, 0xBB], [0xF3, 0xF2, 0xC9]);
                var world = new world_1.World(w, h, palette, new sprite_renderer_2.SpriteRenderer(sx, sy), new world_renderer_1.WorldRenderer(ctx, palette.bg, (ctx.canvas.width / 2 - ox * sx) | 0, (ctx.canvas.height / 2 - oy * sy) | 0, sx, sy));
                world.render();
            });
        }
    };
});
//# sourceMappingURL=bundle.js.map