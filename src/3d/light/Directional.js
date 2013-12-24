define(function(require) {

    var Light = require('../Light');
    var Shader = require('../Shader');
    var Vector3 = require('core/Vector3');

    var DirectionalLight = Light.derive(function() {

        return {

            shadowBias : 0.0002
        }
    }, {

        type : 'DIRECTIONAL_LIGHT',

        uniformTemplates : {
            'directionalLightDirection' : {
                type : '3f',
                value : (function() {
                    var z = new Vector3();
                    return function(instance) {
                        return z.copy(instance.worldTransform.forward).negate()._array;
                    }
                })()
            },
            'directionalLightColor' : {
                type : '3f',
                value : function(instance) {
                    var color = instance.color;
                    var intensity = instance.intensity;
                    return [color[0]*intensity, color[1]*intensity, color[1]*intensity];
                }
            }
        }
    })

    return DirectionalLight;
} )