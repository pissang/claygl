import Texture, { TextureOpts, TexturePixelSource } from './Texture';

export interface Texture3DData {
  /**
   * Pixels data. Will be ignored if image is set.
   */
  pixels?: TexturePixelSource;
}

export interface Texture3DOpts extends TextureOpts, Texture3DData {}

interface Texture3D extends Texture3DOpts {}
class Texture3D extends Texture {
  readonly textureType = 'texture3D';

  private _depth: number = 512;

  pixels?: TexturePixelSource;

  constructor(opts?: TextureOpts) {
    super(opts);
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
  get depth() {
    return this._depth;
  }
  set depth(value: number) {
    this._depth = value;
  }

  isRenderable() {
    return this.width > 0 && this.height > 0 && this.depth > 0;
  }
}

export default Texture3D;
