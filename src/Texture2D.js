import Texture from './Texture';
import glenum from './core/glenum';
import vendor from './core/vendor';
import mathUtil from './math/util';
var isPowerOfTwo = mathUtil.isPowerOfTwo;

function nearestPowerOfTwo(val) {
    return Math.pow(2, Math.round(Math.log(val) / Math.LN2));
}
function convertTextureToPowerOfTwo(texture, canvas) {
    // var canvas = document.createElement('canvas');
    var width = nearestPowerOfTwo(texture.width);
    var height = nearestPowerOfTwo(texture.height);
    canvas = canvas || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(texture.image, 0, 0, width, height);

    return canvas;
}

/**
 * @constructor clay.Texture2D
 * @extends clay.Texture
 *
 * @example
 *     ...
 *     var mat = new clay.Material({
 *         shader: clay.shader.library.get('clay.phong', 'diffuseMap')
 *     });
 *     var diffuseMap = new clay.Texture2D();
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
var Texture2D = Texture.extend(function () {
    return /** @lends clay.Texture2D# */ {
        /**
         * @type {?HTMLImageElement|HTMLCanvasElemnet}
         */
        // TODO mark dirty when assigned.
        image: null,
        /**
         * Pixels data. Will be ignored if image is set.
         * @type {?Uint8Array|Float32Array}
         */
        pixels: null,
        /**
         * @type {Array.<Object>}
         * @example
         *     [{
         *         image: mipmap0,
         *         pixels: null
         *     }, {
         *         image: mipmap1,
         *         pixels: null
         *     }, ....]
         */
        mipmaps: [],

        /**
         * If convert texture to power-of-two
         * @type {boolean}
         */
        convertToPOT: false
    };
}, {

    textureType: 'texture2D',

    update: function (renderer) {

        var _gl = renderer.gl;
        _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));

        this.updateCommon(renderer);

        var glFormat = this.format;
        var glType = this.type;

        // Convert to pot is only available when using image/canvas/video element.
        var convertToPOT = !!(this.convertToPOT
            && !this.mipmaps.length && this.image
            && (this.wrapS === Texture.REPEAT || this.wrapT === Texture.REPEAT)
            && this.NPOT
        );

        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, convertToPOT ? this.wrapS : this.getAvailableWrapS());
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, convertToPOT ? this.wrapT : this.getAvailableWrapT());

        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, convertToPOT ? this.magFilter : this.getAvailableMagFilter());
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, convertToPOT ? this.minFilter : this.getAvailableMinFilter());

        var anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt && this.anisotropic > 1) {
            _gl.texParameterf(_gl.TEXTURE_2D, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
        }

        // Fallback to float type if browser don't have half float extension
        if (glType === 36193) {
            var halfFloatExt = renderer.getGLExtension('OES_texture_half_float');
            if (!halfFloatExt) {
                glType = glenum.FLOAT;
            }
        }

        if (this.mipmaps.length) {
            var width = this.width;
            var height = this.height;
            for (var i = 0; i < this.mipmaps.length; i++) {
                var mipmap = this.mipmaps[i];
                this._updateTextureData(_gl, mipmap, i, width, height, glFormat, glType, false);
                width /= 2;
                height /= 2;
            }
        }
        else {
            this._updateTextureData(_gl, this, 0, this.width, this.height, glFormat, glType, convertToPOT);

            if (this.useMipmap && (!this.NPOT || convertToPOT)) {
                _gl.generateMipmap(_gl.TEXTURE_2D);
            }
        }

        _gl.bindTexture(_gl.TEXTURE_2D, null);
    },

    _updateTextureData: function (_gl, data, level, width, height, glFormat, glType, convertToPOT) {
        if (data.image) {
            var imgData = data.image;
            if (convertToPOT) {
                this._potCanvas = convertTextureToPowerOfTwo(this, this._potCanvas);
                imgData = this._potCanvas;
            }
            _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, glFormat, glType, imgData);
        }
        else {
            // Can be used as a blank texture when writing render to texture(RTT)
            if (
                glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT
                && glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT
            ) {
                _gl.compressedTexImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, data.pixels);
            }
            else {
                // Is a render target if pixels is null
                _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, glFormat, glType, data.pixels);
            }
        }
    },

    /**
     * @param  {clay.Renderer} renderer
     * @memberOf clay.Texture2D.prototype
     */
    generateMipmap: function (renderer) {
        var _gl = renderer.gl;
        if (this.useMipmap && !this.NPOT) {
            _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));
            _gl.generateMipmap(_gl.TEXTURE_2D);
        }
    },

    isPowerOfTwo: function () {
        return isPowerOfTwo(this.width) && isPowerOfTwo(this.height);
    },

    isRenderable: function () {
        if (this.image) {
            return this.image.width > 0 && this.image.height > 0;
        }
        else {
            return !!(this.width && this.height);
        }
    },

    bind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, this.getWebGLTexture(renderer));
    },

    unbind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, null);
    },

    load: function (src, crossOrigin) {
        var image = vendor.createImage();
        if (crossOrigin) {
            image.crossOrigin = crossOrigin;
        }
        var self = this;
        image.onload = function () {
            self.dirty();
            self.trigger('success', self);
        };
        image.onerror = function () {
            self.trigger('error', self);
        };

        image.src = src;
        this.image = image;

        return this;
    }
});

Object.defineProperty(Texture2D.prototype, 'width', {
    get: function () {
        if (this.image) {
            return this.image.width;
        }
        return this._width;
    },
    set: function (value) {
        if (this.image) {
            console.warn('Texture from image can\'t set width');
        }
        else {
            if (this._width !== value) {
                this.dirty();
            }
            this._width = value;
        }
    }
});
Object.defineProperty(Texture2D.prototype, 'height', {
    get: function () {
        if (this.image) {
            return this.image.height;
        }
        return this._height;
    },
    set: function (value) {
        if (this.image) {
            console.warn('Texture from image can\'t set height');
        }
        else {
            if (this._height !== value) {
                this.dirty();
            }
            this._height = value;
        }
    }
});

export default Texture2D;
