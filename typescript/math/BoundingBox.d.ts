import { Vector3 } from './Vector3';
import { Matrix4 } from './Matrix4';

export class BoundingBox {

    constructor(min: Vector3, max: Vector3);
    constructor();

    vertices: Float32Array[];

    updateFromVertices(vertices: number[][]): void;

    union(bbox: BoundingBox): void;

    intersectBoundingBox(bbox: BoundingBox): boolean;

    applyTransform(matrix: Matrix4): void;

    transformFrom(source: BoundingBox, matrix: Matrix4): void;

    applyProjection(matrix: Matrix4): void;

    updateVertices(): void;

    copy(bbox: BoundingBox): void;

    clone(): BoundingBox;
}