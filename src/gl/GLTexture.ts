import * as constants from '../core/constants';
import { GLEnum } from '../core/type';
import { isPixelSource, TexturePixelSource, TextureSource } from '../Texture';
import Texture2D from '../Texture2D';
import Texture2DArray from '../Texture2DArray';
import Texture3D from '../Texture3D';
import TextureCube, { cubeTargets, TextureCubeSource } from '../TextureCube';
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

    const glInternalFormat = texture.internalFormat;
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
      source: TextureSource | TextureSource[] | TextureCubeSource,
      level: number,
      width: number,
      height: number
    ) => {
      this[`_update_${texture.textureType}`](
        gl,
        source as any,
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
      updateTextureData(gl, texture.source as any, 0, width, height);
      // TODO check minFilter
      if (useMipmap) {
        gl.generateMipmap(textureTarget);
      }
    }

    this.unbind(gl);
  }

  private _update_texture2D(
    gl: WebGL2RenderingContext,
    source: TextureSource | undefined,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    if (isPixelSource(source) || !source) {
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
        if (source && source.data) {
          gl.compressedTexImage2D(
            constants.TEXTURE_2D,
            level,
            glFormat,
            width,
            height,
            0,
            source.data
          );
        } else {
          console.error(`Format ${glFormat} should have pixels data.`);
        }
      }

      gl.texImage2D(
        constants.TEXTURE_2D,
        level,
        glInternalFormat,
        width,
        height,
        0,
        glFormat,
        glType,
        (source && source.data) || null
      );

      // if (gl.getError()) {
      //   debugger;
      // }
    } else {
      // Try as image source.
      // TODO check?
      gl.texImage2D(constants.TEXTURE_2D, level, glInternalFormat, glFormat, glType, source);
    }
  }

  private _update_texture2DArray(
    _gl: WebGL2RenderingContext,
    source: TextureSource[] | undefined,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
    // TODO mipmap
    // TODO render target
    if (source) {
      // TODO
      _gl.texStorage3D(
        constants.TEXTURE_2D_ARRAY,
        1,
        glInternalFormat,
        width,
        height,
        source.length
      );
      source.forEach((sourceSlice, idx) =>
        // TODO check image size are equal
        _gl.texSubImage3D(
          constants.TEXTURE_2D_ARRAY,
          0,
          0,
          0,
          idx,
          width,
          height,
          1,
          glFormat,
          glType,
          (isPixelSource(sourceSlice) ? sourceSlice.data : sourceSlice) as HTMLImageElement
        )
      );
    }
  }

  private _update_texture3D(
    _gl: WebGL2RenderingContext,
    source: TexturePixelSource | undefined,
    level: number,
    width: number,
    height: number,
    depth: number,
    glInternalFormat: GLEnum,
    glFormat: GLEnum,
    glType: GLEnum
  ) {
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
      (source && source.data) || null
    );
  }

  private _update_textureCube(
    _gl: WebGL2RenderingContext,
    source: TextureCubeSource | undefined,
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
      const sourceSide = source && source[target];
      const glTarget = constants.TEXTURE_CUBE_MAP_POSITIVE_X + i;
      if (isPixelSource(sourceSide) || !sourceSide) {
        _gl.texImage2D(
          glTarget,
          level,
          glInternalFormat,
          width,
          height,
          0,
          glFormat,
          glType,
          (sourceSide && sourceSide.data) || null
        );
      } else {
        _gl.texImage2D(glTarget, level, glInternalFormat, glFormat, glType, sourceSide);
      }
    }
  }

  private _getBindTarget() {
    return textureTargetMap[this._texture.textureType];
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
