/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
import * as constants from './core/constants';
import ClayCache from './core/Cache';
import Notifier from './core/Notifier';
import Renderer from './Renderer';
import { isPowerOfTwo } from './math/util';
import { GLEnum } from './core/type';
import { assign } from './core/util';

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
   *  + {@link clay.constants.UNSIGNED_BYTE}
   *  + {@link clay.constants.HALF_FLOAT}
   *  + {@link clay.constants.FLOAT}
   *  + {@link clay.constants.UNSIGNED_INT_24_8_WEBGL}
   *  + {@link clay.constants.UNSIGNED_INT}
   */
  type: GLEnum;
  /**
   * Format of texel data
   * Possible values:
   *  + {@link clay.constants.RGBA}
   *  + {@link clay.constants.DEPTH_COMPONENT}
   *  + {@link clay.constants.DEPTH_STENCIL}
   */
  format: GLEnum;
  /**
   * Texture wrap. Default to be REPEAT.
   * Possible values:
   *  + {@link clay.constants.CLAMP_TO_EDGE}
   *  + {@link clay.constants.REPEAT}
   *  + {@link clay.constants.MIRRORED_REPEAT}
   */
  wrapS: GLEnum;
  /**
   * Texture wrap. Default to be REPEAT.
   * Possible values:
   *  + {@link clay.constants.CLAMP_TO_EDGE}
   *  + {@link clay.constants.REPEAT}
   *  + {@link clay.constants.MIRRORED_REPEAT}
   */
  wrapT: GLEnum;
  /**
   * Possible values:
   *  + {@link clay.constants.NEAREST}
   *  + {@link clay.constants.LINEAR}
   *  + {@link clay.constants.NEAREST_MIPMAP_NEAREST}
   *  + {@link clay.constants.LINEAR_MIPMAP_NEAREST}
   *  + {@link clay.constants.NEAREST_MIPMAP_LINEAR}
   *  + {@link clay.constants.LINEAR_MIPMAP_LINEAR}
   */
  minFilter: GLEnum;
  /**
   * Possible values:
   *  + {@link clay.constants.NEAREST}
   *  + {@link clay.constants.LINEAR}
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
abstract class Texture extends Notifier {
  protected _cache = new ClayCache();
  protected _width: number = 512;
  protected _height: number = 512;

  textureType: string = '';

  constructor(opts?: Partial<TextureOpts>) {
    super();

    assign(this, opts);
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
    _gl.pixelStorei(constants.UNPACK_FLIP_Y_WEBGL, this.flipY);
    _gl.pixelStorei(constants.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
    _gl.pixelStorei(constants.UNPACK_ALIGNMENT, this.unpackAlignment);

    // Use of none-power of two texture
    // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
    if (this.format === constants.DEPTH_COMPONENT) {
      this.useMipmap = false;
    }

    const sRGBExt = renderer.getGLExtension('EXT_sRGB');
    // Fallback
    if (this.format === constants.SRGB_EXT && !sRGBExt) {
      this.format = constants.RGB;
    }
    if (this.format === constants.SRGB_ALPHA_EXT && !sRGBExt) {
      this.format = constants.RGBA;
    }

    this.NPOT = !this.isPowerOfTwo();
  }

  getAvailableWrapS() {
    if (this.NPOT) {
      return constants.CLAMP_TO_EDGE;
    }
    return this.wrapS;
  }
  getAvailableWrapT() {
    if (this.NPOT) {
      return constants.CLAMP_TO_EDGE;
    }
    return this.wrapT;
  }
  getAvailableMinFilter() {
    const minFilter = this.minFilter;
    if (this.NPOT || !this.useMipmap) {
      if (
        minFilter === constants.NEAREST_MIPMAP_NEAREST ||
        minFilter === constants.NEAREST_MIPMAP_LINEAR
      ) {
        return constants.NEAREST;
      } else if (
        minFilter === constants.LINEAR_MIPMAP_LINEAR ||
        minFilter === constants.LINEAR_MIPMAP_NEAREST
      ) {
        return constants.LINEAR;
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
   */
  abstract isRenderable(): boolean;

  /**
   * Test if texture size is power of two
   * @return {boolean}
   */
  isPowerOfTwo() {
    return isPowerOfTwo(this.width) && isPowerOfTwo(this.height);
  }
}

// Default values.
const proto = Texture.prototype;
proto.type = constants.UNSIGNED_BYTE;
proto.format = constants.RGBA;
proto.wrapS = constants.REPEAT;
proto.wrapT = constants.REPEAT;
proto.minFilter = constants.LINEAR_MIPMAP_LINEAR;
proto.magFilter = constants.LINEAR;
proto.useMipmap = true;
proto.anisotropic = 1;
proto.flipY = true;
proto.sRGB = true;
proto.unpackAlignment = 4;
proto.premultiplyAlpha = false;
proto.dynamic = false;
proto.NPOT = false;

export default Texture;
