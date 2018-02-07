import { Compositor } from './compositor/Compositor';
import { Scene } from './Scene';
import { Camera } from './Camera';

export function createCompositor(json: object, opts: {
    scene?: Scene,
    camera?: Camera,
    textureRootPath?: string
}): Compositor;