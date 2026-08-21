import { HexStore } from "./store";
import { rnd } from "../../lib/util";

const sqrt = Math.sqrt;

export type Cell = {
    color: number,
    change: IChange | null,
    hasGem: boolean,
    powerup: 'bomb' | 'clock' | 'asterisk' | null
};

export type ScorePopup = {
    i: number,
    j: number,
    value: number,
    age: number
};

export type ParticleSource =
    | { kind: 'cell'; i: number; j: number }
    | { kind: 'ui'; name: 'color-indicator' | 'score' | 'timer-bar' | 'gem-bar' };

export type ParticleTarget = ParticleSource;

export type ParticlePayload =
    | { kind: 'burst-cell'; i: number; j: number }
    | { kind: 'double-score' }
    | { kind: 'add-time'; ms: number }
    | { kind: 'assign-powerup'; i: number; j: number; powerup: 'bomb' | 'clock' | 'asterisk' }
    | { kind: 'recolor'; i: number; j: number; color: number }
    | { kind: 'gem-credit'; i: number; j: number };

export type Particle = {
    source: ParticleSource;
    target: ParticleTarget;
    delay: number;
    t: number;
    duration: number;
    color: string;
    payload: ParticlePayload;
};

export type World = {
    size: number,
    numColors: number,
    cells: HexStore<Cell>,
    dragStart: [number, number] | null,
    dragDir: [number, number] | null,
    activatedColor: number | null,
    activatedColorCount: number,
    maxConsecutiveActivations: number,
    shufflePending: boolean,
    shuffleCheckDelay: number,
    shuffleCheckTimer: number,
    wiggleCell: [number, number] | null,
    wiggleTimer: number,
    wiggleDuration: number,
    wiggleHintInterval: number,
    colorBiasTimer: number,
    colorBiasActive: boolean,
    colorBiasColor: number,
    colorBiasFairDuration: number,
    colorBiasBiasedDuration: number,
    score: number,
    baseScoreMultiplier: number,
    multiplierBarPoints: number,
    multiplierBarLevel: number,
    multiplierDrainActive: boolean,
    multiplierDrainDelay: number,
    doubleScoreTimer: number,
    baseMatchScore: number,
    scorePerExtraStone: number,
    multiplierBarMax: number,
    multiplierBarPerStone: number,
    multiplierBarPerExtraStone: number,
    multiplierDrainRate: number,
    multiplierDrainDelayMs: number,
    multiplierLevelBonus: number,
    multiplierDrainRateMultiplier: number,
    timerActive: boolean,
    timerValue: number,
    timerMax: number,
    gameOver: boolean,
    gemChance: number,
    gemsPerMultiplierLevel: number,
    gemMultiplierBonus: number,
    gemsCollected: number,
    gemBarCount: number,
    gemMultiplierLevel: number,
    gemHistory: number[],
    clockPowerupTime: number,
    pendingColorEffect: number | null,
    scorePopups: ScorePopup[],
    scorePopupDuration: number,
    particles: Particle[],
    particleSpeed: number,
    particleMaxDuration: number
};

export interface IChange {
    phase: number;
}

export class Burst implements IChange {
    public phase: number = -sqrt(rnd(16) / 90);
}

export class Fall implements IChange {
    public phase: number = 0;
    constructor(public dropHeight: number) { }
}
