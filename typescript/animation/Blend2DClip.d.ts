///<reference path="Clip.d.ts" />
///<referencc path="../math/Vector2.d.ts" />
declare module qtek {

    export module animation {

        interface IBlend2DClipOption<T extends BlendClip> extends IClipOption {
            output?: T;
        }

        interface IBlend2DClipInputEntry<T extends BlendClip> {
            position: math.Vector2;
            clip: T;
            offset: number;
        }

        export class Blend2DClip<T extends BlendClip> extends Clip {

            constructor(option?: IBlend2DClipOption<T>);

            output: T;

            inputs: IBlend2DClipInputEntry<T>[];

            position: number;

            addInput(position: math.Vector2, inputClip: T, offset: number);
        }
    }
}