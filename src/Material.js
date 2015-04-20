define(function(require) {

    'use strict';

    var Base = require('./core/Base');
    var Texture = require('./Texture');

    /**
     * #constructor qtek.Material
     * @extends qtek.core.Base
     */
    var Material = Base.derive(
    /** @lends qtek.Material# */
    {
        /**
         * @type {string}
         */
        name: '',
        
        /**
         * @type {Object}
         */
        uniforms: null,

        /**
         * @type {qtek.Shader}
         */
        shader: null,

        /**
         * @type {boolean}
         */
        depthTest: true,

        /**
         * @type {boolean}
         */
        depthMask: true,

        /**
         * @type {boolean}
         */
        transparent: false,
        /**
         * Blend func is a callback function when the material 
         * have custom blending
         * The gl context will be the only argument passed in tho the
         * blend function
         * Detail of blend function in WebGL:
         * http://www.khronos.org/registry/gles/specs/2.0/es_full_spec_2.0.25.pdf
         *
         * Example :
         * function(_gl) {
         *  _gl.blendEquation(_gl.FUNC_ADD);
         *  _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);
         * }
         */
        blend: null,

        // shadowTransparentMap : null

        _enabledUniforms: null,
    }, function() {
        if (!this.name) {
            this.name = 'MATERIAL_' + this.__GUID__;
        }
        if (this.shader) {
            this.attachShader(this.shader);
        }
        if (! this.uniforms) {
            this.uniforms = {};
        }
    },
    /** @lends qtek.Material.prototype */
    {

        bind: function(_gl, prevMaterial) {

            var slot = 0;

            var sameShader = prevMaterial && prevMaterial.shader === this.shader;
            // Set uniforms
            for (var u = 0; u < this._enabledUniforms.length; u++) {
                var symbol = this._enabledUniforms[u];
                var uniform = this.uniforms[symbol];
                var uniformValue = uniform.value;
                // When binding two materials with the same shader
                // Many uniforms will be be set twice even if they have the same value
                // So add a evaluation to see if the uniform is really needed to be set
                // 
                // FIXME Small possibility enabledUniforms are not the same
                if (sameShader) {
                    if (prevMaterial.uniforms[symbol].value === uniformValue) {
                        continue;
                    }
                }

                if (uniformValue === undefined) {
                    console.warn('Uniform value "' + symbol + '" is undefined');
                    continue;
                }
                else if (uniformValue === null) {
                    // if (uniform.type == 't') {
                    //     // PENDING
                    //     _gl.bindTexture(_gl.TEXTURE_2D, null);
                    //     _gl.bindTexture(_gl.TEXTURE_CUBE, null);
                    // }
                    continue;
                }
                else if (uniformValue instanceof Array
                    && ! uniformValue.length) {
                    continue;
                }
                else if (uniformValue instanceof Texture) {
                    var res = this.shader.setUniform(_gl, '1i', symbol, slot);
                    if (!res) { // Texture is not enabled
                        continue;
                    }
                    var texture = uniformValue;
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
                else if (uniformValue instanceof Array) {
                    if (uniformValue.length === 0) {
                        continue;
                    }
                    // Texture Array
                    var exampleValue = uniformValue[0];

                    if (exampleValue instanceof Texture) {
                        if (!this.shader.hasUniform(symbol)) {
                            continue;
                        }

                        var arr = [];
                        for (var i = 0; i < uniformValue.length; i++) {
                            var texture = uniformValue[i];
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
                        this.shader.setUniform(_gl, uniform.type, symbol, uniformValue);
                    }
                }
                else{
                    this.shader.setUniform(_gl, uniform.type, symbol, uniformValue);
                }
            }
        },

        /**
         * @param {string} symbol
         * @param {number|array|qtek.Texture|ArrayBufferView} value
         */
        setUniform: function(symbol, value) {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                uniform.value = value;
            }
        },

        /**
         * @param {Object} obj
         */
        setUniforms: function(obj) {
            for (var key in obj) {
                var val = obj[key];
                this.setUniform(key, val);
            }
        },

        /**
         * Enable a uniform
         * It only have effect on the uniform exists in shader. 
         * @param  {string} symbol
         */
        enableUniform: function(symbol) {
            if (this.uniforms[symbol] && !this.isUniformEnabled(symbol)) {
                this._enabledUniforms.push(symbol);
            }
        },

        /**
         * Disable a uniform
         * It will not affect the uniform state in the shader. Because the shader uniforms is parsed from shader code with naive regex. When using micro to disable some uniforms in the shader. It will still try to set these uniforms in each rendering pass. We can disable these uniforms manually if we need this bit performance improvement. Mostly we can simply ignore it.
         * @param  {string} symbol
         */
        disableUniform: function(symbol) {
            var idx = this._enabledUniforms.indexOf(symbol);
            if (idx >= 0) {
                this._enabledUniforms.splice(idx, 1);
            }
        },

        /**
         * @param  {string}  symbol
         * @return {boolean}
         */
        isUniformEnabled: function(symbol) {
            return this._enabledUniforms.indexOf(symbol) >= 0;
        },

        /**
         * Alias of setUniform and setUniforms
         * @param {object|string} symbol
         * @param {number|array|qtek.Texture|ArrayBufferView} [value]
         */
        set: function(symbol, value) {
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
        /**
         * Get uniform value
         * @param  {string} symbol
         * @return {number|array|qtek.Texture|ArrayBufferView}
         */
        get: function(symbol) {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                return uniform.value;
            }
        },
        /**
         * Attach a shader instance
         * @param  {qtek.Shader} shader
         * @param  {boolean} keepUniform If try to keep uniform value
         */
        attachShader: function(shader, keepUniform) {
            if (this.shader) {
                this.shader.detached();
            }

            var originalUniforms = this.uniforms;
            this.uniforms = shader.createUniforms();
            this.shader = shader;

            var uniforms = this.uniforms;
            this._enabledUniforms = Object.keys(uniforms);

            if (keepUniform) {
                for (var symbol in originalUniforms) {
                    if (uniforms[symbol]) {
                        uniforms[symbol].value = originalUniforms[symbol].value;
                    }
                }
            }

            shader.attached();
        },

        /**
         * Detach a shader instance
         */
        detachShader: function() {
            this.shader.detached();
            this.shader = null;
            this.uniforms = {};
        },

        /**
         * Clone a new material and keep uniforms, shader will not be cloned
         * @return {qtek.Material}
         */
        clone: function () {
            var material = new Material({
                name: this.name,
                shader: this.shader
            });
            for (var symbol in this.uniforms) {
                material.uniforms[symbol].value = this.uniforms[symbol].value;
            }
            material.depthTest = this.depthTest;
            material.depthMask = this.depthMask;
            material.transparent = this.transparent;
            material.blend = this.blend;

            return material;
        },

        /**
         * Dispose material, if material shader is not attached to any other materials
         * Shader will also be disposed
         * @param {WebGLRenderingContext} gl
         * @param {boolean} [disposeTexture=false] If dispose the textures used in the material
         */
        dispose: function(_gl, disposeTexture) {
            if (disposeTexture) {
                for (var name in this.uniforms) {
                    var val = this.uniforms[name].value;
                    if (!val ) {
                        continue;
                    }
                    if (val instanceof Texture) {
                        val.dispose(_gl);
                    }
                    else if (val instanceof Array) {
                        for (var i = 0; i < val.length; i++) {
                            if (val[i] instanceof Texture) {
                                val[i].dispose(_gl);
                            }
                        }
                    }
                }
            }
            var shader = this.shader;
            if (shader) {
                this.detachShader();
                if (!shader.isAttachedToAny()) {
                    shader.dispose(_gl);
                }
            }
        }
    });

    return Material;
});