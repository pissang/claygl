import Texture, {
  TextureImageSource,
  TextureOpts,
  TexturePixelSource,
  TextureSource
} from './Texture';
import * as mathUtil from './math/util';
import vendor from './core/vendor';
import { keys } from './core/util';

const isPowerOfTwo = mathUtil.isPowerOfTwo;

export const cubeTargets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
export type CubeTarget = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export type TextureCubeSource = Record<CubeTarget, TextureSource | undefined>;
export interface TextureCubeOpts extends TextureOpts<TextureCubeSource> {
  mipmaps?: Record<CubeTarget, TextureSource>[];
}

/**
 * @constructor clay.TextureCube
 * @extends clay.Texture
 *
 * @example
 *     ...
 *     const mat = new clay.Material({
 *         shader: clay.shader.library.get('clay.phong', 'environmentMap')
 *     });
 *     const envMap = new clay.TextureCube();
 *     envMap.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     mat.set('environmentMap', envMap);
 *     ...
 *     envMap.onload(() => {
 *         // Wait for the sky texture loaded
 *         animation.on('frame', (frameTime) => {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */
class TextureCube extends Texture<TextureCubeSource> {
  readonly textureType = 'textureCube';

  mipmaps?: Record<CubeTarget, TextureSource>[];

  constructor(opts?: Partial<TextureCubeOpts>) {
    super(opts);
  }

  get width() {
    const source = this.source;
    if (source && source.px) {
      return source.px.width;
    }
    return this._width;
  }
  set width(value: number) {
    const source = this.source;
    if (source && source.px) {
      console.warn("Texture from source can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    const source = this.source;
    if (source && source.px) {
      return source.px.height;
    }
    return this._height;
  }
  set height(value: number) {
    const source = this.source;
    if (source && source.px) {
      console.warn("Texture from image can't set height");
    } else {
      if (this._height !== value) {
        this.dirty();
      }
      this._height = value;
    }
  }

  // Overwrite the isPowerOfTwo method
  isPowerOfTwo() {
    if (this.source && this.source.px) {
      return isPowerOfTwo(this.source.px.width) && isPowerOfTwo(this.source.px.height);
    } else {
      return isPowerOfTwo(this.width) && isPowerOfTwo(this.height);
    }
  }

  isRenderable() {
    if (this.source && this.source.px) {
      return (
        isImageRenderable(this.source.px) &&
        isImageRenderable(this.source.nx) &&
        isImageRenderable(this.source.py) &&
        isImageRenderable(this.source.ny) &&
        isImageRenderable(this.source.pz) &&
        isImageRenderable(this.source.nz)
      );
    } else {
      return !!(this.width && this.height);
    }
  }

  load(srcList: Record<CubeTarget, string>, crossOrigin?: string): Promise<void> {
    return this.startLoading((resolve, reject) => {
      this.source = {} as Record<CubeTarget, TextureImageSource>;
      let loading = 0;
      const done = () => {
        if (--loading === 0) {
          this.dirty();
          resolve();
        }
      };
      (keys(srcList) as CubeTarget[]).forEach((target) => {
        this.source![target] = vendor.loadImage(srcList[target], crossOrigin, done, done);
        loading++;
      });
    });
  }
}

function isImageRenderable(image: TextureSource | undefined) {
  return image != null && image.width > 0 && image.height > 0;
}

export default TextureCube;
