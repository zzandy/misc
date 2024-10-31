"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loop = void 0;
class Loop {
    constructor(fixedDelta, init, fixed, variable) {
        this.fixedDelta = fixedDelta;
        this.init = init;
        this.fixed = fixed;
        this.variable = variable;
        this.isRunning = false;
        this.fixedAccum = 0;
    }
    start() {
        if (this.isRunning)
            return;
        let state = this.init();
        this.isRunning = true;
        let time = 0;
        const frame = (ts) => {
            const force = time == 0;
            const delta = force ? 0 : ts - time;
            time = ts;
            state = this.update(delta, state, force);
            if (this.isRunning)
                requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    stop() {
        this.isRunning = false;
    }
    update(delta, state, force = false) {
        let newState = state;
        this.fixedAccum += delta;
        let upd = false;
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
    }
}
exports.Loop = Loop;
