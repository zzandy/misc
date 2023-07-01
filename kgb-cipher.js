var Random = /** @class */ (function () {
    function Random(seed) {
        if (seed === void 0) { seed = Date.now(); }
        this.seed = seed;
    }
    Random.prototype.Next = function () {
        return this.seed = +('0.' + Math.sin(this.seed).toString().substr(6));
    };
    Random.prototype.iNext = function (min, max) {
        return (min + (max - min) * this.Next()) | 0;
    };
    Random.prototype.Shuffle = function (array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = this.iNext(0, currentIndex);
            currentIndex -= 1;
            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    };
    return Random;
}());
// implementation of a VIC cipher
var KgbCipher = /** @class */ (function () {
    function KgbCipher() {
    }
    KgbCipher.prototype.Encode = function (plaintext) {
        plaintext = plaintext
            .replace(/j/gi, 'i')
            .toLocaleLowerCase();
        var rnd = new Random();
        var _a = [rnd.iNext(10000, 100000), rnd.iNext(10000, 100000)], seed1 = _a[0], seed2 = _a[1];
        var _b = this.GetCodeTable(seed1, seed2), columns = _b[0], toprow = _b[1], rest = _b[2];
        this.log(columns, toprow, rest);
        var res = [];
        var adj = -1;
        var push = function (c) {
            if (++adj >= 5) {
                adj = 0;
                res.push(' ');
            }
            res.push(c);
        };
        (seed1.toString() + seed2.toString()).split('').map(push);
        var p = 0;
        var find = function (str, symbols) {
            var aggfn = function (agg, sym, i) {
                if (sym.includes('/')) {
                    for (var _i = 0, _a = sym.split('/'); _i < _a.length; _i++) {
                        var s = _a[_i];
                        if (s.length > agg.len && str.startsWith(s))
                            return { idx: i, len: s.length };
                    }
                }
                else if (sym.length > agg.len && str.startsWith(sym))
                    return { idx: i, len: sym.length };
                return agg;
            };
            return symbols.reduce(aggfn, { idx: -1, len: -Infinity }).idx;
        };
        var data = toprow.concat(rest);
        var blank = data.indexOf('.');
        while (p < plaintext.length) {
            var slice = plaintext.slice(p);
            var idx = find(slice, data);
            if (idx == -1)
                idx = blank;
            if (idx < 9) {
                push(columns[idx]);
                p += toprow[idx].includes('/') ? 1 : toprow[idx].length;
            }
            else {
                push(columns[9 + ((idx - 9) / 12) | 0]);
                push(columns[(idx - 9) % 12]);
                p += data[idx].includes('/') ? 1 : data[idx].length;
            }
        }
        return res.join('');
    };
    KgbCipher.prototype.log = function (columns, toprow, rest) {
        var w = columns.length;
        var nice = function (str) { return str.replace(/\//g, '').replace(' ', '␣'); };
        var widhts = columns.map(function (_, i) { return Math.max(i < toprow.length ? nice(toprow[i]).length : 0, nice(rest[i]).length, nice(rest[i + w]).length, nice(rest[i + w * 2]).length); });
        var align = function (str, i) { return nice(str).padEnd(widhts[i]); };
        var bright = "\x1b[1m";
        var reset = "\x1b[0m";
        console.log(bright + '  ' + columns.map(align).join(' ') + reset);
        console.log('  ' + toprow.map(align).join(' '));
        console.log(bright + columns[9] + reset + ' ' + rest.slice(0, w).map(align).join(' '));
        console.log(bright + columns[10] + reset + ' ' + rest.slice(w, w * 2).map(align).join(' '));
        console.log(bright + columns[11] + reset + ' ' + rest.slice(w * 2, w * 3).map(align).join(' '));
    };
    KgbCipher.prototype.Decode = function (ciphertext) {
        ciphertext = ciphertext.replace(/ /g, '');
        var seed1 = +ciphertext.substr(0, 5);
        var seed2 = +ciphertext.substr(5, 5);
        var _a = this.GetCodeTable(seed1, seed2), columns = _a[0], toprow = _a[1], rest = _a[2];
        var res = [];
        var i = 9;
        var nice = function (str) { return str.includes('/')
            ? str.split('/')[0]
            : str; };
        while (++i < ciphertext.length) {
            var col = columns.indexOf(ciphertext[i]);
            if (col < 9) {
                res.push(nice(toprow[col]));
            }
            else {
                var row = col - 9;
                col = columns.indexOf(ciphertext[++i]);
                res.push(nice(rest[row * 12 + col]));
            }
        }
        return res.join('');
    };
    KgbCipher.prototype.GetCodeTable = function (seed1, seed2) {
        var rnd1 = new Random(seed1);
        var rnd2 = new Random(seed2);
        var chars = '1234567890AB'.split('');
        var columns = rnd1.Shuffle(chars).slice(0, 12);
        var top = 21;
        var firstRow = columns.length - 3;
        var symbols = alphabeth();
        var high = symbols.slice(0, top);
        rnd1.Shuffle(high);
        var toprow = high.slice(0, firstRow);
        var rest = rnd2.Shuffle(symbols.slice(top).concat(high.slice(firstRow)));
        rnd2.Shuffle(columns);
        return [columns, toprow, rest];
    };
    return KgbCipher;
}());
var cipher = new KgbCipher();
cycle("beaver accends the perforce. render sausages");
cycle("He learned the important lesson that a picnic at the beach on a windy day is a bad idea.");
cycle("Call me 345-67-89 at 12:20");
cycle("Queen's kestrel jumps at the zebra with the xander root xylophone");
function cycle(message) {
    var ciphertext = cipher.Encode(message);
    console.log(message);
    console.log(ciphertext);
    var decoded = cipher.Decode(ciphertext);
    console.log(decoded);
}
function alphabeth() {
    return [
        /*1.*/ 'o' //7.79%
        /*2.*/ ,
        'e' //7.26%
        /*3.*/ ,
        's' //7.23%
        /*4.*/ ,
        'a' //7.06%
        /*5.*/ ,
        't' //6.15%
        /*6.*/ ,
        'i' //4.88%
        /*7.*/ ,
        'l' //4.66%
        /*8.*/ ,
        'h' //4.22%
        /*9.*/ ,
        'r' //4.05%
        /*10.*/ ,
        'n' //3.61%
        /*11.*/ ,
        'u' //3.30%
        /*12.*/ ,
        'm' //3.13%
        /*13.*/ ,
        'd' //3.13%
        /*14.*/ ,
        'w' //2.79%
        /*15.*/ ,
        'c' //2.76%
        /*16.*/ ,
        'f' //2.57%
        /*17.*/ ,
        'g' //2.49%
        /*18.*/ ,
        'y' //2.47%
        /*19.*/ ,
        'in' //2.18%
        /*20.*/ ,
        'p' //2.03%
        /*21.*/ ,
        'the' //1.98%
        /*22.*/ ,
        'b' //1.81%
        /*23.*/ ,
        'er' //1.40%
        /*24.*/ ,
        're' //1.35%
        /*25.*/ ,
        'he' //1.29%
        /*26.*/ ,
        'at' //1.26%
        /*27.*/ ,
        'on' //1.23%
        /*28.*/ ,
        'v' //1.14%
        /*29.*/ ,
        'it' //1.09%
        /*30.*/ ,
        'and' //1.08%
        /*31.*/ ,
        'k' //1.02%
        /*32.*/ ,
        'q/x/z' // 0.52%
        ,
        '.', ' ', ',',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];
}
