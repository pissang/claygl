import Material from './Material';

import Shader from './Shader';
import standardEssl from './shader/source/standard.glsl.js';
// Import standard shader
Shader['import'](standardEssl);

var shaderLibrary = {};
var shaderUsedCount = {};

var TEXTURE_PROPERTIES = ['diffuseMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'environmentMap', 'brdfLookup', 'ssaoMap', 'aoMap'];
var SIMPLE_PROPERTIES = ['color', 'emission', 'emissionIntensity', 'alpha', 'roughness', 'metalness', 'uvRepeat', 'uvOffset', 'aoIntensity', 'alphaCutoff'];
var PROPERTIES_CHANGE_SHADER = ['jointCount', 'linear', 'encodeRGBM', 'decodeRGBM', 'doubleSided', 'alphaTest', 'roughnessChannel', 'metalnessChannel'];

var OTHER_SHADER_KEYS = [
    'environmentMapPrefiltered',
    'linear',
    'encodeRGBM',
    'decodeRGBM',
    'doubleSided',
    'alphaTest',
    'parallaxCorrected'
];
var SHADER_KEYS = TEXTURE_PROPERTIES.concat(OTHER_SHADER_KEYS);

var KEY_OFFSETS = SHADER_KEYS.reduce(function (obj, name, idx) {
    obj[name] = 4096 << idx;
    return obj;
}, {});

function makeKey(enabledMaps, jointCount, shaderDefines) {
    // jointCount from 0 to 255
    var key = jointCount;
    // roughnessChannel from 256 to 1024
    // metalnessChannel from 1024 to 4096
    key += 256 * shaderDefines.roughnessChannel;
    key += 1024 * shaderDefines.metalnessChannel;

    for (var i = 0; i < enabledMaps.length; i++) {
        key += KEY_OFFSETS[enabledMaps[i]];
    }
    for (var i = 0; i < OTHER_SHADER_KEYS.length; i++) {
        var propName = OTHER_SHADER_KEYS[i];
        if (shaderDefines[propName]) {
            key += KEY_OFFSETS[propName];
        }
    }

    return key;
}

function allocateShader(renderer, enabledMaps, jointCount, shaderDefines) {
    var key = makeKey(enabledMaps, jointCount, shaderDefines);
    if (!shaderUsedCount[renderer.__GUID__]) {
        shaderUsedCount[renderer.__GUID__] = {};
    }

    var shader = shaderLibrary[key];

    if (!shader) {
        shader = new Shader({
            vertex: Shader.source('qtek.standard.vertex'),
            fragment: Shader.source('qtek.standard.fragment')
        });
        shader.enableTexture(enabledMaps);
        shader.define('fragment', 'USE_METALNESS');
        shader.define('fragment', 'USE_ROUGHNESS');
        shader.define('ROUGHNESS_CHANNEL', shaderDefines.roughnessChannel);
        shader.define('METALNESS_CHANNEL', shaderDefines.metalnessChannel);
        if (jointCount) {
            shader.define('vertex', 'SKINNING');
            shader.define('vertex', 'JOINT_COUNT', jointCount);
        }
        if (shaderDefines.environmentMapPrefiltered) {
            shader.define('fragment', 'ENVIRONMENTMAP_PREFILTER');
        }
        if (shaderDefines.linear) {
            shader.define('fragment', 'SRGB_DECODE');
        }
        if (shaderDefines.encodeRGBM) {
            shader.define('fragment', 'RGBM_ENCODE');
        }
        if (shaderDefines.decodeRGBM) {
            shader.define('fragment', 'RGBM_DECODE');
        }
        if (shaderDefines.parallaxCorrected) {
            shader.define('fragment', 'PARALLAX_CORRECTED');
        }
        if (shaderDefines.doubleSided) {
            shader.define('fragment', 'DOUBLE_SIDED');
        }
        if (shaderDefines.alphaTest) {
            shader.define('fragment', 'ALPHA_TEST');
        }

        shaderLibrary[key] = shader;
    }
    if (!shaderUsedCount[renderer.__GUID__][key]) {
        shaderUsedCount[renderer.__GUID__][key] = 0;
    }
    shaderUsedCount[renderer.__GUID__][key]++;

    shader.__key__ = key;

    return shader;
}
function releaseShader(shader, renderer) {
    var key = shader.__key__;
    if (shaderLibrary[key]) {
        shaderUsedCount[renderer.__GUID__][key]--;
        if (!shaderUsedCount[renderer.__GUID__][key]) {
            if (renderer) {
                // Since shader may not be used on any material. We need to dispose it
                shader.dispose(renderer);
            }
        }
    }
}

/**
 * Standard material without custom shader.
 * @constructor qtek.StandardMaterial
 * @extends qtek.Base
 * @example
 * var mat = new qtek.StandardMaterial({
 *     color: [1, 1, 1],
 *     diffuseMap: diffuseTexture
 * });
 * mat.roughness = 1;
 */
var StandardMaterial = Material.extend(function () {

    return /** @lends qtek.StandardMaterial# */ {

        /**
         * @type {Array.<number>}
         * @default [1, 1, 1]
         */
        color: [1, 1, 1],

        /**
         * @type {Array.<number>}
         * @default [0, 0, 0]
         */
        emission: [0, 0, 0],

        /**
         * @type {number}
         * @default 0
         */
        emissionIntensity: 0,

        /**
         * @type {number}
         * @default 0.5
         */
        roughness: 0.5,

        /**
         * @type {number}
         * @default 0
         */
        metalness: 0,

        /**
         * @type {number}
         * @default 1
         */
        alpha: 1,

        /**
         * @type {boolean}
         */
        alphaTest: false,

        /**
         * Cutoff threshold for alpha test
         * @type {number}
         */
        alphaCutoff: 0.9,

        /**
         * @type {boolean}
         */
        // TODO Must disable culling.
        doubleSided: false,

        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.Texture2D}
         */
        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.TextureCube}
         */

        /**
         * @type {qtek.math.BoundingBox}
         */

        /**
         * BRDF Lookup is generated by qtek.util.cubemap.integrateBrdf
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {qtek.Texture2D}
         */

        /**
         * @type {Array.<number>}
         * @default [1, 1]
         */
        uvRepeat: [1, 1],

        /**
         * @type {Array.<number>}
         * @default [0, 0]
         */
        uvOffset: [0, 0],

        /**
         * @type {number}
         * @default 1
         */
        aoIntensity: 1,

        /**
         * @type {number}
         * @default 0
         */
        // FIXME Redundant with mesh
        jointCount: 0,

        /**
         * @type {boolean}
         */
        environmentMapPrefiltered: false,

        /**
         * @type {boolean}
         */
        linear: false,

        /**
         * @type {boolean}
         */
        encodeRGBM: false,

        /**
         * @type {boolean}
         */
        decodeRGBM: false,

        /**
         * @type {Number}
         */
        roughnessChannel: 0,
        /**
         * @type {Number}
         */
        metalnessChannel: 1
    };
}, {

    _doUpdateShader: function (renderer) {
        var enabledTextures = TEXTURE_PROPERTIES.filter(function (name) {
            return !!this[name];
        }, this);
        if (this._shader) {
            releaseShader(this._shader, renderer);
            this._shader.detached();
        }

        var shader = allocateShader(
            renderer, enabledTextures, this.jointCount || 0, {
                environmentMapPrefiltered: this.environmentMapPrefiltered,
                linear: this.linear,
                encodeRGBM: this.encodeRGBM,
                decodeRGBM: this.decodeRGBM,
                parallaxCorrected: !!this._environmentBox,
                alphaTest: this.alphaTest,
                doubleSided: this.doubleSided,
                metalnessChannel: this.metalnessChannel,
                roughnessChannel: this.roughnessChannel
            }
        );
        var originalUniforms = this.uniforms;

        // Ignore if uniform can use in shader.
        this.uniforms = shader.createUniforms();
        this._shader = shader;

        var uniforms = this.uniforms;
        this._enabledUniforms = Object.keys(uniforms);

        // Keep uniform
        for (var symbol in originalUniforms) {
            if (uniforms[symbol]) {
                uniforms[symbol].value = originalUniforms[symbol].value;
            }
        }

        shader.attached();

        this._shaderDirty = false;
    },

    updateShader: function (renderer) {
        if (this._shaderDirty) {
            this._doUpdateShader(renderer);
            this._shaderDirty = false;
        }
    },

    attachShader: function () {
        // Do nothing.
        // console.warn('StandardMaterial can\'t change shader');
    },

    dispose: function (gl, disposeTexture) {
        if (this._shader) {
            releaseShader(this._shader);
        }
        Material.prototype.dispose.call(gl, disposeTexture);
    },


    clone: function () {
        var material = new StandardMaterial({
            name: this.name
        });
        TEXTURE_PROPERTIES.forEach(function (propName) {
            if (this[propName]) {
                material[propName] = this[propName];
            }
        }, this);
        SIMPLE_PROPERTIES.concat(PROPERTIES_CHANGE_SHADER).forEach(function (propName) {
            material[propName] = this[propName];
        }, this);
        return material;
    }
});

