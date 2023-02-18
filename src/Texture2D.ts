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
    const source = this.source;
    const mipmaps = this.mipmaps;
    if (source) {
      return source.width;
    } else if (mipmaps && mipmaps[0]) {
      return mipmaps[0].width;
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
    const source = this.source;
    const mipmaps = this.mipmaps;
    if (source) {
      return source.height;
    } else if (mipmaps && mipmaps[0]) {
      return mipmaps[0].height;
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

  isRenderable() {
    if (this.source) {
      return this.source.width > 0 && this.source.height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  load(src: string, crossOrigin?: string): Promise<void> {
    return this.startLoading((resolve, reject) => {
      this.source = vendor.loadImage(
        src,
        crossOrigin,
        () => {
          this.dirty();
          resolve();
        },
        (e) => {
          reject();
        }
      );
    });
  }
}

export default Texture2D;
