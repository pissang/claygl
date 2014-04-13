///<reference path="Clip.d.ts" />
declare module qtek {

    export module animation {

        interface ITransformClipOption extends IClipOption {
            name?: string;
        }

        interface ITransformKeyFrame {
            time: number;
            position?: Float32Array;
            rotation?: Float32Array;
            scale?: Float32Array;
        }

        export class TransformClip extends BlendClip {

            constructor(option?: ITransformClipOption);

            name: string;

            keyFrames: ITransformKeyFrame[];

            position: Float32Array;

            rotation: Float32Array;
            
            scale: Float32Array;

            addKeyFrame(kf: ITransformKeyFrame): void;

            addKeyFrames(kfs: ITransformKeyFrame[]): void;
        }
    }
}