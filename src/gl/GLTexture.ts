import * as constants from '../core/constants';
import { GLEnum } from '../core/type';
import vendor from '../core/vendor';
import Texture2D, { Texture2DData } from '../Texture2D';
import TextureCube, { cubeTargets, TextureCubeData } from '../TextureCube';
import GLExtension from './GLExtension';

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
  canvas = canvas || vendor.createCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(texture.image!, 0, 0, width, height);

  return canvas;
}

function getAvailableMinFilter(texture: Texture2D | TextureCube, NPOT: boolean) {
  const minFilter = texture.minFilter;
  if (NPOT || !texture.useMipmap) {
    if (
      minFilter === constants.NEAREST_MIPMAP_NEAREST ||
      minFilter === constants.NEAREST_MIPMAP_LINEAR
    ) {
      return constants.NEAREST;
    } else if (
      minFilter === constants.LINEAR_MIPMAP_LINEAR ||
      minFilter === constants.LINEAR_MIPMAP_NEAREST
    ) {
      return constants.LINEAR;
    } else {
      return minFilter;
    }
  } else {
    return minFilter;
  }
}

class GLTexture {
  /**
   * Slot been taken
   */
  slot: number = -1;

  private _texture: Texture2D | TextureCube;

  /**
   * Instance of webgl texture
   */
  private _webglIns?: WebGLTexture;

  private _potCanvas?: HTMLCanvasElement;

  constructor(texture: Texture2D | TextureCube) {
    this._texture = texture;
  }

  bind(gl: WebGLRenderingContext) {
    gl.bindTexture(this._getBindTarget(), this.getWebGLTexture(gl));
  }

  unbind(gl: WebGLRenderingContext) {
    gl.bindTexture(this._getBindTarget(), null);
  }

  getWebGLTexture(gl: WebGLRenderingContext): WebGLTexture {
    return this._webglIns || (this._webglIns = gl.createTexture()!);
  }

