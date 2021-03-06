import { Point, Rect } from '../../../lib/geometry';
import { IDataWindow, IPlotData, ISeries, Break } from '../lib/plot-data';
import { StatGame, StatTeam, StatPlayer } from './viewer-model';

export interface IAggregator {
    logGame(g: StatGame): void;
    readonly window: IDataWindow;
    autobreak(): void;
}

abstract class Aggregator implements IAggregator {
    public readonly window: IDataWindow;

    private region: Rect = new Rect(NaN, NaN, 0, 0);

    protected readonly plot: IPlotData = { name: 'all', data: [] }
    protected readonly plotd: IPlotData = { name: 'def', data: [] }
    protected readonly ploto: IPlotData = { name: 'off', data: [] }

    private cc = -1;
    private colors = '#f44336;#3f51b5;#8bc34a;#607d8b;#ff5722;#00bcd4;#e91e63;#00b294;#03a9f4;#ffb900;#107c10'.split(';');
    private colormap: { [key: string]: string } = {};

    protected n: number = 0;
    private prev: Date | null = null;

    protected constructor(private readonly cutoff: Date, windowName: string) {
        const that = this;
        this.window = {
            name: windowName,
            get window() { return that.region },
            breaks: { x: [], y: [] },
            views: [this.plot, this.plotd, this.ploto]
        };
    }

    protected abstract logGameImpl(g: StatGame): void;

    public logGame(g: StatGame): void {
        if (this.prev == null || g.endDate.getDate() != this.prev.getDate()) {
            this.window.breaks.x.push(new Break(g.endDate.toString(), this.n + 1))
            this.n += 3;
        }
        else if (this.prev != null && g.endDate.getTime() - this.prev.getTime() > 30 * 60 * 1000) {
            this.window.breaks.x.push(new Break("", this.n + 1))
            this.n += 3;
        }

        this.prev = g.endDate;

        this.logGameImpl(g);

        ++this.n;
    }

    public autobreak(): void {
        const h = (((this.region.h + 15) / 10) | 0) * 10;
        const miny = ((this.region.y / 10) | 0) * 10;

        for (let i = 0; i <= h; i += 10) {
            this.window.breaks.y.push(new Break((miny + i).toString(), miny + i));
        }

        this.region = new Rect(this.region.x, miny, this.region.w, h);
    }

    protected accomodate(p: Point) {
        const r = this.region;

        let x = isNaN(r.x) ? p.x : r.x;
        let y = isNaN(r.y) ? p.y : r.y;
        let w = r.w;
        let h = r.h;

        if (p.x < x) {
            w += x - p.x;
            x = p.x;
        }
        if (p.x > x + w) {
            w += p.x - x - w;
        }

        if (p.y < y) {
            h += y - p.y;
            y = p.y;
        }
        if (p.y > y + h) {
            h += p.y - y - h;
        }

        this.region = new Rect(x, y, w, h);
    }

    protected postRating(name: string, date: Date, x: number, y: number, stream: IPlotData) {

        if (date.getTime() < this.cutoff.getTime())
            return;

        let series = stream.data.filter(s => s.name == name)[0];

        if (series == undefined) {
            series = { name: name, data: [], color: this.getColor(name) };
            stream.data.push(series);
        }

        const p = new Point(x, y);
        this.accomodate(p);
        series.data.unshift(p)
    }

    private getColor(key: string): string {
        if (!(key in this.colormap))
            this.colormap[key] = this.colors[this.cc = (this.cc + 1) % this.colors.length];

        return this.colormap[key];
    }
}

type numberMap = { [id: string]: number };

abstract class RatingAggregator extends Aggregator {
    private readonly ratings: numberMap = {};

    constructor(cutoff: Date, windowName: string) {
        super(cutoff, windowName);
    }

    protected logGameImpl(g: StatGame): void {
        this.logTeam(g.red, g.endDate);
        this.logTeam(g.blu, g.endDate);
    }

    private logTeam(t: StatTeam, date: Date): void {
        const r = this.getRating(t);

        this.ratings[t.defence.apiPlayer._id + '-' + t.offence.apiPlayer._id] = r;

        this.logPlayer(r, date, t.defence, true);
        this.logPlayer(r, date, t.offence, false);
    }

