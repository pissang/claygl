import { Renderable } from './Renderable';
import { Skeleton } from './Skeleton';

import { Matrix4 } from './math/Matrix4';

export interface IMeshOption extends IRenderableOption {
    skeleton?: Skeleton;
    joints?: number[];
}

export class Mesh extends Renderable {

    constructor(option?: IMeshOption);

    joints: number[];

    skeleton: Skeleton;

    offsetMatrix: Matrix4;

    clone(): Mesh;

    // Enums
    static POINTS: number;
    static LINES: number;
    static LINE_LOOP: number;
    static LINE_STRIP: number;
    static TRIANGLES: number;
    static TRIANGLE_STRIP: number;
    static TRIANGLE_FAN: number;

    static BACK: number;
    static FRONT: number;
    static FRONT_AND_BACK: number;
    static CW: number;
    static CCW: number;
}