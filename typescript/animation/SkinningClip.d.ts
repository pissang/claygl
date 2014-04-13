///<reference path="Clip.d.ts" />
declare module qtek {

    export module animation {

        interface ISkinningClipOption extends IClipOption {
            name?: string;
        }

        interface IJointClip {
            position: Float32Array;
            rotation: Float32Array;
            scale: Float32Array;

            setTime(time: number);
        }

        export class SkinningClip extends Clip {

            constructor(option?: ISkinningClipOption);

            name: string;

            jointClips: IJointClip[];

            addJontClip(jointClip: IJointClip): void;

            getSubClip(starTime: number, endTime: number): void;

            blend1D(clip1: SkinningClip, clip2: SkinningClip): void;

            blend2D(clip1: SkinningClip, clip2: SkinningClip, clip3: SkinningClip, f: number, g: number): void;

            additiveBlend(clip1: SkinningClip, clip2: SkinningClip): void;

            subtractiveBlend(clip1: SkinningClip, clip2: SkinningClip): void;

            copy(clip: SkinningClip): void;
        }
    }
}