import { Node, INodeOption } from './Node';
import { Vector2 } from './math/Vector2';
import { Ray } from './math/Ray';
import { Matrix4 } from './math/Matrix4';
import { Frustum } from './math/Frustum';
import { BoundingBox } from './math/BoundingBox';

export interface ICameraOption extends INodeOption {}

export class Camera extends Node {

    constructor(option?: ICameraOption);

    projectionMatrix: Matrix4;

    invProjectionMatrix: Matrix4;

    viewMatrix: Matrix4;

    frustum: Frustum;

    sceneBoundingBoxLastFrame: BoundingBox;

    updateProjectionMatrix(): void;

    castRay(ndc: Vector2, out?: Ray): Ray;
}