SIMPLE_PROPERTIES.forEach(function (propName) {
    Object.defineProperty(StandardMaterial.prototype, propName, {
        get: function () {
            return this.get(propName);
        },
        set: function (value) {
            var uniforms = this.uniforms = this.uniforms || {};
            uniforms[propName] = uniforms[propName] || {
                value: null
            };
            this.setUniform(propName, value);
        }
    });
});

TEXTURE_PROPERTIES.forEach(function (propName) {
    Object.defineProperty(StandardMaterial.prototype, propName, {
        get: function () {
            return this.get(propName);
        },
        set: function (value) {
            var uniforms = this.uniforms = this.uniforms || {};
            uniforms[propName] = uniforms[propName] || {
                value: null
            };

            var oldVal = this.get(propName);
            this.setUniform(propName, value);

            if (!oldVal !== !value) {
                this._shaderDirty = true;
            }
        }
    });
});

PROPERTIES_CHANGE_SHADER.forEach(function (propName) {
    var privateKey = '_' + propName;
    Object.defineProperty(StandardMaterial.prototype, propName, {
        get: function () {
            return this[privateKey];
        },
        set: function (value) {
            var oldVal = this[privateKey];
            this[privateKey] = value;
            if (oldVal !== value) {
                this._shaderDirty = true;
            }
        }
    });
});

