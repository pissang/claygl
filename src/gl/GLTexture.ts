import * as constants from '../core/constants';
import { GLEnum } from '../core/type';
import { getPossiblelInternalFormat } from '../Texture';
import Texture2D, { Texture2DData } from '../Texture2D';
import Texture2DArray, { Texture2DArrayData } from '../Texture2DArray';
import Texture3D, { Texture3DData } from '../Texture3D';
import TextureCube, { cubeTargets, TextureCubeData } from '../TextureCube';
import GLExtension from './GLExtension';

type AllTextureType = Texture2D | TextureCube | Texture2DArray | Texture3D;

const textureTargetMap = {
  texture2D: constants.TEXTURE_2D,
  textureCube: constants.TEXTURE_CUBE_MAP,
  texture2DArray: constants.TEXTURE_2D_ARRAY,
  texture3D: constants.TEXTURE_3D
};

function getAvailableMinFilter(texture: AllTextureType) {
  const minFilter = texture.minFilter;
  if (!texture.useMipmap) {
    return minFilter === constants.NEAREST_MIPMAP_NEAREST
      ? constants.NEAREST
      : minFilter === constants.LINEAR_MIPMAP_LINEAR
      ? constants.LINEAR
      : minFilter;
  } else {
    return minFilter;
  }
}
class GLTexture {
  /**
   * Slot been taken
   */
  slot: number = -1;

  private _texture: AllTextureType;

  /**
   * Instance of webgl texture
   */
  private _webglIns?: WebGLTexture;

  constructor(texture: AllTextureType) {
    this._texture = texture;
  }

  bind(gl: WebGL2RenderingContext) {
    gl.bindTexture(this._getBindTarget(), this.getWebGLTexture(gl));
  }

  unbind(gl: WebGL2RenderingContext) {
    gl.bindTexture(this._getBindTarget(), null);
  }

  getWebGLTexture(gl: WebGL2RenderingContext): WebGLTexture {
    return this._webglIns || (this._webglIns = gl.createTexture()!);
  }

  update(gl: WebGL2RenderingContext, glExt: GLExtension) {
    const texture = this._texture;
    const textureTarget = textureTargetMap[texture.textureType];
    this.bind(gl);

    // Pixel storage
    gl.pixelStorei(constants.UNPACK_FLIP_Y_WEBGL, texture.flipY);
    gl.pixelStorei(constants.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
    gl.pixelStorei(constants.UNPACK_ALIGNMENT, texture.unpackAlignment);

    let useMipmap = texture.useMipmap;

    const glFormat = texture.format;

    const glInternalFormat =
      texture.internalFormat || getPossiblelInternalFormat(texture.format, texture.type);
    const mipmaps = (texture as Texture2D).mipmaps || [];
    const mipmapsLen = mipmaps.length;
    let glType = texture.type;
    let width = texture.width;
    let height = texture.height;

    gl.texParameteri(textureTarget, constants.TEXTURE_WRAP_S, texture.wrapS);
    gl.texParameteri(textureTarget, constants.TEXTURE_WRAP_T, texture.wrapT);

    gl.texParameteri(textureTarget, constants.TEXTURE_MAG_FILTER, texture.magFilter);
    gl.texParameteri(textureTarget, constants.TEXTURE_MIN_FILTER, getAvailableMinFilter(texture));

    const anisotropicExt = glExt.getExtension('EXT_texture_filter_anisotropic');
    const anisotropic = texture.anisotropic;
    if (anisotropicExt && anisotropic > 1) {
      gl.texParameterf(textureTarget, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, anisotropic);
    }

    const updateTextureData = (
      gl: WebGL2RenderingContext,
      data: Texture2DData | Texture3DData | Texture2DArrayData | TextureCubeData,
      level: number,
      width: number,
      height: number
    ) => {
      this[`_update_${texture.textureType}`](
        gl,
        data as any,
        level,
        width,
        height,
        (texture as Texture3D).depth || 0,
        glInternalFormat,
        glFormat,
        glType
      );
    };

    if (mipmapsLen) {
      for (let i = 0; i < mipmapsLen; i++) {
        const mipmap = mipmaps[i];
        updateTextureData(gl, mipmap, i, width, height);
        width = Math.max(width / 2, 1);
        height = Math.max(height / 2, 1);
      }
    } else {
      updateTextureData(gl, texture, 0, width, height);
      if (useMipmap) {
        gl.generateMipmap(textureTarget);
      }
    }

    this.unbind(gl);
  }

  private _update_texture2D(
    gl: WebGL2RenderingContext,
    data: Texture2DData,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    if (data.image) {
      gl.texImage2D(constants.TEXTURE_2D, level, glInternalFormat, glFormat, glType, data.image);
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
          glInternalFormat,
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

  private _update_texture2DArray(
    _gl: WebGL2RenderingContext,
    data: Texture2DArrayData,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    const source = data.image || data.pixels;
    if (source) {
      _gl.texStorage3D(
        constants.TEXTURE_2D_ARRAY,
        level,
        glInternalFormat,
        width,
        height,
        source.length
      );
      source.forEach((source, idx) =>
        _gl.texSubImage3D(
          constants.TEXTURE_2D_ARRAY,
          level,
          0,
          0,
          width,
          height,
          idx,
          0,
          glFormat,
          glType,
          source as HTMLImageElement
        )
      );
    }
  }

  private _update_texture3D(
    _gl: WebGL2RenderingContext,
    data: Texture3DData,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    const source = data.pixels;
    _gl.texImage3D(
      constants.TEXTURE_3D,
      level,
      glInternalFormat,
      width,
      height,
      depth,
      0,
      glFormat,
      glType,
      source || null
    );
  }

  private _update_textureCube(
    _gl: WebGL2RenderingContext,
    data: TextureCubeData,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
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
          glInternalFormat,
          glFormat,
          glType,
          img
        );
      } else {
        _gl.texImage2D(
          constants.TEXTURE_CUBE_MAP_POSITIVE_X + i,
          level,
          glInternalFormat,
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

  generateMipmap(gl: WebGL2RenderingContext) {
    const texture = this._texture;
    const bindTarget = this._getBindTarget();
    // TODO check LINEAR_MIPMAP_LINEAR?
    if (
      texture.useMipmap &&
      texture.format === constants.RGBA &&
      texture.minFilter === constants.LINEAR_MIPMAP_LINEAR
    ) {
      gl.bindTexture(bindTarget, this.getWebGLTexture(gl));
      // TODO Not all texture use mipmap.
      gl.generateMipmap(bindTarget);
      gl.bindTexture(bindTarget, null);
    }
  }

  dispose(gl: WebGL2RenderingContext) {
    const webglTexture = this._webglIns;
    if (webglTexture) {
      gl.deleteTexture(webglTexture);
      this._webglIns = undefined;
    }
  }
}

export default GLTexture;
