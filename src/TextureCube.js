import Texture from './Texture';
import glenum from './core/glenum';
import util from './core/util';
import mathUtil from './math/util';
import vendor from './core/vendor';
var isPowerOfTwo = mathUtil.isPowerOfTwo;

var targetList = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

/**
 * @constructor clay.TextureCube
 * @extends clay.Texture
 *
 * @example
 *     ...
 *     var mat = new clay.Material({
 *         shader: clay.shader.library.get('clay.phong', 'environmentMap')
 *     });
 *     var envMap = new clay.TextureCube();
 *     envMap.load({
 *         'px': 'assets/textures/sky/px.jpg',
 *         'nx': 'assets/textures/sky/nx.jpg'
 *         'py': 'assets/textures/sky/py.jpg'
 *         'ny': 'assets/textures/sky/ny.jpg'
 *         'pz': 'assets/textures/sky/pz.jpg'
 *         'nz': 'assets/textures/sky/nz.jpg'
 *     });
 *     mat.set('environmentMap', envMap);
 *     ...
 *     envMap.success(function () {
 *         // Wait for the sky texture loaded
 *         animation.on('frame', function (frameTime) {
 *             renderer.render(scene, camera);
 *         });
 *     });
 */
var TextureCube = Texture.extend(function () {
    return /** @lends clay.TextureCube# */{

        /**
         * @type {boolean}
         * @default false
         */
        // PENDING cubemap should not flipY in default.
        // flipY: false,

        /**
         * @type {Object}
         * @property {?HTMLImageElement|HTMLCanvasElemnet} px
         * @property {?HTMLImageElement|HTMLCanvasElemnet} nx
         * @property {?HTMLImageElement|HTMLCanvasElemnet} py
         * @property {?HTMLImageElement|HTMLCanvasElemnet} ny
         * @property {?HTMLImageElement|HTMLCanvasElemnet} pz
         * @property {?HTMLImageElement|HTMLCanvasElemnet} nz
         */
        image: {
            px: null,
            nx: null,
            py: null,
            ny: null,
            pz: null,
            nz: null
        },
        /**
         * Pixels data of each side. Will be ignored if images are set.
         * @type {Object}
         * @property {?Uint8Array} px
         * @property {?Uint8Array} nx
         * @property {?Uint8Array} py
         * @property {?Uint8Array} ny
         * @property {?Uint8Array} pz
         * @property {?Uint8Array} nz
         */
        pixels: {
            px: null,
            nx: null,
            py: null,
            ny: null,
            pz: null,
            nz: null
        },

        /**
         * @type {Array.<Object>}
         */
        mipmaps: []
    };
}, {

    textureType: 'textureCube',

    update: function (renderer) {
        var _gl = renderer.gl;
        _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));

        this.updateCommon(renderer);

        var glFormat = this.format;
        var glType = this.type;

        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, this.getAvailableWrapS());
        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, this.getAvailableWrapT());

        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, this.getAvailableMagFilter());
        _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, this.getAvailableMinFilter());

        var anisotropicExt = renderer.getGLExtension('EXT_texture_filter_anisotropic');
        if (anisotropicExt && this.anisotropic > 1) {
            _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
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
                this._updateTextureData(_gl, mipmap, i, width, height, glFormat, glType);
                width /= 2;
                height /= 2;
            }
        }
        else {
            this._updateTextureData(_gl, this, 0, this.width, this.height, glFormat, glType);

            if (!this.NPOT && this.useMipmap) {
                _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
            }
        }

        _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);
    },

    _updateTextureData: function (_gl, data, level, width, height, glFormat, glType) {
        for (var i = 0; i < 6; i++) {
            var target = targetList[i];
            var img = data.image && data.image[target];
            if (img) {
                _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, glFormat, glFormat, glType, img);
            }
            else {
                _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, glFormat, width, height, 0, glFormat, glType, data.pixels && data.pixels[target]);
            }
        }
    },

    /**
     * @param  {clay.Renderer} renderer
     * @memberOf clay.TextureCube.prototype
     */
    generateMipmap: function (renderer) {
        var _gl = renderer.gl;
        if (this.useMipmap && !this.NPOT) {
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));
            _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
        }
    },

    bind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(renderer));
    },

    unbind: function (renderer) {
        renderer.gl.bindTexture(renderer.gl.TEXTURE_CUBE_MAP, null);
    },

    // Overwrite the isPowerOfTwo method
    isPowerOfTwo: function () {
        if (this.image.px) {
            return isPowerOfTwo(this.image.px.width)
                && isPowerOfTwo(this.image.px.height);
        }
        else {
            return isPowerOfTwo(this.width)
                && isPowerOfTwo(this.height);
        }
    },

    isRenderable: function () {
        if (this.image.px) {
            return isImageRenderable(this.image.px)
                && isImageRenderable(this.image.nx)
                && isImageRenderable(this.image.py)
                && isImageRenderable(this.image.ny)
                && isImageRenderable(this.image.pz)
                && isImageRenderable(this.image.nz);
        }
        else {
            return !!(this.width && this.height);
        }
    },

    load: function (imageList, crossOrigin) {
        var loading = 0;
        var self = this;
        util.each(imageList, function (src, target){
            var image = vendor.createImage();
            if (crossOrigin) {
                image.crossOrigin = crossOrigin;
            }
            image.onload = function () {
                loading --;
                if (loading === 0){
                    self.dirty();
                    self.trigger('success', self);
                }
            };
            image.onerror = function () {
                loading --;
            };

            loading++;
            image.src = src;
            self.image[target] = image;
        });

        return this;
    }
});

Object.defineProperty(TextureCube.prototype, 'width', {
    get: function () {
        if (this.image && this.image.px) {
            return this.image.px.width;
        }
        return this._width;
    },
    set: function (value) {
        if (this.image && this.image.px) {
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
Object.defineProperty(TextureCube.prototype, 'height', {
    get: function () {
        if (this.image && this.image.px) {
            return this.image.px.height;
        }
        return this._height;
    },
    set: function (value) {
        if (this.image && this.image.px) {
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
function isImageRenderable(image) {
    return image.width > 0 && image.height > 0;
}

export default TextureCube;
