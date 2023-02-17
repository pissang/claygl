import Texture, { TextureImageSource, TextureOpts, TexturePixelSource } from './Texture';
import vendor from './core/vendor';

export interface Texture2DData {
  image?: TextureImageSource;
  /**
   * Pixels data. Will be ignored if image is set.
   */
  pixels?: TexturePixelSource;
}

export interface Texture2DOpts extends TextureOpts, Texture2DData {
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
  mipmaps?: Texture2DData[];
}
/**
 * @example
 *     ...
 *     const mat = new clay.Material({
 *         shader: clay.shader.library.get('clay.phong', 'diffuseMap')
 *     });
 *     const diffuseMap = new clay.Texture2D();
 *     diffuseMap.load('assets/textures/diffuse.jpg');
 *     mat.set('diffuseMap', diffuseMap);
 *     ...
 *     diffuseMap.onload(function () {
 *         // Wait for the diffuse texture loaded
 *         animation.on('frame', function (frameTime) {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */

interface Texture2D extends Omit<Texture2DOpts, 'image'> {}
class Texture2D extends Texture {
  readonly textureType = 'texture2D';

  private _image?: TextureImageSource;

  constructor(opts?: Partial<Texture2DOpts>) {
    super(opts);
  }

  get image(): TextureImageSource | undefined {
    return this._image;
  }
  set image(val: TextureImageSource | undefined) {
    if (this._image !== val) {
      this._image = val;
      this.dirty();
    }
  }
  get width() {
    if (this.image) {
      return this.image.width;
    }
    return this._width;
  }
  set width(value: number) {
    if (this.image) {
      console.warn("Texture from image can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    if (this.image) {
      return this.image.height;
    }
    return this._height;
  }
  set height(value: number) {
    if (this.image) {
      console.warn("Texture from image can't set height");
    } else {
      if (this._height !== value) {
        this.dirty();
      }
      this._height = value;
    }
  }

  isRenderable() {
    if (this.image) {
      return this.image.width > 0 && this.image.height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(src: string, crossOrigin?: string) {
    this.image = vendor.loadImage(
      src,
      crossOrigin,
      () => {
        this.dirty();
        this.trigger('load', this);
      },
      () => {
        this.trigger('error', this);
      }
    );

    return this;
  }
}

export default Texture2D;
