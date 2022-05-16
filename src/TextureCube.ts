import Texture, { TextureImageSource, TextureOpts, TexturePixelSource } from './Texture';
import * as constants from './core/constants';
import * as mathUtil from './math/util';
import vendor from './core/vendor';
import Renderer from './Renderer';
import { GLEnum } from './core/type';
import { keys } from './core/util';

const isPowerOfTwo = mathUtil.isPowerOfTwo;

export const cubeTargets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
export type CubeTarget = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export interface TextureCubeData {
  image?: Record<CubeTarget, TextureImageSource>;
  /**
   * Pixels data. Will be ignored if image is set.
   */
  pixels?: Record<CubeTarget, TexturePixelSource>;
}
export interface TextureCubeOpts extends TextureOpts, TextureCubeData {
  /**
   * @type {Array.<Object>}
   */
  mipmaps?: TextureCubeData[];
}

interface TextureCube extends TextureCubeOpts {}
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
class TextureCube extends Texture {
  readonly textureType = 'textureCube';

  constructor(opts?: Partial<TextureCubeOpts>) {
    super(opts);
  }

  get width() {
    const images = this.image;
    if (images && images.px) {
      return images.px.width;
    }
    return this._width;
  }
  set width(value: number) {
    const images = this.image;
    if (images && images.px) {
      console.warn("Texture from image can't set width");
    } else {
      if (this._width !== value) {
        this.dirty();
      }
      this._width = value;
    }
  }
  get height() {
    const images = this.image;
    if (images && images.px) {
      return images.px.height;
    }
    return this._height;
  }
  set height(value: number) {
    const images = this.image;
    if (images && images.px) {
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
    if (this.image && this.image.px) {
      return isPowerOfTwo(this.image.px.width) && isPowerOfTwo(this.image.px.height);
    } else {
      return isPowerOfTwo(this.width) && isPowerOfTwo(this.height);
    }
  }

  isRenderable() {
    if (this.image && this.image.px) {
      return (
        isImageRenderable(this.image.px) &&
        isImageRenderable(this.image.nx) &&
        isImageRenderable(this.image.py) &&
        isImageRenderable(this.image.ny) &&
        isImageRenderable(this.image.pz) &&
        isImageRenderable(this.image.nz)
      );
    } else {
      return !!(this.width && this.height);
    }
  }

  load(imageList: Record<CubeTarget, string>, crossOrigin?: string) {
    let loading = 0;
    this.image = {} as Record<CubeTarget, TextureImageSource>;
    (keys(imageList) as CubeTarget[]).forEach((target) => {
      const src = imageList[target];
      const image = vendor.createImage();
      if (crossOrigin) {
        image.crossOrigin = crossOrigin;
      }
      image.onload = () => {
        loading--;
        if (loading === 0) {
          this.dirty();
          this.trigger('success', this);
        }
      };
      image.onerror = function () {
        loading--;
      };

      loading++;
      image.src = src;
      this.image![target] = image;
    });

    return this;
  }
}

function isImageRenderable(image: TextureImageSource) {
  return image.width > 0 && image.height > 0;
}

export default TextureCube;
