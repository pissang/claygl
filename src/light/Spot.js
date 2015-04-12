define(function(require) {

    'use strict';

    var Light = require('../Light');
    var Vector3 = require('../math/Vector3');

    /**
     * @constructor qtek.light.Spot
     * @extends qtek.Light
     */
    var SpotLight = Light.derive(
    /**@lends qtek.light.Spot */
    {
        /**
         * @type {number}
         */
        range: 20,
        /**
         * @type {number}
         */
        umbraAngle: 30,
        /**
         * @type {number}
         */
        penumbraAngle: 45,
        /**
         * @type {number}
         */
        falloffFactor: 2.0,
        /**
         * @type {number}
         */
        shadowBias: 0.0002,
        /**
         * @type {number}
         */
        shadowSlopeScale: 2.0
    },{

        type: 'SPOT_LIGHT',

        uniformTemplates: {
            spotLightPosition: {
                type: '3f',
                value: function(instance) {
                    return instance.getWorldPosition()._array;
                }
            },
            spotLightRange: {
                type: '1f',
                value: function(instance) {
                    return instance.range;
                }
            },
            spotLightUmbraAngleCosine: {
                type: '1f',
                value: function(instance) {
                    return Math.cos(instance.umbraAngle * Math.PI / 180);
                }
            },
            spotLightPenumbraAngleCosine: {
                type: '1f',
                value: function(instance) {
                    return Math.cos(instance.penumbraAngle * Math.PI / 180);
                }
            },
            spotLightFalloffFactor: {
                type: '1f',
                value: function(instance) {
                    return instance.falloffFactor;
                }
            },
            spotLightDirection: {
                type: '3f',
                value: (function() {
                    var z = new Vector3();
                    return function(instance) {
                        // Direction is target to eye
                        return z.copy(instance.worldTransform.z).negate()._array;
                    };
                })()
            },
            spotLightColor: {
                type: '3f',
                value: function(instance) {
                    var color = instance.color;
                    var intensity = instance.intensity;
                    return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
                }
            }
        },
        /**
         * @return {qtek.light.Spot}
         * @memberOf qtek.light.Spot.prototype
         */
        clone: function() {
            var light = Light.prototype.clone.call(this);
            light.range = this.range;
            light.umbraAngle = this.umbraAngle;
            light.penumbraAngle = this.penumbraAngle;
            light.falloffFactor = this.falloffFactor;
            light.shadowBias = this.shadowBias;
            light.shadowSlopeScale = this.shadowSlopeScale;
            return light;
        }
    });

    return SpotLight;
});