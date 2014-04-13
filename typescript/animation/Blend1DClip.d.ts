///<reference path="Clip.d.ts" />
declare module qtek {

    export module animation {

        interface IBlend1DClipOption<T extends BlendClip> extends IClipOption {
            output?: T;
        }

        interface IBlend1DClipInputEntry<T extends BlendClip> {
            position: number;
            clip: T;
            offset: number;
        }

        export class Blend1DClip<T extends BlendClip> extends Clip {

            constructor(option?: IBlend1DClipOption<T>);

            output: T;

            inputs: IBlend1DClipInputEntry<T>[];

            position: number;

            addInput(position: number, inputClip: T, offset: number);
        }
    }
}