    private logPlayer(r: number, date: Date, p: StatPlayer, isDef: boolean) {
        const key = p.apiPlayer._id;
        const name = p.apiPlayer.firstName + ' ' + p.apiPlayer.lastName;

        const ratings = [];
        const subratings = [];

        for (const id in this.ratings) {
            const [defid, offid] = id.split('-');

            if (defid == p.apiPlayer._id || offid == p.apiPlayer._id)
                ratings.push(this.ratings[id]);

            if ((isDef && defid == p.apiPlayer._id) || (!isDef && offid == p.apiPlayer._id))
                subratings.push(this.ratings[id]);
        }

        const rall = avg(ratings);
        const rsub = avg(subratings);

        this.postRating(name, date, this.n, rall, this.plot);
        this.postRating(name, date, this.n, rsub, isDef ? this.plotd : this.ploto);

        return rall;
    }

    protected abstract getRating(t: StatTeam): number;
}

export class ScorewiseAggregator extends RatingAggregator {
    constructor(cutoff: Date) {
        super(cutoff, "Scorewise rating");
    }

    protected getRating(t: StatTeam): number {
        return t.ratings.scorewise.score;
    }
}

export class BinaryAggregator extends RatingAggregator {
    constructor(cutoff: Date) {
        super(cutoff, "Binary rating");
    }

    protected getRating(t: StatTeam): number {
        return t.ratings.binary.score;
    }
}

type record = { numGames: number, numWon: number };
type recordMap = { [id: string]: record };
type arrayMap = { [id: string]: number[] };

export class WinrateAggregator extends Aggregator {
    private readonly all: recordMap = {};
    private readonly off: recordMap = {};
    private readonly def: recordMap = {};

    constructor(cutoff: Date) {
        super(cutoff, 'Winrate');
    }

    protected logGameImpl(g: StatGame): void {
        this.log(g.endDate, g.red.defence, g.redScore > g.bluScore, [{ records: this.all, series: this.plot }, { records: this.def, series: this.plotd }]);
        this.log(g.endDate, g.red.offence, g.redScore > g.bluScore, [{ records: this.all, series: this.plot }, { records: this.off, series: this.ploto }]);
        this.log(g.endDate, g.blu.defence, g.redScore < g.bluScore, [{ records: this.all, series: this.plot }, { records: this.def, series: this.plotd }]);
        this.log(g.endDate, g.blu.offence, g.redScore < g.bluScore, [{ records: this.all, series: this.plot }, { records: this.off, series: this.ploto }]);
    }

    private log(date: Date, p: StatPlayer, won: boolean, recordTo: { records: recordMap, series: IPlotData }[]) {
        for (const record of recordTo) {
            const id = p.apiPlayer._id;
            if (!(id in record.records))
                record.records[id] = { numGames: 0, numWon: 0 };

            const r = record.records[id];
            r.numGames++;
            if (won)
                r.numWon++;
            const name = p.apiPlayer.firstName + ' ' + p.apiPlayer.lastName;

            this.postRating(name, date, this.n, 100 * r.numWon / r.numGames, record.series);
        }
    }
}

export class RecentWinrateAggregator extends Aggregator {
    private readonly all: arrayMap = {};
    private readonly off: arrayMap = {};
    private readonly def: arrayMap = {};

    constructor(cutoff: Date, private readonly nGames: number) {
        super(cutoff, `Winrate (${nGames})`);
    }

    protected logGameImpl(g: StatGame): void {
        this.log(g.endDate, g.red.defence, g.redScore > g.bluScore, [{ records: this.all, series: this.plot }, { records: this.def, series: this.plotd }]);
        this.log(g.endDate, g.red.offence, g.redScore > g.bluScore, [{ records: this.all, series: this.plot }, { records: this.off, series: this.ploto }]);
        this.log(g.endDate, g.blu.defence, g.redScore < g.bluScore, [{ records: this.all, series: this.plot }, { records: this.def, series: this.plotd }]);
        this.log(g.endDate, g.blu.offence, g.redScore < g.bluScore, [{ records: this.all, series: this.plot }, { records: this.off, series: this.ploto }]);
    }

    private log(date: Date, p: StatPlayer, won: boolean, recordTo: { records: arrayMap, series: IPlotData }[]) {
        for (const record of recordTo) {
            const id = p.apiPlayer._id;
            if (!(id in record.records))
                record.records[id] = [];

            const r: number[] = record.records[id];
            if (r.push(won ? 1 : 0) > this.nGames)
                r.shift();

            const name = p.apiPlayer.firstName + ' ' + p.apiPlayer.lastName;

            this.postRating(name, date, this.n, 100 * sum(r) / r.length, record.series);
        }
    }
}

const sum = (a: number[]): number => {
    return a.reduce((a, b) => a + b, 0);
}

const avg = (a: number[]): number => {
    return a.length == 0 ? NaN : sum(a) / a.length;
}
