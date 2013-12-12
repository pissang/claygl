define(function(require) {

    var Texture = require('../Texture');
    var WebGLInfo = require('../WebGLInfo');
    var _ = require('_');

    var targetMap = {
        'px' : 'TEXTURE_CUBE_MAP_POSITIVE_X',
        'py' : 'TEXTURE_CUBE_MAP_POSITIVE_Y',
        'pz' : 'TEXTURE_CUBE_MAP_POSITIVE_Z',
        'nx' : 'TEXTURE_CUBE_MAP_NEGATIVE_X',
        'ny' : 'TEXTURE_CUBE_MAP_NEGATIVE_Y',
        'nz' : 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
    }

    var TextureCube = Texture.derive(function() {
        return {
            image : {
                px : null,
                nx : null,
                py : null,
                ny : null,
                pz : null,
                nz : null
            },
            pixels : {
                px : null,
                nx : null,
                py : null,
                ny : null,
                pz : null,
                nz : null
            }
       }
    }, {
        update : function(_gl) {

            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this.cache.get("webgl_texture"));

            this.beforeUpdate(_gl);

            var glFormat = this.format;
            var glType = this.type;

            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, this.wrapS);
            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, this.wrapT);

            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, this.magFilter);
            _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, this.minFilter);
            
            var anisotropicExt = WebGLInfo.getExtension(_gl, "EXT_texture_filter_anisotropic");
            if (anisotropicExt && this.anisotropic > 1) {
                _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
            }

            for (var target in this.image) {
                var img = this.image[target];
                if (img) {
                    _gl.texImage2D(_gl[targetMap[target]], 0, glFormat, glFormat, glType, img);
                }
                else {
                    _gl.texImage2D(_gl[targetMap[target]], 0, glFormat, this.width, this.height, 0, glFormat, glType, this.pixels[target]);
                }
            }

            if (!this.NPOT && this.useMipmap) {
                _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);
            }

            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);
        },
        generateMipmap : function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this.cache.get("webgl_texture"));
            _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);    
        },
        bind : function(_gl) {

            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(_gl));
        },
        unbind : function(_gl) {
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);
        },
        // Overwrite the isPowerOfTwo method
        isPowerOfTwo : function() {
            if (this.image.px) {
                return (this.image.px.width === this.image.px.height)
                        && isPowerOfTwo(this.image.px.width)
                        && isPowerOfTwo(this.image.px.height);
            } else {
                return (this.width === this.height)
                        && isPowerOfTwo(this.width)
                        && isPowerOfTwo(this.height);
            }

            function isPowerOfTwo(value) {
                return value & (value-1) === 0
            }
        },
        isRenderable : function() {
            if (this.image.px) {
                return isImageRenderable(this.image.px) &&
                       isImageRenderable(this.image.nx) &&
                       isImageRenderable(this.image.py) &&
                       isImageRenderable(this.image.ny) &&
                       isImageRenderable(this.image.pz) &&
                       isImageRenderable(this.image.nz);
            } else {
                return this.width && this.height;
            }
        },
        load : function(imageList) {
            var loading = 0;
            var self = this;
            _.each(imageList, function(src, target){
                var image = new Image();
                image.onload = function() {
                    loading --;
                    if (loading === 0){
                        self.dirty();
                        self.trigger("success", self);
                    }
                    image.onload = null;
                }
                image.onerror = function() {
                    loading --;
                    image.onerror = null;
                }
                
                loading++;
                image.src = src;
                self.image[target] = image;
            });
        }
    });

    function isImageRenderable(image) {
        return image.nodeName === "CANVAS" ||
                image.complete;
    }

    return TextureCube;
})