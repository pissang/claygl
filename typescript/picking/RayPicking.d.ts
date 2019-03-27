import Scene from '../Scene';
import { Camera } from '../Camera';
import { Renderer } from '../Renderer';
import { Vector3 } from '../math/index';
import { Node } from '../Node';

interface Intersection {
    point: Vector3;
    pointWorld: Vector3;
    target: Node;
    triangle: number[];
    triangleIndex: number;
    distance: number;
}

export class RayPicking {
    scene: Scene;
    camera: Camera;
    renderer: Renderer;

    pick(x: number, y: number, forcePickAll?: boolean): Intersection;
    pickAll(x: number, y: number, output: Array, forcePickAll?: boolean): Intersection[];
}
