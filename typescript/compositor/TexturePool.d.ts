import { Texture2D, ITexture2DOption } from '../Texture2D'
import { Renderer } from '../Renderer';

export class TexturePool {
    get(parameters: ITexture2DOption): Texture;

    put(parameters: ITexture2DOption): void;

    clear(renderer: Renderer): void;
}