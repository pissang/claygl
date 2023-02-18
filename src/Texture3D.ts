import Texture, { TextureOpts, TexturePixelSource } from './Texture';

export interface Texture3DOpts extends TextureOpts<TexturePixelSource> {}

class Texture3D extends Texture<TexturePixelSource> {
  readonly textureType = 'texture3D';

  private _depth: number = 512;

  constructor(opts?: Partial<Texture3DOpts>) {
    super(opts);
  }

  get width() {
    if (this.source) {
      return this.source.width;
    }
    return this._width;
  }
  set width(value: number) {
    if (this.source) {
      console.warn("Texture from source can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    if (this.source) {
      return this.source.height;
    }
    return this._height;
  }
  set height(value: number) {
    if (this.source) {
      console.warn("Texture from source can't set height");
    } else {
      if (this._height !== value) {
        this.dirty();
      }
      this._height = value;
    }
  }

  get depth() {
    if (this.source) {
      return this.source.depth!;
    }
    return this._depth;
  }
  set depth(value: number) {
    if (this.source) {
      console.warn("Texture from source can't set depth");
    } else {
      if (this._depth !== value) {
        this.dirty();
      }
      this._depth = value;
    }
  }

  isRenderable() {
    return this.width > 0 && this.height > 0 && this.depth > 0;
  }
}

export default Texture3D;
