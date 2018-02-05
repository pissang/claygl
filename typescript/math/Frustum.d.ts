import { BoundingBox } from './BoundingBox';
import { Vector3 } from './Vector3';
import { Matrix4 } from './Matrix4';
import { Plane } from './Plane';

export class Frustum {

    planes: Plane[];

    boundingBox: BoundingBox;

    vertices: Float32Array[];

    setFromProjection(projectionMatrix: Matrix4): void;

    getTransformedBoundingBox(bbox: BoundingBox, matrix: Matrix4): BoundingBox;
}