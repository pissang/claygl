define(function(require) {

    'use strict';

    var Texture = require('../Texture');
    var Texture2D = require('../Texture2D');
    var TextureCube = require('../TextureCube');

    // http://msdn.microsoft.com/en-us/library/windows/desktop/bb943991(v=vs.85).aspx
    // https://github.com/toji/webgl-texture-utils/blob/master/texture-util/dds.js
    var DDS_MAGIC = 0x20534444;

    var DDSD_CAPS = 0x1;
    var DDSD_HEIGHT = 0x2;
    var DDSD_WIDTH = 0x4;
    var DDSD_PITCH = 0x8;
    var DDSD_PIXELFORMAT = 0x1000;
    var DDSD_MIPMAPCOUNT = 0x20000;
    var DDSD_LINEARSIZE = 0x80000;
    var DDSD_DEPTH = 0x800000;

    var DDSCAPS_COMPLEX = 0x8;
    var DDSCAPS_MIPMAP = 0x400000;
    var DDSCAPS_TEXTURE = 0x1000;

    var DDSCAPS2_CUBEMAP = 0x200;
    var DDSCAPS2_CUBEMAP_POSITIVEX = 0x400;
    var DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800;
    var DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000;
    var DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000;
    var DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000;
    var DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000;
    var DDSCAPS2_VOLUME = 0x200000;

    var DDPF_ALPHAPIXELS = 0x1;
    var DDPF_ALPHA = 0x2;
    var DDPF_FOURCC = 0x4;
    var DDPF_RGB = 0x40;
    var DDPF_YUV = 0x200;
    var DDPF_LUMINANCE = 0x20000;

    function fourCCToInt32(value) {
        return value.charCodeAt(0) +
            (value.charCodeAt(1) << 8) +
            (value.charCodeAt(2) << 16) +
            (value.charCodeAt(3) << 24);
    }

    function int32ToFourCC(value) {
        return String.fromCharCode(
            value & 0xff,
            (value >> 8) & 0xff,
            (value >> 16) & 0xff,
            (value >> 24) & 0xff
        );
    }

    var headerLengthInt = 31; // The header length in 32 bit ints

    var FOURCC_DXT1 = fourCCToInt32('DXT1');
    var FOURCC_DXT3 = fourCCToInt32('DXT3');
    var FOURCC_DXT5 = fourCCToInt32('DXT5');
     // Offsets into the header array
    var off_magic = 0;

    var off_size = 1;
    var off_flags = 2;
    var off_height = 3;
    var off_width = 4;

    var off_mipmapCount = 7;

    var off_pfFlags = 20;
    var off_pfFourCC = 21;

    var off_caps = 27;
    var off_caps2 = 28;
    var off_caps3 = 29;
    var off_caps4 = 30;

    var ret = {
        parse: function(arrayBuffer, out) {
            var header = new Int32Array(arrayBuffer, 0, headerLengthInt);
            if (header[off_magic] !== DDS_MAGIC) {
                return null;
            }
            if (!header(off_pfFlags) & DDPF_FOURCC) {
                return null;
            }

            var fourCC = header(off_pfFourCC);
            var width = header[off_width];
            var height = header[off_height];
            var isCubeMap = header[off_caps2] & DDSCAPS2_CUBEMAP;
            var hasMipmap = header[off_flags] & DDSD_MIPMAPCOUNT;
            var blockBytes, internalFormat;
            switch(fourCC) {
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
            var dataOffset = header[off_size] + 4;
            // TODO: Suppose all face are existed
            var faceNumber = isCubeMap ? 6 : 1;
            var mipmapCount = 1;
            if (hasMipmap) {
                mipmapCount = Math.max(1, header[off_mipmapCount]);
            }

            var textures = [];
            for (var f = 0; f < faceNumber; f++) {
                var _width = width;
                var _height = height;
                textures[f] = new Texture2D({
                    width : _width,
                    height : _height,
                    format : internalFormat
                });
                var mipmaps = [];
                for (var i = 0; i < mipmapCount; i++) {
                    var dataLength = Math.max(4, _width) / 4 * Math.max(4, _height) / 4 * blockBytes;
                    var byteArray = new Uint8Array(arrayBuffer, dataOffset, dataLength);

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

    return ret;
});