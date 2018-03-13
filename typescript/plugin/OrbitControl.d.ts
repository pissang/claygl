import { Node } from '../Node';
import { Vector3 } from '../math/Vector3';
import { Timeline } from '../Timeline';
import { Base } from '../core/Base';

interface IOrbitControlOption {
    target?: Node;
    domElement?: HTMLElement;
    timeline?: Timeline;

    minDistance?: number;
    maxDistance?: number;

    minAlpha?: number;
    maxAlpha?: number;

    minBeta?: number;
    maxBeta?: number;

    autoRotate?: boolean;
    autoRotateAfterStill?: number;
    autoRotateDirection?: 'cw'|'ccw';
    autoRotateSpeed?: number;

    damping?: number;
    rotateSensitivity?: number;
    zoomSensitivity?: number;
    panSensitivity?: number;
}

export class OrbitControl extends Base {

    constructor(option?: IOrbitControlOption);

    target?: Node;
    domElement?: HTMLElement;
    timeline?: Timeline;

    minDistance?: number;
    maxDistance?: number;

    minAlpha?: number;
    maxAlpha?: number;

    minBeta?: number;
    maxBeta?: number;

    autoRotateAfterStill?: number;
    autoRotateDirection?: 'cw'|'ccw';
    autoRotateSpeed?: number;

    damping?: number;
    rotateSensitivity?: number;
    zoomSensitivity?: number;
    panSensitivity?: number

    init(): void;

    dispose(): void;

    getDistance(): number;
    setDistance(distance: number): void;

    getAlpha(): number;
    setAlpha(alpha: number): void;

    getBeta(): number;
    setBeta(beta: number): void;

    getCenter(): [number, number, number];
    setCenter(center: [number, number, number]): void;

    animateTo(opts: {
        distance?: number;
        alpha?: number;
        beta?: number;
        center?: [number, number, number];
        duration?: number;
        easing?: string|function;
        done?: () => void;
    });

    stopAllAnimation(): void;

    update(deltaTime: number): void;
}