define(function(require) {

    'use strict';

    var Light = require('../Light');
    var Vector3 = require('../math/Vector3');

    /**
     * @constructor qtek.light.Directional
     * @extends qtek.Light
     *
     * @example
     *     var light = new qtek.light.Directional({
     *         intensity: 0.5,
     *         color: [1.0, 0.0, 0.0]
     *     });
     *     light.position.set(10, 10, 10);
     *     light.lookAt(qtek.math.Vector3.ZERO);
     *     scene.add(light);
     */
    var DirectionalLight = Light.derive(
    /** @lends qtek.light.Directional# */
    {
        /**
         * @type {number}
         */
        shadowBias: 0.0002,
        /**
         * @type {number}
         */
        shadowSlopeScale: 2.0
    }, {

        type: 'DIRECTIONAL_LIGHT',

        uniformTemplates: {
            directionalLightDirection: {
                type: '3f',
                value: (function() {
                    var z = new Vector3();
                    return function(instance) {
                        return z.copy(instance.worldTransform.z).negate()._array;
                    };
                })()
            },
            directionalLightColor: {
                type: '3f',
                value: function(instance) {
                    var color = instance.color;
                    var intensity = instance.intensity;
                    return [color[0] * intensity, color[1] * intensity, color[2] * intensity];
                }
            }
        },
        /**
         * @return {qtek.light.Directional}
         * @memberOf qtek.light.Directional.prototype
         */
        clone: function() {
            var light = Light.prototype.clone.call(this);
            light.shadowBias = this.shadowBias;
            light.shadowSlopeScale = this.shadowSlopeScale;
            return light;
        }
    });

    return DirectionalLight;
});