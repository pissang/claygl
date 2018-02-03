import { Mesh } from '../Mesh';
import { Scene } from '../Scene';
import { TextureCube } from '../TextureCube';

interface ISkyboxOption {
    scene?: Scene;
}

export class Skybox extends Mesh {

    constructor(option?: ISkyboxOption);

    scene: Scene;

    setEnvironmentMap(envMap: TextureCube): void;

    getEnvironmentMap(): TextureCube;

    attachScene(scene: Scene): void;

    detachScene(): void;

    dispose(): void;
}