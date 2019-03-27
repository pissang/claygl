import { Renderer } from '../Renderer';
import { Camera } from '../Camera';
import { Scene } from '../Scene';
import { Node } from '../Node';

export class PixelPicking {
    renderer: Renderer;
    downSampleRatio: number;
    width: number;
    height: number;
    lookupOffset: number;

    setPrecision(ratio: number): void;
    resize(width: number, height: number): void;
    update(scene: Scene, camera: Camera): void;
    pick(x: number, y: number): Node;
    dispose(renderer: Renderer): void;
}
