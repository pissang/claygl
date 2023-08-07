import Texture, {
  getDefaultTextureFormatBySource,
  getDefaultTypeBySource,
  TextureOpts,
  TextureSource
} from './Texture';
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
      let maxWidth = 0;
      const source = this.source;
      for (let i = 0; i < source!.length; i++) {
        maxWidth = Math.max(maxWidth, source![i].width);
      }
      return maxWidth;
    }
    return this._width || 0;
  }
  set width(value: number) {
    const oldWidth = this.width;
    if (!this._hasSource()) {
      this._width = value;
    } else {
      // PENDING Should not change the source size.
      // this.source!.forEach((source) => isPixelSource(source) && (source.width = value));
    }
    oldWidth !== value && this.dirty();
  }
  get height() {
    if (this._hasSource()) {
      let maxHeight = 0;
      const source = this.source;
      for (let i = 0; i < source!.length; i++) {
        maxHeight = Math.max(maxHeight, source![i].height);
      }
      return maxHeight;
    }
    return this._height || 0;
  }
  set height(value: number) {
    const oldHeight = this.height;
    if (!this._hasSource()) {
      this._height = value;
    } else {
      // this.source!.forEach((source) => (source.height = value));
    }
    oldHeight !== value && this.dirty();
  }

  protected override _defaultFormat() {
    return getDefaultTextureFormatBySource(this.source && this.source[0]);
  }

  protected override _defaultType() {
    return getDefaultTypeBySource(this.source && this.source[0]);
  }

  isRenderable() {
    if (this._hasSource()) {
      return this.source![0].width > 0 && this.source![0].height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(srcList: string[], crossOrigin?: string): Promise<void> {
    return this.startLoading((resolve, reject) => {
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
    });
  }
}

export default Texture2DArray;
