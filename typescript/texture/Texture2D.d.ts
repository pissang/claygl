///<reference path="../Texture.d.ts" />
declare module qtek {

    export module texture {

        interface ITexture2DOption extends ITextureOption {
            image?: HTMLElement;
            pixels?: ArrayBufferView;
            mipmaps?: ArrayBufferView[];
        }

        export class Texture2D extends Texture {

            constructor(option?: ITexture2DOption);

            image: HTMLElement;

            pixels: ArrayBufferView;

            mipmaps: ArrayBufferView[];

            update(gl: WebGLRenderingContext): void;

            generateMipmap(gl: WebGLRenderingContext): void;

            isPowerOfTwo(): boolean;

            isRenderable(): boolean;

            bind(gl): boolean;

            unbind(gl): boolean;

            load(src: string): void;
        }
    }
}