import { Base } from './core/Base';


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

export class Texture extends Base {

    constructor(option?: ITextureOption);

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

    dirty(): void;

    nextHighestPowerOfTwo(x: number): number;

    dispose(gl: WebGLRenderingContext): void;

    /* DataType */
    static BYTE: number;
    static UNSIGNED_BYTE: number;
    static SHORT: number;
    static UNSIGNED_SHORT: number;
    static INT: number;
    static UNSIGNED_INT: number;
    static FLOAT: number;

    /* PixelFormat */
    static DEPTH_COMPONENT: number;
    static ALPHA: number;
    static RGB: number;
    static RGBA: number;
    static LUMINANCE: number;
    static LUMINANCE_ALPHA: number;

    /* Compressed Texture */
    static COMPRESSED_RGB_S3TC_DXT1_EXT: number;
    static COMPRESSED_RGBA_S3TC_DXT1_EXT: number;
    static COMPRESSED_RGBA_S3TC_DXT3_EXT: number;
    static COMPRESSED_RGBA_S3TC_DXT5_EXT: number;

    /* TextureMagFilter */
    static NEAREST: number;
    static LINEAR: number;

    /* TextureMinFilter */
    /*      NEAREST */
    /*      LINEAR */
    static NEAREST_MIPMAP_NEAREST: number;
    static LINEAR_MIPMAP_NEAREST: number;
    static NEAREST_MIPMAP_LINEAR: number;
    static LINEAR_MIPMAP_LINEAR: number;

    /* TextureParameterName */
    static TEXTURE_MAG_FILTER: number;
    static TEXTURE_MIN_FILTER: number;

    /* TextureWrapMode */
    static REPEAT: number;
    static CLAMP_TO_EDGE: number;
    static MIRRORED_REPEAT: number;

}