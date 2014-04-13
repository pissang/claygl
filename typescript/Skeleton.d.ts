///<reference path="core/Base.d.ts" />
///<reference path="Joint.d.ts" />
///<reference path="animation/SkinningClip.d.ts" />
declare module qtek {

    interface ISkeletonClipEntry {
        clip: animation.SkinningClip;
        maps: number[]
    }

    export class Skeleton extends core.Base {

        name: string;

        roots: Joint[];

        joints: Joint[];

        updateHierarchy(): void;

        updateJointMatrices(): void;

        updateMatricesSubArrays(): void;

        update(): void;

        getSubSkinMatrices(meshId: number, joints: number[]): Float32Array;

        addClip(clip: animation.SkinningClip, mapRule?: Object): number;

        removeClip(clip: animation.SkinningClip): void;

        removeClipsAll(): void;

        getClip(index: number): animation.SkinningClip;

        getClipNumber(): number;

        setPose(clipIndex: number): void;
    }
}