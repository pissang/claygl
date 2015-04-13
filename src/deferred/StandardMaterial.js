define(function (require) {

    'use strict';

    var Base = require('../core/Base');

    var DeferredDummyShader = function () {};

    var StandardMaterial = Base.derive({

        /**
         * @type {Array.<number>}
         * @default [1, 1, 1]
         */
        color: null,

        /**
         * @type {Array.<number>}
         * @default [0, 0, 0]
         */
        emission: null,

        /**
         * @type {Array.<number>}
         * @default [0.5, 0.5, 0.5]
         */
        specularColor: null,

        /**
         * @type {number}
         * @default 0.5
         */
        glossiness: 0.5,

        /**
         * @type {qtek.Texture2D}
         */
        diffuseMap: null,

        /**
         * @type {qtek.Texture2D}
         */
        normalMap: null,

        /**
         * @type {qtek.TextureCube}
         */
        environmentMap: null,

        /**
         * Diffuse alpha channel usage.
         * 'none', 'alpha', 'glossiness'
         * @type {string}
         * @default 'none'
         */
        diffuseAlphaUsage: 'none',

        /**
         * @type {Array.<number>}
         */
        uvRepeat: null,

        /**
         * @type {Array.<number>}
         */
        uvOffset: null
    }, function () {

        this.color = this.color || [1, 1, 1];

        this.emission = this.emission || [0, 0, 0];
            
        this.specularColor = this.specularColor || [0.1, 0.1, 0.1];

        this.uvRepeat = this.uvRepeat || [1, 1];
        this.uvOffset = this.uvOffset || [0, 0];

        // Rendererable must need a material with shader
        this.shader = new DeferredDummyShader();
    }, {});

    return StandardMaterial;
});