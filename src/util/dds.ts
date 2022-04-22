// @ts-nocheck
import Texture from '../Texture';
import Texture2D from '../Texture2D';
import TextureCube from '../TextureCube';

// http://msdn.microsoft.com/en-us/library/windows/desktop/bb943991(v=vs.85).aspx
// https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js
const DDS_MAGIC = 0x20534444;

const DDSD_CAPS = 0x1;
const DDSD_HEIGHT = 0x2;
const DDSD_WIDTH = 0x4;
const DDSD_PITCH = 0x8;
const DDSD_PIXELFORMAT = 0x1000;
const DDSD_MIPMAPCOUNT = 0x20000;
const DDSD_LINEARSIZE = 0x80000;
const DDSD_DEPTH = 0x800000;

const DDSCAPS_COMPLEX = 0x8;
const DDSCAPS_MIPMAP = 0x400000;
const DDSCAPS_TEXTURE = 0x1000;

const DDSCAPS2_CUBEMAP = 0x200;
const DDSCAPS2_CUBEMAP_POSITIVEX = 0x400;
const DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800;
const DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000;
const DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000;
const DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000;
const DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000;
const DDSCAPS2_VOLUME = 0x200000;

const DDPF_ALPHAPIXELS = 0x1;
const DDPF_ALPHA = 0x2;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;
const DDPF_YUV = 0x200;
const DDPF_LUMINANCE = 0x20000;

function fourCCToInt32(value) {
  return (
    value.charCodeAt(0) +
    (value.charCodeAt(1) << 8) +
    (value.charCodeAt(2) << 16) +
    (value.charCodeAt(3) << 24)
  );
}

function int32ToFourCC(value) {
  return String.fromCharCode(
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  );
}

const headerLengthInt = 31; // The header length in 32 bit ints

const FOURCC_DXT1 = fourCCToInt32('DXT1');
const FOURCC_DXT3 = fourCCToInt32('DXT3');
const FOURCC_DXT5 = fourCCToInt32('DXT5');
// Offsets into the header array
const off_magic = 0;

const off_size = 1;
const off_flags = 2;
const off_height = 3;
const off_width = 4;

const off_mipmapCount = 7;

const off_pfFlags = 20;
const off_pfFourCC = 21;

const off_caps = 27;
const off_caps2 = 28;
const off_caps3 = 29;
const off_caps4 = 30;

const ret = {
  parse: function (arraybuffer, out) {
    const header = new Int32Array(arraybuffer, 0, headerLengthInt);
    if (header[off_magic] !== DDS_MAGIC) {
      return null;
    }
    if (!header(off_pfFlags) & DDPF_FOURCC) {
      return null;
    }

    const fourCC = header(off_pfFourCC);
    const width = header[off_width];
    const height = header[off_height];
    const isCubeMap = header[off_caps2] & DDSCAPS2_CUBEMAP;
    const hasMipmap = header[off_flags] & DDSD_MIPMAPCOUNT;
    let blockBytes, internalFormat;
    switch (fourCC) {
      case FOURCC_DXT1:
        blockBytes = 8;
        internalFormat = Texture.COMPRESSED_RGB_S3TC_DXT1_EXT;
        break;
      case FOURCC_DXT3:
        blockBytes = 16;
        internalFormat = Texture.COMPRESSED_RGBA_S3TC_DXT3_EXT;
        break;
      case FOURCC_DXT5:
        blockBytes = 16;
        internalFormat = Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT;
        break;
      default:
        return null;
    }
    let dataOffset = header[off_size] + 4;
    // TODO: Suppose all face are existed
    const faceNumber = isCubeMap ? 6 : 1;
    let mipmapCount = 1;
    if (hasMipmap) {
      mipmapCount = Math.max(1, header[off_mipmapCount]);
    }

    const textures = [];
    for (let f = 0; f < faceNumber; f++) {
      let _width = width;
      let _height = height;
      textures[f] = new Texture2D({
        width: _width,
        height: _height,
        format: internalFormat
      });
      const mipmaps = [];
      for (let i = 0; i < mipmapCount; i++) {
        const dataLength = (((Math.max(4, _width) / 4) * Math.max(4, _height)) / 4) * blockBytes;
        const byteArray = new Uint8Array(arraybuffer, dataOffset, dataLength);

        dataOffset += dataLength;
        _width *= 0.5;
        _height *= 0.5;
        mipmaps[i] = byteArray;
      }
      textures[f].pixels = mipmaps[0];
      if (hasMipmap) {
        textures[f].mipmaps = mipmaps;
      }
    }
    // TODO
    // return isCubeMap ? textures : textures[0];
    if (out) {
      out.width = textures[0].width;
      out.height = textures[0].height;
      out.format = textures[0].format;
      out.pixels = textures[0].pixels;
      out.mipmaps = textures[0].mipmaps;
    } else {
      return textures[0];
    }
  }
};

export default ret;
