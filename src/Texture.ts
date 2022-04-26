/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
import glenum from './core/glenum';
import ClayCache from './core/Cache';
import Notifier from './core/Notifier';
import Renderer from './Renderer';
import { isPowerOfTwo } from './math/util';
import { GLEnum } from './core/type';

export type TextureImageSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
export type TexturePixelSource = Uint8Array | Float32Array;

export interface TextureOpts {
  /**
   * Texture width, readonly when the texture source is image
   */
  width: number;
  /**
   * Texture height, readonly when the texture source is image
   */
  height: number;
  /**
   * Texel data type.
   * Possible values:
   *  + {@link clay.Texture.UNSIGNED_BYTE}
   *  + {@link clay.Texture.HALF_FLOAT}
   *  + {@link clay.Texture.FLOAT}
   *  + {@link clay.Texture.UNSIGNED_INT_24_8_WEBGL}
   *  + {@link clay.Texture.UNSIGNED_INT}
   */
  type: GLEnum;
  /**
   * Format of texel data
   * Possible values:
   *  + {@link clay.Texture.RGBA}
   *  + {@link clay.Texture.DEPTH_COMPONENT}
   *  + {@link clay.Texture.DEPTH_STENCIL}
   */
  format: GLEnum;
  /**
   * Texture wrap. Default to be REPEAT.
   * Possible values:
   *  + {@link clay.Texture.CLAMP_TO_EDGE}
   *  + {@link clay.Texture.REPEAT}
   *  + {@link clay.Texture.MIRRORED_REPEAT}
   */
  wrapS: GLEnum;
  /**
   * Texture wrap. Default to be REPEAT.
   * Possible values:
   *  + {@link clay.Texture.CLAMP_TO_EDGE}
   *  + {@link clay.Texture.REPEAT}
   *  + {@link clay.Texture.MIRRORED_REPEAT}
   */
  wrapT: GLEnum;
  /**
   * Possible values:
   *  + {@link clay.Texture.NEAREST}
   *  + {@link clay.Texture.LINEAR}
   *  + {@link clay.Texture.NEAREST_MIPMAP_NEAREST}
   *  + {@link clay.Texture.LINEAR_MIPMAP_NEAREST}
   *  + {@link clay.Texture.NEAREST_MIPMAP_LINEAR}
   *  + {@link clay.Texture.LINEAR_MIPMAP_LINEAR}
   */
  minFilter: GLEnum;
  /**
   * Possible values:
   *  + {@link clay.Texture.NEAREST}
   *  + {@link clay.Texture.LINEAR}
   */
  magFilter: GLEnum;
  /**
   * If enable mimap.
   */
  useMipmap: boolean;

  /**
   * Anisotropic filtering, enabled if value is larger than 1
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic
   */
  anisotropic: number;
  // pixelStorei parameters, not available when texture is used as render target
  // http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml
  /**
   * If flip in y axis for given image source
   */
  flipY: boolean;

  /**
   * A flag to indicate if texture source is sRGB
   */
  sRGB: boolean;
  /**
   * Unpack alignment
   */
  unpackAlignment: 4;
  /**
   * Premultiply alpha
   */
  premultiplyAlpha: boolean;

  /**
   * Dynamic option for texture like video
   */
  dynamic: boolean;

  NPOT: boolean;
}
interface Texture extends Omit<TextureOpts, 'width' | 'height'> {}
class Texture extends Notifier {
  protected _cache = new ClayCache();
  protected _width: number = 512;
  protected _height: number = 512;

  textureType: string = '';

  constructor(opts?: Partial<TextureOpts>) {
    super();

    Object.assign(this, opts);
  }

  get width() {
    return this._width;
  }
  set width(value: number) {
    this._width = value;
  }
  get height() {
    return this._height;
  }
  set height(value: number) {
    this._height = value;
  }

  getWebGLTexture(renderer: Renderer) {
    const _gl = renderer.gl;
    const cache = this._cache;
    cache.use(renderer.__uid__);

    if (cache.miss('webgl_texture')) {
      // In a new gl context, create new texture and set dirty true
      cache.put('webgl_texture', _gl.createTexture());
    }
    if (this.dynamic) {
      this.update(renderer);
    } else if (cache.isDirty()) {
      this.update(renderer);
      cache.fresh();
    }

    return cache.get('webgl_texture');
  }

  bind(renderer: Renderer) {}
  unbind(renderer: Renderer) {}

  /**
   * Mark texture is dirty and update in the next frame
   */
  dirty() {
    if (this._cache) {
      this._cache.dirtyAll();
    }
  }

  update(renderer: Renderer) {}

  // Update the common parameters of texture
  updateCommon(renderer: Renderer) {
    const _gl = renderer.gl;
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
    _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
    _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, this.unpackAlignment);

    // Use of none-power of two texture
    // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
    if (this.format === glenum.DEPTH_COMPONENT) {
      this.useMipmap = false;
    }

    const sRGBExt = renderer.getGLExtension('EXT_sRGB');
    // Fallback
    if (this.format === Texture.SRGB && !sRGBExt) {
      this.format = Texture.RGB;
    }
    if (this.format === Texture.SRGB_ALPHA && !sRGBExt) {
      this.format = Texture.RGBA;
    }

