define(function(require) {

    var Base = require("core/Base");
    var Shader = require("./Shader");
    var util = require("util/util");
    var glenum = require("./glenum");
    var Texture = require('./Texture');
    var Texture2D = require('./texture/Texture2D');
    var TextureCube = require('./texture/TextureCube');

    _repository = [];

    var Material = Base.derive(function() {

        var id = util.genGUID();

        return {
            __GUID__ : id,

            name : 'MATERIAL_' + id,

            //{
            // type
            // value
            // semantic
            //}
            uniforms : {},

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

            // Binding lights in the renderer automatically
            // autoBindingLights : true
        }
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
            for (var symbol in this.uniforms) {
                var uniform = this.uniforms[symbol];
                if (uniform.value === null) {
                    continue;
                }
                else if (uniform.value instanceof Array
                    && ! uniform.value.length) {
                    continue;
                }
                if (uniform.value instanceof Texture) {
                    var texture = uniform.value;
                    // Maybe texture is not loaded yet;
                    if (! texture.isRenderable()) {
                        continue;
                    }
                    _gl.activeTexture(_gl.TEXTURE0 + slot);
                    texture.bind(_gl);

                    this.shader.setUniform(_gl, '1i', symbol, slot);

                    slot++;
                }
                else if (uniform.value instanceof Array) {
                    // Texture Array
                    var exampleValue = uniform.value[0];

                    if (exampleValue instanceof Texture) {

                        var res = [];
                        for (var i = 0; i < uniform.value.length; i++) {
                            var texture = uniform.value[i];
                            // Maybe texture is not loaded yet;
                            if (! texture.isRenderable()) {
                                continue;
                            }

                            _gl.activeTexture(_gl.TEXTURE0 + slot);
                            texture.bind(_gl);
                            res.push(slot++);
                        }
                        this.shader.setUniform(_gl, '1iv', symbol, res);
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
            for (var key in symbol) {
                var val = symbol[key];
                this.setUniform(key, val);
            }
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

        attachShader : function(shader) {
            this.uniforms = shader.createUniforms();
            this.shader = shader;
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