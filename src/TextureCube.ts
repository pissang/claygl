import Texture, { TextureImageSource, TextureOpts, TexturePixelSource } from './Texture';
import * as glenum from './core/glenum';
import * as mathUtil from './math/util';
import vendor from './core/vendor';
import Renderer from './Renderer';
import { GLEnum } from './core/type';

const isPowerOfTwo = mathUtil.isPowerOfTwo;

export const cubeTargets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;
export type CubeTarget = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

interface TextureCubeData {
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
 *     envMap.success(function () {
 *         // Wait for the sky texture loaded
 *         animation.on('frame', function (frameTime) {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */
class TextureCube extends Texture {
  readonly textureType = 'textureCube';

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

  update(renderer: Renderer) {
    const _gl = renderer.gl;
    _gl.bindTexture(glenum.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));

    this.updateCommon(renderer);

    const glFormat = this.format;
    const mipmaps = this.mipmaps;
    let glType = this.type;

    _gl.texParameteri(glenum.TEXTURE_CUBE_MAP, glenum.TEXTURE_WRAP_S, this.getAvailableWrapS());
    _gl.texParameteri(glenum.TEXTURE_CUBE_MAP, glenum.TEXTURE_WRAP_T, this.getAvailableWrapT());

    _gl.texParameteri(
      glenum.TEXTURE_CUBE_MAP,
      glenum.TEXTURE_MAG_FILTER,
      this.getAvailableMagFilter()
    );
    _gl.texParameteri(
      glenum.TEXTURE_CUBE_MAP,
      glenum.TEXTURE_MIN_FILTER,
      this.getAvailableMinFilter()
    );

    const anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
    if (anisotropicExt && this.anisotropic > 1) {
      _gl.texParameterf(
        glenum.TEXTURE_CUBE_MAP,
        anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT,
        this.anisotropic
      );
    }

    // Fallback to float type if browser don't have half float extension
    if (glType === 36193) {
      const halfFloatExt = renderer.getGLExtension('OES_texture_half_float');
      if (!halfFloatExt) {
        glType = glenum.FLOAT;
      }
    }

    if (mipmaps && mipmaps.length) {
      let width = this.width;
      let height = this.height;
      for (let i = 0; i < mipmaps.length; i++) {
        const mipmap = mipmaps[i];
        this._updateTextureData(_gl, mipmap, i, width, height, glFormat, glType);
        width /= 2;
        height /= 2;
      }
    } else {
      this._updateTextureData(_gl, this, 0, this.width, this.height, glFormat, glType);

      if (!this.NPOT && this.useMipmap) {
        _gl.generateMipmap(glenum.TEXTURE_CUBE_MAP);
      }
    }

    _gl.bindTexture(glenum.TEXTURE_CUBE_MAP, null);
  }

  _updateTextureData(
    _gl: WebGLRenderingContext,
    data: TextureCubeData,
    level: number,
    width: number,
    height: number,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    for (let i = 0; i < 6; i++) {
      const target = cubeTargets[i];
      const img = data.image && data.image[target];
      const pixels = data.pixels && data.pixels[target];
      if (img) {
        _gl.texImage2D(
          glenum.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          level,
          glFormat,
          glFormat,
          glType,
          img
        );
      } else if (pixels) {
        _gl.texImage2D(
          glenum.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          level,
          glFormat,
          width,
          height,
          0,
          glFormat,
          glType,
          pixels
        );
      }
    }
  }

  /**
   * @param  {clay.Renderer} renderer
   * @memberOf clay.TextureCube.prototype
   */
  generateMipmap(renderer: Renderer) {
    const _gl = renderer.gl;
    if (this.useMipmap && !this.NPOT) {
      _gl.bindTexture(glenum.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));
      _gl.generateMipmap(glenum.TEXTURE_CUBE_MAP);
    }
  }

  bind(renderer: Renderer) {
    renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(renderer));
  }

  unbind(renderer: Renderer) {
    renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, null);
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
    (Object.keys(imageList) as CubeTarget[]).forEach((target) => {
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
