import { Mesh } from '../Mesh';
import { Scene } from '../Scene';
import { TextureCube } from '../TextureCube';
import { Texture2D } from '../Texture2D';

interface ISkyboxOption {
    scene?: Scene;
    environmentMap?: TextureCube | Texture2D
}

export class Skybox extends Mesh {

    constructor(option?: ISkyboxOption);

    scene: Scene;

    setEnvironmentMap(envMap: TextureCube | Texture2D): void;

    getEnvironmentMap(): TextureCube | Texture2D;

    attachScene(scene: Scene): void;

    detachScene(): void;

    dispose(): void;
}