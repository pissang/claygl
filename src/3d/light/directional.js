define(function(require) {

    var Light = require('../light');
    var Shader = require('../shader');
    var Vector3 = require('core/vector3');

    var SHADER_STR = [ '@export buildin.header.directional_light',
                        'uniform vec3 directionalLightDirection[ DIRECTIONAL_LIGHT_NUMBER ] : unconfigurable;',
                        'uniform vec3 directionalLightColor[ DIRECTIONAL_LIGHT_NUMBER ] : unconfigurable;',
                        '@end;' ].join('\n');

    Shader.import(SHADER_STR);

    var DirectionalLight = Light.derive(function() {

        return {
            // Config of orthographic camera for shadow mapping generate
            shadowCamera : {
                left : -20,
                right : 20,
                top : 20,
                bottom : -20,
                near : 0,
                far : 100
            },
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
                        // Direction is target to eye
                        return z.copy(instance.worldMatrix.forward).negate()._array;
                    }
                })()
            },
            'directionalLightColor' : {
                type : '3f',
                value : function(instance) {
                    var color = instance.color,
                        intensity = instance.intensity;
                    return [ color[0]*intensity, color[1]*intensity, color[1]*intensity ];
                }
            }
        }
    })

    return DirectionalLight;
} )