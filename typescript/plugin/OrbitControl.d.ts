import { Node } from '../Node';
import { Vector3 } from '../math/Vector3';

interface IOrbitControlOption {
    target?: Node;
    domElement?: HTMLElement;
    sensitivity?: number;
    origin?: Vector3;
    up?: Vector3;
    minDistance?: number;
    maxDistance?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
}

export class OrbitControl {

    constructor(option?: IOrbitControlOption);

    target: Node;

    domElement: HTMLElement;

    sensitivity: number;

    origin: Vector3;

    up: Vector3;

    minDistance: number;

    maxDistance: number;

    minPolarAngle: number;

    maxPolarAngle: number;

    enable(): void;

    disable(): void;

    update(deltaTime: number): void;
}