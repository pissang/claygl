/**
 * Base class for all textures like compressed texture, texture2d, texturecube
 * TODO mapping
 */
define(function(require) {

    'use strict';

    var Base = require('./core/Base');
    var glenum = require('./core/glenum');
    var Cache = require('./core/Cache');

    /**
     * @constructor qtek.Texture
     * @extends qtek.core.Base
     */
    var Texture = Base.derive(
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
        wrapS: glenum.CLAMP_TO_EDGE,
        /**
         * @type {number}
         */
        wrapT: glenum.CLAMP_TO_EDGE,
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
        // pixelStorei parameters
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
    }, function() {
        this._cache = new Cache();
    },
    /** @lends qtek.Texture.prototype */
    {

        getWebGLTexture: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);

            if (cache.miss('webgl_texture')) {
                // In a new gl context, create new texture and set dirty true
                cache.put('webgl_texture', _gl.createTexture());
            }
            if (this.dynamic) {
                this.update(_gl);
            }
            else if (cache.isDirty()) {
                this.update(_gl);
                cache.fresh();
            }

            return cache.get('webgl_texture');
        },

        bind: function() {},
        unbind: function() {},
        
        /**
         * Mark texture is dirty and update in the next frame
         */
        dirty: function() {
            this._cache.dirtyAll();
        },

        update: function(_gl) {},

        // Update the common parameters of texture
        beforeUpdate: function(_gl) {
            _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
            _gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
            _gl.pixelStorei(_gl.UNPACK_ALIGNMENT, this.unpackAlignment);

            this.fallBack();
        },

        fallBack: function() {
            // Use of none-power of two texture
            // http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
            
            var isPowerOfTwo = this.isPowerOfTwo();

            if (this.format === glenum.DEPTH_COMPONENT) {
                this.useMipmap = false;
            }

            if (! isPowerOfTwo || ! this.useMipmap) {
                // none-power of two flag
                this.NPOT = true;
                // Save the original value for restore
                this._minFilterOriginal = this.minFilter;
                this._magFilterOriginal = this.magFilter;
                this._wrapSOriginal = this.wrapS;
                this._wrapTOriginal = this.wrapT;

                if (this.minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
                    this.minFilter == glenum.NEAREST_MIPMAP_LINEAR) {
                    this.minFilter = glenum.NEAREST;
                } else if (
                    this.minFilter == glenum.LINEAR_MIPMAP_LINEAR ||
                    this.minFilter == glenum.LINEAR_MIPMAP_NEAREST
                ) {
                    this.minFilter = glenum.LINEAR;
                }

                this.wrapS = glenum.CLAMP_TO_EDGE;
                this.wrapT = glenum.CLAMP_TO_EDGE;
            } else {
                this.NPOT = false;
                if (this._minFilterOriginal) {
                    this.minFilter = this._minFilterOriginal;
                }
                if (this._magFilterOriginal) {
                    this.magFilter = this._magFilterOriginal;
                }
                if (this._wrapSOriginal) {
                    this.wrapS = this._wrapSOriginal;
                }
                if (this._wrapTOriginal) {
                    this.wrapT = this._wrapTOriginal;
                }
            }

        },

        nextHighestPowerOfTwo: function(x) {
            --x;
            for (var i = 1; i < 32; i <<= 1) {
                x = x | x >> i;
            }
            return x + 1;
        },
        /**
         * @param  {WebGLRenderingContext} _gl
         */
        dispose: function(_gl) {
            var cache = this._cache;
            cache.use(_gl.__GLID__);

            var webglTexture = cache.get('webgl_texture');
            if (webglTexture){
                _gl.deleteTexture(webglTexture);
            }
            cache.deleteContext(_gl.__GLID__);
        },
        /**
         * Test if image of texture is valid and loaded.
         * @return {boolean}
         */
        isRenderable: function() {},
        
        isPowerOfTwo: function() {}
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
    
    /* PixelFormat */
    Texture.DEPTH_COMPONENT = glenum.DEPTH_COMPONENT;
    Texture.ALPHA = glenum.ALPHA;
    Texture.RGB = glenum.RGB;
    Texture.RGBA = glenum.RGBA;
    Texture.LUMINANCE = glenum.LUMINANCE;
    Texture.LUMINANCE_ALPHA = glenum.LUMINANCE_ALPHA;

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
    Texture.TEXTURE_MAG_FILTER = glenum.TEXTURE_MAG_FILTER;
    Texture.TEXTURE_MIN_FILTER = glenum.TEXTURE_MIN_FILTER;

    /* TextureWrapMode */
    Texture.REPEAT = glenum.REPEAT;
    Texture.CLAMP_TO_EDGE = glenum.CLAMP_TO_EDGE;
    Texture.MIRRORED_REPEAT = glenum.MIRRORED_REPEAT;


    return Texture;
});