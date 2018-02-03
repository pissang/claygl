import { Node } from '../Node';
import { Vector3 } from '../math/Vector3';

interface IFreeControlOption {
    target?: Node;
    domElement?: HTMLElement;
    sensitivity?: number;
    speed?: number;
    up?: Vector3;
    verticalMoveLock?: boolean
}

export class FreeControl {

    constructor(option?: IFreeControlOption);

    target: Node;

    domElement: HTMLElement;

    sensitivity: number;

    speed: number;

    up: Vector3;

    verticalMoveLock: boolean;

    enable(): void;

    disable(): void;

    update(deltaTime: number): void;
}