import Texture, { TextureImageSource, TextureOpts, TexturePixelSource } from './Texture';
import vendor from './core/vendor';

export type Texture2DArrayData = {
  image?: TextureImageSource[];
  pixels?: TexturePixelSource[];
};

export interface Texture2DArrayOpts extends TextureOpts {
  /**
   * @example
   *     [{
   *         image: mipmap0,
   *         pixels: null
   *     }, {
   *         image: mipmap1,
   *         pixels: null
   *     }, ....]
   */
  mipmaps?: Texture2DArrayData[];
}

interface Texture2DArray extends Omit<Texture2DArrayOpts, 'image'> {}
class Texture2DArray extends Texture {
  readonly textureType = 'texture2DArray';

  private _image: TextureImageSource[] = [];

  constructor(opts?: Partial<Texture2DArrayOpts>) {
    super(opts);
  }

  hasImage() {
    return this._image.length > 0;
  }

  get image(): TextureImageSource[] {
    return this._image;
  }
  set image(val: TextureImageSource[]) {
    if (this._image !== val) {
      this._image = val;
      this.dirty();
    }
  }
  get width() {
    if (this.hasImage()) {
      return this.image[0].width;
    }
    return this._width;
  }
  set width(value: number) {
    if (this.hasImage()) {
      console.warn("Texture from image can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    if (this.hasImage()) {
      return this.image[0].height;
    }
    return this._height;
  }
  set height(value: number) {
    if (this.hasImage()) {
      console.warn("Texture from image can't set height");
    } else {
      if (this._height !== value) {
        this.dirty();
      }
      this._height = value;
    }
  }

  isRenderable() {
    if (this.hasImage()) {
      return this.image[0].width > 0 && this.image[0].height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(srcList: string[], crossOrigin?: string) {
    let loading = 0;
    this.image = [];
    srcList.forEach((src, idx) => {
      this.image![idx] = vendor.loadImage(
        src,
        crossOrigin,
        () => {
          if (--loading === 0) {
            this.dirty();
            this.trigger('success', this);
          }
        },
        () => {
          loading--;
        }
      );
      loading++;
    });

    return this;
  }
}

export default Texture2DArray;
