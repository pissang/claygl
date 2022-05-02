import Texture, { TextureImageSource, TextureOpts, TexturePixelSource } from './Texture';
import * as glenum from './core/glenum';
import vendor from './core/vendor';
import Renderer from './Renderer';
import { GLEnum } from './core/type';

function nearestPowerOfTwo(val: number) {
  return Math.pow(2, Math.round(Math.log(val) / Math.LN2));
}
function convertTextureToPowerOfTwo(
  texture: Texture2D,
  canvas?: HTMLCanvasElement
): HTMLCanvasElement {
  // const canvas = document.createElement('canvas');
  const width = nearestPowerOfTwo(texture.width);
  const height = nearestPowerOfTwo(texture.height);
  canvas = canvas || document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(texture.image!, 0, 0, width, height);

  return canvas;
}

interface Texture2DData {
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
  convertToPOT?: boolean;
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
 *     diffuseMap.success(function () {
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
  private _potCanvas?: HTMLCanvasElement;

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

  update(renderer: Renderer) {
    const gl = renderer.gl;
    gl.bindTexture(glenum.TEXTURE_2D, this._cache.get('webgl_texture'));

    this.updateCommon(renderer);

    const glFormat = this.format;
    const mipmaps = this.mipmaps || [];
    let glType = this.type;

    // Convert to pot is only available when using image/canvas/video element.
    const convertToPOT = !!(
      this.convertToPOT &&
      !mipmaps.length &&
      this.image &&
      (this.wrapS === Texture.REPEAT || this.wrapT === Texture.REPEAT) &&
      this.NPOT
    );

    gl.texParameteri(
      glenum.TEXTURE_2D,
      glenum.TEXTURE_WRAP_S,
      convertToPOT ? this.wrapS : this.getAvailableWrapS()
    );
    gl.texParameteri(
      glenum.TEXTURE_2D,
      glenum.TEXTURE_WRAP_T,
      convertToPOT ? this.wrapT : this.getAvailableWrapT()
    );

    gl.texParameteri(
      glenum.TEXTURE_2D,
      glenum.TEXTURE_MAG_FILTER,
      convertToPOT ? this.magFilter : this.getAvailableMagFilter()
    );
    gl.texParameteri(
      glenum.TEXTURE_2D,
      glenum.TEXTURE_MIN_FILTER,
      convertToPOT ? this.minFilter : this.getAvailableMinFilter()
    );

    const anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
    if (anisotropicExt && this.anisotropic > 1) {
      gl.texParameterf(
        glenum.TEXTURE_2D,
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

    if (mipmaps.length) {
      let width = this.width;
      let height = this.height;
      for (let i = 0; i < mipmaps.length; i++) {
        const mipmap = mipmaps[i];
        this._updateTextureData(gl, mipmap, i, width, height, glFormat, glType, false);
        width = Math.max(width / 2, 1);
        height = Math.max(height / 2, 1);
      }
    } else {
      this._updateTextureData(gl, this, 0, this.width, this.height, glFormat, glType, convertToPOT);

      if (this.useMipmap && (!this.NPOT || convertToPOT)) {
        gl.generateMipmap(glenum.TEXTURE_2D);
      }
    }

    gl.bindTexture(glenum.TEXTURE_2D, null);
  }

  _updateTextureData(
    gl: WebGLRenderingContext,
    data: Texture2DData,
    level: number,
    width: number,
    height: number,
    glFormat: GLEnum,
    glType: GLEnum,
    convertToPOT?: boolean
  ) {
    if (data.image) {
      let imgData = data.image;
      if (convertToPOT) {
        this._potCanvas = convertTextureToPowerOfTwo(this, this._potCanvas);
        imgData = this._potCanvas;
      }
      gl.texImage2D(glenum.TEXTURE_2D, level, glFormat, glFormat, glType, imgData);
    } else {
      // Can be used as a blank texture when writing render to texture(RTT)
      if (
        // S3TC
        (glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT &&
          glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT) ||
        // ETC
        glFormat === Texture.COMPRESSED_RGB_ETC1_WEBGL ||
        // PVRTC
        (glFormat >= Texture.COMPRESSED_RGB_PVRTC_4BPPV1_IMG &&
          glFormat <= Texture.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG) ||
        // ATC
        (glFormat === Texture.COMPRESSED_RGB_ATC_WEBGL &&
          glFormat === Texture.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL &&
          glFormat === Texture.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL)
      ) {
        gl.compressedTexImage2D(glenum.TEXTURE_2D, level, glFormat, width, height, 0, data.pixels);
      } else {
        // Is a render target if pixels is null
        gl.texImage2D(
          glenum.TEXTURE_2D,
          level,
          glFormat,
          width,
          height,
          0,
          glFormat,
          glType,
          data.pixels || null
        );
      }
    }
  }

  /**
   * @param  {clay.Renderer} renderer
   * @memberOf clay.Texture2D.prototype
   */
  generateMipmap(renderer: Renderer) {
    const gl = renderer.gl;
    if (this.useMipmap && !this.NPOT) {
      gl.bindTexture(glenum.TEXTURE_2D, this._cache.get('webgl_texture'));
      gl.generateMipmap(glenum.TEXTURE_2D);
    }
  }

  isRenderable() {
    if (this.image) {
      return this.image.width > 0 && this.image.height > 0;
    } else {
      return !!(this.width && this.height);
    }
  }

  bind(renderer: Renderer) {
    renderer.gl.bindTexture(glenum.TEXTURE_2D, this.getWebGLTexture(renderer));
  }

  unbind(renderer: Renderer) {
    renderer.gl.bindTexture(glenum.TEXTURE_2D, null);
  }

  load(src: string, crossOrigin?: string) {
    const image = vendor.createImage();
    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }
    image.onload = () => {
      this.dirty();
      this.trigger('success', this);
    };
    image.onerror = () => {
      this.trigger('error', this);
    };

    image.src = src;
    this.image = image;

    return this;
  }
}

Texture2D.prototype.convertToPOT = false;

export default Texture2D;