Object.defineProperty(StandardMaterial.prototype, 'environmentBox', {
    get: function () {
        var envBox = this._environmentBox;
        if (envBox) {
            envBox.min.setArray(this.get('environmentBoxMin'));
            envBox.max.setArray(this.get('environmentBoxMax'));
        }
        return envBox;
    },

    set: function (value) {
        var oldVal = this._environmentBox;
        this._environmentBox = value;

        var uniforms = this.uniforms = this.uniforms || {};
        uniforms['environmentBoxMin'] = uniforms['environmentBoxMin'] || {
            value: null
        };
        uniforms['environmentBoxMax'] = uniforms['environmentBoxMax'] || {
            value: null
        };

        // TODO Can't detect operation like box.min = new Vector()
        if (value) {
            this.setUniform('environmentBoxMin', value.min._array);
            this.setUniform('environmentBoxMax', value.max._array);
        }

        if (oldVal !== value) {
            this._shaderDirty = true;
        }
    }
});

Object.defineProperty(StandardMaterial.prototype, 'shader', {
    get: function () {
        // FIXME updateShader needs gl context.
        if (!this._shader) {
            // this._shaderDirty = true;
            // this.updateShader();
        }
        return this._shader;
    },
    set: function () {
        console.warn('StandardMaterial can\'t change shader');
    }
});

export default StandardMaterial;
