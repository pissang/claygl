define(function(require) {

    var Texture = require('./Texture');
    var glinfo = require('./core/glinfo');
    var glenum = require('./core/glenum');

    /**
     * @constructor qtek.Texture2D
     * @extends qtek.Texture
     *
     * @example
     *     ...
     *     var mat = new qtek.Material({
     *         shader: qtek.shader.library.get('buildin.phong', 'diffuseMap')
     *     });
     *     var diffuseMap = new qtek.Texture2D();
     *     diffuseMap.load('assets/textures/diffuse.jpg');
     *     mat.set('diffuseMap', diffuseMap);
     *     ...
     *     diffuseMap.success(function() {
     *         // Wait for the diffuse texture loaded
     *         animation.on('frame', function(frameTime) {
     *             renderer.render(scene, camera);
     *         });
     *     });
     */
    var Texture2D = Texture.derive(function() {
        return /** @lends qtek.Texture2D# */ {
            /**
             * @type {HTMLImageElement|HTMLCanvasElemnet}
             */
            image: null,
            /**
             * @type {Uint8Array|Float32Array}
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
            mipmaps: []
        };
    }, {
        update: function(_gl) {

            _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));
            
            this.beforeUpdate( _gl);

            var glFormat = this.format;
            var glType = this.type;

            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, this.wrapS);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, this.wrapT);

            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, this.magFilter);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, this.minFilter);
            
            var anisotropicExt = glinfo.getExtension(_gl, 'EXT_texture_filter_anisotropic');
            if (anisotropicExt && this.anisotropic > 1) {
                _gl.texParameterf(_gl.TEXTURE_2D, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
            }

            // Fallback to float type if browser don't have half float extension
            if (glType === 36193) {
                var halfFloatExt = glinfo.getExtension(_gl, 'OES_texture_half_float');
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

                if (this.useMipmap && !this.NPOT) {
                    _gl.generateMipmap(_gl.TEXTURE_2D);
                }
            }

            _gl.bindTexture(_gl.TEXTURE_2D, null);
        },

        _updateTextureData: function (_gl, data, level, width, height, glFormat, glType) {
            if (data.image) {
                _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, glFormat, glType, data.image);
            }
            else {
                // Can be used as a blank texture when writing render to texture(RTT)
                if (
                    glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT 
                    && glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT
                ) {
                    _gl.compressedTexImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, data.pixels);
                } else {
                    _gl.texImage2D(_gl.TEXTURE_2D, level, glFormat, width, height, 0, glFormat, glType, data.pixels);
                }
            }
        },

        /**
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.Texture2D.prototype
         */
        generateMipmap: function(_gl) {
            if (this.useMipmap && !this.NPOT) {
                _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));
                _gl.generateMipmap(_gl.TEXTURE_2D);
            }
        },

        isPowerOfTwo: function() {
            var width;
            var height;
            if (this.image) {
                width = this.image.width;
                height = this.image.height;   
            } else {
                width = this.width;
                height = this.height;
            }
            return (width & (width-1)) === 0
                && (height & (height-1)) === 0;
        },

        isRenderable: function() {
            if (this.image) {
                return this.image.nodeName === 'CANVAS'
                    || this.image.nodeName === 'VIDEO'
                    || this.image.complete;
            } else {
                return this.width && this.height;
            }
        },

        bind: function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_2D, this.getWebGLTexture(_gl));
        },
        
        unbind: function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_2D, null);
        },
        
        load: function(src) {
            var image = new Image();
            var self = this;
            image.onload = function() {
                self.dirty();
                self.trigger('success', self);
                image.onload = null;
            };
            image.onerror = function() {
                self.trigger('error', self);
                image.onerror = null;
            };

            image.src = src;
            this.image = image;

            return this;
        }
    });

    return Texture2D;
});