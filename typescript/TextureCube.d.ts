import { Texture } from './Texture';

interface ITextureCubeImages {
    px: HTMLElement;
    py: HTMLElement;
    pz: HTMLElement;
    nx: HTMLElement;
    ny: HTMLElement;
    nz: HTMLElement;
}

interface ITextureCubePixels {
    px: ArrayBufferView;
    py: ArrayBufferView;
    pz: ArrayBufferView;
    nx: ArrayBufferView;
    ny: ArrayBufferView;
    nz: ArrayBufferView;
}

interface ITextureCubeImageSrc {
    px: string;
    py: string;
    pz: string;
    nx: string;
    ny: string;
    nz: string;
}

interface ITextureCubeOption extends ITextureOption {
    image?: ITextureCubeImages;
    pixels?: ITextureCubePixels
}

export class TextureCube extends Texture {

    constructor(option?: ITextureCubeOption);

    image: ITextureCubeImages;

    pixels: ITextureCubePixels;

    update(gl: WebGLRenderingContext): void;

    generateMipmap(gl: WebGLRenderingContext): void;

    isPowerOfTwo(): boolean;

    isRenderable(): boolean;

    bind(gl): boolean;

    unbind(gl): boolean;

    load(imageList: ITextureCubeImageSrc): void;

    once(name: "success", handler: (texture?: TextureCube) => any, context?: any): void;
    success(handler: (texture?: TextureCube) => any, context?: any): void;

    once(name: "error", handler: Function, context?: any): void;
    error(handler: Function, context?: any): void;

    once(name: string, handler: Function, context?: any): void;
}