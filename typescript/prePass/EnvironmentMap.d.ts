import { Base } from '../core/Base';
import { Vector3 } from '../math/Vector3';
import { Vector3 } from '../math/Vector3';
import { TextureCube } from '../TextureCube';
import { Renderer } from '../Renderer';
import { Scene } from '../Scene';


interface IEnvironmentMapOption {
    position?: Vector3;
    far?: number;
    near?: number;
    texture?: clay.texture.TextureCube;
}

export class EnvironmentMap extends Base {

    constructor(option?: IEnvironmentMapOption);

    position: Vector3;

    far: number;

    near: number;

    texture: texture.TextureCube;

    render(renderer: Renderer, scene: Scene, notUpdateScene?: boolean): void;

    dispose(gl: WebGLRenderingContext): void;
}