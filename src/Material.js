import Base from './core/Base';
import util from './core/util';
import colorUtil from './core/color';
var parseColor = colorUtil.parseToFloat;

var programKeyCache = {};

function getDefineCode(defines) {
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
 * Material defines the appearance of mesh surface, like `color`, `roughness`, `metalness`, etc.
 * It contains a {@link clay.Shader} and corresponding uniforms.
 *
 * Here is a basic example to create a standard material
```js
var material = new clay.Material({
    shader: new clay.Shader(
        clay.Shader.source('clay.vertex'),
        clay.Shader.source('clay.fragment')
    )
});
```
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
    },

    getProgramKey: function () {
        if (!this._programKey) {
            this._programKey = getProgramKey(
                this.vertexDefines, this.fragmentDefines, this.getEnabledTextures()
            );
        }
        return this._programKey;
    }
});

export default Material;
