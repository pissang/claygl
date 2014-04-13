///<reference path="core/Base.d.ts" />
///<reference path="core/Cache.d.ts" />
declare module qtek {

    interface ITextureOption {
        width?: number;
        height?: number;
        type?: number;
        format?: number;
        wrapS?: number;
        wrapT?: number;
        minFilter?: number;
        magFilter?: number;
        useMipmap?: boolean;
        anisotropic?: number;
        flipY?: boolean;
        unpackAlignment?: number;
        premultiplyAlpha?: boolean;
        dynamic?: boolean;
    }

    export class Texture extends core.Base {

        constructor(option?: ITextureOption);

        cache: core.Cache;

        width: number;

        height: number;

        type: number;

        format: number;

        wrapS: number;

        wrapT: number;

        minFilter: number;

        magFilter: number;

        useMipmap: boolean;

        anisotropic: number;

        flipY: boolean;

        unpackAlignment: number;

        premultiplyAlpha: boolean;

        dynamic: boolean;

        NPOT: boolean;

        getWebGLTexture(gl: WebGLRenderingContext): WebGLTexture;

        dirty(): void;

        beforeUpdate(): void;

        fallBack(): void;

        nextHighestPowerOfTwo(x: number): number;

        dispose(gl: WebGLRenderingContext): void;
    }
}