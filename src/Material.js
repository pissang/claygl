import Base from './core/Base';
import Texture from './Texture';

/**
 * @constructor qtek.Material
 * @extends qtek.core.Base
 */
var Material = Base.extend(
/** @lends qtek.Material# */
{
    /**
     * @type {string}
     */
    name: '',

    /**
     * @type {Object}
     */
    // uniforms: null,

    /**
     * @type {qtek.Shader}
     */
    // shader: null,

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
}, function () {
    if (!this.name) {
        this.name = 'MATERIAL_' + this.__GUID__;
    }
    if (this.shader) {
        this.attachShader(this.shader);
    }
    if (!this.uniforms) {
        this.uniforms = {};
    }
},
/** @lends qtek.Material.prototype */
{

    bind: function(renderer, shader, prevMaterial, prevShader) {
        var _gl = renderer.gl;
        // PENDING Same texture in different material take different slot?

        // May use shader of other material if shader code are same
        var shader = shader || this.shader;

        // var sameShader = prevShader === shader;

        var currentTextureSlot = shader.currentTextureSlot();

        for (var u = 0; u < this._enabledUniforms.length; u++) {
            var symbol = this._enabledUniforms[u];
            var uniformValue = this.uniforms[symbol].value;
            if (uniformValue instanceof Texture) {
                // Reset slot
                uniformValue.__slot = -1;
            }
            else if (Array.isArray(uniformValue)) {
                for (var i = 0; i < uniformValue.length; i++) {
                    if (uniformValue[i] instanceof Texture) {
                        uniformValue[i].__slot = -1;
                    }
                }
            }
        }
        // Set uniforms
        for (var u = 0; u < this._enabledUniforms.length; u++) {
            var symbol = this._enabledUniforms[u];
            var uniform = this.uniforms[symbol];
            var uniformValue = uniform.value;

            // PENDING
            // When binding two materials with the same shader
            // Many uniforms will be be set twice even if they have the same value
            // So add a evaluation to see if the uniform is really needed to be set
            // if (prevMaterial && sameShader) {
            //     if (prevMaterial.uniforms[symbol].value === uniformValue) {
            //         continue;
            //     }
            // }
            
            if (uniformValue === null) {
                // FIXME Assume material with same shader have same order uniforms
                // Or if different material use same textures,
                // the slot will be different and still skipped because optimization
                if (uniform.type === 't') {
                    var slot = shader.currentTextureSlot();
                    var res = shader.setUniform(_gl, '1i', symbol, slot);
                    if (res) { // Texture is enabled
                        // Still occupy the slot to make sure same texture in different materials have same slot.
                        shader.takeCurrentTextureSlot(renderer, null);
                    }
                }
                continue;
            }
            else if (uniformValue instanceof Texture) {
                if (uniformValue.__slot < 0) {
                    var slot = shader.currentTextureSlot();
                    var res = shader.setUniform(_gl, '1i', symbol, slot);
                    if (!res) { // Texture uniform is not enabled
                        continue;
                    }
                    shader.takeCurrentTextureSlot(renderer, uniformValue);
                    uniformValue.__slot = slot;
                }
                // Multiple uniform use same texture..
                else {
                    shader.setUniform(_gl, '1i', symbol, uniformValue.__slot);
                }
            }
            else if (Array.isArray(uniformValue)) {
                if (uniformValue.length === 0) {
                    continue;
                }
                // Texture Array
                var exampleValue = uniformValue[0];

                if (exampleValue instanceof Texture) {
                    if (!shader.hasUniform(symbol)) {
                        continue;
                    }

                    var arr = [];
                    for (var i = 0; i < uniformValue.length; i++) {
                        var texture = uniformValue[i];

                        if (texture.__slot < 0) {
                            var slot = shader.currentTextureSlot();
                            arr.push(slot);
                            shader.takeCurrentTextureSlot(renderer, texture);
                            texture.__slot = slot;
                        }
                        else {
                            arr.push(texture.__slot);
                        }
                    }

                    shader.setUniform(_gl, '1iv', symbol, arr);
                }
                else {
                    shader.setUniform(_gl, uniform.type, symbol, uniformValue);
                }
            }
            else{
                shader.setUniform(_gl, uniform.type, symbol, uniformValue);
            }
        }
        // Texture slot maybe used out of material.
        shader.resetTextureSlot(currentTextureSlot);
    },

    /**
     * Set material uniform
     * @example
     *  mat.setUniform('color', [1, 1, 1, 1]);
     * @param {string} symbol
     * @param {number|array|qtek.Texture|ArrayBufferView} value
     */
    setUniform: function (symbol, value) {
        if (value === undefined) {
            console.warn('Uniform value "' + symbol + '" is undefined');
        }
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

    // /**
    //  * Enable a uniform
    //  * It only have effect on the uniform exists in shader.
    //  * @param  {string} symbol
    //  */
    // enableUniform: function (symbol) {
    //     if (this.uniforms[symbol] && !this.isUniformEnabled(symbol)) {
    //         this._enabledUniforms.push(symbol);
    //     }
    // },

    // /**
    //  * Disable a uniform
    //  * It will not affect the uniform state in the shader. Because the shader uniforms is parsed from shader code with naive regex. When using micro to disable some uniforms in the shader. It will still try to set these uniforms in each rendering pass. We can disable these uniforms manually if we need this bit performance improvement. Mostly we can simply ignore it.
    //  * @param  {string} symbol
    //  */
    // disableUniform: function (symbol) {
    //     var idx = this._enabledUniforms.indexOf(symbol);
    //     if (idx >= 0) {
    //         this._enabledUniforms.splice(idx, 1);
    //     }
    // },

    /**
     * @param  {string}  symbol
     * @return {boolean}
     */
    isUniformEnabled: function (symbol) {
        return this._enabledUniforms.indexOf(symbol) >= 0;
    },

    /**
     * Alias of setUniform and setUniforms
     * @param {object|string} symbol
     * @param {number|array|qtek.Texture|ArrayBufferView} [value]
     */
    set: function (symbol, value) {
        if (typeof(symbol) === 'object') {
            for (var key in symbol) {
                var val = symbol[key];
                this.set(key, val);
            }
        }
        else {
            var uniform = this.uniforms[symbol];
            if (uniform) {
                if (typeof value === 'undefined') {
                    console.warn('Uniform value "' + symbol + '" is undefined');
                    value = null;
                }
                uniform.value = value;
            }
        }
    },
    /**
     * Get uniform value
     * @param  {string} symbol
     * @return {number|array|qtek.Texture|ArrayBufferView}
     */
    get: function (symbol) {
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

        // Ignore if uniform can use in shader.
        this.uniforms = shader.createUniforms();
        this.shader = shader;

        var uniforms = this.uniforms;
        this._enabledUniforms = Object.keys(uniforms);
        // Make sure uniforms are set in same order to avoid texture slot wrong
        this._enabledUniforms.sort();

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
        var material = new this.constructor({
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
    dispose: function(renderer, disposeTexture) {
        if (disposeTexture) {
            for (var name in this.uniforms) {
                var val = this.uniforms[name].value;
                if (!val) {
                    continue;
                }
                if (val instanceof Texture) {
                    val.dispose(renderer);
                }
                else if (Array.isArray(val)) {
                    for (var i = 0; i < val.length; i++) {
                        if (val[i] instanceof Texture) {
                            val[i].dispose(renderer);
                        }
                    }
                }
            }
        }
        var shader = this.shader;
        if (shader) {
            this.detachShader();
            if (!shader.isAttachedToAny()) {
                shader.dispose(renderer);
            }
        }
    }
});

export default Material;
