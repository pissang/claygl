import { Texture } from './Texture';
import { Renderer } from './Renderer';

export interface ITexture2DOption extends ITextureOption {
    image?: HTMLElement;
    pixels?: ArrayBufferView;
    mipmaps?: ArrayBufferView[];
    convertToPOT?: boolean;
}

export class Texture2D extends Texture {

    constructor(option?: ITexture2DOption);

    convertToPOT: boolean;

    image: HTMLElement;

    pixels: ArrayBufferView;

    mipmaps: ArrayBufferView[];

    generateMipmap(renderer: Renderer): void;

    isPowerOfTwo(): boolean;

    isRenderable(): boolean;

    bind(gl): boolean;

    unbind(gl): boolean;

    load(src: string): void;

    once(name: "success", handler: (texture?: Texture2D) => any, context?: any): void;
    success(handler: (texture?: Texture2D) => any, context?: any): void;

    once(name: "error", handler: Function, context?: any): void;
    error(handler: Function, context?: any): void;

    once(name: string, handler: Function, context?: any): void;
}
