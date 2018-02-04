import { Vector3 } from './Vector3';
import { Plane } from './Plane';


export class Ray {

    constructor(origin: Vector3, direction: Vector3);
    constructor();

    intersectPlane(plane: Plane, out?: Vector3): Vector3;

    mirrorAgainstPlane(plane: Plane): void;

}