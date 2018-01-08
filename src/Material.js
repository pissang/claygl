import Base from './core/Base';
import Texture from './Texture';
import util from './core/util';
import colorUtil from './core/color';
var parseColor = colorUtil.parseToFloat;

var programKeyCache = {};

function getDefineCode(defines, lightsNumbers, enabledTextures) {
    var defineKeys = Object.keys(defines);
    defineKeys.sort();
    var defineStr = [];
    // Custom Defines
    for (var i = 0; i < defineKeys.length; i++) {
        var key = defineKeys[i];
        var value = defines[key];
        if (value === null) {
            defineStr.push(key);
        }
        else{
            defineStr.push(key + ' ' + value.toString());
        }
    }
    return defineStr.join('\n');
}

function getProgramKey(vertexDefines, fragmentDefines, enabledTextures) {
    enabledTextures.sort();
    var defineStr = [];
    for (var i = 0; i < enabledTextures.length; i++) {
        var symbol = enabledTextures[i];
        defineStr.push(symbol);
    }
    var key = getDefineCode(vertexDefines) + '\n'
        + getDefineCode(fragmentDefines) + '\n'
        + defineStr.join('\n');

    if (programKeyCache[key]) {
        return programKeyCache[key];
    }

    var id = util.genGUID();
    programKeyCache[key] = id;
    return id;
}

/**
 * @constructor clay.Material
 * @extends clay.core.Base
 */
