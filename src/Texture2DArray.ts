import Texture, { TextureOpts, TextureSource } from './Texture';
import vendor from './core/vendor';

export interface Texture2DArrayOpts extends TextureOpts<TextureSource[]> {}

class Texture2DArray extends Texture<TextureSource[]> {
  readonly textureType = 'texture2DArray';

  constructor(opts?: Partial<Texture2DArrayOpts>) {
    super(opts);
    // TODO _source default value is inited after super().
    this.source = (opts && opts.source) || [];
  }

  private _hasSource() {
    return this.source && this.source.length > 0;
  }

  get width() {
    if (this._hasSource()) {
      return this.source![0].width;
    }
    return this._width;
  }
  set width(value: number) {
    if (this._hasSource()) {
      console.warn("Texture from source can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    if (this._hasSource()) {
      return this.source![0].height;
    }
    return this._height;
  }
  set height(value: number) {
    if (this._hasSource()) {
      console.warn("Texture from source can't set height");
    } else {
      if (this._height !== value) {
        this.dirty();
      }
      this._height = value;
    }
  }

  isRenderable() {
    if (this._hasSource()) {
      return this.source![0].width > 0 && this.source![0].height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(srcList: string[], crossOrigin?: string): Promise<void> {
    return (this._loadingPromise = new Promise((resolve, reject) => {
      this.source = [];
      let loading = 0;
      const done = () => {
        if (--loading === 0) {
          this.dirty();
          resolve();
        }
      };
      srcList.forEach((src, idx) => {
        this.source![idx] = vendor.loadImage(src, crossOrigin, done, done);
        loading++;
      });
    }));
  }
}

export default Texture2DArray;
