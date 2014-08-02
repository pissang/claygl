define(function(require) {

    var Texture = require('../Texture');
    var glinfo = require('../core/glinfo');
    var glenum = require('../core/glenum');

    /**
     * @constructor qtek.texture.Texture2D
     * @extends qtek.Texture
     *
     * @example
     *     ...
     *     var mat = new qtek.Material({
     *         shader: qtek.shader.library.get('buildin.phong', 'diffuseMap')
     *     });
     *     var diffuseMap = new qtek.texture.Texture2D();
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
        return /** @lends qtek.texture.Texture2D# */ {
            /**
             * @type {HTMLImageElement|HTMLCanvasElemnet}
             */
            image : null,
            /**
             * @type {Uint8Array}
             */
            pixels : null,
            /**
             * @type {Array.<Uint8Array>}
             */
            mipmaps : []
        };
    }, {
        update : function(_gl) {

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

            if (this.image) {
                _gl.texImage2D(_gl.TEXTURE_2D, 0, glFormat, glFormat, glType, this.image);
            }
            // Can be used as a blank texture when writing render to texture(RTT)
            else {
                if (
                    glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT 
                    && glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT
                ) {
                    _gl.compressedTexImage2D(_gl.TEXTURE_2D, 0, glFormat, this.width, this.height, 0, this.pixels);
                } else {
                    _gl.texImage2D(_gl.TEXTURE_2D, 0, glFormat, this.width, this.height, 0, glFormat, glType, this.pixels);
                }
            }
            if (this.useMipmap) {
                if (this.mipmaps.length) {
                    if (this.image) {
                        for (var i = 0; i < this.mipmaps.length; i++) {
                            if (this.mipmaps[i]) {
                                _gl.texImage2D(_gl.TEXTURE_2D, i, glFormat, glFormat, glType, this.mipmaps[i]);
                            }
                        }
                    } else if (this.pixels) {
                        var width = this.width;
                        var height = this.height;
                        for (var i = 0; i < this.mipmaps.length; i++) {
                            if (this.mipmaps[i]) {
                                if (
                                    glFormat <= Texture.COMPRESSED_RGBA_S3TC_DXT5_EXT
                                    && glFormat >= Texture.COMPRESSED_RGB_S3TC_DXT1_EXT
                                ) {
                                    _gl.compressedTexImage2D(_gl.TEXTURE_2D, 0, glFormat, width, height, 0, this.mipmaps[i]);
                                } else {
                                    _gl.texImage2D(_gl.TEXTURE_2D, i, glFormat, width, height, 0, glFormat, glType, this.mipmaps[i]);
                                }
                            }
                            width /= 2;
                            height /= 2;
                        }
                    }
                } else if (!this.NPOT && !this.mipmaps.length) {
                    _gl.generateMipmap(_gl.TEXTURE_2D);
                }
            }
            
            _gl.bindTexture(_gl.TEXTURE_2D, null);

        },
        /**
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.texture.Texture2D.prototype
         */
        generateMipmap : function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_2D, this._cache.get('webgl_texture'));
            _gl.generateMipmap(_gl.TEXTURE_2D);    
        },
        isPowerOfTwo : function() {
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

        isRenderable : function() {
            if (this.image) {
                return this.image.nodeName === 'CANVAS'
                    || this.image.complete;
            } else {
                return this.width && this.height;
            }
        },

        bind : function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_2D, this.getWebGLTexture(_gl));
        },
        
        unbind : function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_2D, null);
        },
        
        load : function(src) {
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