  update(gl: WebGLRenderingContext, glExt: GLExtension) {
    const texture = this._texture;
    const isTexture2D = texture.textureType === 'texture2D';
    const textureTarget = isTexture2D ? constants.TEXTURE_2D : constants.TEXTURE_CUBE_MAP;
    this.bind(gl);

    // Pixel storage
    gl.pixelStorei(constants.UNPACK_FLIP_Y_WEBGL, texture.flipY);
    gl.pixelStorei(constants.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
    gl.pixelStorei(constants.UNPACK_ALIGNMENT, texture.unpackAlignment);

    let useMipmap = texture.useMipmap;
    let format = texture.format;
    const sRGBExt = glExt.getExtension('EXT_sRGB');
    // Use of none-power of two texture
    // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
    if (texture.format === constants.DEPTH_COMPONENT) {
      useMipmap = false;
    }
    // Fallback
    if (format === constants.SRGB_EXT && !sRGBExt) {
      format = constants.RGB;
    }
    if (format === constants.SRGB_ALPHA_EXT && !sRGBExt) {
      format = constants.RGBA;
    }

    const NPOT = !texture.isPowerOfTwo();

    const glFormat = texture.format;
    const mipmaps = texture.mipmaps || [];
    const mipmapsLen = mipmaps.length;
    let glType = texture.type;
    let width = texture.width;
    let height = texture.height;

    // Convert to pot is only available when using image/canvas/video element.
    const needsConvertToPOT = !!(
      (texture as Texture2D).convertToPOT &&
      !mipmaps.length &&
      texture.image &&
      (texture.wrapS === constants.REPEAT || texture.wrapT === constants.REPEAT) &&
      NPOT
    );

    gl.texParameteri(
      textureTarget,
      constants.TEXTURE_WRAP_S,
      NPOT && !needsConvertToPOT ? constants.CLAMP_TO_EDGE : texture.wrapS
    );
    gl.texParameteri(
      textureTarget,
      constants.TEXTURE_WRAP_T,
      NPOT && !needsConvertToPOT ? constants.CLAMP_TO_EDGE : texture.wrapT
    );

    gl.texParameteri(textureTarget, constants.TEXTURE_MAG_FILTER, texture.magFilter);
    gl.texParameteri(
      textureTarget,
      constants.TEXTURE_MIN_FILTER,
      getAvailableMinFilter(texture, NPOT || needsConvertToPOT)
    );

    const anisotropicExt = glExt.getExtension('EXT_texture_filter_anisotropic');
    const anisotropic = texture.anisotropic;
    if (anisotropicExt && anisotropic > 1) {
      gl.texParameterf(textureTarget, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropic);
    }

    // Fallback to float type if browser don't have half float extension
    if (glType === 36193) {
      const halfFloatExt = glExt.getExtension('OES_texture_half_float');
      if (!halfFloatExt) {
        glType = constants.FLOAT;
      }
    }

    const updateTextureData = (
      gl: WebGLRenderingContext,
      data: Texture2DData | TextureCubeData,
      level: number,
      width: number,
      height: number,
      convertToPOT: boolean
    ) => {
      if (isTexture2D) {
        this._updateTextureData2D(
          gl,
          data as Texture2DData,
          level,
          width,
          height,
          glFormat,
          glType,
          convertToPOT
        );
      } else {
        this._updateTextureDataCube(
          gl,
          data as TextureCubeData,
          level,
          width,
          height,
          glFormat,
          glType
        );
      }
    };

    if (mipmapsLen) {
      for (let i = 0; i < mipmapsLen; i++) {
        const mipmap = mipmaps[i];
        updateTextureData(gl, mipmap, i, width, height, false);
        width = Math.max(width / 2, 1);
        height = Math.max(height / 2, 1);
      }
    } else {
      updateTextureData(gl, texture, 0, width, height, needsConvertToPOT);
      if (useMipmap && (!NPOT || needsConvertToPOT)) {
        gl.generateMipmap(textureTarget);
      }
    }

    this.unbind(gl);
  }

  private _updateTextureData2D(
    gl: WebGLRenderingContext,
    data: Texture2DData,
    level: number,
    width: number,
    height: number,
    glFormat: GLEnum,
    glType: GLEnum,
    convertToPOT: boolean
  ) {
    if (data.image) {
      let imgData = data.image;
      if (convertToPOT) {
        this._potCanvas = convertTextureToPowerOfTwo(this._texture as Texture2D, this._potCanvas);
        imgData = this._potCanvas;
      }
      gl.texImage2D(constants.TEXTURE_2D, level, glFormat, glFormat, glType, imgData);
    } else {
      // Can be used as a blank texture when writing render to texture(RTT)
      if (
        // S3TC
        (glFormat <= constants.COMPRESSED_RGBA_S3TC_DXT5_EXT &&
          glFormat >= constants.COMPRESSED_RGB_S3TC_DXT1_EXT) ||
        // ETC
        glFormat === constants.COMPRESSED_RGB_ETC1_WEBGL ||
        // PVRTC
        (glFormat >= constants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG &&
          glFormat <= constants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG) ||
        // ATC
        glFormat === constants.COMPRESSED_RGB_ATC_WEBGL ||
        glFormat === constants.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL ||
        glFormat === constants.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
      ) {
        if (data.pixels) {
          gl.compressedTexImage2D(
            constants.TEXTURE_2D,
            level,
            glFormat,
            width,
            height,
            0,
            data.pixels
          );
        } else {
          console.error(`Format ${glFormat} should have pixels data.`);
        }
      } else {
        // Is a render target if pixels is null
        gl.texImage2D(
          constants.TEXTURE_2D,
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

  private _updateTextureDataCube(
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
          constants.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          level,
          glFormat,
          glFormat,
          glType,
          img
        );
      } else {
        _gl.texImage2D(
          constants.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          level,
          glFormat,
          width,
          height,
          0,
          glFormat,
          glType,
          pixels || null
        );
      }
    }
  }

  private _getBindTarget() {
    return this._texture.textureType === 'texture2D'
      ? constants.TEXTURE_2D
      : constants.TEXTURE_CUBE_MAP;
  }

  generateMipmap(gl: WebGLRenderingContext) {
    const texture = this._texture;
    const bindTarget = this._getBindTarget();
    if (texture.useMipmap && texture.isPowerOfTwo()) {
      gl.bindTexture(bindTarget, this.getWebGLTexture(gl));
      gl.generateMipmap(bindTarget);
      gl.bindTexture(bindTarget, null);
    }
  }

  dispose(gl: WebGLRenderingContext) {
    const webglTexture = this._webglIns;
    if (webglTexture) {
      gl.deleteTexture(webglTexture);
      this._webglIns = undefined;
    }
  }
}

export default GLTexture;
