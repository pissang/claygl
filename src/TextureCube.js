define(function(require) {

    var Texture = require('./Texture');
    var glinfo = require('./core/glinfo');
    var glenum = require('./core/glenum');
    var util = require('./core/util');

    var targetList = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

    /**
     * @constructor qtek.TextureCube
     * @extends qtek.Texture
     *
     * @example
     *     ...
     *     var mat = new qtek.Material({
     *         shader: qtek.shader.library.get('buildin.phong', 'environmentMap')
     *     });
     *     var envMap = new qtek.TextureCube();
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
     *     envMap.success(function() {
     *         // Wait for the sky texture loaded
     *         animation.on('frame', function(frameTime) {
     *             renderer.render(scene, camera);
     *         });
     *     });
     */
    var TextureCube = Texture.derive(function() {
        return /** @lends qtek.TextureCube# */{
            /**
             * @type {Object}
             * @property {HTMLImageElement|HTMLCanvasElemnet} px
             * @property {HTMLImageElement|HTMLCanvasElemnet} nx
             * @property {HTMLImageElement|HTMLCanvasElemnet} py
             * @property {HTMLImageElement|HTMLCanvasElemnet} ny
             * @property {HTMLImageElement|HTMLCanvasElemnet} pz
             * @property {HTMLImageElement|HTMLCanvasElemnet} nz
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
             * @type {Object}
             * @property {Uint8Array} px
             * @property {Uint8Array} nx
             * @property {Uint8Array} py
             * @property {Uint8Array} ny
             * @property {Uint8Array} pz
             * @property {Uint8Array} nz
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
        update: function(_gl) {

            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));

            this.beforeUpdate(_gl);

            var glFormat = this.format;
            var glType = this.type;

            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, this.wrapS);
            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, this.wrapT);

            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, this.magFilter);
            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, this.minFilter);
            
            var anisotropicExt = glinfo.getExtension(_gl, 'EXT_texture_filter_anisotropic');
            if (anisotropicExt && this.anisotropic > 1) {
                _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
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
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.TextureCube.prototype
         */
        generateMipmap: function(_gl) {
            if (this.useMipmap && !this.NPOT) {
                _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this._cache.get('webgl_texture'));
                _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
            }
        },

        bind: function(_gl) {

            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(_gl));
        },

        unbind: function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);
        },

        // Overwrite the isPowerOfTwo method
        isPowerOfTwo: function() {
            if (this.image.px) {
                return isPowerOfTwo(this.image.px.width)
                    && isPowerOfTwo(this.image.px.height);
            } else {
                return isPowerOfTwo(this.width)
                    && isPowerOfTwo(this.height);
            }

            function isPowerOfTwo(value) {
                return (value & (value-1)) === 0;
            }
        },

        isRenderable: function() {
            if (this.image.px) {
                return isImageRenderable(this.image.px)
                    && isImageRenderable(this.image.nx)
                    && isImageRenderable(this.image.py)
                    && isImageRenderable(this.image.ny)
                    && isImageRenderable(this.image.pz)
                    && isImageRenderable(this.image.nz);
            } else {
                return this.width && this.height;
            }
        },

        load: function(imageList) {
            var loading = 0;
            var self = this;
            util.each(imageList, function(src, target){
                var image = new Image();
                image.onload = function() {
                    loading --;
                    if (loading === 0){
                        self.dirty();
                        self.trigger('success', self);
                    }
                    image.onload = null;
                };
                image.onerror = function() {
                    loading --;
                    image.onerror = null;
                };
                
                loading++;
                image.src = src;
                self.image[target] = image;
            });

            return this;
        }
    });

    function isImageRenderable(image) {
        return image.nodeName === 'CANVAS' ||
                image.nodeName === 'VIDEO' ||
                image.complete;
    }

    return TextureCube;
});