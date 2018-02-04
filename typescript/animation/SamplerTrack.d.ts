export class SamplerTrack {

    constructor();

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