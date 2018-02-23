import { Clip, IClipOption } from './Clip';
import { SamplerTrack } from './SamplerTrack';

interface ITrackClipOption extends IClipOption {
    name?: string;
    tracks: SamplerTrack[]
}

export class TrackClip extends Clip {

    constructor(option?: ITrackClipOption);

    name: string;

    tracks: SamplerTrack[];

    addTrack(trackClip: SamplerTrack): void;

    getSubClip(starTime: number, endTime: number): void;

    blend1D(clip1: TrackClip, clip2: TrackClip): void;

    blend2D(clip1: TrackClip, clip2: TrackClip, clip3: TrackClip, f: number, g: number): void;

    additiveBlend(clip1: TrackClip, clip2: TrackClip): void;

    subtractiveBlend(clip1: TrackClip, clip2: TrackClip): void;

    copy(clip: TrackClip): void;
}