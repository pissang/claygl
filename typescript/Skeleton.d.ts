import { Base } from './core/Base';
import { Joint } from './Joint';
import { TrackClip } from './animation/TrackClip';


interface ISkeletonClipEntry {
    clip: TrackClip;
    maps: number[]
}

export class Skeleton extends Base {

    name: string;

    roots: Joint[];

    joints: Joint[];

    updateHierarchy(): void;

    updateJointMatrices(): void;

    updateMatricesSubArrays(): void;

    update(): void;

    getSubSkinMatrices(meshId: number, joints: number[]): Float32Array;

    addClip(clip: TrackClip, mapRule?: Object): number;

    removeClip(clip: TrackClip): void;

    removeClipsAll(): void;

    getClip(index: number): TrackClip;

    getClipNumber(): number;

    setPose(clipIndex: number): void;
}