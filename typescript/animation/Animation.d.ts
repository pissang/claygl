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

        interface IAnimationOption {
            loop?: boolean;
            getter?: (key: string) => any;
            setter?: (key: string, value: any) => any;
        }

        interface IAnimationDeferred<T> {

            when(time: number, props: object) : IAnimationDeferred;

            during(callback: (target: T, percent: number)): IAnimationDeferred;

            start(): IAnimationDeferred;
            start(easing: string): IAnimationDeferred;
            start(easing: (percent: number) => number): IAnimationDeferred;

            stop(): IAnimationDeferred;

            delay(time: string): IAnimationDeferred;

            done(callback: Function): IAnimationDeferred;
        }

        export class Animation extends qtek.core.Base {

            constructor(stage?: IStage);

            stage: IStage;

            addClip(clip: Clip): void;

            removeClip(clip: Clip): void;

            removeClipsAll(): void;

            update(): void;

            start(): void;

            stop(): void;

            animate<T>(target: T, options: IAnimationOption): IAnimationDeferred<T>;
        }
    }
}