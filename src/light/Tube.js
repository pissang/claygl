define(function (require) {
    
    'use strict';

    var Light = require('../Light');
    var Vector3 = require('../math/Vector3');

    /**
     * @constructor qtek.light.Tube
     * @extends {qtek.Light}
     */
    var TubeLight = Light.derive(
    /** @lends qtek.light.Tube# */
    {   
        /**
         * @type {number}
         */
        range: 100,

        /**
         * @type {number}
         */
        length: 10
    }, {

        type: 'TUBE_LIGHT',

        uniformTemplates: {
            tubeLightPosition: {
                type: '3f',
                value: function(instance) {
                    return instance.getWorldPosition()._array;
                }
            },

            tubeLightExtend: {
                type: '3f',
                value: (function() {
                    var x = new Vector3();
                    return function(instance) {
                        // Extend in x axis
                        return x.copy(instance.worldTransform.x)
                            .normalize().scale(instance.length / 2)._array;
                    };
                })()
            },

            tubeLightRange: {
                type: '1f',
                value: function(instance) {
                    return instance.range;
                }
            },

            tubeLightColor: {
                type: '3f',
                value: function(instance) {
                    var color = instance.color;
                    var intensity = instance.intensity;
                    return [color[0]*intensity, color[1]*intensity, color[2]*intensity];
                }
            }
        }
    });

    return TubeLight;
});