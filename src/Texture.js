/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
import Base from './core/Base';
import glenum from './core/glenum';
import Cache from './core/Cache';

/**
 * @constructor qtek.Texture
 * @extends qtek.core.Base
 */
var Texture = Base.extend(
/** @lends qtek.Texture# */
{
    /**
     * Texture width, only needed when the texture is used as a render target
     * @type {number}
     */
    width: 512,
    /**
     * Texture height, only needed when the texture is used as a render target
     * @type {number}
     */
    height: 512,
    /**
     * Texel data type
     * @type {number}
     */
    type: glenum.UNSIGNED_BYTE,
    /**
     * Format of texel data
     * @type {number}
     */
    format: glenum.RGBA,
    /**
     * @type {number}
     */
    wrapS: glenum.REPEAT,
    /**
     * @type {number}
     */
    wrapT: glenum.REPEAT,
    /**
     * @type {number}
     */
    minFilter: glenum.LINEAR_MIPMAP_LINEAR,
    /**
     * @type {number}
     */
    magFilter: glenum.LINEAR,
    /**
     * @type {boolean}
     */
    useMipmap: true,

    /**
     * Anisotropic filtering, enabled if value is larger than 1
     * @see http://blog.tojicode.com/2012/03/anisotropic-filtering-in-webgl.html
     * @type {number}
     */
    anisotropic: 1,
    // pixelStorei parameters, not available when texture is used as render target
    // http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml
    /**
     * @type {boolean}
     */
    flipY: true,
    /**
     * @type {number}
     */
    unpackAlignment: 4,
    /**
     * @type {boolean}
     */
    premultiplyAlpha: false,

    /**
     * Dynamic option for texture like video
     * @type {boolean}
     */
    dynamic: false,

    NPOT: false
}, function () {
    this._cache = new Cache();
},
/** @lends qtek.Texture.prototype */
{

    getWebGLTexture: function (renderer) {
        var _gl = renderer.gl;
        var cache = this._cache;
        cache.use(renderer.__GUID__);

        if (cache.miss('webgl_texture')) {
            // In a new gl context, create new texture and set dirty true
            cache.put('webgl_texture', _gl.createTexture());
        }
        if (this.dynamic) {
            this.update(renderer);
        }
        else if (cache.isDirty()) {
            this.update(renderer);
            cache.fresh();
        }

        return cache.get('webgl_texture');
    },

    bind: function () {},
    unbind: function () {},

    /**
     * Mark texture is dirty and update in the next frame
     */
    dirty: function () {
        if (this._cache) {
            this._cache.dirtyAll();
        }
    },

    update: function (renderer) {},

    // Update the common parameters of texture
    updateCommon: function (renderer) {
        var _gl = renderer.gl;
        _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, this.unpackAlignment);

        // Use of none-power of two texture
        // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
        if (this.format === glenum.DEPTH_COMPONENT) {
            this.useMipmap = false;
        }

        var sRGBExt = renderer.getGLExtension( 'EXT_sRGB');
        // Fallback
        if (this.format === Texture.SRGB && !sRGBExt) {
            this.format = Texture.RGB;
        }
        if (this.format === Texture.SRGB_ALPHA && !sRGBExt) {
            this.format = Texture.RGBA;
        }

        this.NPOT = !this.isPowerOfTwo();
    },

    getAvailableWrapS: function () {
        if (this.NPOT) {
            return glenum.CLAMP_TO_EDGE;
        }
        return this.wrapS;
    },
    getAvailableWrapT: function () {
        if (this.NPOT) {
            return glenum.CLAMP_TO_EDGE;
        }
        return this.wrapT;
    },
    getAvailableMinFilter: function () {
        var minFilter = this.minFilter;
        if (this.NPOT || !this.useMipmap) {
            if (minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
                minFilter == glenum.NEAREST_MIPMAP_LINEAR
            ) {
                return glenum.NEAREST;
            }
            else if (minFilter == glenum.LINEAR_MIPMAP_LINEAR ||
                minFilter == glenum.LINEAR_MIPMAP_NEAREST
            ) {
                return glenum.LINEAR;
            }
            else {
                return minFilter;
            }
        }
        else {
            return minFilter;
        }
    },
    getAvailableMagFilter: function () {
        return this.magFilter;
    },

    nextHighestPowerOfTwo: function (x) {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    },
    /**
     * @param  {qtek.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__GUID__);

        var webglTexture = cache.get('webgl_texture');
        if (webglTexture){
            renderer.gl.deleteTexture(webglTexture);
        }
        cache.deleteContext(renderer.__GUID__);

    },
    /**
     * Test if image of texture is valid and loaded.
     * @return {boolean}
     */
    isRenderable: function () {},

    isPowerOfTwo: function () {}
});

Object.defineProperty(Texture.prototype, 'width', {
    get: function () {
        return this._width;
    },
    set: function (value) {
        this._width = value;
    }
});
Object.defineProperty(Texture.prototype, 'height', {
    get: function () {
        return this._height;
    },
    set: function (value) {
        this._height = value;
    }
});

/* DataType */
Texture.BYTE = glenum.BYTE;
Texture.UNSIGNED_BYTE = glenum.UNSIGNED_BYTE;
Texture.SHORT = glenum.SHORT;
Texture.UNSIGNED_SHORT = glenum.UNSIGNED_SHORT;
Texture.INT = glenum.INT;
Texture.UNSIGNED_INT = glenum.UNSIGNED_INT;
Texture.FLOAT = glenum.FLOAT;
Texture.HALF_FLOAT = 0x8D61;

// ext.UNSIGNED_INT_24_8_WEBGL for WEBGL_depth_texture extension
Texture.UNSIGNED_INT_24_8_WEBGL = 34042;

/* PixelFormat */
Texture.DEPTH_COMPONENT = glenum.DEPTH_COMPONENT;
Texture.DEPTH_STENCIL = glenum.DEPTH_STENCIL;
Texture.ALPHA = glenum.ALPHA;
Texture.RGB = glenum.RGB;
Texture.RGBA = glenum.RGBA;
Texture.LUMINANCE = glenum.LUMINANCE;
Texture.LUMINANCE_ALPHA = glenum.LUMINANCE_ALPHA;

// https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
Texture.SRGB = 0x8C40;
Texture.SRGB_ALPHA = 0x8C42;

/* Compressed Texture */
Texture.COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
Texture.COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
Texture.COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

/* TextureMagFilter */
Texture.NEAREST = glenum.NEAREST;
Texture.LINEAR = glenum.LINEAR;

/* TextureMinFilter */
/*      NEAREST */
/*      LINEAR */
Texture.NEAREST_MIPMAP_NEAREST = glenum.NEAREST_MIPMAP_NEAREST;
Texture.LINEAR_MIPMAP_NEAREST = glenum.LINEAR_MIPMAP_NEAREST;
Texture.NEAREST_MIPMAP_LINEAR = glenum.NEAREST_MIPMAP_LINEAR;
Texture.LINEAR_MIPMAP_LINEAR = glenum.LINEAR_MIPMAP_LINEAR;

/* TextureParameterName */
// Texture.TEXTURE_MAG_FILTER = glenum.TEXTURE_MAG_FILTER;
// Texture.TEXTURE_MIN_FILTER = glenum.TEXTURE_MIN_FILTER;

/* TextureWrapMode */
Texture.REPEAT = glenum.REPEAT;
Texture.CLAMP_TO_EDGE = glenum.CLAMP_TO_EDGE;
Texture.MIRRORED_REPEAT = glenum.MIRRORED_REPEAT;


export default Texture;
