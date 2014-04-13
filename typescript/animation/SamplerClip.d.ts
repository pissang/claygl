///<reference path="Clip.d.ts" />
declare module qtek {

    export module animation {

        interface ISamplerClipOption extends IClipOption {
            name?: string;
        }

        export class SamplerClip extends Clip {

            constructor(option?: ISamplerClipOption);

            name: string;

            position: Float32Array;
            
            rotation: Float32Array;

            scale: Float32Array;

            channels: {
                time: Float32Array;
                position: Float32Array;
                rotation: Float32Array;
                scale: Float32Array;
            }

            getSubClip(startTime: number, endTime: number): SamplerClip;
        }
    }
}