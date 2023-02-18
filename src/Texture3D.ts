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
    const oldWidth = this.width;
    if (this.source) {
      this.source.width = value;
    } else {
      this._width = value;
    }
    oldWidth !== value && this.dirty();
  }
  get height() {
    if (this.source) {
      return this.source.height;
    }
    return this._height;
  }
  set height(value: number) {
    const oldHeight = this.height;
    if (this.source) {
      this.source.height = value;
    } else {
      this._height = value;
    }
    oldHeight !== value && this.dirty();
  }

  get depth() {
    if (this.source) {
      return this.source.depth!;
    }
    return this._depth;
  }
  set depth(value: number) {
    const oldDepth = this.depth;
    if (this.source) {
      this.source.depth = value;
    } else {
      this._depth = value;
    }
    oldDepth !== value && this.dirty();
  }

  isRenderable() {
    return this.width > 0 && this.height > 0 && this.depth > 0;
  }
}

export default Texture3D;
