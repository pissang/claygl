import { Clip } from './Clip';
import { SamplerTrack } from './SamplerTrack';

interface ISamplerClipOption extends IClipOption {
    name?: string;
    tracks: SamplerTrack[]
}

export class SamplerClip extends Clip {

    constructor(option?: ISamplerClipOption);

    name: string;

    tracks: SamplerTrack[];

    addTrack(jointClip: SamplerTrack): void;

    getSubClip(starTime: number, endTime: number): void;

    blend1D(clip1: SamplerClip, clip2: SamplerClip): void;

    blend2D(clip1: SamplerClip, clip2: SamplerClip, clip3: SamplerClip, f: number, g: number): void;

    additiveBlend(clip1: SamplerClip, clip2: SamplerClip): void;

    subtractiveBlend(clip1: SamplerClip, clip2: SamplerClip): void;

    copy(clip: SamplerClip): void;
}