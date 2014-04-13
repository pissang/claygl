///<reference path="Clip.d.ts" />
declare module qtek {

    export module animation {

        interface IBlend1DClipOption<T extends BlendClip> extends IClipOption {
            output?: T;
        }

        interface IClipInputEntry<T extends BlendClip> {
            position: number;
            clip: T;
            offset: number;
        }

        export class Blend1DClip<T extends BlendClip> extends Clip {

            output: T;

            inputs: IClipInputEntry[];

            position: number;

            addInput(position: number, inputClip: T, offset: number);
        }
    }
}