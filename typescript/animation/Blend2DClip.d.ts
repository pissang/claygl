///<reference path="Clip.d.ts" />
///<referencc path="../math/Vector2.d.ts" />
declare module qtek {

    export module animation {

        interface IBlend2DClipOption<T extends BlendClip> extends IClipOption {
            output?: T;
        }

        interface IClipInputEntry<T extends BlendClip> {
            position: qtek.math.Vector2;
            clip: T;
            offset: number;
        }

        export class Blend2DClip<T extends BlendClip> extends Clip {

            output: T;

            inputs: IClipInputEntry[];

            position: number;

            addInput(position: qtek.math.Vector2, inputClip: T, offset: number);
        }
    }
}