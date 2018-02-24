/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
import Base from './core/Base';
import glenum from './core/glenum';
import Cache from './core/Cache';

/**
 * @constructor
 * @alias clay.Texture
 * @extends clay.core.Base
 */
var Texture = Base.extend( /** @lends clay.Texture# */ {
    /**
     * Texture width, readonly when the texture source is image
     * @type {number}
     */
    width: 512,
    /**
     * Texture height, readonly when the texture source is image
     * @type {number}
     */
    height: 512,
    /**
     * Texel data type.
     * Possible values:
     *  + {@link clay.Texture.UNSIGNED_BYTE}
     *  + {@link clay.Texture.HALF_FLOAT}
     *  + {@link clay.Texture.FLOAT}
     *  + {@link clay.Texture.UNSIGNED_INT_24_8_WEBGL}
     *  + {@link clay.Texture.UNSIGNED_INT}
     * @type {number}
     */
    type: glenum.UNSIGNED_BYTE,
    /**
     * Format of texel data
     * Possible values:
     *  + {@link clay.Texture.RGBA}
     *  + {@link clay.Texture.DEPTH_COMPONENT}
     *  + {@link clay.Texture.DEPTH_STENCIL}
     * @type {number}
     */
    format: glenum.RGBA,
    /**
     * Texture wrap. Default to be REPEAT.
     * Possible values:
     *  + {@link clay.Texture.CLAMP_TO_EDGE}
     *  + {@link clay.Texture.REPEAT}
     *  + {@link clay.Texture.MIRRORED_REPEAT}
     * @type {number}
     */
    wrapS: glenum.REPEAT,
    /**
     * Texture wrap. Default to be REPEAT.
     * Possible values:
     *  + {@link clay.Texture.CLAMP_TO_EDGE}
     *  + {@link clay.Texture.REPEAT}
     *  + {@link clay.Texture.MIRRORED_REPEAT}
     * @type {number}
     */
    wrapT: glenum.REPEAT,
    /**
     * Possible values:
     *  + {@link clay.Texture.NEAREST}
     *  + {@link clay.Texture.LINEAR}
     *  + {@link clay.Texture.NEAREST_MIPMAP_NEAREST}
     *  + {@link clay.Texture.LINEAR_MIPMAP_NEAREST}
     *  + {@link clay.Texture.NEAREST_MIPMAP_LINEAR}
     *  + {@link clay.Texture.LINEAR_MIPMAP_LINEAR}
     * @type {number}
     */
    minFilter: glenum.LINEAR_MIPMAP_LINEAR,
    /**
     * Possible values:
     *  + {@link clay.Texture.NEAREST}
     *  + {@link clay.Texture.LINEAR}
     * @type {number}
     */
    magFilter: glenum.LINEAR,
    /**
     * If enable mimap.
     * @type {boolean}
     */
    useMipmap: true,

    /**
     * Anisotropic filtering, enabled if value is larger than 1
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic
     * @type {number}
     */
    anisotropic: 1,
    // pixelStorei parameters, not available when texture is used as render target
    // http://www.khronos.org/opengles/sdk/docs/man/xhtml/glPixelStorei.xml
    /**
     * If flip in y axis for given image source
     * @type {boolean}
     * @default true
     */
    flipY: true,

    /**
     * A flag to indicate if texture source is sRGB
     */
    sRGB: true,
    /**
     * @type {number}
     * @default 4
     */
    unpackAlignment: 4,
    /**
     * @type {boolean}
     * @default false
     */
    premultiplyAlpha: false,

    /**
     * Dynamic option for texture like video
     * @type {boolean}
     */
    dynamic: false,

    NPOT: false,

    // PENDING
    // Init it here to avoid deoptimization when it's assigned in application dynamically
    __used: 0

}, function () {
    this._cache = new Cache();
},
/** @lends clay.Texture.prototype */
{

    getWebGLTexture: function (renderer) {
        var _gl = renderer.gl;
        var cache = this._cache;
        cache.use(renderer.__uid__);

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

        var sRGBExt = renderer.getGLExtension('EXT_sRGB');
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
            if (minFilter === glenum.NEAREST_MIPMAP_NEAREST ||
                minFilter === glenum.NEAREST_MIPMAP_LINEAR
            ) {
                return glenum.NEAREST;
            }
            else if (minFilter === glenum.LINEAR_MIPMAP_LINEAR ||
                minFilter === glenum.LINEAR_MIPMAP_NEAREST
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
     * @param  {clay.Renderer} renderer
     */
    dispose: function (renderer) {

        var cache = this._cache;

        cache.use(renderer.__uid__);

        var webglTexture = cache.get('webgl_texture');
        if (webglTexture){
            renderer.gl.deleteTexture(webglTexture);
        }
        cache.deleteContext(renderer.__uid__);

    },
    /**
     * Test if image of texture is valid and loaded.
     * @return {boolean}
     */
    isRenderable: function () {},

    /**
     * Test if texture size is power of two
     * @return {boolean}
     */
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

/**
 * @type {number}
 */
Texture.BYTE = glenum.BYTE;
/**
 * @type {number}
 */
Texture.UNSIGNED_BYTE = glenum.UNSIGNED_BYTE;
/**
 * @type {number}
 */
Texture.SHORT = glenum.SHORT;
/**
 * @type {number}
 */
Texture.UNSIGNED_SHORT = glenum.UNSIGNED_SHORT;
/**
 * @type {number}
 */
Texture.INT = glenum.INT;
/**
 * @type {number}
 */
Texture.UNSIGNED_INT = glenum.UNSIGNED_INT;
/**
 * @type {number}
 */
Texture.FLOAT = glenum.FLOAT;
/**
 * @type {number}
 */
Texture.HALF_FLOAT = 0x8D61;

/**
 * UNSIGNED_INT_24_8_WEBGL for WEBGL_depth_texture extension
 * @type {number}
 */
Texture.UNSIGNED_INT_24_8_WEBGL = 34042;

/* PixelFormat */
/**
 * @type {number}
 */
Texture.DEPTH_COMPONENT = glenum.DEPTH_COMPONENT;
/**
 * @type {number}
 */
Texture.DEPTH_STENCIL = glenum.DEPTH_STENCIL;
/**
 * @type {number}
 */
Texture.ALPHA = glenum.ALPHA;
/**
 * @type {number}
 */
Texture.RGB = glenum.RGB;
/**
 * @type {number}
 */
Texture.RGBA = glenum.RGBA;
/**
 * @type {number}
 */
Texture.LUMINANCE = glenum.LUMINANCE;
/**
 * @type {number}
 */
Texture.LUMINANCE_ALPHA = glenum.LUMINANCE_ALPHA;

/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 * @type {number}
 */
Texture.SRGB = 0x8C40;
/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 * @type {number}
 */
Texture.SRGB_ALPHA = 0x8C42;

/* Compressed Texture */
Texture.COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
Texture.COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83F1;
Texture.COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83F2;
Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83F3;

/* TextureMagFilter */
/**
 * @type {number}
 */
Texture.NEAREST = glenum.NEAREST;
/**
 * @type {number}
 */
Texture.LINEAR = glenum.LINEAR;

/* TextureMinFilter */
/**
 * @type {number}
 */
Texture.NEAREST_MIPMAP_NEAREST = glenum.NEAREST_MIPMAP_NEAREST;
/**
 * @type {number}
 */
Texture.LINEAR_MIPMAP_NEAREST = glenum.LINEAR_MIPMAP_NEAREST;
/**
 * @type {number}
 */
Texture.NEAREST_MIPMAP_LINEAR = glenum.NEAREST_MIPMAP_LINEAR;
/**
 * @type {number}
 */
Texture.LINEAR_MIPMAP_LINEAR = glenum.LINEAR_MIPMAP_LINEAR;

/* TextureWrapMode */
/**
 * @type {number}
 */
Texture.REPEAT = glenum.REPEAT;
/**
 * @type {number}
 */
Texture.CLAMP_TO_EDGE = glenum.CLAMP_TO_EDGE;
/**
 * @type {number}
 */
Texture.MIRRORED_REPEAT = glenum.MIRRORED_REPEAT;


export default Texture;
