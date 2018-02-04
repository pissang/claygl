import { Renderer } from '../Renderer';
import { Scene } from '../Scene';
import { Camera } from '../Camera';

interface IShadowMapOption {
    softShadow?: number;
    shadowBlur?: number;
    shadowCascade?: number;
    cascadeSplitLogFactor?: number;
}

export class ShadowMap {

    softShadow: number;

    shadowBlur: number;

    shadowCascade: number;

    cascadeSplitLogFactor: number;

    render(renderer: Renderer, scene: Scene, sceneCamera?: Camera): void;

    renderDebug(renderer: Renderer, size?: number): void;

    dispose(renderer: Renderer): void;

    static VSM: number;
    static PCF: number;
}