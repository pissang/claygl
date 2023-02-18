import Texture, { TextureOpts, TextureSource } from './Texture';
import vendor from './core/vendor';

export interface Texture2DOpts extends TextureOpts<TextureSource> {
  mipmaps?: TextureSource[];
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

class Texture2D extends Texture<TextureSource> {
  readonly textureType = 'texture2D';

  mipmaps?: TextureSource[];

  constructor(opts?: Partial<Texture2DOpts>) {
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

  isRenderable() {
    if (this.source) {
      return this.source.width > 0 && this.source.height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(src: string, crossOrigin?: string): Promise<void> {
    return (this._loadingPromise = new Promise((resolve, reject) => {
      this.source = vendor.loadImage(
        src,
        crossOrigin,
        () => {
          this.dirty();
          resolve();
        },
        (e) => {
          reject(e);
        }
      );
    }));
  }
}

export default Texture2D;