var Material = Base.extend(function () {
    return /** @lends clay.Material# */ {
        /**
         * @type {string}
         */
        name: '',

        /**
         * @type {Object}
         */
        // uniforms: null,

        /**
         * @type {clay.Shader}
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

        /**
         * If update texture status automatically.
         */
        autoUpdateTextureStatus: true,

        uniforms: {},
        vertexDefines: {},
        fragmentDefines: {},
        _textureStatus: {},

        // shadowTransparentMap : null

        // PENDING enable the uniform that only used in shader.
        _enabledUniforms: null,
    };
}, function () {
    if (!this.name) {
        this.name = 'MATERIAL_' + this.__uid__;
    }

    if (this.shader) {
        // Keep status, mainly preset uniforms, vertexDefines and fragmentDefines
        this.attachShader(this.shader, true);
    }
},
/** @lends clay.Material.prototype */
{
    precision: 'highp',

    bind: function(renderer, program, prevMaterial, prevProgram) {
        var _gl = renderer.gl;
        // PENDING Same texture in different material take different slot?

        // May use shader of other material if shader code are same

        // var sameProgram = prevProgram === program;

        var currentTextureSlot = program.currentTextureSlot();

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
                    var slot = program.currentTextureSlot();
                    var res = program.setUniform(_gl, '1i', symbol, slot);
                    if (res) { // Texture is enabled
                        // Still occupy the slot to make sure same texture in different materials have same slot.
                        program.takeCurrentTextureSlot(renderer, null);
                    }
                }
                continue;
            }
            else if (uniformValue instanceof Texture) {
                if (uniformValue.__slot < 0) {
                    var slot = program.currentTextureSlot();
                    var res = program.setUniform(_gl, '1i', symbol, slot);
                    if (!res) { // Texture uniform is not enabled
                        continue;
                    }
                    program.takeCurrentTextureSlot(renderer, uniformValue);
                    uniformValue.__slot = slot;
                }
                // Multiple uniform use same texture..
                else {
                    program.setUniform(_gl, '1i', symbol, uniformValue.__slot);
                }
            }
            else if (Array.isArray(uniformValue)) {
                if (uniformValue.length === 0) {
                    continue;
                }
                // Texture Array
                var exampleValue = uniformValue[0];

                if (exampleValue instanceof Texture) {
                    if (!program.hasUniform(symbol)) {
                        continue;
                    }

                    var arr = [];
                    for (var i = 0; i < uniformValue.length; i++) {
                        var texture = uniformValue[i];

                        if (texture.__slot < 0) {
                            var slot = program.currentTextureSlot();
                            arr.push(slot);
                            program.takeCurrentTextureSlot(renderer, texture);
                            texture.__slot = slot;
                        }
                        else {
                            arr.push(texture.__slot);
                        }
                    }

                    program.setUniform(_gl, '1iv', symbol, arr);
                }
                else {
                    program.setUniform(_gl, uniform.type, symbol, uniformValue);
                }
            }
            else{
                program.setUniform(_gl, uniform.type, symbol, uniformValue);
            }
        }
        // Texture slot maybe used out of material.
        program.resetTextureSlot(currentTextureSlot);
    },

    /**
     * Set material uniform
     * @example
     *  mat.setUniform('color', [1, 1, 1, 1]);
     * @param {string} symbol
     * @param {number|array|clay.Texture|ArrayBufferView} value
     */
    setUniform: function (symbol, value) {
        if (value === undefined) {
            console.warn('Uniform value "' + symbol + '" is undefined');
        }
        var uniform = this.uniforms[symbol];
        if (uniform) {

            if (typeof value === 'string') {
                // Try to parse as a color. Invalid color string will return null.
                value = parseColor(value) || value;
            }

            uniform.value = value;

            if (this.autoUpdateTextureStatus && uniform.type === 't') {
                if (value) {
                    this.enableTexture(symbol);
                }
                else {
                    this.disableTexture(symbol);
                }
            }
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

    getEnabledUniforms: function () {
        return this._enabledUniforms;
    },
    getTextureUniforms: function () {
        return this._textureUniforms;
    },

    /**
     * Alias of setUniform and setUniforms
     * @param {object|string} symbol
     * @param {number|array|clay.Texture|ArrayBufferView} [value]
     */
    set: function (symbol, value) {
        if (typeof(symbol) === 'object') {
            for (var key in symbol) {
                var val = symbol[key];
                this.setUniform(key, val);
            }
        }
        else {
            this.setUniform(symbol, value);
        }
    },
    /**
     * Get uniform value
     * @param  {string} symbol
     * @return {number|array|clay.Texture|ArrayBufferView}
     */
    get: function (symbol) {
        var uniform = this.uniforms[symbol];
        if (uniform) {
            return uniform.value;
        }
    },
    /**
     * Attach a shader instance
     * @param  {clay.Shader} shader
     * @param  {boolean} keepStatus If try to keep uniform and texture
     */
    attachShader: function(shader, keepStatus) {
        var originalUniforms = this.uniforms;

        // Ignore if uniform can use in shader.
        this.uniforms = shader.createUniforms();
        this.shader = shader;

        var uniforms = this.uniforms;
        this._enabledUniforms = Object.keys(uniforms);
        // Make sure uniforms are set in same order to avoid texture slot wrong
        this._enabledUniforms.sort();
        this._textureUniforms = this._enabledUniforms.filter(function (uniformName) {
            var type = this.uniforms[uniformName].type;
            return type === 't' || type === 'tv';
        }, this);

        var originalVertexDefines = this.vertexDefines;
        var originalFragmentDefines = this.fragmentDefines;

        this.vertexDefines = util.clone(shader.vertexDefines);
        this.fragmentDefines = util.clone(shader.fragmentDefines);

        if (keepStatus) {
            for (var symbol in originalUniforms) {
                if (uniforms[symbol]) {
                    uniforms[symbol].value = originalUniforms[symbol].value;
                }
            }

            util.defaults(this.vertexDefines, originalVertexDefines);
            util.defaults(this.fragmentDefines, originalFragmentDefines);
        }

        var textureStatus = {};
        for (var key in shader.textures) {
            textureStatus[key] = {
                shaderType: shader.textures[key].shaderType,
                type: shader.textures[key].type,
                enabled: (keepStatus && this._textureStatus[key]) ? this._textureStatus[key].enabled : false
            };
        }

        this._textureStatus = textureStatus;

        this._programKey = '';
    },

    /**
     * Clone a new material and keep uniforms, shader will not be cloned
     * @return {clay.Material}
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

        material.vertexDefines = util.clone(this.vertexDefines);
        material.fragmentDefines = util.clone(this.fragmentDefines);
        material.enableTexture(this.getEnabledTextures());
        material.precision = this.precision;

        return material;
    },

    /**
     * Add a #define macro in shader code
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     * @param  {number} [val]
     */
    define: function (shaderType, symbol, val) {
        var vertexDefines = this.vertexDefines;
        var fragmentDefines = this.fragmentDefines;
        if (shaderType !== 'vertex' && shaderType !== 'fragment' && shaderType !== 'both'
            && arguments.length < 3
        ) {
            // shaderType default to be 'both'
            val = symbol;
            symbol = shaderType;
            shaderType = 'both';
        }
        val = val != null ? val : null;
        if (shaderType === 'vertex' || shaderType === 'both') {
            if (vertexDefines[symbol] !== val) {
                vertexDefines[symbol] = val;
                // Mark as dirty
                this._programKey = '';
            }
        }
        if (shaderType === 'fragment' || shaderType === 'both') {
            if (fragmentDefines[symbol] !== val) {
                fragmentDefines[symbol] = val;
                if (shaderType !== 'both') {
                    this._programKey = '';
                }
            }
        }
    },

    /**
     * Remove a #define macro in shader code
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    undefine: function (shaderType, symbol) {
        if (shaderType !== 'vertex' && shaderType !== 'fragment' && shaderType !== 'both'
            && arguments.length < 2
        ) {
            // shaderType default to be 'both'
            symbol = shaderType;
            shaderType = 'both';
        }
        if (shaderType === 'vertex' || shaderType === 'both') {
            if (this.isDefined('vertex', symbol)) {
                delete this.vertexDefines[symbol];
                // Mark as dirty
                this._programKey = '';
            }
        }
        if (shaderType === 'fragment' || shaderType === 'both') {
            if (this.isDefined('fragment', symbol)) {
                delete this.fragmentDefines[symbol];
                if (shaderType !== 'both') {
                    this._programKey = '';
                }
            }
        }
    },

    /**
     * If macro is defined in shader.
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    isDefined: function (shaderType, symbol) {
        // PENDING hasOwnProperty ?
        switch (shaderType) {
            case 'vertex':
                return this.vertexDefines[symbol] !== undefined;
            case 'fragment':
                return this.fragmentDefines[symbol] !== undefined;
        }
    },
    /**
     * Get macro value defined in shader.
     * @param  {string} shaderType Can be vertex, fragment or both
     * @param  {string} symbol
     */
    getDefine: function (shaderType, symbol) {
        switch(shaderType) {
            case 'vertex':
                return this.vertexDefines[symbol];
            case 'fragment':
                return this.fragmentDefines[symbol];
        }
    },
    /**
     * Enable a texture, actually it will add a #define macro in the shader code
     * For example, if texture symbol is diffuseMap, it will add a line `#define DIFFUSEMAP_ENABLED` in the shader code
     * @param  {string} symbol
     */
    enableTexture: function (symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++) {
                this.enableTexture(symbol[i]);
            }
            return;
        }

        var status = this._textureStatus[symbol];
        if (status) {
            var isEnabled = status.enabled;
            if (!isEnabled) {
                status.enabled = true;
                this._programKey = '';
            }
        }
    },
    /**
     * Enable all textures used in the shader
     */
    enableTexturesAll: function () {
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            textureStatus[symbol].enabled = true;
        }

        this._programKey = '';
    },
    /**
     * Disable a texture, it remove a #define macro in the shader
     * @param  {string} symbol
     */
    disableTexture: function (symbol) {
        if (Array.isArray(symbol)) {
            for (var i = 0; i < symbol.length; i++) {
                this.disableTexture(symbol[i]);
            }
            return;
        }

        var status = this._textureStatus[symbol];
        if (status) {
            var isDisabled = ! status.enabled;
            if (!isDisabled) {
                status.enabled = false;
                this._programKey = '';
            }
        }
    },
    /**
     * Disable all textures used in the shader
     */
    disableTexturesAll: function () {
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            textureStatus[symbol].enabled = false;
        }

        this._programKey = '';
    },
    /**
     * If texture of given type is enabled.
     * @param  {string}  symbol
     * @return {boolean}
     */
    isTextureEnabled: function (symbol) {
        var textureStatus = this._textureStatus;
        return !!textureStatus[symbol]
            && textureStatus[symbol].enabled;
    },

    /**
     * Get all enabled textures
     * @return {string[]}
     */
    getEnabledTextures: function () {
        var enabledTextures = [];
        var textureStatus = this._textureStatus;
        for (var symbol in textureStatus) {
            if (textureStatus[symbol].enabled) {
                enabledTextures.push(symbol);
            }
        }
        return enabledTextures;
    },

    /**
     * Mark defines are updated.
     */
    dirtyDefines: function () {
        this._programKey = '';
    }
});

if (Object.defineProperty) {
    Object.defineProperty(Material.prototype, 'shader', {
        get: function () {
            return this._shader || null;
        },

        set: function (val) {
            // TODO
            // console.warn('You need to use attachShader to set the shader.');
            this._shader = val;
        }
    });

    Object.defineProperty(Material.prototype, 'programKey', {
        get: function () {
            if (!this._programKey) {
                this._programKey = getProgramKey(
                    this.vertexDefines, this.fragmentDefines, this.getEnabledTextures()
                );
            }
            return this._programKey;
        }
    });
}

export default Material;
