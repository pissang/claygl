import { Base } from './core/Base';
import { Clip } from './animation/Clip';

interface IStage {
    render: Function;
}

interface IAnimationOption {
    stage?: IStage;
}

interface IAnimationAnimateOption {
    loop?: boolean;
    getter?: (key: string) => any;
    setter?: (key: string, value: any) => any;
}

declare function easingFunc(percent: number) : number;

interface IAnimator<T> {

    when(time: number, props: Object, easing: string|easingFunc) : IAnimator<T>;

    then(time: number, props: Object, easing: string|easingFunc) : IAnimator<T>;

    during(callback: (target: T, percent: number)=> any): IAnimator<T>;

    start(): IAnimator<T>;
    start(easing: string|easingFunc): IAnimator<T>;
    start(easing: (percent: number) => number): IAnimator<T>;

    stop(): IAnimator<T>;

    delay(time: string): IAnimator<T>;

    done(callback: Function): IAnimator<T>;
}

export class Timeline extends clay.Base {

    constructor(option?: IAnimationOption);

    stage: IStage;

    addClip(clip: Clip): void;

    removeClip(clip: Clip): void;

    removeClipsAll(): void;

    update(): void;

    start(): void;

    stop(): void;

    animate<T>(target: T, options: IAnimationAnimateOption): IAnimator<T>;

    on(name: "frame", handler: (deltaTime?: number) => any, context?: any): void;
    on(name: string, handler: Function, context?: any): void;
}