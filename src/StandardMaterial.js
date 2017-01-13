define(function (require) {

    'use strict';

    var Material = require('./Material');

    var Shader = require('./Shader');
    // Import standard shader
    Shader['import'](require('./shader/source/standard.essl'));

    var shaderLibrary = {};
    var shaderUsedCount = {};

    var TEXTURE_PROPERTIES = ['diffuseMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'environmentMap', 'brdfLookup', 'ssaoMap', 'aoMap'];
    var SIMPLE_PROPERTIES = ['color', 'emission', 'emissionIntensity', 'alpha', 'roughness', 'metalness', 'uvRepeat', 'uvOffset', 'aoIntensity'];
    var PROPERTIES_CHANGE_SHADER = ['jointCount', 'linear', 'encodeRGBM', 'decodeRGBM'];

    var OTHER_SHADER_KEYS = [
        'environmentMapPrefiltered',
        'linear',
        'encodeRGBM',
        'decodeRGBM',
        'parallaxCorrected'
    ];
    var SHADER_KEYS = TEXTURE_PROPERTIES.concat(OTHER_SHADER_KEYS);

    var KEY_OFFSETS = SHADER_KEYS.reduce(function (obj, name, idx) {
        obj[name] = 256 << idx;
        return obj;
    }, {});

    function makeKey (enabledMaps, jointCount, shaderDefines) {
        // jointCount from 0 to 255
        var key = jointCount;
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

    function allocateShader (enabledMaps, jointCount, shaderDefines) {
        var key = makeKey(enabledMaps, jointCount, shaderDefines);
        var shader = shaderLibrary[key];

        if (!shader) {
            shader = new Shader({
                vertex: Shader.source('qtek.standard.vertex'),
                fragment: Shader.source('qtek.standard.fragment')
            });
            shader.enableTexture(enabledMaps);
            shader.define('fragment', 'USE_METALNESS');
            shader.define('fragment', 'USE_ROUGHNESS');
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

            shaderLibrary[key] = shader;
            shaderUsedCount[key] = 0;
        }
        shaderUsedCount[key]++;

        shader.__key__ = key;

        return shader;
    }
    function releaseShader (shader, _gl) {
        var key = shader.__key__;
        if (shaderLibrary[key]) {
            shaderUsedCount[key]--;
            if (!shaderUsedCount[key]) {
                delete shaderLibrary[key];
                delete shaderUsedCount[key];

                if (_gl) {
                    // Since shader may not be used on any material. We need to dispose it
                    shader.dispose(_gl);
                }
            }
        }
    }

    var StandardMaterial = Material.extend(function () {

        return {

            /**
             * @type {Array.<number>}
             * @name color
             * @default [1, 1, 1]
             */
            color: [1, 1, 1],

            /**
             * @type {Array.<number>}
             * @name emission
             * @default [0, 0, 0]
             */
            emission: [0, 0, 0],

            /**
             * @type {number}
             * @name emissionIntensity
             * @default 0
             */
            emissionIntensity: 0,

            /**
             * @type {number}
             * @name roughness
             * @default 0.5
             */
            roughness: 0.5,

            /**
             * @type {number}
             * @name metalness
             * @default 0
             */
            metalness: 0,

            /**
             * @type {number}
             * @name alpha
             * @default 1
             */
            alpha: 1,


            /**
             * @type {qtek.Texture2D}
             * @name diffuseMap
             */

            /**
             * @type {qtek.Texture2D}
             * @name normalMap
             */

            /**
             * @type {qtek.Texture2D}
             * @name roughnessMap
             */

            /**
             * @type {qtek.Texture2D}
             * @name metalnessMap
             */
            /**
             * @type {qtek.Texture2D}
             * @name emissiveMap
             */

            /**
             * @type {qtek.TextureCube}
             * @name environmentMap
             */

            /**
             * @type {qtek.math.BoundingBox}
             * @name environmentBox
             */

            /**
             * BRDF Lookup is generated by qtek.util.cubemap.integrateBrdf
             * @type {qtek.Texture2D}
             * @name brdfLookup
             */

            /**
             * @type {qtek.Texture2D}
             * @name ssaoMap
             */

            /**
             * @type {qtek.Texture2D}
             * @name aoMap
             */

            /**
             * @type {Array.<number>}
             * @name uvRepeat
             * @default [1, 1]
             */
            uvRepeat: [1, 1],

            /**
             * @type {Array.<number>}
             * @name uvOffset
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
             * @name jointCount
             * @default 0
             */
            // FIXME Redundant with mesh
            jointCount: 0,

            /**
             * @type {boolean}
             * @name environmentMapPrefiltered
             */
            environmentMapPrefiltered: false,

            /**
             * @type {boolean}
             * @name linear
             */
            linear: false,

            /**
             * @type {boolean}
             * @name encodeRGBM
             */
            encodeRGBM: false,

            /**
             * @type {boolean}
             * @name decodeRGBM
             */
            decodeRGBM: false
        };
    }, {

        _doUpdateShader: function (gl) {
            var enabledTextures = TEXTURE_PROPERTIES.filter(function (name) {
                return !!this[name];
            }, this);
            if (this._shader) {
                releaseShader(this._shader, gl);
                this._shader.detached();
            }

            var shader = allocateShader(
                enabledTextures, this.jointCount || 0, {
                    environmentMapPrefiltered: this.environmentMapPrefiltered,
                    linear: this.linear,
                    encodeRGBM: this.encodeRGBM,
                    decodeRGBM: this.decodeRGBM,
                    parallaxCorrected: !!this._environmentBox
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

        updateShader: function (gl) {
            if (this._shaderDirty) {
                this._doUpdateShader(gl);
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
            // PENDING
            if (!this._shader) {
                this._shaderDirty = true;
                this.updateShader();
            }
            return this._shader;
        },
        set: function () {
            console.warn('StandardMaterial can\'t change shader');
        }
    });

    return StandardMaterial;
});