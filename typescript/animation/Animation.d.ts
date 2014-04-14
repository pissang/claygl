///<reference path="../core/Base" />
///<reference path="Clip" />
declare module qtek {

    export module animation {

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

        interface IAnimationDeferred<T> {

            when(time: number, props: Object) : IAnimationDeferred<T>;

            during(callback: (target: T, percent: number)=> any): IAnimationDeferred<T>;

            start(): IAnimationDeferred<T>;
            start(easing: string): IAnimationDeferred<T>;
            start(easing: (percent: number) => number): IAnimationDeferred<T>;

            stop(): IAnimationDeferred<T>;

            delay(time: string): IAnimationDeferred<T>;

            done(callback: Function): IAnimationDeferred<T>;
        }

        export class Animation extends qtek.core.Base {

            constructor(option?: IAnimationOption);

            stage: IStage;

            addClip(clip: Clip): void;

            removeClip(clip: Clip): void;

            removeClipsAll(): void;

            update(): void;

            start(): void;

            stop(): void;

            animate<T>(target: T, options: IAnimationAnimateOption): IAnimationDeferred<T>;

            on(name: "frame", handler: (deltaTime?: number) => any, context?: any): void;
            on(name: string, handler: Function, context?: any): void;
        }
    }
}