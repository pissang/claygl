import { Mesh } from '../Mesh';
import { Scene } from '../Scene';
import { TextureCube } from '../TextureCube';

interface ISkydomeOption {
    scene?: Scene;
}

export class Skydome extends Mesh {

    constructor(option?: ISkydomeOption);

    scene: Scene;

    setEnvironmentMap(envMap: TextureCube): void;

    getEnvironmentMap(): TextureCube;

    attachScene(scene: Scene): void;

    detachScene(): void;

    dispose(): void;

}