    this.NPOT = !this.isPowerOfTwo();
  }

  getAvailableWrapS() {
    if (this.NPOT) {
      return glenum.CLAMP_TO_EDGE;
    }
    return this.wrapS;
  }
  getAvailableWrapT() {
    if (this.NPOT) {
      return glenum.CLAMP_TO_EDGE;
    }
    return this.wrapT;
  }
  getAvailableMinFilter() {
    const minFilter = this.minFilter;
    if (this.NPOT || !this.useMipmap) {
      if (
        minFilter === glenum.NEAREST_MIPMAP_NEAREST ||
        minFilter === glenum.NEAREST_MIPMAP_LINEAR
      ) {
        return glenum.NEAREST;
      } else if (
        minFilter === glenum.LINEAR_MIPMAP_LINEAR ||
        minFilter === glenum.LINEAR_MIPMAP_NEAREST
      ) {
        return glenum.LINEAR;
      } else {
        return minFilter;
      }
    } else {
      return minFilter;
    }
  }
  getAvailableMagFilter() {
    return this.magFilter;
  }

  nextHighestPowerOfTwo(x: number) {
    --x;
    for (let i = 1; i < 32; i <<= 1) {
      x = x | (x >> i);
    }
    return x + 1;
  }
  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {
    const cache = this._cache;

    cache.use(renderer.__uid__);

    const webglTexture = cache.get('webgl_texture');
    if (webglTexture) {
      renderer.gl.deleteTexture(webglTexture);
    }
    cache.deleteContext(renderer.__uid__);
  }
  /**
   * Test if image of texture is valid and loaded.
   * @return {boolean}
   */
  isRenderable() {}

  /**
   * Test if texture size is power of two
   * @return {boolean}
   */
  isPowerOfTwo() {
    return isPowerOfTwo(this.width) && isPowerOfTwo(this.height);
  }

  static BYTE = glenum.BYTE;
  static UNSIGNED_BYTE = glenum.UNSIGNED_BYTE;
  static SHORT = glenum.SHORT;
  static UNSIGNED_SHORT = glenum.UNSIGNED_SHORT;
  static INT = glenum.INT;
  static UNSIGNED_INT = glenum.UNSIGNED_INT;
  static FLOAT = glenum.FLOAT;
  static HALF_FLOAT = 0x8d61;

  /**
   * UNSIGNED_INT_24_8_WEBGL for WEBGL_depth_texture extension
   */
  static UNSIGNED_INT_24_8_WEBGL = 34042;

  /* PixelFormat */
  static DEPTH_COMPONENT = glenum.DEPTH_COMPONENT;
  static DEPTH_STENCIL = glenum.DEPTH_STENCIL;
  static ALPHA = glenum.ALPHA;
  static RGB = glenum.RGB;
  static RGBA = glenum.RGBA;
  static LUMINANCE = glenum.LUMINANCE;
  static LUMINANCE_ALPHA = glenum.LUMINANCE_ALPHA;

  /**
   * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
   */
  static SRGB = 0x8c40;
  /**
   * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
   */
  static SRGB_ALPHA = 0x8c42;

  /* Compressed Texture */
  // https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API/Constants
  // s3tc
  static COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83f0;
  static COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83f1;
  static COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83f2;
  static COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83f3;

  // etc
  static COMPRESSED_RGB_ETC1_WEBGL = 0x8d64;

  // pvrtc
  static COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8c00;
  static COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8c02;
  static COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8c01;
  static COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8c03;

  // atc
  static COMPRESSED_RGB_ATC_WEBGL = 0x8c92;
  static COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8c93;
  static COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87ee;

  /* TextureMagFilter */
  static NEAREST = glenum.NEAREST;
  static LINEAR = glenum.LINEAR;

  /* TextureMinFilter */
  static NEAREST_MIPMAP_NEAREST = glenum.NEAREST_MIPMAP_NEAREST;
  static LINEAR_MIPMAP_NEAREST = glenum.LINEAR_MIPMAP_NEAREST;
  static NEAREST_MIPMAP_LINEAR = glenum.NEAREST_MIPMAP_LINEAR;
  static LINEAR_MIPMAP_LINEAR = glenum.LINEAR_MIPMAP_LINEAR;

  /* TextureWrapMode */
  static REPEAT = glenum.REPEAT;
  static CLAMP_TO_EDGE = glenum.CLAMP_TO_EDGE;
  static MIRRORED_REPEAT = glenum.MIRRORED_REPEAT;
}

// Default values.
Texture.prototype.type = glenum.UNSIGNED_BYTE;
Texture.prototype.format = glenum.RGBA;
Texture.prototype.wrapS = glenum.REPEAT;
Texture.prototype.wrapT = glenum.REPEAT;
Texture.prototype.minFilter = glenum.LINEAR_MIPMAP_LINEAR;
Texture.prototype.magFilter = glenum.LINEAR;
Texture.prototype.useMipmap = true;
Texture.prototype.anisotropic = 1;
Texture.prototype.flipY = true;
Texture.prototype.sRGB = true;
Texture.prototype.unpackAlignment = 4;
Texture.prototype.premultiplyAlpha = false;
Texture.prototype.dynamic = false;
Texture.prototype.NPOT = false;

export default Texture;
