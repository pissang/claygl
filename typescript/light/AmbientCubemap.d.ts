import { Light, ILightOption } from '../Light';
import { Texture2D } from '../Texture2D';
import { TextureCube } from '../TextureCube';
import { Renderer } from '../Renderer';

interface IAmbientCubemapLightOption extends ILightOption {
    cubemap?: Texture2D|TextureCube;
}

export class AmbientCubemap extends Light {

    constructor(option?: IAmbientCubemapLightOption);

    type: 'AMBIENT_CUBEMAP_LIGHT';

    castShadow: false;

    cubemap: Texture2D|TextureCube;

    prefilter(renderer: Renderer, size?: number): void;
}