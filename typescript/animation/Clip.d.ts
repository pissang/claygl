
export interface IClipOption {
    target?: any;
    life?: number;
    delay?: number;
    gap?: number;
    // boolean
    // number
    loop?: any;
    // TODO
    // string
    // (percent: number): number;
    easing?: any;
    onframe?: (target: any, schedule: number) => void;
    onrestart?: () => void;
    ondestroy?: () => void;
}

export class Clip {

    constructor(option?: IClipOption);

    gap: number;

    life: number;

    delay: number;

    setLoop(loop: number): void;
    setLoop(loop: boolean): void;

    setEasing(easing: string): void;
    setEasing(easing: (percent: number) => number): void;

    step(time: number): string;

    setTime(time: number): void;

    restart(): void;

    fire(eventType: string, arg: any): void;

}

export class BlendClip extends Clip {

    blend1D(c1: Clip, c2: Clip, w: number): void;

    blend2D(c1: Clip, c2: Clip, c3: Clip, f: number, g: number): void;

    additiveBlend(c1: Clip, c2: Clip): void;

    subtractiveBlend(c1: Clip, c2: Clip): void;
}