define(function(require) {

    var Base = require("./core/Base");
    var Shader = require("./Shader");
    var util = require("./core/util");
    var glenum = require("./core/glenum");
    var Texture = require('./Texture');
    var Texture2D = require('./texture/Texture2D');
    var TextureCube = require('./texture/TextureCube');

    _repository = [];

    var nameId = 0;

    var Material = Base.derive({
        name : 'MATERIAL_' + (nameId++),

        //{
        // type
        // value
        // semantic
        //}
        uniforms : null,

        shader : null,

        depthTest : true,
        depthMask : true,

        transparent : false,
        // Blend func is a callback function when the material 
        // have custom blending
        // The gl context will be the only argument passed in tho the
        // blend function
        // Detail of blend function in WebGL:
        // http://www.khronos.org/registry/gles/specs/2.0/es_full_spec_2.0.25.pdf
        //
        // Example :
        // function(_gl) {
        //  _gl.blendEquation(_gl.FUNC_ADD);
        //  _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);
        // }
        blend : null,

        // shadowTransparentMap : null

        _enabledUniforms : null,
    }, function() {
        if (this.shader) {
            this.attachShader(this.shader);
        }

        // Registory to repository
        _repository.push(this);

    }, {

        bind : function(_gl) {

            var slot = 0;

            // Set uniforms
            for (var u = 0; u < this._enabledUniforms.length; u++) {
                var symbol = this._enabledUniforms[u];
                var uniform = this.uniforms[symbol];
                if (uniform.value === undefined) {
                    console.warn('Uniform value "' + symbol + '" is undefined');
                    continue;
                }
                else if (uniform.value === null) {
                    continue;
                }
                else if (uniform.value instanceof Array
                    && ! uniform.value.length) {
                    continue;
                }
                else if (uniform.value instanceof Texture) {
                    var res = this.shader.setUniform(_gl, '1i', symbol, slot);
                    if (!res) { // Texture is not enabled
                        continue;
                    }
                    var texture = uniform.value;
                    _gl.activeTexture(_gl.TEXTURE0 + slot);
                    // Maybe texture is not loaded yet;
                    if (texture.isRenderable()) {
                        texture.bind(_gl);
                    } else {
                        // Bind texture to null
                        texture.unbind(_gl);
                    }

                    slot++;
                }
                else if (uniform.value instanceof Array) {
                    if (uniform.value.length === 0) {
                        continue;
                    }
                    // Texture Array
                    var exampleValue = uniform.value[0];

                    if (exampleValue instanceof Texture) {
                        if (!this.shader.hasUniform(symbol)) {
                            continue;
                        }

                        var arr = [];
                        for (var i = 0; i < uniform.value.length; i++) {
                            var texture = uniform.value[i];
                            _gl.activeTexture(_gl.TEXTURE0 + slot);
                            // Maybe texture is not loaded yet;
                            if (texture.isRenderable()) {
                                texture.bind(_gl);
                            } else {
                                texture.unbind(_gl);
                            }

                            arr.push(slot++);
                        }

                        this.shader.setUniform(_gl, '1iv', symbol, arr);
                    } else {
                        this.shader.setUniform(_gl, uniform.type, symbol, uniform.value);
                    }
                }
                else{
                    this.shader.setUniform(_gl, uniform.type, symbol, uniform.value);
                }
            }
        },

        setUniform : function(symbol, value) {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                uniform.value = value;
            }
        },

        setUniforms : function(object) {
            for (var key in object) {
                var val = object[key];
                this.setUniform(key, val);
            }
        },

        enableUniform : function(symbol) {
            if (this.uniforms[symbol] && !this.isUniformEnabled(symbol)) {
                this._enabledUniforms.push(symbol);
            }
        },

        disableUniform : function(symbol) {
            var idx = this._enabledUniforms.indexOf(symbol);
            if (idx >= 0) {
                this._enabledUniforms.splice(idx, 1);
            }
        },

        isUniformEnabled : function(symbol) {
            return this._enabledUniforms.indexOf(symbol) >= 0;
        },

        // Alias of setUniform and setUniforms
        set : function(symbol, value) {
            if (typeof(symbol) === 'object') {
                for (var key in symbol) {
                    var val = symbol[key];
                    this.set(key, val);
                }
            } else {
                var uniform = this.uniforms[symbol];
                if (uniform) {
                    uniform.value = value;
                }
            }
        },

        get : function(symbol) {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                return uniform.value;
            } else {
                // console.warn('Uniform '+symbol+' not exist');
            }
        },

        attachShader : function(shader, keepUniform) {
            var originalUniforms = this.uniforms;
            this.uniforms = shader.createUniforms();
            this.shader = shader;
            
            this._enabledUniforms = Object.keys(this.uniforms);

            if (keepUniform) {
                for (var symbol in originalUniforms) {
                    if (this.uniforms[symbol]) {
                        this.uniforms[symbol].value = originalUniforms[symbol].value;
                    }
                }
            }
        },

        detachShader : function() {
            this.shader = null;
            this.uniforms = {};
        },

        dispose : function() {
            _repository.splice(_repository.indexOf(this), 1);
        }
    });

    Material.getMaterial = function(name) {
        for (var i = 0; i < _repository.length; i++) {
            if (_repository[i].name === name) {
                return _repository[i];
            }
        }
    }

    return Material;
})