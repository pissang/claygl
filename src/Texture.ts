/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
import * as constants from './core/constants';
import { isPowerOfTwo } from './math/util';
import { GLEnum } from './core/type';
import { assign } from './core/util';

export type TextureImageSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
export type TexturePixelSource = {
  data: Uint8Array | Float32Array;
  width: number;
  height: number;
  depth?: number;
};

export type TextureSource = TextureImageSource | TexturePixelSource;

export function isPixelSource(
  source: TextureSource | undefined | null
): source is TexturePixelSource {
  return !!(source && (source as TexturePixelSource).data);
}

// Compatible with WebGL1 for float type storage.
// PENDING
export function getPossiblelInternalFormat(format: number, type: number) {
  switch (type) {
    case constants.HALF_FLOAT:
      return format === constants.RGBA
        ? constants.RGBA16F
        : format === constants.RGB
        ? constants.RGB16F
        : format === constants.RG
        ? constants.RG16F
        : constants.R16F;
    case constants.FLOAT:
      return format === constants.RGBA
        ? constants.RGBA32F
        : format === constants.RGB
        ? constants.RGB32F
        : format === constants.RG
        ? constants.RG32F
        : constants.R32F;
    case constants.UNSIGNED_BYTE:
      return format === constants.RGBA
        ? constants.RGBA8
        : format === constants.RGB
        ? constants.RGB8
        : format === constants.RG
        ? constants.RG8
        : constants.R8;
  }
  return format;
}

const formatMap = {
  1: constants.RED,
  2: constants.RG,
  3: constants.RGB,
  4: constants.RGBA
};

export function getDefaultTextureFormatBySource(source?: TextureSource) {
  if (isPixelSource(source)) {
    const channels = source.data.length / source.width / source.height / (source.depth || 1);
    return formatMap[channels as 1] || constants.RGBA;
  }
  return constants.RGBA;
}

export function getDefaultTypeBySource(source?: TextureSource) {
  if (isPixelSource(source)) {
    return source.data instanceof Float32Array
      ? constants.FLOAT
      : source.data instanceof Uint16Array
      ? constants.HALF_FLOAT
      : constants.UNSIGNED_BYTE;
  }
  return constants.UNSIGNED_BYTE;
}
export interface TextureOpts<TSource = unknown> {
  /**
   * Source
   */
  source: TSource;
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
   * Format of internal storage
   */
  internalFormat: GLEnum;
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
}
interface Texture<TSource> extends Omit<TextureOpts, 'width' | 'height' | 'source'> {}
abstract class Texture<TSource = unknown> {
  protected _width: number = 512;
  protected _height: number = 512;

  __dirty = true;

  textureType: string = '';

  private _source?: TSource;

  private _loadingPromise?: Promise<void>;

  private _format?: GLEnum;
  private _type?: GLEnum;
  private _internalFormat?: GLEnum;

  constructor(opts?: Partial<TextureOpts>) {
    assign(this, opts);
  }

  get source(): TSource | undefined {
    return this._source;
  }
  set source(val: TSource | undefined) {
    if (this._source !== val) {
      this._source = val;
      this.dirty();
    }
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

  get type() {
    return this._type || this._defaultType();
  }

  set type(type: GLEnum) {
    this._type = type;
  }

  get format() {
    return this._format || this._defaultFormat();
  }

  set format(format: GLEnum) {
    this._format = format;
  }

  get internalFormat() {
    return this._internalFormat || getPossiblelInternalFormat(this.format, this.type);
  }

  set internalFormat(internalFormat: GLEnum) {
    this._internalFormat = internalFormat;
  }

  protected _defaultFormat() {
    return constants.RGBA;
  }

  protected _defaultType() {
    return constants.UNSIGNED_BYTE;
  }

  /**
   * Mark texture is dirty and update in the next frame
   */
  dirty() {
    this.__dirty = true;
  }

  nextHighestPowerOfTwo(x: number) {
    --x;
    for (let i = 1; i < 32; i <<= 1) {
      x = x | (x >> i);
    }
    return x + 1;
  }

  resize(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  /**
   * Test if image of texture is valid and loaded.
   */
  abstract isRenderable(): boolean;

  /**
   * Remove a promise that will be resolved if texture is ready.
   * Will return undefined if there is not any loading actions.
   * PENDING Should always return a promise?
   */
  checkReady() {
    return this.isRenderable() ? Promise.resolve() : this._loadingPromise;
  }

  startLoading(doLoading: (resolve: () => void, reject: () => void) => void) {
    return (this._loadingPromise = new Promise((resolve, reject) => {
      doLoading(resolve, reject);
    }));
  }

  // TODO check ready
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

export default Texture;
